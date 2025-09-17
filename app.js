// tma-access/app.js

document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    // --- ВАЖНО: Укажи свой URL API ---
    const API_BASE_URL = "https://lazy-cobras-admire.loca.lt";

    // --- Элементы DOM ---
    const loaderEl = document.getElementById('loader');
    const appContainerEl = document.getElementById('app-container');
    const navBarEl = document.getElementById('nav-bar');
    const pages = {
        main: document.getElementById('page-main'),
        tariffs: document.getElementById('page-tariffs'),
        servers: document.getElementById('page-servers'),
    };
    const userGreetingEl = document.getElementById('user-greeting');
    const userStatusEl = document.getElementById('user-status');
    const userTariffEl = document.getElementById('user-tariff');
    const userTrafficEl = document.getElementById('user-traffic');
    const userExpiresEl = document.getElementById('user-expires');
    const keysEl = document.getElementById('user-keys');
    const serverListEl = document.getElementById('page-servers');
    const tariffListEl = document.getElementById('page-tariffs');

    // --- Инициализация приложения ---
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#1a73e8'); // Синий цвет хедера

    // --- Навигация ---
    navBarEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-button')) {
            const pageName = e.target.dataset.page;
            Object.values(pages).forEach(page => page.classList.remove('active'));
            document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
            
            pages[pageName].classList.add('active');
            e.target.classList.add('active');
        }
    });
    
    // --- API Клиент ---
    async function apiFetch(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: { 
                    'Content-Type': 'application/json',
                    ...options.headers, 
                    'Authorization': `Bearer ${tg.initData}`,
                    'Bypass-Tunnel-Reminder': 'true'
                }
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error ${response.status}: ${errorText}`);
            }
            const result = await response.json();
            if (!result.ok) {
                throw new Error(`API Logic Error: ${result.error}`);
            }
            return result.data;
        } catch (error) {
            console.error(`Fetch failed for endpoint ${endpoint}:`, error);
            throw error;
        }
    }

    // --- Функции рендеринга ---
    function renderMainPage(userInfo, keysInfo) {
        const { db_user, marzban_user } = userInfo;
        userGreetingEl.innerText = `👋 Привет, ${db_user.full_name}!`;
        
        if (marzban_user.status === 'active') {
            userStatusEl.innerText = 'Активна';
            userStatusEl.style.color = '#4caf50'; // Зеленый
        } else {
            userStatusEl.innerText = 'Неактивна';
            userStatusEl.style.color = '#f44336'; // Красный
        }

        const tariffName = db_user.current_tariff_id;
        if (tariffName) {
            if (tariffName === 'privileged_plan') {
                userTariffEl.innerText = 'Льготный';
            } else {
                userTariffEl.innerText = tariffName.split('_')[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        } else {
            userTariffEl.innerText = 'Не выбран';
        }
        
        const usedGb = (marzban_user.used_traffic / (1024**3)).toFixed(2);
        const limitGb = marzban_user.data_limit > 0 ? (marzban_user.data_limit / (1024**3)).toFixed(0) : '∞';
        userTrafficEl.innerText = `${usedGb} / ${limitGb} GB`;

        if (marzban_user.expire && marzban_user.expire > 0) {
            const expireDate = new Date(marzban_user.expire * 1000);
            userExpiresEl.innerText = expireDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        } else {
            userExpiresEl.innerText = 'Бессрочно';
        }

        const subLinkBtn = document.getElementById('sub-link-btn');
        if (keysInfo.subscription_url) {
            subLinkBtn.onclick = () => tg.openLink(keysInfo.subscription_url);
        } else {
            subLinkBtn.style.display = 'none';
        }

        const keyListEl = document.getElementById('key-list');
        keyListEl.innerHTML = '';
        if (keysInfo.keys && keysInfo.keys.length > 0) {
            keysInfo.keys.forEach((key, index) => {
                const keyItem = document.createElement('div');
                keyItem.className = 'key-item';
                const name = `Ключ ${index + 1}`;

                keyItem.innerHTML = `<span>${name}</span><button class="copy-btn">Действия</button>`;
                
                keyItem.querySelector('.copy-btn').onclick = () => {
                    tg.showPopup({
                        title: 'Действия с ключом',
                        message: 'Выберите, что вы хотите сделать.',
                        buttons: [
                            { id: 'copy', type: 'default', text: 'Копировать ключ' },
                            { id: 'open_v2ray', type: 'default', text: 'Открыть в V2Ray' },
                            { id: 'cancel', type: 'cancel' },
                        ]
                    }, (buttonId) => {
                        if (buttonId === 'copy') {
                            tg.HapticFeedback.impactOccurred('light');
                            navigator.clipboard.writeText(key).then(() => {
                                tg.showAlert('Ключ скопирован в буфер обмена!');
                            });
                        } else if (buttonId === 'open_v2ray') {
                            tg.openLink(`vless://${key.split('//')[1]}`);
                        }
                    });
                };
                keyListEl.appendChild(keyItem);
            });
        }
    }

    function renderServersPage(servers) {
        serverListEl.innerHTML = '<h3>🌐 Статус серверов</h3>';
        if (servers.length === 0) {
            serverListEl.innerHTML += '<p class="hint">Нет данных о серверах.</p>';
            return;
        }
        servers.forEach(server => {
            const p = document.createElement('p');
            const statusEmoji = server.status === 'online' ? '🟢' : '🔴';
            p.innerHTML = `${statusEmoji} ${server.name} - <b>Загрузка: ${server.load_avg_1m !== null ? (server.load_avg_1m * 100).toFixed(0) + '%' : 'N/A'}</b> | <b>Пинг: ${server.ping_ms || 'N/A'} мс</b>`;
            serverListEl.appendChild(p);
        });
    }

    function renderTariffsPage(tariffsData) {
        tariffListEl.innerHTML = '<h3>🛒 Выбор тарифа</h3>';
        if (tariffsData.tariffs.length === 0) {
            tariffListEl.innerHTML += '<p class="hint">Нет доступных тарифов.</p>';
            return;
        }
        tariffsData.tariffs.forEach(tariff => {
            const btn = document.createElement('button');
            btn.className = 'key-button'; // Используем тот же стиль, что и у кнопок ключей
            btn.innerText = `${tariff.name}`;
            btn.onclick = () => {
                // TODO: Реализовать модальное окно выбора опции (RUB/STARS)
                tg.showAlert(`Выбран тариф: ${tariff.name}`);
            };
            tariffListEl.appendChild(btn);
        });
    }

    // --- Главная функция ---
    async function main() {
        try {
            const [userInfo, servers, tariffs, keys] = await Promise.all([
                apiFetch('/api/user/info', { method: 'POST' }),
                apiFetch('/api/servers/status'),
                apiFetch('/api/tariffs/list'),
                apiFetch('/api/user/keys')
            ]);
            
            renderMainPage(userInfo, keys);
            renderServersPage(servers);
            renderTariffsPage(tariffs);

            appContainerEl.classList.remove('hidden');
            navBarEl.classList.remove('hidden');
            loaderEl.classList.add('hidden');
        } catch (error) {
            loaderEl.innerHTML = `<h2>🚫 Ошибка загрузки</h2><p class="hint">${error.message}</p>`;
            tg.showAlert(`Произошла ошибка: ${error.message}`);
        }
    }
    
    main();
});

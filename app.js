// tma-access/app.js

document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    // --- ВАЖНО: Укажи свой URL ---
    const API_BASE_URL = "https://six-peas-hunt.loca.lt"; // Пример для localtunnel

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

    tg.ready();
    tg.expand();
    tg.setHeaderColor('#1a73e8'); // Пример установки цвета хедера

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
            console.error("Fetch failed:", error);
            throw error;
        }
    }

    // --- Функции рендеринга ---
    function renderMainPage(userInfo, keysInfo) {
        const { db_user, marzban_user } = userInfo;
        userGreetingEl.innerText = `👋 Привет, ${db_user.full_name}!`;
        userStatusEl.innerText = marzban_user.status === 'active' ? 'Активна' : 'Неактивна';
        userStatusEl.style.color = marzban_user.status === 'active' ? '#4caf50' : '#f44336';
        
        userTariffEl.innerText = db_user.current_tariff_id || 'Не выбран';
        
        const usedGb = (marzban_user.used_traffic / (1024**3)).toFixed(2);
        const limitGb = marzban_user.data_limit > 0 ? (marzban_user.data_limit / (1024**3)).toFixed(0) : '∞';
        userTrafficEl.innerText = `${usedGb} / ${limitGb} GB`;

        if (marzban_user.expire && marzban_user.expire > 0) {
            const expireDate = new Date(marzban_user.expire * 1000);
            userExpiresEl.innerText = expireDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        } else {
            userExpiresEl.innerText = 'Бессрочно';
        }

        keysEl.innerHTML = ''; // Очищаем
        if (keysInfo.subscription_url) {
            const subLink = document.createElement('a');
            subLink.className = 'key-button';
            subLink.innerText = '🔗 Добавить подписку';
            subLink.onclick = () => tg.openLink(keysInfo.subscription_url);
            keysEl.appendChild(subLink);
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
            btn.className = 'tariff-button';
            btn.innerText = `${tariff.name}`;
            btn.onclick = () => tg.showAlert(`Вы выбрали тариф "${tariff.name}"`);
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

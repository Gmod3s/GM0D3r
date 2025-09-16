// tma-access/app.js

document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    // --- ВАЖНО: Замени на публичный URL твоего API ---
    const API_BASE_URL = "https://silver-bugs-smile.loca.lt"; 

    // --- Элементы DOM ---
    const loaderEl = document.getElementById('loader');
    const mainContentEl = document.getElementById('main-content');
    const userGreetingEl = document.getElementById('user-greeting');
    const userStatusEl = document.getElementById('user-status');
    const userTrafficEl = document.getElementById('user-traffic');
    const userExpiresEl = document.getElementById('user-expires');
    const serverListEl = document.getElementById('server-list');
    const tariffListEl = document.getElementById('tariff-list');

    tg.ready();
    tg.expand();

    // --- Функция для выполнения запросов к API ---
    async function apiFetch(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: { ...options.headers, 'Authorization': `Bearer ${tg.initData}`, 'Bypass-Tunnel-Reminder': 'true'}
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
            throw error; // Передаем ошибку дальше
        }
    }

    // --- Функции рендеринга ---
    function renderUserInfo(db_user, marzban_user) {
        userGreetingEl.innerText = `👋 Привет, ${db_user.full_name}!`;
        
        if (marzban_user.status === 'active') {
            userStatusEl.innerText = 'Активна';
            userStatusEl.style.color = 'var(--tg-theme-link-color, #2481cc)'; // Зеленый или синий
        } else {
            userStatusEl.innerText = 'Неактивна';
            userStatusEl.style.color = 'var(--tg-theme-destructive-text-color, #ef5350)'; // Красный
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
    }

    function renderServers(servers) {
        if (servers.length === 0) {
            serverListEl.innerHTML = '<p>Нет данных о серверах.</p>';
            return;
        }
        servers.forEach(server => {
            const p = document.createElement('p');
            const statusEmoji = server.status === 'online' ? '🟢' : '🔴';
            p.innerHTML = `${statusEmoji} ${server.name} - <b>Загрузка: ${server.load_avg_1m !== null ? (server.load_avg_1m * 100).toFixed(0) + '%' : 'N/A'}</b>`;
            serverListEl.appendChild(p);
        });
    }

    function renderTariffs(tariffsData) {
        if (tariffsData.tariffs.length === 0) {
            tariffListEl.innerHTML = '<p>Нет доступных тарифов.</p>';
            return;
        }
        tariffsData.tariffs.forEach(tariff => {
            const btn = document.createElement('button');
            btn.innerText = `${tariff.name} - от ${tariff.options[0].price} ${tariff.options[0].currency}`;
            btn.onclick = () => {
                // TODO: Добавить логику открытия окна выбора тарифа
                tg.showAlert(`Вы выбрали тариф "${tariff.name}"`);
            };
            tariffListEl.appendChild(btn);
        });
    }

    // --- Главная функция ---
    async function main() {
        try {
            const [userInfo, serversStatus, tariffs] = await Promise.all([
                apiFetch('/api/user/info', { method: 'POST' }),
                apiFetch('/api/servers/status'),
                apiFetch('/api/tariffs/list')
            ]);
            
            renderUserInfo(userInfo.db_user, userInfo.marzban_user);
            renderServers(serversStatus);
            renderTariffs(tariffs);

            mainContentEl.classList.remove('hidden');
            loaderEl.classList.add('hidden');
        } catch (error) {
            loaderEl.innerHTML = `<h2>🚫 Ошибка загрузки</h2><p style="color: var(--tg-theme-hint-color);">${error.message}</p>`;
            tg.showAlert(`Произошла ошибка: ${error.message}`);
        }
    }
    
    main();
});

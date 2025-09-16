// tma-access/app.js

document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    // --- ВАЖНО: Укажи свой URL ---
    const API_BASE_URL = "https://six-peas-hunt.loca.lt";

    // --- Элементы DOM ---
    const loaderEl = document.getElementById('loader');
    const appContainerEl = document.getElementById('app-container');
    const navBarEl = document.getElementById('nav-bar');
    const pages = {
        main: document.getElementById('page-main'),
        tariffs: document.getElementById('page-tariffs'),
        servers: document.getElementById('page-servers'),
    };
    
    tg.ready();
    tg.expand();

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
    async function apiFetch(endpoint, options = {}) { /* ... (код без изменений) ... */ }

    // --- Функции рендеринга ---
    function renderMainPage(userInfo, keysInfo) {
        // ... (код для userGreeting, userStatus, etc.)
        document.getElementById('user-tariff').innerText = userInfo.db_user.current_tariff_id || 'Не выбран';
        
        const keysEl = document.getElementById('user-keys');
        keysEl.innerHTML = ''; // Очищаем
        
        if (keysInfo.subscription_url) {
            const subLink = document.createElement('a');
            subLink.href = keysInfo.subscription_url;
            subLink.className = 'key-button';
            subLink.innerText = '🔗 Добавить подписку';
            subLink.onclick = (e) => { e.preventDefault(); tg.openLink(keysInfo.subscription_url); };
            keysEl.appendChild(subLink);
        }
    }

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
            // ... (обработка ошибок)
        }
    }
    
    main();
});

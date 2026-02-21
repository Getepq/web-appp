/**
 * Инициализация Telegram WebApp SDK.
 */

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0a0c15');
    tg.setBackgroundColor('#0a0c15');
}

function getInitData() {
    return tg?.initData || '';
}

function getTelegramUser() {
    return tg?.initDataUnsafe?.user || null;
}

window.CasinoTelegram = {
    tg,
    getInitData,
    getTelegramUser,
};

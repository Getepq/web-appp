/**
 * UI утилиты: тост, баланс, загрузка, форматирование.
 */

const tg = window.CasinoTelegram?.tg;

function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast show' + (type ? ' ' + type : '');
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred(type === 'success' ? 'success' : 'error');
    }
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function updateBalanceDisplay(balance) {
    const el = document.getElementById('headerBalance');
    if (el) el.textContent = (balance ?? 0).toFixed(2);
    const el2 = document.getElementById('user-balance');
    if (el2) el2.textContent = '$' + (balance ?? 0).toFixed(2);
}

function formatMoney(amount) {
    return '$' + (parseFloat(amount) || 0).toFixed(2);
}

function formatMultiplier(mult) {
    return (parseFloat(mult) || 0).toFixed(2) + 'x';
}

function showLoading(show, text = 'Загрузка...') {
    const loading = document.getElementById('loading');
    const loadingText = document.getElementById('loadingText');
    if (!loading) return;
    if (loadingText) loadingText.textContent = text;
    if (show) {
        loading.classList.remove('hide');
        loading.style.display = 'flex';
    } else {
        loading.classList.add('hide');
        setTimeout(() => {
            loading.style.display = 'none';
        }, 300);
    }
}

window.CasinoUI = {
    showToast,
    updateBalanceDisplay,
    formatMoney,
    formatMultiplier,
    showLoading,
};

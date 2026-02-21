/**
 * Логика игры Crash. Использует API: start -> crash_point с сервера, cashout по кнопке.
 */

const API = window.CasinoAPI;
const UI = window.CasinoUI;
const Config = window.CasinoConfig;

let crashState = {
    sessionId: null,
    crashPoint: null,
    currentMultiplier: 1.0,
    betAmount: 0,
    isPlaying: false,
    gamePhase: 'waiting', // waiting | running | cashed | crashed
    animationId: null,
};

let balance = 0;
let canPlaceBet = true;
let timerInterval = null;
let timerSeconds = 10;

const canvas = document.getElementById('crashCanvas');
const ctx = canvas?.getContext('2d');

function getEl(id) {
    return document.getElementById(id);
}

function updateCrashUI() {
    const multEl = getEl('crashMultiplier');
    const statusEl = getEl('crashStatus');
    const btnEl = getEl('crashAction');
    if (multEl) multEl.textContent = crashState.currentMultiplier.toFixed(2) + 'x';
    if (statusEl) statusEl.textContent = crashState.gamePhase.toUpperCase();
    if (btnEl) {
        if (crashState.gamePhase === 'running' && crashState.isPlaying) {
            btnEl.textContent = 'CASHOUT';
            btnEl.disabled = false;
        } else if (crashState.gamePhase === 'waiting') {
            btnEl.textContent = canPlaceBet ? 'PLACE BET' : 'WAITING...';
            btnEl.disabled = !canPlaceBet;
        } else {
            btnEl.disabled = true;
        }
    }
    if (multEl && crashState.gamePhase === 'crashed') {
        multEl.style.color = 'var(--danger)';
    } else if (multEl) {
        multEl.style.color = '';
    }
    UI.updateBalanceDisplay(balance);
}

function drawCrashGraphSimple() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= canvas.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    const maxM = Math.max(crashState.crashPoint || crashState.currentMultiplier + 1, crashState.currentMultiplier + 0.5);
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255,255,255,0.3)';
    ctx.shadowBlur = 10;
    for (let x = 0; x <= canvas.width; x += 2) {
        const t = x / canvas.width;
        const m = 1 + (crashState.currentMultiplier - 1) * t;
        const y = canvas.height - (m / maxM) * canvas.height * 0.9;
        if (x === 0) ctx.moveTo(0, canvas.height);
        else ctx.lineTo(x, Math.max(0, Math.min(canvas.height, y)));
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function tick() {
    if (crashState.gamePhase !== 'running') {
        crashState.animationId = requestAnimationFrame(tick);
        drawCrashGraphSimple();
        return;
    }
    crashState.currentMultiplier += 0.01;
    updateCrashUI();
    drawCrashGraphSimple();

    if (crashState.isPlaying && crashState.currentMultiplier >= parseFloat(getEl('autoCashout')?.value || 2)) {
        doCashout();
        return;
    }
    if (crashState.currentMultiplier >= crashState.crashPoint) {
        onCrashed();
        return;
    }
    crashState.animationId = requestAnimationFrame(tick);
}

async function doCashout() {
    if (!crashState.isPlaying || !crashState.sessionId) return;
    const mult = crashState.currentMultiplier;
    try {
        const res = await API.crashCashout(crashState.sessionId, mult);
        balance = res.new_balance;
        crashState.isPlaying = false;
        crashState.gamePhase = 'cashed';
        getEl('crashStatus').textContent = 'CASHED';
        updateCrashUI();
        UI.showToast('💰 Выигрыш: ' + UI.formatMoney(res.profit), 'success');
    } catch (e) {
        UI.showToast(e.message || 'Ошибка кэшаута', '');
    }
    setTimeout(resetCrashRound, 2000);
}

function onCrashed() {
    crashState.isPlaying = false;
    crashState.gamePhase = 'crashed';
    getEl('crashStatus').textContent = 'CRASHED';
    const multEl = getEl('crashMultiplier');
    if (multEl) multEl.style.color = 'var(--danger)';
    updateCrashUI();
    UI.showToast('💥 Краш!');
    refreshBalance();
    setTimeout(resetCrashRound, 2000);
}

function resetCrashRound() {
    crashState.sessionId = null;
    crashState.crashPoint = null;
    crashState.currentMultiplier = 1.0;
    crashState.betAmount = 0;
    crashState.isPlaying = false;
    crashState.gamePhase = 'waiting';
    getEl('crashMultiplier').textContent = '1.00x';
    const multEl = getEl('crashMultiplier');
    if (multEl) multEl.style.color = '';
    getEl('crashStatus').textContent = 'WAITING';
    updateCrashUI();
    startTimer();
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerSeconds = 10;
    canPlaceBet = false;
    const btn = getEl('crashAction');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'WAITING...';
    }
    const timerDisplay = getEl('timerDisplay');
    const timerLabel = getEl('timerLabel');
    if (timerDisplay) timerDisplay.textContent = timerSeconds;
    if (timerLabel) timerLabel.textContent = 'WAITING FOR PLAYERS';

    timerInterval = setInterval(() => {
        timerSeconds--;
        if (timerDisplay) timerDisplay.textContent = timerSeconds;
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            canPlaceBet = true;
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'PLACE BET';
            }
            if (timerLabel) timerLabel.textContent = 'BET NOW!';
        }
    }, 1000);
}

async function crashAction() {
    const btn = getEl('crashAction');
    if (crashState.gamePhase === 'running' && crashState.isPlaying) {
        doCashout();
        return;
    }
    if (!canPlaceBet) {
        UI.showToast('Дождитесь таймера!');
        return;
    }
    const bet = parseFloat(getEl('crashBet')?.value || 1);
    const autoCashout = parseFloat(getEl('autoCashout')?.value || 2);
    if (bet < Config.MIN_BET) {
        UI.showToast('Минимум ' + UI.formatMoney(Config.MIN_BET));
        return;
    }
    if (bet > balance) {
        UI.showToast('Недостаточно средств!');
        return;
    }

    UI.showLoading(true, 'Ставка...');
    try {
        const res = await API.startGame('crash', bet);
        balance = (await API.getBalance()) ?? balance;
        crashState.sessionId = res.session_id;
        crashState.crashPoint = res.crash_point;
        crashState.betAmount = bet;
        crashState.isPlaying = true;
        crashState.gamePhase = 'running';
        crashState.currentMultiplier = 1.0;
        if (btn) btn.textContent = 'CASHOUT';
        getEl('crashStatus').textContent = 'RUNNING';
        updateCrashUI();
        if (crashState.animationId) cancelAnimationFrame(crashState.animationId);
        tick();
    } catch (e) {
        UI.showToast(e.message || 'Ошибка ставки');
    }
    UI.showLoading(false);
}

async function refreshBalance() {
    try {
        balance = await API.getBalance();
        UI.updateBalanceDisplay(balance);
    } catch (_) {}
}

function initCrash() {
    const crashActionBtn = getEl('crashAction');
    if (crashActionBtn) crashActionBtn.addEventListener('click', crashAction);

    const balanceWidget = document.querySelector('.balance-widget');
    if (balanceWidget) balanceWidget.addEventListener('click', refreshBalance);

    refreshBalance().then(() => {
        updateCrashUI();
        startTimer();
        if (crashState.animationId) cancelAnimationFrame(crashState.animationId);
        drawCrashGraphSimple();
        crashState.animationId = requestAnimationFrame(tick);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCrash);
} else {
    initCrash();
}

window.CasinoCrash = {
    refreshBalance,
    crashAction,
    getBalance: () => balance,
    setBalance: (v) => { balance = v; updateCrashUI(); },
};

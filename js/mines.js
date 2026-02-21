/**
 * Логика игры Mines. API: start (получаем session_id), reveal по клику, cashout по кнопке.
 */

const API = window.CasinoAPI;
const UI = window.CasinoUI;
const Config = window.CasinoConfig;

const MINES_CELLS = Config.MINES_CELLS || 25;
const GRID_COLS = 5;

let minesState = {
    sessionId: null,
    betAmount: 0,
    isActive: false,
    currentMultiplier: 1.0,
    revealed: [],
};

let balance = 0;

function getEl(id) {
    return document.getElementById(id);
}

function updateMinesUI() {
    UI.updateBalanceDisplay(balance);
    const multEl = getEl('minesMultiplier');
    if (multEl) multEl.textContent = minesState.currentMultiplier.toFixed(2) + 'x';
    const btn = getEl('minesAction');
    if (btn) {
        btn.textContent = minesState.isActive ? 'CASHOUT' : 'START GAME';
        btn.disabled = false;
    }
}

function initMinesGrid() {
    const grid = getEl('minesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < MINES_CELLS; i++) {
        const cell = document.createElement('div');
        cell.className = 'mine-cell';
        cell.dataset.index = String(i);
        cell.textContent = '?';
        cell.addEventListener('click', () => minesReveal(i));
        grid.appendChild(cell);
    }
}

function getCell(index) {
    return document.querySelector(`.mine-cell[data-index="${index}"]`);
}

async function minesReveal(index) {
    if (!minesState.isActive || !minesState.sessionId) return;
    if (minesState.revealed.includes(index)) return;

    const cell = getCell(index);
    if (!cell || cell.classList.contains('revealed') || cell.classList.contains('mine')) return;

    try {
        const res = await API.minesReveal(minesState.sessionId, index);
        const multEl = getEl('minesMultiplier');

        if (res.is_mine) {
            cell.classList.add('mine');
            cell.textContent = '💣';
            balance = (await API.getBalance()) ?? balance;
            minesState.isActive = false;
            if (multEl) multEl.textContent = '0.00x';
            getEl('minesAction').textContent = 'START GAME';
            UI.showToast('💥 Мина! Вы проиграли ' + UI.formatMoney(minesState.betAmount));
            updateMinesUI();
            return;
        }

        minesState.revealed.push(index);
        minesState.currentMultiplier = res.current_multiplier;
        cell.classList.add('revealed');
        cell.textContent = '💎';
        if (multEl) multEl.textContent = res.current_multiplier.toFixed(2) + 'x';

        if (res.game_over && res.profit != null) {
            balance = (await API.getBalance()) ?? balance;
            minesState.isActive = false;
            getEl('minesAction').textContent = 'START GAME';
            UI.showToast('💰 Выигрыш: ' + UI.formatMoney(res.profit + minesState.betAmount), 'success');
        }
        updateMinesUI();
    } catch (e) {
        UI.showToast(e.message || 'Ошибка');
    }
}

async function minesCashout() {
    if (!minesState.isActive || !minesState.sessionId) return;
    try {
        const res = await API.minesCashout(minesState.sessionId, minesState.currentMultiplier);
        balance = res.new_balance;
        minesState.isActive = false;
        getEl('minesAction').textContent = 'START GAME';
        UI.showToast('💰 Выигрыш: ' + UI.formatMoney(res.profit), 'success');
    } catch (e) {
        UI.showToast(e.message || 'Ошибка кэшаута');
    }
    updateMinesUI();
}

async function minesAction() {
    const btn = getEl('minesAction');
    if (minesState.isActive) {
        minesCashout();
        return;
    }

    const bet = parseFloat(getEl('minesBet')?.value || 1);
    const minesCount = parseInt(getEl('minesCount')?.value || 3, 10);
    if (bet < Config.MIN_BET) {
        UI.showToast('Минимум ' + UI.formatMoney(Config.MIN_BET));
        return;
    }
    if (minesCount < Config.MINES_COUNT_MIN || minesCount > Config.MINES_COUNT_MAX) {
        UI.showToast('Количество мин: ' + Config.MINES_COUNT_MIN + '-' + Config.MINES_COUNT_MAX);
        return;
    }
    if (bet > balance) {
        UI.showToast('Недостаточно средств!');
        return;
    }

    UI.showLoading(true, 'Старт игры...');
    try {
        const res = await API.startGame('mines', bet, minesCount);
        balance = (await API.getBalance()) ?? balance;
        minesState.sessionId = res.session_id;
        minesState.betAmount = bet;
        minesState.isActive = true;
        minesState.currentMultiplier = 1.0;
        minesState.revealed = [];
        if (btn) btn.textContent = 'CASHOUT';
        getEl('minesMultiplier').textContent = '1.00x';
        initMinesGrid();
        updateMinesUI();
    } catch (e) {
        UI.showToast(e.message || 'Ошибка старта');
    }
    UI.showLoading(false);
}

async function refreshBalance() {
    try {
        balance = await API.getBalance();
        UI.updateBalanceDisplay(balance);
    } catch (_) {}
}

function initMines() {
    const btn = getEl('minesAction');
    if (btn) btn.addEventListener('click', minesAction);

    const balanceWidget = document.querySelector('.balance-widget');
    if (balanceWidget) balanceWidget.addEventListener('click', refreshBalance);

    initMinesGrid();
    refreshBalance().then(updateMinesUI);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMines);
} else {
    initMines();
}

window.CasinoMines = {
    refreshBalance,
    minesAction,
    getBalance: () => balance,
    setBalance: (v) => { balance = v; updateMinesUI(); },
};

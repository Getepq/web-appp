/**
 * Запросы к backend API. Авторизация через X-Init-Data.
 */

const API_BASE = window.CasinoConfig?.API_BASE || window.location.origin;
const getInitData = () => window.CasinoTelegram?.getInitData() || '';

async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'X-Init-Data': getInitData(),
        ...options.headers,
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.detail || err.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
}

async function getUserInfo() {
    return apiRequest('/api/user/me');
}

async function getBalance() {
    const data = await apiRequest('/api/user/balance');
    return data?.balance ?? 0;
}

async function startGame(gameType, betAmount, minesCount = null) {
    const body = {
        game_type: gameType,
        bet_amount: parseFloat(betAmount),
    };
    if (gameType === 'mines' && minesCount != null) {
        body.mines_count = parseInt(minesCount, 10);
    }
    return apiRequest('/api/game/start', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

async function crashCashout(sessionId, multiplier) {
    return apiRequest('/api/game/crash/cashout', {
        method: 'POST',
        body: JSON.stringify({
            session_id: sessionId,
            multiplier: parseFloat(multiplier),
        }),
    });
}

async function minesReveal(sessionId, cellIndex) {
    return apiRequest('/api/game/mines/reveal', {
        method: 'POST',
        body: JSON.stringify({
            session_id: sessionId,
            cell_index: parseInt(cellIndex, 10),
        }),
    });
}

async function minesCashout(sessionId, multiplier) {
    return apiRequest('/api/game/mines/cashout', {
        method: 'POST',
        body: JSON.stringify({
            session_id: sessionId,
            multiplier: parseFloat(multiplier),
        }),
    });
}

window.CasinoAPI = {
    apiRequest,
    getUserInfo,
    getBalance,
    startGame,
    crashCashout,
    minesReveal,
    minesCashout,
};

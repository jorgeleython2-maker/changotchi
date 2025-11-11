// --- ЗАГРУЗКА И СТАРТ ---
document.addEventListener('DOMContentLoaded', () => {
    document.fonts.load('10px "Press Start 2P"').then(() => {
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('game-window').classList.remove('hidden');
        initializeGame();
    }).catch(err => {
        console.error("Font loading failed, starting anyway:", err);
        initializeGame();
    });
});

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И DOM ---
const DOM = {
    mcapDisplay: document.getElementById('market-cap'), eventLog: document.getElementById('event-log'),
    hypeBar: document.getElementById('hype-bar'), faithBar: document.getElementById('faith-bar'), fudBar: document.getElementById('fud-bar'),
    winScreen: document.getElementById('win-screen'), loseScreen: document.getElementById('lose-screen'),
    loseReason: document.getElementById('lose-reason'), character: document.getElementById('alon-character'),
    actionButtons: { shill: document.getElementById('action-shill'), ama: document.getElementById('action-ama'), ban: document.getElementById('action-ban'), contest: document.getElementById('action-contest') }
};

let state = {};
const CONFIG = {
    START_MCAP: 5000, WIN_MCAP: 1000000, HYPE_DECAY: 0.5, FAITH_DECAY: 0.3, FUD_GAIN: 0.4, 
    MCAP_GROWTH_FACTOR: 0.05, MCAP_PASSIVE_DECAY: 25, 
    ACTION_COOLDOWN: 1500, EVENT_INTERVAL: 15000 
};
let eventInterval;

// --- СЛУЧАЙНЫЕ СОБЫТИЯ ---
const randomEvents = [
    { text: "Elon tweeted 'pump.fun'!", type: 'good', effect: s => { s.hype = 100; s.faith += 20; } },
    { text: "Your coin is top 10 on DexScreener!", type: 'good', effect: s => { s.hype += 40; s.faith += 10; } },
    { text: "SEC is starting an investigation...", type: 'bad', effect: s => { s.fud += 50; s.faith -= 30; s.mcap *= 0.7; } },
    { text: "Major exchange hacked. Panic selling!", type: 'bad', effect: s => { s.fud += 30; s.faith = 10; } },
    { text: "Alon arrested! (rumor)", type: 'bad', effect: s => { s.fud += 70; s.faith -= 50; } },
    { text: "Just another quiet Tuesday in trenches.", type: 'neutral', effect: s => { s.fud += 5; } }
];
function triggerRandomEvent() {
    if (state.isOver || !state.isRunning) return;
    const event = randomEvents[Math.floor(Math.random() * randomEvents.length)];
    event.effect(state);
    logEvent(event.text, event.type);
}

// --- ЛОГИКА АНИМАЦИИ И ДЕЙСТВИЙ ---
function setAnimation(className) {
    DOM.character.classList.add(className);
    setTimeout(() => { DOM.character.classList.remove(className); }, CONFIG.ACTION_COOLDOWN - 200);
}
function handleAction(animClass, log, statChanges) {
    if (state.isOver || state.isCoolingDown) return;
    if (!state.isRunning) {
        state.isRunning = true;
        eventInterval = setInterval(triggerRandomEvent, CONFIG.EVENT_INTERVAL);
        logEvent("Let's cook!");
    } else {
        logEvent(log);
    }
    setAnimation(animClass); statChanges();
    Object.keys(state).forEach(key => { if (typeof state[key] === 'number' && key !== 'mcap') state[key] = Math.min(100, Math.max(0, state[key]))});
    
    state.isCoolingDown = true;
    Object.values(DOM.actionButtons).forEach(btn => btn.disabled = true);
    setTimeout(() => {
        state.isCoolingDown = false;
        if (!state.isOver) Object.values(DOM.actionButtons).forEach(btn => btn.disabled = false);
    }, CONFIG.ACTION_COOLDOWN);
}

// --- ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ ---
function gameTick() {
    if (!state.isRunning || state.isOver) return;
    const oldMcap = state.mcap;
    
    state.hype -= CONFIG.HYPE_DECAY; state.faith -= CONFIG.FAITH_DECAY;
    state.fud += CONFIG.FUD_GAIN; state.mcap -= CONFIG.MCAP_PASSIVE_DECAY;

    const growth = state.mcap * CONFIG.MCAP_GROWTH_FACTOR * ((state.hype + state.faith) / 200 - state.fud / 100);
    state.mcap += growth;
    
    state.mcap = Math.max(CONFIG.START_MCAP, state.mcap);

    Object.keys(state).forEach(key => { if (typeof state[key] === 'number' && key !== 'mcap') state[key] = Math.min(100, Math.max(0, state[key]))});
    
    updateUI(oldMcap); checkGameOver();
}

function updateUI(oldMcap = state.mcap) {
    DOM.mcapDisplay.textContent = `MCAP: $${Math.floor(state.mcap).toLocaleString('en-US')}`;
    
    const mcapDisplayClass = DOM.mcapDisplay.classList;
    if (state.mcap > oldMcap) {
        mcapDisplayClass.add('increase');
        mcapDisplayClass.remove('decrease');
    } else if (state.mcap < oldMcap) {
        mcapDisplayClass.add('decrease');
        mcapDisplayClass.remove('increase');
    }
    setTimeout(() => { mcapDisplayClass.remove('increase', 'decrease'); }, 500);

    DOM.hypeBar.style.width = `${state.hype}%`;
    DOM.faithBar.style.width = `${state.faith}%`;
    DOM.fudBar.style.width = `${state.fud}%`;
}

function logEvent(message, type = 'neutral') {
    DOM.eventLog.textContent = message;
    DOM.eventLog.className = 'hud-text';
    if (type !== 'neutral') DOM.eventLog.classList.add(type);
}

function checkGameOver() {
    if (state.isOver) return;
    let reason = null;
    if (state.mcap >= CONFIG.WIN_MCAP) return endGame(true, "");
    if (state.mcap <= CONFIG.START_MCAP && state.isRunning) reason = "Capitalization hit rock bottom.";
    if (state.hype <= 0) reason = "Hype died. Everyone forgot.";
    else if (state.fud >= 100) reason = "RIP niggas raped the chart, re-launch ASAP.";
    if (reason) endGame(false, reason);
}

function endGame(isWin, reason) {
    if (state.isOver) return;
    state.isOver = true; clearInterval(eventInterval);
    Object.values(DOM.actionButtons).forEach(btn => btn.disabled = true);
    if (isWin) { DOM.winScreen.classList.remove('hidden'); } 
    else { DOM.loseReason.textContent = reason; DOM.loseScreen.classList.remove('hidden'); }
}

function initializeGame() {
    state = { mcap: CONFIG.START_MCAP, hype: 80, faith: 70, fud: 10, isRunning: false, isOver: false, isCoolingDown: false };
    logEvent("Press any button to play with Kuro..."); updateUI();
}

// --- НАЗНАЧЕНИЕ КНОПОК И ЗАПУСК ---
DOM.actionButtons.shill.onclick = () => handleAction('shill', "You softshilled CA!", () => state.hype += 25);
DOM.actionButtons.ama.onclick = () => handleAction('ama', "You're doing shit. Community faith restored!", () => state.faith += 30);
DOM.actionButtons.ban.onclick = () => handleAction('ban', "Fuck FUD, man.", () => state.fud -= 40);
DOM.actionButtons.contest.onclick = () => handleAction('idle', "Building!", () => { state.hype += 10; state.faith += 10; });

setInterval(gameTick, 1000);

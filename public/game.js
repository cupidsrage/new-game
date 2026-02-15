// Game client
let socket = null;
let gameData = null;
let player = null;
let heroMarketListings = [];
let trainingQueueData = [];
let buildingQueueData = [];
let queueRefreshTimer = null;
let authToken = localStorage.getItem('authToken');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        showGame();
        connectToServer();
    }
});

// Auth functions
function showRegister() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
}

async function register() {
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            player = data.player;
            showGame();
            connectToServer();
        } else {
            showError(data.error);
        }
    } catch (error) {
        showError('Registration failed');
    }
}

async function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            player = data.player;
            showGame();
            connectToServer();
        } else {
            showError(data.error);
        }
    } catch (error) {
        showError('Login failed');
    }
}

function logout() {
    localStorage.removeItem('authToken');
    if (queueRefreshTimer) {
        clearInterval(queueRefreshTimer);
        queueRefreshTimer = null;
    }
    location.reload();
}

function showError(message) {
    document.getElementById('loginError').textContent = message;
    setTimeout(() => {
        document.getElementById('loginError').textContent = '';
    }, 3000);
}

function showGame() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
}

// Socket.IO connection
function connectToServer() {
    socket = io();
    startQueueRefreshLoop();

    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('authenticate', authToken);
    });

    socket.on('authenticated', (data) => {
        player = data.player;
        updatePlayerInfo();
        loadGameData();
    });

    socket.on('initialData', (data) => {
        renderTrainingQueue(data.trainingQueue);
        renderBuildingQueue(data.buildingQueue);
        renderMessages(data.messages);

        if (data.spellResearch) {
            player.spellResearch = data.spellResearch;
            renderSpells();
        }

        if (data.productionRates) {
            updateResourceRates(data.productionRates);
        }

        heroMarketListings = data.heroMarketListings || [];
        renderBlackMarket();
    });

    socket.on('resourceUpdate', (resources) => {
        if (resources.gold !== undefined) player.gold = resources.gold;
        if (resources.mana !== undefined) player.mana = resources.mana;
        if (resources.population !== undefined) player.population = resources.population;
        if (resources.land !== undefined) player.land = resources.land;
        if (resources.totalLand !== undefined) player.totalLand = resources.totalLand;

        const hasRates = resources.goldRate !== undefined || resources.manaRate !== undefined || resources.populationRate !== undefined;
        if (hasRates) {
            updateResourceRates({
                gold: resources.goldRate,
                mana: resources.manaRate,
                population: resources.populationRate
            });
        }

        updatePlayerInfo();
    });

    socket.on('unitsUpdate', (units) => {
        player.units = units || {};
        if (document.getElementById('militaryTab').classList.contains('active')) {
            renderUnitsStats();
        }
    });

    socket.on('trainingComplete', (data) => {
        showNotification(`Training complete: ${data.amount} ${data.unitType}`, 'success');
        player.units[data.unitType] = (player.units[data.unitType] || 0) + data.amount;
        if (document.getElementById('militaryTab').classList.contains('active')) {
            renderUnitsStats();
        }
    });

    socket.on('buildingComplete', (data) => {
        const buildingDisplayName = Object.values(gameData?.buildingTypes || {})
            .find(building => building.id === data.buildingType)?.name || data.buildingType;

        showNotification(`Construction complete: ${data.amount} ${buildingDisplayName}`, 'success');
        player.buildings[data.buildingType] = (player.buildings[data.buildingType] || 0) + data.amount;

        if (document.getElementById('kingdomTab').classList.contains('active')) {
            renderBuildings();
        }
    });

    socket.on('queueUpdate', (data) => {
        if (data.trainingQueue) renderTrainingQueue(data.trainingQueue);
        if (data.buildingQueue) renderBuildingQueue(data.buildingQueue);
    });

    socket.on('attacked', (data) => {
        showNotification(data.message, 'danger');
    });

    socket.on('messages', renderMessages);

    socket.on('leaderboard', renderLeaderboard);

    socket.on('combatHistory', renderCombatHistory);

    socket.on('heroMarketUpdate', (listings) => {
        heroMarketListings = listings || [];
        renderBlackMarket();
    });

    socket.on('heroWon', ({ heroId, heroLevel, finalBid }) => {
        const hero = Object.values(gameData?.heroes || {}).find((h) => h.id === heroId);
        const heroName = hero?.name || heroId;
        showNotification(`You won ${heroName} (Lvl ${heroLevel}) for ${Math.floor(finalBid)} gold!`, 'success');
    });

    socket.on('heroInventoryUpdate', (heroes) => {
        player.heroes = heroes || [];
        renderBlackMarket();
        renderHeroes();
    });

    socket.on('spellResearchUpdate', (research) => {
        player.spellResearch = research || [];
        renderSpells();
    });

    socket.on('spellResearchComplete', ({ spellId }) => {
        const spellName = Object.values(gameData?.spells || {}).find((spell) => spell.id === spellId)?.name || spellId;
        showNotification(`Research complete: ${spellName}`, 'success');
        renderSpells();
    });

    socket.on('authError', (error) => {
        alert(error);
        logout();
    });
}

async function loadGameData() {
    const response = await fetch('/api/gamedata');
    gameData = await response.json();
    
    renderBuildings();
    renderTrainUnits();
    renderSpells();
    renderHeroes();
    renderBlackMarket();
}

function updatePlayerInfo() {
    document.getElementById('playerName').textContent = player.username;
    document.getElementById('playerLevel').textContent = `Lvl ${player.level}`;
    document.getElementById('goldAmount').textContent = Math.floor(player.gold);
    document.getElementById('manaAmount').textContent = Math.floor(player.mana);
    document.getElementById('populationAmount').textContent = Math.floor(player.population);
    const totalLand = player.totalLand ?? player.land;
    document.getElementById('landAmount').textContent = player.land;
    document.getElementById('totalLandAmount').textContent = totalLand;

    const landCost = Math.floor(1000 * (1 + totalLand / 100));
    document.getElementById('landCost').textContent = landCost;
}


function updateResourceRates(rates) {
    if (rates.gold !== undefined) {
        document.getElementById('goldRate').textContent = formatRate(rates.gold);
    }
    if (rates.mana !== undefined) {
        document.getElementById('manaRate').textContent = formatRate(rates.mana);
    }
    if (rates.population !== undefined) {
        document.getElementById('populationRate').textContent = formatRate(rates.population);
    }
}

function formatRate(value) {
    const formattedValue = Number.isInteger(value) ? value : value.toFixed(2).replace(/\.00$/, '');
    return `${value >= 0 ? '+' : ''}${formattedValue}/s`;
}

// Tab management
function showTab(tabName, triggerElement = null) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const clickedTab = triggerElement?.currentTarget || triggerElement || Array.from(document.querySelectorAll('.tab-btn'))
        .find(btn => btn.getAttribute('onclick')?.includes(`showTab('${tabName}'`));
    if (clickedTab) {
        clickedTab.classList.add('active');
    }
    document.getElementById(tabName + 'Tab').classList.add('active');

    if (tabName === 'military') {
        renderUnitsStats();
    } else if (tabName === 'leaderboard') {
        socket.emit('getLeaderboard');
    } else if (tabName === 'combat') {
        socket.emit('getCombatHistory');
    } else if (tabName === 'market') {
        socket.emit('getHeroMarketListings');
    }
}

// Kingdom tab
function renderBuildings() {
    const container = document.getElementById('buildingsList');
    container.innerHTML = '';

    for (const [key, building] of Object.entries(gameData.buildingTypes)) {
        const owned = player.buildings[building.id] || 0;
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h4>${building.name}</h4>
            <p>${building.description}</p>
            <p><strong>Cost:</strong> ${building.goldCost} gold, ${building.landCost} land</p>
            <p><strong>Build Time:</strong> ${building.buildTime}s</p>
            <p><strong>Owned:</strong> ${owned}</p>
            ${building.goldPerSecond ? `<p>+${building.goldPerSecond}/s gold</p>` : ''}
            ${building.manaPerSecond ? `<p>+${building.manaPerSecond}/s mana</p>` : ''}
            ${building.populationPerSecond ? `<p>+${building.populationPerSecond}/s population</p>` : ''}
            <div style="display: flex; gap: 0.5rem;">
                <input type="number" id="build_${building.id}" value="1" min="1" style="width: 80px; padding: 0.5rem;">
                <button onclick="buildStructure('${building.id}')">Build</button>
            </div>
        `;
        container.appendChild(card);
    }
}

function buildStructure(buildingType) {
    const amount = Number.parseInt(document.getElementById(`build_${buildingType}`)?.value, 10);

    socket.emit('buildStructure', { buildingType, amount });

    socket.once('buildStructureResult', (result) => {
        if (result.success) {
            showNotification(`Building ${amount} ${buildingType}. Completes in ${result.estimatedTime}s`, 'success');
        } else {
            showNotification(result.error, 'danger');
        }
    });
}

function expandLand(amount) {
    socket.emit('expandLand', { amount });
    
    socket.once('expandLandResult', (result) => {
        if (result.success) {
            showNotification(`Expanded ${amount} land for ${Math.floor(result.cost)} gold`, 'success');
        } else {
            showNotification(result.error, 'danger');
        }
    });
}

function renderBuildingQueue(queue = buildingQueueData) {
    buildingQueueData = Array.isArray(queue) ? queue : [];

    const container = document.getElementById('buildingQueue');
    container.innerHTML = '';

    if (buildingQueueData.length === 0) {
        container.innerHTML = '<p>No buildings in queue</p>';
        return;
    }

    buildingQueueData.forEach(item => {
        const div = document.createElement('div');
        div.className = 'queue-item';
        div.dataset.startedAt = item.started_at;
        div.dataset.completesAt = item.completes_at;
        div.innerHTML = `
            <div>
                <strong>${item.amount}x ${item.building_type}</strong>
                <div>Completes in: <span class="queue-time-left">--</span></div>
                <div class="queue-progress">
                    <div class="queue-progress-bar"></div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    updateQueueCountdowns(container);
}

// Military tab
function renderUnitsStats() {
    const container = document.getElementById('unitsList');
    container.innerHTML = '';

    let totalPower = 0;

    for (const [key, unit] of Object.entries(gameData.unitTypes)) {
        const owned = player.units[unit.id] || 0;
        totalPower += (unit.attack + unit.defense) * owned;
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h4>${unit.name}</h4>
            <p>Attack: ${unit.attack} | Defense: ${unit.defense}</p>
            <p><strong>Owned:</strong> ${owned}</p>
            <p><strong>Upkeep:</strong> ${(unit.upkeepGoldPerSecond || 0).toFixed(2)} gold/s each${unit.upkeepManaPerSecond ? `, ${unit.upkeepManaPerSecond.toFixed(2)} mana/s each` : ''}</p>
            ${owned > 0 ? `<div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;"><input type="number" id="disband_${unit.id}" value="1" min="1" max="${owned}" style="width: 70px; padding: 0.4rem;"><button onclick="disbandUnits('${unit.id}')">Disband</button></div>` : ''}
        `;
        container.appendChild(card);
    }

    const powerCard = document.createElement('div');
    powerCard.className = 'card';
    powerCard.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
    powerCard.style.color = 'white';
    powerCard.innerHTML = `
        <h4>Total Military Power</h4>
        <p style="font-size: 2rem; font-weight: bold;">${totalPower}</p>
    `;
    container.insertBefore(powerCard, container.firstChild);
}

function renderTrainUnits() {
    const container = document.getElementById('trainUnitsList');
    container.innerHTML = '';

    for (const [key, unit] of Object.entries(gameData.unitTypes)) {
        if (unit.trainingTime === 0) continue; // Skip summoned units
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h4>${unit.name}</h4>
            <p>${unit.description}</p>
            <p><strong>Cost:</strong> ${unit.goldCost || 0} gold${unit.manaCost ? `, ${unit.manaCost} mana` : ''}</p>
            <p><strong>Population:</strong> ${unit.populationCost}</p>
            <p><strong>Attack:</strong> ${unit.attack} | <strong>Defense:</strong> ${unit.defense}</p>
            <p><strong>Upkeep:</strong> ${(unit.upkeepGoldPerSecond || 0).toFixed(2)} gold/s${unit.upkeepManaPerSecond ? `, ${unit.upkeepManaPerSecond.toFixed(2)} mana/s` : ''}</p>
            <p><strong>Training Time:</strong> ${unit.trainingTime}s</p>
            <div style="display: flex; gap: 0.5rem;">
                <input type="number" id="train_${unit.id}" value="10" min="1" style="width: 60px; padding: 0.5rem;">
                <button onclick="trainUnits('${unit.id}')">Train</button>
            </div>
        `;
        container.appendChild(card);
    }
}

function trainUnits(unitType) {
    const amount = parseInt(document.getElementById(`train_${unitType}`).value);
    
    socket.emit('trainUnits', { unitType, amount });
    
    socket.once('trainUnitsResult', (result) => {
        if (result.success) {
            showNotification(`Training ${amount} ${unitType}. Completes in ${result.estimatedTime}s`, 'success');
        } else {
            showNotification(result.error, 'danger');
        }
    });
}

function disbandUnits(unitType) {
    const amount = Number.parseInt(document.getElementById(`disband_${unitType}`)?.value, 10);
    socket.emit('disbandUnits', { unitType, amount });

    socket.once('disbandUnitsResult', (result) => {
        if (result.success) {
            showNotification(`Disbanded ${amount} ${unitType}.`, 'success');
        } else {
            showNotification(result.error, 'danger');
        }
    });
}

function renderTrainingQueue(queue = trainingQueueData) {
    trainingQueueData = Array.isArray(queue) ? queue : [];

    const container = document.getElementById('trainingQueue');
    container.innerHTML = '';

    if (trainingQueueData.length === 0) {
        container.innerHTML = '<p>No units in training</p>';
        return;
    }

    trainingQueueData.forEach(item => {
        const div = document.createElement('div');
        div.className = 'queue-item';
        div.dataset.startedAt = item.started_at;
        div.dataset.completesAt = item.completes_at;
        div.innerHTML = `
            <div>
                <strong>${item.amount}x ${item.unit_type}</strong>
                <div>Completes in: <span class="queue-time-left">--</span></div>
                <div class="queue-progress">
                    <div class="queue-progress-bar"></div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    updateQueueCountdowns(container);
}

// Magic tab


function startQueueRefreshLoop() {
    if (queueRefreshTimer) return;

    queueRefreshTimer = setInterval(() => {
        updateQueueCountdowns(document.getElementById('trainingQueue'));
        updateQueueCountdowns(document.getElementById('buildingQueue'));
        updateMarketCountdowns();
        updateSpellCountdowns();
    }, 1000);
}

function updateQueueCountdowns(container) {
    if (!container) return;

    container.querySelectorAll('.queue-item').forEach((item) => {
        const startedAt = Number(item.dataset.startedAt) || 0;
        const completesAt = Number(item.dataset.completesAt) || 0;
        const totalTime = Math.max(1, completesAt - startedAt);
        const timeLeft = Math.max(0, completesAt - Date.now());
        const progress = Math.min(100, Math.max(0, 100 - ((timeLeft / totalTime) * 100)));

        const timeLeftLabel = item.querySelector('.queue-time-left');
        if (timeLeftLabel) {
            timeLeftLabel.textContent = formatTime(timeLeft);
        }

        const progressBar = item.querySelector('.queue-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    });
}

function updateMarketCountdowns() {
    document.querySelectorAll('.market-time-left').forEach((timer) => {
        const endsAt = Number(timer.dataset.endsAt) || 0;
        const remainingMs = Math.max(0, endsAt - Date.now());
        timer.textContent = formatTime(remainingMs);
    });
}

function updateSpellCountdowns() {
    document.querySelectorAll('.spell-research-timer').forEach((timer) => {
        const completesAt = Number(timer.dataset.completesAt) || 0;
        const remainingMs = Math.max(0, completesAt - Date.now());
        timer.textContent = remainingMs > 0
            ? `Researching (${formatTime(remainingMs)})`
            : 'Researching (finishing...)';
    });
}

// Utilities
function showNotification(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `notification ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#2ecc71' : type === 'danger' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: fadeIn 0.3s;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalContent').innerHTML = content;
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

// Game client
let socket = null;
let gameData = null;
let player = null;
let heroMarketListings = [];
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

function renderBuildingQueue(queue) {
    const container = document.getElementById('buildingQueue');
    container.innerHTML = '';

    if (queue.length === 0) {
        container.innerHTML = '<p>No buildings in queue</p>';
        return;
    }

    queue.forEach(item => {
        const timeLeft = Math.max(0, item.completes_at - Date.now());
        const progress = 100 - (timeLeft / (item.completes_at - item.started_at) * 100);
        
        const div = document.createElement('div');
        div.className = 'queue-item';
        div.innerHTML = `
            <div>
                <strong>${item.amount}x ${item.building_type}</strong>
                <div>Completes in: ${formatTime(timeLeft)}</div>
                <div class="queue-progress">
                    <div class="queue-progress-bar" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
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

function renderTrainingQueue(queue) {
    const container = document.getElementById('trainingQueue');
    container.innerHTML = '';

    if (queue.length === 0) {
        container.innerHTML = '<p>No units in training</p>';
        return;
    }

    queue.forEach(item => {
        const timeLeft = Math.max(0, item.completes_at - Date.now());
        const progress = 100 - (timeLeft / (item.completes_at - item.started_at) * 100);
        
        const div = document.createElement('div');
        div.className = 'queue-item';
        div.innerHTML = `
            <div>
                <strong>${item.amount}x ${item.unit_type}</strong>
                <div>Completes in: ${formatTime(timeLeft)}</div>
                <div class="queue-progress">
                    <div class="queue-progress-bar" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Magic tab
let currentSpellFilter = 'all';
const TARGETED_SPELLS = new Set([
    'fireball',
    'lightning_storm',
    'meteor_strike',
    'plague',
    'clairvoyance',
    'teleport',
    'weakness',
    'confusion',
    'steal_mana',
    'summon_dragon'
]);

function getSpellResearchState(spellId) {
    const researchList = player?.spellResearch || [];
    const state = researchList.find(item => item.spell_id === spellId);
    if (!state) return { researched: false, inProgress: false, remainingMs: 0 };

    if (state.completed) {
        return { researched: true, inProgress: false, remainingMs: 0 };
    }

    const remainingMs = Math.max(0, (state.completes_at || 0) - Date.now());
    return { researched: false, inProgress: remainingMs > 0, remainingMs };
}

function renderSpells() {
    const container = document.getElementById('spellsList');
    container.innerHTML = '';

    for (const [key, spell] of Object.entries(gameData.spells)) {
        if (currentSpellFilter !== 'all' && spell.school !== currentSpellFilter) continue;

        const research = getSpellResearchState(spell.id);
        const researchDays = Math.max(1, Number(spell.researchDays) || 1);
        let actionButton = `<button onclick="researchSpell('${spell.id}')">Research Spell</button>`;

        if (research.researched) {
            actionButton = `<button onclick="castSpellPrompt('${spell.id}')">Cast Spell</button>`;
        } else if (research.inProgress) {
            actionButton = `<button disabled>Researching (${formatTime(research.remainingMs)})</button>`;
        }

        const card = document.createElement('div');
        card.className = 'spell-card';
        card.innerHTML = `
            <div class="spell-school">${spell.school}</div>
            <h4>${spell.name}</h4>
            <p>${spell.description}</p>
            <p><strong>Mana Cost:</strong> ${spell.manaCost}</p>
            <p><strong>Cooldown:</strong> ${formatTime(spell.cooldown * 1000)}</p>
            <p><strong>Research Time:</strong> ${researchDays} day${researchDays === 1 ? '' : 's'}</p>
            ${actionButton}
        `;
        container.appendChild(card);
    }
}

function filterSpells(school, triggerElement = null) {
    currentSpellFilter = school;

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const clickedFilter = triggerElement?.currentTarget || triggerElement || Array.from(document.querySelectorAll('.filter-btn'))
        .find(btn => btn.getAttribute('onclick')?.includes(`filterSpells('${school}'`));
    if (clickedFilter) {
        clickedFilter.classList.add('active');
    }
    
    renderSpells();
}

function researchSpell(spellId) {
    socket.emit('researchSpell', { spellId });

    socket.once('researchSpellResult', (result) => {
        if (result.success) {
            showNotification(`Research started. Completes in ${formatTime(result.estimatedResearchTime * 1000)}`, 'success');
            socket.emit('getMessages');
        } else {
            showNotification(result.error, 'danger');
        }
    });
}

function castSpellPrompt(spellId) {
    if (!TARGETED_SPELLS.has(spellId)) {
        castSpell(spellId);
        return;
    }

    showModal('Cast Targeted Spell', `
        <p style="margin-bottom: 0.75rem;">Enter a target username:</p>
        <input id="spellTargetInput" type="text" placeholder="Target username" style="width: 100%; padding: 0.5rem; margin-bottom: 0.75rem;" />
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button onclick="closeModal()">Cancel</button>
            <button onclick="submitSpellTarget('${spellId}')">Cast</button>
        </div>
    `);

    setTimeout(() => {
        document.getElementById('spellTargetInput')?.focus();
    }, 0);
}

function submitSpellTarget(spellId) {
    const target = document.getElementById('spellTargetInput')?.value?.trim();
    if (!target) {
        showNotification('Please enter a target username.', 'danger');
        return;
    }

    closeModal();
    castSpell(spellId, target);
}

function castSpell(spellId, targetPlayerId = null) {
    socket.emit('castSpell', { spellId, targetPlayerId });
    
    socket.once('castSpellResult', (result) => {
        if (result.success) {
            showNotification(`Spell cast successfully!`, 'success');
        } else {
            showNotification(result.error, 'danger');
        }
    });
}

// Heroes tab
function renderHeroes() {
    const yourContainer = document.getElementById('yourHeroes');
    if (!yourContainer || !gameData || !gameData.heroes) return;

    yourContainer.innerHTML = '';

    const heroes = player?.heroes || [];
    if (!heroes.length) {
        yourContainer.innerHTML = '<p>You do not own any heroes yet. Win an auction in the market to recruit one.</p>';
        return;
    }

    heroes.forEach((ownedHero) => {
        const hero = Object.values(gameData.heroes).find((h) => h.id === ownedHero.hero_id);
        if (!hero) return;

        const upkeep = 200 * Math.max(1, Number(ownedHero.level) || 1);
        const unlockedAbilities = hero.abilities.filter((ability) => (ability.unlockLevel || 1) <= ownedHero.level);

        const card = document.createElement('div');
        card.className = 'hero-card';
        card.innerHTML = `
            <h3>${hero.name}</h3>
            <p><strong>Class:</strong> ${hero.class}</p>
            <p><strong>Hero Level:</strong> ${ownedHero.level}</p>
            <p><strong>Stats:</strong> ATK ${Math.floor(ownedHero.attack)} | DEF ${Math.floor(ownedHero.defense)} | HP ${Math.floor(ownedHero.max_health)}</p>
            <p><strong>Upkeep:</strong> ${Math.floor(upkeep)} gold/s</p>
            <p><strong>Unlocked Abilities:</strong></p>
            ${unlockedAbilities.map((ability) => `<div class="ability">• ${ability.name}</div>`).join('') || '<div class="ability">None</div>'}
            <button style="margin-top:0.75rem;" onclick="dismissHero(${ownedHero.id})">Dismiss Hero</button>
        `;
        yourContainer.appendChild(card);
    });
}

function renderBlackMarket() {
    const marketContainer = document.getElementById('marketItems');
    const inventoryContainer = document.getElementById('inventory');
    if (!marketContainer || !inventoryContainer) return;

    marketContainer.innerHTML = '';
    inventoryContainer.innerHTML = '';

    if (!gameData || !gameData.heroes) {
        marketContainer.innerHTML = '<p>Loading Black Market...</p>';
        return;
    }

    if (!heroMarketListings.length) {
        marketContainer.innerHTML = '<p>No hero auctions active. Check back soon.</p>';
    }

    heroMarketListings.forEach((listing) => {
        const hero = Object.values(gameData.heroes).find((h) => h.id === listing.hero_id);
        if (!hero) return;

        const card = document.createElement('div');
        card.className = 'card';
        const minBid = listing.highest_bid ? (listing.highest_bid + 1) : listing.starting_bid;
        card.innerHTML = `
            <h4>${hero.name}</h4>
            <p><strong>Class:</strong> ${hero.class}</p>
            <p><strong>Hero Level:</strong> ${listing.hero_level}</p>
            <p><strong>Current Bid:</strong> ${Math.floor(listing.highest_bid || listing.starting_bid)} gold</p>
            <p><strong>Ends In:</strong> ${formatTime((listing.timeLeftSeconds || 0) * 1000)}</p>
            <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                <input type="number" id="bid_${listing.id}" min="${Math.ceil(minBid)}" value="${Math.ceil(minBid)}" style="width: 100px; padding: 0.4rem;">
                <button onclick="placeHeroBid(${listing.id})">Bid</button>
            </div>
        `;
        marketContainer.appendChild(card);
    });

    const heroes = player?.heroes || [];
    if (!heroes.length) {
        inventoryContainer.innerHTML = '<p>You do not own any heroes yet. Win an auction to recruit one.</p>';
        return;
    }

    heroes.forEach((ownedHero) => {
        const hero = Object.values(gameData.heroes).find((h) => h.id === ownedHero.hero_id);
        if (!hero) return;

        const unlockedAbilities = hero.abilities.filter((ability) => (ability.unlockLevel || 1) <= ownedHero.level);
        const card = document.createElement('div');
        card.className = 'hero-card';
        card.innerHTML = `
            <h3>${hero.name}</h3>
            <p><strong>Hero Level:</strong> ${ownedHero.level}</p>
            <p><strong>Stats:</strong> ATK ${Math.floor(ownedHero.attack)} | DEF ${Math.floor(ownedHero.defense)} | HP ${Math.floor(ownedHero.max_health)}</p>
            <p><strong>Unlocked Abilities:</strong></p>
            ${unlockedAbilities.map((ability) => `<div class="ability">• ${ability.name}</div>`).join('') || '<div class="ability">None</div>'}
            <button style="margin-top:0.75rem;" onclick="dismissHero(${ownedHero.id})">Dismiss Hero</button>
        `;
        inventoryContainer.appendChild(card);
    });
}

function placeHeroBid(listingId) {
    const bidInput = document.getElementById(`bid_${listingId}`);
    if (!bidInput) return;

    const bidAmount = Number.parseInt(bidInput.value, 10);
    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
        showNotification('Enter a valid bid amount.', 'danger');
        return;
    }

    socket.emit('bidOnHero', { listingId, bidAmount });
    socket.once('bidOnHeroResult', (result) => {
        if (result.success) {
            showNotification('Bid placed successfully!', 'success');
        } else {
            showNotification(result.error || 'Bid failed', 'danger');
        }
    });
}

function dismissHero(heroId) {
    socket.emit('dismissHero', { heroId });
    socket.once('dismissHeroResult', (result) => {
        if (result.success) {
            showNotification('Hero dismissed.', 'success');
        } else {
            showNotification(result.error, 'danger');
        }
    });
}

// Combat tab
function attackPlayer() {
    const targetUsername = document.getElementById('targetUsername').value;
    if (!targetUsername) {
        showNotification('Please enter a username', 'danger');
        return;
    }

    // In real implementation, we'd look up player ID from username
    socket.emit('attack', { targetPlayerId: targetUsername });
    
    socket.once('attackResult', (result) => {
        if (result.success) {
            const report = result.report;
            showModal('Battle Report', `
                <div style="margin-bottom: 1rem;">
                    <strong>${report.victory ? 'VICTORY!' : 'DEFEAT'}</strong>
                </div>
                <p>Your Power: ${report.attackerPower}</p>
                <p>Enemy Power: ${report.defenderPower}</p>
                <p>Your Casualties: ${report.attackerUnitsLost} units</p>
                <p>Enemy Casualties: ${report.defenderUnitsLost} units</p>
                ${report.victory ? `
                    <p style="color: #2ecc71;">Gold Stolen: ${report.goldStolen}</p>
                    <p style="color: #2ecc71;">Land Captured: ${report.landCaptured}</p>
                ` : ''}
            `);
        } else {
            showNotification(result.error, 'danger');
        }
    });
}

function renderCombatHistory(history) {
    const container = document.getElementById('combatHistory');
    container.innerHTML = '';

    if (history.length === 0) {
        container.innerHTML = '<p>No combat history</p>';
        return;
    }

    history.forEach(combat => {
        const report = JSON.parse(combat.combat_report);
        const isAttacker = combat.attacker_id === player.id;
        const victory = isAttacker ? report.victory : !report.victory;
        
        const div = document.createElement('div');
        div.className = `combat-item ${victory ? 'victory' : 'defeat'}`;
        div.innerHTML = `
            <div><strong>${victory ? 'Victory' : 'Defeat'}</strong></div>
            <div>${isAttacker ? 'Attacked' : 'Defended against'} player</div>
            <div>${new Date(combat.timestamp).toLocaleString()}</div>
        `;
        container.appendChild(div);
    });
}

// Leaderboard
function renderLeaderboard(players) {
    const container = document.getElementById('leaderboardList');
    container.innerHTML = '';

    players.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        div.innerHTML = `
            <div class="rank">#${index + 1}</div>
            <div><strong>${p.username}</strong></div>
            <div>Lvl ${p.level}</div>
            <div>${p.land} wild / ${p.total_land} total</div>
            <div>${p.wins}W/${p.losses}L</div>
        `;
        container.appendChild(div);
    });
}

// Messages
function renderMessages(messages) {
    const container = document.getElementById('messagesList');
    container.innerHTML = '';

    const unreadCount = messages.filter(m => m.read === 0).length;
    document.getElementById('unreadCount').textContent = unreadCount || '';

    messages.slice(0, 10).forEach(msg => {
        const div = document.createElement('div');
        div.className = `message-item ${msg.type}`;
        div.innerHTML = `
            <div>${msg.message}</div>
            <div style="font-size: 0.8rem; color: #95a5a6; margin-top: 0.3rem;">
                ${new Date(msg.timestamp).toLocaleTimeString()}
            </div>
        `;
        container.appendChild(div);
    });

    if (unreadCount > 0) {
        socket.emit('markMessagesRead');
    }
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

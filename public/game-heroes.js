// Heroes and hero market logic
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
            <p><strong>Ends In:</strong> <span class="market-time-left" data-ends-at="${Date.now() + ((listing.timeLeftSeconds || 0) * 1000)}">--</span></p>
            <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                <input type="number" id="bid_${listing.id}" min="${Math.ceil(minBid)}" value="${Math.ceil(minBid)}" style="width: 100px; padding: 0.4rem;">
                <button onclick="placeHeroBid(${listing.id})">Bid</button>
            </div>
        `;
        marketContainer.appendChild(card);
    });

    updateMarketCountdowns();

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


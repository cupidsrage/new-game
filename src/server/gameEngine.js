const { SPELLS, UNIT_TYPES, BUILDING_TYPES, HEROES, ITEMS, GAME_CONFIG } = require('../shared/gameData');

class GameEngine {
  constructor(database, io) {
    this.db = database;
    this.io = io;
    this.players = new Map();
    this.heroMarketConfig = {
      minListingDurationSeconds: 24 * 60 * 60,
      maxListingDurationSeconds: 24 * 60 * 60,
      maxActiveListings: 6
    };
    this.startGameLoop();
  }

  startGameLoop() {
    // Main game tick - runs every second
    setInterval(() => {
      void this.tick();
    }, GAME_CONFIG.TICK_RATE);

    // Process queues every 5 seconds
    setInterval(() => {
      void this.processQueues();
    }, 5000);

    // Clean expired effects every minute
    setInterval(() => {
      void this.db.cleanExpiredEffects();
    }, 60000);

    // Resolve hero market listings and generate fresh listings
    setInterval(() => {
      void this.processHeroMarket();
    }, 5000);
  }

  async tick() {
    // Update resources for all active players
    for (const [playerId] of this.players) {
      try {
        let player = await this.db.getPlayer(playerId);
        if (!player) continue;

        let production = this.calculateProduction(player);

        if (player.gold + production.gold < 0) {
          const upkeepResolution = await this.resolveNegativeGold(player, production);
          player = upkeepResolution.player;
          production = upkeepResolution.production;
        }

        // Update resources
        player.gold = Math.max(0, player.gold + production.gold);
        player.mana = Math.max(0, player.mana + production.mana);
        player.population = Math.max(0, player.population + production.population);

        // Save to database
        await this.db.updatePlayerResources(playerId, player.gold, player.mana, player.population, player.land, player.total_land);

        // Emit update to client
        if (this.io) {
          this.io.to(playerId).emit('resourceUpdate', {
            gold: Math.floor(player.gold),
            mana: Math.floor(player.mana),
            population: Math.floor(player.population),
            land: player.land,
            totalLand: player.total_land,
            goldRate: production.gold,
            manaRate: production.mana,
            populationRate: production.population
          });
        }
      } catch (error) {
        console.error(`Error processing tick for player ${playerId}:`, error);
      }
    }
  }


  getUnitGoldUpkeep(unitType, amount) {
    const unit = UNIT_TYPES[(unitType || '').toUpperCase()];
    if (!unit || !unit.upkeepGoldPerSecond || amount <= 0) return 0;
    return unit.upkeepGoldPerSecond * amount;
  }

  getUnitManaUpkeep(unitType, amount) {
    const unit = UNIT_TYPES[(unitType || '').toUpperCase()];
    if (!unit || !unit.upkeepManaPerSecond || amount <= 0) return 0;
    return unit.upkeepManaPerSecond * amount;
  }

  async resolveNegativeGold(player, production) {
    const playerId = player.id;
    let currentPlayer = player;
    let currentProduction = production;
    const notifications = [];

    const projectedGold = () => currentPlayer.gold + currentProduction.gold;

    if (projectedGold() < 0 && (currentPlayer.heroes || []).length > 0) {
      const heroesByUpkeep = [...currentPlayer.heroes].sort((a, b) => {
        const upkeepA = 200 * Math.max(1, Number(a.level) || 1);
        const upkeepB = 200 * Math.max(1, Number(b.level) || 1);
        return upkeepB - upkeepA;
      });

      for (const hero of heroesByUpkeep) {
        if (projectedGold() >= 0) break;

        await this.db.removePlayerHero(playerId, hero.id);
        const heroLevel = Math.max(1, Number(hero.level) || 1);
        const heroUpkeep = 200 * heroLevel;
        currentProduction.gold += heroUpkeep;

        const heroName = HEROES[(hero.hero_id || '').toUpperCase()]?.name || hero.hero_id || 'A hero';
        notifications.push(`${heroName} left your kingdom because you could not pay upkeep.`);
      }

      if (notifications.length > 0) {
        currentPlayer = await this.db.getPlayer(playerId);
      }
    }

    if (projectedGold() < 0) {
      const unitsByUpkeep = Object.entries(currentPlayer.units || {})
        .map(([unitType, amount]) => ({
          unitType,
          amount,
          upkeep: this.getUnitGoldUpkeep(unitType, amount)
        }))
        .filter((entry) => entry.amount > 0 && entry.upkeep > 0)
        .sort((a, b) => b.upkeep - a.upkeep);

      for (const unitEntry of unitsByUpkeep) {
        if (projectedGold() >= 0) break;

        const upkeepPerUnit = this.getUnitGoldUpkeep(unitEntry.unitType, 1);
        let amount = unitEntry.amount;
        while (amount > 0 && projectedGold() < 0) {
          amount -= 1;
          await this.db.updateUnits(playerId, unitEntry.unitType, amount);
          currentProduction.gold += upkeepPerUnit;
        }

        if (amount < unitEntry.amount) {
          const departed = unitEntry.amount - amount;
          notifications.push(`${departed} ${unitEntry.unitType} deserted due to unpaid upkeep.`);
        }
      }

      if (notifications.length > 0) {
        currentPlayer = await this.db.getPlayer(playerId);
      }
    }

    for (const message of notifications) {
      await this.db.addMessage(playerId, message, 'danger');
    }

    if (notifications.length > 0 && this.io) {
      this.io.to(playerId).emit('heroInventoryUpdate', currentPlayer.heroes || []);
    }

    return {
      player: currentPlayer,
      production: currentProduction
    };
  }

  calculateProduction(player) {
    let grossGoldPerSecond = GAME_CONFIG.BASE_GOLD_INCOME;
    let manaPerSecond = GAME_CONFIG.BASE_MANA_INCOME;
    let populationPerSecond = GAME_CONFIG.BASE_POPULATION_GROWTH / 60; // Per second

    // Add building bonuses
    for (const [buildingType, amount] of Object.entries(player.buildings || {})) {
      const building = BUILDING_TYPES[buildingType.toUpperCase()];
      if (!building) continue;

      if (building.goldPerSecond) {
        grossGoldPerSecond += building.goldPerSecond * amount;
      }
      if (building.manaPerSecond) {
        manaPerSecond += building.manaPerSecond * amount;
      }
      if (building.populationPerSecond) {
        populationPerSecond += building.populationPerSecond * amount;
      }
    }

    // Apply troop and hero upkeep costs
    let totalUpkeepGoldPerSecond = 0;
    let totalUpkeepManaPerSecond = 0;

    for (const [unitType, amount] of Object.entries(player.units || {})) {
      totalUpkeepGoldPerSecond += this.getUnitGoldUpkeep(unitType, amount);
      totalUpkeepManaPerSecond += this.getUnitManaUpkeep(unitType, amount);
    }

    for (const hero of player.heroes || []) {
      const heroLevel = Math.max(1, Number(hero.level) || 1);
      totalUpkeepGoldPerSecond += 200 * heroLevel;
    }

    // Apply active effects/buffs
    const now = Date.now();
    for (const effect of player.activeEffects || []) {
      if (effect.expires_at > now) {
        if (effect.effect_type === 'buff_resource') {
          if (effect.source === 'gold') {
            grossGoldPerSecond *= effect.multiplier;
          } else if (effect.source === 'mana') {
            manaPerSecond *= effect.multiplier;
          }
        }
      }
    }

    const goldPerSecond = grossGoldPerSecond - totalUpkeepGoldPerSecond;
    const netManaPerSecond = manaPerSecond - totalUpkeepManaPerSecond;

    return {
      gold: goldPerSecond,
      mana: netManaPerSecond,
      population: populationPerSecond
    };
  }

  async getProductionRates(playerId) {
    const player = await this.db.getPlayer(playerId);
    if (!player) return null;

    return this.calculateProduction(player);
  }

  async processQueues() {
    const now = Date.now();

    // Process one training stack at a time
    for (const [playerId] of this.players) {
      const trainingQueue = await this.db.getTrainingQueue(playerId);
      const trainingItem = trainingQueue[0];

      if (trainingItem && trainingItem.completes_at <= now) {
        const player = await this.db.getPlayer(playerId);
        const currentAmount = player.units[trainingItem.unit_type] || 0;
        await this.db.updateUnits(playerId, trainingItem.unit_type, currentAmount + trainingItem.amount);
        await this.db.completeTraining(trainingItem.id);

        this.io.to(playerId).emit('trainingComplete', {
          unitType: trainingItem.unit_type,
          amount: trainingItem.amount
        });

        await this.db.addMessage(playerId, `Training complete: ${trainingItem.amount} ${trainingItem.unit_type}`, 'success');
        this.io.to(playerId).emit('queueUpdate', { trainingQueue: await this.db.getTrainingQueue(playerId) });
      }

      // Process one building stack at a time
      const buildingQueue = await this.db.getBuildingQueue(playerId);
      const buildingItem = buildingQueue[0];

      if (buildingItem && buildingItem.completes_at <= now) {
        const player = await this.db.getPlayer(playerId);
        const currentAmount = player.buildings[buildingItem.building_type] || 0;
        await this.db.updateBuildings(playerId, buildingItem.building_type, currentAmount + buildingItem.amount);
        await this.db.completeBuilding(buildingItem.id);

        this.io.to(playerId).emit('buildingComplete', {
          buildingType: buildingItem.building_type,
          amount: buildingItem.amount
        });

        await this.db.addMessage(playerId, `Construction complete: ${buildingItem.amount} ${buildingItem.building_type}`, 'success');
        this.io.to(playerId).emit('queueUpdate', { buildingQueue: await this.db.getBuildingQueue(playerId) });
      }

      // Process spell research
      const spellResearch = await this.db.getSpellResearch(playerId);
      for (const research of spellResearch) {
        if (!research.completed && research.completes_at <= now) {
          const completed = await this.db.completeSpellResearch(research.id);
          if (!completed) continue;

          const spellName = Object.values(SPELLS).find((spell) => spell.id === completed.spell_id)?.name || completed.spell_id;
          await this.db.addMessage(playerId, `Spell research complete: ${spellName}`, 'success');
          this.io.to(playerId).emit('spellResearchComplete', {
            spellId: completed.spell_id,
            completesAt: completed.completes_at
          });
          this.io.to(playerId).emit('spellResearchUpdate', await this.db.getSpellResearch(playerId));
        }
      }
    }
  }

  async registerPlayer(playerId, socketId) {
    this.players.set(playerId, { socketId, lastUpdate: Date.now() });
    await this.ensureHeroMarketSupply();
    await this.emitHeroMarketUpdate();
  }


  getRandomHeroMarketLevel() {
    const roll = Math.random();
    if (roll < 0.45) return 1;
    if (roll < 0.75) return 2;
    if (roll < 0.92) return 3;
    if (roll < 0.98) return 4;
    return 5;
  }

  scaleHeroStats(heroDefinition, level) {
    const levelMultiplier = 1 + ((level - 1) * 0.12);
    return {
      attack: Math.floor((heroDefinition.baseStats.attack || 0) * levelMultiplier),
      defense: Math.floor((heroDefinition.baseStats.defense || 0) * levelMultiplier),
      health: Math.floor((heroDefinition.baseStats.health || 0) * levelMultiplier)
    };
  }

  async generateHeroMarketListing() {
    const heroPool = Object.values(HEROES);
    if (!heroPool.length) return null;

    const hero = heroPool[Math.floor(Math.random() * heroPool.length)];
    const heroLevel = this.getRandomHeroMarketLevel();
    const durationSeconds = this.heroMarketConfig.minListingDurationSeconds +
      Math.floor(Math.random() * (this.heroMarketConfig.maxListingDurationSeconds - this.heroMarketConfig.minListingDurationSeconds + 1));

    const startingBid = Math.floor(hero.goldCost * (0.65 + (heroLevel * 0.18)));
    return await this.db.createHeroMarketListing(hero.id, heroLevel, startingBid, Date.now() + (durationSeconds * 1000));
  }

  async ensureHeroMarketSupply() {
    const active = await this.db.getHeroMarketListings();
    const needed = this.heroMarketConfig.maxActiveListings - active.length;

    if (needed <= 0) return;

    for (let i = 0; i < needed; i += 1) {
      await this.generateHeroMarketListing();
    }
  }

  async emitHeroMarketUpdate() {
    if (!this.io) return;

    const listings = (await this.db.getHeroMarketListings()).map((listing) => ({
      ...listing,
      timeLeftSeconds: Math.max(0, Math.ceil((listing.expires_at - Date.now()) / 1000))
    }));

    this.io.emit('heroMarketUpdate', listings);
  }

  async processHeroMarket() {
    const expiredListings = await this.db.getExpiredHeroListings();

    for (const listing of expiredListings) {
      const resolved = await this.db.completeHeroListing(listing.id);
      if (!resolved) continue;

      const { listing: completedListing, highestBid } = resolved;
      const heroDefinition = HEROES[(completedListing.hero_id || '').toUpperCase()];

      if (!heroDefinition || !highestBid) {
        continue;
      }

      const stats = this.scaleHeroStats(heroDefinition, completedListing.hero_level);
      await this.db.addHeroToPlayer(highestBid.player_id, completedListing.hero_id, completedListing.hero_level, stats);
      await this.db.addMessage(highestBid.player_id,
        `You won ${heroDefinition.name} (Level ${completedListing.hero_level}) for ${Math.floor(highestBid.bid_amount)} gold in the Black Market!`,
        'success');

      const winner = await this.db.getPlayer(highestBid.player_id);
      this.io.to(highestBid.player_id).emit('heroWon', {
        heroId: completedListing.hero_id,
        heroLevel: completedListing.hero_level,
        finalBid: highestBid.bid_amount
      });
      this.io.to(highestBid.player_id).emit('heroInventoryUpdate', winner.heroes || []);
    }

    await this.ensureHeroMarketSupply();
    await this.emitHeroMarketUpdate();
  }

  async getHeroMarketListings() {
    return (await this.db.getHeroMarketListings()).map((listing) => ({
      ...listing,
      timeLeftSeconds: Math.max(0, Math.ceil((listing.expires_at - Date.now()) / 1000))
    }));
  }

  async bidOnHeroMarket(playerId, listingId, bidAmount) {
    const listing = await this.db.getHeroMarketListingWithHighestBid(listingId);
    if (!listing || listing.status !== 'active') {
      return { success: false, error: 'Listing not found' };
    }

    if (listing.expires_at <= Date.now()) {
      return { success: false, error: 'Listing already ended' };
    }

    const result = await this.db.placeHeroMarketBid(listingId, playerId, bidAmount);
    if (!result.success) {
      return result;
    }

    await this.db.addMessage(playerId, `Bid placed: ${Math.floor(bidAmount)} gold`, 'info');
    await this.emitHeroMarketUpdate();

    return { success: true };
  }

  unregisterPlayer(playerId) {
    this.players.delete(playerId);
  }

  async trainUnits(playerId, unitType, amount) {
    const player = await this.db.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    amount = Number.parseInt(amount, 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      return { success: false, error: 'Amount must be a positive integer' };
    }

    const unit = UNIT_TYPES[unitType.toUpperCase()];
    if (!unit) return { success: false, error: 'Invalid unit type' };

    const totalGoldCost = (unit.goldCost || 0) * amount;
    const totalManaCost = (unit.manaCost || 0) * amount;
    const totalPopulationCost = unit.populationCost * amount;

    // Check resources
    if (player.gold < totalGoldCost) {
      return { success: false, error: 'Not enough gold' };
    }
    if (player.mana < totalManaCost) {
      return { success: false, error: 'Not enough mana' };
    }
    if (player.population < totalPopulationCost) {
      return { success: false, error: 'Not enough population' };
    }

    // Deduct resources
    player.gold -= totalGoldCost;
    player.mana -= totalManaCost;
    player.population -= totalPopulationCost;
    await this.db.updatePlayerResources(playerId, player.gold, player.mana, player.population, player.land, player.total_land);

    // Add to training queue
    const baseTime = unit.trainingTime * amount;
    let trainingTime = baseTime;

    // Apply training speed bonuses
    const barracksCount = player.buildings.barracks || 0;
    const barracks = BUILDING_TYPES.BARRACKS;
    if (barracksCount > 0 && barracks.trainingSpeedBonus) {
      trainingTime = trainingTime / (1 + barracks.trainingSpeedBonus * barracksCount);
    }

    // Apply time warp buff
    for (const effect of player.activeEffects || []) {
      if (effect.effect_type === 'buff_speed' && effect.expires_at > Date.now()) {
        trainingTime = trainingTime / effect.multiplier;
      }
    }

    const queueStartAt = await this.db.getTrainingQueueReadyAt(playerId, Date.now());
    const completesAt = queueStartAt + (trainingTime * 1000);
    await this.db.addToTrainingQueue(playerId, unitType, amount, queueStartAt, completesAt);

    return {
      success: true,
      completesAt,
      estimatedTime: Math.floor(trainingTime)
    };
  }

  async buildStructure(playerId, buildingType, amount = 1) {
    const player = await this.db.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    amount = Number.parseInt(amount, 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      return { success: false, error: 'Amount must be a positive integer' };
    }

    const building = BUILDING_TYPES[buildingType.toUpperCase()];
    if (!building) return { success: false, error: 'Invalid building type' };

    const totalGoldCost = building.goldCost * amount;
    const totalLandCost = building.landCost * amount;

    // Check resources
    if (player.gold < totalGoldCost) {
      return { success: false, error: 'Not enough gold' };
    }
    if (player.land < totalLandCost) {
      return { success: false, error: 'Not enough land' };
    }

    // Deduct resources
    player.gold -= totalGoldCost;
    player.land -= totalLandCost;
    await this.db.updatePlayerResources(playerId, player.gold, player.mana, player.population, player.land, player.total_land);

    // Add to building queue
    let buildTime = building.buildTime * amount;

    // Apply time warp buff
    for (const effect of player.activeEffects || []) {
      if (effect.effect_type === 'buff_speed' && effect.expires_at > Date.now()) {
        buildTime = buildTime / effect.multiplier;
      }
    }

    const queueStartAt = await this.db.getBuildingQueueReadyAt(playerId, Date.now());
    const completesAt = queueStartAt + (buildTime * 1000);
    await this.db.addToBuildingQueue(playerId, buildingType, amount, queueStartAt, completesAt);

    return {
      success: true,
      completesAt,
      estimatedTime: Math.floor(buildTime)
    };
  }


  async disbandUnits(playerId, unitType, amount) {
    const player = await this.db.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    amount = Number.parseInt(amount, 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      return { success: false, error: 'Amount must be a positive integer' };
    }

    const unit = UNIT_TYPES[unitType.toUpperCase()];
    if (!unit) return { success: false, error: 'Invalid unit type' };

    const currentAmount = player.units[unitType] || 0;
    if (currentAmount < amount) {
      return { success: false, error: `You only have ${currentAmount} ${unitType}` };
    }

    await this.db.updateUnits(playerId, unitType, currentAmount - amount);
    await this.db.addMessage(playerId, `You disbanded ${amount} ${unitType}.`, 'info');

    return { success: true, unitType, amount };
  }

  async dismissHero(playerId, heroRecordId) {
    const player = await this.db.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const numericHeroId = Number.parseInt(heroRecordId, 10);
    if (!Number.isInteger(numericHeroId) || numericHeroId <= 0) {
      return { success: false, error: 'Invalid hero id' };
    }

    const hero = (player.heroes || []).find((ownedHero) => ownedHero.id === numericHeroId);
    if (!hero) return { success: false, error: 'Hero not found' };

    await this.db.removePlayerHero(playerId, numericHeroId);
    const heroName = HEROES[(hero.hero_id || '').toUpperCase()]?.name || hero.hero_id || 'Hero';
    await this.db.addMessage(playerId, `${heroName} has been dismissed from your kingdom.`, 'info');

    return { success: true, heroId: numericHeroId };
  }

  calculateSpellResearchTime(player, spell) {
    const baseResearchDays = Math.max(1, Number(spell.researchDays) || 1);
    const baseResearchSeconds = baseResearchDays * 24 * 60 * 60;
    const universityCount = player.buildings.university || 0;
    const reductionMinutesPerUniversity = BUILDING_TYPES.UNIVERSITY?.researchTimeReductionMinutes || 0;
    const reductionSeconds = universityCount * reductionMinutesPerUniversity * 60;
    return Math.max(60, baseResearchSeconds - reductionSeconds);
  }

  async startSpellResearch(playerId, spellId) {
    const player = await this.db.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const spell = SPELLS[spellId.toUpperCase()];
    if (!spell) return { success: false, error: 'Invalid spell' };

    const existingResearch = await this.db.getSpellResearch(playerId);
    const activeResearch = existingResearch.find((item) => !item.completed && item.completes_at > Date.now());
    if (activeResearch && activeResearch.spell_id !== spell.id) {
      const remainingSeconds = Math.ceil((activeResearch.completes_at - Date.now()) / 1000);
      return { success: false, error: `You can only research one spell at a time (${remainingSeconds}s remaining)` };
    }

    const existing = existingResearch.find((item) => item.spell_id === spell.id);
    if (existing?.completed) {
      return { success: false, error: 'Spell already researched' };
    }
    if (existing && !existing.completed && existing.completes_at > Date.now()) {
      const remainingSeconds = Math.ceil((existing.completes_at - Date.now()) / 1000);
      return { success: false, error: `Research already in progress (${remainingSeconds}s remaining)` };
    }

    const researchSeconds = this.calculateSpellResearchTime(player, spell);
    const completesAt = Date.now() + (researchSeconds * 1000);
    await this.db.startSpellResearch(playerId, spell.id, completesAt);

    return {
      success: true,
      spellId: spell.id,
      completesAt,
      estimatedResearchTime: Math.floor(researchSeconds)
    };
  }

  async castSpell(playerId, spellId, targetPlayerId = null) {
    const player = await this.db.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const spell = SPELLS[spellId.toUpperCase()];
    if (!spell) return { success: false, error: 'Invalid spell' };

    const spellResearch = await this.db.getSpellResearch(playerId);
    const researchedSpell = spellResearch.find((item) => item.spell_id === spell.id);
    if (!researchedSpell || !researchedSpell.completed) {
      if (researchedSpell && researchedSpell.completes_at > Date.now()) {
        const remainingSeconds = Math.ceil((researchedSpell.completes_at - Date.now()) / 1000);
        return { success: false, error: `Spell research in progress (${remainingSeconds}s remaining)` };
      }
      return { success: false, error: 'Spell not researched yet' };
    }

    // Check mana
    if (player.mana < spell.manaCost) {
      return { success: false, error: 'Not enough mana' };
    }

    // Check cooldown
    const cooldowns = await this.db.getSpellCooldowns(playerId);
    const cooldown = cooldowns.find(c => c.spell_id === spellId);
    if (cooldown && cooldown.ready_at > Date.now()) {
      const remaining = Math.ceil((cooldown.ready_at - Date.now()) / 1000);
      return { success: false, error: `Spell on cooldown for ${remaining}s` };
    }

    // Get target if needed
    let target = null;
    if (targetPlayerId) {
      target = await this.db.getPlayer(targetPlayerId);
      if (!target) return { success: false, error: 'Target not found' };
    }

    // Deduct mana
    player.mana -= spell.manaCost;
    await this.db.updatePlayerResources(playerId, player.gold, player.mana, player.population, player.land, player.total_land);

    // Set cooldown
    const readyAt = Date.now() + (spell.cooldown * 1000);
    await this.db.setSpellCooldown(playerId, spellId, readyAt);

    // Apply spell effect
    const result = this.applySpellEffect(player, target, spell);

    // Update stats
    await this.db.incrementPlayerStats(playerId, { total_spells_cast: 1 });

    return {
      success: true,
      result,
      cooldownEnds: readyAt
    };
  }

  async applySpellEffect(caster, target, spell) {
    const effect = spell.effect(caster, target);
    const now = Date.now();

    switch (effect.type) {
      case 'damage_units':
        if (target) {
          const totalUnits = Object.values(target.units).reduce((a, b) => a + b, 0);
          const unitsToKill = Math.floor(totalUnits * effect.percentage);
          
          // Distribute damage across unit types
          let remaining = unitsToKill;
          for (const [unitType, amount] of Object.entries(target.units)) {
            if (remaining <= 0) break;
            const killed = Math.min(amount, remaining);
            await this.db.updateUnits(target.id, unitType, amount - killed);
            remaining -= killed;
          }

          await this.db.addMessage(target.id, effect.message, 'combat');
          this.io.to(target.id).emit('attacked', { message: effect.message });
        }
        break;

      case 'buff_resource':
        await this.db.addEffect(caster.id, 'buff_resource', effect.multiplier, now + (effect.duration * 1000), effect.resource);
        await this.db.addMessage(caster.id, effect.message, 'buff');
        break;

      case 'buff_defense':
        await this.db.addEffect(caster.id, 'buff_defense', effect.multiplier, now + (effect.duration * 1000), 'defense');
        await this.db.addMessage(caster.id, effect.message, 'buff');
        break;

      case 'buff_offense':
        await this.db.addEffect(caster.id, 'buff_offense', effect.multiplier, now + (effect.duration * 1000), 'offense');
        await this.db.addMessage(caster.id, effect.message, 'buff');
        break;

      case 'buff_speed':
        await this.db.addEffect(caster.id, 'buff_speed', effect.multiplier, now + (effect.duration * 1000), 'speed');
        await this.db.addMessage(caster.id, effect.message, 'buff');
        break;

      case 'buff_immunity':
        await this.db.addEffect(caster.id, 'buff_immunity', 1, now + (effect.duration * 1000), 'immunity');
        await this.db.addMessage(caster.id, effect.message, 'buff');
        break;

      case 'summon_units':
        const currentAmount = caster.units[effect.unitType] || 0;
        await this.db.updateUnits(caster.id, effect.unitType, currentAmount + effect.amount);
        await this.db.addMessage(caster.id, effect.message, 'success');
        break;

      case 'dragon_attack': {
        const currentDragons = caster.units.dragons || 0;
        await this.db.updateUnits(caster.id, 'dragons', currentDragons + 1);

        if (target) {
          const totalUnits = Object.values(target.units || {}).reduce((sum, amount) => sum + amount, 0);
          const unitsToKill = Math.floor(totalUnits * effect.damage);
          let remaining = unitsToKill;

          for (const [unitType, amount] of Object.entries(target.units || {})) {
            if (remaining <= 0) break;
            const killed = Math.min(amount, remaining);
            await this.db.updateUnits(target.id, unitType, amount - killed);
            remaining -= killed;
          }

          await this.db.addMessage(target.id, effect.message, 'combat');
          this.io.to(target.id).emit('attacked', { message: effect.message });
        }

        await this.db.addMessage(caster.id, effect.message, 'success');
        break;
      }

      case 'instant_resource':
        caster.gold += effect.gold || 0;
        caster.mana += effect.mana || 0;
        await this.db.updatePlayerResources(caster.id, caster.gold, caster.mana, caster.population, caster.land, caster.total_land);
        await this.db.addMessage(caster.id, effect.message, 'success');
        break;

      case 'steal_resource':
        if (target) {
          const amount = Math.floor(target[effect.resource] * effect.percentage);
          target[effect.resource] -= amount;
          caster[effect.resource] += amount;
          await this.db.updatePlayerResources(target.id, target.gold, target.mana, target.population, target.land, target.total_land);
          await this.db.updatePlayerResources(caster.id, caster.gold, caster.mana, caster.population, caster.land, caster.total_land);
          await this.db.addMessage(target.id, effect.message, 'combat');
        }
        break;
    }

    return effect;
  }

  async attack(attackerId, defenderId) {
    const attacker = await this.db.getPlayer(attackerId);
    const defender = await this.db.getPlayer(defenderId);

    if (!attacker || !defender) {
      return { success: false, error: 'Invalid players' };
    }

    // Check if defender has immunity
    const hasImmunity = defender.activeEffects.some(e => 
      e.effect_type === 'buff_immunity' && e.expires_at > Date.now()
    );

    if (hasImmunity) {
      return { success: false, error: 'Target is under Sanctuary protection' };
    }

    // Calculate total power
    let attackerPower = 0;
    let defenderPower = 0;

    for (const [unitType, amount] of Object.entries(attacker.units)) {
      const unit = UNIT_TYPES[unitType.toUpperCase()];
      if (unit) {
        attackerPower += unit.attack * amount;
      }
    }

    for (const [unitType, amount] of Object.entries(defender.units)) {
      const unit = UNIT_TYPES[unitType.toUpperCase()];
      if (unit) {
        defenderPower += unit.defense * amount;
      }
    }

    // Apply buffs/debuffs
    for (const effect of attacker.activeEffects) {
      if (effect.effect_type === 'buff_offense' && effect.expires_at > Date.now()) {
        attackerPower *= effect.multiplier;
      }
    }

    for (const effect of defender.activeEffects) {
      if (effect.effect_type === 'buff_defense' && effect.expires_at > Date.now()) {
        defenderPower *= effect.multiplier;
      }
    }

    // Determine victory
    const victory = attackerPower > defenderPower;
    const powerRatio = attackerPower / (defenderPower + 1);

    // Calculate casualties
    const attackerLossRate = victory ? 0.05 : 0.15;
    const defenderLossRate = victory ? 0.20 : 0.05;

    let attackerUnitsLost = 0;
    let defenderUnitsLost = 0;

    // Apply losses
    for (const [unitType, amount] of Object.entries(attacker.units)) {
      const lost = Math.floor(amount * attackerLossRate);
      attackerUnitsLost += lost;
      await this.db.updateUnits(attackerId, unitType, amount - lost);
    }

    for (const [unitType, amount] of Object.entries(defender.units)) {
      const lost = Math.floor(amount * defenderLossRate);
      defenderUnitsLost += lost;
      await this.db.updateUnits(defenderId, unitType, amount - lost);
    }

    // Spoils of war
    let goldStolen = 0;
    let landCaptured = 0;

    if (victory) {
      goldStolen = Math.floor(defender.gold * 0.10);
      landCaptured = Math.floor(defender.total_land * 0.05);

      attacker.gold += goldStolen;
      attacker.land += landCaptured;
      attacker.total_land += landCaptured;
      defender.gold -= goldStolen;
      defender.land = Math.max(0, defender.land - landCaptured);
      defender.total_land = Math.max(0, defender.total_land - landCaptured);

      await this.db.updatePlayerResources(attackerId, attacker.gold, attacker.mana, attacker.population, attacker.land, attacker.total_land);
      await this.db.updatePlayerResources(defenderId, defender.gold, defender.mana, defender.population, defender.land, defender.total_land);

      // Update win/loss records
      await this.db.incrementPlayerStats(attackerId, { wins: 1, total_attacks: 1 });
      await this.db.incrementPlayerStats(defenderId, { losses: 1 });
    } else {
      await this.db.incrementPlayerStats(attackerId, { losses: 1, total_attacks: 1 });
      await this.db.incrementPlayerStats(defenderId, { wins: 1 });
    }

    const report = {
      victory,
      attackerUnitsLost,
      defenderUnitsLost,
      goldStolen,
      landCaptured,
      attackerPower: Math.floor(attackerPower),
      defenderPower: Math.floor(defenderPower)
    };

    await this.db.addCombatLog(attackerId, defenderId, report);

    // Notifications
    const attackMessage = victory 
      ? `Victory! You defeated ${defender.username} and captured ${landCaptured} land and ${goldStolen} gold!`
      : `Defeat! You lost the attack against ${defender.username}.`;
    
    const defenseMessage = victory
      ? `${attacker.username} attacked and conquered some of your land!`
      : `Victory! You successfully defended against ${attacker.username}!`;

    await this.db.addMessage(attackerId, attackMessage, victory ? 'success' : 'danger');
    await this.db.addMessage(defenderId, defenseMessage, victory ? 'danger' : 'success');

    this.io.to(defenderId).emit('attacked', { message: defenseMessage, report });

    return {
      success: true,
      report
    };
  }

  async expandLand(playerId, amount = 1) {
    const player = await this.db.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const totalCost = GAME_CONFIG.LAND_EXPANSION_COST * amount * (1 + player.total_land / 100);

    if (player.gold < totalCost) {
      return { success: false, error: 'Not enough gold' };
    }

    player.gold -= totalCost;
    player.land += amount;
    player.total_land += amount;
    await this.db.updatePlayerResources(playerId, player.gold, player.mana, player.population, player.land, player.total_land);

    return {
      success: true,
      newLand: player.land,
      newTotalLand: player.total_land,
      cost: totalCost
    };
  }

  async getLeaderboard() {
    return await this.db.getAllPlayers();
  }
}

module.exports = GameEngine;

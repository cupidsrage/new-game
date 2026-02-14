const { SPELLS, UNIT_TYPES, BUILDING_TYPES, HEROES, ITEMS, GAME_CONFIG } = require('../shared/gameData');

class GameEngine {
  constructor(database, io) {
    this.db = database;
    this.io = io;
    this.players = new Map();
    this.startGameLoop();
  }

  startGameLoop() {
    // Main game tick - runs every second
    setInterval(() => {
      this.tick();
    }, GAME_CONFIG.TICK_RATE);

    // Process queues every 5 seconds
    setInterval(() => {
      this.processQueues();
    }, 5000);

    // Clean expired effects every minute
    setInterval(() => {
      this.db.cleanExpiredEffects();
    }, 60000);
  }

  tick() {
    // Update resources for all active players
    for (const [playerId, playerData] of this.players) {
      try {
        const player = this.db.getPlayer(playerId);
        if (!player) continue;

        // Calculate resource production
        const production = this.calculateProduction(player);
        
        // Update resources
        player.gold = Math.max(0, player.gold + production.gold);
        player.mana = Math.max(0, player.mana + production.mana);
        player.population = Math.max(0, player.population + production.population);

        // Save to database
        this.db.updatePlayerResources(playerId, player.gold, player.mana, player.population, player.land, player.total_land);

        // Emit update to client
        if (this.io) {
          this.io.to(playerId).emit('resourceUpdate', {
            gold: Math.floor(player.gold),
            mana: Math.floor(player.mana),
            population: Math.floor(player.population),
            land: player.land,
            totalLand: player.total_land
          });
        }
      } catch (error) {
        console.error(`Error processing tick for player ${playerId}:`, error);
      }
    }
  }

  calculateProduction(player) {
    let goldPerSecond = GAME_CONFIG.BASE_GOLD_INCOME;
    let manaPerSecond = GAME_CONFIG.BASE_MANA_INCOME;
    let populationPerSecond = GAME_CONFIG.BASE_POPULATION_GROWTH / 60; // Per second

    // Add building bonuses
    for (const [buildingType, amount] of Object.entries(player.buildings || {})) {
      const building = BUILDING_TYPES[buildingType.toUpperCase()];
      if (!building) continue;

      if (building.goldPerSecond) {
        goldPerSecond += building.goldPerSecond * amount;
      }
      if (building.manaPerSecond) {
        manaPerSecond += building.manaPerSecond * amount;
      }
      if (building.populationPerSecond) {
        populationPerSecond += building.populationPerSecond * amount;
      }
    }

    // Apply active effects/buffs
    const now = Date.now();
    for (const effect of player.activeEffects || []) {
      if (effect.expires_at > now) {
        if (effect.effect_type === 'buff_resource') {
          if (effect.source === 'gold') {
            goldPerSecond *= effect.multiplier;
          } else if (effect.source === 'mana') {
            manaPerSecond *= effect.multiplier;
          }
        }
      }
    }

    return {
      gold: goldPerSecond,
      mana: manaPerSecond,
      population: populationPerSecond
    };
  }

  processQueues() {
    const now = Date.now();

    // Process training queues
    for (const [playerId] of this.players) {
      const trainingQueue = this.db.getTrainingQueue(playerId);
      
      for (const item of trainingQueue) {
        if (item.completes_at <= now) {
          // Training complete
          const player = this.db.getPlayer(playerId);
          const currentAmount = player.units[item.unit_type] || 0;
          this.db.updateUnits(playerId, item.unit_type, currentAmount + item.amount);
          this.db.completeTraining(item.id);

          // Notify player
          this.io.to(playerId).emit('trainingComplete', {
            unitType: item.unit_type,
            amount: item.amount
          });

          this.db.addMessage(playerId, `Training complete: ${item.amount} ${item.unit_type}`, 'success');
        }
      }

      // Process building queues
      const buildingQueue = this.db.getBuildingQueue(playerId);
      
      for (const item of buildingQueue) {
        if (item.completes_at <= now) {
          // Building complete
          const player = this.db.getPlayer(playerId);
          const currentAmount = player.buildings[item.building_type] || 0;
          this.db.updateBuildings(playerId, item.building_type, currentAmount + item.amount);
          this.db.completeBuilding(item.id);

          // Notify player
          this.io.to(playerId).emit('buildingComplete', {
            buildingType: item.building_type,
            amount: item.amount
          });

          this.db.addMessage(playerId, `Construction complete: ${item.amount} ${item.building_type}`, 'success');
        }
      }
    }
  }

  registerPlayer(playerId, socketId) {
    this.players.set(playerId, { socketId, lastUpdate: Date.now() });
  }

  unregisterPlayer(playerId) {
    this.players.delete(playerId);
  }

  trainUnits(playerId, unitType, amount) {
    const player = this.db.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

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
    this.db.updatePlayerResources(playerId, player.gold, player.mana, player.population, player.land, player.total_land);

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

    const completesAt = Date.now() + (trainingTime * 1000);
    this.db.addToTrainingQueue(playerId, unitType, amount, completesAt);

    return {
      success: true,
      completesAt,
      estimatedTime: Math.floor(trainingTime)
    };
  }

  buildStructure(playerId, buildingType, amount = 1) {
    const player = this.db.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

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
    this.db.updatePlayerResources(playerId, player.gold, player.mana, player.population, player.land, player.total_land);

    // Add to building queue
    let buildTime = building.buildTime * amount;

    // Apply time warp buff
    for (const effect of player.activeEffects || []) {
      if (effect.effect_type === 'buff_speed' && effect.expires_at > Date.now()) {
        buildTime = buildTime / effect.multiplier;
      }
    }

    const completesAt = Date.now() + (buildTime * 1000);
    this.db.addToBuildingQueue(playerId, buildingType, amount, completesAt);

    return {
      success: true,
      completesAt,
      estimatedTime: Math.floor(buildTime)
    };
  }

  castSpell(playerId, spellId, targetPlayerId = null) {
    const player = this.db.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const spell = SPELLS[spellId.toUpperCase()];
    if (!spell) return { success: false, error: 'Invalid spell' };

    // Check mana
    if (player.mana < spell.manaCost) {
      return { success: false, error: 'Not enough mana' };
    }

    // Check cooldown
    const cooldowns = this.db.getSpellCooldowns(playerId);
    const cooldown = cooldowns.find(c => c.spell_id === spellId);
    if (cooldown && cooldown.ready_at > Date.now()) {
      const remaining = Math.ceil((cooldown.ready_at - Date.now()) / 1000);
      return { success: false, error: `Spell on cooldown for ${remaining}s` };
    }

    // Get target if needed
    let target = null;
    if (targetPlayerId) {
      target = this.db.getPlayer(targetPlayerId);
      if (!target) return { success: false, error: 'Target not found' };
    }

    // Deduct mana
    player.mana -= spell.manaCost;
    this.db.updatePlayerResources(playerId, player.gold, player.mana, player.population, player.land, player.total_land);

    // Set cooldown
    const readyAt = Date.now() + (spell.cooldown * 1000);
    this.db.setSpellCooldown(playerId, spellId, readyAt);

    // Apply spell effect
    const result = this.applySpellEffect(player, target, spell);

    // Update stats
    this.db.db.prepare('UPDATE players SET total_spells_cast = total_spells_cast + 1 WHERE id = ?').run(playerId);

    return {
      success: true,
      result,
      cooldownEnds: readyAt
    };
  }

  applySpellEffect(caster, target, spell) {
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
            this.db.updateUnits(target.id, unitType, amount - killed);
            remaining -= killed;
          }

          this.db.addMessage(target.id, effect.message, 'combat');
          this.io.to(target.id).emit('attacked', { message: effect.message });
        }
        break;

      case 'buff_resource':
        this.db.addEffect(caster.id, 'buff_resource', effect.multiplier, now + (effect.duration * 1000), effect.resource);
        this.db.addMessage(caster.id, effect.message, 'buff');
        break;

      case 'buff_defense':
        this.db.addEffect(caster.id, 'buff_defense', effect.multiplier, now + (effect.duration * 1000), 'defense');
        this.db.addMessage(caster.id, effect.message, 'buff');
        break;

      case 'buff_offense':
        this.db.addEffect(caster.id, 'buff_offense', effect.multiplier, now + (effect.duration * 1000), 'offense');
        this.db.addMessage(caster.id, effect.message, 'buff');
        break;

      case 'buff_speed':
        this.db.addEffect(caster.id, 'buff_speed', effect.multiplier, now + (effect.duration * 1000), 'speed');
        this.db.addMessage(caster.id, effect.message, 'buff');
        break;

      case 'buff_immunity':
        this.db.addEffect(caster.id, 'buff_immunity', 1, now + (effect.duration * 1000), 'immunity');
        this.db.addMessage(caster.id, effect.message, 'buff');
        break;

      case 'summon_units':
        const currentAmount = caster.units[effect.unitType] || 0;
        this.db.updateUnits(caster.id, effect.unitType, currentAmount + effect.amount);
        this.db.addMessage(caster.id, effect.message, 'success');
        break;

      case 'instant_resource':
        caster.gold += effect.gold || 0;
        caster.mana += effect.mana || 0;
        this.db.updatePlayerResources(caster.id, caster.gold, caster.mana, caster.population, caster.land, caster.total_land);
        this.db.addMessage(caster.id, effect.message, 'success');
        break;

      case 'steal_resource':
        if (target) {
          const amount = Math.floor(target[effect.resource] * effect.percentage);
          target[effect.resource] -= amount;
          caster[effect.resource] += amount;
          this.db.updatePlayerResources(target.id, target.gold, target.mana, target.population, target.land, target.total_land);
          this.db.updatePlayerResources(caster.id, caster.gold, caster.mana, caster.population, caster.land, caster.total_land);
          this.db.addMessage(target.id, effect.message, 'combat');
        }
        break;
    }

    return effect;
  }

  attack(attackerId, defenderId) {
    const attacker = this.db.getPlayer(attackerId);
    const defender = this.db.getPlayer(defenderId);

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
      this.db.updateUnits(attackerId, unitType, amount - lost);
    }

    for (const [unitType, amount] of Object.entries(defender.units)) {
      const lost = Math.floor(amount * defenderLossRate);
      defenderUnitsLost += lost;
      this.db.updateUnits(defenderId, unitType, amount - lost);
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

      this.db.updatePlayerResources(attackerId, attacker.gold, attacker.mana, attacker.population, attacker.land, attacker.total_land);
      this.db.updatePlayerResources(defenderId, defender.gold, defender.mana, defender.population, defender.land, defender.total_land);

      // Update win/loss records
      this.db.db.prepare('UPDATE players SET wins = wins + 1, total_attacks = total_attacks + 1 WHERE id = ?').run(attackerId);
      this.db.db.prepare('UPDATE players SET losses = losses + 1 WHERE id = ?').run(defenderId);
    } else {
      this.db.db.prepare('UPDATE players SET losses = losses + 1, total_attacks = total_attacks + 1 WHERE id = ?').run(attackerId);
      this.db.db.prepare('UPDATE players SET wins = wins + 1 WHERE id = ?').run(defenderId);
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

    this.db.addCombatLog(attackerId, defenderId, report);

    // Notifications
    const attackMessage = victory 
      ? `Victory! You defeated ${defender.username} and captured ${landCaptured} land and ${goldStolen} gold!`
      : `Defeat! You lost the attack against ${defender.username}.`;
    
    const defenseMessage = victory
      ? `${attacker.username} attacked and conquered some of your land!`
      : `Victory! You successfully defended against ${attacker.username}!`;

    this.db.addMessage(attackerId, attackMessage, victory ? 'success' : 'danger');
    this.db.addMessage(defenderId, defenseMessage, victory ? 'danger' : 'success');

    this.io.to(defenderId).emit('attacked', { message: defenseMessage, report });

    return {
      success: true,
      report
    };
  }

  expandLand(playerId, amount = 1) {
    const player = this.db.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const totalCost = GAME_CONFIG.LAND_EXPANSION_COST * amount * (1 + player.total_land / 100);

    if (player.gold < totalCost) {
      return { success: false, error: 'Not enough gold' };
    }

    player.gold -= totalCost;
    player.land += amount;
    player.total_land += amount;
    this.db.updatePlayerResources(playerId, player.gold, player.mana, player.population, player.land, player.total_land);

    return {
      success: true,
      newLand: player.land,
      newTotalLand: player.total_land,
      cost: totalCost
    };
  }

  getLeaderboard() {
    return this.db.getAllPlayers();
  }
}

module.exports = GameEngine;

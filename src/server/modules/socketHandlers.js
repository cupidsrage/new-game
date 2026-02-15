function registerSocketHandlers(io, { db, gameEngine, sessions }) {
  io.on('connection', (socket) => {
    let playerId = null;

    socket.on('authenticate', async (token) => {
      try {
        playerId = sessions.getPlayerId(token);
        if (!playerId) return socket.emit('authError', 'Invalid token');

        const player = await db.getPlayer(playerId);
        if (!player) return socket.emit('authError', 'Player not found');

        socket.join(playerId);
        await gameEngine.registerPlayer(playerId, socket.id);

        socket.emit('authenticated', { player: {
          id: player.id, username: player.username, gold: player.gold, mana: player.mana,
          population: player.population, land: player.land, totalLand: player.total_land, level: player.level,
          experience: player.experience, units: player.units, buildings: player.buildings,
          heroes: player.heroes, items: player.items, activeEffects: player.activeEffects, spellResearch: player.spellResearch
        } });

        socket.emit('initialData', {
          trainingQueue: await db.getTrainingQueue(playerId),
          buildingQueue: await db.getBuildingQueue(playerId),
          cooldowns: await db.getSpellCooldowns(playerId),
          spellResearch: await db.getSpellResearch(playerId),
          messages: await db.getMessages(playerId),
          productionRates: await gameEngine.getProductionRates(playerId),
          heroMarketListings: await gameEngine.getHeroMarketListings()
        });
      } catch (error) {
        console.error('Authenticate error:', error);
        socket.emit('authError', 'Authentication failed');
      }
    });

    socket.on('trainUnits', async (data) => {
      if (!playerId) return;
      const result = await gameEngine.trainUnits(playerId, data.unitType, data.amount);
      socket.emit('trainUnitsResult', result);
      if (!result.success) return;
      const player = await db.getPlayer(playerId);
      socket.emit('resourceUpdate', { gold: player.gold, mana: player.mana, population: player.population });
      socket.emit('queueUpdate', { trainingQueue: await db.getTrainingQueue(playerId) });
    });

    socket.on('buildStructure', async (data) => {
      if (!playerId) return;
      const result = await gameEngine.buildStructure(playerId, data.buildingType, data.amount);
      socket.emit('buildStructureResult', result);
      if (!result.success) return;
      const player = await db.getPlayer(playerId);
      socket.emit('resourceUpdate', { gold: player.gold, land: player.land, totalLand: player.total_land });
      socket.emit('queueUpdate', { buildingQueue: await db.getBuildingQueue(playerId) });
    });

    socket.on('castSpell', async (data) => {
      if (!playerId) return;
      const result = await gameEngine.castSpell(playerId, data.spellId, data.targetPlayerId);
      socket.emit('castSpellResult', result);
      if (!result.success) return;
      const player = await db.getPlayer(playerId);
      socket.emit('resourceUpdate', { mana: player.mana });
      socket.emit('unitsUpdate', player.units);
      socket.emit('cooldownUpdate', await db.getSpellCooldowns(playerId));
    });

    socket.on('researchSpell', async (data) => {
      if (!playerId) return;
      const result = await gameEngine.startSpellResearch(playerId, data.spellId);
      socket.emit('researchSpellResult', result);
      if (!result.success) return;
      socket.emit('spellResearchUpdate', await db.getSpellResearch(playerId));
    });

    socket.on('attack', async (data) => {
      if (!playerId) return;
      socket.emit('attackResult', await gameEngine.attack(playerId, data.targetPlayerId));
    });

    socket.on('expandLand', async (data) => {
      if (!playerId) return;
      const result = await gameEngine.expandLand(playerId, data.amount || 1);
      socket.emit('expandLandResult', result);
      if (!result.success) return;
      const player = await db.getPlayer(playerId);
      socket.emit('resourceUpdate', { gold: player.gold, land: player.land, totalLand: player.total_land });
    });

    socket.on('getLeaderboard', async () => socket.emit('leaderboard', await gameEngine.getLeaderboard()));

    socket.on('getPlayerInfo', async (data) => {
      const targetPlayer = await db.getPlayer(data.playerId);
      if (!targetPlayer) return socket.emit('playerInfoError', 'Player not found');
      const canSeeDetails = playerId === data.playerId;
      socket.emit('playerInfo', {
        id: targetPlayer.id, username: targetPlayer.username, level: targetPlayer.level, land: targetPlayer.land,
        totalLand: targetPlayer.total_land, wins: targetPlayer.wins, losses: targetPlayer.losses,
        ...(canSeeDetails && { gold: targetPlayer.gold, mana: targetPlayer.mana, population: targetPlayer.population, units: targetPlayer.units, buildings: targetPlayer.buildings })
      });
    });

    socket.on('getHeroMarketListings', async () => socket.emit('heroMarketUpdate', await gameEngine.getHeroMarketListings()));
    socket.on('bidOnHero', async (data) => {
      if (!playerId) return;
      const result = await gameEngine.bidOnHeroMarket(playerId, Number(data.listingId), Number(data.bidAmount));
      socket.emit('bidOnHeroResult', result);
      if (result.success) {
        const player = await db.getPlayer(playerId);
        socket.emit('resourceUpdate', { gold: player.gold });
      }
    });

    socket.on('getMessages', async () => { if (playerId) socket.emit('messages', await db.getMessages(playerId)); });
    socket.on('markMessagesRead', async () => { if (playerId) await db.markMessagesRead(playerId); });
    socket.on('getCombatHistory', async () => { if (playerId) socket.emit('combatHistory', await db.getCombatHistory(playerId, 20)); });
    socket.on('disconnect', () => { if (playerId) gameEngine.unregisterPlayer(playerId); });
  });
}

module.exports = registerSocketHandlers;

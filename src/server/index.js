const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const GameDatabase = require('./database');
const GameEngine = require('./gameEngine');
const { SPELLS, HEROES, ITEMS, UNIT_TYPES, BUILDING_TYPES } = require('../shared/gameData');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// Initialize database and game engine
const db = new GameDatabase();
const gameEngine = new GameEngine(db, io);

// Session management
const sessions = new Map();

// REST API Endpoints

app.post('/api/register', (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }

    const playerId = uuidv4();
    const player = db.createPlayer(playerId, username, password, email);

    const token = uuidv4();
    sessions.set(token, playerId);

    res.json({
      success: true,
      token,
      player: {
        id: player.id,
        username: player.username,
        gold: player.gold,
        mana: player.mana,
        population: player.population,
        land: player.land
      }
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Username already taken' });
    } else {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;

    const player = db.verifyPlayer(username, password);
    if (!player) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = uuidv4();
    sessions.set(token, player.id);

    res.json({
      success: true,
      token,
      player: {
        id: player.id,
        username: player.username,
        gold: player.gold,
        mana: player.mana,
        population: player.population,
        land: player.land,
        level: player.level
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/gamedata', (req, res) => {
  res.json({
    spells: SPELLS,
    heroes: HEROES,
    items: ITEMS,
    unitTypes: UNIT_TYPES,
    buildingTypes: BUILDING_TYPES
  });
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  let playerId = null;

  console.log('Client connected:', socket.id);

  socket.on('authenticate', (token) => {
    playerId = sessions.get(token);
    
    if (!playerId) {
      socket.emit('authError', 'Invalid token');
      return;
    }

    const player = db.getPlayer(playerId);
    if (!player) {
      socket.emit('authError', 'Player not found');
      return;
    }

    socket.join(playerId);
    gameEngine.registerPlayer(playerId, socket.id);

    // Send initial game state
    socket.emit('authenticated', {
      player: {
        id: player.id,
        username: player.username,
        gold: player.gold,
        mana: player.mana,
        population: player.population,
        land: player.land,
        level: player.level,
        experience: player.experience,
        units: player.units,
        buildings: player.buildings,
        heroes: player.heroes,
        items: player.items,
        activeEffects: player.activeEffects
      }
    });

    // Send additional data
    const trainingQueue = db.getTrainingQueue(playerId);
    const buildingQueue = db.getBuildingQueue(playerId);
    const cooldowns = db.getSpellCooldowns(playerId);
    const messages = db.getMessages(playerId);

    socket.emit('initialData', {
      trainingQueue,
      buildingQueue,
      cooldowns,
      messages
    });
  });

  socket.on('trainUnits', (data) => {
    if (!playerId) return;

    const result = gameEngine.trainUnits(playerId, data.unitType, data.amount);
    socket.emit('trainUnitsResult', result);

    if (result.success) {
      const player = db.getPlayer(playerId);
      socket.emit('resourceUpdate', {
        gold: player.gold,
        mana: player.mana,
        population: player.population
      });

      const queue = db.getTrainingQueue(playerId);
      socket.emit('queueUpdate', { trainingQueue: queue });
    }
  });

  socket.on('buildStructure', (data) => {
    if (!playerId) return;

    const result = gameEngine.buildStructure(playerId, data.buildingType, data.amount);
    socket.emit('buildStructureResult', result);

    if (result.success) {
      const player = db.getPlayer(playerId);
      socket.emit('resourceUpdate', {
        gold: player.gold,
        land: player.land
      });

      const queue = db.getBuildingQueue(playerId);
      socket.emit('queueUpdate', { buildingQueue: queue });
    }
  });

  socket.on('castSpell', (data) => {
    if (!playerId) return;

    const result = gameEngine.castSpell(playerId, data.spellId, data.targetPlayerId);
    socket.emit('castSpellResult', result);

    if (result.success) {
      const player = db.getPlayer(playerId);
      socket.emit('resourceUpdate', {
        mana: player.mana
      });

      const cooldowns = db.getSpellCooldowns(playerId);
      socket.emit('cooldownUpdate', cooldowns);
    }
  });

  socket.on('attack', (data) => {
    if (!playerId) return;

    const result = gameEngine.attack(playerId, data.targetPlayerId);
    socket.emit('attackResult', result);
  });

  socket.on('expandLand', (data) => {
    if (!playerId) return;

    const result = gameEngine.expandLand(playerId, data.amount || 1);
    socket.emit('expandLandResult', result);

    if (result.success) {
      socket.emit('resourceUpdate', {
        gold: result.newLand
      });
    }
  });

  socket.on('getLeaderboard', () => {
    const leaderboard = gameEngine.getLeaderboard();
    socket.emit('leaderboard', leaderboard);
  });

  socket.on('getPlayerInfo', (data) => {
    const targetPlayer = db.getPlayer(data.playerId);
    if (!targetPlayer) {
      socket.emit('playerInfoError', 'Player not found');
      return;
    }

    // Check if caster has clairvoyance active or used it
    const canSeeDetails = playerId === data.playerId; // Can always see own info

    socket.emit('playerInfo', {
      id: targetPlayer.id,
      username: targetPlayer.username,
      level: targetPlayer.level,
      land: targetPlayer.land,
      wins: targetPlayer.wins,
      losses: targetPlayer.losses,
      // Only show detailed info if allowed
      ...(canSeeDetails && {
        gold: targetPlayer.gold,
        mana: targetPlayer.mana,
        population: targetPlayer.population,
        units: targetPlayer.units,
        buildings: targetPlayer.buildings
      })
    });
  });

  socket.on('getMessages', () => {
    if (!playerId) return;
    
    const messages = db.getMessages(playerId);
    socket.emit('messages', messages);
  });

  socket.on('markMessagesRead', () => {
    if (!playerId) return;
    db.markMessagesRead(playerId);
  });

  socket.on('getCombatHistory', () => {
    if (!playerId) return;
    
    const history = db.getCombatHistory(playerId, 20);
    socket.emit('combatHistory', history);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (playerId) {
      gameEngine.unregisterPlayer(playerId);
    }
  });
});

// Serve the client
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║     Archmage: Real-Time Strategy MMO Server       ║
║                                                   ║
║  Server running on port ${PORT}                      ║
║  http://localhost:${PORT}                            ║
║                                                   ║
║  Game Features:                                   ║
║  • 20+ Spells across 5 schools                    ║
║  • 5 Unique Heroes with abilities                 ║
║  • Real-time combat & resource management         ║
║  • Items, equipment & black market                ║
║  • Territory expansion & building construction    ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    db.close();
    process.exit(0);
  });
});

const { v4: uuidv4 } = require('uuid');
const { SPELLS, HEROES, ITEMS, UNIT_TYPES, BUILDING_TYPES } = require('../../shared/gameData');

function registerHttpRoutes(app, { db, sessions }) {
  app.post('/api/register', async (req, res) => {
    try {
      const { username, password, email } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
      if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'Username must be 3-20 characters' });

      const playerId = uuidv4();
      const player = await db.createPlayer(playerId, username, password, email);
      const token = sessions.createSession(playerId, uuidv4);

      return res.json({
        success: true,
        token,
        player: {
          id: player.id,
          username: player.username,
          gold: player.gold,
          mana: player.mana,
          population: player.population,
          land: player.land,
          totalLand: player.total_land
        }
      });
    } catch (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Username or email already taken' });
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const player = await db.verifyPlayer(username, password);
      if (!player) return res.status(401).json({ error: 'Invalid credentials' });

      const token = sessions.createSession(player.id, uuidv4);
      return res.json({
        success: true,
        token,
        player: {
          id: player.id,
          username: player.username,
          gold: player.gold,
          mana: player.mana,
          population: player.population,
          land: player.land,
          totalLand: player.total_land,
          level: player.level
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/gamedata', (_req, res) => {
    res.json({ spells: SPELLS, heroes: HEROES, items: ITEMS, unitTypes: UNIT_TYPES, buildingTypes: BUILDING_TYPES });
  });
}

module.exports = registerHttpRoutes;

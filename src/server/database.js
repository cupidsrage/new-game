const { Pool } = require('pg');
const bcrypt = require('bcrypt');

function buildPoolConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Configure Railway Postgres and expose DATABASE_URL.');
  }

  const useSsl = process.env.PGSSLMODE === 'require' || /railway\.app/.test(connectionString);

  return {
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false
  };
}

class GameDatabase {
  constructor() {
    this.pool = new Pool(buildPoolConfig());
  }

  async initialize() {
    await this.query('SELECT 1');
    await this.initializeTables();
    console.log('Connected to PostgreSQL and initialized tables');
  }

  async query(text, params = []) {
    return this.pool.query(text, params);
  }

  async withTransaction(handler) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await handler(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async initializeTables() {
    await this.query(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT UNIQUE,
        created_at BIGINT NOT NULL,
        last_active BIGINT NOT NULL,
        gold DOUBLE PRECISION DEFAULT 5000,
        mana DOUBLE PRECISION DEFAULT 1000,
        population DOUBLE PRECISION DEFAULT 100,
        land INTEGER DEFAULT 50,
        total_land INTEGER DEFAULT 50,
        experience INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        total_attacks INTEGER DEFAULT 0,
        total_spells_cast INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS player_heroes (
        id BIGSERIAL PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        hero_id TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        health DOUBLE PRECISION NOT NULL,
        max_health DOUBLE PRECISION NOT NULL,
        attack DOUBLE PRECISION NOT NULL,
        defense DOUBLE PRECISION NOT NULL,
        equipped BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS player_units (
        id BIGSERIAL PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        unit_type TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        UNIQUE(player_id, unit_type)
      );

      CREATE TABLE IF NOT EXISTS player_buildings (
        id BIGSERIAL PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        building_type TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        UNIQUE(player_id, building_type)
      );

      CREATE TABLE IF NOT EXISTS player_items (
        id BIGSERIAL PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        equipped_to_hero BIGINT
      );

      CREATE TABLE IF NOT EXISTS active_effects (
        id BIGSERIAL PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        effect_type TEXT NOT NULL,
        multiplier DOUBLE PRECISION,
        expires_at BIGINT NOT NULL,
        source TEXT
      );

      CREATE TABLE IF NOT EXISTS spell_cooldowns (
        id BIGSERIAL PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        spell_id TEXT NOT NULL,
        ready_at BIGINT NOT NULL,
        UNIQUE(player_id, spell_id)
      );

      CREATE TABLE IF NOT EXISTS training_queue (
        id BIGSERIAL PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        unit_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        started_at BIGINT NOT NULL,
        completes_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS building_queue (
        id BIGSERIAL PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        building_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        started_at BIGINT NOT NULL,
        completes_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS combat_log (
        id BIGSERIAL PRIMARY KEY,
        attacker_id TEXT NOT NULL REFERENCES players(id),
        defender_id TEXT NOT NULL REFERENCES players(id),
        timestamp BIGINT NOT NULL,
        attacker_units_lost INTEGER,
        defender_units_lost INTEGER,
        gold_stolen DOUBLE PRECISION,
        land_captured INTEGER,
        victory BOOLEAN,
        combat_report TEXT
      );

      CREATE TABLE IF NOT EXISTS black_market (
        id BIGSERIAL PRIMARY KEY,
        item_id TEXT NOT NULL,
        seller_id TEXT,
        price DOUBLE PRECISION NOT NULL,
        quantity INTEGER DEFAULT 1,
        listed_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS hero_market_listings (
        id BIGSERIAL PRIMARY KEY,
        hero_id TEXT NOT NULL,
        hero_level INTEGER NOT NULL,
        starting_bid DOUBLE PRECISION NOT NULL,
        listed_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
      );

      CREATE TABLE IF NOT EXISTS hero_market_bids (
        id BIGSERIAL PRIMARY KEY,
        listing_id BIGINT NOT NULL REFERENCES hero_market_listings(id) ON DELETE CASCADE,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        bid_amount DOUBLE PRECISION NOT NULL,
        bid_at BIGINT NOT NULL,
        UNIQUE(listing_id, player_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id BIGSERIAL PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        type TEXT DEFAULT 'info'
      );
    `);
  }

  async createPlayer(id, username, password, email = null) {
    const passwordHash = await bcrypt.hash(password, 10);
    const now = Date.now();
    await this.query(
      `INSERT INTO players (id, username, password_hash, email, created_at, last_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, username, passwordHash, email, now, now]
    );
    await this.query('INSERT INTO player_units (player_id, unit_type, amount) VALUES ($1, $2, $3)', [id, 'militia', 50]);
    return this.getPlayer(id);
  }

  async verifyPlayer(username, password) {
    const { rows } = await this.query('SELECT * FROM players WHERE username = $1', [username]);
    const player = rows[0];
    if (!player) return null;
    const valid = await bcrypt.compare(password, player.password_hash);
    if (!valid) return null;
    delete player.password_hash;
    return player;
  }

  async getPlayer(playerId) {
    const { rows } = await this.query('SELECT * FROM players WHERE id = $1', [playerId]);
    const player = rows[0];
    if (!player) return null;
    delete player.password_hash;

    const units = await this.query('SELECT unit_type, amount FROM player_units WHERE player_id = $1', [playerId]);
    player.units = Object.fromEntries(units.rows.map((row) => [row.unit_type, row.amount]));

    const buildings = await this.query('SELECT building_type, amount FROM player_buildings WHERE player_id = $1', [playerId]);
    player.buildings = Object.fromEntries(buildings.rows.map((row) => [row.building_type, row.amount]));

    player.heroes = (await this.query('SELECT * FROM player_heroes WHERE player_id = $1', [playerId])).rows;
    player.items = (await this.query('SELECT * FROM player_items WHERE player_id = $1', [playerId])).rows;
    player.activeEffects = (await this.query('SELECT * FROM active_effects WHERE player_id = $1 AND expires_at > $2', [playerId, Date.now()])).rows;

    return player;
  }

  async updatePlayerResources(playerId, gold, mana, population, land, totalLand = land) {
    await this.query(
      `UPDATE players SET gold = $1, mana = $2, population = $3, land = $4, total_land = $5, last_active = $6 WHERE id = $7`,
      [gold, mana, population, land, totalLand, Date.now(), playerId]
    );
  }

  async incrementPlayerStats(playerId, statUpdates) {
    const updates = [];
    const values = [];
    let index = 1;
    Object.entries(statUpdates).forEach(([column, increment]) => {
      updates.push(`${column} = ${column} + $${index}`);
      values.push(increment);
      index += 1;
    });

    values.push(playerId);
    await this.query(`UPDATE players SET ${updates.join(', ')} WHERE id = $${index}`, values);
  }

  async getAllPlayers() {
    const { rows } = await this.query('SELECT id, username, gold, mana, population, land, total_land, level, wins, losses FROM players ORDER BY level DESC, experience DESC');
    return rows;
  }

  async updateUnits(playerId, unitType, amount) {
    await this.query(
      `INSERT INTO player_units (player_id, unit_type, amount) VALUES ($1, $2, $3)
       ON CONFLICT (player_id, unit_type) DO UPDATE SET amount = EXCLUDED.amount`,
      [playerId, unitType, amount]
    );
  }

  async updateBuildings(playerId, buildingType, amount) {
    await this.query(
      `INSERT INTO player_buildings (player_id, building_type, amount) VALUES ($1, $2, $3)
       ON CONFLICT (player_id, building_type) DO UPDATE SET amount = EXCLUDED.amount`,
      [playerId, buildingType, amount]
    );
  }

  async addToTrainingQueue(playerId, unitType, amount, completesAt) {
    await this.query('INSERT INTO training_queue (player_id, unit_type, amount, started_at, completes_at) VALUES ($1, $2, $3, $4, $5)', [playerId, unitType, amount, Date.now(), completesAt]);
  }

  async addHeroToPlayer(playerId, heroId, level, stats) {
    await this.query(
      `INSERT INTO player_heroes (player_id, hero_id, level, experience, health, max_health, attack, defense, equipped)
       VALUES ($1, $2, $3, 0, $4, $5, $6, $7, FALSE)`,
      [playerId, heroId, level, stats.health, stats.health, stats.attack, stats.defense]
    );
  }

  async createHeroMarketListing(heroId, heroLevel, startingBid, expiresAt) {
    const { rows } = await this.query(
      `INSERT INTO hero_market_listings (hero_id, hero_level, starting_bid, listed_at, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
      [heroId, heroLevel, startingBid, Date.now(), expiresAt]
    );
    return rows[0];
  }

  async getHeroMarketListings() {
    const { rows } = await this.query(`
      SELECT l.id, l.hero_id, l.hero_level, l.starting_bid, l.listed_at, l.expires_at, l.status,
             b.player_id AS highest_bidder_id, b.bid_amount AS highest_bid
      FROM hero_market_listings l
      LEFT JOIN LATERAL (
        SELECT player_id, bid_amount
        FROM hero_market_bids
        WHERE listing_id = l.id
        ORDER BY bid_amount DESC, bid_at ASC
        LIMIT 1
      ) b ON TRUE
      WHERE l.status = 'active'
      ORDER BY l.expires_at ASC
    `);
    return rows;
  }

  async getHeroMarketListingWithHighestBid(listingId) {
    const { rows } = await this.query(`
      SELECT l.id, l.hero_id, l.hero_level, l.starting_bid, l.listed_at, l.expires_at, l.status,
             b.player_id AS highest_bidder_id, b.bid_amount AS highest_bid
      FROM hero_market_listings l
      LEFT JOIN LATERAL (
        SELECT player_id, bid_amount
        FROM hero_market_bids
        WHERE listing_id = l.id
        ORDER BY bid_amount DESC, bid_at ASC
        LIMIT 1
      ) b ON TRUE
      WHERE l.id = $1
    `, [listingId]);
    return rows[0] || null;
  }

  async placeHeroMarketBid(listingId, playerId, bidAmount) {
    return this.withTransaction(async (client) => {
      const listing = (await client.query('SELECT * FROM hero_market_listings WHERE id = $1 FOR UPDATE', [listingId])).rows[0];
      if (!listing || listing.status !== 'active' || listing.expires_at <= Date.now()) {
        return { success: false, error: 'Listing is no longer active' };
      }

      const highestBid = (await client.query('SELECT * FROM hero_market_bids WHERE listing_id = $1 ORDER BY bid_amount DESC, bid_at ASC LIMIT 1 FOR UPDATE', [listingId])).rows[0];
      const minimumBid = highestBid ? highestBid.bid_amount + 1 : listing.starting_bid;
      if (bidAmount < minimumBid) {
        return { success: false, error: `Bid must be at least ${Math.floor(minimumBid)} gold` };
      }

      const player = (await client.query('SELECT id, gold FROM players WHERE id = $1 FOR UPDATE', [playerId])).rows[0];
      if (!player) return { success: false, error: 'Player not found' };
      if (player.gold < bidAmount) return { success: false, error: 'Not enough gold to place bid' };

      await client.query('UPDATE players SET gold = gold - $1 WHERE id = $2', [bidAmount, playerId]);

      const previousOwnBid = (await client.query('SELECT * FROM hero_market_bids WHERE listing_id = $1 AND player_id = $2 FOR UPDATE', [listingId, playerId])).rows[0];
      if (previousOwnBid) {
        await client.query('UPDATE players SET gold = gold + $1 WHERE id = $2', [previousOwnBid.bid_amount, playerId]);
        await client.query('DELETE FROM hero_market_bids WHERE id = $1', [previousOwnBid.id]);
      }

      if (highestBid && highestBid.player_id !== playerId) {
        await client.query('UPDATE players SET gold = gold + $1 WHERE id = $2', [highestBid.bid_amount, highestBid.player_id]);
        await client.query('DELETE FROM hero_market_bids WHERE id = $1', [highestBid.id]);
      }

      await client.query('INSERT INTO hero_market_bids (listing_id, player_id, bid_amount, bid_at) VALUES ($1, $2, $3, $4)', [listingId, playerId, bidAmount, Date.now()]);
      return { success: true };
    });
  }

  async getExpiredHeroListings(now = Date.now()) {
    return (await this.query("SELECT * FROM hero_market_listings WHERE status = 'active' AND expires_at <= $1 ORDER BY expires_at ASC", [now])).rows;
  }

  async completeHeroListing(listingId) {
    return this.withTransaction(async (client) => {
      const listing = (await client.query('SELECT * FROM hero_market_listings WHERE id = $1 FOR UPDATE', [listingId])).rows[0];
      if (!listing || listing.status !== 'active') return null;
      const highestBid = (await client.query('SELECT * FROM hero_market_bids WHERE listing_id = $1 ORDER BY bid_amount DESC, bid_at ASC LIMIT 1', [listingId])).rows[0];
      await client.query("UPDATE hero_market_listings SET status = 'sold' WHERE id = $1", [listingId]);
      await client.query('DELETE FROM hero_market_bids WHERE listing_id = $1', [listingId]);
      return { listing, highestBid };
    });
  }

  async getTrainingQueue(playerId) {
    return (await this.query('SELECT * FROM training_queue WHERE player_id = $1 ORDER BY completes_at ASC', [playerId])).rows;
  }

  async completeTraining(id) {
    return (await this.query('DELETE FROM training_queue WHERE id = $1 RETURNING *', [id])).rows[0];
  }

  async addToBuildingQueue(playerId, buildingType, amount, completesAt) {
    await this.query('INSERT INTO building_queue (player_id, building_type, amount, started_at, completes_at) VALUES ($1, $2, $3, $4, $5)', [playerId, buildingType, amount, Date.now(), completesAt]);
  }

  async getBuildingQueue(playerId) {
    return (await this.query('SELECT * FROM building_queue WHERE player_id = $1 ORDER BY completes_at ASC', [playerId])).rows;
  }

  async completeBuilding(id) {
    return (await this.query('DELETE FROM building_queue WHERE id = $1 RETURNING *', [id])).rows[0];
  }

  async setSpellCooldown(playerId, spellId, readyAt) {
    await this.query(
      `INSERT INTO spell_cooldowns (player_id, spell_id, ready_at) VALUES ($1, $2, $3)
       ON CONFLICT (player_id, spell_id) DO UPDATE SET ready_at = EXCLUDED.ready_at`,
      [playerId, spellId, readyAt]
    );
  }

  async getSpellCooldowns(playerId) {
    return (await this.query('SELECT spell_id, ready_at FROM spell_cooldowns WHERE player_id = $1', [playerId])).rows;
  }

  async addEffect(playerId, effectType, multiplier, expiresAt, source) {
    await this.query('INSERT INTO active_effects (player_id, effect_type, multiplier, expires_at, source) VALUES ($1, $2, $3, $4, $5)', [playerId, effectType, multiplier, expiresAt, source]);
  }

  async cleanExpiredEffects() {
    await this.query('DELETE FROM active_effects WHERE expires_at <= $1', [Date.now()]);
  }

  async addCombatLog(attackerId, defenderId, report) {
    await this.query(
      `INSERT INTO combat_log (attacker_id, defender_id, timestamp, attacker_units_lost, defender_units_lost, gold_stolen, land_captured, victory, combat_report)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [attackerId, defenderId, Date.now(), report.attackerUnitsLost, report.defenderUnitsLost, report.goldStolen, report.landCaptured, report.victory, JSON.stringify(report)]
    );
  }

  async getCombatHistory(playerId, limit = 20) {
    return (await this.query('SELECT * FROM combat_log WHERE attacker_id = $1 OR defender_id = $1 ORDER BY timestamp DESC LIMIT $2', [playerId, limit])).rows;
  }

  async addMessage(playerId, message, type = 'info') {
    await this.query('INSERT INTO messages (player_id, message, timestamp, type) VALUES ($1, $2, $3, $4)', [playerId, message, Date.now(), type]);
  }

  async getMessages(playerId, unreadOnly = false) {
    const q = unreadOnly
      ? 'SELECT * FROM messages WHERE player_id = $1 AND read = FALSE ORDER BY timestamp DESC LIMIT 50'
      : 'SELECT * FROM messages WHERE player_id = $1 ORDER BY timestamp DESC LIMIT 50';
    return (await this.query(q, [playerId])).rows;
  }

  async markMessagesRead(playerId) {
    await this.query('UPDATE messages SET read = TRUE WHERE player_id = $1 AND read = FALSE', [playerId]);
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = GameDatabase;

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

function resolveDatabasePath() {
  if (process.env.GAME_DB_PATH) {
    return process.env.GAME_DB_PATH;
  }

  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'game.db');
  }

  return path.join(__dirname, '../../game.db');
}

class GameDatabase {
  constructor(dbPath = resolveDatabasePath()) {
    const dbDir = path.dirname(dbPath);
    fs.mkdirSync(dbDir, { recursive: true });

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeTables();

    console.log(`Using database at: ${dbPath}`);
  }

  initializeTables() {
    // Players table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT UNIQUE,
        created_at INTEGER NOT NULL,
        last_active INTEGER NOT NULL,
        gold REAL DEFAULT 5000,
        mana REAL DEFAULT 1000,
        population REAL DEFAULT 100,
        land INTEGER DEFAULT 50,
        total_land INTEGER DEFAULT 50,
        experience INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        total_attacks INTEGER DEFAULT 0,
        total_spells_cast INTEGER DEFAULT 0
      )
    `);

    this.runPlayerTableMigrations();

    // Heroes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_heroes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        hero_id TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        health REAL NOT NULL,
        max_health REAL NOT NULL,
        attack REAL NOT NULL,
        defense REAL NOT NULL,
        equipped INTEGER DEFAULT 0,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      )
    `);

    // Units table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        unit_type TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        UNIQUE(player_id, unit_type)
      )
    `);

    // Buildings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_buildings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        building_type TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        UNIQUE(player_id, building_type)
      )
    `);

    // Items/Inventory table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        equipped_to_hero INTEGER,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      )
    `);

    // Active buffs/debuffs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS active_effects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        effect_type TEXT NOT NULL,
        multiplier REAL,
        expires_at INTEGER NOT NULL,
        source TEXT,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      )
    `);

    // Spell cooldowns table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS spell_cooldowns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        spell_id TEXT NOT NULL,
        ready_at INTEGER NOT NULL,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        UNIQUE(player_id, spell_id)
      )
    `);

    // Training queue table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS training_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        unit_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        started_at INTEGER NOT NULL,
        completes_at INTEGER NOT NULL,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      )
    `);

    // Building queue table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS building_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        building_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        started_at INTEGER NOT NULL,
        completes_at INTEGER NOT NULL,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      )
    `);

    // Combat log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS combat_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attacker_id TEXT NOT NULL,
        defender_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        attacker_units_lost INTEGER,
        defender_units_lost INTEGER,
        gold_stolen REAL,
        land_captured INTEGER,
        victory INTEGER,
        combat_report TEXT,
        FOREIGN KEY (attacker_id) REFERENCES players(id),
        FOREIGN KEY (defender_id) REFERENCES players(id)
      )
    `);

    // Black market table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS black_market (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        seller_id TEXT,
        price REAL NOT NULL,
        quantity INTEGER DEFAULT 1,
        listed_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `);

    // Hero black market auction listings
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hero_market_listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hero_id TEXT NOT NULL,
        hero_level INTEGER NOT NULL,
        starting_bid REAL NOT NULL,
        listed_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
      )
    `);

    // Hero black market bids (escrowed immediately)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hero_market_bids (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER NOT NULL,
        player_id TEXT NOT NULL,
        bid_amount REAL NOT NULL,
        bid_at INTEGER NOT NULL,
        FOREIGN KEY (listing_id) REFERENCES hero_market_listings(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        UNIQUE(listing_id, player_id)
      )
    `);

    // Messages/notifications table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        read INTEGER DEFAULT 0,
        type TEXT DEFAULT 'info',
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      )
    `);

    console.log('Database tables initialized');
  }

  runPlayerTableMigrations() {
    const columns = this.db.prepare("PRAGMA table_info(players)").all();
    const columnNames = new Set(columns.map((column) => column.name));

    if (!columnNames.has('total_land')) {
      this.db.exec('ALTER TABLE players ADD COLUMN total_land INTEGER DEFAULT 50');
      this.db.exec('UPDATE players SET total_land = land WHERE total_land IS NULL');
      console.log('Migration complete: added players.total_land and backfilled from land');
    }
  }

  // Player methods
  createPlayer(id, username, password, email = null) {
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO players (id, username, password_hash, email, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, username, passwordHash, email, now, now);
    
    // Initialize default units
    const unitStmt = this.db.prepare(`
      INSERT INTO player_units (player_id, unit_type, amount) VALUES (?, ?, ?)
    `);
    unitStmt.run(id, 'militia', 50);
    
    return this.getPlayer(id);
  }

  verifyPlayer(username, password) {
    const stmt = this.db.prepare('SELECT * FROM players WHERE username = ?');
    const player = stmt.get(username);
    
    if (!player) return null;
    
    const valid = bcrypt.compareSync(password, player.password_hash);
    if (!valid) return null;
    
    delete player.password_hash;
    return player;
  }

  getPlayer(playerId) {
    const stmt = this.db.prepare('SELECT * FROM players WHERE id = ?');
    const player = stmt.get(playerId);
    if (!player) return null;
    
    delete player.password_hash;
    
    // Get units
    const unitsStmt = this.db.prepare('SELECT unit_type, amount FROM player_units WHERE player_id = ?');
    player.units = {};
    unitsStmt.all(playerId).forEach(row => {
      player.units[row.unit_type] = row.amount;
    });
    
    // Get buildings
    const buildingsStmt = this.db.prepare('SELECT building_type, amount FROM player_buildings WHERE player_id = ?');
    player.buildings = {};
    buildingsStmt.all(playerId).forEach(row => {
      player.buildings[row.building_type] = row.amount;
    });
    
    // Get heroes
    const heroesStmt = this.db.prepare('SELECT * FROM player_heroes WHERE player_id = ?');
    player.heroes = heroesStmt.all(playerId);
    
    // Get items
    const itemsStmt = this.db.prepare('SELECT * FROM player_items WHERE player_id = ?');
    player.items = itemsStmt.all(playerId);
    
    // Get active effects
    const effectsStmt = this.db.prepare('SELECT * FROM active_effects WHERE player_id = ? AND expires_at > ?');
    player.activeEffects = effectsStmt.all(playerId, Date.now());
    
    return player;
  }

  updatePlayerResources(playerId, gold, mana, population, land, totalLand = land) {
    const stmt = this.db.prepare(`
      UPDATE players 
      SET gold = ?, mana = ?, population = ?, land = ?, total_land = ?, last_active = ?
      WHERE id = ?
    `);
    stmt.run(gold, mana, population, land, totalLand, Date.now(), playerId);
  }

  getAllPlayers() {
    const stmt = this.db.prepare('SELECT id, username, gold, mana, population, land, total_land, level, wins, losses FROM players ORDER BY level DESC, experience DESC');
    return stmt.all();
  }

  // Unit methods
  updateUnits(playerId, unitType, amount) {
    const stmt = this.db.prepare(`
      INSERT INTO player_units (player_id, unit_type, amount)
      VALUES (?, ?, ?)
      ON CONFLICT(player_id, unit_type) DO UPDATE SET amount = ?
    `);
    stmt.run(playerId, unitType, amount, amount);
  }

  // Building methods
  updateBuildings(playerId, buildingType, amount) {
    const stmt = this.db.prepare(`
      INSERT INTO player_buildings (player_id, building_type, amount)
      VALUES (?, ?, ?)
      ON CONFLICT(player_id, building_type) DO UPDATE SET amount = ?
    `);
    stmt.run(playerId, buildingType, amount, amount);
  }

  // Queue methods
  addToTrainingQueue(playerId, unitType, amount, completesAt) {
    const stmt = this.db.prepare(`
      INSERT INTO training_queue (player_id, unit_type, amount, started_at, completes_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(playerId, unitType, amount, Date.now(), completesAt);
  }

  // Hero methods
  addHeroToPlayer(playerId, heroId, level, stats) {
    const stmt = this.db.prepare(`
      INSERT INTO player_heroes (player_id, hero_id, level, experience, health, max_health, attack, defense, equipped)
      VALUES (?, ?, ?, 0, ?, ?, ?, ?, 0)
    `);

    stmt.run(playerId, heroId, level, stats.health, stats.health, stats.attack, stats.defense);
  }

  // Hero black market methods
  createHeroMarketListing(heroId, heroLevel, startingBid, expiresAt) {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO hero_market_listings (hero_id, hero_level, starting_bid, listed_at, expires_at, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `);

    const result = stmt.run(heroId, heroLevel, startingBid, now, expiresAt);
    return this.getHeroMarketListing(result.lastInsertRowid);
  }

  getHeroMarketListings() {
    const stmt = this.db.prepare(`
      SELECT l.id, l.hero_id, l.hero_level, l.starting_bid, l.listed_at, l.expires_at, l.status,
             b.player_id AS highest_bidder_id, b.bid_amount AS highest_bid
      FROM hero_market_listings l
      LEFT JOIN hero_market_bids b ON b.id = (
        SELECT id FROM hero_market_bids WHERE listing_id = l.id ORDER BY bid_amount DESC, bid_at ASC LIMIT 1
      )
      WHERE l.status = 'active'
      ORDER BY l.expires_at ASC
    `);

    return stmt.all();
  }

  getHeroMarketListing(listingId) {
    const stmt = this.db.prepare(`
      SELECT * FROM hero_market_listings WHERE id = ?
    `);

    return stmt.get(listingId);
  }

  getHeroMarketListingWithHighestBid(listingId) {
    const stmt = this.db.prepare(`
      SELECT l.id, l.hero_id, l.hero_level, l.starting_bid, l.listed_at, l.expires_at, l.status,
             b.player_id AS highest_bidder_id, b.bid_amount AS highest_bid
      FROM hero_market_listings l
      LEFT JOIN hero_market_bids b ON b.id = (
        SELECT id FROM hero_market_bids WHERE listing_id = l.id ORDER BY bid_amount DESC, bid_at ASC LIMIT 1
      )
      WHERE l.id = ?
    `);

    return stmt.get(listingId);
  }

  placeHeroMarketBid(listingId, playerId, bidAmount) {
    const tx = this.db.transaction((listingIdArg, playerIdArg, bidAmountArg) => {
      const listing = this.db.prepare('SELECT * FROM hero_market_listings WHERE id = ?').get(listingIdArg);
      if (!listing || listing.status !== 'active' || listing.expires_at <= Date.now()) {
        return { success: false, error: 'Listing is no longer active' };
      }

      const highestBid = this.db.prepare(`
        SELECT * FROM hero_market_bids WHERE listing_id = ? ORDER BY bid_amount DESC, bid_at ASC LIMIT 1
      `).get(listingIdArg);

      const minimumBid = highestBid ? highestBid.bid_amount + 1 : listing.starting_bid;
      if (bidAmountArg < minimumBid) {
        return { success: false, error: `Bid must be at least ${Math.floor(minimumBid)} gold` };
      }

      const player = this.db.prepare('SELECT id, gold FROM players WHERE id = ?').get(playerIdArg);
      if (!player) {
        return { success: false, error: 'Player not found' };
      }

      if (player.gold < bidAmountArg) {
        return { success: false, error: 'Not enough gold to place bid' };
      }

      // Deduct bidder gold as escrow.
      this.db.prepare('UPDATE players SET gold = gold - ? WHERE id = ?').run(bidAmountArg, playerIdArg);

      const previousOwnBid = this.db.prepare('SELECT * FROM hero_market_bids WHERE listing_id = ? AND player_id = ?').get(listingIdArg, playerIdArg);
      if (previousOwnBid) {
        this.db.prepare('UPDATE players SET gold = gold + ? WHERE id = ?').run(previousOwnBid.bid_amount, playerIdArg);
        this.db.prepare('DELETE FROM hero_market_bids WHERE id = ?').run(previousOwnBid.id);
      }

      // Refund previous highest bidder if outbid.
      if (highestBid && highestBid.player_id !== playerIdArg) {
        this.db.prepare('UPDATE players SET gold = gold + ? WHERE id = ?').run(highestBid.bid_amount, highestBid.player_id);
        this.db.prepare('DELETE FROM hero_market_bids WHERE id = ?').run(highestBid.id);
      }

      this.db.prepare(`
        INSERT INTO hero_market_bids (listing_id, player_id, bid_amount, bid_at)
        VALUES (?, ?, ?, ?)
      `).run(listingIdArg, playerIdArg, bidAmountArg, Date.now());

      return { success: true };
    });

    return tx(listingId, playerId, bidAmount);
  }

  getExpiredHeroListings(now = Date.now()) {
    const stmt = this.db.prepare(`
      SELECT * FROM hero_market_listings
      WHERE status = 'active' AND expires_at <= ?
      ORDER BY expires_at ASC
    `);

    return stmt.all(now);
  }

  completeHeroListing(listingId) {
    const tx = this.db.transaction((listingIdArg) => {
      const listing = this.db.prepare('SELECT * FROM hero_market_listings WHERE id = ?').get(listingIdArg);
      if (!listing || listing.status !== 'active') {
        return null;
      }

      const highestBid = this.db.prepare(`
        SELECT * FROM hero_market_bids WHERE listing_id = ? ORDER BY bid_amount DESC, bid_at ASC LIMIT 1
      `).get(listingIdArg);

      this.db.prepare("UPDATE hero_market_listings SET status = 'sold' WHERE id = ?").run(listingIdArg);
      this.db.prepare('DELETE FROM hero_market_bids WHERE listing_id = ?').run(listingIdArg);

      return { listing, highestBid };
    });

    return tx(listingId);
  }

  cancelHeroListing(listingId) {
    const tx = this.db.transaction((listingIdArg) => {
      const listing = this.db.prepare('SELECT * FROM hero_market_listings WHERE id = ?').get(listingIdArg);
      if (!listing || listing.status !== 'active') {
        return null;
      }

      const bids = this.db.prepare('SELECT * FROM hero_market_bids WHERE listing_id = ?').all(listingIdArg);
      for (const bid of bids) {
        this.db.prepare('UPDATE players SET gold = gold + ? WHERE id = ?').run(bid.bid_amount, bid.player_id);
      }

      this.db.prepare("UPDATE hero_market_listings SET status = 'cancelled' WHERE id = ?").run(listingIdArg);
      this.db.prepare('DELETE FROM hero_market_bids WHERE listing_id = ?').run(listingIdArg);

      return { listing };
    });

    return tx(listingId);
  }

  getTrainingQueue(playerId) {
    const stmt = this.db.prepare('SELECT * FROM training_queue WHERE player_id = ? ORDER BY completes_at ASC');
    return stmt.all(playerId);
  }

  completeTraining(id) {
    const stmt = this.db.prepare('DELETE FROM training_queue WHERE id = ? RETURNING *');
    return stmt.get(id);
  }

  addToBuildingQueue(playerId, buildingType, amount, completesAt) {
    const stmt = this.db.prepare(`
      INSERT INTO building_queue (player_id, building_type, amount, started_at, completes_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(playerId, buildingType, amount, Date.now(), completesAt);
  }

  getBuildingQueue(playerId) {
    const stmt = this.db.prepare('SELECT * FROM building_queue WHERE player_id = ? ORDER BY completes_at ASC');
    return stmt.all(playerId);
  }

  completeBuilding(id) {
    const stmt = this.db.prepare('DELETE FROM building_queue WHERE id = ? RETURNING *');
    return stmt.get(id);
  }

  // Spell cooldowns
  setSpellCooldown(playerId, spellId, readyAt) {
    const stmt = this.db.prepare(`
      INSERT INTO spell_cooldowns (player_id, spell_id, ready_at)
      VALUES (?, ?, ?)
      ON CONFLICT(player_id, spell_id) DO UPDATE SET ready_at = ?
    `);
    stmt.run(playerId, spellId, readyAt, readyAt);
  }

  getSpellCooldowns(playerId) {
    const stmt = this.db.prepare('SELECT spell_id, ready_at FROM spell_cooldowns WHERE player_id = ?');
    return stmt.all(playerId);
  }

  // Active effects
  addEffect(playerId, effectType, multiplier, expiresAt, source) {
    const stmt = this.db.prepare(`
      INSERT INTO active_effects (player_id, effect_type, multiplier, expires_at, source)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(playerId, effectType, multiplier, expiresAt, source);
  }

  cleanExpiredEffects() {
    const stmt = this.db.prepare('DELETE FROM active_effects WHERE expires_at <= ?');
    stmt.run(Date.now());
  }

  // Combat log
  addCombatLog(attackerId, defenderId, report) {
    const stmt = this.db.prepare(`
      INSERT INTO combat_log (attacker_id, defender_id, timestamp, attacker_units_lost, 
                              defender_units_lost, gold_stolen, land_captured, victory, combat_report)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      attackerId, defenderId, Date.now(),
      report.attackerUnitsLost, report.defenderUnitsLost,
      report.goldStolen, report.landCaptured,
      report.victory ? 1 : 0,
      JSON.stringify(report)
    );
  }

  getCombatHistory(playerId, limit = 20) {
    const stmt = this.db.prepare(`
      SELECT * FROM combat_log 
      WHERE attacker_id = ? OR defender_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    return stmt.all(playerId, playerId, limit);
  }

  // Messages
  addMessage(playerId, message, type = 'info') {
    const stmt = this.db.prepare(`
      INSERT INTO messages (player_id, message, timestamp, type)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(playerId, message, Date.now(), type);
  }

  getMessages(playerId, unreadOnly = false) {
    let query = 'SELECT * FROM messages WHERE player_id = ?';
    if (unreadOnly) query += ' AND read = 0';
    query += ' ORDER BY timestamp DESC LIMIT 50';
    
    const stmt = this.db.prepare(query);
    return stmt.all(playerId);
  }

  markMessagesRead(playerId) {
    const stmt = this.db.prepare('UPDATE messages SET read = 1 WHERE player_id = ? AND read = 0');
    stmt.run(playerId);
  }

  close() {
    this.db.close();
  }
}

module.exports = GameDatabase;

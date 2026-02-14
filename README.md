# Archmage: Real-Time Strategy MMO

A fully-featured real-time multiplayer strategy game inspired by Archmage, built with Node.js, Socket.io, and vanilla JavaScript.

## Features

### ⚔️ Combat System
- Real-time attacks with power calculations
- 9 different unit types (Militia, Archers, Cavalry, Knights, Battle Mages, Elementals, Demons, Undead, Dragons)
- Attack/defense buffs and debuffs
- Combat history tracking

### 🔮 Magic System
**25+ Spells Across 5 Schools:**

- **Combat Spells**: Fireball, Lightning Storm, Meteor Strike, Plague
- **Economic Spells**: Prosperity, Mana Surge, Transmutation, Harvest Blessing
- **Strategic Spells**: Clairvoyance, Teleport, Time Warp, Invisibility
- **Enchantment Spells**: Fortification, Bloodlust, Sanctuary, Regeneration
- **Summoning Spells**: Summon Elementals, Demons, Undead, Dragon
- **Curse Spells**: Weakness, Confusion, Steal Mana

### 🦸 Heroes
**Hero progression with level-gated abilities:**

1. **Warlord Grimfang** (Warrior) - Rally Troops, Defensive Stance, War Cry
2. **Archmage Zarathus** (Mage) - Spell Mastery, Arcane Explosion, Mana Fountain
3. **Shadow Nightblade** (Rogue) - Sabotage, Steal Resources, Assassination
4. **High Priest Luminara** (Priest) - Divine Protection, Mass Heal, Blessing of Fortune
5. **Lord Mortis** (Necromancer) - Death Aura, Life Drain, Army of Darkness

### 🏰 Kingdom Building
**7 Building Types:**
- Gold Mine - Produces gold
- Mana Crystal - Generates mana
- Farm - Increases population
- Barracks - Speeds up training
- Wizard Tower - Boosts spell power
- Fortified Walls - Increases defense
- Marketplace - Boosts gold income

### 💎 Items & Equipment
- Legendary weapons and armor
- Equipment system for heroes
- Black market hero auctions with player bidding
- Heroes appear in the black market at random levels

### 🎮 Real-Time Mechanics
- Resources tick every second
- Training and building queues with real-time completion
- Spell cooldowns
- Active buff/debuff system
- Live notifications and combat alerts

## Installation & Setup

### Local Development

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd archmage-realtime
```

2. **Install dependencies:**
```bash
npm install
```

3. **Run the server:**
```bash
npm start
```

4. **Open your browser:**
```
http://localhost:3000
```

### Development Mode with Auto-Reload

```bash
npm run dev
```

## Deployment to Railway

### Option 1: Railway CLI

1. **Install Railway CLI:**
```bash
npm i -g @railway/cli
```

2. **Login to Railway:**
```bash
railway login
```

3. **Initialize project:**
```bash
railway init
```

4. **Deploy:**
```bash
railway up
```

5. **Open your app:**
```bash
railway open
```

### Option 2: GitHub Integration

1. Push your code to GitHub
2. Go to [Railway.app](https://railway.app)
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Railway will auto-detect the Dockerfile and deploy

### Environment Variables

- `PORT` is provided automatically by Railway.
- `GAME_DB_PATH` (optional) lets you set an explicit SQLite file location.
- `RAILWAY_VOLUME_MOUNT_PATH` (set by Railway when a volume is attached) is used automatically to store `game.db` on persistent storage.

For production on Railway, attach a volume so account data survives redeploys/restarts.

## How to Play

### Getting Started
1. Register a new account
2. You start with:
   - 5,000 gold
   - 1,000 mana
   - 100 population
   - 50 land
   - 50 militia units

### Building Your Kingdom
1. **Expand Land** - Needed for buildings
2. **Construct Buildings** - Generate resources
3. **Train Units** - Build your army

### Economy Management
- Gold mines produce gold automatically
- Mana crystals generate mana
- Farms increase population growth
- Resources accumulate in real-time

### Military Strategy
1. Train diverse unit types
2. Each unit has different attack/defense stats
3. Build barracks to speed up training
4. Use spells to enhance your forces

### Magic System
- Cast economic spells to boost production
- Use combat spells to damage enemies
- Strategic spells provide various advantages
- Summoning spells create powerful units
- All spells have cooldowns

### Combat
1. Navigate to Combat tab
2. Enter enemy username
3. Launch attack
4. View battle report
5. Successful attacks yield gold and land

### Progression
- Gain experience from actions
- Level up to become more powerful
- Climb the leaderboard
- Track your wins/losses

## Game Mechanics

### Resource Production
- **Base Income**: 10 gold/s, 5 mana/s, 1 population/min
- **Building Bonuses**: Stack with base production
- **Army & Hero Upkeep**: Troops and recruited heroes consume gold each second
- **Spell Buffs**: Temporary multipliers (e.g., Prosperity = 1.5x gold)
- **Active Effects**: Can have up to 10 buffs simultaneously

### Training Queue
- Units train in the background
- Training speed affected by:
  - Base training time
  - Barracks count (25% faster per barracks)
  - Time Warp spell (3x speed)

### Combat Resolution
- Attacker Power = Sum of (unit.attack × amount)
- Defender Power = Sum of (unit.defense × amount)
- Buffs/debuffs multiply power
- Victory = Attacker Power > Defender Power
- Winners steal 10% gold and 5% land
- Casualties: 5-20% depending on victory/defeat

### Spell Cooldowns
- Range from 5 minutes to 1 hour
- More powerful spells have longer cooldowns
- Spell Mastery (Mage hero) reduces by 25%

## Architecture

### Backend
- **Node.js** + Express for HTTP server
- **Socket.io** for real-time WebSocket communication
- **SQLite** (better-sqlite3) for data persistence
- **bcrypt** for password hashing

### Frontend
- Vanilla JavaScript (no frameworks)
- Real-time updates via Socket.io
- Responsive CSS Grid layout

### Database Schema
- Players, Units, Buildings
- Heroes, Items, Inventory
- Active Effects & Cooldowns
- Training/Building Queues
- Combat Logs & Messages

### Game Loop
- 1-second tick for resource updates
- 5-second tick for queue processing
- 60-second cleanup of expired effects

## API Endpoints

### REST API
- `POST /api/register` - Create account
- `POST /api/login` - Authenticate
- `GET /api/gamedata` - Get game constants

### Socket.io Events
**Client → Server:**
- `authenticate` - Login with token
- `trainUnits` - Start training
- `buildStructure` - Start construction
- `castSpell` - Use magic
- `attack` - Attack player
- `expandLand` - Purchase land
- `getLeaderboard` - Request rankings

**Server → Client:**
- `authenticated` - Send initial state
- `resourceUpdate` - Real-time resources
- `trainingComplete` - Unit ready
- `buildingComplete` - Structure done
- `attacked` - Under attack notification
- `messages` - Game notifications

## Customization

### Adding New Spells
Edit `src/shared/gameData.js`:

```javascript
NEW_SPELL: {
  id: 'new_spell',
  name: 'New Spell',
  school: SPELL_SCHOOLS.COMBAT,
  manaCost: 1000,
  cooldown: 600,
  description: 'Does something cool',
  effect: (caster, target) => ({
    type: 'custom_effect',
    // Your effect logic
  })
}
```

### Adding New Units
```javascript
NEW_UNIT: {
  id: 'new_unit',
  name: 'New Unit',
  goldCost: 500,
  populationCost: 2,
  trainingTime: 60,
  attack: 10,
  defense: 8,
  description: 'Special unit'
}
```

## Performance

- Handles 10-50 concurrent players smoothly
- SQLite is fast for this scale
- For 100+ players, migrate to PostgreSQL
- Socket.io rooms prevent broadcast storms

## Future Enhancements

- [ ] Alliances/Guilds
- [ ] Territory map visualization
- [ ] Achievements system
- [ ] Daily quests
- [ ] Season rankings
- [ ] Mobile app (React Native)
- [ ] Admin panel
- [ ] Battle animations
- [ ] Sound effects
- [ ] Chat system

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
```

### Database Locked
```bash
# Delete database and restart
rm game.db
npm start
```

### Connection Issues
- Check firewall settings
- Ensure PORT environment variable is set
- Verify Socket.io connection in browser console

## License

MIT License - Feel free to modify and use for your own projects!

## Credits

Inspired by Archmage: The Reincarnation
Built with ❤️ using Node.js and Socket.io

---

## Quick Start Commands

```bash
# Install
npm install

# Run locally
npm start

# Development mode
npm run dev

# Deploy to Railway
railway up

# View logs
railway logs
```

## Support

For issues or questions, create an issue on GitHub or check the troubleshooting section above.

Enjoy building your empire! ⚔️🏰✨

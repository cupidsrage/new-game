// Game constants and data shared between client and server

const RESOURCE_TYPES = {
  GOLD: 'gold',
  MANA: 'mana',
  POPULATION: 'population',
  LAND: 'land'
};

const SPELL_SCHOOLS = {
  COMBAT: 'combat',
  ECONOMIC: 'economic',
  STRATEGIC: 'strategic',
  ENCHANTMENT: 'enchantment',
  SUMMONING: 'summoning'
};

const SPELLS = {
  // Combat Spells
  FIREBALL: {
    id: 'fireball',
    name: 'Fireball',
    school: SPELL_SCHOOLS.COMBAT,
    manaCost: 500,
    researchDays: 1,
    cooldown: 300, // 5 minutes in seconds
    description: 'Destroy enemy units with magical fire',
    effect: (caster, target) => ({
      type: 'damage_units',
      targetPlayerId: target.id,
      percentage: 0.05,
      message: `${caster.username} cast Fireball! 5% of ${target.username}'s army was destroyed!`
    })
  },
  LIGHTNING_STORM: {
    id: 'lightning_storm',
    name: 'Lightning Storm',
    school: SPELL_SCHOOLS.COMBAT,
    manaCost: 1200,
    researchDays: 2,
    cooldown: 600,
    description: 'Unleash devastating lightning on enemy forces',
    effect: (caster, target) => ({
      type: 'damage_units',
      targetPlayerId: target.id,
      percentage: 0.12,
      message: `${caster.username} summoned a Lightning Storm! 12% of ${target.username}'s army was obliterated!`
    })
  },
  METEOR_STRIKE: {
    id: 'meteor_strike',
    name: 'Meteor Strike',
    school: SPELL_SCHOOLS.COMBAT,
    manaCost: 2500,
    researchDays: 3,
    cooldown: 1200,
    description: 'Call down meteors to devastate enemy armies and buildings',
    effect: (caster, target) => ({
      type: 'damage_mixed',
      targetPlayerId: target.id,
      unitPercentage: 0.15,
      buildingPercentage: 0.05,
      message: `${caster.username} called down Meteors! ${target.username} lost 15% units and 5% building effectiveness!`
    })
  },
  PLAGUE: {
    id: 'plague',
    name: 'Plague',
    school: SPELL_SCHOOLS.COMBAT,
    manaCost: 1800,
    researchDays: 2,
    cooldown: 900,
    description: 'Spread disease through enemy population',
    effect: (caster, target) => ({
      type: 'damage_population',
      targetPlayerId: target.id,
      percentage: 0.20,
      message: `${caster.username} unleashed a Plague on ${target.username}! 20% of the population perished!`
    })
  },

  // Economic Spells
  PROSPERITY: {
    id: 'prosperity',
    name: 'Prosperity',
    school: SPELL_SCHOOLS.ECONOMIC,
    manaCost: 800,
    researchDays: 1,
    cooldown: 600,
    description: 'Increase gold production for 1 hour',
    effect: (caster) => ({
      type: 'buff_resource',
      targetPlayerId: caster.id,
      resource: 'gold',
      multiplier: 1.5,
      duration: 3600,
      message: `${caster.username} cast Prosperity! Gold production increased by 50% for 1 hour!`
    })
  },
  MANA_SURGE: {
    id: 'mana_surge',
    name: 'Mana Surge',
    school: SPELL_SCHOOLS.ECONOMIC,
    manaCost: 600,
    researchDays: 1,
    cooldown: 600,
    description: 'Increase mana regeneration for 1 hour',
    effect: (caster) => ({
      type: 'buff_resource',
      targetPlayerId: caster.id,
      resource: 'mana',
      multiplier: 2.0,
      duration: 3600,
      message: `${caster.username} channeled Mana Surge! Mana regeneration doubled for 1 hour!`
    })
  },
  TRANSMUTATION: {
    id: 'transmutation',
    name: 'Transmutation',
    school: SPELL_SCHOOLS.ECONOMIC,
    manaCost: 1500,
    researchDays: 2,
    cooldown: 1800,
    description: 'Convert mana into gold',
    effect: (caster) => ({
      type: 'convert_resource',
      targetPlayerId: caster.id,
      from: 'mana',
      to: 'gold',
      ratio: 2.0,
      amount: Math.floor(caster.mana * 0.5),
      message: `${caster.username} transmuted mana into gold!`
    })
  },
  HARVEST_BLESSING: {
    id: 'harvest_blessing',
    name: 'Harvest Blessing',
    school: SPELL_SCHOOLS.ECONOMIC,
    manaCost: 1000,
    researchDays: 2,
    cooldown: 900,
    description: 'Instantly gain resources based on land owned',
    effect: (caster) => ({
      type: 'instant_resource',
      targetPlayerId: caster.id,
      gold: caster.total_land * 10,
      mana: caster.total_land * 5,
      message: `${caster.username} blessed the harvest! Gained instant resources!`
    })
  },

  // Strategic Spells
  CLAIRVOYANCE: {
    id: 'clairvoyance',
    name: 'Clairvoyance',
    school: SPELL_SCHOOLS.STRATEGIC,
    manaCost: 400,
    researchDays: 1,
    cooldown: 300,
    description: 'Reveal detailed information about target player',
    effect: (caster, target) => ({
      type: 'reveal_info',
      targetPlayerId: target.id,
      message: `${caster.username} used Clairvoyance to spy on ${target.username}!`
    })
  },
  TELEPORT: {
    id: 'teleport',
    name: 'Teleport',
    school: SPELL_SCHOOLS.STRATEGIC,
    manaCost: 2000,
    researchDays: 3,
    cooldown: 1800,
    description: 'Instantly move your army to attack a distant target',
    effect: (caster, target) => ({
      type: 'instant_attack',
      targetPlayerId: target.id,
      message: `${caster.username} teleported their army to attack ${target.username}!`
    })
  },
  TIME_WARP: {
    id: 'time_warp',
    name: 'Time Warp',
    school: SPELL_SCHOOLS.STRATEGIC,
    manaCost: 3000,
    researchDays: 4,
    cooldown: 2400,
    description: 'Speed up all training and construction by 200% for 30 minutes',
    effect: (caster) => ({
      type: 'buff_speed',
      targetPlayerId: caster.id,
      multiplier: 3.0,
      duration: 1800,
      message: `${caster.username} warped time! All actions 3x faster for 30 minutes!`
    })
  },
  INVISIBILITY: {
    id: 'invisibility',
    name: 'Invisibility',
    school: SPELL_SCHOOLS.STRATEGIC,
    manaCost: 1500,
    researchDays: 2,
    cooldown: 1200,
    description: 'Hide your kingdom from spying spells for 2 hours',
    effect: (caster) => ({
      type: 'buff_stealth',
      targetPlayerId: caster.id,
      duration: 7200,
      message: `${caster.username} vanished into invisibility!`
    })
  },

  // Enchantment Spells
  FORTIFICATION: {
    id: 'fortification',
    name: 'Fortification',
    school: SPELL_SCHOOLS.ENCHANTMENT,
    manaCost: 1200,
    researchDays: 2,
    cooldown: 1200,
    description: 'Increase defensive strength for 2 hours',
    effect: (caster) => ({
      type: 'buff_defense',
      targetPlayerId: caster.id,
      multiplier: 1.5,
      duration: 7200,
      message: `${caster.username} fortified their defenses! +50% defense for 2 hours!`
    })
  },
  BLOODLUST: {
    id: 'bloodlust',
    name: 'Bloodlust',
    school: SPELL_SCHOOLS.ENCHANTMENT,
    manaCost: 1000,
    researchDays: 2,
    cooldown: 900,
    description: 'Increase offensive power for 1 hour',
    effect: (caster) => ({
      type: 'buff_offense',
      targetPlayerId: caster.id,
      multiplier: 1.75,
      duration: 3600,
      message: `${caster.username} enraged their army with Bloodlust! +75% attack for 1 hour!`
    })
  },
  SANCTUARY: {
    id: 'sanctuary',
    name: 'Sanctuary',
    school: SPELL_SCHOOLS.ENCHANTMENT,
    manaCost: 2500,
    researchDays: 3,
    cooldown: 3600,
    description: 'Make your kingdom immune to attacks for 15 minutes',
    effect: (caster) => ({
      type: 'buff_immunity',
      targetPlayerId: caster.id,
      duration: 900,
      message: `${caster.username} created a Sanctuary! Immune to attacks for 15 minutes!`
    })
  },
  REGENERATION: {
    id: 'regeneration',
    name: 'Regeneration',
    school: SPELL_SCHOOLS.ENCHANTMENT,
    manaCost: 800,
    researchDays: 1,
    cooldown: 1200,
    description: 'Heal damaged units over time',
    effect: (caster) => ({
      type: 'heal_units',
      targetPlayerId: caster.id,
      healRate: 0.10,
      duration: 1800,
      message: `${caster.username} cast Regeneration! Units healing at 10% per 5 minutes!`
    })
  },

  // Summoning Spells
  SUMMON_ELEMENTALS: {
    id: 'summon_elementals',
    name: 'Summon Elementals',
    school: SPELL_SCHOOLS.SUMMONING,
    manaCost: 1500,
    researchDays: 2,
    cooldown: 1200,
    description: 'Summon powerful elemental warriors',
    effect: (caster) => ({
      type: 'summon_units',
      targetPlayerId: caster.id,
      unitType: 'elementals',
      amount: Math.floor(caster.total_land * 2),
      message: `${caster.username} summoned Elementals to join their army!`
    })
  },
  SUMMON_DEMONS: {
    id: 'summon_demons',
    name: 'Summon Demons',
    school: SPELL_SCHOOLS.SUMMONING,
    manaCost: 2200,
    researchDays: 3,
    cooldown: 1800,
    description: 'Summon fearsome demons from the abyss',
    effect: (caster) => ({
      type: 'summon_units',
      targetPlayerId: caster.id,
      unitType: 'demons',
      amount: Math.floor(caster.total_land * 1.5),
      message: `${caster.username} opened a portal and summoned Demons!`
    })
  },
  SUMMON_UNDEAD: {
    id: 'summon_undead',
    name: 'Raise Undead',
    school: SPELL_SCHOOLS.SUMMONING,
    manaCost: 1000,
    researchDays: 2,
    cooldown: 900,
    description: 'Raise the dead to serve you',
    effect: (caster) => ({
      type: 'summon_units',
      targetPlayerId: caster.id,
      unitType: 'undead',
      amount: Math.floor(caster.total_land * 3),
      message: `${caster.username} raised an Undead army from the graves!`
    })
  },
  SUMMON_DRAGON: {
    id: 'summon_dragon',
    name: 'Summon Dragon',
    school: SPELL_SCHOOLS.SUMMONING,
    manaCost: 5000,
    researchDays: 5,
    cooldown: 3600,
    description: 'Summon an ancient dragon to devastate your enemies',
    effect: (caster, target) => ({
      type: 'dragon_attack',
      targetPlayerId: target ? target.id : null,
      damage: 0.25,
      message: `${caster.username} summoned an Ancient Dragon! ${target ? `${target.username}'s kingdom burns!` : 'The dragon awaits orders!'}`
    })
  },

  // Curse Spells
  WEAKNESS: {
    id: 'weakness',
    name: 'Curse of Weakness',
    school: SPELL_SCHOOLS.COMBAT,
    manaCost: 900,
    researchDays: 2,
    cooldown: 1200,
    description: 'Reduce enemy offensive power',
    effect: (caster, target) => ({
      type: 'debuff_offense',
      targetPlayerId: target.id,
      multiplier: 0.5,
      duration: 3600,
      message: `${caster.username} cursed ${target.username} with Weakness! -50% attack for 1 hour!`
    })
  },
  CONFUSION: {
    id: 'confusion',
    name: 'Confusion',
    school: SPELL_SCHOOLS.STRATEGIC,
    manaCost: 700,
    researchDays: 1,
    cooldown: 600,
    description: 'Slow down enemy production',
    effect: (caster, target) => ({
      type: 'debuff_speed',
      targetPlayerId: target.id,
      multiplier: 0.5,
      duration: 1800,
      message: `${caster.username} confused ${target.username}! Production slowed by 50% for 30 minutes!`
    })
  },
  STEAL_MANA: {
    id: 'steal_mana',
    name: 'Steal Mana',
    school: SPELL_SCHOOLS.STRATEGIC,
    manaCost: 500,
    researchDays: 1,
    cooldown: 600,
    description: 'Drain mana from target and add to your own',
    effect: (caster, target) => ({
      type: 'steal_resource',
      targetPlayerId: target.id,
      resource: 'mana',
      percentage: 0.10,
      message: `${caster.username} stole mana from ${target.username}!`
    })
  }
};

const UNIT_TYPES = {
  MILITIA: {
    id: 'militia',
    name: 'Militia',
    goldCost: 50,
    populationCost: 1,
    trainingTime: 10, // seconds
    upkeepGoldPerSecond: 0.05,
    attack: 1,
    defense: 1,
    description: 'Basic infantry units'
  },
  ARCHERS: {
    id: 'archers',
    name: 'Archers',
    goldCost: 100,
    populationCost: 1,
    trainingTime: 15,
    upkeepGoldPerSecond: 0.09,
    attack: 3,
    defense: 1,
    description: 'Ranged units with higher attack'
  },
  CAVALRY: {
    id: 'cavalry',
    name: 'Cavalry',
    goldCost: 200,
    populationCost: 2,
    trainingTime: 30,
    upkeepGoldPerSecond: 0.18,
    attack: 5,
    defense: 3,
    description: 'Fast, powerful mounted units'
  },
  KNIGHTS: {
    id: 'knights',
    name: 'Knights',
    goldCost: 500,
    populationCost: 3,
    trainingTime: 60,
    upkeepGoldPerSecond: 0.45,
    attack: 10,
    defense: 8,
    description: 'Elite armored warriors'
  },
  MAGES: {
    id: 'mages',
    name: 'Battle Mages',
    goldCost: 800,
    manaCost: 100,
    populationCost: 2,
    trainingTime: 90,
    upkeepGoldPerSecond: 0.55,
    attack: 15,
    defense: 5,
    description: 'Powerful spellcasters'
  },
  PIKEMEN: {
    id: 'pikemen',
    name: 'Pikemen',
    goldCost: 140,
    populationCost: 1,
    trainingTime: 20,
    upkeepGoldPerSecond: 0.12,
    attack: 3,
    defense: 3,
    description: 'Disciplined spear infantry that counters cavalry charges'
  },
  CROSSBOWMEN: {
    id: 'crossbowmen',
    name: 'Crossbowmen',
    goldCost: 240,
    populationCost: 1,
    trainingTime: 28,
    upkeepGoldPerSecond: 0.2,
    attack: 6,
    defense: 2,
    description: 'Heavy ranged infantry with high armor-piercing damage'
  },
  PALADINS: {
    id: 'paladins',
    name: 'Paladins',
    goldCost: 650,
    manaCost: 40,
    populationCost: 3,
    trainingTime: 75,
    upkeepGoldPerSecond: 0.5,
    attack: 12,
    defense: 11,
    description: 'Holy heavy cavalry with exceptional frontline durability'
  },
  WARLOCKS: {
    id: 'warlocks',
    name: 'Warlocks',
    goldCost: 950,
    manaCost: 180,
    populationCost: 2,
    trainingTime: 110,
    upkeepGoldPerSecond: 0.65,
    attack: 19,
    defense: 6,
    description: 'Dark casters focused on destructive battlefield magic'
  },
  ELEMENTALS: {
    id: 'elementals',
    name: 'Elementals',
    goldCost: 0,
    manaCost: 0,
    populationCost: 0,
    trainingTime: 0,
    upkeepGoldPerSecond: 0.28,
    upkeepManaPerSecond: 0.12,
    attack: 12,
    defense: 10,
    description: 'Magical beings summoned by spells'
  },
  DEMONS: {
    id: 'demons',
    name: 'Demons',
    goldCost: 0,
    manaCost: 0,
    populationCost: 0,
    trainingTime: 0,
    upkeepGoldPerSecond: 0.38,
    upkeepManaPerSecond: 0.2,
    attack: 20,
    defense: 15,
    description: 'Fearsome creatures from the abyss'
  },
  UNDEAD: {
    id: 'undead',
    name: 'Undead',
    goldCost: 0,
    manaCost: 0,
    populationCost: 0,
    trainingTime: 0,
    upkeepGoldPerSecond: 0.24,
    upkeepManaPerSecond: 0.08,
    attack: 8,
    defense: 12,
    description: 'Risen corpses that never tire'
  },
  DRAGONS: {
    id: 'dragons',
    name: 'Dragons',
    goldCost: 0,
    manaCost: 0,
    populationCost: 0,
    trainingTime: 0,
    upkeepGoldPerSecond: 1.5,
    upkeepManaPerSecond: 0.75,
    attack: 50,
    defense: 40,
    description: 'Ancient dragons of immense power'
  }
};

const BUILDING_TYPES = {
  GOLD_MINE: {
    id: 'gold_mine',
    name: 'Gold Mine',
    goldCost: 500,
    landCost: 1,
    buildTime: 60,
    goldPerSecond: 2,
    description: 'Produces gold over time'
  },
  MANA_CRYSTAL: {
    id: 'mana_crystal',
    name: 'Mana Crystal',
    goldCost: 800,
    landCost: 1,
    buildTime: 90,
    manaPerSecond: 1,
    description: 'Generates mana over time'
  },
  FARM: {
    id: 'farm',
    name: 'Farm',
    goldCost: 300,
    landCost: 2,
    buildTime: 45,
    populationPerSecond: 0.5,
    description: 'Increases population growth'
  },
  BARRACKS: {
    id: 'barracks',
    name: 'Barracks',
    goldCost: 1000,
    landCost: 3,
    buildTime: 120,
    trainingSpeedBonus: 0.25,
    description: 'Increases unit training speed by 25%'
  },
  WIZARD_TOWER: {
    id: 'wizard_tower',
    name: 'Wizard Tower',
    goldCost: 2000,
    landCost: 2,
    buildTime: 180,
    spellPowerBonus: 0.20,
    manaPerSecond: 2,
    description: 'Increases spell power and mana generation'
  },
  WALLS: {
    id: 'walls',
    name: 'Fortified Walls',
    goldCost: 1500,
    landCost: 1,
    buildTime: 150,
    defenseBonus: 0.30,
    description: 'Increases defensive strength by 30%'
  },
  MARKETPLACE: {
    id: 'marketplace',
    name: 'Marketplace',
    goldCost: 800,
    landCost: 2,
    buildTime: 90,
    goldPerSecond: 3,
    tradeBonus: 0.15,
    description: 'Increases gold income and trade efficiency'
  },
  UNIVERSITY: {
    id: 'university',
    name: 'University',
    goldCost: 1800,
    landCost: 2,
    buildTime: 140,
    researchTimeReductionMinutes: 15,
    description: 'Reduces spell research time by 15 minutes per University owned'
  }
};

const HEROES = {
  WARRIOR: {
    id: 'warrior',
    name: 'Warlord Grimfang',
    class: 'Warrior',
    goldCost: 1000000,
    upkeepGoldPerSecond: 2,
    description: 'Master of combat and military tactics',
    baseStats: {
      attack: 100,
      defense: 80,
      health: 1000
    },
    abilities: [
      {
        id: 'rally_troops',
        name: 'Rally Troops',
        cooldown: 1800,
        unlockLevel: 1,
        effect: 'Increase all unit attack by 50% for 1 hour'
      },
      {
        id: 'defensive_stance',
        name: 'Defensive Stance',
        cooldown: 2400,
        unlockLevel: 3,
        effect: 'Increase all unit defense by 75% for 1 hour'
      },
      {
        id: 'war_cry',
        name: 'War Cry',
        cooldown: 3600,
        unlockLevel: 5,
        effect: 'Terrify enemies, reducing their attack by 30% for 2 hours'
      }
    ]
  },
  MAGE: {
    id: 'mage',
    name: 'Archmage Zarathus',
    class: 'Mage',
    goldCost: 1000000,
    upkeepGoldPerSecond: 2,
    description: 'Supreme master of magical arts',
    baseStats: {
      attack: 150,
      defense: 40,
      health: 600,
      mana: 2000
    },
    abilities: [
      {
        id: 'spell_mastery',
        name: 'Spell Mastery',
        cooldown: 0,
        unlockLevel: 1,
        effect: 'Reduce all spell cooldowns by 25% (passive)'
      },
      {
        id: 'arcane_explosion',
        name: 'Arcane Explosion',
        cooldown: 1200,
        unlockLevel: 3,
        effect: 'Deal massive damage to target enemy army'
      },
      {
        id: 'mana_fountain',
        name: 'Mana Fountain',
        cooldown: 2400,
        unlockLevel: 5,
        effect: 'Triple mana regeneration for 2 hours'
      }
    ]
  },
  ROGUE: {
    id: 'rogue',
    name: 'Shadow Nightblade',
    class: 'Rogue',
    goldCost: 1000000,
    upkeepGoldPerSecond: 2,
    description: 'Master of espionage and subterfuge',
    baseStats: {
      attack: 120,
      defense: 60,
      health: 700
    },
    abilities: [
      {
        id: 'sabotage',
        name: 'Sabotage',
        cooldown: 1800,
        unlockLevel: 1,
        effect: 'Destroy 10% of enemy buildings'
      },
      {
        id: 'steal_resources',
        name: 'Steal Resources',
        cooldown: 2400,
        unlockLevel: 3,
        effect: 'Steal 15% of enemy gold and mana'
      },
      {
        id: 'assassination',
        name: 'Assassination',
        cooldown: 3600,
        unlockLevel: 5,
        effect: 'Instantly kill 5% of enemy units'
      }
    ]
  },
  PRIEST: {
    id: 'priest',
    name: 'High Priest Luminara',
    class: 'Priest',
    goldCost: 1000000,
    upkeepGoldPerSecond: 2,
    description: 'Divine healer and protector',
    baseStats: {
      attack: 60,
      defense: 100,
      health: 800
    },
    abilities: [
      {
        id: 'divine_protection',
        name: 'Divine Protection',
        cooldown: 2400,
        unlockLevel: 1,
        effect: 'Reduce incoming damage by 50% for 1 hour'
      },
      {
        id: 'mass_heal',
        name: 'Mass Heal',
        cooldown: 1800,
        unlockLevel: 3,
        effect: 'Restore 30% of damaged units'
      },
      {
        id: 'blessing',
        name: 'Blessing of Fortune',
        cooldown: 3600,
        unlockLevel: 5,
        effect: 'Double all resource production for 30 minutes'
      }
    ]
  },
  NECROMANCER: {
    id: 'necromancer',
    name: 'Lord Mortis',
    class: 'Necromancer',
    goldCost: 1000000,
    upkeepGoldPerSecond: 2,
    description: 'Master of death and the undead',
    baseStats: {
      attack: 140,
      defense: 50,
      health: 650
    },
    abilities: [
      {
        id: 'death_aura',
        name: 'Death Aura',
        cooldown: 1200,
        unlockLevel: 1,
        effect: 'Convert 10% of killed enemy units into undead'
      },
      {
        id: 'life_drain',
        name: 'Life Drain',
        cooldown: 1800,
        unlockLevel: 3,
        effect: 'Drain enemy population to heal your units'
      },
      {
        id: 'army_of_darkness',
        name: 'Army of Darkness',
        cooldown: 3600,
        unlockLevel: 5,
        effect: 'Summon massive undead army based on casualties dealt'
      }
    ]
  },
  RANGER: {
    id: 'ranger',
    name: 'Sylvan Huntmaster Kael',
    class: 'Ranger',
    goldCost: 1200000,
    upkeepGoldPerSecond: 2.2,
    description: 'Tactical skirmisher commanding elite ranged formations',
    baseStats: {
      attack: 135,
      defense: 70,
      health: 760
    },
    abilities: [
      {
        id: 'marked_prey',
        name: 'Marked Prey',
        cooldown: 1500,
        unlockLevel: 1,
        effect: 'Expose target kingdom, increasing all incoming damage by 20% for 30 minutes'
      },
      {
        id: 'hail_of_bolts',
        name: 'Hail of Bolts',
        cooldown: 2100,
        unlockLevel: 3,
        effect: 'Launch a precision volley that destroys 8% of enemy ranged and mage units'
      },
      {
        id: 'forest_ambush',
        name: 'Forest Ambush',
        cooldown: 3000,
        unlockLevel: 5,
        effect: 'Grant your next attack +35% offensive power and reduced retaliation losses'
      }
    ]
  },
  PALADIN: {
    id: 'paladin',
    name: 'Lady Seraphine Dawnshield',
    class: 'Paladin',
    goldCost: 1400000,
    upkeepGoldPerSecond: 2.4,
    description: 'Holy champion who inspires armies and shields allied troops',
    baseStats: {
      attack: 110,
      defense: 130,
      health: 980,
      mana: 900
    },
    abilities: [
      {
        id: 'aegis_vow',
        name: 'Aegis Vow',
        cooldown: 1800,
        unlockLevel: 1,
        effect: 'Reduce all incoming kingdom damage by 35% for 45 minutes'
      },
      {
        id: 'judgment_lance',
        name: 'Judgment Lance',
        cooldown: 2400,
        unlockLevel: 3,
        effect: 'Smite enemy vanguard, eliminating 6% of cavalry and knight-class units'
      },
      {
        id: 'radiant_muster',
        name: 'Radiant Muster',
        cooldown: 3600,
        unlockLevel: 5,
        effect: 'Increase militia, pikemen, and paladin attack/defense by 40% for 1 hour'
      }
    ]
  },
  ARTIFICER: {
    id: 'artificer',
    name: 'Master Artificer Voltren',
    class: 'Artificer',
    goldCost: 1600000,
    upkeepGoldPerSecond: 2.5,
    description: 'Arcane engineer specializing in logistics and battlefield constructs',
    baseStats: {
      attack: 95,
      defense: 95,
      health: 840,
      mana: 1200
    },
    abilities: [
      {
        id: 'clockwork_legion',
        name: 'Clockwork Legion',
        cooldown: 2100,
        unlockLevel: 1,
        effect: 'Instantly reinforce your army with temporary constructs equal to 12% of current forces'
      },
      {
        id: 'supply_overdrive',
        name: 'Supply Overdrive',
        cooldown: 2700,
        unlockLevel: 3,
        effect: 'Increase gold and mana production by 60% and unit training speed by 30% for 30 minutes'
      },
      {
        id: 'runic_barrier_grid',
        name: 'Runic Barrier Grid',
        cooldown: 3300,
        unlockLevel: 5,
        effect: 'Deploy layered warding that grants +50% building resilience for 1 hour'
      }
    ]
  },
  DRUID: {
    id: 'druid',
    name: 'Elder Druid Thornweaver',
    class: 'Druid',
    goldCost: 1300000,
    upkeepGoldPerSecond: 2.3,
    description: 'Guardian of wild lands who bends natural cycles to strengthen kingdoms',
    baseStats: {
      attack: 90,
      defense: 120,
      health: 900,
      mana: 1100
    },
    abilities: [
      {
        id: 'wild_regrowth',
        name: 'Wild Regrowth',
        cooldown: 1500,
        unlockLevel: 1,
        effect: 'Restore 20% of damaged units and recover 3% destroyed land over 20 minutes'
      },
      {
        id: 'thornward_rampart',
        name: 'Thornward Rampart',
        cooldown: 2400,
        unlockLevel: 3,
        effect: 'Increase kingdom defense and building resilience by 30% for 1 hour'
      },
      {
        id: 'primal_harvest',
        name: 'Primal Harvest',
        cooldown: 3300,
        unlockLevel: 5,
        effect: 'Boost food, gold, and mana generation by 70% for 35 minutes'
      }
    ]
  },
  WARLOCK: {
    id: 'warlock',
    name: 'Hexlord Varynth',
    class: 'Warlock',
    goldCost: 1500000,
    upkeepGoldPerSecond: 2.5,
    description: 'Dark ritualist specializing in curses, attrition, and soul-fueled warfare',
    baseStats: {
      attack: 155,
      defense: 55,
      health: 680,
      mana: 1800
    },
    abilities: [
      {
        id: 'covenant_of_pain',
        name: 'Covenant of Pain',
        cooldown: 1700,
        unlockLevel: 1,
        effect: 'Afflict enemy army with a curse that deals 12% attrition over 30 minutes'
      },
      {
        id: 'soul_siphon',
        name: 'Soul Siphon',
        cooldown: 2300,
        unlockLevel: 3,
        effect: 'Drain enemy mana reserves and convert 40% of it into your own'
      },
      {
        id: 'cataclysm_rite',
        name: 'Cataclysm Rite',
        cooldown: 3600,
        unlockLevel: 5,
        effect: 'Unleash ritual devastation dealing 10% unit losses and 10% production disruption'
      }
    ]
  },
  BERSERKER: {
    id: 'berserker',
    name: 'Bloodthane Korga',
    class: 'Berserker',
    goldCost: 1250000,
    upkeepGoldPerSecond: 2.35,
    description: 'Frontline monster who trades defense for overwhelming burst offense',
    baseStats: {
      attack: 175,
      defense: 45,
      health: 950
    },
    abilities: [
      {
        id: 'rage_banner',
        name: 'Rage Banner',
        cooldown: 1400,
        unlockLevel: 1,
        effect: 'Increase all melee unit attack by 45% for 30 minutes'
      },
      {
        id: 'battle_frenzy',
        name: 'Battle Frenzy',
        cooldown: 2100,
        unlockLevel: 3,
        effect: 'Empower your next attack with +60% offense and +20% casualty intake'
      },
      {
        id: 'last_stand',
        name: 'Last Stand',
        cooldown: 3000,
        unlockLevel: 5,
        effect: 'When attacked, counterstrike to destroy up to 9% of enemy assault forces'
      }
    ]
  },
  BARD: {
    id: 'bard',
    name: 'Maestro Elowen Starvoice',
    class: 'Bard',
    goldCost: 1100000,
    upkeepGoldPerSecond: 2.1,
    description: 'Battle musician who amplifies economy, morale, and tactical adaptability',
    baseStats: {
      attack: 85,
      defense: 90,
      health: 780,
      mana: 1000
    },
    abilities: [
      {
        id: 'anthem_of_valor',
        name: 'Anthem of Valor',
        cooldown: 1500,
        unlockLevel: 1,
        effect: 'Increase all unit attack and defense by 20% for 45 minutes'
      },
      {
        id: 'merchant_refrain',
        name: 'Merchant Refrain',
        cooldown: 2100,
        unlockLevel: 3,
        effect: 'Raise gold income by 80% and reduce market fees for 30 minutes'
      },
      {
        id: 'crescendo_of_fate',
        name: 'Crescendo of Fate',
        cooldown: 3300,
        unlockLevel: 5,
        effect: 'Refresh one random hero ability cooldown and grant +15% action speed for 20 minutes'
      }
    ]
  },
  MONK: {
    id: 'monk',
    name: 'Grandmaster Qin Solari',
    class: 'Monk',
    goldCost: 1350000,
    upkeepGoldPerSecond: 2.3,
    description: 'Disciplined mystic who blends resilience, precision strikes, and spiritual focus',
    baseStats: {
      attack: 125,
      defense: 110,
      health: 860,
      mana: 900
    },
    abilities: [
      {
        id: 'iron_mind',
        name: 'Iron Mind',
        cooldown: 1600,
        unlockLevel: 1,
        effect: 'Reduce enemy spell effectiveness against your kingdom by 35% for 1 hour'
      },
      {
        id: 'chi_burst',
        name: 'Chi Burst',
        cooldown: 2200,
        unlockLevel: 3,
        effect: 'Deliver focused impact that destroys 7% of enemy elite units'
      },
      {
        id: 'serenity_cycle',
        name: 'Serenity Cycle',
        cooldown: 3200,
        unlockLevel: 5,
        effect: 'Increase health regeneration and mana regeneration by 200% for 30 minutes'
      }
    ]
  },
  ASSASSIN: {
    id: 'assassin',
    name: 'Vex the Silent Fang',
    class: 'Assassin',
    goldCost: 1450000,
    upkeepGoldPerSecond: 2.45,
    description: 'Deadly infiltrator focused on precision kills and sabotage',
    baseStats: {
      attack: 165,
      defense: 55,
      health: 690
    },
    abilities: [
      {
        id: 'shadowstep_strike',
        name: 'Shadowstep Strike',
        cooldown: 1600,
        unlockLevel: 1,
        effect: 'Eliminate 4% of enemy elite units before battle begins'
      },
      {
        id: 'poisoned_supply',
        name: 'Poisoned Supply',
        cooldown: 2300,
        unlockLevel: 3,
        effect: 'Reduce enemy food and mana production by 35% for 30 minutes'
      },
      {
        id: 'kingmaker_cut',
        name: 'Kingmaker Cut',
        cooldown: 3400,
        unlockLevel: 5,
        effect: 'Your next attack ignores 25% enemy defensive bonuses'
      }
    ]
  },
  SHAMAN: {
    id: 'shaman',
    name: 'Stormspeaker Naru',
    class: 'Shaman',
    goldCost: 1325000,
    upkeepGoldPerSecond: 2.3,
    description: 'Totem mystic who controls weather and empowers tribal armies',
    baseStats: {
      attack: 115,
      defense: 105,
      health: 870,
      mana: 1150
    },
    abilities: [
      {
        id: 'totem_of_fury',
        name: 'Totem of Fury',
        cooldown: 1700,
        unlockLevel: 1,
        effect: 'Increase infantry and beast attack by 35% for 40 minutes'
      },
      {
        id: 'raincaller_ritual',
        name: 'Raincaller Ritual',
        cooldown: 2400,
        unlockLevel: 3,
        effect: 'Boost farm output and population growth by 70% for 30 minutes'
      },
      {
        id: 'tempest_binding',
        name: 'Tempest Binding',
        cooldown: 3600,
        unlockLevel: 5,
        effect: 'Trap enemy forces in storms, reducing outgoing damage by 30% for 25 minutes'
      }
    ]
  },
  KNIGHT: {
    id: 'knight',
    name: 'Sir Aldric Ironcrest',
    class: 'Knight',
    goldCost: 1420000,
    upkeepGoldPerSecond: 2.4,
    description: 'Disciplined commander of heavy cavalry and fortress tactics',
    baseStats: {
      attack: 128,
      defense: 138,
      health: 990
    },
    abilities: [
      {
        id: 'cavalry_charge',
        name: 'Cavalry Charge',
        cooldown: 1800,
        unlockLevel: 1,
        effect: 'Your next assault gains +45% cavalry damage'
      },
      {
        id: 'bulwark_orders',
        name: 'Bulwark Orders',
        cooldown: 2500,
        unlockLevel: 3,
        effect: 'Increase all kingdom defense by 35% for 1 hour'
      },
      {
        id: 'banner_of_honor',
        name: 'Banner of Honor',
        cooldown: 3500,
        unlockLevel: 5,
        effect: 'Grant all units +25% attack and +25% defense for 45 minutes'
      }
    ]
  },
  ALCHEMIST: {
    id: 'alchemist',
    name: 'Professor Embercoil',
    class: 'Alchemist',
    goldCost: 1375000,
    upkeepGoldPerSecond: 2.35,
    description: 'Resource manipulator who converts surplus into tactical advantages',
    baseStats: {
      attack: 98,
      defense: 92,
      health: 800,
      mana: 1300
    },
    abilities: [
      {
        id: 'volatile_concoction',
        name: 'Volatile Concoction',
        cooldown: 1700,
        unlockLevel: 1,
        effect: 'Deal explosive damage destroying 9% enemy siege units'
      },
      {
        id: 'gold_distillation',
        name: 'Gold Distillation',
        cooldown: 2200,
        unlockLevel: 3,
        effect: 'Convert 30% mana into gold at an improved 1:3 ratio'
      },
      {
        id: 'elixir_of_ascendancy',
        name: 'Elixir of Ascendancy',
        cooldown: 3400,
        unlockLevel: 5,
        effect: 'Increase all production by 55% and hero health by 25% for 40 minutes'
      }
    ]
  },
  TEMPLAR: {
    id: 'templar',
    name: 'Inquisitor Solbrand',
    class: 'Templar',
    goldCost: 1480000,
    upkeepGoldPerSecond: 2.45,
    description: 'Zealous anti-magic crusader excelling against spell-heavy kingdoms',
    baseStats: {
      attack: 138,
      defense: 125,
      health: 930,
      mana: 700
    },
    abilities: [
      {
        id: 'purge_hex',
        name: 'Purge Hex',
        cooldown: 1750,
        unlockLevel: 1,
        effect: 'Remove one active hostile debuff from your kingdom and gain brief immunity'
      },
      {
        id: 'sanctified_aura',
        name: 'Sanctified Aura',
        cooldown: 2600,
        unlockLevel: 3,
        effect: 'Reduce enemy spell damage by 40% and boost holy unit defense by 30% for 35 minutes'
      },
      {
        id: 'inquisition_march',
        name: 'Inquisition March',
        cooldown: 3600,
        unlockLevel: 5,
        effect: 'Next attack dispels target stealth effects and deals +30% damage'
      }
    ]
  },
  BEASTMASTER: {
    id: 'beastmaster',
    name: 'Rokhan Wildmane',
    class: 'Beastmaster',
    goldCost: 1360000,
    upkeepGoldPerSecond: 2.3,
    description: 'Commander of warbeasts and rapid-strike hunting packs',
    baseStats: {
      attack: 145,
      defense: 88,
      health: 920
    },
    abilities: [
      {
        id: 'pack_howl',
        name: 'Pack Howl',
        cooldown: 1650,
        unlockLevel: 1,
        effect: 'Increase beast and cavalry attack by 40% for 35 minutes'
      },
      {
        id: 'alpha_pounce',
        name: 'Alpha Pounce',
        cooldown: 2350,
        unlockLevel: 3,
        effect: 'Instantly remove 7% enemy archer and mage units'
      },
      {
        id: 'primal_dominion',
        name: 'Primal Dominion',
        cooldown: 3450,
        unlockLevel: 5,
        effect: 'Reduce incoming retaliation by 30% on your next two attacks'
      }
    ]
  },
  CHRONOMANCER: {
    id: 'chronomancer',
    name: 'Aeon Sage Miravel',
    class: 'Chronomancer',
    goldCost: 1700000,
    upkeepGoldPerSecond: 2.6,
    description: 'Timeweaver who accelerates development and disrupts enemy momentum',
    baseStats: {
      attack: 110,
      defense: 100,
      health: 760,
      mana: 1900
    },
    abilities: [
      {
        id: 'temporal_haste',
        name: 'Temporal Haste',
        cooldown: 1900,
        unlockLevel: 1,
        effect: 'Increase training and construction speed by 80% for 25 minutes'
      },
      {
        id: 'stasis_field',
        name: 'Stasis Field',
        cooldown: 2800,
        unlockLevel: 3,
        effect: 'Slow enemy attack preparation and spell recharge by 35% for 30 minutes'
      },
      {
        id: 'echo_of_victory',
        name: 'Echo of Victory',
        cooldown: 3900,
        unlockLevel: 5,
        effect: 'Repeat 30% of your last successful offensive losses as free reinforcements'
      }
    ]
  },
  WARDEN: {
    id: 'warden',
    name: 'Warden Thalos Stonebark',
    class: 'Warden',
    goldCost: 1400000,
    upkeepGoldPerSecond: 2.4,
    description: 'Unbreakable protector specializing in land control and counterattacks',
    baseStats: {
      attack: 112,
      defense: 150,
      health: 1080
    },
    abilities: [
      {
        id: 'rooted_defiance',
        name: 'Rooted Defiance',
        cooldown: 1800,
        unlockLevel: 1,
        effect: 'Increase defense by 45% while reducing enemy land gains by 25% for 40 minutes'
      },
      {
        id: 'granite_counter',
        name: 'Granite Counter',
        cooldown: 2500,
        unlockLevel: 3,
        effect: 'Reflect 15% of incoming unit losses back to attacker for 30 minutes'
      },
      {
        id: 'citadel_heart',
        name: 'Citadel Heart',
        cooldown: 3600,
        unlockLevel: 5,
        effect: 'Fortify all buildings, granting +60% resilience for 1 hour'
      }
    ]
  },
  NECROKNIGHT: {
    id: 'necroknight',
    name: 'Dread Marshal Vorak',
    class: 'Necroknight',
    goldCost: 1620000,
    upkeepGoldPerSecond: 2.55,
    description: 'Undead cavalry lord combining heavy armor with dark resurrection rites',
    baseStats: {
      attack: 152,
      defense: 118,
      health: 980,
      mana: 900
    },
    abilities: [
      {
        id: 'grave_charge',
        name: 'Grave Charge',
        cooldown: 1850,
        unlockLevel: 1,
        effect: 'Your cavalry attacks with +35% power and revives 10% losses as undead'
      },
      {
        id: 'bone_shield',
        name: 'Bone Shield',
        cooldown: 2550,
        unlockLevel: 3,
        effect: 'Reduce incoming damage by 30% and enemy healing by 40% for 30 minutes'
      },
      {
        id: 'march_of_ruin',
        name: 'March of Ruin',
        cooldown: 3700,
        unlockLevel: 5,
        effect: 'Summon a death march that inflicts 8% unit attrition and 8% population loss'
      }
    ]
  },
  SORCERER: {
    id: 'sorcerer',
    name: 'Celestian the Embermind',
    class: 'Sorcerer',
    goldCost: 1550000,
    upkeepGoldPerSecond: 2.5,
    description: 'Elemental caster with destructive burst spells and mana control',
    baseStats: {
      attack: 160,
      defense: 70,
      health: 700,
      mana: 2100
    },
    abilities: [
      {
        id: 'nova_sphere',
        name: 'Nova Sphere',
        cooldown: 1700,
        unlockLevel: 1,
        effect: 'Blast enemy formations, destroying 10% mage and archer units'
      },
      {
        id: 'mana_lattice',
        name: 'Mana Lattice',
        cooldown: 2400,
        unlockLevel: 3,
        effect: 'Increase your mana regeneration by 150% and cut spell costs by 20% for 30 minutes'
      },
      {
        id: 'skyfire_deluge',
        name: 'Skyfire Deluge',
        cooldown: 3600,
        unlockLevel: 5,
        effect: 'Rain elemental fire causing 12% army losses and 6% building disruption'
      }
    ]
  },
  SENTINEL: {
    id: 'sentinel',
    name: 'Captain Rhea Everwatch',
    class: 'Sentinel',
    goldCost: 1380000,
    upkeepGoldPerSecond: 2.35,
    description: 'Defensive specialist with superior scouting and anti-ambush protocols',
    baseStats: {
      attack: 118,
      defense: 132,
      health: 940
    },
    abilities: [
      {
        id: 'vigilant_lines',
        name: 'Vigilant Lines',
        cooldown: 1650,
        unlockLevel: 1,
        effect: 'Boost defense by 30% and reveal incoming attacks 20% earlier for 45 minutes'
      },
      {
        id: 'counterbattery',
        name: 'Counterbattery',
        cooldown: 2300,
        unlockLevel: 3,
        effect: 'Neutralize 10% of enemy siege engines during their next assault'
      },
      {
        id: 'iron_perimeter',
        name: 'Iron Perimeter',
        cooldown: 3400,
        unlockLevel: 5,
        effect: 'Prevent sabotage and stealth effects against your kingdom for 40 minutes'
      }
    ]
  },
  SPELLBLADE: {
    id: 'spellblade',
    name: 'Kaelis Arcsteel',
    class: 'Spellblade',
    goldCost: 1460000,
    upkeepGoldPerSecond: 2.45,
    description: 'Hybrid duelist balancing martial pressure with arcane burst',
    baseStats: {
      attack: 148,
      defense: 102,
      health: 860,
      mana: 1200
    },
    abilities: [
      {
        id: 'arc_slash',
        name: 'Arc Slash',
        cooldown: 1600,
        unlockLevel: 1,
        effect: 'Cut through enemy ranks, dealing 8% losses to frontline units'
      },
      {
        id: 'runebound_guard',
        name: 'Runebound Guard',
        cooldown: 2350,
        unlockLevel: 3,
        effect: 'Grant +30% attack and +30% defense to elite units for 35 minutes'
      },
      {
        id: 'ether_crescent',
        name: 'Ether Crescent',
        cooldown: 3500,
        unlockLevel: 5,
        effect: 'Empower your next two spells to deal 40% increased impact'
      }
    ]
  },
  ENGINEER: {
    id: 'engineer',
    name: 'Chief Engineer Brasswick',
    class: 'Engineer',
    goldCost: 1340000,
    upkeepGoldPerSecond: 2.3,
    description: 'Siege architect who optimizes infrastructure and mechanical warfare',
    baseStats: {
      attack: 104,
      defense: 108,
      health: 840
    },
    abilities: [
      {
        id: 'rapid_forge',
        name: 'Rapid Forge',
        cooldown: 1700,
        unlockLevel: 1,
        effect: 'Increase building speed by 90% and reduce land build costs for 25 minutes'
      },
      {
        id: 'siege_calibration',
        name: 'Siege Calibration',
        cooldown: 2450,
        unlockLevel: 3,
        effect: 'Boost siege unit attack by 50% and accuracy by 20% for 30 minutes'
      },
      {
        id: 'fortress_protocol',
        name: 'Fortress Protocol',
        cooldown: 3600,
        unlockLevel: 5,
        effect: 'Instantly repair 12% building damage and grant +35% resilience for 1 hour'
      }
    ]
  },
  ORACLE: {
    id: 'oracle',
    name: 'Oracle Nymera',
    class: 'Oracle',
    goldCost: 1520000,
    upkeepGoldPerSecond: 2.5,
    description: 'Seer of fate who predicts enemy actions and amplifies strategic control',
    baseStats: {
      attack: 102,
      defense: 112,
      health: 780,
      mana: 1750
    },
    abilities: [
      {
        id: 'future_sight',
        name: 'Future Sight',
        cooldown: 1750,
        unlockLevel: 1,
        effect: 'Reveal complete target kingdom intel and active buffs for 20 minutes'
      },
      {
        id: 'thread_of_destiny',
        name: 'Thread of Destiny',
        cooldown: 2500,
        unlockLevel: 3,
        effect: 'Increase your critical battle outcomes by 15% for 30 minutes'
      },
      {
        id: 'fated_convergence',
        name: 'Fated Convergence',
        cooldown: 3700,
        unlockLevel: 5,
        effect: 'Reduce all your hero cooldowns by 30% and spell cooldowns by 20% for 25 minutes'
      }
    ]
  },
  REAVER: {
    id: 'reaver',
    name: 'Skarl Doomreaver',
    class: 'Reaver',
    goldCost: 1430000,
    upkeepGoldPerSecond: 2.4,
    description: 'Raider king focused on plunder, pressure, and sustained offensive tempo',
    baseStats: {
      attack: 158,
      defense: 82,
      health: 900
    },
    abilities: [
      {
        id: 'plunder_raid',
        name: 'Plunder Raid',
        cooldown: 1650,
        unlockLevel: 1,
        effect: 'Your next attack steals +20% extra gold and mana'
      },
      {
        id: 'burning_wake',
        name: 'Burning Wake',
        cooldown: 2350,
        unlockLevel: 3,
        effect: 'Leave scorched lands reducing enemy production by 25% for 30 minutes'
      },
      {
        id: 'black_sails',
        name: 'Black Sails',
        cooldown: 3500,
        unlockLevel: 5,
        effect: 'Enable two rapid assaults with 20% reduced prep time'
      }
    ]
  },
  ILLUSIONIST: {
    id: 'illusionist',
    name: 'Mirage Queen Selyth',
    class: 'Illusionist',
    goldCost: 1490000,
    upkeepGoldPerSecond: 2.45,
    description: 'Master deceiver who creates false intel and misdirects enemy attacks',
    baseStats: {
      attack: 108,
      defense: 96,
      health: 760,
      mana: 1700
    },
    abilities: [
      {
        id: 'phantom_host',
        name: 'Phantom Host',
        cooldown: 1700,
        unlockLevel: 1,
        effect: 'Create illusory armies that reduce enemy hit efficiency by 20% for 30 minutes'
      },
      {
        id: 'mirror_hex',
        name: 'Mirror Hex',
        cooldown: 2450,
        unlockLevel: 3,
        effect: 'Reflect one hostile spell back at the caster within 20 minutes'
      },
      {
        id: 'grand_masquerade',
        name: 'Grand Masquerade',
        cooldown: 3600,
        unlockLevel: 5,
        effect: 'Hide true kingdom stats and fake strength values to all scouts for 1 hour'
      }
    ]
  },
  DRAGONKNIGHT: {
    id: 'dragonknight',
    name: 'Valdris Flamewarden',
    class: 'Dragonknight',
    goldCost: 1800000,
    upkeepGoldPerSecond: 2.7,
    description: 'Legendary champion wielding draconic power in war and defense',
    baseStats: {
      attack: 172,
      defense: 142,
      health: 1120,
      mana: 1000
    },
    abilities: [
      {
        id: 'drake_breath',
        name: 'Drake Breath',
        cooldown: 1900,
        unlockLevel: 1,
        effect: 'Scorch enemy lines for 10% unit losses and morale shock'
      },
      {
        id: 'scale_guard',
        name: 'Scale Guard',
        cooldown: 2700,
        unlockLevel: 3,
        effect: 'Grant kingdom-wide +40% damage resistance for 30 minutes'
      },
      {
        id: 'winged_annihilation',
        name: 'Winged Annihilation',
        cooldown: 3900,
        unlockLevel: 5,
        effect: 'Launch an aerial strike that devastates 12% units and 8% buildings'
      }
    ]
  },
  SEER: {
    id: 'seer',
    name: 'Vaela Moonseer',
    class: 'Seer',
    goldCost: 1410000,
    upkeepGoldPerSecond: 2.4,
    description: 'Mystic support hero who amplifies enchantments and nullifies threats',
    baseStats: {
      attack: 96,
      defense: 118,
      health: 820,
      mana: 1650
    },
    abilities: [
      {
        id: 'lunar_ward',
        name: 'Lunar Ward',
        cooldown: 1700,
        unlockLevel: 1,
        effect: 'Grant +35% resistance to hostile spells for 40 minutes'
      },
      {
        id: 'omens_gift',
        name: "Omen's Gift",
        cooldown: 2400,
        unlockLevel: 3,
        effect: 'Increase all resource production and scouting accuracy by 30% for 35 minutes'
      },
      {
        id: 'eclipse_prophecy',
        name: 'Eclipse Prophecy',
        cooldown: 3600,
        unlockLevel: 5,
        effect: 'Suppress enemy active buffs by 20% and enhance your buffs by 20% for 25 minutes'
      }
    ]
  },
  GLADIATOR: {
    id: 'gladiator',
    name: 'Arena King Draven',
    class: 'Gladiator',
    goldCost: 1330000,
    upkeepGoldPerSecond: 2.3,
    description: 'Duelist hero built for decisive battle swings and morale warfare',
    baseStats: {
      attack: 162,
      defense: 78,
      health: 940
    },
    abilities: [
      {
        id: 'crowd_fervor',
        name: 'Crowd Fervor',
        cooldown: 1550,
        unlockLevel: 1,
        effect: 'Increase frontline unit damage by 38% for 30 minutes'
      },
      {
        id: 'duelists_mark',
        name: "Duelist's Mark",
        cooldown: 2250,
        unlockLevel: 3,
        effect: 'Target enemy hero suffers 25% reduced effectiveness for 25 minutes'
      },
      {
        id: 'finishing_blow',
        name: 'Finishing Blow',
        cooldown: 3350,
        unlockLevel: 5,
        effect: 'Execute weakened enemy forces, destroying up to 11% remaining assault units'
      }
    ]
  },
  ELEMENTALIST: {
    id: 'elementalist',
    name: 'Lyra Stormglass',
    class: 'Elementalist',
    goldCost: 1580000,
    upkeepGoldPerSecond: 2.55,
    description: 'Element-channeler controlling fire, frost, and thunder across battlefields',
    baseStats: {
      attack: 166,
      defense: 72,
      health: 720,
      mana: 2200
    },
    abilities: [
      {
        id: 'frostbind',
        name: 'Frostbind',
        cooldown: 1750,
        unlockLevel: 1,
        effect: 'Slow enemy offense and reduce attack speed by 30% for 25 minutes'
      },
      {
        id: 'thunderwake',
        name: 'Thunderwake',
        cooldown: 2500,
        unlockLevel: 3,
        effect: 'Strike enemy army with lightning for 9% unit losses'
      },
      {
        id: 'inferno_convergence',
        name: 'Inferno Convergence',
        cooldown: 3750,
        unlockLevel: 5,
        effect: 'Ignite target kingdom causing 14% force losses and 10% production disruption'
      }
    ]
  }

};

const ITEMS = {
  // Kingdom consumables inspired by classic Archmage-style utility items
  RUNE_OF_PLENTY: {
    id: 'rune_of_plenty',
    name: 'Rune of Plenty',
    type: 'consumable',
    rarity: 'common',
    goldCost: 1200,
    effect: {
      type: 'instant_resource',
      gold: 2500,
      mana: 0,
      duration: 0
    },
    description: 'Instantly grants 2,500 gold to your kingdom treasury'
  },
  MANA_VIAL: {
    id: 'mana_vial',
    name: 'Mana Vial',
    type: 'consumable',
    rarity: 'common',
    goldCost: 1400,
    effect: {
      type: 'instant_resource',
      gold: 0,
      mana: 2000,
      duration: 0
    },
    description: 'Instantly restores 2,000 mana for spellcasting'
  },
  BANNER_OF_RALLYING: {
    id: 'banner_of_rallying',
    name: 'Banner of Rallying',
    type: 'consumable',
    rarity: 'rare',
    goldCost: 4500,
    effect: {
      type: 'buff_offense',
      multiplier: 1.25,
      duration: 1800
    },
    description: 'Increases army attack power by 25% for 30 minutes'
  },
  WARDING_TOTEM: {
    id: 'warding_totem',
    name: 'Warding Totem',
    type: 'consumable',
    rarity: 'rare',
    goldCost: 5000,
    effect: {
      type: 'buff_defense',
      multiplier: 1.25,
      duration: 1800
    },
    description: 'Increases defensive strength by 25% for 30 minutes'
  },
  PHIAL_OF_VIGOR: {
    id: 'phial_of_vigor',
    name: 'Phial of Vigor',
    type: 'consumable',
    rarity: 'rare',
    goldCost: 3800,
    effect: {
      type: 'buff_speed',
      multiplier: 1.35,
      duration: 1200
    },
    description: 'Speeds up training and construction by 35% for 20 minutes'
  },
  CHARM_OF_PROSPERITY: {
    id: 'charm_of_prosperity',
    name: 'Charm of Prosperity',
    type: 'consumable',
    rarity: 'epic',
    goldCost: 7600,
    effect: {
      type: 'buff_resource',
      resource: 'gold',
      multiplier: 1.5,
      duration: 2400
    },
    description: 'Boosts gold production by 50% for 40 minutes'
  },
  ARCANE_FOCUS_CRYSTAL: {
    id: 'arcane_focus_crystal',
    name: 'Arcane Focus Crystal',
    type: 'consumable',
    rarity: 'epic',
    goldCost: 8200,
    effect: {
      type: 'buff_resource',
      resource: 'mana',
      multiplier: 1.75,
      duration: 2400
    },
    description: 'Boosts mana regeneration by 75% for 40 minutes'
  },
  AMULET_OF_CONCEALMENT: {
    id: 'amulet_of_concealment',
    name: 'Amulet of Concealment',
    type: 'consumable',
    rarity: 'epic',
    goldCost: 9500,
    effect: {
      type: 'buff_stealth',
      duration: 1800
    },
    description: 'Protects your kingdom from scouting and intel effects for 30 minutes'
  },
  SIGIL_OF_SANCTUARY: {
    id: 'sigil_of_sanctuary',
    name: 'Sigil of Sanctuary',
    type: 'consumable',
    rarity: 'legendary',
    goldCost: 14000,
    effect: {
      type: 'buff_immunity',
      duration: 600
    },
    description: 'Prevents incoming attacks for 10 minutes'
  },
  EMBERSTORM_RELIC: {
    id: 'emberstorm_relic',
    name: 'Emberstorm Relic',
    type: 'consumable',
    rarity: 'legendary',
    goldCost: 12500,
    effect: {
      type: 'damage_units',
      percentage: 0.08
    },
    description: 'Deals 8% damage to an enemy army when activated'
  }
};

// Game balance constants
const GAME_CONFIG = {
  TICK_RATE: 1000, // 1 second ticks
  BASE_GOLD_INCOME: 10,
  BASE_MANA_INCOME: 5,
  BASE_POPULATION_GROWTH: 1,
  STARTING_GOLD: 5000,
  STARTING_MANA: 1000,
  STARTING_POPULATION: 100,
  STARTING_LAND: 50,
  LAND_EXPANSION_COST: 1000,
  LAND_EXPANSION_TIME: 300, // 5 minutes
  MAX_ACTIVE_BUFFS: 10,
  COMBAT_RESOLUTION_TIME: 60, // 1 minute
  BLACK_MARKET_REFRESH_TIME: 3600 // 1 hour
};

module.exports = {
  RESOURCE_TYPES,
  SPELL_SCHOOLS,
  SPELLS,
  UNIT_TYPES,
  BUILDING_TYPES,
  HEROES,
  ITEMS,
  GAME_CONFIG
};

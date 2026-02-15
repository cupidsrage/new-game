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
    researchSpeedBonus: 0.05,
    description: 'Reduces spell research time by 5% per University owned'
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
  }
};

const ITEMS = {
  // Weapons
  SWORD_OF_FLAMES: {
    id: 'sword_of_flames',
    name: 'Sword of Eternal Flames',
    type: 'weapon',
    rarity: 'legendary',
    goldCost: 10000,
    stats: {
      attack: 200,
      spellPower: 50
    },
    description: 'A legendary blade wreathed in eternal fire'
  },
  STAFF_OF_POWER: {
    id: 'staff_of_power',
    name: 'Staff of Arcane Power',
    type: 'weapon',
    rarity: 'legendary',
    goldCost: 12000,
    stats: {
      spellPower: 300,
      manaRegen: 5
    },
    description: 'Amplifies magical abilities beyond mortal limits'
  },
  DAGGERS_OF_SHADOW: {
    id: 'daggers_of_shadow',
    name: 'Twin Daggers of Shadow',
    type: 'weapon',
    rarity: 'epic',
    goldCost: 8000,
    stats: {
      attack: 150,
      critChance: 0.25
    },
    description: 'Strike from the shadows with deadly precision'
  },

  // Armor
  DRAGON_SCALE_ARMOR: {
    id: 'dragon_scale_armor',
    name: 'Dragon Scale Armor',
    type: 'armor',
    rarity: 'legendary',
    goldCost: 15000,
    stats: {
      defense: 300,
      health: 500
    },
    description: 'Forged from the scales of an ancient dragon'
  },
  ROBE_OF_ARCHMAGE: {
    id: 'robe_of_archmage',
    name: 'Robe of the Archmage',
    type: 'armor',
    rarity: 'legendary',
    goldCost: 10000,
    stats: {
      defense: 100,
      spellPower: 200,
      manaRegen: 10
    },
    description: 'Worn by the greatest mages in history'
  },

  // Accessories
  RING_OF_POWER: {
    id: 'ring_of_power',
    name: 'Ring of Supreme Power',
    type: 'accessory',
    rarity: 'legendary',
    goldCost: 20000,
    stats: {
      attack: 100,
      defense: 100,
      spellPower: 100,
      allResourceBonus: 0.25
    },
    description: 'The ultimate artifact of power'
  },
  AMULET_OF_IMMORTALITY: {
    id: 'amulet_of_immortality',
    name: 'Amulet of Immortality',
    type: 'accessory',
    rarity: 'legendary',
    goldCost: 18000,
    stats: {
      health: 1000,
      healthRegen: 10
    },
    description: 'Grants near-immortality to its wearer'
  },
  CROWN_OF_KINGS: {
    id: 'crown_of_kings',
    name: 'Crown of Kings',
    type: 'accessory',
    rarity: 'epic',
    goldCost: 15000,
    stats: {
      populationBonus: 0.50,
      goldBonus: 0.30,
      leadership: 100
    },
    description: 'Symbol of ultimate authority and prosperity'
  },
  BOOTS_OF_SPEED: {
    id: 'boots_of_speed',
    name: 'Boots of Hermes',
    type: 'accessory',
    rarity: 'epic',
    goldCost: 8000,
    stats: {
      actionSpeed: 0.50,
      evasion: 0.20
    },
    description: 'Move and act with supernatural speed'
  },

  // Consumables
  HEALTH_POTION: {
    id: 'health_potion',
    name: 'Greater Health Potion',
    type: 'consumable',
    rarity: 'common',
    goldCost: 500,
    effect: {
      type: 'heal',
      amount: 500
    },
    description: 'Instantly restore 500 health'
  },
  MANA_POTION: {
    id: 'mana_potion',
    name: 'Greater Mana Potion',
    type: 'consumable',
    rarity: 'common',
    goldCost: 500,
    effect: {
      type: 'restore_mana',
      amount: 1000
    },
    description: 'Instantly restore 1000 mana'
  },
  EXPERIENCE_SCROLL: {
    id: 'experience_scroll',
    name: 'Scroll of Experience',
    type: 'consumable',
    rarity: 'rare',
    goldCost: 2000,
    effect: {
      type: 'grant_exp',
      amount: 5000
    },
    description: 'Grant 5000 experience to your hero'
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

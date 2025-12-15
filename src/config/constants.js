/**
 * Game Constants and Configuration
 * Central place for all game-related constants and settings
 */

// ===========================================
// CARD CONSTANTS
// ===========================================

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const SUIT_ICONS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const SUIT_COLORS = {
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black',
};

// Monster graphics for royal cards
export const MONSTER_GRAPHICS = {
  A: '🐉', // Dragon
  K: '👹', // Cave Troll
  Q: '👻', // Banshee
  J: '🐺', // Dire Wolf
};

// ===========================================
// GAME SETTINGS
// ===========================================

export const DEFAULT_GAME_SETTINGS = {
  maxHealth: 20,
  weaponDegradation: 'strict', // 'strict' | 'equal' | 'none'
  maxRuns: 1,
  healingMode: 'once', // 'once' | 'unlimited'
  includeDiamondRoyals: false,
  includeHeartRoyals: false,
  removeAceMonsters: false,
};

export const DIFFICULTY_PRESETS = {
  brutal: {
    maxHealth: 20,
    weaponDegradation: 'strict',
    maxRuns: 1,
    healingMode: 'once',
    includeDiamondRoyals: false,
    includeHeartRoyals: false,
    removeAceMonsters: false,
  },
  hard: {
    maxHealth: 25,
    weaponDegradation: 'strict',
    maxRuns: 2,
    healingMode: 'once',
    includeDiamondRoyals: false,
    includeHeartRoyals: false,
    removeAceMonsters: false,
  },
  normal: {
    maxHealth: 25,
    weaponDegradation: 'equal',
    maxRuns: 2,
    healingMode: 'once',
    includeDiamondRoyals: false,
    includeHeartRoyals: false,
    removeAceMonsters: true,
  },
  easy: {
    maxHealth: 30,
    weaponDegradation: 'equal',
    maxRuns: 3,
    healingMode: 'unlimited',
    includeDiamondRoyals: true,
    includeHeartRoyals: false,
    removeAceMonsters: true,
  },
  casual: {
    maxHealth: 35,
    weaponDegradation: 'none',
    maxRuns: 999,
    healingMode: 'unlimited',
    includeDiamondRoyals: true,
    includeHeartRoyals: true,
    removeAceMonsters: true,
  },
};

// ===========================================
// STORAGE KEYS
// ===========================================

export const STORAGE_KEYS = {
  GAME_STATE: 'dungeonCrawlerGameState',
  CARD_THEME: 'dungeonCrawlerCardTheme',
  GAME_THEME: 'dungeonCrawlerGameTheme',
  CURRENT_PLAYER: 'dungeonCrawlerCurrentPlayer',
  MENU_MINIMIZED: 'menuMinimized',
};

// ===========================================
// SUPABASE CONFIGURATION
// ===========================================

export const SUPABASE_CONFIG = {
  url: 'https://meleczsuyvvmjscajtng.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lbGVjenN1eXZ2bWpzY2FqdG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTkyMzMsImV4cCI6MjA4MTM5NTIzM30.ZBauOeC77BFIKmixV2aoKJLSj6GVvwFZ1o0MQf_H4WU',
};

export const MAX_LEADERBOARD_SIZE = 100;

// ===========================================
// NAME GENERATOR DATA
// ===========================================

export const NAME_ADJECTIVES = [
  'Swift', 'Brave', 'Clever', 'Dark', 'Epic', 'Fierce', 'Ghostly', 'Hidden',
  'Iron', 'Jade', 'Keen', 'Lucky', 'Mystic', 'Noble', 'Proud', 'Quick',
  'Rogue', 'Shadow', 'Thunder', 'Valor', 'Wild', 'Zealous', 'Ancient', 'Bold',
  'Crimson', 'Daring', 'Elder', 'Frosty', 'Golden', 'Humble', 'Ivory', 'Jolly',
];

export const NAME_NOUNS = [
  'Knight', 'Mage', 'Rogue', 'Hunter', 'Warrior', 'Wizard', 'Archer', 'Druid',
  'Paladin', 'Ranger', 'Monk', 'Bard', 'Cleric', 'Thief', 'Hero', 'Legend',
  'Phoenix', 'Dragon', 'Wolf', 'Bear', 'Hawk', 'Serpent', 'Tiger', 'Lion',
  'Slayer', 'Seeker', 'Walker', 'Runner', 'Blade', 'Shield', 'Storm', 'Flame',
];

// ===========================================
// UI CONSTANTS
// ===========================================

export const MAX_HISTORY = 10; // Maximum undo history size
export const FLOOR_SIZE = 4; // Number of cards on a floor

// Animation durations (ms)
export const ANIMATION_DURATIONS = {
  cardDraw: 800,
  cardReveal: 200,
  cardDealStagger: 200,
  damageFloat: 1000,
  fightPop: 600,
  runAwayPopup: 1500,
};

// ===========================================
// THEME LISTS
// ===========================================

export const CARD_THEMES = ['classic', 'dragon', 'mystic', 'nature', 'royal', 'skull'];

export const GAME_THEMES = [
  'dungeon',
  'dragon-lair',
  'enchanted-forest',
  'frozen-throne',
  'shadow-realm',
  'celestial',
  'volcanic',
  'ancient-ruins',
];


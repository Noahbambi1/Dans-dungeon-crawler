/**
 * Dan's Dungeon Crawler - Gambling Module
 * 
 * This module implements regulated gambling mechanics with:
 * - Configurable RTP (Return to Player)
 * - Server-side outcome determination
 * - Certified RNG simulation
 * - Audit logging
 * - PAR sheet calculations
 * 
 * IMPORTANT: For real gambling, this needs:
 * 1. Server-side implementation (Node.js/Python/etc)
 * 2. Certified RNG from accredited provider
 * 3. Third-party audit and certification
 * 4. Proper licensing in your jurisdiction
 */

// ============================================
// CONFIGURATION
// ============================================

const GAMBLING_CONFIG = {
  // Target RTP (Return to Player) - regulatory requirement
  targetRTP: 0.96, // 96%
  
  // House edge = 1 - RTP
  houseEdge: 0.04, // 4%
  
  // Bet limits
  minBet: 0.10,
  maxBet: 1000.00,
  
  // Currency
  currency: 'USD',
  
  // Game modes with their configurations
  modes: {
    // High volatility - rare big wins
    highRoller: {
      name: 'High Roller',
      winRate: 0.0025, // 0.25%
      payoutMultiplier: 384, // 96% / 0.25% = 384x
      volatility: 'extreme',
      minBet: 10.00,
    },
    
    // Medium-high volatility
    standard: {
      name: 'Standard',
      winRate: 0.05, // 5%
      payoutMultiplier: 19.2, // 96% / 5% = 19.2x
      volatility: 'high',
      minBet: 1.00,
    },
    
    // Medium volatility
    casual: {
      name: 'Casual',
      winRate: 0.10, // 10%
      payoutMultiplier: 9.6, // 96% / 10% = 9.6x
      volatility: 'medium-high',
      minBet: 0.50,
    },
    
    // Low-medium volatility
    frequent: {
      name: 'Frequent Wins',
      winRate: 0.25, // 25%
      payoutMultiplier: 3.84, // 96% / 25% = 3.84x
      volatility: 'medium',
      minBet: 0.25,
    },
    
    // Low volatility - frequent small wins
    balanced: {
      name: 'Balanced',
      winRate: 0.50, // 50%
      payoutMultiplier: 1.92, // 96% / 50% = 1.92x
      volatility: 'low',
      minBet: 0.10,
    },
  },
};

// Game settings that achieve different win rates
const WIN_RATE_PRESETS = {
  0.0025: { // ~0.25% - brutal original
    maxHealth: 20,
    weaponDegradation: 'strict',
    maxRuns: 1,
    healingMode: 'once',
    includeDiamondRoyals: false,
    includeHeartRoyals: false,
    removeAceMonsters: false,
  },
  0.05: { // ~5% - easier
    maxHealth: 30,
    weaponDegradation: 'equal',
    maxRuns: 3,
    healingMode: 'unlimited',
    includeDiamondRoyals: true,
    includeHeartRoyals: false,
    removeAceMonsters: true,
  },
  0.10: { // ~10% - casual
    maxHealth: 35,
    weaponDegradation: 'equal',
    maxRuns: 5,
    healingMode: 'unlimited',
    includeDiamondRoyals: true,
    includeHeartRoyals: true,
    removeAceMonsters: true,
  },
  0.25: { // ~25% - frequent
    maxHealth: 40,
    weaponDegradation: 'none',
    maxRuns: 10,
    healingMode: 'unlimited',
    includeDiamondRoyals: true,
    includeHeartRoyals: true,
    removeAceMonsters: true,
    bonusHealing: 20, // Extra starting heal
  },
  0.50: { // ~50% - balanced
    maxHealth: 50,
    weaponDegradation: 'none',
    maxRuns: 999,
    healingMode: 'unlimited',
    includeDiamondRoyals: true,
    includeHeartRoyals: true,
    removeAceMonsters: true,
    bonusHealing: 30,
    startingWeapon: 10, // Start with 10-value weapon
  },
};

// ============================================
// CERTIFIED RNG (Simulation)
// ============================================

/**
 * CertifiedRNG - Wrapper for cryptographic random number generation
 * 
 * For actual certification, this would need to:
 * 1. Use hardware entropy source (HRNG)
 * 2. Pass NIST SP 800-22 statistical tests
 * 3. Be audited by GLI/BMM/eCOGRA
 * 4. Run server-side only
 */
class CertifiedRNG {
  constructor() {
    this.callCount = 0;
    this.lastSeed = null;
  }
  
  /**
   * Generate cryptographically secure random bytes
   * Browser: crypto.getRandomValues
   * Node.js: crypto.randomBytes
   */
  getRandomBytes(length) {
    this.callCount++;
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      // Browser environment
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      return array;
    } else if (typeof require !== 'undefined') {
      // Node.js environment
      const cryptoNode = require('crypto');
      return cryptoNode.randomBytes(length);
    }
    
    throw new Error('No cryptographic RNG available');
  }
  
  /**
   * Generate random float between 0 and 1
   */
  random() {
    const bytes = this.getRandomBytes(4);
    const value = (bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3]) >>> 0;
    return value / 0xFFFFFFFF;
  }
  
  /**
   * Generate random integer in range [min, max]
   */
  randomInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
  
  /**
   * Shuffle array using Fisher-Yates with certified random
   */
  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  
  /**
   * Generate seed for provably fair gaming
   * Returns: { serverSeed, serverSeedHash, nonce }
   */
  generateProvablyFairSeed() {
    const serverSeed = this.bytesToHex(this.getRandomBytes(32));
    const serverSeedHash = this.sha256(serverSeed);
    const nonce = this.callCount;
    
    return {
      serverSeed,        // Revealed after bet
      serverSeedHash,    // Shown before bet
      nonce,
    };
  }
  
  /**
   * Determine outcome using combined seeds (provably fair)
   */
  determineOutcome(serverSeed, clientSeed, nonce) {
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = this.sha256(combined);
    // Use first 8 hex chars as outcome value
    const value = parseInt(hash.substring(0, 8), 16);
    return value / 0xFFFFFFFF;
  }
  
  // Helper: bytes to hex string
  bytesToHex(bytes) {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  // Helper: Simple hash (in production, use proper SHA-256)
  sha256(input) {
    // Placeholder - in production use SubtleCrypto or Node crypto
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

// ============================================
// AUDIT LOGGER
// ============================================

/**
 * AuditLogger - Compliance logging for regulatory requirements
 * 
 * In production, this would:
 * 1. Write to append-only database
 * 2. Include cryptographic signatures
 * 3. Support regulatory reporting
 * 4. Enable game replay/verification
 */
class AuditLogger {
  constructor() {
    this.logs = [];
    this.sessionId = this.generateSessionId();
  }
  
  generateSessionId() {
    return 'sess_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
  
  generateRoundId() {
    return 'round_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
  
  /**
   * Log a complete game round
   */
  logGameRound(data) {
    const record = {
      roundId: this.generateRoundId(),
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      
      // Player info
      playerId: data.playerId,
      
      // Bet details
      betAmount: data.betAmount,
      currency: data.currency,
      gameMode: data.gameMode,
      
      // RNG data
      rngSeed: data.rngSeed,
      deckOrder: data.deckOrder,
      
      // Outcome
      outcome: data.outcome,
      floorsCompleted: data.floorsCompleted,
      finalHealth: data.finalHealth,
      
      // Payout
      payoutMultiplier: data.payoutMultiplier,
      payoutAmount: data.payoutAmount,
      
      // Provably fair (optional)
      serverSeedHash: data.serverSeedHash,
      clientSeed: data.clientSeed,
      
      // Signature (placeholder)
      signature: this.sign(data),
    };
    
    this.logs.push(record);
    
    // In production: send to secure audit database
    console.log('[AUDIT]', JSON.stringify(record, null, 2));
    
    return record;
  }
  
  /**
   * Sign record for integrity verification
   */
  sign(data) {
    // Placeholder - in production use proper HMAC or digital signature
    const payload = JSON.stringify(data);
    return 'sig_' + this.simpleHash(payload);
  }
  
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
  
  /**
   * Generate compliance report
   */
  generateReport(startDate, endDate) {
    const filtered = this.logs.filter(log => {
      const ts = new Date(log.timestamp);
      return ts >= startDate && ts <= endDate;
    });
    
    const totalBets = filtered.length;
    const totalWagered = filtered.reduce((sum, log) => sum + log.betAmount, 0);
    const totalPaid = filtered.reduce((sum, log) => sum + log.payoutAmount, 0);
    const wins = filtered.filter(log => log.outcome === 'win').length;
    
    return {
      period: { start: startDate, end: endDate },
      totalRounds: totalBets,
      totalWagered: totalWagered.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      actualRTP: totalBets > 0 ? (totalPaid / totalWagered * 100).toFixed(2) + '%' : 'N/A',
      winCount: wins,
      hitFrequency: totalBets > 0 ? (wins / totalBets * 100).toFixed(2) + '%' : 'N/A',
    };
  }
  
  /**
   * Export logs for regulatory submission
   */
  exportLogs(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else if (format === 'csv') {
      const headers = Object.keys(this.logs[0] || {}).join(',');
      const rows = this.logs.map(log => Object.values(log).join(','));
      return [headers, ...rows].join('\n');
    }
    return this.logs;
  }
}

// ============================================
// GAME ENGINE
// ============================================

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function rankValue(rank) {
  if (['J', 'Q', 'K'].includes(rank)) return { J: 11, Q: 12, K: 13 }[rank];
  if (rank === 'A') return 14;
  return Number(rank);
}

function buildDeck(settings = {}) {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const color = suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
      const value = rankValue(rank);
      const isRoyal = ['J', 'Q', 'K'].includes(rank);
      const isAce = rank === 'A';
      
      // Red aces always excluded
      if (color === 'red' && isAce) continue;
      
      // Diamond royals
      if (suit === 'diamonds' && isRoyal && !settings.includeDiamondRoyals) continue;
      
      // Heart royals
      if (suit === 'hearts' && isRoyal && !settings.includeHeartRoyals) continue;
      
      // Ace monsters
      if ((suit === 'clubs' || suit === 'spades') && isAce && settings.removeAceMonsters) continue;
      
      cards.push({ suit, rank, value, color });
    }
  }
  return cards;
}

function isMonster(card) {
  return card.suit === 'clubs' || card.suit === 'spades';
}

function isHeart(card) {
  return card.suit === 'hearts';
}

function isDiamond(card) {
  return card.suit === 'diamonds';
}

/**
 * Simulate a complete game with optimal play
 * Returns: { won, floorsCompleted, finalHealth, moves }
 */
function simulateGameWithSettings(deck, settings) {
  const state = {
    deck: [...deck],
    floor: [],
    weapon: null,
    weaponMaxNext: Infinity,
    health: settings.maxHealth || 20,
    runsRemaining: settings.maxRuns || 1,
    healUsed: false,
    floorNumber: 0,
  };
  
  // Apply bonus starting conditions
  if (settings.bonusHealing) {
    state.health += settings.bonusHealing;
  }
  if (settings.startingWeapon) {
    state.weapon = { value: settings.startingWeapon };
  }
  
  // Deal initial floor
  state.floor = state.deck.splice(0, 4);
  state.floorNumber = 1;
  
  let moves = 0;
  const maxMoves = 300;
  const moveHistory = [];
  
  while (moves++ < maxMoves) {
    if (state.health <= 0) {
      return { 
        won: false, 
        floorsCompleted: state.floorNumber - 1,
        finalHealth: 0,
        moves: moveHistory,
      };
    }
    
    if (state.deck.length === 0 && state.floor.length === 0) {
      return { 
        won: true, 
        floorsCompleted: state.floorNumber,
        finalHealth: state.health,
        moves: moveHistory,
      };
    }
    
    const action = findBestAction(state, settings);
    
    if (!action) {
      // Try to run away
      if (state.runsRemaining > 0 && state.floor.length > 0) {
        state.deck.push(...state.floor);
        state.floor = [];
        state.runsRemaining--;
        moveHistory.push({ type: 'run', floor: state.floorNumber });
        
        // Draw new floor
        state.floor = state.deck.splice(0, Math.min(4, state.deck.length));
        state.floorNumber++;
        state.healUsed = false;
        continue;
      }
      
      // Stuck - no valid moves
      return {
        won: false,
        floorsCompleted: state.floorNumber - 1,
        finalHealth: state.health,
        moves: moveHistory,
      };
    }
    
    // Execute action
    executeAction(state, action, settings);
    moveHistory.push(action);
    
    // Refill floor if needed
    if (state.floor.length <= 1 && state.deck.length > 0) {
      const needed = Math.min(3, state.deck.length);
      state.floor.push(...state.deck.splice(0, needed));
      state.floorNumber++;
      state.healUsed = false;
    }
  }
  
  return {
    won: false,
    floorsCompleted: state.floorNumber,
    finalHealth: state.health,
    moves: moveHistory,
  };
}

function findBestAction(state, settings) {
  const actions = [];
  
  for (let i = 0; i < state.floor.length; i++) {
    const card = state.floor[i];
    
    if (isHeart(card)) {
      const canHeal = settings.healingMode === 'unlimited' || !state.healUsed;
      if (canHeal || state.health < settings.maxHealth * 0.3) {
        actions.push({ type: 'heal', index: i, card, priority: calculateHealPriority(state, card, settings) });
      }
    } else if (isDiamond(card)) {
      actions.push({ type: 'equip', index: i, card, priority: calculateEquipPriority(state, card) });
    } else if (isMonster(card)) {
      if (state.weapon && canFightMonster(state, card, settings)) {
        actions.push({ type: 'fight', index: i, card, priority: calculateFightPriority(state, card, settings) });
      }
      if (card.value < state.health) {
        actions.push({ type: 'tank', index: i, card, priority: calculateTankPriority(state, card) });
      }
    }
  }
  
  if (actions.length === 0) return null;
  
  // Sort by priority and return best
  actions.sort((a, b) => b.priority - a.priority);
  return actions[0];
}

function canFightMonster(state, monster, settings) {
  if (settings.weaponDegradation === 'none') return true;
  if (settings.weaponDegradation === 'equal') return monster.value <= state.weaponMaxNext;
  return monster.value < state.weaponMaxNext; // strict
}

function calculateHealPriority(state, card, settings) {
  const actualHeal = Math.min(card.value, settings.maxHealth - state.health);
  const healthPercent = state.health / settings.maxHealth;
  
  if (healthPercent < 0.2) return 1000 + actualHeal;
  if (healthPercent < 0.4) return 500 + actualHeal;
  return actualHeal;
}

function calculateEquipPriority(state, card) {
  if (!state.weapon) return 800 + card.value;
  const currentEffective = Math.min(state.weapon.value, state.weaponMaxNext);
  if (card.value > currentEffective) return 600 + (card.value - currentEffective) * 10;
  return -100; // Don't downgrade
}

function calculateFightPriority(state, card, settings) {
  const damage = Math.max(0, card.value - state.weapon.value);
  if (damage >= state.health) return -1000;
  
  const saved = card.value - damage;
  return 300 + saved * 5 + card.value;
}

function calculateTankPriority(state, card) {
  if (card.value >= state.health) return -1000;
  if (card.value <= 2) return 100;
  if (card.value <= 4) return 50;
  return -card.value * 20;
}

function executeAction(state, action, settings) {
  const card = state.floor.splice(action.index, 1)[0];
  
  switch (action.type) {
    case 'heal':
      if (settings.healingMode === 'unlimited' || !state.healUsed) {
        state.health = Math.min(settings.maxHealth, state.health + card.value);
      }
      state.healUsed = true;
      break;
      
    case 'equip':
      state.weapon = card;
      state.weaponMaxNext = Infinity;
      break;
      
    case 'fight':
      const damage = Math.max(0, card.value - state.weapon.value);
      state.health -= damage;
      if (settings.weaponDegradation === 'strict') {
        state.weaponMaxNext = Math.min(state.weaponMaxNext, card.value - 1);
      } else if (settings.weaponDegradation === 'equal') {
        state.weaponMaxNext = Math.min(state.weaponMaxNext, card.value);
      }
      break;
      
    case 'tank':
      state.health -= card.value;
      break;
  }
}

// ============================================
// GAMBLING ENGINE
// ============================================

class GamblingEngine {
  constructor(config = GAMBLING_CONFIG) {
    this.config = config;
    this.rng = new CertifiedRNG();
    this.auditLogger = new AuditLogger();
    this.playerBalances = new Map(); // In production: database
  }
  
  /**
   * Initialize player account
   */
  createPlayer(playerId, initialBalance = 0) {
    this.playerBalances.set(playerId, {
      balance: initialBalance,
      currency: this.config.currency,
      totalWagered: 0,
      totalWon: 0,
      gamesPlayed: 0,
    });
    return this.getPlayerInfo(playerId);
  }
  
  /**
   * Get player balance and stats
   */
  getPlayerInfo(playerId) {
    const player = this.playerBalances.get(playerId);
    if (!player) return null;
    return { ...player, playerId };
  }
  
  /**
   * Deposit funds
   */
  deposit(playerId, amount) {
    const player = this.playerBalances.get(playerId);
    if (!player) throw new Error('Player not found');
    player.balance += amount;
    return this.getPlayerInfo(playerId);
  }
  
  /**
   * Place a bet and play a game round
   */
  async playRound(playerId, betAmount, gameMode = 'standard') {
    // Validate player
    const player = this.playerBalances.get(playerId);
    if (!player) throw new Error('Player not found');
    
    // Validate game mode
    const mode = this.config.modes[gameMode];
    if (!mode) throw new Error('Invalid game mode');
    
    // Validate bet
    if (betAmount < (mode.minBet || this.config.minBet)) {
      throw new Error(`Minimum bet is ${mode.minBet || this.config.minBet}`);
    }
    if (betAmount > this.config.maxBet) {
      throw new Error(`Maximum bet is ${this.config.maxBet}`);
    }
    if (betAmount > player.balance) {
      throw new Error('Insufficient balance');
    }
    
    // Deduct bet
    player.balance -= betAmount;
    player.totalWagered += betAmount;
    player.gamesPlayed++;
    
    // Generate provably fair seeds
    const seeds = this.rng.generateProvablyFairSeed();
    
    // Get game settings for this win rate
    const settings = this.getSettingsForWinRate(mode.winRate);
    
    // Build and shuffle deck
    const deck = buildDeck(settings);
    const shuffledDeck = this.rng.shuffle(deck);
    
    // Simulate game with optimal play
    const result = simulateGameWithSettings(shuffledDeck, settings);
    
    // Calculate payout
    const payoutMultiplier = result.won ? mode.payoutMultiplier : 0;
    const payoutAmount = betAmount * payoutMultiplier;
    
    // Credit winnings
    if (payoutAmount > 0) {
      player.balance += payoutAmount;
      player.totalWon += payoutAmount;
    }
    
    // Audit log
    const auditRecord = this.auditLogger.logGameRound({
      playerId,
      betAmount,
      currency: this.config.currency,
      gameMode,
      rngSeed: seeds.serverSeedHash, // Only hash shown initially
      deckOrder: shuffledDeck.map(c => `${c.rank}${c.suit[0]}`).join(','),
      outcome: result.won ? 'win' : 'lose',
      floorsCompleted: result.floorsCompleted,
      finalHealth: result.finalHealth,
      payoutMultiplier,
      payoutAmount,
      serverSeedHash: seeds.serverSeedHash,
    });
    
    return {
      roundId: auditRecord.roundId,
      outcome: result.won ? 'WIN' : 'LOSE',
      floorsCompleted: result.floorsCompleted,
      finalHealth: result.finalHealth,
      betAmount,
      payoutMultiplier,
      payoutAmount,
      newBalance: player.balance,
      gameMode: mode.name,
      
      // For provably fair verification
      serverSeedHash: seeds.serverSeedHash,
      serverSeed: seeds.serverSeed, // Revealed after bet
    };
  }
  
  /**
   * Get settings that approximately achieve target win rate
   */
  getSettingsForWinRate(targetRate) {
    // Find closest preset
    const rates = Object.keys(WIN_RATE_PRESETS).map(Number);
    const closest = rates.reduce((prev, curr) => 
      Math.abs(curr - targetRate) < Math.abs(prev - targetRate) ? curr : prev
    );
    return WIN_RATE_PRESETS[closest];
  }
  
  /**
   * Get PAR sheet for a game mode
   */
  getPARSheet(gameMode) {
    const mode = this.config.modes[gameMode];
    if (!mode) return null;
    
    return {
      gameName: "Dan's Dungeon Crawler",
      mode: mode.name,
      theoreticalRTP: (mode.winRate * mode.payoutMultiplier * 100).toFixed(2) + '%',
      houseEdge: ((1 - mode.winRate * mode.payoutMultiplier) * 100).toFixed(2) + '%',
      hitFrequency: (mode.winRate * 100).toFixed(2) + '%',
      volatility: mode.volatility,
      payTable: [
        { outcome: 'Win (Full Clear)', probability: mode.winRate, pays: mode.payoutMultiplier + 'x', contribution: mode.winRate * mode.payoutMultiplier },
        { outcome: 'Lose', probability: 1 - mode.winRate, pays: '0x', contribution: 0 },
      ],
      minBet: mode.minBet || this.config.minBet,
      maxBet: this.config.maxBet,
    };
  }
  
  /**
   * Generate compliance report
   */
  getComplianceReport(startDate, endDate) {
    return this.auditLogger.generateReport(startDate, endDate);
  }
  
  /**
   * Run Monte Carlo simulation to verify RTP
   */
  verifyRTP(gameMode, numSimulations = 10000) {
    const mode = this.config.modes[gameMode];
    const settings = this.getSettingsForWinRate(mode.winRate);
    
    let wins = 0;
    let totalPayout = 0;
    const betAmount = 1; // Normalize to 1 unit
    
    console.log(`\nVerifying RTP for ${mode.name} mode (${numSimulations} simulations)...`);
    
    for (let i = 0; i < numSimulations; i++) {
      const deck = buildDeck(settings);
      const shuffled = this.rng.shuffle(deck);
      const result = simulateGameWithSettings(shuffled, settings);
      
      if (result.won) {
        wins++;
        totalPayout += betAmount * mode.payoutMultiplier;
      }
      
      if ((i + 1) % (numSimulations / 10) === 0) {
        const progress = ((i + 1) / numSimulations * 100).toFixed(0);
        console.log(`  ${progress}% - Current win rate: ${(wins / (i + 1) * 100).toFixed(2)}%`);
      }
    }
    
    const actualWinRate = wins / numSimulations;
    const actualRTP = totalPayout / (numSimulations * betAmount);
    
    return {
      mode: mode.name,
      simulations: numSimulations,
      wins,
      actualWinRate: (actualWinRate * 100).toFixed(3) + '%',
      targetWinRate: (mode.winRate * 100).toFixed(3) + '%',
      actualRTP: (actualRTP * 100).toFixed(3) + '%',
      targetRTP: (mode.winRate * mode.payoutMultiplier * 100).toFixed(3) + '%',
      variance: Math.abs(actualRTP - mode.winRate * mode.payoutMultiplier),
    };
  }
}

// ============================================
// EXPORTS & DEMO
// ============================================

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GamblingEngine,
    CertifiedRNG,
    AuditLogger,
    GAMBLING_CONFIG,
    WIN_RATE_PRESETS,
  };
}

// Demo function
function runDemo() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   DAN'S DUNGEON CRAWLER - GAMBLING MODULE DEMO               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  
  const engine = new GamblingEngine();
  
  // Create test player
  const playerId = 'player_demo_001';
  engine.createPlayer(playerId, 1000);
  
  console.log('\n📊 AVAILABLE GAME MODES:\n');
  Object.keys(GAMBLING_CONFIG.modes).forEach(mode => {
    const par = engine.getPARSheet(mode);
    console.log(`  ${par.mode}:`);
    console.log(`    Win Rate: ${par.hitFrequency}`);
    console.log(`    Payout: ${par.payTable[0].pays}`);
    console.log(`    RTP: ${par.theoreticalRTP}`);
    console.log(`    Volatility: ${par.volatility}`);
    console.log('');
  });
  
  console.log('\n🎮 PLAYING DEMO ROUNDS:\n');
  
  // Play some rounds
  const modes = ['balanced', 'frequent', 'casual', 'standard'];
  
  modes.forEach(mode => {
    console.log(`\n--- Playing ${mode} mode ---`);
    
    for (let i = 0; i < 3; i++) {
      try {
        const result = engine.playRound(playerId, 10, mode);
        console.log(`  Round ${i + 1}: ${result.outcome} - Floors: ${result.floorsCompleted}, Payout: $${result.payoutAmount.toFixed(2)}, Balance: $${result.newBalance.toFixed(2)}`);
      } catch (e) {
        console.log(`  Error: ${e.message}`);
      }
    }
  });
  
  // Show player stats
  const player = engine.getPlayerInfo(playerId);
  console.log('\n📈 PLAYER STATISTICS:');
  console.log(`  Games Played: ${player.gamesPlayed}`);
  console.log(`  Total Wagered: $${player.totalWagered.toFixed(2)}`);
  console.log(`  Total Won: $${player.totalWon.toFixed(2)}`);
  console.log(`  Current Balance: $${player.balance.toFixed(2)}`);
  console.log(`  Player RTP: ${player.totalWagered > 0 ? (player.totalWon / player.totalWagered * 100).toFixed(2) : 0}%`);
  
  // Verify RTP with simulation (smaller sample for demo)
  console.log('\n🔬 RTP VERIFICATION (1000 games each):');
  ['balanced', 'frequent'].forEach(mode => {
    const verification = engine.verifyRTP(mode, 1000);
    console.log(`\n  ${verification.mode}:`);
    console.log(`    Target RTP: ${verification.targetRTP}`);
    console.log(`    Actual RTP: ${verification.actualRTP}`);
    console.log(`    Target Win Rate: ${verification.targetWinRate}`);
    console.log(`    Actual Win Rate: ${verification.actualWinRate}`);
  });
  
  console.log('\n✅ Demo complete!\n');
}

// Run demo if executed directly
if (typeof window === 'undefined' && typeof require !== 'undefined' && require.main === module) {
  runDemo();
}

// Browser global
if (typeof window !== 'undefined') {
  window.GamblingEngine = GamblingEngine;
  window.runGamblingDemo = runDemo;
}


/**
 * Game Service
 * Core game logic and mechanics
 */

import { GameState } from '../models/GameState.js';
import { Deck } from '../models/Deck.js';
import { DEFAULT_GAME_SETTINGS, DIFFICULTY_PRESETS, MAX_HISTORY } from '../config/constants.js';
import { storageService } from './StorageService.js';

class GameService {
  constructor() {
    this.state = new GameState();
    this.settings = { ...DEFAULT_GAME_SETTINGS };
    this.stateHistory = [];
    this.onStateChange = null; // Callback for state changes
    this.onStatusMessage = null; // Callback for status messages
  }

  /**
   * Initialize a new game
   */
  initGame() {
    const deck = new Deck().build(this.settings).shuffle();

    this.state.reset();
    this.state.originalDeck = deck.cards.map(c => ({ ...c }));
    this.state.deck = deck.cards.map(c => ({ ...c }));
    this.state.initialDeckOrder = deck.cards.map(c => ({ ...c }));
    this.state.health = this.settings.maxHealth;
    this.state.runsRemaining = this.settings.maxRuns;
    this.stateHistory = [];

    this.notifyStatusChange('Click the deck to deal your first floor!');
    this.notifyStateChange();
    this.saveState();
  }

  /**
   * Restart with the same deck
   */
  restartGame() {
    if (this.state.initialDeckOrder.length > 0) {
      this.state.deck = this.state.initialDeckOrder.map(c => ({ ...c }));
    } else {
      const deck = new Deck().build(this.settings).shuffle();
      this.state.deck = deck.cards.map(c => ({ ...c }));
      this.state.initialDeckOrder = deck.cards.map(c => ({ ...c }));
    }

    this.state.discard = [];
    this.state.floor = [null, null, null, null];
    this.state.weapon = null;
    this.state.weaponDamage = [];
    this.state.weaponMaxNext = Infinity;
    this.state.health = this.settings.maxHealth;
    this.state.floorNumber = 1;
    this.state.runsRemaining = this.settings.maxRuns;
    this.state.floorFresh = true;
    this.state.healUsed = false;
    this.state.firstFloorDealt = false;
    this.stateHistory = [];

    this.notifyStatusChange('Click the deck to deal your first floor!');
    this.notifyStateChange();
    this.saveState();
  }

  /**
   * Deal the first floor
   * @returns {Object} Result with cards and slots
   */
  dealFirstFloor() {
    if (this.state.firstFloorDealt) return null;

    const drawnCards = [];
    for (let i = 0; i < 4 && this.state.deck.length > 0; i++) {
      const card = this.state.deck.shift();
      this.state.floor[i] = card;
      drawnCards.push({ card, slotIndex: i });
    }

    this.state.firstFloorDealt = true;
    this.state.floorFresh = true;
    this.state.healUsed = false;

    this.notifyStatusChange('First floor dealt! Drag cards to interact.');
    this.saveState();

    return { cards: drawnCards };
  }

  /**
   * Handle healing with a heart card
   * @param {Object} card - The heart card
   * @param {string} from - Where the card came from
   * @returns {Object} Result of the action
   */
  handleHeal(card, from) {
    if (card.suit !== 'hearts') {
      return { success: false, message: 'Only hearts can heal.' };
    }

    this.saveToHistory();
    this.state.removeCard(card, from);
    this.state.discard.push(card);
    this.state.floorFresh = false;

    const canHeal = this.state.canHeal(this.settings);

    if (!canHeal) {
      this.postAction();
      return {
        success: true,
        healed: 0,
        message: `Used ${card.rank} of hearts, but healing only works once per floor.`,
      };
    }

    this.state.healUsed = true;
    const healed = Math.min(this.settings.maxHealth, this.state.health + card.value) - this.state.health;
    this.state.health = Math.min(this.settings.maxHealth, this.state.health + card.value);

    this.postAction();
    return {
      success: true,
      healed,
      message: `Healed ${healed} health with ${card.rank} of hearts.`,
    };
  }

  /**
   * Handle equipping a weapon
   * @param {Object} card - The diamond card
   * @param {string} from - Where the card came from
   * @returns {Object} Result of the action
   */
  handleEquipWeapon(card, from) {
    if (card.suit !== 'diamonds') {
      return { success: false, message: 'Only diamonds can be equipped as weapons.' };
    }

    this.saveToHistory();
    this.state.removeCard(card, from);

    // Discard existing weapon and defeated monsters
    if (this.state.weapon) {
      this.state.discard.push(this.state.weapon, ...this.state.weaponDamage);
    }

    this.state.weapon = card;
    this.state.weaponDamage = [];
    this.state.weaponMaxNext = Infinity;
    this.state.floorFresh = false;

    this.postAction();
    return {
      success: true,
      message: `Equipped weapon ${card.rank} of diamonds (power ${card.value}).`,
    };
  }

  /**
   * Handle attacking a monster with the equipped weapon
   * @param {Object} card - The monster card
   * @param {string} from - Where the card came from
   * @returns {Object} Result of the action
   */
  handleFightMonster(card, from) {
    if (!this.state.weapon) {
      return { success: false, message: 'Equip a weapon (diamonds) before attacking monsters.' };
    }

    const monsterValue = card.value;

    // Check weapon degradation
    if (this.settings.weaponDegradation !== 'none' && monsterValue > this.state.weaponMaxNext) {
      const comparison = this.settings.weaponDegradation === 'strict' ? '<' : '≤';
      const maxVal =
        this.settings.weaponDegradation === 'strict'
          ? Math.max(2, this.state.weaponMaxNext + 1)
          : Math.max(2, this.state.weaponMaxNext);
      return {
        success: false,
        message: `Weapon can only fight monsters ${comparison} ${maxVal} now.`,
      };
    }

    // Store slot index before removing
    const slotIndex = this.state.getFloorSlotIndex(card);

    this.saveToHistory();
    this.state.removeCard(card, from);

    const damage = Math.max(0, monsterValue - this.state.weapon.value);
    this.state.health -= damage;
    this.state.weaponDamage.push(card);

    // Apply weapon degradation
    if (this.settings.weaponDegradation === 'strict') {
      this.state.weaponMaxNext = Math.min(this.state.weaponMaxNext, monsterValue - 1);
    } else if (this.settings.weaponDegradation === 'equal') {
      this.state.weaponMaxNext = Math.min(this.state.weaponMaxNext, monsterValue);
    }

    this.state.floorFresh = false;

    this.postAction();
    return {
      success: true,
      damage,
      slotIndex,
      message: `Fought ${card.rank} ${card.suit} (power ${monsterValue}). Took ${damage} damage.`,
    };
  }

  /**
   * Handle taking damage directly from a monster
   * @param {Object} card - The monster card
   * @param {string} from - Where the card came from
   * @returns {Object} Result of the action
   */
  handleTakeDamage(card, from) {
    if (card.suit === 'hearts' || card.suit === 'diamonds') {
      return { success: false, message: 'Take damage only from monsters (clubs/spades).' };
    }

    this.saveToHistory();
    const damage = card.value;
    this.state.removeCard(card, from);
    this.state.health -= damage;
    this.state.discard.push(card);
    this.state.floorFresh = false;

    this.postAction();
    return {
      success: true,
      damage,
      message: `Took ${damage} damage from ${card.rank} of ${card.suit}.`,
    };
  }

  /**
   * Handle discarding the equipped weapon
   * @returns {Object} Result of the action
   */
  handleDiscardWeapon() {
    if (!this.state.weapon) {
      return { success: false, message: 'No weapon to discard.' };
    }

    this.saveToHistory();
    this.state.discard.push(this.state.weapon, ...this.state.weaponDamage);
    this.state.weapon = null;
    this.state.weaponDamage = [];
    this.state.weaponMaxNext = Infinity;
    this.state.floorFresh = false;

    this.postAction();
    return { success: true, message: 'Weapon discarded.' };
  }

  /**
   * Handle running away
   * @returns {Object} Result of the action
   */
  handleRunAway() {
    if (!this.state.canRun(this.settings)) {
      return { success: false, message: 'Cannot run away now.' };
    }

    this.saveToHistory();

    // Collect floor cards and add to deck
    const floorCards = this.state.floor.filter(c => c !== null);
    this.state.deck.push(...floorCards);
    this.state.floor = [null, null, null, null];
    this.state.runsRemaining -= 1;
    this.state.floorFresh = true;
    this.state.healUsed = false;
    this.state.floorNumber += 1;

    this.saveState();
    return {
      success: true,
      message: 'You ran away. New dungeon floor drawn.',
    };
  }

  /**
   * Draw new cards for the floor after running
   * @returns {Object} New cards and their slots
   */
  drawNewFloorAfterRun() {
    const drawnCards = [];
    for (let i = 0; i < 4 && this.state.deck.length > 0; i++) {
      const card = this.state.deck.shift();
      this.state.floor[i] = card;
      drawnCards.push({ card, slotIndex: i });
    }

    this.saveState();
    return { cards: drawnCards };
  }

  /**
   * Check if floor needs refilling and do it
   * @returns {Object|null} Refill info or null
   */
  checkAndRefillFloor() {
    if (this.state.floorCardCount > 1 || this.state.deck.length === 0) {
      return null;
    }

    const needed = Math.min(3, this.state.deck.length);
    const drawnCards = [];
    let cardIndex = 0;

    for (let i = 0; i < 4 && cardIndex < needed; i++) {
      if (this.state.floor[i] === null) {
        const card = this.state.deck.shift();
        this.state.floor[i] = card;
        drawnCards.push({ card, slotIndex: i });
        cardIndex++;
      }
    }

    this.state.floorNumber += 1;
    this.state.floorFresh = true;
    this.state.healUsed = false;

    // Save state after dealing new cards to floor
    this.saveState();

    return {
      cards: drawnCards,
      floorNumber: this.state.floorNumber,
    };
  }

  /**
   * Post-action processing
   */
  postAction() {
    this.checkGameEnd();
    this.notifyStateChange();
    this.saveState();
  }

  /**
   * Check for win/loss conditions
   * @returns {string|null} 'win', 'lose', or null
   */
  checkGameEnd() {
    if (this.state.hasLost) {
      this.state.health = 0;
      return 'lose';
    }
    if (this.state.hasWon) {
      return 'win';
    }
    return null;
  }

  /**
   * Save current state to history
   */
  saveToHistory() {
    this.stateHistory.push(this.state.createSnapshot());
    if (this.stateHistory.length > MAX_HISTORY) {
      this.stateHistory.shift();
    }
  }

  /**
   * Undo last action
   * @returns {boolean} Whether undo was successful
   */
  undo() {
    if (this.stateHistory.length === 0) return false;

    const snapshot = this.stateHistory.pop();
    this.state.restoreFromSnapshot(snapshot);
    this.notifyStateChange();

    return true;
  }

  /**
   * Check if undo is available
   * @returns {boolean}
   */
  canUndo() {
    return this.stateHistory.length > 0;
  }

  /**
   * Apply a difficulty preset
   * @param {string} presetName - Name of the preset
   */
  applyDifficultyPreset(presetName) {
    const preset = DIFFICULTY_PRESETS[presetName];
    if (preset) {
      Object.assign(this.settings, preset);
    }
  }

  /**
   * Get current difficulty mode name
   * @returns {string}
   */
  getCurrentDifficultyMode() {
    for (const [name, preset] of Object.entries(DIFFICULTY_PRESETS)) {
      const matches = Object.entries(preset).every(
        ([key, value]) => this.settings[key] === value
      );
      if (matches) return name;
    }
    return 'custom';
  }

  /**
   * Save game state to storage
   */
  saveState() {
    storageService.saveGameState(this.state, this.settings, this.stateHistory);
  }

  /**
   * Load game state from storage
   * @returns {boolean} Whether loading was successful
   */
  loadState() {
    const saved = storageService.loadGameState();
    if (!saved) return false;

    this.state.fromJSON(saved.state);
    Object.assign(this.settings, saved.gameSettings);
    this.stateHistory = saved.stateHistory || [];

    return true;
  }

  /**
   * Clear saved game state
   */
  clearSavedState() {
    storageService.clearGameState();
  }

  /**
   * Notify state change
   */
  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.state, this.settings);
    }
  }

  /**
   * Notify status message
   * @param {string} message
   */
  notifyStatusChange(message) {
    if (this.onStatusMessage) {
      this.onStatusMessage(message);
    }
  }

  /**
   * Get weapon info text for UI
   * @returns {string}
   */
  getWeaponInfoText() {
    if (!this.state.weapon) return '';

    if (this.settings.weaponDegradation === 'none') {
      return '⚔️ No degradation';
    }

    if (this.state.weaponDamage.length === 0) {
      return '⚔️ Fresh weapon - can attack any monster';
    }

    const comparison = this.settings.weaponDegradation === 'strict' ? '<' : '≤';
    const maxVal =
      this.settings.weaponDegradation === 'strict'
        ? Math.max(2, this.state.weaponMaxNext + 1)
        : Math.max(2, this.state.weaponMaxNext);

    return `⚔️ Can attack monsters ${comparison} ${maxVal}`;
  }
}

// Export singleton instance
export const gameService = new GameService();


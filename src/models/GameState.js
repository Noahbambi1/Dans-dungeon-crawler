/**
 * GameState Model
 * Manages all game state including deck, floor, equipment, and player status
 */

import { Card } from './Card.js';
import { FLOOR_SIZE, DEFAULT_GAME_SETTINGS } from '../config/constants.js';

export class GameState {
  constructor() {
    this.reset();
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.deck = [];
    this.discard = [];
    this.floor = [null, null, null, null]; // 4 slots
    this.weapon = null;
    this.weaponDamage = []; // Defeated monsters attached to weapon
    this.weaponMaxNext = Infinity; // Highest monster value weapon can still face
    this.health = DEFAULT_GAME_SETTINGS.maxHealth;
    this.floorNumber = 1;
    this.runsRemaining = DEFAULT_GAME_SETTINGS.maxRuns;
    this.floorFresh = true; // True when no actions taken on current floor
    this.healUsed = false; // True if heal has been used on current floor
    this.originalDeck = []; // Store original deck for restart
    this.initialDeckOrder = []; // Store exact deck order for restart
    this.firstFloorDealt = false;
  }

  /**
   * Get number of cards currently on the floor
   * @returns {number}
   */
  get floorCardCount() {
    return this.floor.filter(c => c !== null).length;
  }

  /**
   * Check if player has won (cleared all cards)
   * @returns {boolean}
   */
  get hasWon() {
    return this.deck.length === 0 && this.floorCardCount === 0;
  }

  /**
   * Check if player has lost (health <= 0)
   * @returns {boolean}
   */
  get hasLost() {
    return this.health <= 0;
  }

  /**
   * Check if player can run away
   * @param {Object} settings - Current game settings
   * @returns {boolean}
   */
  canRun(settings) {
    return this.runsRemaining > 0 && this.floorFresh && this.floorCardCount > 0;
  }

  /**
   * Check if player can heal
   * @param {Object} settings - Current game settings
   * @returns {boolean}
   */
  canHeal(settings) {
    return settings.healingMode === 'unlimited' || !this.healUsed;
  }

  /**
   * Find a card by ID from a specific location
   * @param {string} id - Card ID
   * @param {string} from - Location ('floor' or 'weapon')
   * @returns {Card|null}
   */
  findCardById(id, from) {
    if (from === 'floor') {
      return this.floor.find(c => c && c.id === id) || null;
    }
    if (from === 'weapon' && this.weapon && this.weapon.id === id) {
      return this.weapon;
    }
    return null;
  }

  /**
   * Remove a card from its location
   * @param {Card} card - Card to remove
   * @param {string} from - Location ('floor' or 'weapon')
   */
  removeCard(card, from) {
    if (from === 'floor') {
      const index = this.floor.findIndex(c => c && c.id === card.id);
      if (index !== -1) {
        this.floor[index] = null;
      }
    } else if (from === 'weapon' && this.weapon && this.weapon.id === card.id) {
      this.weapon = null;
      this.weaponDamage = [];
      this.weaponMaxNext = Infinity;
    }
  }

  /**
   * Get the card's slot index on the floor
   * @param {Card} card - Card to find
   * @returns {number} Index or -1 if not found
   */
  getFloorSlotIndex(card) {
    return this.floor.findIndex(c => c && c.id === card.id);
  }

  /**
   * Fill empty floor slots with cards from deck
   */
  fillFloorSlots() {
    for (let i = 0; i < FLOOR_SIZE; i++) {
      if (this.floor[i] === null && this.deck.length > 0) {
        this.floor[i] = this.deck.shift();
      }
    }
  }

  /**
   * Create a deep clone of the current state (for undo)
   * @returns {Object}
   */
  createSnapshot() {
    return {
      deck: this.deck.map(c => ({ ...c })),
      discard: this.discard.map(c => ({ ...c })),
      floor: this.floor.map(c => c ? { ...c } : null),
      weapon: this.weapon ? { ...this.weapon } : null,
      weaponDamage: this.weaponDamage.map(c => ({ ...c })),
      weaponMaxNext: this.weaponMaxNext,
      health: this.health,
      floorNumber: this.floorNumber,
      runsRemaining: this.runsRemaining,
      floorFresh: this.floorFresh,
      healUsed: this.healUsed,
      firstFloorDealt: this.firstFloorDealt,
    };
  }

  /**
   * Restore state from a snapshot
   * @param {Object} snapshot - State snapshot
   */
  restoreFromSnapshot(snapshot) {
    this.deck = snapshot.deck.map(c => ({ ...c }));
    this.discard = snapshot.discard.map(c => ({ ...c }));
    this.floor = snapshot.floor.map(c => c ? { ...c } : null);
    this.weapon = snapshot.weapon ? { ...snapshot.weapon } : null;
    this.weaponDamage = snapshot.weaponDamage.map(c => ({ ...c }));
    this.weaponMaxNext = snapshot.weaponMaxNext;
    this.health = snapshot.health;
    this.floorNumber = snapshot.floorNumber;
    this.runsRemaining = snapshot.runsRemaining;
    this.floorFresh = snapshot.floorFresh;
    this.healUsed = snapshot.healUsed;
    this.firstFloorDealt = snapshot.firstFloorDealt;
  }

  /**
   * Serialize state for storage
   * @returns {Object}
   */
  toJSON() {
    return {
      deck: this.deck,
      discard: this.discard,
      floor: this.floor,
      weapon: this.weapon,
      weaponDamage: this.weaponDamage,
      weaponMaxNext: this.weaponMaxNext === Infinity ? null : this.weaponMaxNext,
      health: this.health,
      floorNumber: this.floorNumber,
      runsRemaining: this.runsRemaining,
      floorFresh: this.floorFresh,
      healUsed: this.healUsed,
      originalDeck: this.originalDeck,
      initialDeckOrder: this.initialDeckOrder,
      firstFloorDealt: this.firstFloorDealt,
    };
  }

  /**
   * Load state from serialized data
   * @param {Object} data - Serialized state
   */
  fromJSON(data) {
    Object.assign(this, data);
    // Handle Infinity serialization
    if (this.weaponMaxNext === null) {
      this.weaponMaxNext = Infinity;
    }
  }
}


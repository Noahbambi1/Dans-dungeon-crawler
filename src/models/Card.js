/**
 * Card Model
 * Represents a single playing card in the game
 */

import { SUIT_COLORS, SUIT_ICONS } from '../config/constants.js';

export class Card {
  /**
   * Create a new Card
   * @param {string} suit - The card suit (hearts, diamonds, clubs, spades)
   * @param {string} rank - The card rank (A, 2-10, J, Q, K)
   */
  constructor(suit, rank) {
    this.id = `${suit}-${rank}-${Math.random().toString(16).slice(2)}`;
    this.suit = suit;
    this.rank = rank;
    this.color = SUIT_COLORS[suit];
    this.value = this.calculateValue();
  }

  /**
   * Calculate the numeric value of the card
   * @returns {number} The card's value
   */
  calculateValue() {
    if (['J', 'Q', 'K'].includes(this.rank)) {
      return { J: 11, Q: 12, K: 13 }[this.rank];
    }
    if (this.rank === 'A') {
      return 14;
    }
    return Number(this.rank);
  }

  /**
   * Get the suit icon for display
   * @returns {string} Unicode suit symbol
   */
  get suitIcon() {
    return SUIT_ICONS[this.suit];
  }

  /**
   * Check if this card is a monster (clubs or spades)
   * @returns {boolean}
   */
  get isMonster() {
    return this.suit === 'clubs' || this.suit === 'spades';
  }

  /**
   * Check if this card is a weapon (diamonds)
   * @returns {boolean}
   */
  get isWeapon() {
    return this.suit === 'diamonds';
  }

  /**
   * Check if this card is a heal (hearts)
   * @returns {boolean}
   */
  get isHeal() {
    return this.suit === 'hearts';
  }

  /**
   * Check if this card is a royal (J, Q, K)
   * @returns {boolean}
   */
  get isRoyal() {
    return ['J', 'Q', 'K'].includes(this.rank);
  }

  /**
   * Check if this card is an ace
   * @returns {boolean}
   */
  get isAce() {
    return this.rank === 'A';
  }

  /**
   * Check if this card is a royal monster
   * @returns {boolean}
   */
  get isRoyalMonster() {
    return this.isMonster && (this.isRoyal || this.isAce);
  }

  /**
   * Create a plain object copy of the card (for serialization)
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      suit: this.suit,
      rank: this.rank,
      color: this.color,
      value: this.value,
    };
  }

  /**
   * Create a Card instance from a plain object
   * @param {Object} data - Plain card data
   * @returns {Card}
   */
  static fromJSON(data) {
    const card = new Card(data.suit, data.rank);
    card.id = data.id; // Preserve the original ID
    return card;
  }

  /**
   * Create a deep copy of this card
   * @returns {Card}
   */
  clone() {
    return Card.fromJSON(this.toJSON());
  }
}


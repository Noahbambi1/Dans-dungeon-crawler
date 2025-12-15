/**
 * Deck Model
 * Manages a collection of cards with shuffle and draw capabilities
 */

import { Card } from './Card.js';
import { SUITS, RANKS } from '../config/constants.js';

export class Deck {
  constructor() {
    this.cards = [];
  }

  /**
   * Get the number of cards in the deck
   * @returns {number}
   */
  get length() {
    return this.cards.length;
  }

  /**
   * Check if the deck is empty
   * @returns {boolean}
   */
  get isEmpty() {
    return this.cards.length === 0;
  }

  /**
   * Build a standard deck based on game settings
   * @param {Object} settings - Game settings
   * @returns {Deck} this instance for chaining
   */
  build(settings = {}) {
    this.cards = [];

    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const card = new Card(suit, rank);

        // Apply game settings filters
        if (!this.shouldIncludeCard(card, settings)) {
          continue;
        }

        this.cards.push(card);
      }
    }

    return this;
  }

  /**
   * Determine if a card should be included based on settings
   * @param {Card} card - The card to check
   * @param {Object} settings - Game settings
   * @returns {boolean}
   */
  shouldIncludeCard(card, settings) {
    // Red aces are always excluded
    if (card.color === 'red' && card.isAce) {
      return false;
    }

    // Diamond royals: excluded by default
    if (card.suit === 'diamonds' && card.isRoyal && !settings.includeDiamondRoyals) {
      return false;
    }

    // Heart royals: excluded by default
    if (card.suit === 'hearts' && card.isRoyal && !settings.includeHeartRoyals) {
      return false;
    }

    // Ace monsters: included by default, can be removed
    if (card.isMonster && card.isAce && settings.removeAceMonsters) {
      return false;
    }

    return true;
  }

  /**
   * Shuffle the deck using Fisher-Yates algorithm
   * @returns {Deck} this instance for chaining
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    return this;
  }

  /**
   * Draw cards from the top of the deck
   * @param {number} count - Number of cards to draw
   * @returns {Card[]} Array of drawn cards
   */
  draw(count = 1) {
    const drawn = [];
    for (let i = 0; i < count && !this.isEmpty; i++) {
      drawn.push(this.cards.shift());
    }
    return drawn;
  }

  /**
   * Add cards to the bottom of the deck
   * @param {Card[]} cards - Cards to add
   * @returns {Deck} this instance for chaining
   */
  addToBottom(cards) {
    this.cards.push(...cards);
    return this;
  }

  /**
   * Add cards to the top of the deck
   * @param {Card[]} cards - Cards to add
   * @returns {Deck} this instance for chaining
   */
  addToTop(cards) {
    this.cards.unshift(...cards);
    return this;
  }

  /**
   * Create a copy of this deck
   * @returns {Deck}
   */
  clone() {
    const newDeck = new Deck();
    newDeck.cards = this.cards.map(card => card.clone());
    return newDeck;
  }

  /**
   * Serialize the deck to a plain array
   * @returns {Object[]}
   */
  toJSON() {
    return this.cards.map(card => card.toJSON());
  }

  /**
   * Create a Deck from serialized data
   * @param {Object[]} data - Array of card data
   * @returns {Deck}
   */
  static fromJSON(data) {
    const deck = new Deck();
    deck.cards = data.map(cardData => Card.fromJSON(cardData));
    return deck;
  }
}


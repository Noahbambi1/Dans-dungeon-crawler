/**
 * Card Component
 * Renders individual playing cards
 */

import { SUIT_ICONS, MONSTER_GRAPHICS } from '../config/constants.js';
import { createElement } from '../utils/helpers.js';

export class CardComponent {
  /**
   * Create a card DOM element
   * @param {Object} card - Card data
   * @param {Object} options - Rendering options
   * @returns {HTMLElement}
   */
  static create(card, options = {}) {
    const { draggable = true, from = 'floor', showTooltip = false } = options;

    const isMonster = card.suit === 'clubs' || card.suit === 'spades';
    const isRoyal = ['A', 'J', 'Q', 'K'].includes(card.rank);
    const isRoyalMonster = isMonster && isRoyal;

    const el = createElement('div', {
      className: `card ${card.color}${isRoyalMonster ? ' monster-royal' : ''}`,
      draggable: draggable,
      dataset: {
        cardId: card.id,
        suit: card.suit,
        rank: card.rank,
        value: card.value,
        from: from,
      },
    });

    if (showTooltip && card.suit === 'diamonds') {
      el.dataset.tooltip = `Power: ${card.value}`;
    }

    // Top corner
    const cornerTop = createElement('div', { className: 'corner' });
    cornerTop.innerHTML = `${card.rank}<br/>${SUIT_ICONS[card.suit]}`;

    // Center suit/monster
    const center = createElement('div', { className: 'suit' });
    if (isRoyalMonster && MONSTER_GRAPHICS[card.rank]) {
      center.textContent = MONSTER_GRAPHICS[card.rank];
    } else {
      center.textContent = SUIT_ICONS[card.suit];
    }

    // Bottom corner
    const cornerBottom = createElement('div', { className: 'corner bottom' });
    cornerBottom.innerHTML = `${card.rank}<br/>${SUIT_ICONS[card.suit]}`;

    el.appendChild(cornerTop);
    el.appendChild(center);
    el.appendChild(cornerBottom);

    return el;
  }

  /**
   * Create a card back element
   * @param {Object} options - Options
   * @returns {HTMLElement}
   */
  static createBack(options = {}) {
    const { clickable = false, slotIndex = null } = options;

    const el = createElement('div', {
      className: `card back${clickable ? ' clickable' : ''}`,
    });

    if (slotIndex !== null) {
      el.dataset.slotIndex = slotIndex;
    }

    return el;
  }

  /**
   * Create an empty floor placeholder
   * @returns {HTMLElement}
   */
  static createEmptySlot() {
    return createElement('div', { className: 'empty floor-placeholder' });
  }

  /**
   * Create a stacked card (for discard/weapon damage piles)
   * @param {Object} card - Card data
   * @param {number} index - Stack index
   * @param {Object} options - Options
   * @returns {HTMLElement}
   */
  static createStacked(card, index, options = {}) {
    const { offsetX = 10, offsetY = 10 } = options;

    const el = this.create(card, { draggable: false });
    el.classList.add('stacked');
    el.style.position = 'absolute';
    el.style.zIndex = index + 1;
    el.style.transform = `translate(${index * offsetX}px, ${index * offsetY}px)`;
    el.style.transition = 'transform 0.12s ease';

    return el;
  }

  /**
   * Create a card stack container
   * @param {Object[]} cards - Array of card data
   * @param {Object} options - Stack options
   * @returns {HTMLElement}
   */
  static createStack(cards, options = {}) {
    const { offsetX = 10, offsetY = 10, maxVisible = 10 } = options;

    const stackContainer = createElement('div', { className: 'card-stack' });
    const cardsToShow = cards.slice(-maxVisible);

    cardsToShow.forEach((card, index) => {
      const el = this.createStacked(card, index, { offsetX, offsetY });
      stackContainer.appendChild(el);
    });

    return stackContainer;
  }
}


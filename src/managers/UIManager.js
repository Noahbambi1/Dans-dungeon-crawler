/**
 * UI Manager
 * Handles all UI rendering and updates
 */

import { CardComponent } from '../components/CardComponent.js';
import { createElement } from '../utils/helpers.js';

class UIManager {
  constructor() {
    this.elements = {};
  }

  /**
   * Initialize UI elements cache
   */
  init() {
    this.elements = {
      floorRow: document.getElementById('floorRow'),
      weaponSlot: document.getElementById('weaponSlot'),
      weaponDamageSlot: document.getElementById('weaponDamageSlot'),
      weaponInfoBar: document.getElementById('weaponInfoBar'),
      discardSlot: document.getElementById('discardSlot'),
      deckBack: document.getElementById('deckBack'),
      deckCount: document.getElementById('deckCount'),
      discardCount: document.getElementById('discardCount'),
      healthBar: document.getElementById('healthBar'),
      healthValue: document.getElementById('healthValue'),
      floorValue: document.getElementById('floorValue'),
      runButton: document.getElementById('runButton'),
      undoButton: document.getElementById('undoButton'),
      status: document.getElementById('status'),
      gameControls: document.getElementById('gameControls'),
      burgerMenuBtn: document.getElementById('burgerMenuBtn'),
    };
  }

  /**
   * Render the full game state
   * @param {Object} state - Game state
   * @param {Object} settings - Game settings
   */
  render(state, settings) {
    this.renderFloor(state);
    this.renderWeapon(state, settings);
    this.renderWeaponDamage(state);
    this.renderDiscard(state);
    this.renderDeck(state);
    this.renderStats(state, settings);
    this.renderRunButton(state, settings);
  }

  /**
   * Render the floor cards
   * @param {Object} state - Game state
   */
  renderFloor(state) {
    const floorRow = this.elements.floorRow;
    if (!floorRow) return;

    floorRow.innerHTML = '';

    for (let i = 0; i < 4; i++) {
      const card = state.floor[i];
      if (card) {
        const cardEl = CardComponent.create(card, { from: 'floor' });
        floorRow.appendChild(cardEl);
      } else {
        floorRow.appendChild(CardComponent.createEmptySlot());
      }
    }
  }

  /**
   * Render floor with card backs for new cards only (for animation)
   * First renders normally, then replaces only the new card slots with backs
   * @param {Object} state - Game state
   * @param {number[]} slotsToAnimate - Specific slot indices to animate (optional)
   * @returns {Object[]} Array of {element, slotIndex}
   */
  renderFloorBacks(state, slotsToAnimate = null) {
    const floorRow = this.elements.floorRow;
    if (!floorRow) return [];

    // First, render the floor normally (this preserves existing cards)
    this.renderFloor(state);
    
    const backCards = [];
    
    // If specific slots provided, use those; otherwise animate all slots with cards
    const slots = slotsToAnimate || [0, 1, 2, 3].filter(i => state.floor[i] !== null);
    
    // Now replace only the specified slots with back cards
    slots.forEach(slotIndex => {
      const existingEl = floorRow.children[slotIndex];
      if (existingEl && existingEl.classList.contains('card') && !existingEl.classList.contains('back')) {
        const backCard = CardComponent.createBack({ slotIndex });
        backCard.style.opacity = '0';
        existingEl.replaceWith(backCard);
        backCards.push({ element: backCard, slotIndex });
      }
    });

    return backCards;
  }

  /**
   * Reveal a card at a specific slot
   * @param {Object} card - Card data
   * @param {number} slotIndex - Slot index
   */
  revealFloorCard(card, slotIndex) {
    const floorRow = this.elements.floorRow;
    if (!floorRow) return;

    const backCard = floorRow.children[slotIndex];
    if (!backCard) return;

    const cardEl = CardComponent.create(card, { from: 'floor' });
    cardEl.classList.add('drawing');
    backCard.replaceWith(cardEl);

    setTimeout(() => cardEl.classList.remove('drawing'), 200);
  }

  /**
   * Render the equipped weapon
   * @param {Object} state - Game state
   * @param {Object} settings - Game settings
   */
  renderWeapon(state, settings) {
    const slot = this.elements.weaponSlot;
    const infoBar = this.elements.weaponInfoBar;
    if (!slot) return;

    slot.innerHTML = '';

    if (!state.weapon) {
      const empty = createElement('div', { className: 'slot-drop' }, ['Drop diamonds to equip']);
      slot.appendChild(empty);
      if (infoBar) {
        infoBar.textContent = '';
        infoBar.classList.remove('active');
      }
      return;
    }

    const cardEl = CardComponent.create(state.weapon, {
      from: 'weapon',
      showTooltip: true,
    });
    slot.appendChild(cardEl);

    // Update weapon info bar
    if (infoBar) {
      infoBar.textContent = this.getWeaponInfoText(state, settings);
      infoBar.classList.add('active');
    }
  }

  /**
   * Get weapon info text
   * @param {Object} state - Game state
   * @param {Object} settings - Game settings
   * @returns {string}
   */
  getWeaponInfoText(state, settings) {
    if (!state.weapon) return '';

    if (settings.weaponDegradation === 'none') {
      return '⚔️ No degradation';
    }

    if (state.weaponDamage.length === 0) {
      return '⚔️ Fresh weapon - can attack any monster';
    }

    const comparison = settings.weaponDegradation === 'strict' ? '<' : '≤';
    const maxVal =
      settings.weaponDegradation === 'strict'
        ? Math.max(2, state.weaponMaxNext + 1)
        : Math.max(2, state.weaponMaxNext);

    return `⚔️ Can attack monsters ${comparison} ${maxVal}`;
  }

  /**
   * Render the weapon damage pile
   * @param {Object} state - Game state
   */
  renderWeaponDamage(state) {
    const slot = this.elements.weaponDamageSlot;
    if (!slot) return;

    slot.innerHTML = '';
    slot.classList.add('drop-target');
    slot.dataset.drop = 'weaponDamage';

    if (state.weaponDamage.length === 0) {
      const empty = createElement('div', { className: 'slot-drop' }, ['No defeated monsters']);
      slot.appendChild(empty);
      return;
    }

    const stack = CardComponent.createStack(state.weaponDamage, { offsetX: 10, offsetY: 10 });
    slot.appendChild(stack);
  }

  /**
   * Render the discard pile
   * @param {Object} state - Game state
   */
  renderDiscard(state) {
    const slot = this.elements.discardSlot;
    if (!slot) return;

    slot.innerHTML = '';
    slot.classList.add('drop-target');
    slot.dataset.drop = 'discard';

    if (state.discard.length === 0) {
      const empty = createElement('div', { className: 'slot-drop' });
      slot.appendChild(empty);
      return;
    }

    const stack = CardComponent.createStack(state.discard, { offsetX: 0, offsetY: 3 });
    slot.appendChild(stack);
  }

  /**
   * Render the deck
   * @param {Object} state - Game state
   */
  renderDeck(state) {
    const deckBack = this.elements.deckBack;
    const deckCount = this.elements.deckCount;

    if (deckCount) {
      deckCount.textContent = `${state.deck.length} cards`;
    }

    if (deckBack) {
      if (!state.firstFloorDealt && state.deck.length > 0) {
        deckBack.classList.add('clickable');
        deckBack.title = 'Click to deal your first floor';
      } else {
        deckBack.classList.remove('clickable');
        deckBack.title = '';
      }
    }
  }

  /**
   * Render stats (health, floor number, discard count)
   * @param {Object} state - Game state
   * @param {Object} settings - Game settings
   */
  renderStats(state, settings) {
    const { discardCount, healthBar, healthValue, floorValue } = this.elements;

    if (discardCount) {
      discardCount.textContent = `${state.discard.length} cards`;
    }

    if (healthValue) {
      healthValue.textContent = `${state.health} / ${settings.maxHealth}`;
    }

    if (healthBar) {
      const percent = (state.health / settings.maxHealth) * 100;
      healthBar.style.width = `${percent}%`;
    }

    if (floorValue) {
      floorValue.textContent = state.floorNumber;
    }
  }

  /**
   * Render the run button
   * @param {Object} state - Game state
   * @param {Object} settings - Game settings
   */
  renderRunButton(state, settings) {
    const btn = this.elements.runButton;
    if (!btn) return;

    const floorCardCount = state.floor.filter(c => c !== null).length;
    const canRun = state.runsRemaining > 0 && state.floorFresh && floorCardCount > 0;
    btn.disabled = !canRun;

    if (state.runsRemaining <= 0) {
      btn.textContent = 'No runs left';
    } else if (settings.maxRuns === 1) {
      btn.textContent = 'Run away (once)';
    } else {
      btn.textContent = `Run away (${state.runsRemaining} left)`;
    }
  }

  /**
   * Update the undo button state
   * @param {boolean} canUndo - Whether undo is available
   */
  updateUndoButton(canUndo) {
    const btn = this.elements.undoButton;
    if (btn) {
      btn.disabled = !canUndo;
    }
  }

  /**
   * Set the status message
   * @param {string} message
   */
  setStatus(message) {
    const status = this.elements.status;
    if (status) {
      status.textContent = message;
    }
  }

  /**
   * Get deck element for animation
   * @returns {Element|null}
   */
  getDeckElement() {
    return this.elements.deckBack;
  }

  /**
   * Get floor row element
   * @returns {Element|null}
   */
  getFloorRow() {
    return this.elements.floorRow;
  }

  /**
   * Setup mobile menu toggle
   */
  setupMobileMenu() {
    const burgerBtn = this.elements.burgerMenuBtn;
    const gameControls = this.elements.gameControls;

    if (!burgerBtn || !gameControls) return;

    // Load saved state
    const isMinimized = localStorage.getItem('menuMinimized') === 'true';
    if (isMinimized) {
      gameControls.classList.add('minimized');
    } else {
      burgerBtn.classList.add('active');
    }

    burgerBtn.addEventListener('click', () => {
      const isCurrentlyMinimized = gameControls.classList.contains('minimized');
      gameControls.classList.toggle('minimized');
      burgerBtn.classList.toggle('active', isCurrentlyMinimized);
      localStorage.setItem('menuMinimized', !isCurrentlyMinimized);
    });
  }
}

// Export singleton instance
export const uiManager = new UIManager();


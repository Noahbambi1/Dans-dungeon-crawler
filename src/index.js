/**
 * Dungeon Floor Card Crawler
 * Main Application Entry Point
 * 
 * This file wires together all the modules and initializes the game.
 */

// Services
import { gameService } from './services/GameService.js';
import { storageService } from './services/StorageService.js';
import { leaderboardService } from './services/LeaderboardService.js';

// Managers
import { themeManager } from './managers/ThemeManager.js';
import { uiManager } from './managers/UIManager.js';
import { animationManager } from './managers/AnimationManager.js';
import { dragDropManager } from './managers/DragDropManager.js';

// Components
import { ModalComponent } from './components/ModalComponent.js';
import { LeaderboardComponent } from './components/LeaderboardComponent.js';

// Utils
import { generateRandomName, delay } from './utils/helpers.js';

// Config
import { DIFFICULTY_PRESETS, ANIMATION_DURATIONS } from './config/constants.js';

/**
 * Application Controller
 * Orchestrates all game functionality
 */
class App {
  constructor() {
    this.currentPlayerName = null;
  }

  /**
   * Initialize the application
   */
  async init() {
    // Initialize managers
    uiManager.init();
    animationManager.init();
    themeManager.init();
    dragDropManager.init();

    // Setup UI
    uiManager.setupMobileMenu();
    themeManager.setupSelectors();

    // Wire up callbacks
    this.setupCallbacks();

    // Setup event listeners
    this.setupEventListeners();

    // Initialize player
    this.initializePlayer();

    // Setup leaderboard
    this.setupLeaderboard();

    // Try to load saved game or start new
    const loaded = gameService.loadState();
    if (loaded) {
      ModalComponent.updateSettingsUI(gameService.settings);
      uiManager.render(gameService.state, gameService.settings);
      uiManager.updateUndoButton(gameService.canUndo());

      // Check for win/lose conditions
      if (gameService.state.health <= 0) {
        gameService.checkGameEnd();
        setTimeout(() => ModalComponent.showLose(gameService.canUndo()), 500);
      } else {
        const endState = gameService.checkGameEnd();
        if (endState === 'win') {
          setTimeout(() => this.handleWin(), 500);
        }
      }
      uiManager.setStatus('Game restored. Continue your adventure!');
    } else {
      gameService.initGame();
    }
  }

  /**
   * Setup service callbacks
   */
  setupCallbacks() {
    // Game service callbacks
    gameService.onStateChange = (state, settings) => {
      uiManager.render(state, settings);
      uiManager.updateUndoButton(gameService.canUndo());
      dragDropManager.reattach();
    };

    gameService.onStatusMessage = message => {
      uiManager.setStatus(message);
    };

    // Drag drop callbacks
    dragDropManager.onCardDrop = (cardId, from, target) => {
      this.handleCardDrop(cardId, from, target);
    };

    dragDropManager.findCardById = (id, from) => {
      return gameService.state.findCardById(id, from);
    };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Game control buttons
    this.addClickListener('runButton', () => this.handleRunAway());
    this.addClickListener('discardWeaponBtn', () => this.handleDiscardWeapon());
    this.addClickListener('newGameButton', () => this.handleNewGame());
    this.addClickListener('restartButton', () => this.handleRestart());
    this.addClickListener('undoButton', () => this.handleUndo());
    this.addClickListener('deckBack', () => this.handleDeckClick());

    // Settings
    this.addClickListener('settingsButton', () => this.showSettings());
    this.addClickListener('mobileSettingsBtn', () => {
      this.closeMobileMenu();
      this.showSettings();
    });
    this.addClickListener('closeSettingsBtn', () => ModalComponent.hideSettings());
    this.addClickListener('applySettingsBtn', () => this.applySettings());

    // Mobile menu buttons
    this.addClickListener('mobileUndoBtn', () => {
      this.closeMobileMenu();
      this.handleUndo();
    });
    this.addClickListener('mobileRestartBtn', () => {
      this.closeMobileMenu();
      this.handleRestart();
    });
    this.addClickListener('mobileNewGameBtn', () => {
      this.closeMobileMenu();
      this.handleNewGame();
    });
    this.addClickListener('mobileLeaderboardBtn', () => {
      this.closeMobileMenu();
      LeaderboardComponent.togglePanel(true);
      this.loadLeaderboard();
    });

    // Difficulty presets
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        gameService.applyDifficultyPreset(btn.dataset.preset);
        ModalComponent.updateSettingsUI(gameService.settings);
      });
    });

    // Modal buttons
    this.addClickListener('winNewGameBtn', () => {
      ModalComponent.hideWin();
      animationManager.resetWinCelebration();
      gameService.initGame();
    });

    this.addClickListener('loseRestartBtn', () => {
      ModalComponent.hideLose();
      gameService.restartGame();
    });

    this.addClickListener('loseNewGameBtn', () => {
      ModalComponent.hideLose();
      gameService.initGame();
    });

    this.addClickListener('loseRedoBtn', () => {
      ModalComponent.hideLose();
      this.handleUndo();
    });
  }

  /**
   * Helper to add click listener with null check
   */
  addClickListener(id, handler) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', handler);
    }
  }

  /**
   * Close the mobile menu
   */
  closeMobileMenu() {
    const overlay = document.getElementById('mobileMenuOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  /**
   * Initialize the current player
   */
  initializePlayer() {
    this.currentPlayerName = storageService.getCurrentPlayer();
    if (!this.currentPlayerName) {
      this.currentPlayerName = generateRandomName();
      storageService.saveCurrentPlayer(this.currentPlayerName);
    }
    LeaderboardComponent.updateCurrentPlayerDisplay(this.currentPlayerName);
  }

  /**
   * Setup the leaderboard
   */
  setupLeaderboard() {
    const btn = document.getElementById('leaderboardButton');
    const panel = document.getElementById('leaderboardPanel');
    const setPlayerBtn = document.getElementById('setPlayerBtn');
    const playerInput = document.getElementById('playerNameInput');
    const refreshBtn = document.getElementById('refreshLeaderboardBtn');

    if (btn && panel) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const isVisible = LeaderboardComponent.isPanelVisible();
        LeaderboardComponent.togglePanel(!isVisible);
        if (!isVisible) {
          this.loadLeaderboard();
        }
      });

      // Close on outside click
      document.addEventListener('click', e => {
        if (!panel.contains(e.target) && e.target !== btn) {
          LeaderboardComponent.togglePanel(false);
        }
      });
    }

    if (setPlayerBtn && playerInput) {
      setPlayerBtn.addEventListener('click', () => {
        this.setCurrentPlayer(playerInput.value);
      });

      playerInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
          this.setCurrentPlayer(playerInput.value);
        }
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadLeaderboard());
    }

    // Update sync status
    LeaderboardComponent.updateSyncStatus(
      leaderboardService.isConfigured() ? 'synced' : 'local'
    );

    // Load leaderboard on startup
    this.loadLeaderboard();
  }

  /**
   * Load the leaderboard
   */
  async loadLeaderboard() {
    if (leaderboardService.isConfigured()) {
      LeaderboardComponent.updateSyncStatus('syncing');
      try {
        await leaderboardService.fetchLeaderboard();
        LeaderboardComponent.updateSyncStatus('synced');
      } catch {
        LeaderboardComponent.updateSyncStatus('error');
      }
    }
    LeaderboardComponent.render(this.currentPlayerName);
  }

  /**
   * Set the current player name
   */
  setCurrentPlayer(name) {
    const trimmed = name.trim();
    this.currentPlayerName = trimmed || generateRandomName();
    storageService.saveCurrentPlayer(this.currentPlayerName);
    LeaderboardComponent.updateCurrentPlayerDisplay(this.currentPlayerName);
    LeaderboardComponent.render(this.currentPlayerName);
  }

  /**
   * Handle card drop on a target
   */
  handleCardDrop(cardId, from, target) {
    const card = gameService.state.findCardById(cardId, from);
    if (!card) return;

    let result;

    switch (target) {
      case 'heal':
        result = gameService.handleHeal(card, from);
        if (result.success && result.healed > 0) {
          animationManager.showHeal(result.healed);
        }
        break;

      case 'weapon':
      case 'weaponDamage':
        if (card.suit === 'diamonds') {
          result = gameService.handleEquipWeapon(card, from);
        } else if (card.suit === 'clubs' || card.suit === 'spades') {
          const cardEl = document.querySelector(`[data-card-id="${cardId}"]`);
          result = gameService.handleFightMonster(card, from);
          if (result.success) {
            const weaponEl = document.querySelector('#weaponSlot .card');
            animationManager.showFight(weaponEl, cardEl);
            if (result.damage > 0) {
              setTimeout(() => animationManager.showDamage(result.damage), 300);
            }
          }
        } else {
          result = { success: false, message: 'Only weapons (diamonds) or monsters go here.' };
        }
        break;

      case 'discard':
        if (from === 'weapon') {
          result = gameService.handleDiscardWeapon();
        } else {
          result = {
            success: false,
            message: 'You can only remove cards by equipping weapons, defeating monsters, or healing.',
          };
        }
        break;

      case 'health':
        result = gameService.handleTakeDamage(card, from);
        if (result.success && result.damage > 0) {
          animationManager.showDamage(result.damage);
        }
        break;

      default:
        return;
    }

    if (result?.message) {
      uiManager.setStatus(result.message);
    }

    // Check for game end after action
    this.checkGameEndAfterAction();
  }

  /**
   * Check game end state and handle refill
   */
  checkGameEndAfterAction() {
    const endState = gameService.checkGameEnd();

    if (endState === 'lose') {
      setTimeout(() => ModalComponent.showLose(gameService.canUndo()), 500);
      return;
    }

    // Check for floor refill
    const refillResult = gameService.checkAndRefillFloor();
    if (refillResult) {
      this.animateFloorRefill(refillResult);
    }

    if (endState === 'win') {
      setTimeout(() => this.handleWin(), 500);
    }
  }

  /**
   * Animate floor refill
   */
  animateFloorRefill(refillResult) {
    const { cards, floorNumber } = refillResult;

    // Render backs first
    const backCards = uiManager.renderFloorBacks(gameService.state);

    // Prepare animation targets
    const targets = cards.map(({ slotIndex }) => {
      const backCard = backCards.find(bc => bc.slotIndex === slotIndex);
      return {
        element: backCard?.element,
        slotIndex,
        onReveal: () => {
          const card = gameService.state.floor[slotIndex];
          if (card) {
            uiManager.revealFloorCard(card, slotIndex);
          }
        },
      };
    });

    // Animate
    animationManager.animateCardDeal(uiManager.getDeckElement(), targets, () => {
      dragDropManager.reattach();
      uiManager.renderRunButton(gameService.state, gameService.settings);
    });

    uiManager.setStatus(`New dungeon floor ${floorNumber}. Drew ${cards.length} cards.`);
  }

  /**
   * Handle deck click (deal first floor)
   */
  handleDeckClick() {
    if (gameService.state.firstFloorDealt) return;

    const result = gameService.dealFirstFloor();
    if (!result) return;

    // Render backs first
    const backCards = uiManager.renderFloorBacks(gameService.state);

    // Prepare animation targets
    const targets = result.cards.map(({ card, slotIndex }) => {
      const backCard = backCards.find(bc => bc.slotIndex === slotIndex);
      return {
        element: backCard?.element,
        slotIndex,
        onReveal: () => {
          uiManager.revealFloorCard(card, slotIndex);
        },
      };
    });

    // Animate
    animationManager.animateCardDeal(uiManager.getDeckElement(), targets, () => {
      dragDropManager.reattach();
      uiManager.renderRunButton(gameService.state, gameService.settings);
      uiManager.renderDeck(gameService.state);
    });
  }

  /**
   * Handle run away action
   */
  async handleRunAway() {
    const result = gameService.handleRunAway();
    if (!result.success) {
      uiManager.setStatus(result.message);
      return;
    }

    // Show popup and animate
    uiManager.render(gameService.state, gameService.settings);
    await animationManager.showRunAwayPopup();

    // Draw new cards
    const newCards = gameService.drawNewFloorAfterRun();

    // Animate new floor
    const backCards = uiManager.renderFloorBacks(gameService.state);
    const targets = newCards.cards.map(({ card, slotIndex }) => {
      const backCard = backCards.find(bc => bc.slotIndex === slotIndex);
      return {
        element: backCard?.element,
        slotIndex,
        onReveal: () => {
          uiManager.revealFloorCard(card, slotIndex);
        },
      };
    });

    animationManager.animateCardDeal(uiManager.getDeckElement(), targets, () => {
      dragDropManager.reattach();
      uiManager.renderRunButton(gameService.state, gameService.settings);
    });

    uiManager.setStatus(result.message);
  }

  /**
   * Handle discard weapon
   */
  handleDiscardWeapon() {
    const result = gameService.handleDiscardWeapon();
    uiManager.setStatus(result.message);
    this.checkGameEndAfterAction();
  }

  /**
   * Handle new game
   */
  async handleNewGame() {
    const confirmed = await ModalComponent.showConfirm({
      icon: '🎲',
      title: 'New Game?',
      message: 'This will shuffle a completely new deck. Ready for a fresh adventure?',
      okText: 'New Game',
      danger: false,
    });

    if (confirmed) {
      gameService.initGame();
    }
  }

  /**
   * Handle restart game
   */
  async handleRestart() {
    const confirmed = await ModalComponent.showConfirm({
      icon: '🔄',
      title: 'Restart Game?',
      message: 'This will restart with the same deck shuffle. Your current progress will be lost.',
      okText: 'Restart',
      danger: false,
    });

    if (confirmed) {
      gameService.restartGame();
    }
  }

  /**
   * Handle undo
   */
  handleUndo() {
    gameService.undo();
    uiManager.setStatus('Undone last action.');
  }

  /**
   * Show settings modal
   */
  showSettings() {
    ModalComponent.updateSettingsUI(gameService.settings);
    ModalComponent.showSettings();
  }

  /**
   * Apply settings and start new game
   */
  applySettings() {
    const newSettings = ModalComponent.readSettingsFromUI();
    Object.assign(gameService.settings, newSettings);
    ModalComponent.hideSettings();
    gameService.initGame();
  }

  /**
   * Handle win
   */
  async handleWin() {
    ModalComponent.showWin();
    gameService.clearSavedState();

    // Record the win
    const mode = gameService.getCurrentDifficultyMode();
    await leaderboardService.recordWin(
      this.currentPlayerName,
      mode,
      gameService.state.floorNumber
    );

    // Trigger celebration
    setTimeout(() => animationManager.triggerWinCelebration(), 100);

    // Refresh leaderboard
    this.loadLeaderboard();
  }
}

// Initialize the app when DOM is ready
const app = new App();
window.addEventListener('DOMContentLoaded', () => app.init());

// Export for potential external use
export { app };


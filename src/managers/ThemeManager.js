/**
 * Theme Manager
 * Handles card themes and game visual themes
 */

import { storageService } from '../services/StorageService.js';
import { CARD_THEMES, GAME_THEMES } from '../config/constants.js';

class ThemeManager {
  constructor() {
    this.currentCardTheme = 'classic';
    this.currentGameTheme = 'dungeon';
  }

  /**
   * Initialize themes from storage
   */
  init() {
    this.currentCardTheme = storageService.getCardTheme();
    this.currentGameTheme = storageService.getGameTheme();

    this.applyCardTheme(this.currentCardTheme);
    this.applyGameTheme(this.currentGameTheme);
  }

  /**
   * Apply a card theme
   * @param {string} theme - Theme name
   */
  applyCardTheme(theme) {
    if (!CARD_THEMES.includes(theme)) {
      theme = 'classic';
    }

    this.currentCardTheme = theme;
    document.documentElement.setAttribute('data-card-theme', theme);
    storageService.saveCardTheme(theme);

    // Update active state in UI
    document.querySelectorAll('#themeSelector .theme-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.theme === theme);
    });
  }

  /**
   * Apply a game visual theme
   * @param {string} theme - Theme name
   */
  applyGameTheme(theme) {
    if (!GAME_THEMES.includes(theme)) {
      theme = 'dungeon';
    }

    this.currentGameTheme = theme;
    document.documentElement.setAttribute('data-game-theme', theme);
    storageService.saveGameTheme(theme);

    // Update active state in UI
    document.querySelectorAll('#gameThemeSelector .theme-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.gameTheme === theme);
    });
  }

  /**
   * Setup theme selector event listeners
   */
  setupSelectors() {
    // Card theme selector
    const cardSelector = document.getElementById('themeSelector');
    if (cardSelector) {
      cardSelector.addEventListener('click', e => {
        const option = e.target.closest('.theme-option');
        if (option && option.dataset.theme) {
          this.applyCardTheme(option.dataset.theme);
        }
      });
    }

    // Game theme selector
    const gameSelector = document.getElementById('gameThemeSelector');
    if (gameSelector) {
      gameSelector.addEventListener('click', e => {
        const option = e.target.closest('.theme-option');
        if (option && option.dataset.gameTheme) {
          this.applyGameTheme(option.dataset.gameTheme);
        }
      });
    }
  }

  /**
   * Get current card theme
   * @returns {string}
   */
  getCardTheme() {
    return this.currentCardTheme;
  }

  /**
   * Get current game theme
   * @returns {string}
   */
  getGameTheme() {
    return this.currentGameTheme;
  }
}

// Export singleton instance
export const themeManager = new ThemeManager();


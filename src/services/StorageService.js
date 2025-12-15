/**
 * Storage Service
 * Handles all localStorage operations with error handling
 */

import { STORAGE_KEYS } from '../config/constants.js';

class StorageService {
  /**
   * Get an item from localStorage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} Parsed value or default
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      console.warn(`Failed to get ${key} from storage:`, e);
      return defaultValue;
    }
  }

  /**
   * Set an item in localStorage
   * @param {string} key - Storage key
   * @param {*} value - Value to store (will be JSON stringified)
   * @returns {boolean} Success status
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Failed to set ${key} in storage:`, e);
      return false;
    }
  }

  /**
   * Set a raw string value (for themes, etc.)
   * @param {string} key - Storage key
   * @param {string} value - String value to store
   * @returns {boolean} Success status
   */
  setRaw(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error(`Failed to set ${key} in storage:`, e);
      return false;
    }
  }

  /**
   * Get a raw string value
   * @param {string} key - Storage key
   * @param {string} defaultValue - Default value
   * @returns {string}
   */
  getRaw(key, defaultValue = '') {
    try {
      return localStorage.getItem(key) || defaultValue;
    } catch (e) {
      console.warn(`Failed to get ${key} from storage:`, e);
      return defaultValue;
    }
  }

  /**
   * Remove an item from localStorage
   * @param {string} key - Storage key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Failed to remove ${key} from storage:`, e);
    }
  }

  /**
   * Check if a key exists in localStorage
   * @param {string} key - Storage key
   * @returns {boolean}
   */
  has(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch (e) {
      return false;
    }
  }

  // ===========================
  // Game-specific convenience methods
  // ===========================

  /**
   * Save game state
   * @param {Object} state - Game state
   * @param {Object} settings - Game settings
   * @param {Array} history - State history
   */
  saveGameState(state, settings, history) {
    const saveData = {
      state: state.toJSON(),
      gameSettings: { ...settings },
      stateHistory: history.map(h => ({
        ...h,
        weaponMaxNext: h.weaponMaxNext === Infinity ? null : h.weaponMaxNext,
      })),
      savedAt: Date.now(),
    };
    this.set(STORAGE_KEYS.GAME_STATE, saveData);
  }

  /**
   * Load game state
   * @returns {Object|null} Saved game data or null
   */
  loadGameState() {
    const data = this.get(STORAGE_KEYS.GAME_STATE);
    if (!data) return null;

    // Fix Infinity serialization in history
    if (data.stateHistory) {
      data.stateHistory = data.stateHistory.map(h => ({
        ...h,
        weaponMaxNext: h.weaponMaxNext === null ? Infinity : h.weaponMaxNext,
      }));
    }

    return data;
  }

  /**
   * Clear saved game state
   */
  clearGameState() {
    this.remove(STORAGE_KEYS.GAME_STATE);
  }

  /**
   * Get card theme
   * @returns {string}
   */
  getCardTheme() {
    return this.getRaw(STORAGE_KEYS.CARD_THEME, 'classic');
  }

  /**
   * Save card theme
   * @param {string} theme
   */
  saveCardTheme(theme) {
    this.setRaw(STORAGE_KEYS.CARD_THEME, theme);
  }

  /**
   * Get game theme
   * @returns {string}
   */
  getGameTheme() {
    return this.getRaw(STORAGE_KEYS.GAME_THEME, 'dungeon');
  }

  /**
   * Save game theme
   * @param {string} theme
   */
  saveGameTheme(theme) {
    this.setRaw(STORAGE_KEYS.GAME_THEME, theme);
  }

  /**
   * Get current player name
   * @returns {string|null}
   */
  getCurrentPlayer() {
    return this.getRaw(STORAGE_KEYS.CURRENT_PLAYER, null);
  }

  /**
   * Save current player name
   * @param {string} name
   */
  saveCurrentPlayer(name) {
    this.setRaw(STORAGE_KEYS.CURRENT_PLAYER, name);
  }

  /**
   * Get menu minimized state
   * @returns {boolean}
   */
  isMenuMinimized() {
    return this.getRaw(STORAGE_KEYS.MENU_MINIMIZED, 'false') === 'true';
  }

  /**
   * Save menu minimized state
   * @param {boolean} minimized
   */
  saveMenuMinimized(minimized) {
    this.setRaw(STORAGE_KEYS.MENU_MINIMIZED, minimized.toString());
  }
}

// Export singleton instance
export const storageService = new StorageService();


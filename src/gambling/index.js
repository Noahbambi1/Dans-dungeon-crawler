/**
 * Dan's Dungeon Crawler - Gambling Module
 * Integrates casino-style betting with the existing card game
 */

import { GamblingUI } from './GamblingUI.js';
import { WalletSystem } from './WalletSystem.js';

let gamblingUI = null;

/**
 * Initialize gambling mode
 * This adds the betting interface around the existing card game
 */
export function initGamblingMode() {
  console.log('🎰 Initializing Gambling Mode...');
  
  // Add gambling mode class to body
  document.body.classList.add('gambling-mode');
  
  // Initialize the gambling UI (adds header bar, modals, etc.)
  gamblingUI = new GamblingUI();
  
  // Expose to window for debugging
  if (typeof window !== 'undefined') {
    window.gamblingUI = gamblingUI;
    window.gamblingWallet = gamblingUI.wallet;
  }
  
  console.log('🎰 Gambling Mode initialized. Place your bets!');
}

export { GamblingUI, WalletSystem };

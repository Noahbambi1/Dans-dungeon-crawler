/**
 * Dan's Dungeon Crawler - Gambling Module
 * Main entry point for the gambling system
 */

export { WalletSystem } from './WalletSystem.js';
export { GamblingEngine, GAMBLING_CONFIG, WIN_RATE_PRESETS, CertifiedRNG, AuditLogger } from './GamblingEngine.js';
export { GamblingUI } from './GamblingUI.js';

// Initialize gambling mode when module is imported
let gamblingUI = null;

export function initGamblingMode() {
  if (!gamblingUI) {
    gamblingUI = new (require('./GamblingUI.js').GamblingUI)();
  }
  return gamblingUI;
}

export function getGamblingUI() {
  return gamblingUI;
}


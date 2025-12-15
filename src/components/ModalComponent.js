/**
 * Modal Component
 * Manages game modals (win, lose, settings, confirm)
 */

import { escapeHtml } from '../utils/helpers.js';

export class ModalComponent {
  /**
   * Show the win modal
   */
  static showWin() {
    const modal = document.getElementById('winModal');
    if (modal) {
      modal.classList.add('show');
    }
  }

  /**
   * Hide the win modal
   */
  static hideWin() {
    const modal = document.getElementById('winModal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  /**
   * Show the lose modal
   * @param {boolean} canUndo - Whether undo is available
   */
  static showLose(canUndo = false) {
    const modal = document.getElementById('loseModal');
    if (modal) {
      modal.classList.add('show');

      const redoBtn = document.getElementById('loseRedoBtn');
      if (redoBtn) {
        redoBtn.disabled = !canUndo;
      }
    }
  }

  /**
   * Hide the lose modal
   */
  static hideLose() {
    const modal = document.getElementById('loseModal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  /**
   * Show the settings modal
   */
  static showSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.add('show');
    }
  }

  /**
   * Hide the settings modal
   */
  static hideSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  /**
   * Show a confirmation modal
   * @param {Object} options - Modal options
   * @returns {Promise<boolean>} Resolves with user's choice
   */
  static showConfirm(options = {}) {
    const {
      icon = '⚠️',
      title = 'Are you sure?',
      message = 'This action cannot be undone.',
      okText = 'Confirm',
      danger = false,
    } = options;

    return new Promise(resolve => {
      const modal = document.getElementById('confirmModal');
      const iconEl = document.getElementById('confirmModalIcon');
      const titleEl = document.getElementById('confirmModalTitle');
      const messageEl = document.getElementById('confirmModalMessage');
      const okBtn = document.getElementById('confirmOkBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');
      const backdrop = modal?.querySelector('.confirm-modal-backdrop');

      if (!modal) {
        resolve(false);
        return;
      }

      iconEl.textContent = icon;
      titleEl.textContent = title;
      messageEl.textContent = message;
      okBtn.textContent = okText;

      if (danger) {
        okBtn.classList.add('danger');
      } else {
        okBtn.classList.remove('danger');
      }

      modal.classList.add('show');

      const cleanup = () => {
        modal.classList.remove('show');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        backdrop?.removeEventListener('click', onCancel);
      };

      const onOk = () => {
        cleanup();
        resolve(true);
      };

      const onCancel = () => {
        cleanup();
        resolve(false);
      };

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      backdrop?.addEventListener('click', onCancel);
    });
  }

  /**
   * Update settings UI from game settings
   * @param {Object} settings - Current game settings
   */
  static updateSettingsUI(settings) {
    const els = {
      maxHealth: document.getElementById('settingMaxHealth'),
      weaponDegradation: document.getElementById('settingWeaponDegradation'),
      maxRuns: document.getElementById('settingMaxRuns'),
      healingMode: document.getElementById('settingHealingMode'),
      includeDiamondRoyals: document.getElementById('settingDiamondRoyals'),
      includeHeartRoyals: document.getElementById('settingHeartRoyals'),
      removeAceMonsters: document.getElementById('settingRemoveAces'),
    };

    if (els.maxHealth) els.maxHealth.value = settings.maxHealth;
    if (els.weaponDegradation) els.weaponDegradation.value = settings.weaponDegradation;
    if (els.maxRuns) els.maxRuns.value = settings.maxRuns;
    if (els.healingMode) els.healingMode.value = settings.healingMode;
    if (els.includeDiamondRoyals) els.includeDiamondRoyals.checked = settings.includeDiamondRoyals;
    if (els.includeHeartRoyals) els.includeHeartRoyals.checked = settings.includeHeartRoyals;
    if (els.removeAceMonsters) els.removeAceMonsters.checked = settings.removeAceMonsters;
  }

  /**
   * Read settings from UI
   * @returns {Object} Settings object
   */
  static readSettingsFromUI() {
    const els = {
      maxHealth: document.getElementById('settingMaxHealth'),
      weaponDegradation: document.getElementById('settingWeaponDegradation'),
      maxRuns: document.getElementById('settingMaxRuns'),
      healingMode: document.getElementById('settingHealingMode'),
      includeDiamondRoyals: document.getElementById('settingDiamondRoyals'),
      includeHeartRoyals: document.getElementById('settingHeartRoyals'),
      removeAceMonsters: document.getElementById('settingRemoveAces'),
    };

    return {
      maxHealth: els.maxHealth ? parseInt(els.maxHealth.value) || 20 : 20,
      weaponDegradation: els.weaponDegradation ? els.weaponDegradation.value : 'strict',
      maxRuns: els.maxRuns ? parseInt(els.maxRuns.value) || 1 : 1,
      healingMode: els.healingMode ? els.healingMode.value : 'once',
      includeDiamondRoyals: els.includeDiamondRoyals ? els.includeDiamondRoyals.checked : false,
      includeHeartRoyals: els.includeHeartRoyals ? els.includeHeartRoyals.checked : false,
      removeAceMonsters: els.removeAceMonsters ? els.removeAceMonsters.checked : false,
    };
  }
}


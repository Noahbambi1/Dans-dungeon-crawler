/**
 * Animation Manager
 * Handles all game animations
 */

import { ANIMATION_DURATIONS } from '../config/constants.js';

class AnimationManager {
  constructor() {
    this.overlay = null;
  }

  /**
   * Initialize the animation manager
   */
  init() {
    this.overlay = document.getElementById('animationOverlay');
  }

  /**
   * Show damage number animation
   * @param {number} amount - Damage amount
   */
  showDamage(amount) {
    if (!this.overlay) return;

    const damageEl = document.createElement('div');
    damageEl.className = 'damage-animation';
    damageEl.textContent = `-${amount}`;
    this.overlay.appendChild(damageEl);

    setTimeout(() => {
      damageEl.classList.add('animate');
      setTimeout(() => damageEl.remove(), ANIMATION_DURATIONS.damageFloat);
    }, 10);
  }

  /**
   * Show heal number animation
   * @param {number} amount - Heal amount
   */
  showHeal(amount) {
    if (!this.overlay) return;

    const healEl = document.createElement('div');
    healEl.className = 'heal-animation';
    healEl.textContent = `+${amount}`;
    this.overlay.appendChild(healEl);

    setTimeout(() => {
      healEl.classList.add('animate');
      setTimeout(() => healEl.remove(), ANIMATION_DURATIONS.damageFloat);
    }, 10);
  }

  /**
   * Show fight animation at monster position
   * @param {Element} weaponEl - Weapon card element
   * @param {Element} monsterEl - Monster card element
   */
  showFight(weaponEl, monsterEl) {
    if (!monsterEl) return;

    const monsterRect = monsterEl.getBoundingClientRect();

    const fightEl = document.createElement('div');
    fightEl.className = 'fight-animation';
    fightEl.style.position = 'fixed';
    fightEl.style.left = `${monsterRect.left + monsterRect.width / 2}px`;
    fightEl.style.top = `${monsterRect.top + monsterRect.height / 2}px`;
    fightEl.style.transform = 'translate(-50%, -50%)';
    fightEl.textContent = '⚔️';
    document.body.appendChild(fightEl);

    setTimeout(() => {
      fightEl.classList.add('animate');
      setTimeout(() => fightEl.remove(), ANIMATION_DURATIONS.fightPop);
    }, 10);
  }

  /**
   * Animate card drawing from deck to floor
   * @param {Element} deckEl - Deck element
   * @param {Element[]} targetSlots - Target slot elements
   * @param {Function} onComplete - Callback when animation completes
   */
  animateCardDeal(deckEl, targetSlots, onComplete) {
    if (!deckEl) {
      onComplete?.();
      return;
    }

    const deckRect = deckEl.getBoundingClientRect();

    targetSlots.forEach((slot, index) => {
      const backCardEl = slot.element;
      if (!backCardEl) return;

      const cardRect = backCardEl.getBoundingClientRect();

      // Create animated card
      const tempCard = document.createElement('div');
      tempCard.className = 'card back';
      tempCard.style.position = 'fixed';
      tempCard.style.left = `${deckRect.left}px`;
      tempCard.style.top = `${deckRect.top}px`;
      tempCard.style.width = `${deckRect.width}px`;
      tempCard.style.height = `${deckRect.height}px`;
      tempCard.style.zIndex = '10000';
      tempCard.style.pointerEvents = 'none';
      tempCard.style.opacity = '0';
      tempCard.style.transform = 'rotate(0deg)';
      document.body.appendChild(tempCard);

      setTimeout(() => {
        requestAnimationFrame(() => {
          tempCard.style.transition = `all ${ANIMATION_DURATIONS.cardDraw}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
          tempCard.style.left = `${cardRect.left}px`;
          tempCard.style.top = `${cardRect.top}px`;
          tempCard.style.width = `${cardRect.width}px`;
          tempCard.style.height = `${cardRect.height}px`;
          tempCard.style.opacity = '1';
          tempCard.style.transform = 'rotate(360deg)';
          backCardEl.style.opacity = '1';
        });

        setTimeout(() => {
          tempCard.remove();
          slot.onReveal?.();

          // Call complete callback after last card
          if (index === targetSlots.length - 1) {
            setTimeout(() => onComplete?.(), ANIMATION_DURATIONS.cardReveal);
          }
        }, ANIMATION_DURATIONS.cardDraw);
      }, index * ANIMATION_DURATIONS.cardDealStagger);
    });
  }

  /**
   * Show the run away popup
   * @returns {Promise} Resolves when animation completes
   */
  showRunAwayPopup() {
    return new Promise(resolve => {
      const popup = document.getElementById('runAwayPopup');
      if (!popup) {
        resolve();
        return;
      }

      popup.classList.add('show');
      setTimeout(() => {
        popup.classList.remove('show');
        resolve();
      }, ANIMATION_DURATIONS.runAwayPopup);
    });
  }

  /**
   * Animate card reveal (flip)
   * @param {Element} cardEl - Card element
   */
  animateCardReveal(cardEl) {
    if (!cardEl) return;
    cardEl.classList.add('drawing');
    setTimeout(() => cardEl.classList.remove('drawing'), ANIMATION_DURATIONS.cardReveal);
  }

  /**
   * Trigger win celebration streamers
   */
  triggerWinCelebration() {
    document.querySelectorAll('.streamer').forEach((streamer, index) => {
      setTimeout(() => streamer.classList.add('animate'), index * 100);
    });
  }

  /**
   * Reset win celebration
   */
  resetWinCelebration() {
    document.querySelectorAll('.streamer').forEach(streamer => {
      streamer.classList.remove('animate');
    });
  }
}

// Export singleton instance
export const animationManager = new AnimationManager();


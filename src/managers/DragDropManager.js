/**
 * Drag and Drop Manager
 * Handles drag-and-drop and touch interactions for cards
 */

class DragDropManager {
  constructor() {
    this.onCardDrop = null; // Callback: (cardId, from, target) => void
    this.findCardById = null; // Callback: (id, from) => card
    
    // Touch drag state
    this.touchState = {
      draggedCard: null,
      draggedElement: null,
      clone: null,
      startX: 0,
      startY: 0,
      from: null,
    };
  }

  /**
   * Initialize drag and drop handlers
   */
  init() {
    this.setupTouchHandlers();
    this.attachDropTargets();
  }

  /**
   * Attach drag listeners to all cards
   */
  attachCardListeners() {
    document.querySelectorAll('.card').forEach(cardEl => {
      if (!cardEl.draggable) return;

      cardEl.addEventListener('dragstart', e => {
        const payload = {
          id: cardEl.dataset.cardId,
          from: cardEl.dataset.from || 'floor',
        };
        e.dataTransfer.setData('application/json', JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'move';
      });
    });
  }

  /**
   * Attach listeners to drop targets
   */
  attachDropTargets() {
    document.querySelectorAll('.drop-target').forEach(target => {
      target.removeEventListener('dragover', this.handleDragOver);
      target.removeEventListener('dragleave', this.handleDragLeave);
      target.removeEventListener('drop', this.handleDrop);

      target.addEventListener('dragover', this.handleDragOver.bind(this));
      target.addEventListener('dragleave', this.handleDragLeave.bind(this));
      target.addEventListener('drop', this.handleDrop.bind(this));
    });
  }

  /**
   * Handle drag over
   * @param {DragEvent} e
   */
  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('highlight');
  }

  /**
   * Handle drag leave
   * @param {DragEvent} e
   */
  handleDragLeave(e) {
    e.currentTarget.classList.remove('highlight');
  }

  /**
   * Handle drop
   * @param {DragEvent} e
   */
  handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('highlight');

    const payload = this.safeParse(e.dataTransfer.getData('application/json'));
    if (!payload) return;

    const target = e.currentTarget.dataset.drop;
    this.onCardDrop?.(payload.id, payload.from, target);
  }

  /**
   * Setup touch drag and drop handlers
   */
  setupTouchHandlers() {
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
  }

  /**
   * Handle touch start
   * @param {TouchEvent} e
   */
  handleTouchStart(e) {
    const cardEl = e.target.closest('.card');
    if (!cardEl || !cardEl.draggable) return;

    e.preventDefault();

    const touch = e.touches[0];
    const cardId = cardEl.dataset.cardId;
    const from = cardEl.dataset.from || 'floor';

    this.touchState.draggedCard = this.findCardById?.(cardId, from);
    this.touchState.draggedElement = cardEl;
    this.touchState.from = from;
    this.touchState.startX = touch.clientX;
    this.touchState.startY = touch.clientY;

    // Create visual clone
    const clone = cardEl.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '10000';
    clone.style.opacity = '0.9';
    clone.style.transform = 'scale(1.1)';
    clone.style.left = `${touch.clientX - cardEl.offsetWidth / 2}px`;
    clone.style.top = `${touch.clientY - cardEl.offsetHeight / 2}px`;
    clone.style.width = `${cardEl.offsetWidth}px`;
    clone.style.height = `${cardEl.offsetHeight}px`;
    document.body.appendChild(clone);

    this.touchState.clone = clone;
    cardEl.style.opacity = '0.3';
  }

  /**
   * Handle touch move
   * @param {TouchEvent} e
   */
  handleTouchMove(e) {
    if (!this.touchState.clone) return;

    e.preventDefault();

    const touch = e.touches[0];
    const cardEl = this.touchState.draggedElement;

    this.touchState.clone.style.left = `${touch.clientX - cardEl.offsetWidth / 2}px`;
    this.touchState.clone.style.top = `${touch.clientY - cardEl.offsetHeight / 2}px`;

    // Highlight drop targets under touch
    const dropTarget = this.findDropTargetUnderTouch(touch.clientX, touch.clientY);
    document.querySelectorAll('.drop-target').forEach(target => {
      target.classList.remove('highlight');
    });
    if (dropTarget) {
      dropTarget.classList.add('highlight');
    }
  }

  /**
   * Handle touch end
   * @param {TouchEvent} e
   */
  handleTouchEnd(e) {
    if (!this.touchState.clone) return;

    e.preventDefault();

    const touch = e.changedTouches[0];
    const dropTarget = this.findDropTargetUnderTouch(touch.clientX, touch.clientY);

    // Clean up
    this.touchState.clone.remove();
    if (this.touchState.draggedElement) {
      this.touchState.draggedElement.style.opacity = '1';
    }

    document.querySelectorAll('.drop-target').forEach(target => {
      target.classList.remove('highlight');
    });

    // Handle drop
    if (dropTarget && this.touchState.draggedCard) {
      const targetType = dropTarget.dataset.drop;
      this.onCardDrop?.(this.touchState.draggedCard.id, this.touchState.from, targetType);
    }

    // Reset state
    this.touchState = {
      draggedCard: null,
      draggedElement: null,
      clone: null,
      startX: 0,
      startY: 0,
      from: null,
    };
  }

  /**
   * Find drop target element under touch coordinates
   * @param {number} x
   * @param {number} y
   * @returns {Element|null}
   */
  findDropTargetUnderTouch(x, y) {
    const elements = document.elementsFromPoint(x, y);
    for (const element of elements) {
      if (element.classList.contains('drop-target')) {
        return element;
      }
      const dropTarget = element.closest('.drop-target');
      if (dropTarget) {
        return dropTarget;
      }
    }
    return null;
  }

  /**
   * Safe JSON parse
   * @param {string} str
   * @returns {Object|null}
   */
  safeParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  /**
   * Reattach all listeners after render
   */
  reattach() {
    this.attachCardListeners();
    this.attachDropTargets();
  }
}

// Export singleton instance
export const dragDropManager = new DragDropManager();


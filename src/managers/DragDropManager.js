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
    
    // Bind event handlers once so we can properly remove them
    this.boundHandleDragOver = this.handleDragOver.bind(this);
    this.boundHandleDragLeave = this.handleDragLeave.bind(this);
    this.boundHandleDrop = this.handleDrop.bind(this);
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

      // Remove existing handler if present
      if (cardEl._dragStartHandler) {
        cardEl.removeEventListener('dragstart', cardEl._dragStartHandler);
      }
      
      // Create and store the handler
      cardEl._dragStartHandler = e => {
        const payload = {
          id: cardEl.dataset.cardId,
          from: cardEl.dataset.from || 'floor',
        };
        e.dataTransfer.setData('application/json', JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'move';
        
        // Create a custom drag image
        const dragImage = cardEl.cloneNode(true);
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-9999px';
        dragImage.style.left = '-9999px';
        dragImage.style.opacity = '1';
        dragImage.style.transform = 'rotate(5deg) scale(1.05)';
        dragImage.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        document.body.appendChild(dragImage);
        
        const rect = cardEl.getBoundingClientRect();
        e.dataTransfer.setDragImage(dragImage, rect.width / 2, rect.height / 2);
        
        cardEl.classList.add('dragging');
        
        setTimeout(() => dragImage.remove(), 0);
      };
      
      cardEl.addEventListener('dragstart', cardEl._dragStartHandler);
      
      // Handle drag end
      if (cardEl._dragEndHandler) {
        cardEl.removeEventListener('dragend', cardEl._dragEndHandler);
      }
      cardEl._dragEndHandler = () => cardEl.classList.remove('dragging');
      cardEl.addEventListener('dragend', cardEl._dragEndHandler);
    });
  }

  /**
   * Attach listeners to drop targets
   */
  attachDropTargets() {
    document.querySelectorAll('.drop-target').forEach(target => {
      // Use the bound handlers so remove works correctly
      target.removeEventListener('dragover', this.boundHandleDragOver);
      target.removeEventListener('dragleave', this.boundHandleDragLeave);
      target.removeEventListener('drop', this.boundHandleDrop);

      target.addEventListener('dragover', this.boundHandleDragOver);
      target.addEventListener('dragleave', this.boundHandleDragLeave);
      target.addEventListener('drop', this.boundHandleDrop);
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


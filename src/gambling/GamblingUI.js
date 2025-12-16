/**
 * Dan's Dungeon Crawler - Gambling UI System
 * Integrates casino-style betting around the existing card game
 * 
 * The player places a bet, plays the actual card game,
 * and wins/loses based on the outcome of their dungeon run.
 */

import { WalletSystem } from './WalletSystem.js';

export class GamblingUI {
  constructor() {
    this.wallet = new WalletSystem();
    this.currentBet = 1.00;
    this.selectedMode = 'standard';
    this.gameInProgress = false;
    this.currentRoundId = null;
    this.betPlaced = false;
    
    // Payout multipliers based on mode (all achieve ~96% RTP)
    this.modes = {
      casual: {
        name: 'Casual',
        description: 'Easy mode - Higher win chance, smaller payouts',
        payoutMultiplier: 1.5,
        icon: '🎯',
        difficulty: 'casual',
        minBet: 0.10,
      },
      standard: {
        name: 'Standard',
        description: 'Normal difficulty - Balanced risk/reward',
        payoutMultiplier: 5,
        icon: '🎰',
        difficulty: 'normal',
        minBet: 0.50,
      },
      hard: {
        name: 'Hard',
        description: 'Hard mode - Lower win chance, bigger payouts',
        payoutMultiplier: 15,
        icon: '⚔️',
        difficulty: 'hard',
        minBet: 1.00,
      },
      brutal: {
        name: 'Brutal',
        description: 'Original brutal mode - Rare wins, massive payouts',
        payoutMultiplier: 100,
        icon: '💀',
        difficulty: 'brutal',
        minBet: 5.00,
      },
    };
    
    this.betPresets = [0.50, 1.00, 2.00, 5.00, 10.00, 25.00, 50.00, 100.00];
    
    this.init();
  }
  
  init() {
    this.createGamblingHeader();
    this.createBettingPanel();
    this.createModals();
    this.attachEventListeners();
    this.hookIntoGame();
    this.updateDisplay();
    
    // Check initial state
    setTimeout(() => {
      if (this.wallet.isWelcomeBonusAvailable()) {
        // New player - show welcome bonus
        this.showWelcomeBonusModal();
      } else if (this.wallet.getBalance() > 0) {
        // Returning player with balance - show betting panel
        this.showBettingPanel();
        this.updateStatus('Welcome back! Place your bet to start a new game.');
      } else {
        // Returning player with no balance - prompt deposit
        this.showModal('depositModal');
        this.updateStatus('Deposit credits to continue playing.');
      }
    }, 500);
  }
  
  /**
   * Create the gambling header bar with wallet info
   */
  createGamblingHeader() {
    const header = document.createElement('div');
    header.id = 'gamblingHeader';
    header.className = 'gambling-header-bar';
    header.innerHTML = `
      <div class="gambling-header-content">
        <div class="wallet-section">
          <div class="wallet-icon">💰</div>
          <div class="wallet-info">
            <span class="wallet-label">Balance</span>
            <span class="wallet-balance" id="walletBalance">€0.00</span>
          </div>
          <button class="deposit-btn" id="depositBtn">
            <span>+</span> Deposit
          </button>
        </div>
        
        <div class="bet-info-section">
          <div class="current-bet-display">
            <span class="bet-label">Current Bet</span>
            <span class="bet-value" id="currentBetDisplay">€1.00</span>
          </div>
          <div class="potential-win-display">
            <span class="win-label">Win Pays</span>
            <span class="win-value" id="potentialWinDisplay">€5.00</span>
          </div>
        </div>
        
        <div class="mode-display">
          <span class="mode-icon" id="modeIcon">🎰</span>
          <span class="mode-name" id="modeName">Standard</span>
        </div>
        
        <div class="header-actions">
          <button class="header-btn" id="changeBetBtn" title="Change Bet">🎲</button>
          <button class="header-btn" id="historyBtn" title="History">📜</button>
          <button class="header-btn" id="statsBtn" title="Stats">📊</button>
        </div>
      </div>
      
      <div class="game-status-bar" id="gameStatusBar">
        <span class="status-text" id="gamblingStatus">Place your bet and start a new game!</span>
      </div>
    `;
    
    // Insert at the very top of the app
    const app = document.getElementById('app');
    app.insertBefore(header, app.firstChild);
  }
  
  /**
   * Create the betting panel (shown when changing bet)
   */
  createBettingPanel() {
    const panel = document.createElement('div');
    panel.id = 'bettingPanel';
    panel.className = 'betting-panel';
    panel.innerHTML = `
      <div class="betting-panel-backdrop"></div>
      <div class="betting-panel-content">
        <button class="close-panel-btn" id="closeBettingPanel">✕</button>
        <h2>🎰 Place Your Bet</h2>
        
        <div class="mode-selection">
          <h3>Select Difficulty</h3>
          <p class="mode-hint">Harder modes have bigger payouts but are harder to win!</p>
          <div class="mode-grid" id="modeGrid">
            ${Object.entries(this.modes).map(([key, mode]) => `
              <button class="mode-option ${key === this.selectedMode ? 'active' : ''}" data-mode="${key}">
                <span class="mode-option-icon">${mode.icon}</span>
                <span class="mode-option-name">${mode.name}</span>
                <span class="mode-option-payout">${mode.payoutMultiplier}x payout</span>
                <span class="mode-option-desc">${mode.description}</span>
              </button>
            `).join('')}
          </div>
        </div>
        
        <div class="bet-selection">
          <h3>Bet Amount</h3>
          <div class="bet-adjuster">
            <button class="bet-adj-btn" id="betDecrease">−</button>
            <div class="bet-input-wrapper">
              <span class="currency">€</span>
              <input type="number" id="betAmountInput" value="${this.currentBet.toFixed(2)}" min="0.10" max="500" step="0.10">
            </div>
            <button class="bet-adj-btn" id="betIncrease">+</button>
          </div>
          
          <div class="bet-presets">
            ${this.betPresets.map(bet => `
              <button class="bet-preset ${bet === this.currentBet ? 'active' : ''}" data-bet="${bet}">€${bet.toFixed(2)}</button>
            `).join('')}
          </div>
          
          <div class="bet-shortcuts">
            <button class="shortcut" id="betMin">MIN</button>
            <button class="shortcut" id="betHalf">½</button>
            <button class="shortcut" id="betDouble">2×</button>
            <button class="shortcut" id="betMax">MAX</button>
          </div>
        </div>
        
        <div class="bet-summary">
          <div class="summary-row">
            <span>Your Bet:</span>
            <span id="summaryBet">€1.00</span>
          </div>
          <div class="summary-row highlight">
            <span>Win Pays:</span>
            <span id="summaryWin">€5.00</span>
          </div>
          <div class="summary-row small">
            <span>Mode:</span>
            <span id="summaryMode">Standard (5x)</span>
          </div>
        </div>
        
        <button class="confirm-bet-btn" id="confirmBetBtn">
          <span>✓</span> Confirm & Start Game
        </button>
        
        <p class="rtp-notice">Return to Player: 96% | Responsible Gaming applies</p>
      </div>
    `;
    
    document.body.appendChild(panel);
  }
  
  /**
   * Create all modals
   */
  createModals() {
    const modalsContainer = document.createElement('div');
    modalsContainer.id = 'gamblingModals';
    modalsContainer.innerHTML = `
      <!-- Welcome Bonus Modal -->
      <div id="welcomeBonusModal" class="gambling-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content welcome-bonus-content">
          <div class="bonus-animation">
            <div class="coin coin-1">💰</div>
            <div class="coin coin-2">💰</div>
            <div class="coin coin-3">💰</div>
          </div>
          <h2>🎰 Welcome to Casino Mode! 🎰</h2>
          <div class="bonus-amount">€1,000</div>
          <p class="bonus-description">Claim your welcome bonus to start playing!</p>
          <p class="bonus-disclaimer">Demo credits for entertainment only. No real money.</p>
          <button class="claim-bonus-btn" id="claimBonusBtn">
            <span>🎁</span> CLAIM BONUS
          </button>
        </div>
      </div>
      
      <!-- Win Modal -->
      <div id="gamblingWinModal" class="gambling-modal win-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content win-content">
          <div class="win-celebration">
            <div class="confetti"></div>
          </div>
          <h2 class="win-title">🎉 YOU WIN! 🎉</h2>
          <div class="win-amount" id="winAmount">€0.00</div>
          <div class="win-multiplier" id="winMultiplier">5x multiplier</div>
          <div class="win-details">
            <span>Bet: <span id="winBet">€1.00</span></span>
            <span>Mode: <span id="winMode">Standard</span></span>
          </div>
          <button class="collect-btn" id="collectWinBtn">COLLECT WINNINGS</button>
        </div>
      </div>
      
      <!-- Lose Modal -->
      <div id="gamblingLoseModal" class="gambling-modal lose-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content lose-content">
          <h2 class="lose-title">💀 Game Over 💀</h2>
          <p class="lose-message">Better luck next time!</p>
          <div class="lose-amount" id="loseAmount">-€1.00</div>
          <div class="lose-balance">Balance: <span id="loseBalance">€999.00</span></div>
          <button class="try-again-btn" id="tryAgainBtn">Try Again</button>
        </div>
      </div>
      
      <!-- Deposit Modal -->
      <div id="depositModal" class="gambling-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content deposit-content">
          <button class="close-modal-btn" data-close="depositModal">✕</button>
          <h2>💰 Add Demo Credits</h2>
          <div class="deposit-presets">
            <button class="deposit-preset" data-amount="100">€100</button>
            <button class="deposit-preset" data-amount="250">€250</button>
            <button class="deposit-preset" data-amount="500">€500</button>
            <button class="deposit-preset" data-amount="1000">€1,000</button>
          </div>
          <p class="deposit-note">Demo credits only - no real money</p>
        </div>
      </div>
      
      <!-- Stats Modal -->
      <div id="statsModal" class="gambling-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content stats-content">
          <button class="close-modal-btn" data-close="statsModal">✕</button>
          <h2>📊 Session Statistics</h2>
          <div class="stats-grid" id="statsGrid"></div>
        </div>
      </div>
      
      <!-- History Modal -->
      <div id="historyModal" class="gambling-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content history-content">
          <button class="close-modal-btn" data-close="historyModal">✕</button>
          <h2>📜 Game History</h2>
          <div class="history-list" id="historyList"></div>
        </div>
      </div>
      
      <!-- Insufficient Funds Modal -->
      <div id="insufficientFundsModal" class="gambling-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content insufficient-content">
          <h2>⚠️ Insufficient Balance</h2>
          <p>You don't have enough credits for this bet.</p>
          <p>Balance: <span id="insufficientBalance">€0.00</span></p>
          <div class="insufficient-actions">
            <button class="deposit-now-btn" id="depositNowBtn">Deposit More</button>
            <button class="lower-bet-btn" id="lowerBetBtn">Lower Bet</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modalsContainer);
  }
  
  /**
   * Hook into the existing game's win/lose system
   */
  hookIntoGame() {
    // Override the win modal handler
    const originalWinModal = document.getElementById('winModal');
    const originalLoseModal = document.getElementById('loseModal');
    
    // Watch for the original win modal to show
    if (originalWinModal) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (originalWinModal.classList.contains('show') && this.betPlaced) {
              // Hide original modal and show gambling win modal
              setTimeout(() => {
                originalWinModal.classList.remove('show');
                this.handleWin();
              }, 100);
            }
          }
        });
      });
      observer.observe(originalWinModal, { attributes: true });
    }
    
    // Watch for the original lose modal to show
    if (originalLoseModal) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (originalLoseModal.classList.contains('show') && this.betPlaced) {
              // Hide original modal and show gambling lose modal
              setTimeout(() => {
                originalLoseModal.classList.remove('show');
                this.handleLose();
              }, 100);
            }
          }
        });
      });
      observer.observe(originalLoseModal, { attributes: true });
    }
    
    // Hook into the new game button
    const newGameBtn = document.getElementById('newGameButton');
    const winNewGameBtn = document.getElementById('winNewGameBtn');
    const loseNewGameBtn = document.getElementById('loseNewGameBtn');
    
    // Intercept new game requests
    [newGameBtn, winNewGameBtn, loseNewGameBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          if (!this.betPlaced) {
            e.stopPropagation();
            e.preventDefault();
            this.showBettingPanel();
          }
        }, true);
      }
    });
    
    // Also intercept restart
    const restartBtn = document.getElementById('restartButton');
    const loseRestartBtn = document.getElementById('loseRestartBtn');
    [restartBtn, loseRestartBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          if (!this.betPlaced && this.wallet.getBalance() >= this.currentBet) {
            // Place bet on restart too
            this.placeBetAndStart();
          }
        }, true);
      }
    });
  }
  
  attachEventListeners() {
    // Deposit button
    document.getElementById('depositBtn')?.addEventListener('click', () => this.showModal('depositModal'));
    
    // Change bet button
    document.getElementById('changeBetBtn')?.addEventListener('click', () => this.showBettingPanel());
    
    // History and stats
    document.getElementById('historyBtn')?.addEventListener('click', () => this.showHistory());
    document.getElementById('statsBtn')?.addEventListener('click', () => this.showStats());
    
    // Betting panel
    document.getElementById('closeBettingPanel')?.addEventListener('click', () => this.hideBettingPanel());
    document.querySelector('.betting-panel-backdrop')?.addEventListener('click', () => this.hideBettingPanel());
    
    // Mode selection
    document.getElementById('modeGrid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.mode-option');
      if (btn) {
        this.selectMode(btn.dataset.mode);
      }
    });
    
    // Bet adjustments
    document.getElementById('betDecrease')?.addEventListener('click', () => this.adjustBet(-0.50));
    document.getElementById('betIncrease')?.addEventListener('click', () => this.adjustBet(0.50));
    document.getElementById('betAmountInput')?.addEventListener('change', (e) => this.setBet(parseFloat(e.target.value)));
    
    // Bet presets
    document.querySelectorAll('.bet-preset').forEach(btn => {
      btn.addEventListener('click', () => this.setBet(parseFloat(btn.dataset.bet)));
    });
    
    // Bet shortcuts
    document.getElementById('betMin')?.addEventListener('click', () => this.setBet(this.modes[this.selectedMode].minBet));
    document.getElementById('betMax')?.addEventListener('click', () => this.setBet(Math.min(500, this.wallet.getBalance())));
    document.getElementById('betHalf')?.addEventListener('click', () => this.setBet(this.currentBet / 2));
    document.getElementById('betDouble')?.addEventListener('click', () => this.setBet(this.currentBet * 2));
    
    // Confirm bet
    document.getElementById('confirmBetBtn')?.addEventListener('click', () => this.placeBetAndStart());
    
    // Welcome bonus
    document.getElementById('claimBonusBtn')?.addEventListener('click', () => this.claimWelcomeBonus());
    
    // Collect win
    document.getElementById('collectWinBtn')?.addEventListener('click', () => {
      this.hideModal('gamblingWinModal');
      this.betPlaced = false;
      this.updateStatus('Place your bet for the next game!');
    });
    
    // Try again after loss
    document.getElementById('tryAgainBtn')?.addEventListener('click', () => {
      this.hideModal('gamblingLoseModal');
      this.betPlaced = false;
      this.showBettingPanel();
    });
    
    // Deposit presets
    document.querySelectorAll('.deposit-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        this.deposit(parseFloat(btn.dataset.amount));
        this.hideModal('depositModal');
      });
    });
    
    // Insufficient funds actions
    document.getElementById('depositNowBtn')?.addEventListener('click', () => {
      this.hideModal('insufficientFundsModal');
      this.showModal('depositModal');
    });
    document.getElementById('lowerBetBtn')?.addEventListener('click', () => {
      this.hideModal('insufficientFundsModal');
      this.setBet(this.wallet.getBalance());
      this.showBettingPanel();
    });
    
    // Close modal buttons
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => this.hideModal(btn.dataset.close));
    });
    
    document.querySelectorAll('.gambling-modal .modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', () => {
        const modal = backdrop.closest('.gambling-modal');
        if (modal && !modal.id.includes('welcome') && !modal.id.includes('Win') && !modal.id.includes('Lose')) {
          this.hideModal(modal.id);
        }
      });
    });
  }
  
  selectMode(mode) {
    this.selectedMode = mode;
    
    // Update UI
    document.querySelectorAll('.mode-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Update minimum bet
    const minBet = this.modes[mode].minBet;
    if (this.currentBet < minBet) {
      this.setBet(minBet);
    }
    
    this.updateDisplay();
    this.updateBettingSummary();
  }
  
  adjustBet(delta) {
    this.setBet(this.currentBet + delta);
  }
  
  setBet(amount) {
    const mode = this.modes[this.selectedMode];
    amount = Math.max(mode.minBet, Math.min(500, amount));
    amount = Math.round(amount * 100) / 100;
    
    this.currentBet = amount;
    
    // Update input
    const input = document.getElementById('betAmountInput');
    if (input) input.value = amount.toFixed(2);
    
    // Update preset buttons
    document.querySelectorAll('.bet-preset').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.bet) === amount);
    });
    
    this.updateDisplay();
    this.updateBettingSummary();
  }
  
  updateDisplay() {
    const mode = this.modes[this.selectedMode];
    const potentialWin = this.currentBet * mode.payoutMultiplier;
    
    // Update header
    document.getElementById('walletBalance').textContent = this.wallet.getFormattedBalance();
    document.getElementById('currentBetDisplay').textContent = `€${this.currentBet.toFixed(2)}`;
    document.getElementById('potentialWinDisplay').textContent = `€${potentialWin.toFixed(2)}`;
    document.getElementById('modeIcon').textContent = mode.icon;
    document.getElementById('modeName').textContent = mode.name;
    
    // Update session stats
    const stats = this.wallet.getSessionStats();
    const sessionRTP = document.getElementById('sessionRTP');
    if (sessionRTP) {
      sessionRTP.textContent = stats.rtp;
    }
  }
  
  updateBettingSummary() {
    const mode = this.modes[this.selectedMode];
    const potentialWin = this.currentBet * mode.payoutMultiplier;
    
    document.getElementById('summaryBet').textContent = `€${this.currentBet.toFixed(2)}`;
    document.getElementById('summaryWin').textContent = `€${potentialWin.toFixed(2)}`;
    document.getElementById('summaryMode').textContent = `${mode.name} (${mode.payoutMultiplier}x)`;
  }
  
  updateStatus(message) {
    const status = document.getElementById('gamblingStatus');
    if (status) {
      status.textContent = message;
    }
  }
  
  showBettingPanel() {
    const panel = document.getElementById('bettingPanel');
    if (panel) {
      panel.classList.add('show');
      this.updateBettingSummary();
    }
  }
  
  hideBettingPanel() {
    const panel = document.getElementById('bettingPanel');
    if (panel) {
      panel.classList.remove('show');
    }
  }
  
  placeBetAndStart() {
    // Check balance
    if (this.wallet.getBalance() < this.currentBet) {
      document.getElementById('insufficientBalance').textContent = this.wallet.getFormattedBalance();
      this.showModal('insufficientFundsModal');
      return;
    }
    
    // Place the bet
    const result = this.wallet.placeBet(this.currentBet, this.selectedMode, this.generateRoundId());
    if (!result.success) {
      this.showNotification(result.error, 'error');
      return;
    }
    
    this.betPlaced = true;
    this.currentRoundId = result.transaction.roundId;
    this.hideBettingPanel();
    this.updateDisplay();
    
    const mode = this.modes[this.selectedMode];
    this.updateStatus(`Bet placed: €${this.currentBet.toFixed(2)} on ${mode.name} mode. Clear the dungeon to win €${(this.currentBet * mode.payoutMultiplier).toFixed(2)}!`);
    
    // Apply the difficulty preset to match the mode
    this.applyDifficultyForMode();
    
    // Trigger new game
    this.triggerNewGame();
  }
  
  applyDifficultyForMode() {
    const mode = this.modes[this.selectedMode];
    
    // Find and click the appropriate difficulty preset button
    const presetBtn = document.querySelector(`[data-preset="${mode.difficulty}"]`);
    if (presetBtn) {
      presetBtn.click();
    }
  }
  
  triggerNewGame() {
    // Find the new game button and click it programmatically
    // But skip the betting panel since bet is already placed
    const newGameBtn = document.getElementById('newGameButton');
    if (newGameBtn) {
      // Temporarily remove our listener
      this.betPlaced = true; // Make sure we don't intercept this click
      newGameBtn.click();
    }
  }
  
  handleWin() {
    const mode = this.modes[this.selectedMode];
    const winAmount = this.currentBet * mode.payoutMultiplier;
    
    // Credit the win
    this.wallet.creditWin(winAmount, this.currentRoundId, mode.payoutMultiplier);
    
    // Show win modal
    document.getElementById('winAmount').textContent = `€${winAmount.toFixed(2)}`;
    document.getElementById('winMultiplier').textContent = `${mode.payoutMultiplier}x multiplier`;
    document.getElementById('winBet').textContent = `€${this.currentBet.toFixed(2)}`;
    document.getElementById('winMode').textContent = mode.name;
    
    this.showModal('gamblingWinModal');
    this.updateDisplay();
    
    this.showNotification(`🎉 You won €${winAmount.toFixed(2)}!`, 'success');
  }
  
  handleLose() {
    // Record the loss
    this.wallet.recordLoss(this.currentBet, this.currentRoundId);
    
    // Show lose modal
    document.getElementById('loseAmount').textContent = `-€${this.currentBet.toFixed(2)}`;
    document.getElementById('loseBalance').textContent = this.wallet.getFormattedBalance();
    
    this.showModal('gamblingLoseModal');
    this.updateDisplay();
  }
  
  generateRoundId() {
    return 'round_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  }
  
  showWelcomeBonusModal() {
    this.showModal('welcomeBonusModal');
  }
  
  claimWelcomeBonus() {
    const result = this.wallet.claimWelcomeBonus();
    this.hideModal('welcomeBonusModal');
    
    if (result.success) {
      this.updateDisplay();
      this.showNotification('🎉 €1,000 Welcome Bonus claimed!', 'success');
      this.updateStatus('Welcome bonus claimed! Place your bet to start playing.');
    } else {
      // Bonus was already claimed, just show the betting panel
      this.updateDisplay();
      this.showNotification('Bonus already claimed. Place your bet!', 'info');
    }
    
    // Show the betting panel after claiming
    setTimeout(() => this.showBettingPanel(), 500);
  }
  
  deposit(amount) {
    const result = this.wallet.deposit(amount);
    if (result.success) {
      this.updateDisplay();
      this.showNotification(`€${amount.toFixed(2)} added to your balance!`, 'success');
    }
  }
  
  showHistory() {
    const list = document.getElementById('historyList');
    const transactions = this.wallet.getTransactionHistory(30);
    
    if (transactions.length === 0) {
      list.innerHTML = '<div class="empty-history">No transactions yet</div>';
    } else {
      list.innerHTML = transactions.map(tx => `
        <div class="history-item ${tx.type}">
          <div class="history-icon">${tx.type === 'win' ? '🏆' : tx.type === 'bet' ? '🎲' : tx.type === 'deposit' ? '💰' : '📋'}</div>
          <div class="history-details">
            <div class="history-type">${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</div>
            <div class="history-time">${new Date(tx.timestamp).toLocaleString()}</div>
          </div>
          <div class="history-amount ${tx.type === 'bet' ? 'negative' : 'positive'}">
            ${tx.type === 'bet' ? '-' : '+'}€${tx.amount.toFixed(2)}
          </div>
        </div>
      `).join('');
    }
    
    this.showModal('historyModal');
  }
  
  showStats() {
    const stats = this.wallet.getSessionStats();
    const grid = document.getElementById('statsGrid');
    
    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">🎮</div>
        <div class="stat-value">${stats.gamesPlayed}</div>
        <div class="stat-label">Games Played</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value">€${stats.totalWagered.toFixed(2)}</div>
        <div class="stat-label">Total Wagered</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏆</div>
        <div class="stat-value">€${stats.totalWon.toFixed(2)}</div>
        <div class="stat-label">Total Won</div>
      </div>
      <div class="stat-card ${stats.netResult >= 0 ? 'positive' : 'negative'}">
        <div class="stat-icon">${stats.netResult >= 0 ? '📈' : '📉'}</div>
        <div class="stat-value">${stats.netResult >= 0 ? '+' : ''}€${stats.netResult.toFixed(2)}</div>
        <div class="stat-label">Net Result</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🎯</div>
        <div class="stat-value">${stats.rtp}</div>
        <div class="stat-label">Session RTP</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-value">€${stats.biggestWin.toFixed(2)}</div>
        <div class="stat-label">Biggest Win</div>
      </div>
    `;
    
    this.showModal('statsModal');
  }
  
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
    }
  }
  
  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
    }
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `gambling-notification ${type}`;
    notification.innerHTML = `
      <span class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
      <span class="notification-text">${message}</span>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

export default GamblingUI;

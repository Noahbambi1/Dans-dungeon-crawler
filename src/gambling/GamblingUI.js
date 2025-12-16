/**
 * Dan's Dungeon Crawler - Gambling UI System
 * Complete casino-style interface with betting controls and special features
 */

import { WalletSystem } from './WalletSystem.js';
import { GamblingEngine } from './GamblingEngine.js';

export class GamblingUI {
  constructor() {
    this.wallet = new WalletSystem();
    this.engine = new GamblingEngine();
    this.currentBet = 1.00;
    this.selectedMode = 'standard';
    this.isSpinning = false;
    this.autoPlayActive = false;
    this.autoPlayCount = 0;
    this.bonusFeatures = {
      freeSpinsRemaining: 0,
      multiplierActive: false,
      currentMultiplier: 1,
      jackpotEligible: false,
    };
    
    this.betPresets = [0.50, 1.00, 2.00, 5.00, 10.00, 25.00, 50.00, 100.00];
    
    this.init();
  }
  
  init() {
    this.createGamblingUI();
    this.attachEventListeners();
    this.updateDisplay();
    
    // Check and offer welcome bonus
    if (this.wallet.isWelcomeBonusAvailable()) {
      setTimeout(() => this.showWelcomeBonusModal(), 500);
    }
  }
  
  createGamblingUI() {
    // Create the gambling mode container
    const gamblingContainer = document.createElement('div');
    gamblingContainer.id = 'gamblingMode';
    gamblingContainer.className = 'gambling-mode';
    gamblingContainer.innerHTML = `
      <div class="gambling-header">
        <div class="wallet-display">
          <div class="wallet-icon">💰</div>
          <div class="wallet-info">
            <span class="wallet-label">Balance</span>
            <span class="wallet-balance" id="walletBalance">€0.00</span>
          </div>
          <button class="wallet-btn deposit-btn" id="depositBtn">
            <span class="btn-icon">+</span>
            <span class="btn-text">Deposit</span>
          </button>
        </div>
        
        <div class="rtp-display">
          <div class="rtp-badge">
            <span class="rtp-label">RTP</span>
            <span class="rtp-value">96%</span>
          </div>
          <div class="session-rtp">
            <span class="session-label">Session</span>
            <span class="session-value" id="sessionRTP">N/A</span>
          </div>
        </div>
        
        <div class="quick-actions">
          <button class="quick-btn history-btn" id="historyBtn" title="Game History">
            <span class="btn-icon">📜</span>
          </button>
          <button class="quick-btn stats-btn" id="statsBtn" title="Statistics">
            <span class="btn-icon">📊</span>
          </button>
          <button class="quick-btn limits-btn" id="limitsBtn" title="Responsible Gaming">
            <span class="btn-icon">⚙️</span>
          </button>
        </div>
      </div>
      
      <div class="betting-controls">
        <div class="mode-selector">
          <label class="control-label">Game Mode</label>
          <div class="mode-buttons" id="modeButtons">
            <button class="mode-btn" data-mode="balanced" title="50% win rate, 1.92x payout">
              <span class="mode-icon">🎯</span>
              <span class="mode-name">Balanced</span>
              <span class="mode-stats">50% / 1.92x</span>
            </button>
            <button class="mode-btn" data-mode="frequent" title="25% win rate, 3.84x payout">
              <span class="mode-icon">⚡</span>
              <span class="mode-name">Frequent</span>
              <span class="mode-stats">25% / 3.84x</span>
            </button>
            <button class="mode-btn active" data-mode="standard" title="5% win rate, 19.2x payout">
              <span class="mode-icon">🎰</span>
              <span class="mode-name">Standard</span>
              <span class="mode-stats">5% / 19.2x</span>
            </button>
            <button class="mode-btn" data-mode="highRoller" title="0.25% win rate, 384x payout">
              <span class="mode-icon">👑</span>
              <span class="mode-name">High Roller</span>
              <span class="mode-stats">0.25% / 384x</span>
            </button>
          </div>
        </div>
        
        <div class="bet-control">
          <label class="control-label">Bet Amount</label>
          <div class="bet-adjuster">
            <button class="bet-btn decrease" id="betDecrease">−</button>
            <div class="bet-display">
              <span class="currency-symbol">€</span>
              <input type="number" id="betAmount" value="1.00" min="0.10" max="500" step="0.10">
            </div>
            <button class="bet-btn increase" id="betIncrease">+</button>
          </div>
          <div class="bet-presets" id="betPresets">
            ${this.betPresets.map(bet => `
              <button class="preset-btn ${bet === this.currentBet ? 'active' : ''}" data-bet="${bet}">
                €${bet.toFixed(2)}
              </button>
            `).join('')}
          </div>
          <div class="bet-shortcuts">
            <button class="shortcut-btn" id="betMin">MIN</button>
            <button class="shortcut-btn" id="betHalf">½</button>
            <button class="shortcut-btn" id="betDouble">2×</button>
            <button class="shortcut-btn" id="betMax">MAX</button>
          </div>
        </div>
        
        <div class="potential-win">
          <span class="win-label">Potential Win</span>
          <span class="win-amount" id="potentialWin">€19.20</span>
        </div>
      </div>
      
      <div class="special-features">
        <div class="feature-badge free-spins" id="freeSpinsBadge" style="display: none;">
          <span class="feature-icon">🎁</span>
          <span class="feature-text">Free Spins: <span id="freeSpinsCount">0</span></span>
        </div>
        <div class="feature-badge multiplier" id="multiplierBadge" style="display: none;">
          <span class="feature-icon">✨</span>
          <span class="feature-text">Multiplier: <span id="multiplierValue">1x</span></span>
        </div>
        <div class="feature-badge jackpot" id="jackpotBadge">
          <span class="feature-icon">💎</span>
          <span class="feature-text">Jackpot: <span id="jackpotAmount">€10,000</span></span>
        </div>
      </div>
      
      <div class="action-buttons">
        <button class="spin-btn" id="spinBtn">
          <span class="spin-icon">🎲</span>
          <span class="spin-text">PLAY</span>
          <span class="spin-bet" id="spinBetDisplay">€1.00</span>
        </button>
        <div class="auto-controls">
          <button class="auto-btn" id="autoPlayBtn">
            <span class="auto-icon">🔄</span>
            <span class="auto-text">Auto</span>
          </button>
          <select id="autoPlayCount" class="auto-select">
            <option value="10">10 Spins</option>
            <option value="25">25 Spins</option>
            <option value="50">50 Spins</option>
            <option value="100">100 Spins</option>
          </select>
        </div>
      </div>
      
      <div class="result-display" id="resultDisplay" style="display: none;">
        <div class="result-content">
          <div class="result-icon" id="resultIcon">🏆</div>
          <div class="result-text" id="resultText">You Won!</div>
          <div class="result-amount" id="resultAmount">€0.00</div>
          <div class="result-details" id="resultDetails"></div>
        </div>
      </div>
      
      <div class="last-results">
        <span class="results-label">Recent:</span>
        <div class="results-list" id="lastResults"></div>
      </div>
    `;
    
    // Insert after the header
    const app = document.getElementById('app');
    const main = app.querySelector('main');
    main.parentNode.insertBefore(gamblingContainer, main);
    
    // Add modals
    this.createModals();
  }
  
  createModals() {
    const modalsContainer = document.createElement('div');
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
          <h2 class="modal-title">🎰 Welcome to the Casino! 🎰</h2>
          <div class="bonus-amount">€1,000</div>
          <p class="bonus-description">Claim your welcome bonus and start playing!</p>
          <p class="bonus-disclaimer">Demo credits for entertainment only. No real money involved.</p>
          <button class="claim-bonus-btn" id="claimBonusBtn">
            <span class="btn-icon">🎁</span>
            CLAIM BONUS
          </button>
        </div>
      </div>
      
      <!-- Deposit Modal -->
      <div id="depositModal" class="gambling-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content deposit-content">
          <button class="close-modal-btn" data-close="depositModal">✕</button>
          <h2 class="modal-title">💰 Add Funds</h2>
          <p class="modal-subtitle">Select amount to deposit (Demo Credits)</p>
          <div class="deposit-presets">
            <button class="deposit-preset" data-amount="100">€100</button>
            <button class="deposit-preset" data-amount="250">€250</button>
            <button class="deposit-preset" data-amount="500">€500</button>
            <button class="deposit-preset" data-amount="1000">€1,000</button>
          </div>
          <div class="custom-deposit">
            <label>Custom Amount</label>
            <div class="custom-input-group">
              <span class="currency">€</span>
              <input type="number" id="customDepositAmount" min="10" max="5000" value="100">
              <button class="deposit-confirm-btn" id="confirmDepositBtn">Deposit</button>
            </div>
          </div>
          <p class="deposit-note">Daily limit: €5,000</p>
        </div>
      </div>
      
      <!-- History Modal -->
      <div id="historyModal" class="gambling-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content history-content">
          <button class="close-modal-btn" data-close="historyModal">✕</button>
          <h2 class="modal-title">📜 Game History</h2>
          <div class="history-tabs">
            <button class="tab-btn active" data-tab="games">Games</button>
            <button class="tab-btn" data-tab="transactions">Transactions</button>
          </div>
          <div class="history-list" id="historyList"></div>
        </div>
      </div>
      
      <!-- Stats Modal -->
      <div id="statsModal" class="gambling-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content stats-content">
          <button class="close-modal-btn" data-close="statsModal">✕</button>
          <h2 class="modal-title">📊 Session Statistics</h2>
          <div class="stats-grid" id="statsGrid">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>
      
      <!-- Limits Modal (Responsible Gaming) -->
      <div id="limitsModal" class="gambling-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content limits-content">
          <button class="close-modal-btn" data-close="limitsModal">✕</button>
          <h2 class="modal-title">⚙️ Responsible Gaming</h2>
          <div class="limits-section">
            <h3>Session Information</h3>
            <div class="session-info" id="sessionInfo"></div>
          </div>
          <div class="limits-section">
            <h3>Set Your Limits</h3>
            <div class="limit-row">
              <label>Daily Loss Limit</label>
              <div class="limit-input">
                <span>€</span>
                <input type="number" id="limitDailyLoss" min="100" max="10000" value="1000">
              </div>
            </div>
            <div class="limit-row">
              <label>Maximum Bet</label>
              <div class="limit-input">
                <span>€</span>
                <input type="number" id="limitMaxBet" min="1" max="1000" value="500">
              </div>
            </div>
            <div class="limit-row">
              <label>Session Time Limit (hours)</label>
              <div class="limit-input">
                <input type="number" id="limitSessionTime" min="1" max="24" value="4">
              </div>
            </div>
          </div>
          <div class="limits-actions">
            <button class="save-limits-btn" id="saveLimitsBtn">Save Limits</button>
            <button class="take-break-btn" id="takeBreakBtn">Take a Break</button>
          </div>
          <div class="responsible-gaming-links">
            <p>If you feel you may have a gambling problem:</p>
            <a href="https://www.begambleaware.org" target="_blank">BeGambleAware.org</a>
            <a href="https://www.gamcare.org.uk" target="_blank">GamCare.org.uk</a>
          </div>
        </div>
      </div>
      
      <!-- Big Win Modal -->
      <div id="bigWinModal" class="gambling-modal big-win-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content big-win-content">
          <div class="big-win-animation">
            <div class="sparkle sparkle-1">✨</div>
            <div class="sparkle sparkle-2">✨</div>
            <div class="sparkle sparkle-3">✨</div>
            <div class="sparkle sparkle-4">✨</div>
          </div>
          <h2 class="big-win-title" id="bigWinTitle">BIG WIN!</h2>
          <div class="big-win-amount" id="bigWinAmount">€0.00</div>
          <div class="big-win-multiplier" id="bigWinMultiplier">19.2x</div>
          <button class="collect-btn" id="collectWinBtn">COLLECT</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modalsContainer);
  }
  
  attachEventListeners() {
    // Bet controls
    document.getElementById('betDecrease')?.addEventListener('click', () => this.adjustBet(-0.50));
    document.getElementById('betIncrease')?.addEventListener('click', () => this.adjustBet(0.50));
    document.getElementById('betAmount')?.addEventListener('change', (e) => this.setBet(parseFloat(e.target.value)));
    
    // Bet presets
    document.getElementById('betPresets')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.preset-btn');
      if (btn) {
        this.setBet(parseFloat(btn.dataset.bet));
      }
    });
    
    // Bet shortcuts
    document.getElementById('betMin')?.addEventListener('click', () => this.setBet(this.wallet.limits.betMin));
    document.getElementById('betMax')?.addEventListener('click', () => this.setBet(Math.min(this.wallet.limits.betMax, this.wallet.getBalance())));
    document.getElementById('betHalf')?.addEventListener('click', () => this.setBet(this.currentBet / 2));
    document.getElementById('betDouble')?.addEventListener('click', () => this.setBet(this.currentBet * 2));
    
    // Mode buttons
    document.getElementById('modeButtons')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.mode-btn');
      if (btn) {
        this.selectMode(btn.dataset.mode);
      }
    });
    
    // Main spin button
    document.getElementById('spinBtn')?.addEventListener('click', () => this.play());
    
    // Auto play
    document.getElementById('autoPlayBtn')?.addEventListener('click', () => this.toggleAutoPlay());
    
    // Modal buttons
    document.getElementById('depositBtn')?.addEventListener('click', () => this.showModal('depositModal'));
    document.getElementById('historyBtn')?.addEventListener('click', () => this.showHistory());
    document.getElementById('statsBtn')?.addEventListener('click', () => this.showStats());
    document.getElementById('limitsBtn')?.addEventListener('click', () => this.showLimits());
    
    // Welcome bonus
    document.getElementById('claimBonusBtn')?.addEventListener('click', () => this.claimWelcomeBonus());
    
    // Deposit modal
    document.querySelectorAll('.deposit-preset').forEach(btn => {
      btn.addEventListener('click', () => this.deposit(parseFloat(btn.dataset.amount)));
    });
    document.getElementById('confirmDepositBtn')?.addEventListener('click', () => {
      const amount = parseFloat(document.getElementById('customDepositAmount').value);
      this.deposit(amount);
    });
    
    // Close modal buttons
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => this.hideModal(btn.dataset.close));
    });
    
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', () => {
        const modal = backdrop.closest('.gambling-modal');
        if (modal && !modal.classList.contains('welcome-bonus-modal')) {
          this.hideModal(modal.id);
        }
      });
    });
    
    // Limits modal
    document.getElementById('saveLimitsBtn')?.addEventListener('click', () => this.saveLimits());
    document.getElementById('takeBreakBtn')?.addEventListener('click', () => this.takeBreak());
    
    // Collect win
    document.getElementById('collectWinBtn')?.addEventListener('click', () => this.hideModal('bigWinModal'));
    
    // History tabs
    document.querySelectorAll('.history-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchHistoryTab(btn.dataset.tab));
    });
  }
  
  adjustBet(delta) {
    this.setBet(this.currentBet + delta);
  }
  
  setBet(amount) {
    // Clamp to valid range
    amount = Math.max(this.wallet.limits.betMin, Math.min(this.wallet.limits.betMax, amount));
    amount = Math.round(amount * 100) / 100; // Round to 2 decimal places
    
    this.currentBet = amount;
    this.updateDisplay();
  }
  
  selectMode(mode) {
    this.selectedMode = mode;
    
    // Update UI
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    this.updateDisplay();
  }
  
  updateDisplay() {
    // Update balance
    const balanceEl = document.getElementById('walletBalance');
    if (balanceEl) {
      balanceEl.textContent = this.wallet.getFormattedBalance();
    }
    
    // Update bet display
    const betInput = document.getElementById('betAmount');
    if (betInput) {
      betInput.value = this.currentBet.toFixed(2);
    }
    
    // Update spin button
    const spinBetDisplay = document.getElementById('spinBetDisplay');
    if (spinBetDisplay) {
      spinBetDisplay.textContent = `€${this.currentBet.toFixed(2)}`;
    }
    
    // Update potential win
    const mode = this.engine.config.modes[this.selectedMode];
    const potentialWin = this.currentBet * (mode?.payoutMultiplier || 1);
    const potentialWinEl = document.getElementById('potentialWin');
    if (potentialWinEl) {
      potentialWinEl.textContent = `€${potentialWin.toFixed(2)}`;
    }
    
    // Update session RTP
    const stats = this.wallet.getSessionStats();
    const sessionRTPEl = document.getElementById('sessionRTP');
    if (sessionRTPEl) {
      sessionRTPEl.textContent = stats.rtp;
    }
    
    // Update preset buttons
    document.querySelectorAll('.preset-btn[data-bet]').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.bet) === this.currentBet);
    });
    
    // Update spin button state
    const spinBtn = document.getElementById('spinBtn');
    if (spinBtn) {
      const canPlay = this.wallet.getBalance() >= this.currentBet && !this.isSpinning;
      spinBtn.disabled = !canPlay;
    }
  }
  
  async play() {
    if (this.isSpinning) return;
    if (this.wallet.getBalance() < this.currentBet) {
      this.showNotification('Insufficient balance!', 'error');
      return;
    }
    
    this.isSpinning = true;
    this.updateSpinButton(true);
    
    // Apply free spin or deduct bet
    let betAmount = this.currentBet;
    let isFreeSpinUsed = false;
    
    if (this.bonusFeatures.freeSpinsRemaining > 0) {
      this.bonusFeatures.freeSpinsRemaining--;
      betAmount = 0;
      isFreeSpinUsed = true;
      this.updateBonusFeatures();
    }
    
    // Place bet (if not free spin)
    if (betAmount > 0) {
      const betResult = this.wallet.placeBet(betAmount, this.selectedMode, null);
      if (!betResult.success) {
        this.showNotification(betResult.error, 'error');
        this.isSpinning = false;
        this.updateSpinButton(false);
        return;
      }
    }
    
    this.updateDisplay();
    
    // Play the game
    try {
      const result = await this.engine.playRound('demo_player', this.currentBet, this.selectedMode);
      
      // Apply multiplier if active
      let finalPayout = result.payoutAmount;
      if (this.bonusFeatures.multiplierActive) {
        finalPayout *= this.bonusFeatures.currentMultiplier;
      }
      
      // Credit winnings
      if (finalPayout > 0) {
        this.wallet.creditWin(finalPayout, result.roundId, result.payoutMultiplier);
        
        // Check for big win (10x or more)
        if (result.payoutMultiplier >= 10) {
          this.showBigWin(finalPayout, result.payoutMultiplier);
        } else {
          this.showResult(true, finalPayout, result);
        }
        
        // Check for bonus trigger
        this.checkBonusTriggers(result);
      } else {
        this.wallet.recordLoss(betAmount, result.roundId);
        this.showResult(false, 0, result);
      }
      
      // Add to recent results
      this.addToRecentResults(result.outcome === 'WIN', finalPayout);
      
    } catch (error) {
      console.error('Game error:', error);
      this.showNotification('Game error occurred', 'error');
    }
    
    this.isSpinning = false;
    this.updateSpinButton(false);
    this.updateDisplay();
    
    // Continue auto play if active
    if (this.autoPlayActive && this.autoPlayCount > 0) {
      this.autoPlayCount--;
      if (this.autoPlayCount > 0 && this.wallet.getBalance() >= this.currentBet) {
        setTimeout(() => this.play(), 1500);
      } else {
        this.stopAutoPlay();
      }
    }
  }
  
  updateSpinButton(spinning) {
    const spinBtn = document.getElementById('spinBtn');
    if (!spinBtn) return;
    
    if (spinning) {
      spinBtn.classList.add('spinning');
      spinBtn.querySelector('.spin-text').textContent = 'PLAYING...';
    } else {
      spinBtn.classList.remove('spinning');
      spinBtn.querySelector('.spin-text').textContent = 'PLAY';
    }
  }
  
  showResult(isWin, amount, result) {
    const display = document.getElementById('resultDisplay');
    const icon = document.getElementById('resultIcon');
    const text = document.getElementById('resultText');
    const amountEl = document.getElementById('resultAmount');
    const details = document.getElementById('resultDetails');
    
    if (!display) return;
    
    display.className = 'result-display ' + (isWin ? 'win' : 'lose');
    display.style.display = 'block';
    
    if (isWin) {
      icon.textContent = '🏆';
      text.textContent = 'You Won!';
      amountEl.textContent = `€${amount.toFixed(2)}`;
      details.textContent = `${result.payoutMultiplier}x multiplier • Floors: ${result.floorsCompleted}`;
    } else {
      icon.textContent = '💀';
      text.textContent = 'You Lost';
      amountEl.textContent = `-€${this.currentBet.toFixed(2)}`;
      details.textContent = `Reached floor ${result.floorsCompleted}`;
    }
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      display.style.display = 'none';
    }, 3000);
  }
  
  showBigWin(amount, multiplier) {
    const modal = document.getElementById('bigWinModal');
    const amountEl = document.getElementById('bigWinAmount');
    const multiplierEl = document.getElementById('bigWinMultiplier');
    const titleEl = document.getElementById('bigWinTitle');
    
    // Determine win tier
    let title = 'BIG WIN!';
    if (multiplier >= 100) {
      title = '🎉 MEGA WIN! 🎉';
    } else if (multiplier >= 50) {
      title = '💎 SUPER WIN! 💎';
    }
    
    titleEl.textContent = title;
    amountEl.textContent = `€${amount.toFixed(2)}`;
    multiplierEl.textContent = `${multiplier}x`;
    
    modal.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideModal('bigWinModal');
    }, 5000);
  }
  
  addToRecentResults(isWin, amount) {
    const list = document.getElementById('lastResults');
    if (!list) return;
    
    const result = document.createElement('div');
    result.className = `result-dot ${isWin ? 'win' : 'lose'}`;
    result.title = isWin ? `Won €${amount.toFixed(2)}` : 'Lost';
    result.textContent = isWin ? '✓' : '✗';
    
    list.insertBefore(result, list.firstChild);
    
    // Keep only last 10
    while (list.children.length > 10) {
      list.removeChild(list.lastChild);
    }
  }
  
  checkBonusTriggers(result) {
    // Random chance for bonus features
    const random = Math.random();
    
    // 5% chance for free spins on any win
    if (result.outcome === 'WIN' && random < 0.05) {
      this.bonusFeatures.freeSpinsRemaining += 3;
      this.updateBonusFeatures();
      this.showNotification('🎁 You won 3 Free Spins!', 'bonus');
    }
    
    // 2% chance for multiplier boost
    if (random < 0.02) {
      this.bonusFeatures.multiplierActive = true;
      this.bonusFeatures.currentMultiplier = [2, 3, 5][Math.floor(Math.random() * 3)];
      this.updateBonusFeatures();
      this.showNotification(`✨ ${this.bonusFeatures.currentMultiplier}x Multiplier Active!`, 'bonus');
      
      // Multiplier lasts for 3 spins
      setTimeout(() => {
        this.bonusFeatures.multiplierActive = false;
        this.bonusFeatures.currentMultiplier = 1;
        this.updateBonusFeatures();
      }, 3 * 10000); // Rough estimate of 3 spins
    }
  }
  
  updateBonusFeatures() {
    const freeSpinsBadge = document.getElementById('freeSpinsBadge');
    const freeSpinsCount = document.getElementById('freeSpinsCount');
    const multiplierBadge = document.getElementById('multiplierBadge');
    const multiplierValue = document.getElementById('multiplierValue');
    
    if (freeSpinsBadge && freeSpinsCount) {
      freeSpinsBadge.style.display = this.bonusFeatures.freeSpinsRemaining > 0 ? 'flex' : 'none';
      freeSpinsCount.textContent = this.bonusFeatures.freeSpinsRemaining;
    }
    
    if (multiplierBadge && multiplierValue) {
      multiplierBadge.style.display = this.bonusFeatures.multiplierActive ? 'flex' : 'none';
      multiplierValue.textContent = `${this.bonusFeatures.currentMultiplier}x`;
    }
  }
  
  toggleAutoPlay() {
    if (this.autoPlayActive) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }
  
  startAutoPlay() {
    const select = document.getElementById('autoPlayCount');
    this.autoPlayCount = parseInt(select?.value || 10);
    this.autoPlayActive = true;
    
    const btn = document.getElementById('autoPlayBtn');
    if (btn) {
      btn.classList.add('active');
      btn.querySelector('.auto-text').textContent = 'Stop';
    }
    
    this.play();
  }
  
  stopAutoPlay() {
    this.autoPlayActive = false;
    this.autoPlayCount = 0;
    
    const btn = document.getElementById('autoPlayBtn');
    if (btn) {
      btn.classList.remove('active');
      btn.querySelector('.auto-text').textContent = 'Auto';
    }
  }
  
  showWelcomeBonusModal() {
    const modal = document.getElementById('welcomeBonusModal');
    if (modal) {
      modal.classList.add('show');
    }
  }
  
  claimWelcomeBonus() {
    const result = this.wallet.claimWelcomeBonus();
    if (result.success) {
      this.hideModal('welcomeBonusModal');
      this.updateDisplay();
      this.showNotification('🎉 €1,000 Welcome Bonus claimed!', 'success');
    } else {
      this.showNotification(result.error, 'error');
    }
  }
  
  deposit(amount) {
    const result = this.wallet.deposit(amount);
    if (result.success) {
      this.hideModal('depositModal');
      this.updateDisplay();
      this.showNotification(`€${amount.toFixed(2)} deposited!`, 'success');
    } else {
      this.showNotification(result.error, 'error');
    }
  }
  
  showHistory() {
    this.switchHistoryTab('games');
    this.showModal('historyModal');
  }
  
  switchHistoryTab(tab) {
    const list = document.getElementById('historyList');
    document.querySelectorAll('.history-tabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    if (tab === 'games') {
      const games = this.engine.auditLogger.logs.slice(-50).reverse();
      if (games.length === 0) {
        list.innerHTML = '<div class="empty-history">No games played yet</div>';
      } else {
        list.innerHTML = games.map(game => `
          <div class="history-item ${game.outcome === 'win' ? 'win' : 'lose'}">
            <div class="history-time">${new Date(game.timestamp).toLocaleString()}</div>
            <div class="history-mode">${game.gameMode}</div>
            <div class="history-bet">Bet: €${game.betAmount.toFixed(2)}</div>
            <div class="history-result ${game.outcome}">${game.outcome === 'win' ? `Won €${game.payoutAmount.toFixed(2)}` : 'Lost'}</div>
          </div>
        `).join('');
      }
    } else {
      const transactions = this.wallet.getTransactionHistory(50);
      if (transactions.length === 0) {
        list.innerHTML = '<div class="empty-history">No transactions yet</div>';
      } else {
        list.innerHTML = transactions.map(tx => `
          <div class="history-item ${tx.type}">
            <div class="history-time">${new Date(tx.timestamp).toLocaleString()}</div>
            <div class="history-type">${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</div>
            <div class="history-amount ${tx.type === 'bet' ? 'negative' : 'positive'}">
              ${tx.type === 'bet' ? '-' : '+'}€${tx.amount.toFixed(2)}
            </div>
            <div class="history-balance">Balance: €${tx.balanceAfter.toFixed(2)}</div>
          </div>
        `).join('');
      }
    }
  }
  
  showStats() {
    const stats = this.wallet.getSessionStats();
    const grid = document.getElementById('statsGrid');
    
    if (grid) {
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
        <div class="stat-card">
          <div class="stat-icon">💎</div>
          <div class="stat-value">€${stats.biggestBet.toFixed(2)}</div>
          <div class="stat-label">Biggest Bet</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-value">${stats.sessionDurationFormatted}</div>
          <div class="stat-label">Session Duration</div>
        </div>
      `;
    }
    
    this.showModal('statsModal');
  }
  
  showLimits() {
    const sessionInfo = document.getElementById('sessionInfo');
    const remaining = this.wallet.getRemainingSessionTime();
    const stats = this.wallet.getSessionStats();
    
    if (sessionInfo) {
      sessionInfo.innerHTML = `
        <div class="session-stat">
          <span class="label">Session Duration:</span>
          <span class="value">${stats.sessionDurationFormatted}</span>
        </div>
        <div class="session-stat">
          <span class="label">Time Remaining:</span>
          <span class="value">${remaining.formatted}</span>
        </div>
        <div class="session-stat">
          <span class="label">Today's Losses:</span>
          <span class="value">€${this.wallet.dailyStats.lost.toFixed(2)}</span>
        </div>
      `;
    }
    
    // Set current limits in inputs
    document.getElementById('limitDailyLoss').value = this.wallet.limits.dailyLoss;
    document.getElementById('limitMaxBet').value = this.wallet.limits.betMax;
    document.getElementById('limitSessionTime').value = this.wallet.limits.sessionTime / (60 * 60 * 1000);
    
    this.showModal('limitsModal');
  }
  
  saveLimits() {
    const newLimits = {
      dailyLoss: parseFloat(document.getElementById('limitDailyLoss').value) || 1000,
      betMax: parseFloat(document.getElementById('limitMaxBet').value) || 500,
      sessionTime: (parseFloat(document.getElementById('limitSessionTime').value) || 4) * 60 * 60 * 1000,
    };
    
    this.wallet.setLimits(newLimits);
    this.showNotification('Limits saved!', 'success');
    this.hideModal('limitsModal');
  }
  
  takeBreak() {
    this.wallet.resetSession();
    this.hideModal('limitsModal');
    this.showNotification('Session ended. Take care!', 'info');
    this.updateDisplay();
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
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `gambling-notification ${type}`;
    notification.innerHTML = `
      <span class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'bonus' ? '🎁' : 'ℹ'}</span>
      <span class="notification-text">${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

export default GamblingUI;


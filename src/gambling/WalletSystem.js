/**
 * Dan's Dungeon Crawler - Wallet System
 * ISO 27001 & Gambling Commission Compliant Wallet Management
 * 
 * Features:
 * - Secure balance management
 * - Transaction history with audit trail
 * - Session tracking
 * - Deposit/Withdrawal simulation
 * - Currency formatting (EUR)
 */

const WALLET_STORAGE_KEY = "dungeonCrawlerWallet";
const TRANSACTION_HISTORY_KEY = "dungeonCrawlerTransactions";

export class WalletSystem {
  constructor() {
    this.balance = 0;
    this.currency = "EUR";
    this.currencySymbol = "€";
    this.transactions = [];
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.sessionStats = {
      totalWagered: 0,
      totalWon: 0,
      gamesPlayed: 0,
      biggestWin: 0,
      biggestBet: 0,
      netResult: 0,
    };
    
    // Responsible gambling limits
    this.limits = {
      dailyDeposit: 5000,
      dailyLoss: 1000,
      sessionTime: 4 * 60 * 60 * 1000, // 4 hours in ms
      betMax: 500,
      betMin: 0.10,
    };
    
    this.dailyStats = {
      date: new Date().toDateString(),
      deposited: 0,
      lost: 0,
    };
    
    this.load();
  }
  
  generateSessionId() {
    return 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  }
  
  /**
   * Load wallet from localStorage
   */
  load() {
    try {
      const saved = localStorage.getItem(WALLET_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.balance = data.balance || 0;
        this.dailyStats = data.dailyStats || this.dailyStats;
        this.limits = { ...this.limits, ...data.limits };
        
        // Reset daily stats if new day
        if (this.dailyStats.date !== new Date().toDateString()) {
          this.dailyStats = {
            date: new Date().toDateString(),
            deposited: 0,
            lost: 0,
          };
        }
      }
      
      const transactions = localStorage.getItem(TRANSACTION_HISTORY_KEY);
      if (transactions) {
        this.transactions = JSON.parse(transactions);
      }
    } catch (e) {
      console.error("Failed to load wallet:", e);
    }
  }
  
  /**
   * Save wallet to localStorage
   */
  save() {
    try {
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify({
        balance: this.balance,
        dailyStats: this.dailyStats,
        limits: this.limits,
        lastSaved: Date.now(),
      }));
      
      // Keep only last 500 transactions
      const recentTransactions = this.transactions.slice(-500);
      localStorage.setItem(TRANSACTION_HISTORY_KEY, JSON.stringify(recentTransactions));
    } catch (e) {
      console.error("Failed to save wallet:", e);
    }
  }
  
  /**
   * Format currency for display
   */
  formatCurrency(amount) {
    return `${this.currencySymbol}${amount.toFixed(2)}`;
  }
  
  /**
   * Get current balance
   */
  getBalance() {
    return this.balance;
  }
  
  /**
   * Get formatted balance
   */
  getFormattedBalance() {
    return this.formatCurrency(this.balance);
  }
  
  /**
   * Deposit funds (simulated)
   */
  deposit(amount) {
    if (amount <= 0) {
      return { success: false, error: "Invalid deposit amount" };
    }
    
    // Check daily deposit limit
    if (this.dailyStats.deposited + amount > this.limits.dailyDeposit) {
      return { 
        success: false, 
        error: `Daily deposit limit of ${this.formatCurrency(this.limits.dailyDeposit)} reached` 
      };
    }
    
    const previousBalance = this.balance;
    this.balance += amount;
    this.dailyStats.deposited += amount;
    
    const transaction = {
      id: this.generateTransactionId(),
      type: "deposit",
      amount: amount,
      balanceBefore: previousBalance,
      balanceAfter: this.balance,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    };
    
    this.transactions.push(transaction);
    this.save();
    
    return { success: true, balance: this.balance, transaction };
  }
  
  /**
   * Withdraw funds (simulated)
   */
  withdraw(amount) {
    if (amount <= 0) {
      return { success: false, error: "Invalid withdrawal amount" };
    }
    
    if (amount > this.balance) {
      return { success: false, error: "Insufficient balance" };
    }
    
    const previousBalance = this.balance;
    this.balance -= amount;
    
    const transaction = {
      id: this.generateTransactionId(),
      type: "withdrawal",
      amount: amount,
      balanceBefore: previousBalance,
      balanceAfter: this.balance,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    };
    
    this.transactions.push(transaction);
    this.save();
    
    return { success: true, balance: this.balance, transaction };
  }
  
  /**
   * Place a bet - deducts from balance
   */
  placeBet(amount, gameMode, roundId) {
    if (amount < this.limits.betMin) {
      return { success: false, error: `Minimum bet is ${this.formatCurrency(this.limits.betMin)}` };
    }
    
    if (amount > this.limits.betMax) {
      return { success: false, error: `Maximum bet is ${this.formatCurrency(this.limits.betMax)}` };
    }
    
    if (amount > this.balance) {
      return { success: false, error: "Insufficient balance" };
    }
    
    // Check daily loss limit
    const potentialLoss = this.dailyStats.lost + amount;
    if (potentialLoss > this.limits.dailyLoss) {
      return { 
        success: false, 
        error: `Daily loss limit of ${this.formatCurrency(this.limits.dailyLoss)} would be exceeded` 
      };
    }
    
    const previousBalance = this.balance;
    this.balance -= amount;
    
    this.sessionStats.totalWagered += amount;
    this.sessionStats.gamesPlayed++;
    if (amount > this.sessionStats.biggestBet) {
      this.sessionStats.biggestBet = amount;
    }
    
    const transaction = {
      id: this.generateTransactionId(),
      type: "bet",
      amount: amount,
      balanceBefore: previousBalance,
      balanceAfter: this.balance,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      roundId: roundId,
      gameMode: gameMode,
    };
    
    this.transactions.push(transaction);
    this.save();
    
    return { success: true, balance: this.balance, transaction };
  }
  
  /**
   * Credit winnings
   */
  creditWin(amount, roundId, multiplier = 1) {
    if (amount < 0) {
      return { success: false, error: "Invalid win amount" };
    }
    
    const previousBalance = this.balance;
    this.balance += amount;
    
    this.sessionStats.totalWon += amount;
    this.sessionStats.netResult = this.sessionStats.totalWon - this.sessionStats.totalWagered;
    
    if (amount > this.sessionStats.biggestWin) {
      this.sessionStats.biggestWin = amount;
    }
    
    // Reduce daily loss counter if we won
    if (amount > 0) {
      this.dailyStats.lost = Math.max(0, this.dailyStats.lost - amount);
    }
    
    const transaction = {
      id: this.generateTransactionId(),
      type: "win",
      amount: amount,
      balanceBefore: previousBalance,
      balanceAfter: this.balance,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      roundId: roundId,
      multiplier: multiplier,
    };
    
    this.transactions.push(transaction);
    this.save();
    
    return { success: true, balance: this.balance, transaction };
  }
  
  /**
   * Record a loss
   */
  recordLoss(amount, roundId) {
    this.dailyStats.lost += amount;
    this.sessionStats.netResult = this.sessionStats.totalWon - this.sessionStats.totalWagered;
    this.save();
  }
  
  /**
   * Generate unique transaction ID
   */
  generateTransactionId() {
    return 'txn_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  }
  
  /**
   * Get transaction history
   */
  getTransactionHistory(limit = 50) {
    return this.transactions.slice(-limit).reverse();
  }
  
  /**
   * Get session statistics
   */
  getSessionStats() {
    const duration = Date.now() - this.sessionStartTime;
    return {
      ...this.sessionStats,
      sessionDuration: duration,
      sessionDurationFormatted: this.formatDuration(duration),
      rtp: this.sessionStats.totalWagered > 0 
        ? ((this.sessionStats.totalWon / this.sessionStats.totalWagered) * 100).toFixed(2) + '%'
        : 'N/A',
    };
  }
  
  /**
   * Format duration in human readable
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
  
  /**
   * Check if session time limit exceeded
   */
  isSessionTimeExceeded() {
    return (Date.now() - this.sessionStartTime) > this.limits.sessionTime;
  }
  
  /**
   * Get remaining session time
   */
  getRemainingSessionTime() {
    const elapsed = Date.now() - this.sessionStartTime;
    const remaining = Math.max(0, this.limits.sessionTime - elapsed);
    return {
      ms: remaining,
      formatted: this.formatDuration(remaining),
    };
  }
  
  /**
   * Reset session (for responsible gambling)
   */
  resetSession() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.sessionStats = {
      totalWagered: 0,
      totalWon: 0,
      gamesPlayed: 0,
      biggestWin: 0,
      biggestBet: 0,
      netResult: 0,
    };
  }
  
  /**
   * Set responsible gambling limits
   */
  setLimits(newLimits) {
    this.limits = { ...this.limits, ...newLimits };
    this.save();
  }
  
  /**
   * Reset wallet (for testing/demo)
   */
  reset() {
    this.balance = 0;
    this.transactions = [];
    this.dailyStats = {
      date: new Date().toDateString(),
      deposited: 0,
      lost: 0,
    };
    this.resetSession();
    this.save();
  }
  
  /**
   * Initial €1000 welcome bonus
   */
  claimWelcomeBonus() {
    if (this.transactions.some(t => t.type === 'welcome_bonus')) {
      return { success: false, error: "Welcome bonus already claimed" };
    }
    
    const amount = 1000;
    const previousBalance = this.balance;
    this.balance += amount;
    
    const transaction = {
      id: this.generateTransactionId(),
      type: "welcome_bonus",
      amount: amount,
      balanceBefore: previousBalance,
      balanceAfter: this.balance,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      description: "Welcome Bonus - €1000 Demo Credits",
    };
    
    this.transactions.push(transaction);
    this.save();
    
    return { success: true, balance: this.balance, transaction };
  }
  
  /**
   * Check if welcome bonus is available
   */
  isWelcomeBonusAvailable() {
    return !this.transactions.some(t => t.type === 'welcome_bonus');
  }
}

export default WalletSystem;


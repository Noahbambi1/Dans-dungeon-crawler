/**
 * PlayerStats Model
 * Represents a player's statistics for the leaderboard
 */

export class PlayerStats {
  /**
   * Create new PlayerStats
   * @param {Object} data - Initial stats data
   */
  constructor(data = {}) {
    this.wins = data.wins || 0;
    this.floorsTraversed = data.floorsTraversed || 0;
    this.modeWins = data.modeWins || {
      brutal: 0,
      hard: 0,
      normal: 0,
      easy: 0,
      casual: 0,
      custom: 0,
    };
  }

  /**
   * Record a win for the player
   * @param {string} mode - The difficulty mode
   * @param {number} floors - Number of floors traversed
   */
  recordWin(mode, floors) {
    this.wins += 1;
    this.floorsTraversed += floors;
    this.modeWins[mode] = (this.modeWins[mode] || 0) + 1;
  }

  /**
   * Record floors traversed (on loss)
   * @param {number} floors - Number of floors traversed
   */
  recordFloors(floors) {
    this.floorsTraversed += floors;
  }

  /**
   * Get total wins across all modes
   * @returns {number}
   */
  get totalWins() {
    return this.wins;
  }

  /**
   * Serialize for storage/API
   * @returns {Object}
   */
  toJSON() {
    return {
      wins: this.wins,
      floorsTraversed: this.floorsTraversed,
      modeWins: { ...this.modeWins },
    };
  }

  /**
   * Create PlayerStats from API response
   * @param {Object} data - API response data
   * @returns {PlayerStats}
   */
  static fromAPI(data) {
    return new PlayerStats({
      wins: data.wins || 0,
      floorsTraversed: data.floors_traversed || 0,
      modeWins: data.mode_wins || {},
    });
  }

  /**
   * Convert to API format for saving
   * @param {string} username - Player username
   * @returns {Object}
   */
  toAPIFormat(username) {
    return {
      username,
      wins: this.wins,
      floors_traversed: this.floorsTraversed,
      mode_wins: this.modeWins,
      updated_at: new Date().toISOString(),
    };
  }
}


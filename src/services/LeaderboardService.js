/**
 * Leaderboard Service
 * Handles Supabase API interactions for the global leaderboard
 */

import { SUPABASE_CONFIG, MAX_LEADERBOARD_SIZE } from '../config/constants.js';
import { PlayerStats } from '../models/PlayerStats.js';

class LeaderboardService {
  constructor() {
    this.leaderboard = {};
    this.isSyncing = false;
    this.lastSyncTime = 0;
  }

  /**
   * Check if Supabase is properly configured
   * @returns {boolean}
   */
  isConfigured() {
    return (
      SUPABASE_CONFIG.url &&
      SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' &&
      SUPABASE_CONFIG.anonKey &&
      SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY'
    );
  }

  /**
   * Make a Supabase REST API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<*>}
   */
  async query(endpoint, options = {}) {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/${endpoint}`;
    const headers = {
      apikey: SUPABASE_CONFIG.anonKey,
      Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
    };

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  /**
   * Fetch the leaderboard from Supabase
   * @returns {Promise<Object>} Leaderboard data
   */
  async fetchLeaderboard() {
    try {
      const data = await this.query(
        `leaderboard?select=*&order=wins.desc,floors_traversed.desc&limit=${MAX_LEADERBOARD_SIZE}`
      );

      const result = {};
      for (const row of data || []) {
        result[row.username] = {
          wins: row.wins || 0,
          floorsTraversed: row.floors_traversed || 0,
          modeWins: row.mode_wins || {
            brutal: 0,
            hard: 0,
            normal: 0,
            easy: 0,
            casual: 0,
            custom: 0,
          },
        };
      }

      this.leaderboard = result;
      this.lastSyncTime = Date.now();
      return result;
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
      throw e;
    }
  }

  /**
   * Get player stats from Supabase
   * @param {string} username - Player username
   * @returns {Promise<PlayerStats|null>}
   */
  async getPlayerStats(username) {
    try {
      const data = await this.query(
        `leaderboard?username=eq.${encodeURIComponent(username)}&limit=1`
      );

      if (data && data.length > 0) {
        return PlayerStats.fromAPI(data[0]);
      }
      return null;
    } catch (e) {
      console.error('Failed to get player stats:', e);
      return null;
    }
  }

  /**
   * Save player stats to Supabase
   * @param {string} username - Player username
   * @param {PlayerStats} stats - Player stats
   * @returns {Promise<boolean>} Success status
   */
  async savePlayerStats(username, stats) {
    try {
      await this.query('leaderboard?on_conflict=username', {
        method: 'POST',
        prefer: 'return=minimal,resolution=merge-duplicates',
        body: stats.toAPIFormat(username),
      });
      return true;
    } catch (e) {
      console.error('Failed to save player stats:', e);
      return false;
    }
  }

  /**
   * Get cached leaderboard data
   * @returns {Object}
   */
  getLeaderboard() {
    return this.leaderboard;
  }

  /**
   * Get or create player stats
   * @param {string} username - Player username
   * @returns {Promise<PlayerStats>}
   */
  async getOrCreateStats(username) {
    // Check cache first
    if (this.leaderboard[username]) {
      return new PlayerStats(this.leaderboard[username]);
    }

    // Try to fetch from API
    if (this.isConfigured()) {
      const stats = await this.getPlayerStats(username);
      if (stats) {
        return stats;
      }
    }

    // Return new stats
    return new PlayerStats();
  }

  /**
   * Record a win for a player
   * @param {string} username - Player username
   * @param {string} mode - Difficulty mode
   * @param {number} floors - Number of floors traversed
   * @returns {Promise<void>}
   */
  async recordWin(username, mode, floors) {
    const stats = await this.getOrCreateStats(username);
    stats.recordWin(mode, floors);

    // Update cache
    this.leaderboard[username] = stats.toJSON();

    // Save to database
    if (this.isConfigured()) {
      await this.savePlayerStats(username, stats);
    }
  }

  /**
   * Record floors traversed (on loss)
   * @param {string} username - Player username
   * @param {number} floors - Number of floors traversed
   * @returns {Promise<void>}
   */
  async recordFloors(username, floors) {
    const stats = await this.getOrCreateStats(username);
    stats.recordFloors(floors);

    // Update cache
    this.leaderboard[username] = stats.toJSON();

    // Save to database
    if (this.isConfigured()) {
      await this.savePlayerStats(username, stats);
    }
  }

  /**
   * Get sorted leaderboard entries
   * @returns {Array} Sorted player entries
   */
  getSortedEntries() {
    return Object.entries(this.leaderboard)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.floorsTraversed - a.floorsTraversed;
      });
  }
}

// Export singleton instance
export const leaderboardService = new LeaderboardService();


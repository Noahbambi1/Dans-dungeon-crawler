/**
 * Leaderboard Component
 * Renders and manages the leaderboard UI
 */

import { escapeHtml } from '../utils/helpers.js';
import { leaderboardService } from '../services/LeaderboardService.js';

export class LeaderboardComponent {
  /**
   * Render the leaderboard list
   * @param {string} currentPlayerName - Current player's name
   */
  static render(currentPlayerName) {
    const list = document.getElementById('leaderboardList');
    if (!list) return;

    const players = leaderboardService.getSortedEntries();

    if (players.length === 0) {
      list.innerHTML = '<div class="no-players">No players yet</div>';
      return;
    }

    list.innerHTML = players
      .map((player, index) => {
        const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        const isCurrent = player.name === currentPlayerName;

        return `
        <div class="player-entry ${isCurrent ? 'current' : ''}" data-player="${escapeHtml(player.name)}">
          <div class="player-summary">
            <span class="player-rank ${rankClass}">#${index + 1}</span>
            <span class="player-name">${escapeHtml(player.name)}</span>
            <div class="player-stats-summary">
              <div class="stat-item">
                <span class="stat-value">${player.wins}</span>
                <span class="stat-label">Wins</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${player.floorsTraversed}</span>
                <span class="stat-label">Floors</span>
              </div>
            </div>
            <span class="expand-icon">▼</span>
          </div>
          <div class="player-details">
            <div class="mode-wins-title">Wins by Mode</div>
            <div class="mode-wins-grid">
              <div class="mode-win-item brutal">
                <span class="mode-count">${player.modeWins?.brutal || 0}</span>
                <span class="mode-name">Brutal</span>
              </div>
              <div class="mode-win-item hard">
                <span class="mode-count">${player.modeWins?.hard || 0}</span>
                <span class="mode-name">Hard</span>
              </div>
              <div class="mode-win-item normal">
                <span class="mode-count">${player.modeWins?.normal || 0}</span>
                <span class="mode-name">Normal</span>
              </div>
              <div class="mode-win-item easy">
                <span class="mode-count">${player.modeWins?.easy || 0}</span>
                <span class="mode-name">Easy</span>
              </div>
              <div class="mode-win-item casual">
                <span class="mode-count">${player.modeWins?.casual || 0}</span>
                <span class="mode-name">Casual</span>
              </div>
              <div class="mode-win-item custom">
                <span class="mode-count">${player.modeWins?.custom || 0}</span>
                <span class="mode-name">Custom</span>
              </div>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    // Add click handlers for expanding player details
    list.querySelectorAll('.player-summary').forEach(summary => {
      summary.addEventListener('click', () => {
        const entry = summary.closest('.player-entry');
        const details = entry.querySelector('.player-details');
        const wasExpanded = entry.classList.contains('expanded');

        // Close all other entries
        list.querySelectorAll('.player-entry').forEach(e => {
          e.classList.remove('expanded');
          e.querySelector('.player-details')?.classList.remove('show');
        });

        // Toggle this entry
        if (!wasExpanded) {
          entry.classList.add('expanded');
          details?.classList.add('show');
        }
      });
    });
  }

  /**
   * Update the current player display
   * @param {string} playerName - Current player name
   */
  static updateCurrentPlayerDisplay(playerName) {
    const display = document.getElementById('currentPlayerDisplay');
    if (display) {
      if (playerName) {
        display.textContent = `Playing as: ${playerName}`;
        display.style.display = 'block';
      } else {
        display.style.display = 'none';
      }
    }

    const input = document.getElementById('playerNameInput');
    if (input) {
      input.value = playerName || '';
    }
  }

  /**
   * Update the sync status indicator
   * @param {string} status - 'syncing' | 'synced' | 'error' | 'local'
   */
  static updateSyncStatus(status) {
    const statusEl = document.getElementById('syncStatus');
    if (!statusEl) return;

    const statusMap = {
      syncing: '<span class="sync-active">☁️ Syncing...</span>',
      synced: '<span class="sync-ok">☁️ Global</span>',
      error: '<span class="sync-error">⚠️ Offline</span>',
      local: '<span class="sync-local">📱 Local Mode</span>',
    };

    statusEl.innerHTML = statusMap[status] || statusMap.local;

    if (status === 'local') {
      statusEl.title = 'Configure Supabase for global leaderboard.';
    } else {
      statusEl.title = '';
    }
  }

  /**
   * Show/hide the leaderboard panel
   * @param {boolean} show - Whether to show
   */
  static togglePanel(show) {
    const panel = document.getElementById('leaderboardPanel');
    if (panel) {
      panel.classList.toggle('show', show);
    }
  }

  /**
   * Check if panel is visible
   * @returns {boolean}
   */
  static isPanelVisible() {
    const panel = document.getElementById('leaderboardPanel');
    return panel?.classList.contains('show') || false;
  }
}


const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Card theme management
const CARD_THEME_KEY = "dungeonCrawlerCardTheme";

function loadCardTheme() {
  try {
    return localStorage.getItem(CARD_THEME_KEY) || "classic";
  } catch (e) {
    return "classic";
  }
}

function saveCardTheme(theme) {
  try {
    localStorage.setItem(CARD_THEME_KEY, theme);
  } catch (e) {
    console.error("Failed to save card theme:", e);
  }
}

function applyCardTheme(theme) {
  document.documentElement.setAttribute("data-card-theme", theme);
  saveCardTheme(theme);
  
  // Update active state in theme selector
  document.querySelectorAll(".theme-option").forEach(opt => {
    opt.classList.toggle("active", opt.dataset.theme === theme);
  });
}

function setupThemeSelector() {
  const selector = document.getElementById("themeSelector");
  if (!selector) return;
  
  selector.addEventListener("click", (e) => {
    const option = e.target.closest(".theme-option");
    if (option && option.dataset.theme) {
      applyCardTheme(option.dataset.theme);
    }
  });
  
  // Load saved theme
  const savedTheme = loadCardTheme();
  applyCardTheme(savedTheme);
}

// ============================================
// LEADERBOARD SYSTEM (Global via Supabase)
// ============================================
const CURRENT_PLAYER_KEY = "dungeonCrawlerCurrentPlayer";
const MAX_LEADERBOARD_SIZE = 100;

// Supabase configuration for global leaderboard
const SUPABASE_URL = "https://meleczsuyvvmjscajtng.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lbGVjenN1eXZ2bWpzY2FqdG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTkyMzMsImV4cCI6MjA4MTM5NTIzM30.ZBauOeC77BFIKmixV2aoKJLSj6GVvwFZ1o0MQf_H4WU";

// Random name generator for anonymous players
// NOTE: These must be defined BEFORE loadCurrentPlayer() is called
const NAME_ADJECTIVES = [
  "Swift", "Brave", "Clever", "Dark", "Epic", "Fierce", "Ghostly", "Hidden",
  "Iron", "Jade", "Keen", "Lucky", "Mystic", "Noble", "Proud", "Quick",
  "Rogue", "Shadow", "Thunder", "Valor", "Wild", "Zealous", "Ancient", "Bold",
  "Crimson", "Daring", "Elder", "Frosty", "Golden", "Humble", "Ivory", "Jolly"
];

const NAME_NOUNS = [
  "Knight", "Mage", "Rogue", "Hunter", "Warrior", "Wizard", "Archer", "Druid",
  "Paladin", "Ranger", "Monk", "Bard", "Cleric", "Thief", "Hero", "Legend",
  "Phoenix", "Dragon", "Wolf", "Bear", "Hawk", "Serpent", "Tiger", "Lion",
  "Slayer", "Seeker", "Walker", "Runner", "Blade", "Shield", "Storm", "Flame"
];

function generateRandomName() {
  const adj = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
  const noun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

// State variables - initialized later in setupLeaderboard() to avoid temporal dead zone
let leaderboard = {};
let currentPlayerName = null;
let isSyncing = false;
let lastSyncTime = 0;

function loadCurrentPlayer() {
  try {
    let name = localStorage.getItem(CURRENT_PLAYER_KEY);
    if (!name) {
      // Generate a random name for new players
      name = generateRandomName();
      localStorage.setItem(CURRENT_PLAYER_KEY, name);
    }
    return name;
  } catch (e) {
    return generateRandomName();
  }
}

function saveCurrentPlayer() {
  try {
    localStorage.setItem(CURRENT_PLAYER_KEY, currentPlayerName);
  } catch (e) {
    console.error("Failed to save current player:", e);
  }
}

function isSupabaseConfigured() {
  return SUPABASE_URL && 
         SUPABASE_URL !== "YOUR_SUPABASE_URL" && 
         SUPABASE_ANON_KEY && 
         SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";
}

// Supabase REST API helper
async function supabaseQuery(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation'
  };
  
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`Supabase error: ${response.status}`);
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Fetch leaderboard from Supabase
async function fetchLeaderboard() {
  try {
    const data = await supabaseQuery(
      `leaderboard?select=*&order=wins.desc,floors_traversed.desc&limit=${MAX_LEADERBOARD_SIZE}`
    );
    
    // Convert array to object format for compatibility
    const result = {};
    for (const row of data || []) {
      result[row.username] = {
        wins: row.wins || 0,
        floorsTraversed: row.floors_traversed || 0,
        modeWins: row.mode_wins || { brutal: 0, hard: 0, normal: 0, easy: 0, casual: 0, custom: 0 }
      };
    }
    return result;
  } catch (e) {
    console.error("Failed to fetch leaderboard:", e);
    return {};
  }
}

// Save/update player stats in Supabase
async function savePlayerStats(username, stats) {
  try {
    // Use upsert with on_conflict parameter for the username column
    await supabaseQuery('leaderboard?on_conflict=username', {
      method: 'POST',
      prefer: 'return=minimal,resolution=merge-duplicates',
      body: {
        username: username,
        wins: stats.wins || 0,
        floors_traversed: stats.floorsTraversed || 0,
        mode_wins: stats.modeWins || { brutal: 0, hard: 0, normal: 0, easy: 0, casual: 0, custom: 0 },
        updated_at: new Date().toISOString()
      }
    });
    return true;
  } catch (e) {
    console.error("Failed to save player stats:", e);
    return false;
  }
}

// Get player stats from Supabase
async function getPlayerStats(username) {
  try {
    const data = await supabaseQuery(
      `leaderboard?username=eq.${encodeURIComponent(username)}&limit=1`
    );
    
    if (data && data.length > 0) {
      const row = data[0];
      return {
        wins: row.wins || 0,
        floorsTraversed: row.floors_traversed || 0,
        modeWins: row.mode_wins || { brutal: 0, hard: 0, normal: 0, easy: 0, casual: 0, custom: 0 }
      };
    }
    return null;
  } catch (e) {
    console.error("Failed to get player stats:", e);
    return null;
  }
}

function updateSyncStatus(status) {
  const statusEl = document.getElementById("syncStatus");
  if (!statusEl) return;
  
  if (!isSupabaseConfigured()) {
    statusEl.innerHTML = '<span class="sync-local">📱 Local Mode</span>';
    statusEl.title = "Configure Supabase for global leaderboard.";
    return;
  }
  
  if (status === "syncing") {
    statusEl.innerHTML = '<span class="sync-active">☁️ Syncing...</span>';
  } else if (status === "error") {
    statusEl.innerHTML = '<span class="sync-error">⚠️ Offline</span>';
  } else {
    statusEl.innerHTML = '<span class="sync-ok">☁️ Global</span>';
  }
}

async function loadGlobalLeaderboard() {
  if (isSupabaseConfigured()) {
    updateSyncStatus("syncing");
    try {
      leaderboard = await fetchLeaderboard();
      updateSyncStatus("synced");
    } catch (e) {
      console.error("Failed to load leaderboard:", e);
      updateSyncStatus("error");
    }
  }
  renderLeaderboard();
}

function getCurrentDifficultyMode() {
  // Determine current difficulty based on settings
  for (const [name, preset] of Object.entries(DIFFICULTY_PRESETS)) {
    if (
      preset.maxHealth === gameSettings.maxHealth &&
      preset.weaponDegradation === gameSettings.weaponDegradation &&
      preset.maxRuns === gameSettings.maxRuns &&
      preset.healingMode === gameSettings.healingMode &&
      preset.includeDiamondRoyals === gameSettings.includeDiamondRoyals &&
      preset.includeHeartRoyals === gameSettings.includeHeartRoyals &&
      preset.removeAceMonsters === gameSettings.removeAceMonsters
    ) {
      return name;
    }
  }
  return "custom";
}

async function recordWin() {
  if (!currentPlayerName) {
    currentPlayerName = generateRandomName();
    saveCurrentPlayer();
  }
  
  const mode = getCurrentDifficultyMode();
  
  // Get current stats from server or local cache
  let stats = leaderboard[currentPlayerName];
  if (!stats) {
    if (isSupabaseConfigured()) {
      stats = await getPlayerStats(currentPlayerName);
    }
    if (!stats) {
      stats = {
        wins: 0,
        floorsTraversed: 0,
        modeWins: { brutal: 0, hard: 0, normal: 0, easy: 0, casual: 0, custom: 0 }
      };
    }
  }
  
  // Update stats
  stats.wins = (stats.wins || 0) + 1;
  stats.floorsTraversed = (stats.floorsTraversed || 0) + state.floorNumber;
  if (!stats.modeWins) {
    stats.modeWins = { brutal: 0, hard: 0, normal: 0, easy: 0, casual: 0, custom: 0 };
  }
  stats.modeWins[mode] = (stats.modeWins[mode] || 0) + 1;
  
  // Update local cache
  leaderboard[currentPlayerName] = stats;
  
  // Save to database
  if (isSupabaseConfigured()) {
    await savePlayerStats(currentPlayerName, stats);
    // Refresh leaderboard
    loadGlobalLeaderboard();
  } else {
    renderLeaderboard();
  }
}

async function recordFloors() {
  if (!currentPlayerName) {
    currentPlayerName = generateRandomName();
    saveCurrentPlayer();
  }
  
  // Get current stats from server or local cache
  let stats = leaderboard[currentPlayerName];
  if (!stats) {
    if (isSupabaseConfigured()) {
      stats = await getPlayerStats(currentPlayerName);
    }
    if (!stats) {
      stats = {
        wins: 0,
        floorsTraversed: 0,
        modeWins: { brutal: 0, hard: 0, normal: 0, easy: 0, casual: 0, custom: 0 }
      };
    }
  }
  
  // Update stats
  stats.floorsTraversed = (stats.floorsTraversed || 0) + state.floorNumber;
  
  // Update local cache
  leaderboard[currentPlayerName] = stats;
  
  // Save to database
  if (isSupabaseConfigured()) {
    await savePlayerStats(currentPlayerName, stats);
  }
}

function setCurrentPlayer(name) {
  const trimmed = name.trim();
  if (!trimmed) {
    currentPlayerName = generateRandomName();
  } else {
    currentPlayerName = trimmed;
  }
  saveCurrentPlayer();
  updateCurrentPlayerDisplay();
  renderLeaderboard();
}

function updateCurrentPlayerDisplay() {
  const display = document.getElementById("currentPlayerDisplay");
  if (display) {
    if (currentPlayerName) {
      display.textContent = `Playing as: ${currentPlayerName}`;
      display.style.display = "block";
    } else {
      display.style.display = "none";
    }
  }
  
  const input = document.getElementById("playerNameInput");
  if (input) {
    input.value = currentPlayerName;
  }
}

function renderLeaderboard() {
  const list = document.getElementById("leaderboardList");
  if (!list) return;
  
  // Sort players by wins, then by floors
  const players = Object.entries(leaderboard)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.floorsTraversed - a.floorsTraversed;
    });
  
  if (players.length === 0) {
    list.innerHTML = '<div class="no-players">No players yet</div>';
    return;
  }
  
  list.innerHTML = players.map((player, index) => {
    const rankClass = index === 0 ? "gold" : index === 1 ? "silver" : index === 2 ? "bronze" : "";
    const isCurrent = player.name === currentPlayerName;
    
    return `
      <div class="player-entry ${isCurrent ? 'current' : ''}" data-player="${player.name}">
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
  }).join('');
  
  // Add click handlers for expanding player details
  list.querySelectorAll('.player-summary').forEach(summary => {
    summary.addEventListener('click', () => {
      const entry = summary.closest('.player-entry');
      const details = entry.querySelector('.player-details');
      const wasExpanded = entry.classList.contains('expanded');
      
      // Close all other entries
      list.querySelectorAll('.player-entry').forEach(e => {
        e.classList.remove('expanded');
        e.querySelector('.player-details').classList.remove('show');
      });
      
      // Toggle this entry
      if (!wasExpanded) {
        entry.classList.add('expanded');
        details.classList.add('show');
      }
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function setupLeaderboard() {
  const btn = document.getElementById("leaderboardButton");
  const panel = document.getElementById("leaderboardPanel");
  const setPlayerBtn = document.getElementById("setPlayerBtn");
  const playerInput = document.getElementById("playerNameInput");
  const refreshBtn = document.getElementById("refreshLeaderboardBtn");
  
  if (btn && panel) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      panel.classList.toggle("show");
      if (panel.classList.contains("show")) {
        loadGlobalLeaderboard();
      }
    });
    
    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!panel.contains(e.target) && e.target !== btn) {
        panel.classList.remove("show");
      }
    });
  }
  
  if (setPlayerBtn && playerInput) {
    setPlayerBtn.addEventListener("click", () => {
      setCurrentPlayer(playerInput.value);
    });
    
    playerInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        setCurrentPlayer(playerInput.value);
      }
    });
  }
  
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadGlobalLeaderboard();
    });
  }
  
  // Initialize player name (from localStorage or generate new)
  currentPlayerName = loadCurrentPlayer();
  
  updateCurrentPlayerDisplay();
  updateSyncStatus();
  
  // Load global leaderboard on startup
  loadGlobalLeaderboard();
}

// ============================================
// GAME BALANCE SETTINGS
// ============================================
// These settings can be adjusted to change difficulty
// Default settings give ~0.25% win rate with perfect play

const gameSettings = {
  // Starting/max health (default: 20)
  // Higher = easier. Try 25 or 30 for easier games
  maxHealth: 20,

  // Weapon degradation mode:
  // "strict" (default) - weapon can only fight monsters LESS than last killed
  // "equal" - weapon can fight monsters LESS OR EQUAL to last killed  
  // "none" - weapon never degrades (very easy)
  weaponDegradation: "strict",

  // Number of times you can run away per game (default: 1)
  // Try 2 or 3 for easier games, 0 for harder
  maxRuns: 1,

  // Healing limit per floor:
  // "once" (default) - only first heart heals each floor
  // "unlimited" - all hearts heal
  healingMode: "once",

  // Include diamond royals (J, Q, K) as weapons?
  // false (default) - only 2-10 diamonds
  // true - adds 11, 12, 13 value weapons (much easier!)
  includeDiamondRoyals: false,

  // Include heart royals (J, Q, K) as healing?
  // false (default) - only 2-10 hearts  
  // true - adds 11, 12, 13 value heals
  includeHeartRoyals: false,

  // Remove aces from monster deck?
  // false (default) - aces are 14-value monsters
  // true - no ace monsters (removes 28 total damage)
  removeAceMonsters: false,
};

// Preset difficulty levels
const DIFFICULTY_PRESETS = {
  brutal: {
    maxHealth: 20,
    weaponDegradation: "strict",
    maxRuns: 1,
    healingMode: "once",
    includeDiamondRoyals: false,
    includeHeartRoyals: false,
    removeAceMonsters: false,
  },
  hard: {
    maxHealth: 25,
    weaponDegradation: "strict",
    maxRuns: 2,
    healingMode: "once",
    includeDiamondRoyals: false,
    includeHeartRoyals: false,
    removeAceMonsters: false,
  },
  normal: {
    maxHealth: 25,
    weaponDegradation: "equal",
    maxRuns: 2,
    healingMode: "once",
    includeDiamondRoyals: false,
    includeHeartRoyals: false,
    removeAceMonsters: true,
  },
  easy: {
    maxHealth: 30,
    weaponDegradation: "equal",
    maxRuns: 3,
    healingMode: "unlimited",
    includeDiamondRoyals: true,
    includeHeartRoyals: false,
    removeAceMonsters: true,
  },
  casual: {
    maxHealth: 35,
    weaponDegradation: "none",
    maxRuns: 999,
    healingMode: "unlimited",
    includeDiamondRoyals: true,
    includeHeartRoyals: true,
    removeAceMonsters: true,
  },
};

function applyDifficultyPreset(presetName) {
  const preset = DIFFICULTY_PRESETS[presetName];
  if (preset) {
    Object.assign(gameSettings, preset);
    updateSettingsUI();
  }
}

function updateSettingsUI() {
  const els = {
    maxHealth: document.getElementById("settingMaxHealth"),
    weaponDegradation: document.getElementById("settingWeaponDegradation"),
    maxRuns: document.getElementById("settingMaxRuns"),
    healingMode: document.getElementById("settingHealingMode"),
    includeDiamondRoyals: document.getElementById("settingDiamondRoyals"),
    includeHeartRoyals: document.getElementById("settingHeartRoyals"),
    removeAceMonsters: document.getElementById("settingRemoveAces"),
  };
  
  if (els.maxHealth) els.maxHealth.value = gameSettings.maxHealth;
  if (els.weaponDegradation) els.weaponDegradation.value = gameSettings.weaponDegradation;
  if (els.maxRuns) els.maxRuns.value = gameSettings.maxRuns;
  if (els.healingMode) els.healingMode.value = gameSettings.healingMode;
  if (els.includeDiamondRoyals) els.includeDiamondRoyals.checked = gameSettings.includeDiamondRoyals;
  if (els.includeHeartRoyals) els.includeHeartRoyals.checked = gameSettings.includeHeartRoyals;
  if (els.removeAceMonsters) els.removeAceMonsters.checked = gameSettings.removeAceMonsters;
}

function readSettingsFromUI() {
  const els = {
    maxHealth: document.getElementById("settingMaxHealth"),
    weaponDegradation: document.getElementById("settingWeaponDegradation"),
    maxRuns: document.getElementById("settingMaxRuns"),
    healingMode: document.getElementById("settingHealingMode"),
    includeDiamondRoyals: document.getElementById("settingDiamondRoyals"),
    includeHeartRoyals: document.getElementById("settingHeartRoyals"),
    removeAceMonsters: document.getElementById("settingRemoveAces"),
  };
  
  if (els.maxHealth) gameSettings.maxHealth = parseInt(els.maxHealth.value) || 20;
  if (els.weaponDegradation) gameSettings.weaponDegradation = els.weaponDegradation.value;
  if (els.maxRuns) gameSettings.maxRuns = parseInt(els.maxRuns.value) || 1;
  if (els.healingMode) gameSettings.healingMode = els.healingMode.value;
  if (els.includeDiamondRoyals) gameSettings.includeDiamondRoyals = els.includeDiamondRoyals.checked;
  if (els.includeHeartRoyals) gameSettings.includeHeartRoyals = els.includeHeartRoyals.checked;
  if (els.removeAceMonsters) gameSettings.removeAceMonsters = els.removeAceMonsters.checked;
}

// ============================================

const state = {
  deck: [],
  discard: [],
  floor: [],
  weapon: null,
  weaponDamage: [],
  weaponMaxNext: Infinity, // highest monster value weapon can still face (based on degradation mode)
  health: 20, // Will be set from gameSettings on init
  floorNumber: 1,
  runsRemaining: 1, // Will be set from gameSettings on init
  floorFresh: true, // true when no actions taken on current floor
  healUsed: false, // true if heal has been used on current floor (in "once" mode)
  originalDeck: [], // Store original deck for restart
  initialDeckOrder: [], // Store the exact deck order for restart (same shuffle)
  firstFloorDealt: false, // Track if first floor has been dealt
};

// History for undo functionality
let stateHistory = [];
const MAX_HISTORY = 10; // Keep last 10 moves

const suitIcons = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

// Animation functions
function showDamageAnimation(amount) {
  const overlay = document.getElementById("animationOverlay");
  const damageEl = document.createElement("div");
  damageEl.className = "damage-animation";
  damageEl.textContent = `-${amount}`;
  overlay.appendChild(damageEl);
  setTimeout(() => {
    damageEl.classList.add("animate");
    setTimeout(() => {
      damageEl.remove();
    }, 1000);
  }, 10);
}

function showHealAnimation(amount) {
  const overlay = document.getElementById("animationOverlay");
  const healEl = document.createElement("div");
  healEl.className = "heal-animation";
  healEl.textContent = `+${amount}`;
  overlay.appendChild(healEl);
  setTimeout(() => {
    healEl.classList.add("animate");
    setTimeout(() => {
      healEl.remove();
    }, 1000);
  }, 10);
}

function animateCardDraw(cardEl, fromRect, toRect) {
  const clone = cardEl.cloneNode(true);
  clone.style.position = "fixed";
  clone.style.left = `${fromRect.left}px`;
  clone.style.top = `${fromRect.top}px`;
  clone.style.width = `${fromRect.width}px`;
  clone.style.height = `${fromRect.height}px`;
  clone.style.zIndex = "10000";
  clone.style.pointerEvents = "none";
  document.body.appendChild(clone);
  
  requestAnimationFrame(() => {
    clone.style.transition = "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
    clone.style.left = `${toRect.left}px`;
    clone.style.top = `${toRect.top}px`;
    clone.style.width = `${toRect.width}px`;
    clone.style.height = `${toRect.height}px`;
    clone.style.transform = "rotate(0deg)";
  });
  
  setTimeout(() => {
    clone.remove();
  }, 500);
}

function animateFight(weaponEl, monsterEl) {
  if (!weaponEl || !monsterEl) return;
  
  const weaponRect = weaponEl.getBoundingClientRect();
  const monsterRect = monsterEl.getBoundingClientRect();
  
  // Create fight effect
  const fightEl = document.createElement("div");
  fightEl.className = "fight-animation";
  fightEl.style.position = "fixed";
  fightEl.style.left = `${monsterRect.left + monsterRect.width / 2}px`;
  fightEl.style.top = `${monsterRect.top + monsterRect.height / 2}px`;
  fightEl.style.transform = "translate(-50%, -50%)";
  fightEl.textContent = "⚔️";
  document.body.appendChild(fightEl);
  
  setTimeout(() => {
    fightEl.classList.add("animate");
    setTimeout(() => {
      fightEl.remove();
    }, 600);
  }, 10);
}

function buildDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const color = suit === "hearts" || suit === "diamonds" ? "red" : "black";
      const value = rankValue(rank, suit);
      const isRoyal = ["J", "Q", "K"].includes(rank);
      const isAce = rank === "A";
      
      // Apply game settings to filter cards
      
      // Red aces are always excluded
      if (color === "red" && isAce) continue;
      
      // Diamond royals: excluded by default, included if setting enabled
      if (suit === "diamonds" && isRoyal && !gameSettings.includeDiamondRoyals) continue;
      
      // Heart royals: excluded by default, included if setting enabled
      if (suit === "hearts" && isRoyal && !gameSettings.includeHeartRoyals) continue;
      
      // Ace monsters: included by default, excluded if setting enabled
      if ((suit === "clubs" || suit === "spades") && isAce && gameSettings.removeAceMonsters) continue;
      
      cards.push({
        id: `${suit}-${rank}-${Math.random().toString(16).slice(2)}`,
        suit,
        rank,
        value,
        color,
      });
    }
  }
  return cards;
}

function rankValue(rank, suit) {
  if (["J", "Q", "K"].includes(rank)) return { J: 11, Q: 12, K: 13 }[rank];
  if (rank === "A") return suit === "diamonds" || suit === "hearts" ? 14 : 14;
  return Number(rank);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function initGame() {
  const fullDeck = buildDeck();
  state.originalDeck = [...fullDeck];
  // Shuffle for new game
  const shuffledDeck = shuffle([...fullDeck]);
  state.deck = [...shuffledDeck];
  // Store the exact deck order for restart
  state.initialDeckOrder = [...shuffledDeck];
  state.discard = [];
  // Initialize floor as array of 4 empty slots
  state.floor = [null, null, null, null];
  state.weapon = null;
  state.weaponDamage = [];
  state.weaponMaxNext = Infinity;
  state.health = gameSettings.maxHealth;
  state.floorNumber = 1;
  state.runsRemaining = gameSettings.maxRuns;
  state.floorFresh = true;
  state.healUsed = false;
  state.firstFloorDealt = false;
  
  // Clear history on new game
  stateHistory = [];
  
  setStatus("Click the deck to deal your first floor!");
  render();
  updateUndoButton();
  // Initialize health bar
  const healthPercent = (state.health / gameSettings.maxHealth) * 100;
  document.getElementById("healthBar").style.width = `${healthPercent}%`;
}

function restartGame() {
  // Restart with the exact same deck order (no shuffle)
  if (state.initialDeckOrder.length > 0) {
    state.deck = [...state.initialDeckOrder];
  } else {
    // Fallback if no initial order stored
    state.deck = shuffle([...state.originalDeck]);
    state.initialDeckOrder = [...state.deck];
  }
  state.discard = [];
  // Initialize floor as array of 4 empty slots
  state.floor = [null, null, null, null];
  state.weapon = null;
  state.weaponDamage = [];
  state.weaponMaxNext = Infinity;
  state.health = gameSettings.maxHealth;
  state.floorNumber = 1;
  state.runsRemaining = gameSettings.maxRuns;
  state.floorFresh = true;
  state.healUsed = false;
  state.firstFloorDealt = false;
  
  // Clear history on restart
  stateHistory = [];
  
  setStatus("Click the deck to deal your first floor!");
  render();
  updateUndoButton();
  // Initialize health bar
  const healthPercent = (state.health / gameSettings.maxHealth) * 100;
  document.getElementById("healthBar").style.width = `${healthPercent}%`;
}

function drawCards(count) {
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    if (state.deck.length === 0) break;
    drawn.push(state.deck.shift());
  }
  return drawn;
}

function getFloorCardCount() {
  // Count non-null cards in floor
  return state.floor.filter(c => c !== null).length;
}

function fillFloorSlots() {
  // Fill null slots in floor with cards from deck
  for (let i = 0; i < 4; i++) {
    if (state.floor[i] === null && state.deck.length > 0) {
      state.floor[i] = state.deck.shift();
    }
  }
}

function render() {
  const floorRow = document.getElementById("floorRow");
  floorRow.innerHTML = "";
  
  // Always maintain 4 placeholders - floor is now array of 4 slots
  // Ensure floor has exactly 4 slots
  while (state.floor.length < 4) {
    state.floor.push(null);
  }
  
  for (let i = 0; i < 4; i++) {
    const card = state.floor[i];
    if (card) {
      // Card exists at this position
    const cardEl = createCardEl(card);
    cardEl.draggable = true;
    cardEl.dataset.from = "floor";
    floorRow.appendChild(cardEl);
    } else {
      // Empty placeholder
    const empty = document.createElement("div");
      empty.className = "empty floor-placeholder";
    floorRow.appendChild(empty);
    }
  }

  document.getElementById("discardCount").textContent = `${state.discard.length} cards`;
  document.getElementById("healthValue").textContent = `${state.health} / ${gameSettings.maxHealth}`;
  document.getElementById("floorValue").textContent = state.floorNumber;

  // Update health bar
  const healthPercent = (state.health / gameSettings.maxHealth) * 100;
  document.getElementById("healthBar").style.width = `${healthPercent}%`;

  renderDeck();
  renderWeapon();
  renderWeaponDamage();
  renderDiscard();
  renderRunButton();
  attachDragListeners();
}

function renderWeapon() {
  const slot = document.getElementById("weaponSlot");
  const infoBar = document.getElementById("weaponInfoBar");
  slot.innerHTML = "";
  
  if (!state.weapon) {
    const empty = document.createElement("div");
    empty.className = "slot-drop";
    empty.textContent = "Drop diamonds to equip";
    slot.appendChild(empty);
    infoBar.textContent = "";
    infoBar.classList.remove("active");
    return;
  }
  const cardEl = createCardEl(state.weapon);
  cardEl.draggable = true;
  cardEl.dataset.from = "weapon";
  
  // Add tooltip showing weapon power
  cardEl.dataset.tooltip = `Power: ${state.weapon.value}`;
  
  slot.appendChild(cardEl);

  // Update weapon info bar above slots
  if (gameSettings.weaponDegradation === "none") {
    infoBar.textContent = "⚔️ No degradation";
  } else if (state.weaponDamage.length === 0) {
    infoBar.textContent = "⚔️ Fresh weapon - can attack any monster";
  } else {
    const comparison = gameSettings.weaponDegradation === "strict" ? "<" : "≤";
    const maxVal = gameSettings.weaponDegradation === "strict" 
      ? Math.max(2, state.weaponMaxNext + 1)
      : Math.max(2, state.weaponMaxNext);
    infoBar.textContent = `⚔️ Can attack monsters ${comparison} ${maxVal}`;
  }
  infoBar.classList.add("active");
}

function renderWeaponDamage() {
  const slot = document.getElementById("weaponDamageSlot");
  slot.innerHTML = "";
  // Make it a drop target for monsters
  slot.classList.add("drop-target");
  slot.dataset.drop = "weaponDamage";
  
  if (state.weaponDamage.length === 0) {
    const empty = document.createElement("div");
    empty.className = "slot-drop";
    empty.textContent = "No defeated monsters";
    slot.appendChild(empty);
    return;
  }
  // Stack cards with offset so corners are visible
  const stackContainer = document.createElement("div");
  stackContainer.className = "card-stack";
  state.weaponDamage.forEach((card, index) => {
    const el = createCardEl(card);
    el.classList.add("stacked");
    el.style.position = "absolute";
    el.style.zIndex = index + 1;
    el.style.transform = `translate(${index * 10}px, ${index * 10}px)`;
    el.style.transition = "transform 0.12s ease";
    stackContainer.appendChild(el);
  });
  slot.appendChild(stackContainer);
}

function renderDeck() {
  const slot = document.getElementById("deckBack");
  if (!slot) return;
  
  // Update deck count
  const deckCount = document.getElementById("deckCount");
  if (deckCount) {
    deckCount.textContent = `${state.deck.length} cards`;
  }
  
  // Make deck clickable if first floor not dealt
  if (!state.firstFloorDealt && state.deck.length > 0) {
    slot.classList.add("clickable");
    slot.title = "Click to deal your first floor";
  } else {
    slot.classList.remove("clickable");
    slot.title = "";
  }
  
  // Deck is just a single card back (no stack)
  // The card back element already exists in HTML, we just update its state
}

function renderDiscard() {
  const slot = document.getElementById("discardSlot");
  slot.innerHTML = "";
  
  // Make it a drop target for weapons
  slot.classList.add("drop-target");
  slot.dataset.drop = "discard";
  
  if (state.discard.length === 0) {
    const empty = document.createElement("div");
    empty.className = "slot-drop";
    slot.appendChild(empty);
    return;
  }
  
  // Stack cards with offset so corners are visible
  // Show only the last 10 cards to avoid too much stacking
  const cardsToShow = state.discard.slice(-10);
  const stackContainer = document.createElement("div");
  stackContainer.className = "card-stack";
  
  cardsToShow.forEach((card, index) => {
    const el = createCardEl(card);
    el.classList.add("stacked");
    el.style.position = "absolute";
    el.style.zIndex = index + 1;
    el.style.transform = `translateY(${index * 3}px)`;
    el.style.transition = "transform 0.12s ease";
    stackContainer.appendChild(el);
  });
  
  slot.appendChild(stackContainer);
}

function renderRunButton() {
  const btn = document.getElementById("runButton");
  const canRun = state.runsRemaining > 0 && state.floorFresh && getFloorCardCount() > 0;
  btn.disabled = !canRun;
  
  if (state.runsRemaining <= 0) {
    btn.textContent = "No runs left";
  } else if (gameSettings.maxRuns === 1) {
    btn.textContent = "Run away (once)";
  } else {
    btn.textContent = `Run away (${state.runsRemaining} left)`;
  }
}

// Monster graphics mapping
const MONSTER_GRAPHICS = {
  "A": "🐉", // Dragon
  "K": "👹", // Cave Troll
  "Q": "👻", // Banshee
  "J": "🐺", // Dire Wolf
};

function createCardEl(card) {
  const el = document.createElement("div");
  const isMonster = card.suit === "clubs" || card.suit === "spades";
  const isRoyalMonster = isMonster && ["A", "K", "Q", "J"].includes(card.rank);
  
  el.className = `card ${card.color}`;
  if (isRoyalMonster) {
    el.classList.add("monster-royal");
  }
  
  el.setAttribute("data-suit", suitIcons[card.suit]);
  el.dataset.cardId = card.id;
  el.dataset.suit = card.suit;
  el.dataset.rank = card.rank;
  el.dataset.value = card.value;

  const cornerTop = document.createElement("div");
  cornerTop.className = "corner";
  cornerTop.innerHTML = `${card.rank}<br/>${suitIcons[card.suit]}`;

  const center = document.createElement("div");
  center.className = "suit";
  
  // Use monster graphic for royal monsters, otherwise use suit icon
  if (isRoyalMonster && MONSTER_GRAPHICS[card.rank]) {
    center.textContent = MONSTER_GRAPHICS[card.rank];
  } else {
    center.textContent = suitIcons[card.suit];
  }

  const cornerBottom = document.createElement("div");
  cornerBottom.className = "corner bottom";
  cornerBottom.innerHTML = `${card.rank}<br/>${suitIcons[card.suit]}`;

  el.appendChild(cornerTop);
  el.appendChild(center);
  el.appendChild(cornerBottom);
  return el;
}

function setStatus(message) {
  document.getElementById("status").textContent = message;
}

function attachDragListeners() {
  document.querySelectorAll(".drop-target").forEach((target) => {
    target.removeEventListener("dragover", onDragOver);
    target.removeEventListener("dragleave", onDragLeave);
    target.removeEventListener("drop", onDrop);
    target.addEventListener("dragover", onDragOver);
    target.addEventListener("dragleave", onDragLeave);
    target.addEventListener("drop", onDrop);
  });

  document.querySelectorAll(".card").forEach((cardEl) => {
    cardEl.addEventListener("dragstart", (e) => {
      const payload = {
        id: cardEl.dataset.cardId,
        from: cardEl.dataset.from || "floor",
      };
      e.dataTransfer.setData("application/json", JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "move";
    });
  });
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  e.currentTarget.classList.add("highlight");
}

function onDragLeave(e) {
  e.currentTarget.classList.remove("highlight");
}

function onDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("highlight");
  const payload = safeParse(e.dataTransfer.getData("application/json"));
  if (!payload) return;
  const card = findCardById(payload.id, payload.from);
  if (!card) return;

  const target = e.currentTarget.dataset.drop;
  const handlers = {
    heal: handleHealDrop,
    weapon: handleWeaponAreaDrop,
    weaponDamage: handleWeaponAreaDrop, // Allow monsters to be dropped on weapon damage slot
    discard: handleDiscardDrop,
    health: handleHealthDamageDrop,
  };
  const handler = handlers[target];
  if (handler) {
    handler(card, payload.from);
  }
}

function findCardById(id, from) {
  const poolMap = {
    floor: state.floor.filter(c => c !== null), // Filter out nulls for floor
    weapon: state.weapon ? [state.weapon] : [],
  };
  const pool = poolMap[from] || [];
  return pool.find((c) => c && c.id === id);
}

function removeFromPool(card, from) {
  if (from === "floor") {
    // Find the card's slot and set it to null (preserve position)
    const index = state.floor.findIndex((c) => c && c.id === card.id);
    if (index !== -1) {
      state.floor[index] = null;
    }
  } else if (from === "weapon" && state.weapon && state.weapon.id === card.id) {
    state.weapon = null;
    state.weaponDamage = [];
    state.weaponMaxNext = Infinity;
  }
}

function handleHealDrop(card, from) {
  if (card.suit !== "hearts") {
    setStatus("Only hearts can heal.");
    return;
  }
  
  saveStateToHistory();
  removeFromPool(card, from);
  state.discard.push(card);
  state.floorFresh = false;
  
  // Check healing mode
  const canHeal = gameSettings.healingMode === "unlimited" || !state.healUsed;
  
  if (!canHeal) {
    setStatus(`Used ${card.rank} of hearts, but healing only works once per floor.`);
    postAction();
    return;
  }
  
  // Apply healing
  state.healUsed = true;
  const healed = Math.min(gameSettings.maxHealth, state.health + card.value) - state.health;
  state.health = Math.min(gameSettings.maxHealth, state.health + card.value);
  setStatus(`Healed ${healed} health with ${card.rank} of hearts.`);
  if (healed > 0) {
    showHealAnimation(healed);
  }
  postAction();
}

function handleWeaponDrop(card, from) {
  if (card.suit !== "diamonds") {
    setStatus("Only diamonds can be equipped as weapons.");
    return;
  }
  removeFromPool(card, from);
  // Discard existing weapon and its defeated monsters when replacing
  if (state.weapon) {
    state.discard.push(state.weapon, ...state.weaponDamage);
  }
  state.weapon = card;
  state.weaponDamage = [];
  state.weaponMaxNext = Infinity;
  state.floorFresh = false;
  setStatus(`Equipped weapon ${card.rank} of diamonds (power ${card.value}).`);
  postAction();
}

function handleDiscardDrop(card, from) {
  // Only weapons can be discarded directly
  if (from === "weapon") {
    // Weapon discard - send weapon and all defeated monsters to discard
    state.discard.push(state.weapon, ...state.weaponDamage);
    state.weapon = null;
    state.weaponDamage = [];
    state.weaponMaxNext = Infinity;
  state.floorFresh = false;
    setStatus("Weapon discarded.");
  postAction();
  } else {
    // Floor cards cannot be discarded directly
    setStatus("You can only remove cards by equipping weapons, defeating monsters, or healing.");
  }
}

function handleHealthDamageDrop(card, from) {
  if (card.suit === "hearts" || card.suit === "diamonds") {
    setStatus("Take damage only from monsters (clubs/spades).");
    return;
  }
  const damage = card.value;
  removeFromPool(card, from);
  state.health -= damage;
  state.discard.push(card);
  state.floorFresh = false;
  setStatus(`Took ${damage} damage from ${card.rank} of ${card.suit}.`);
  showDamageAnimation(damage);
  postAction();
}

function handleMonsterOnWeapon(monsterCard, monsterEl) {
  if (!state.weapon) {
    setStatus("Equip a weapon (diamonds) before attacking monsters.");
    return false;
  }
  const monsterValue = monsterCard.value;
  
  // Check weapon degradation based on settings
  if (gameSettings.weaponDegradation !== "none" && monsterValue > state.weaponMaxNext) {
    const comparison = gameSettings.weaponDegradation === "strict" ? "<" : "≤";
    setStatus(
      `Weapon can only fight monsters ${comparison} ${Math.max(2, state.weaponMaxNext + (gameSettings.weaponDegradation === "equal" ? 1 : 0))} now.`
    );
    return false;
  }
  
  const damage = Math.max(0, monsterValue - state.weapon.value);
  state.health -= damage;
  // Track defeated monster for weapon degradation (keep in weaponDamage, not discard yet)
  state.weaponDamage.push(monsterCard);
  
  // Apply weapon degradation based on mode
  if (gameSettings.weaponDegradation === "strict") {
  state.weaponMaxNext = Math.min(state.weaponMaxNext, monsterValue - 1);
  } else if (gameSettings.weaponDegradation === "equal") {
    state.weaponMaxNext = Math.min(state.weaponMaxNext, monsterValue);
  }
  // "none" mode: weaponMaxNext stays at Infinity
  
  state.floorFresh = false;
  setStatus(
    `Fought ${monsterCard.rank} ${monsterCard.suit} (power ${monsterValue}). Took ${damage} damage.`
  );
  
  // Show fight animation
  const weaponEl = document.querySelector("#weaponSlot .card");
  if (weaponEl && monsterEl) {
    animateFight(weaponEl, monsterEl);
  }
  if (damage > 0) {
    setTimeout(() => showDamageAnimation(damage), 300);
  }
  
  return true;
}

function handleWeaponAreaDrop(card, from) {
  if (card.suit === "diamonds") {
    handleWeaponDrop(card, from);
    return;
  }
  if (card.suit === "clubs" || card.suit === "spades") {
    // Get the card element before removing it
    const cardEl = document.querySelector(`[data-card-id="${card.id}"]`);
    // Find the card's slot index before removing
    const slotIndex = from === "floor" ? state.floor.findIndex((c) => c && c.id === card.id) : -1;
    removeFromPool(card, from);
    const ok = handleMonsterOnWeapon(card, cardEl);
    if (!ok) {
      // Undo removal if not ok - restore to original slot
      if (from === "floor" && slotIndex !== -1) {
        state.floor[slotIndex] = card;
      }
    } else {
      postAction();
    }
    return;
  }
  setStatus("Only weapons (diamonds) or monsters go here.");
}

function saveStateToHistory() {
  // Deep clone the current state
  const stateCopy = {
    deck: state.deck.map(c => ({...c})),
    discard: state.discard.map(c => ({...c})),
    floor: state.floor.map(c => c ? {...c} : null),
    weapon: state.weapon ? {...state.weapon} : null,
    weaponDamage: state.weaponDamage.map(c => ({...c})),
    weaponMaxNext: state.weaponMaxNext,
    health: state.health,
    floorNumber: state.floorNumber,
    runsRemaining: state.runsRemaining,
    floorFresh: state.floorFresh,
    healUsed: state.healUsed,
    firstFloorDealt: state.firstFloorDealt,
  };
  
  stateHistory.push(stateCopy);
  
  // Keep only the last MAX_HISTORY states
  if (stateHistory.length > MAX_HISTORY) {
    stateHistory.shift();
  }
  
  updateUndoButton();
}

function restoreStateFromHistory() {
  if (stateHistory.length === 0) return;
  
  const previousState = stateHistory.pop();
  
  // Restore all state properties
  state.deck = previousState.deck.map(c => ({...c}));
  state.discard = previousState.discard.map(c => ({...c}));
  state.floor = previousState.floor.map(c => c ? {...c} : null);
  state.weapon = previousState.weapon ? {...previousState.weapon} : null;
  state.weaponDamage = previousState.weaponDamage.map(c => ({...c}));
  state.weaponMaxNext = previousState.weaponMaxNext;
  state.health = previousState.health;
  state.floorNumber = previousState.floorNumber;
  state.runsRemaining = previousState.runsRemaining;
  state.floorFresh = previousState.floorFresh;
  state.healUsed = previousState.healUsed;
  state.firstFloorDealt = previousState.firstFloorDealt;
  
  render();
  updateUndoButton();
  setStatus("Undone last action.");
}

function updateUndoButton() {
  const btn = document.getElementById("undoButton");
  if (btn) {
    btn.disabled = stateHistory.length === 0;
  }
}

function postAction() {
  checkHealth();
  const needsRefill = refillIfNeeded();
  if (!needsRefill) {
  render();
  }
  checkWin();
}

function refillIfNeeded() {
  const floorCardCount = getFloorCardCount();
  if (floorCardCount <= 1 && state.deck.length > 0) {
    const needed = Math.min(3, state.deck.length);
    const drawnCards = drawCards(needed);
    
    // Track which slots are being filled
    const slotsToFill = [];
    let cardIndex = 0;
    for (let i = 0; i < 4 && cardIndex < drawnCards.length; i++) {
      if (state.floor[i] === null) {
        state.floor[i] = drawnCards[cardIndex];
        slotsToFill.push(i);
        cardIndex++;
      }
    }
    
    state.floorNumber += 1;
    state.floorFresh = true;
    state.healUsed = false;
    
    // Render first to update UI (deck count, floor number, etc.)
    render();
    
    // Now set up animation for new cards
    setTimeout(() => {
      const deckSlot = document.getElementById("deckBack");
      const floorRow = document.getElementById("floorRow");
      
      if (!deckSlot || !floorRow) return;
      
      const deckRect = deckSlot.getBoundingClientRect();
      
      // Replace new card slots with back cards for animation
      slotsToFill.forEach(slotIndex => {
        const existingEl = floorRow.children[slotIndex];
        if (existingEl && existingEl.dataset.cardId) {
          const backCard = document.createElement("div");
          backCard.className = "card back";
          backCard.dataset.slotIndex = slotIndex;
          backCard.style.opacity = "0";
          existingEl.replaceWith(backCard);
        }
      });
      
      // Animate card draws
      setTimeout(() => {
        slotsToFill.forEach((slotIndex, index) => {
          const backCardEl = floorRow.children[slotIndex];
          if (!backCardEl || !backCardEl.classList.contains("back")) return;
          
          const cardRect = backCardEl.getBoundingClientRect();
          const tempCard = document.createElement("div");
          tempCard.className = "card back";
          tempCard.style.position = "fixed";
          tempCard.style.left = `${deckRect.left}px`;
          tempCard.style.top = `${deckRect.top}px`;
          tempCard.style.width = `${deckRect.width}px`;
          tempCard.style.height = `${deckRect.height}px`;
          tempCard.style.zIndex = "10000";
          tempCard.style.pointerEvents = "none";
          tempCard.style.opacity = "0";
          tempCard.style.transform = "rotate(0deg)";
          document.body.appendChild(tempCard);
          
          setTimeout(() => {
            requestAnimationFrame(() => {
              tempCard.style.transition = "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";
              tempCard.style.left = `${cardRect.left}px`;
              tempCard.style.top = `${cardRect.top}px`;
              tempCard.style.width = `${cardRect.width}px`;
              tempCard.style.height = `${cardRect.height}px`;
              tempCard.style.opacity = "1";
              tempCard.style.transform = "rotate(360deg)";
              backCardEl.style.opacity = "1";
            });
            
            setTimeout(() => {
              tempCard.remove();
              // Reveal the actual card face
              const card = state.floor[slotIndex];
              if (card) {
                const cardEl = createCardEl(card);
                cardEl.draggable = true;
                cardEl.dataset.from = "floor";
                cardEl.classList.add("drawing");
                backCardEl.replaceWith(cardEl);
                setTimeout(() => {
                  cardEl.classList.remove("drawing");
                  attachDragListeners();
                }, 200);
              }
            }, 800);
          }, index * 200); // Stagger the animations
        });
      }, 50);
    }, 50);
    
    setStatus(`New dungeon floor ${state.floorNumber}. Drew ${needed} cards.`);
    return true; // Indicate that refill happened and animation is in progress
  }
  return false; // No refill needed
}

function checkHealth() {
  if (state.health <= 0) {
    state.health = 0;
    setStatus("You have been defeated!");
    setTimeout(() => showLoseModal(), 500);
  }
}

function checkWin() {
  if (state.deck.length === 0 && getFloorCardCount() === 0) {
    setStatus("You cleared the dungeon!");
    setTimeout(() => showWinModal(), 500);
  }
}

function showWinModal() {
  const modal = document.getElementById("winModal");
  modal.classList.add("show");
  
  // Record the win for leaderboard
  recordWin();
  
  // Trigger streamer animation
  setTimeout(() => {
    document.querySelectorAll(".streamer").forEach((streamer, index) => {
      setTimeout(() => {
        streamer.classList.add("animate");
      }, index * 100);
    });
  }, 100);
}

function hideWinModal() {
  const modal = document.getElementById("winModal");
  modal.classList.remove("show");
  document.querySelectorAll(".streamer").forEach(streamer => {
    streamer.classList.remove("animate");
  });
}

function showLoseModal() {
  const modal = document.getElementById("loseModal");
  modal.classList.add("show");
  
  // Record floors for leaderboard (on loss)
  recordFloors();
  
  // Enable/disable redo button based on history
  const redoBtn = document.getElementById("loseRedoBtn");
  if (redoBtn) {
    redoBtn.disabled = stateHistory.length === 0;
  }
}

function hideLoseModal() {
  const modal = document.getElementById("loseModal");
  modal.classList.remove("show");
}

function showRunAwayPopup() {
  const popup = document.getElementById("runAwayPopup");
  popup.classList.add("show");
  setTimeout(() => {
    popup.classList.remove("show");
  }, 1500);
}

function handleRunAway() {
  // Collect all non-null floor cards and add to deck
  const floorCards = state.floor.filter(c => c !== null);
  state.deck.push(...floorCards);
  
  // Reset floor
  state.floor = [null, null, null, null];
  
  state.runsRemaining -= 1;
  state.floorFresh = true;
  state.healUsed = false;
  state.floorNumber += 1;
  
  // Show popup animation
  showRunAwayPopup();
  
  // Render empty floor
  render();
  
  // After popup, deal new cards with animation
  setTimeout(() => {
    const newCards = drawCards(4);
    for (let i = 0; i < newCards.length && i < 4; i++) {
      state.floor[i] = newCards[i];
    }
    
    // Animate dealing new cards
    animateFloorDeal();
    setStatus("You ran away. New dungeon floor drawn.");
  }, 800);
}

function animateFloorDeal() {
  const deckSlot = document.getElementById("deckBack");
  const floorRow = document.getElementById("floorRow");
  
  if (!deckSlot || !floorRow) return;
  
  const deckRect = deckSlot.getBoundingClientRect();
  
  // Render floor with back cards initially
  floorRow.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    if (state.floor[i]) {
      const backCard = document.createElement("div");
      backCard.className = "card back";
      backCard.dataset.slotIndex = i;
      backCard.style.opacity = "0";
      floorRow.appendChild(backCard);
    } else {
      const empty = document.createElement("div");
      empty.className = "empty floor-placeholder";
      floorRow.appendChild(empty);
    }
  }
  
  // Animate cards being dealt
  setTimeout(() => {
    const backCards = Array.from(floorRow.children).filter(el => el.classList.contains("back"));
    
    backCards.forEach((backCardEl, index) => {
      const slotIndex = parseInt(backCardEl.dataset.slotIndex);
      const cardRect = backCardEl.getBoundingClientRect();
      
      // Create animated card
      const tempCard = document.createElement("div");
      tempCard.className = "card back";
      tempCard.style.position = "fixed";
      tempCard.style.left = `${deckRect.left}px`;
      tempCard.style.top = `${deckRect.top}px`;
      tempCard.style.width = `${deckRect.width}px`;
      tempCard.style.height = `${deckRect.height}px`;
      tempCard.style.zIndex = "10000";
      tempCard.style.pointerEvents = "none";
      tempCard.style.opacity = "0";
      tempCard.style.transform = "rotate(0deg)";
      document.body.appendChild(tempCard);
      
      setTimeout(() => {
        requestAnimationFrame(() => {
          tempCard.style.transition = "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";
          tempCard.style.left = `${cardRect.left}px`;
          tempCard.style.top = `${cardRect.top}px`;
          tempCard.style.width = `${cardRect.width}px`;
          tempCard.style.height = `${cardRect.height}px`;
          tempCard.style.opacity = "1";
          tempCard.style.transform = "rotate(360deg)";
          backCardEl.style.opacity = "1";
        });
        
        setTimeout(() => {
          tempCard.remove();
          // Reveal the actual card face
          const card = state.floor[slotIndex];
          if (card) {
            const cardEl = createCardEl(card);
            cardEl.draggable = true;
            cardEl.dataset.from = "floor";
            cardEl.classList.add("drawing");
            backCardEl.replaceWith(cardEl);
            setTimeout(() => {
              cardEl.classList.remove("drawing");
              attachDragListeners();
            }, 200);
          }
        }, 800);
      }, index * 200); // Stagger the animations
    });
  }, 50);
}

function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch (err) {
    return null;
  }
}

function setupButtons() {
  document.getElementById("runButton").addEventListener("click", () => {
    if (state.runsRemaining <= 0) return;
    if (!state.floorFresh) {
      setStatus("You can only run at the start of a floor.");
      return;
    }
    if (getFloorCardCount() === 0) {
      setStatus("No cards to run from.");
      return;
    }
    handleRunAway();
  });

  document.getElementById("discardWeaponBtn").addEventListener("click", () => {
    if (!state.weapon) {
      setStatus("No weapon to discard.");
      return;
    }
    // Weapon discard - send weapon and all defeated monsters to discard
    state.discard.push(state.weapon, ...state.weaponDamage);
    state.weapon = null;
    state.weaponDamage = [];
    state.weaponMaxNext = Infinity;
    state.floorFresh = false;
    setStatus("Weapon discarded.");
    postAction();
  });

  document.getElementById("newGameButton").addEventListener("click", () => {
    if (confirm("Start a new game? This will shuffle a fresh deck.")) {
      initGame();
    }
  });

  document.getElementById("restartButton").addEventListener("click", () => {
    if (confirm("Restart this game? This will reshuffle the current deck.")) {
      restartGame();
    }
  });

  document.getElementById("winNewGameBtn").addEventListener("click", () => {
    hideWinModal();
    initGame();
  });

  document.getElementById("loseRestartBtn").addEventListener("click", () => {
    hideLoseModal();
    restartGame();
  });

  document.getElementById("loseNewGameBtn").addEventListener("click", () => {
    hideLoseModal();
    initGame();
  });

  document.getElementById("loseRedoBtn").addEventListener("click", () => {
    hideLoseModal();
    restoreStateFromHistory();
  });

  document.getElementById("undoButton").addEventListener("click", () => {
    restoreStateFromHistory();
  });

  // Make deck clickable to deal first floor
  document.getElementById("deckBack").addEventListener("click", () => {
    if (!state.firstFloorDealt && state.deck.length > 0) {
      dealFirstFloor();
    }
  });

  // Settings button
  const settingsBtn = document.getElementById("settingsButton");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", showSettingsModal);
  }

  // Settings modal buttons
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener("click", hideSettingsModal);
  }

  const applySettingsBtn = document.getElementById("applySettingsBtn");
  if (applySettingsBtn) {
    applySettingsBtn.addEventListener("click", () => {
      readSettingsFromUI();
      hideSettingsModal();
      initGame(); // Start new game with new settings
    });
  }

  // Difficulty preset buttons
  document.querySelectorAll("[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      applyDifficultyPreset(btn.dataset.preset);
    });
  });
}

function showSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (modal) {
    updateSettingsUI();
    modal.classList.add("show");
  }
}

function hideSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (modal) {
    modal.classList.remove("show");
  }
}

// Touch drag and drop support for mobile
let touchDragState = {
  draggedCard: null,
  draggedElement: null,
  clone: null,
  startX: 0,
  startY: 0,
  from: null
};

function setupTouchDragDrop() {
  // Touch events for cards
  document.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function handleTouchStart(e) {
  const cardEl = e.target.closest('.card');
  if (!cardEl || !cardEl.draggable) return;
  
  e.preventDefault();
  
  const touch = e.touches[0];
  const cardId = cardEl.dataset.cardId;
  const from = cardEl.dataset.from || 'floor';
  
  touchDragState.draggedCard = findCardById(cardId, from);
  touchDragState.draggedElement = cardEl;
  touchDragState.from = from;
  touchDragState.startX = touch.clientX;
  touchDragState.startY = touch.clientY;
  
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
  
  touchDragState.clone = clone;
  cardEl.style.opacity = '0.3';
}

function handleTouchMove(e) {
  if (!touchDragState.clone) return;
  
  e.preventDefault();
  
  const touch = e.touches[0];
  const cardEl = touchDragState.draggedElement;
  
  touchDragState.clone.style.left = `${touch.clientX - cardEl.offsetWidth / 2}px`;
  touchDragState.clone.style.top = `${touch.clientY - cardEl.offsetHeight / 2}px`;
  
  // Highlight drop targets under touch
  const dropTarget = findDropTargetUnderTouch(touch.clientX, touch.clientY);
  document.querySelectorAll('.drop-target').forEach(target => {
    target.classList.remove('highlight');
  });
  if (dropTarget) {
    dropTarget.classList.add('highlight');
  }
}

function handleTouchEnd(e) {
  if (!touchDragState.clone) return;
  
  e.preventDefault();
  
  const touch = e.changedTouches[0];
  const dropTarget = findDropTargetUnderTouch(touch.clientX, touch.clientY);
  
  // Clean up
  touchDragState.clone.remove();
  if (touchDragState.draggedElement) {
    touchDragState.draggedElement.style.opacity = '1';
  }
  
  document.querySelectorAll('.drop-target').forEach(target => {
    target.classList.remove('highlight');
  });
  
  // Handle drop
  if (dropTarget && touchDragState.draggedCard) {
    const targetType = dropTarget.dataset.drop;
    const card = touchDragState.draggedCard;
    const from = touchDragState.from;
    
    const handlers = {
      heal: handleHealDrop,
      weapon: handleWeaponAreaDrop,
      weaponDamage: handleWeaponAreaDrop,
      discard: handleDiscardDrop,
      health: handleHealthDamageDrop,
    };
    
    const handler = handlers[targetType];
    if (handler) {
      handler(card, from);
    }
  }
  
  // Reset state
  touchDragState = {
    draggedCard: null,
    draggedElement: null,
    clone: null,
    startX: 0,
    startY: 0,
    from: null
  };
}

function findDropTargetUnderTouch(x, y) {
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

function dealFirstFloor() {
  if (state.firstFloorDealt) return;
  
  const deckSlot = document.getElementById("deckBack");
  const floorRow = document.getElementById("floorRow");
  
  if (!deckSlot || !floorRow) return;
  
  // Draw 4 cards
  const drawnCards = drawCards(4);
  const deckRect = deckSlot.getBoundingClientRect();
  
  // Fill floor slots
  for (let i = 0; i < 4 && i < drawnCards.length; i++) {
    state.floor[i] = drawnCards[i];
  }
  
  state.firstFloorDealt = true;
  state.floorFresh = true;
  state.healUsed = false;
  setStatus("First floor dealt! Drag cards to interact.");
  
  // Update deck count immediately
  renderDeck();
  
  // Render cards as backs initially
  floorRow.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    if (state.floor[i]) {
      const backCard = document.createElement("div");
      backCard.className = "card back";
      backCard.dataset.slotIndex = i;
      backCard.style.opacity = "0";
      floorRow.appendChild(backCard);
    } else {
      const empty = document.createElement("div");
      empty.className = "empty floor-placeholder";
      floorRow.appendChild(empty);
    }
  }
  
  // Animate cards being dealt
  setTimeout(() => {
    const backCards = Array.from(floorRow.children).filter(el => el.classList.contains("back"));
    
    backCards.forEach((backCardEl, index) => {
      const slotIndex = parseInt(backCardEl.dataset.slotIndex);
      const cardRect = backCardEl.getBoundingClientRect();
      
      // Create animated card
      const tempCard = document.createElement("div");
      tempCard.className = "card back";
      tempCard.style.position = "fixed";
      tempCard.style.left = `${deckRect.left}px`;
      tempCard.style.top = `${deckRect.top}px`;
      tempCard.style.width = `${deckRect.width}px`;
      tempCard.style.height = `${deckRect.height}px`;
      tempCard.style.zIndex = "10000";
      tempCard.style.pointerEvents = "none";
      tempCard.style.opacity = "0";
      tempCard.style.transform = "rotate(0deg)";
      document.body.appendChild(tempCard);
      
      setTimeout(() => {
        requestAnimationFrame(() => {
          tempCard.style.transition = "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";
          tempCard.style.left = `${cardRect.left}px`;
          tempCard.style.top = `${cardRect.top}px`;
          tempCard.style.width = `${cardRect.width}px`;
          tempCard.style.height = `${cardRect.height}px`;
          tempCard.style.opacity = "1";
          tempCard.style.transform = "rotate(360deg)";
          backCardEl.style.opacity = "1";
        });
        
        setTimeout(() => {
          tempCard.remove();
          // Now reveal the actual card face
          const card = state.floor[slotIndex];
          if (card) {
            const cardEl = createCardEl(card);
            cardEl.draggable = true;
            cardEl.dataset.from = "floor";
            cardEl.classList.add("drawing");
            backCardEl.replaceWith(cardEl);
            setTimeout(() => {
              cardEl.classList.remove("drawing");
              attachDragListeners();
              // Update run button after all cards are revealed
              if (index === backCards.length - 1) {
                renderRunButton();
              }
            }, 200);
          }
        }, 800);
      }, index * 200); // Stagger the animations
    });
  }, 50);
}

window.addEventListener("DOMContentLoaded", () => {
  setupButtons();
  setupTouchDragDrop();
  setupLeaderboard();
  setupThemeSelector();
  initGame();
});


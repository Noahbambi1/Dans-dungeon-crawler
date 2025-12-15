/**
 * Test different balance settings to verify win rates
 */

const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function rankValue(rank) {
  if (["J", "Q", "K"].includes(rank)) return { J: 11, Q: 12, K: 13 }[rank];
  if (rank === "A") return 14;
  return Number(rank);
}

function buildDeck(settings) {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const color = suit === "hearts" || suit === "diamonds" ? "red" : "black";
      const value = rankValue(rank);
      const isRoyal = ["J", "Q", "K"].includes(rank);
      const isAce = rank === "A";
      
      if (color === "red" && isAce) continue;
      if (suit === "diamonds" && isRoyal && !settings.includeDiamondRoyals) continue;
      if (suit === "hearts" && isRoyal && !settings.includeHeartRoyals) continue;
      if ((suit === "clubs" || suit === "spades") && isAce && settings.removeAceMonsters) continue;
      
      cards.push({ suit, rank, value, color });
    }
  }
  return cards;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isMonster(card) {
  return card.suit === "clubs" || card.suit === "spades";
}

function isHeart(card) {
  return card.suit === "hearts";
}

function isDiamond(card) {
  return card.suit === "diamonds";
}

function simulateGame(deck, settings) {
  const state = {
    deck: [...deck],
    floor: [],
    weapon: null,
    weaponMaxNext: Infinity,
    health: settings.maxHealth,
    runsRemaining: settings.maxRuns,
    healUsed: false,
  };

  state.floor = state.deck.splice(0, 4);

  let moves = 0;
  const maxMoves = 300;

  while (moves++ < maxMoves) {
    if (state.health <= 0) return { won: false };
    if (state.deck.length === 0 && state.floor.length === 0) return { won: true };

    const actions = getAllActions(state, settings);
    
    if (actions.length === 0) {
      if (state.runsRemaining > 0 && state.floor.length > 0) {
        state.deck.push(...state.floor);
        state.floor = state.deck.splice(0, Math.min(4, state.deck.length));
        state.runsRemaining--;
        state.healUsed = false;
        continue;
      }
      return { won: false };
    }

    const bestAction = chooseBestAction(state, actions, settings);
    executeAction(state, bestAction, settings);

    if (state.floor.length <= 1 && state.deck.length > 0) {
      const needed = Math.min(3, state.deck.length);
      state.floor.push(...state.deck.splice(0, needed));
      state.healUsed = false;
    }
  }

  return { won: false };
}

function getAllActions(state, settings) {
  const actions = [];
  
  for (let i = 0; i < state.floor.length; i++) {
    const card = state.floor[i];
    
    if (isHeart(card)) {
      actions.push({ type: "heal", index: i, card });
    } else if (isDiamond(card)) {
      actions.push({ type: "equip", index: i, card });
    } else if (isMonster(card)) {
      if (state.weapon && card.value <= state.weaponMaxNext) {
        actions.push({ type: "fight", index: i, card });
      }
      actions.push({ type: "tank", index: i, card });
    }
  }
  
  return actions;
}

function chooseBestAction(state, actions, settings) {
  return actions.reduce((best, action) => {
    const score = scoreAction(state, action, settings);
    return score > (best.score || -Infinity) ? { ...action, score } : best;
  }, { score: -Infinity });
}

function scoreAction(state, action, settings) {
  const card = action.card;
  
  switch (action.type) {
    case "heal": {
      const canHeal = settings.healingMode === "unlimited" || !state.healUsed;
      if (!canHeal) return -100;
      const actualHeal = Math.min(card.value, settings.maxHealth - state.health);
      const healthPercent = state.health / settings.maxHealth;
      if (healthPercent < 0.25) return actualHeal * 10;
      if (healthPercent < 0.5) return actualHeal * 5;
      return actualHeal * 2;
    }
    
    case "equip": {
      if (!state.weapon) {
        const floorMonsters = state.floor.filter(isMonster);
        return card.value * (floorMonsters.length > 0 ? 5 : 3);
      }
      const currentEffective = Math.min(state.weapon.value, state.weaponMaxNext);
      if (card.value > currentEffective) {
        return (card.value - currentEffective) * 3;
      }
      return -50;
    }
    
    case "fight": {
      const damage = Math.max(0, card.value - state.weapon.value);
      if (damage >= state.health) return -10000;
      
      const fightable = state.floor.filter(
        c => isMonster(c) && c.value <= state.weaponMaxNext
      );
      const isHighest = !fightable.some(m => m.value > card.value);
      
      const saved = card.value - damage;
      return isHighest ? saved * 5 + card.value : saved * 3;
    }
    
    case "tank": {
      if (card.value >= state.health) return -10000;
      if (card.value <= 3) return -card.value * 3;
      if (card.value <= 5) return -card.value * 5;
      return -card.value * 10;
    }
  }
  return 0;
}

function executeAction(state, action, settings) {
  const card = state.floor.splice(action.index, 1)[0];
  
  switch (action.type) {
    case "heal":
      const canHeal = settings.healingMode === "unlimited" || !state.healUsed;
      if (canHeal) {
        state.health = Math.min(settings.maxHealth, state.health + card.value);
      }
      state.healUsed = true;
      break;
    
    case "equip":
      state.weapon = card;
      state.weaponMaxNext = Infinity;
      break;
    
    case "fight":
      const damage = Math.max(0, card.value - state.weapon.value);
      state.health -= damage;
      if (settings.weaponDegradation === "strict") {
        state.weaponMaxNext = Math.min(state.weaponMaxNext, card.value - 1);
      } else if (settings.weaponDegradation === "equal") {
        state.weaponMaxNext = Math.min(state.weaponMaxNext, card.value);
      }
      break;
    
    case "tank":
      state.health -= card.value;
      break;
  }
}

function runTest(name, settings, numGames = 10000) {
  const baseDeck = buildDeck(settings);
  let wins = 0;
  
  for (let i = 0; i < numGames; i++) {
    const shuffled = shuffle(baseDeck);
    const result = simulateGame(shuffled, settings);
    if (result.won) wins++;
  }
  
  const winRate = (wins / numGames * 100).toFixed(2);
  console.log(`  ${name}: ${winRate}% (${wins}/${numGames})`);
  return parseFloat(winRate);
}

// Difficulty presets
const PRESETS = {
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

console.log("\n🎮 BALANCE TESTING - Win Rate Analysis\n");
console.log("=".repeat(50));

const results = {};
for (const [name, settings] of Object.entries(PRESETS)) {
  results[name] = runTest(name.toUpperCase().padEnd(10), settings, 20000);
}

console.log("=".repeat(50));
console.log("\n📊 SUMMARY:\n");

const labels = {
  brutal: "Brutal   (default)",
  hard: "Hard",
  normal: "Normal",
  easy: "Easy",
  casual: "Casual",
};

for (const [name, rate] of Object.entries(results)) {
  const bar = "█".repeat(Math.round(rate / 2)) + "░".repeat(50 - Math.round(rate / 2));
  console.log(`  ${labels[name].padEnd(20)} ${bar} ${rate.toFixed(1)}%`);
}

console.log("\n✅ Balance testing complete!");
console.log("=".repeat(50) + "\n");


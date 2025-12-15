const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const MAX_HEALTH = 20;

const state = {
  deck: [],
  discard: [],
  floor: [],
  weapon: null,
  weaponDamage: [],
  weaponMaxNext: Infinity, // highest monster value weapon can still face (strictly decreasing)
  health: MAX_HEALTH,
  floorNumber: 1,
  runUsed: false,
  floorFresh: true, // true when no actions taken on current floor
};

const suitIcons = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

function buildDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const color = suit === "hearts" || suit === "diamonds" ? "red" : "black";
      const value = rankValue(rank, suit);
      const isRedRoyal = color === "red" && ["J", "Q", "K"].includes(rank);
      const isRedAce = color === "red" && rank === "A";
      if (isRedRoyal || isRedAce) continue;
      // No jokers are generated.
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
  state.deck = shuffle(buildDeck());
  state.discard = [];
  state.floor = drawCards(4);
  state.weapon = null;
  state.weaponDamage = [];
  state.weaponMaxNext = Infinity;
  state.health = MAX_HEALTH;
  state.floorNumber = 1;
  state.runUsed = false;
  state.floorFresh = true;
  setStatus("New game started. Drag cards to interact.");
  render();
}

function drawCards(count) {
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    if (state.deck.length === 0) break;
    drawn.push(state.deck.shift());
  }
  return drawn;
}

function render() {
  const floorRow = document.getElementById("floorRow");
  floorRow.innerHTML = "";
  state.floor.forEach((card) => {
    const cardEl = createCardEl(card);
    cardEl.draggable = true;
    cardEl.dataset.from = "floor";
    floorRow.appendChild(cardEl);
  });
  if (state.floor.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Dungeon floor empty";
    floorRow.appendChild(empty);
  }

  document.getElementById("deckCount").textContent = `${state.deck.length} cards`;
  document.getElementById("discardCount").textContent = `${state.discard.length} cards`;
  document.getElementById("healthValue").textContent = `${state.health} / ${MAX_HEALTH}`;
  document.getElementById("floorValue").textContent = state.floorNumber;

  renderWeapon();
  renderWeaponDamage();
  renderRunButton();
  attachDragListeners();
}

function renderWeapon() {
  const slot = document.getElementById("weaponSlot");
  slot.innerHTML = "";
  slot.classList.add("drop-target");
  slot.dataset.drop = "weapon";
  if (!state.weapon) {
    const empty = document.createElement("div");
    empty.className = "slot-drop";
    empty.textContent = "Drop diamonds to equip";
    slot.appendChild(empty);
    return;
  }
  const cardEl = createCardEl(state.weapon);
  cardEl.draggable = true;
  cardEl.dataset.from = "weapon";
  slot.appendChild(cardEl);

  const info = document.createElement("div");
  info.className = "weapon-info";
  info.textContent =
    state.weaponDamage.length === 0
      ? "Fresh weapon"
      : `Can attack monsters ≤ ${Math.max(2, state.weaponMaxNext)}`;
  slot.appendChild(info);
}

function renderWeaponDamage() {
  const slot = document.getElementById("weaponDamageSlot");
  slot.innerHTML = "";
  if (state.weaponDamage.length === 0) {
    const empty = document.createElement("div");
    empty.className = "slot-drop";
    empty.textContent = "Monsters defeated";
    slot.appendChild(empty);
    return;
  }
  state.weaponDamage.forEach((card) => {
    const el = createCardEl(card);
    el.classList.add("small");
    slot.appendChild(el);
  });
}

function renderRunButton() {
  const btn = document.getElementById("runButton");
  btn.disabled = state.runUsed || !state.floorFresh || state.floor.length === 0;
  btn.textContent = state.runUsed ? "Run used" : "Run away (once)";
}

function createCardEl(card) {
  const el = document.createElement("div");
  el.className = `card ${card.color} suit-${card.suit}`;
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
  center.textContent = suitIcons[card.suit];

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
    weaponDamage: () => setStatus("Drop monsters here after fighting (auto-handled)"),
    discard: handleDiscardDrop,
    health: handleHealthDamageDrop,
  };
  const handler = handlers[target];
  if (handler) handler(card, payload.from);
}

function findCardById(id, from) {
  const poolMap = {
    floor: state.floor,
    weapon: state.weapon ? [state.weapon] : [],
  };
  const pool = poolMap[from] || [];
  return pool.find((c) => c.id === id);
}

function removeFromPool(card, from) {
  if (from === "floor") {
    state.floor = state.floor.filter((c) => c.id !== card.id);
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
  removeFromPool(card, from);
  const before = state.health;
  state.health = Math.min(MAX_HEALTH, state.health + card.value);
  state.discard.push(card);
  state.floorFresh = false;
  setStatus(`Healed ${state.health - before} health with ${card.rank} of hearts.`);
  postAction();
}

function handleWeaponDrop(card, from) {
  if (card.suit !== "diamonds") {
    setStatus("Only diamonds can be equipped as weapons.");
    return;
  }
  removeFromPool(card, from);
  // Discard existing weapon and its history when replacing.
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
  if (from === "weapon") {
    // Weapon discard also dumps damage pile.
    state.discard.push(state.weapon, ...state.weaponDamage);
    state.weapon = null;
    state.weaponDamage = [];
    state.weaponMaxNext = Infinity;
    setStatus("Weapon discarded along with its defeated monsters.");
  } else {
    removeFromPool(card, from);
    state.discard.push(card);
    setStatus("Card discarded.");
  }
  state.floorFresh = false;
  postAction();
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
  postAction();
}

function handleMonsterOnWeapon(monsterCard) {
  if (!state.weapon) {
    setStatus("Equip a weapon (diamonds) before attacking monsters.");
    return false;
  }
  const monsterValue = monsterCard.value;
  if (monsterValue > state.weaponMaxNext) {
    setStatus(
      `Weapon can only fight monsters ≤ ${Math.max(2, state.weaponMaxNext)} now.`
    );
    return false;
  }
  const damage = Math.max(0, monsterValue - state.weapon.value);
  state.health -= damage;
  state.weaponDamage.push(monsterCard);
  state.weaponMaxNext = Math.min(state.weaponMaxNext, monsterValue - 1);
  state.floorFresh = false;
  setStatus(
    `Fought ${monsterCard.rank} ${monsterCard.suit} (power ${monsterValue}). Took ${damage} damage.`
  );
  return true;
}

function handleWeaponAreaDrop(card, from) {
  if (card.suit === "diamonds") {
    handleWeaponDrop(card, from);
    return;
  }
  if (card.suit === "clubs" || card.suit === "spades") {
    removeFromPool(card, from);
    const ok = handleMonsterOnWeapon(card);
    if (!ok) {
      // Undo removal if not ok
      if (from === "floor") state.floor.push(card);
    } else {
      postAction();
    }
    return;
  }
  setStatus("Only weapons (diamonds) or monsters go here.");
}

function postAction() {
  checkHealth();
  refillIfNeeded();
  render();
  checkWin();
}

function refillIfNeeded() {
  if (state.floor.length <= 1 && state.deck.length > 0) {
    const needed = Math.min(3, state.deck.length);
    state.floor.push(...drawCards(needed));
    state.floorNumber += 1;
    state.floorFresh = true;
    setStatus(`New dungeon floor ${state.floorNumber}. Drew ${needed} cards.`);
  }
}

function checkHealth() {
  if (state.health <= 0) {
    state.health = 0;
    setStatus("You have been defeated. Restarting game.");
    setTimeout(initGame, 800);
  }
}

function checkWin() {
  if (state.deck.length === 0 && state.floor.length === 0) {
    setStatus("You cleared the dungeon! Restarting game.");
    setTimeout(initGame, 1000);
  }
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
    if (state.runUsed) return;
    if (!state.floorFresh) {
      setStatus("You can only run at the start of a floor.");
      return;
    }
    if (state.floor.length === 0) {
      setStatus("No cards to run from.");
      return;
    }
    state.deck.push(...state.floor);
    state.floor = drawCards(4);
    state.runUsed = true;
    state.floorFresh = true;
    state.floorNumber += 1;
    setStatus("You ran away. New dungeon floor drawn.");
    render();
  });

  document.getElementById("discardWeaponBtn").addEventListener("click", () => {
    if (!state.weapon) {
      setStatus("No weapon to discard.");
      return;
    }
    state.discard.push(state.weapon, ...state.weaponDamage);
    state.weapon = null;
    state.weaponDamage = [];
    state.weaponMaxNext = Infinity;
    state.floorFresh = false;
    setStatus("Weapon discarded.");
    postAction();
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setupButtons();
  initGame();
});


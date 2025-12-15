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
  healUsed: false, // true if heal has been used on current floor
  originalDeck: [], // Store original deck for restart
  initialDeckOrder: [], // Store the exact deck order for restart (same shuffle)
  firstFloorDealt: false, // Track if first floor has been dealt
};

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
  state.health = MAX_HEALTH;
  state.floorNumber = 1;
  state.runUsed = false;
  state.floorFresh = true;
  state.healUsed = false;
  state.firstFloorDealt = false;
  setStatus("Click the deck to deal your first floor!");
  render();
  // Initialize health bar
  const healthPercent = (state.health / MAX_HEALTH) * 100;
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
  state.health = MAX_HEALTH;
  state.floorNumber = 1;
  state.runUsed = false;
  state.floorFresh = true;
  state.healUsed = false;
  state.firstFloorDealt = false;
  setStatus("Click the deck to deal your first floor!");
  render();
  // Initialize health bar
  const healthPercent = (state.health / MAX_HEALTH) * 100;
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

  document.getElementById("deckCount").textContent = `${state.deck.length} cards`;
  document.getElementById("discardCount").textContent = `${state.discard.length} cards`;
  document.getElementById("healthValue").textContent = `${state.health} / ${MAX_HEALTH}`;
  document.getElementById("floorValue").textContent = state.floorNumber;
  
  // Update health bar
  const healthPercent = (state.health / MAX_HEALTH) * 100;
  document.getElementById("healthBar").style.width = `${healthPercent}%`;

  // Make deck clickable if first floor not dealt
  const deckBack = document.getElementById("deckBack");
  if (deckBack) {
    if (!state.firstFloorDealt && state.deck.length > 0) {
      deckBack.classList.add("clickable");
      deckBack.title = "Click to deal your first floor";
    } else {
      deckBack.classList.remove("clickable");
      deckBack.title = "";
    }
  }

  renderWeapon();
  renderWeaponDamage();
  renderDiscard();
  renderRunButton();
  attachDragListeners();
}

function renderWeapon() {
  const slot = document.getElementById("weaponSlot");
  slot.innerHTML = "";
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
    el.style.transform = `translate(${index * 10}px, ${index * 10}px)`;
    el.style.transition = "transform 0.12s ease";
    stackContainer.appendChild(el);
  });
  
  slot.appendChild(stackContainer);
}

function renderRunButton() {
  const btn = document.getElementById("runButton");
  btn.disabled = state.runUsed || !state.floorFresh || getFloorCardCount() === 0;
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
  removeFromPool(card, from);
  state.discard.push(card);
  state.floorFresh = false;
  
  // Heal only works once per floor
  if (state.healUsed) {
    setStatus(`Used ${card.rank} of hearts, but healing only works once per floor.`);
    postAction();
    return;
  }
  
  // First heal on this floor - apply healing
  state.healUsed = true;
  const before = state.health;
  const healed = Math.min(MAX_HEALTH, state.health + card.value) - state.health;
  state.health = Math.min(MAX_HEALTH, state.health + card.value);
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
  if (monsterValue > state.weaponMaxNext) {
    setStatus(
      `Weapon can only fight monsters ≤ ${Math.max(2, state.weaponMaxNext)} now.`
    );
    return false;
  }
  const damage = Math.max(0, monsterValue - state.weapon.value);
  state.health -= damage;
  // Track defeated monster for weapon degradation (keep in weaponDamage, not discard yet)
  state.weaponDamage.push(monsterCard);
  state.weaponMaxNext = Math.min(state.weaponMaxNext, monsterValue - 1);
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
      const deckBack = document.getElementById("deckBack");
      const floorRow = document.getElementById("floorRow");
      
      if (!deckBack || !floorRow) return;
      
      const deckRect = deckBack.getBoundingClientRect();
      
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
  
  state.runUsed = true;
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
  const deckBack = document.getElementById("deckBack");
  const floorRow = document.getElementById("floorRow");
  
  if (!deckBack || !floorRow) return;
  
  const deckRect = deckBack.getBoundingClientRect();
  
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
    if (state.runUsed) return;
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

  // Make deck clickable to deal first floor
  document.getElementById("deckBack").addEventListener("click", () => {
    if (!state.firstFloorDealt && state.deck.length > 0) {
      dealFirstFloor();
    }
  });
}

function dealFirstFloor() {
  if (state.firstFloorDealt) return;
  
  const deckBack = document.getElementById("deckBack");
  const floorRow = document.getElementById("floorRow");
  
  if (!deckBack || !floorRow) return;
  
  // Draw 4 cards
  const drawnCards = drawCards(4);
  const deckRect = deckBack.getBoundingClientRect();
  
  // Fill floor slots
  for (let i = 0; i < 4 && i < drawnCards.length; i++) {
    state.floor[i] = drawnCards[i];
  }
  
  state.firstFloorDealt = true;
  state.floorFresh = true;
  state.healUsed = false;
  setStatus("First floor dealt! Drag cards to interact.");
  
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
            }, 200);
          }
        }, 800);
      }, index * 200); // Stagger the animations
    });
  }, 50);
}

window.addEventListener("DOMContentLoaded", () => {
  setupButtons();
  initGame();
});


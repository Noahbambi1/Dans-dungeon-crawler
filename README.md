# Dan's Dungeon Crawler Card Game

A web-based dungeon crawler card game built with vanilla JavaScript, HTML, and CSS.

## Game Rules

### Deck Setup
- Standard 52-card deck with modifications:
  - **Removed**: Red royal cards (J, Q, K of hearts/diamonds), Red aces, Jokers
  - **Remaining**: All black cards (clubs/spades), Black aces, Red number cards (2-10 of hearts/diamonds)

### Card Types
- **Hearts (♥)**: Health potions - heal for the card's value (max 20 health)
- **Diamonds (♦)**: Weapons - equip to fight monsters (strength = card value)
- **Clubs (♣) & Spades (♠)**: Monsters - must be defeated (strength: 2-10, J=11, Q=12, K=13, A=14)

### Gameplay
1. Start with 20 health
2. Draw 4 cards face-up as the "Dungeon Floor"
3. **Heal**: Drag heart cards to the heal slot (top right)
4. **Equip Weapon**: Drag diamond cards to the weapon slot
5. **Fight Monsters**:
   - Drag monster to health slot to take full damage
   - Drag monster to weapon slot to fight (take damage = monster strength - weapon strength)
   - After each fight, weapon can only attack monsters of equal or lower strength than the last defeated monster
6. **Floor Progression**: When floor has ≤1 card, draw 3 more cards and increment floor number
7. **Run Away**: Once per game, at the start of a floor, you can run away (sends current floor to bottom of deck, draws new floor)

### Win/Lose Conditions
- **Win**: Use all cards in the deck (deck empty + floor empty)
- **Lose**: Health reaches 0

## How to Play

1. Open `index.html` in a web browser, or run a local server:
   ```bash
   python3 -m http.server 4173
   ```
   Then visit `http://localhost:4173`

2. Drag cards to interact:
   - Hearts → Heal slot (top right)
   - Diamonds → Weapon slot (below floor)
   - Monsters → Health slot (take damage) or Weapon slot (fight)
   - Any card → Discard pile (bottom right)

## Setup Git Repository

If you haven't already set up git:

1. Install Xcode Command Line Tools (if needed):
   ```bash
   xcode-select --install
   ```

2. Run the setup script:
   ```bash
   chmod +x setup-git.sh
   ./setup-git.sh
   ```

Or manually:
```bash
git init
git remote add origin https://github.com/Noahbambi1/Dans-dungeon-crawler.git
git add .
git commit -m "Initial commit: Dungeon crawler card game"
git branch -M main
git push -u origin main
```

## Files

- `index.html` - Main HTML structure
- `style.css` - Game styling with beautiful card designs
- `main.js` - Game logic and interactions
- `.gitignore` - Git ignore rules

## Future Enhancements

- Card art assets
- Sound effects
- Animations
- High score tracking
- Save/load game state


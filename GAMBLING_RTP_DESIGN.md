# Dan's Dungeon Crawler - Gambling/RTP Conversion Design

## Overview

This document outlines how to convert Dan's Dungeon Crawler into a regulated gambling game with configurable RTP (Return to Player), compliant with gaming standards like GLI-11, ISO/IEC 17025, and eCOGRA requirements.

---

## Regulatory Requirements Checklist

### 1. Random Number Generation (RNG)
- [ ] **Server-side RNG** - All randomness must be generated server-side
- [ ] **Cryptographic quality** - Use CSPRNG (e.g., `/dev/urandom`, `crypto.randomBytes`)
- [ ] **Certification** - RNG must be tested by accredited lab (GLI, BMM, eCOGRA)
- [ ] **Seeding** - Proper entropy seeding, no time-based seeds alone

### 2. Mathematical Certification
- [ ] **PAR Sheet** - Complete probability analysis report
- [ ] **Theoretical RTP** - Mathematical proof of return percentage
- [ ] **Actual RTP monitoring** - Track real returns vs theoretical
- [ ] **Variance documentation** - Standard deviation, volatility index

### 3. Game Integrity
- [ ] **Outcome pre-determination** - Result determined before display
- [ ] **No manipulation** - Outcomes cannot be altered post-determination
- [ ] **Audit logging** - Complete game history with timestamps
- [ ] **Replay capability** - Recreate any game from logs

### 4. Player Protection
- [ ] **Bet limits** - Min/max bet enforcement
- [ ] **Session limits** - Time and loss limits
- [ ] **Self-exclusion** - Player blocking capability
- [ ] **Clear odds disclosure** - RTP displayed to players

---

## RTP Calculation Model

### Formula
```
RTP = Σ(Win_Amount × Probability_of_Win) / Bet_Amount

For a single outcome game:
RTP = Win_Rate × Payout_Multiplier
```

### Current Game Statistics (Brutal Mode)
```
Win Rate:           ~0.25% (1 in 400)
Total Monster Dmg:  208 points
Max Survivable:     73 points
Required Reduction: 135 points via weapons
```

### Target RTP Configurations

| Mode | Win Rate | Payout | RTP | House Edge |
|------|----------|--------|-----|------------|
| High Roller | 0.25% | 384x | 96.00% | 4.00% |
| Standard | 5.00% | 19.2x | 96.00% | 4.00% |
| Casual | 10.00% | 9.6x | 96.00% | 4.00% |
| Frequent | 25.00% | 3.84x | 96.00% | 4.00% |
| Balanced | 50.00% | 1.92x | 96.00% | 4.00% |

---

## Proposed Game Modes

### Mode A: "Instant Dungeon" (Pure RNG)
- Player places bet
- Game auto-plays with optimal strategy
- Win/lose determined instantly
- No player decisions
- **Best for:** Slot machine style, easy certification

### Mode B: "Guided Adventure" (Skill + RNG)
- Player makes choices
- Bonus payouts for progress (floor completion)
- Base RTP from partial wins + jackpot for completion
- **Best for:** Engaging gameplay, harder certification

### Mode C: "Tournament Style" (Skill-Based)
- Players compete against each other
- House takes rake from prize pool
- Not traditional gambling RTP model
- **Best for:** eSports/skill gaming jurisdictions

---

## Technical Architecture

### Server-Side Components

```
┌─────────────────────────────────────────────────────────────┐
│                     GAME SERVER                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  RNG Module  │  │ Game Engine  │  │ Payout Calc  │       │
│  │  (Certified) │  │ (Simulation) │  │ (RTP Logic)  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│          │                 │                 │               │
│          └─────────────────┼─────────────────┘               │
│                            │                                 │
│  ┌─────────────────────────▼─────────────────────────┐      │
│  │              Game State Manager                    │      │
│  │  - Pre-determines outcome                          │      │
│  │  - Manages game flow                               │      │
│  │  - Validates player actions                        │      │
│  └───────────────────────────────────────────────────┘      │
│                            │                                 │
│  ┌─────────────────────────▼─────────────────────────┐      │
│  │              Audit Log System                      │      │
│  │  - Immutable game records                          │      │
│  │  - Regulatory compliance                           │      │
│  │  - Dispute resolution                              │      │
│  └───────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema (Audit Trail)

```sql
CREATE TABLE game_rounds (
    round_id UUID PRIMARY KEY,
    player_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Bet details
    bet_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    -- RNG/Game state
    rng_seed BYTEA NOT NULL,           -- Encrypted seed
    deck_order TEXT NOT NULL,           -- Deterministic deck
    game_mode VARCHAR(20) NOT NULL,
    
    -- Outcome (determined at bet time)
    outcome_win BOOLEAN NOT NULL,
    floors_completed INTEGER NOT NULL,
    final_health INTEGER NOT NULL,
    
    -- Payout
    payout_multiplier DECIMAL(6,2) NOT NULL,
    payout_amount DECIMAL(12,2) NOT NULL,
    
    -- Audit
    server_signature TEXT NOT NULL,     -- Cryptographic proof
    client_seed TEXT,                   -- Provably fair (optional)
    
    CONSTRAINT positive_bet CHECK (bet_amount > 0)
);

CREATE INDEX idx_rounds_player ON game_rounds(player_id);
CREATE INDEX idx_rounds_timestamp ON game_rounds(timestamp);
```

---

## PAR Sheet Template

### Game: Dan's Dungeon Crawler - Standard Mode (5% Win Rate)

| Outcome | Probability | Pays | Contribution |
|---------|-------------|------|--------------|
| Full Clear | 5.00% | 19.20x | 0.9600 |
| Loss | 95.00% | 0.00x | 0.0000 |
| **TOTAL** | **100%** | - | **0.9600** |

**Theoretical RTP: 96.00%**
**House Edge: 4.00%**
**Hit Frequency: 5.00%**
**Volatility: Medium-High**

### With Progress Bonuses (Mode B)

| Outcome | Probability | Pays | Contribution |
|---------|-------------|------|--------------|
| Full Clear (11 floors) | 5.00% | 15.00x | 0.7500 |
| 8-10 floors | 8.00% | 1.50x | 0.1200 |
| 5-7 floors | 15.00% | 0.50x | 0.0750 |
| 1-4 floors | 25.00% | 0.10x | 0.0250 |
| 0 floors | 47.00% | 0.00x | 0.0000 |
| **TOTAL** | **100%** | - | **0.9700** |

**Theoretical RTP: 97.00%**

---

## Implementation Phases

### Phase 1: Core Gambling Module (2-3 weeks)
- [ ] Server-side game engine
- [ ] Cryptographic RNG implementation
- [ ] Basic betting API
- [ ] Audit logging

### Phase 2: RTP Configuration (1-2 weeks)
- [ ] Multiple difficulty presets
- [ ] Payout calculator
- [ ] RTP verification tests
- [ ] PAR sheet generation

### Phase 3: Regulatory Compliance (4-6 weeks)
- [ ] Third-party RNG certification
- [ ] Security audit
- [ ] Responsible gambling features
- [ ] Documentation package

### Phase 4: Integration (2-3 weeks)
- [ ] Payment gateway integration
- [ ] Player account management
- [ ] Real-time monitoring dashboard
- [ ] Regulatory reporting

---

## Jurisdictional Considerations

### UK (UKGC)
- License required
- Remote Technical Standards compliance
- Player fund protection
- Annual RTP audits

### Malta (MGA)
- Type 1/2/3/4 license based on game type
- Technical compliance certificate
- Player protection measures

### Gibraltar
- Similar to UK
- Strong emphasis on responsible gambling

### Isle of Man
- Gambling Supervision Commission license
- Regular compliance audits

### US (State-by-State)
- GLI-11/GLI-19 compliance
- State-specific requirements
- Tribal gaming considerations

### Curaçao
- Most accessible license
- Less stringent technical requirements
- Often first step for new operators

---

## Security Considerations

### RNG Security
1. Hardware entropy source preferred
2. Regular reseeding
3. Output never exposed to client before bet placement
4. Seed values encrypted in storage

### Game Integrity
1. All game logic server-side
2. Client only displays pre-determined outcomes
3. No client-side manipulation possible
4. Cryptographic signatures on all outcomes

### Audit Security
1. Append-only audit logs
2. Tamper-evident storage
3. Regular backup and archival
4. Access controls and monitoring

---

## Cost Estimates

| Item | Estimated Cost |
|------|----------------|
| RNG Certification (GLI/BMM) | $15,000 - $40,000 |
| Game Certification | $10,000 - $25,000 |
| Legal/Licensing | $20,000 - $100,000+ |
| Security Audit | $5,000 - $15,000 |
| Annual Compliance | $10,000 - $30,000 |
| **Total Initial** | **$60,000 - $210,000+** |

---

## Next Steps

1. **Decide on game mode** (Pure RNG vs Skill-Hybrid)
2. **Choose target jurisdiction** (affects all requirements)
3. **Select RNG provider** (or build certified solution)
4. **Build prototype** with audit logging
5. **Engage testing lab** for certification path
6. **Legal consultation** for licensing

---

## Files Included

- `gambling_module.js` - Core gambling logic (prototype)
- `rng_certified.js` - Certified RNG wrapper
- `payout_calculator.js` - RTP/payout calculations
- `audit_logger.js` - Compliance logging
- `par_sheet_generator.js` - Probability analysis



# Weekend Casino — Comprehensive Feature Review
## All Planned Features by Release Version

**Status:** Complete feature audit from CASINO-PRD.md, CASINO-V2-PRD.md, CASINO-V2-ROADMAP-FINAL.md, CASINO-GAME-DESIGN.md, and CASINO-V2-NEW-GAMES.md

**Last Updated:** 2026-03-02

---

## EXECUTIVE SUMMARY

**v1 (Current/Baseline):**
- Texas Hold'em (fully implemented)
- 5-Card Draw Poker (implemented in task sequence)
- Blackjack Classic Dealer Mode (implemented in task sequence)
- Blackjack Competitive Variant (implemented in task sequence)
- Shared player wallet
- Multi-game lobby with game selection
- Voice-first interaction
- Cloud 3D rendering (R3F, Three.js)

**v2.0 "More Casino" (8 weeks):**
- Roulette (new game)
- Three Card Poker (new game, quick-play)
- Speed modes for all games (Hold'em, 5-Card Draw, Blackjack)
- Quick-Play Mode (random game auto-rotation)
- Casino Crawl (auto-rotation without scoring)
- Reactions/Emotes (6 reactions with rate limiting)
- Per-game tutorials (30-second interactive guides)

**v2.1 "Game Night" (8 weeks after v2.0):**
- Craps (new game, most complex)
- Game Night Mode (structured competitive play with scoring)
- Craps Simple Mode (default) + Advanced Bets
- Shareable Results Card (PNG with standings)
- Spectator Mode (read-only controller)
- Blackjack Tournament Mode (fixed-hand competition)
- Casino Crawl upgrade (now with Game Night scoring)
- **Parallel:** Persistence layer architecture design

**v2.2 "Come Back Tomorrow" (8 weeks after v2.1):**
- Phone Companion Mode (standalone web app, no TV required)
- Daily Login Bonuses (7-day escalating cycle)
- Weekly Challenges (3 slots with assignment algorithm)
- Player Profiles (persistent stats, win rates)
- Basic Cosmetics (20 items: card backs, table felts, avatar frames)
- Achievement System Phase 1 (~25 achievements)
- Game Night Streaks (cross-session persistence)
- Progressive Jackpot (3-tier: Mini/Major/Grand)
- **Hard dependency:** Persistence layer live

**v2.3+ "Data-Driven Iteration" (rolling 4-6 week sprints):**
- All v2.3+ features contingent on analytics thresholds (optional/speculative)

**Deferred to v3:**
- Online Multiplayer (no TV required)
- Multi-TV Tournaments
- Scheduled/Recurring Tournaments
- Various game variants and specialized modes

---

## v1: TEXAS HOLD'EM + v1 ADDITIONS (BASELINE / IN PROGRESS)

### v1.0 Texas Hold'em (Fully Implemented)
- Standard heads-up to 4-player play
- Blind structure with escalating levels
- Pre-flop, flop, turn, river betting phases
- All-in mechanics
- Side pot calculations
- Hand evaluation with kickers
- Dealer characters (Vincent, Maya, Remy, Jade)
- Voice commands for poker actions
- 3D table rendering (R3F)
- AI bots with hybrid rules+LLM system
- Session statistics tracking
- Cinematic video moments (premium Las Vegas aesthetic)

### v1 New Games (In Progress - Task Sequence)

#### 5-Card Draw Poker
- Draw phase with 0-5 card replacement
- Pre-draw and post-draw betting phases
- Same hand evaluator as Hold'em (5-card hands)
- Voice commands adapted for draw actions
- 3D table rendering
- AI bots configured for draw strategy
- Display & controller UX adapted for draw workflow

#### Blackjack — Classic Dealer Mode
- Dealer plays against all players simultaneously
- Hit/Stand/Double/Split actions
- Bust detection
- Insurance side bet
- Side bets (not specified in v1, but framework for future)
- AI dealer (not player-controlled)
- 21-specific hand strength rules
- Voice commands for blackjack actions

#### Blackjack — Competitive Variant
- Deferred to v2 (sequential turns instead of simultaneous)
- Players compete on highest non-bust total
- Same core rules as Classic mode
- Alternative win condition

### v1 Cross-Game Infrastructure
- Game Selection Lobby with host control
- Shared player wallet across games within session
- Multi-game VGF ruleset with phase namespacing
- Server-side game state isolation
- Player/CasinoPlayer types with wallet tracking
- Session statistics aggregation
- Dealer system extensions for multi-game support
- Wallet balance persistence within session

---

## v2.0: "MORE CASINO" (6-8 Weeks)

**Theme:** More games, faster play, zero setup friction.
**Goal:** Validate multi-game architecture. Ship confidence-building features with low risk.

### New Games

#### Roulette
**Complexity:** Medium | **Risk:** Medium

**Core Mechanics:**
- European single-zero roulette (37 pockets, 2.7% house edge)
- Bet types:
  - **Inside:** Straight Up (35:1), Split (17:1), Street (11:1), Corner (8:1), Six Line (5:1)
  - **Outside:** Red/Black (1:1), Odd/Even (1:1), High/Low (1:1), Dozen (2:1), Column (2:1)
- Bet limits: min 5, max inside 100, max outside 500, max total 1,000
- Near-miss detection (adjacent bets on European wheel trigger video overlay)
- Spin completion: client-driven + 8s server fallback

**Controller UX:**
- Two-tab layout:
  - **Tab 1 "Quick Bets":** Red/Black, Odd/Even, High/Low, Dozens, Columns (6 large buttons), favourite numbers (3-5 presets), REPEAT LAST button
  - **Tab 2 "Number Grid":** Full 37-number grid, context menu for splits/corners, voice-first ("Number 17", "Split 17 and 20")
- No scrolling on Tab 1 (covers 80%+ of casual bets)

**Phases:**
```
GAME_SELECT → ROULETTE_PLACE_BETS → ROULETTE_NO_MORE_BETS
→ ROULETTE_SPIN → ROULETTE_RESULT → ROULETTE_PAYOUT
→ ROULETTE_ROUND_COMPLETE → loop
```

**Features:**
- Per-game tutorial (30-second interactive guide)
- Video overlays for near-miss moments
- Ball-landing animation with client dispatch trigger

#### Three Card Poker (TCP)
**Complexity:** Small-Medium | **Risk:** Low

**Core Mechanics:**
- Simplified poker variant, 3 cards only
- Ante + Play bet structure
- Dealer qualification rule (Queen-high minimum)
- Hand strength: 3-of-a-kind > Straight > Flush > Pair > High Card
- Simultaneous decisions (all players act without waiting)
- Quick hands (~20 seconds each)

**Features:**
- Simplest new game (6 phases, low complexity)
- Fills "quick game" niche (10x faster than Hold'em)
- Hand evaluator strength bug fix required (rank-band bases: 6000/5000/4000/3000/2000/1000)
- Per-game tutorial
- Validates multi-game architecture with low risk

**Technical Note:** Fixes TCP hand evaluator bug from principal engineer review (M4).

### Game Variants (Speed Modes)

#### Speed Hold'em
- **Timer:** 10 seconds per action
- **Auto-fold:** On timeout
- **Blind escalation:** Every 5 hands
- **Faster animations**
- **Config-driven:** No new phases

#### Speed 5-Card Draw
- **Timer:** 15 seconds per action, 10 seconds for draw decision
- **Faster animations**
- **Config-driven**

#### Speed Blackjack
- **Timer:** 10 seconds to place bet
- **Auto-stand:** Hard 17+
- **Faster card animations**
- **Config-driven**

### Quick-Play Mode
- Automated game selection
- Cycles through available games
- Auto-rotation every 10 hands/rounds
- No player game selection UI
- Random game ordering

### Casino Crawl (v2.0 Simplified)
- Sequential auto-rotation through all available games
- Set number of hands/rounds per game
- **NO scoring in v2.0** (scoring added in v2.1)
- **NO leaderboard** (added in v2.1)
- **NO champion ceremony** (added in v2.1)
- One-tap multi-game evening experience
- Reuses Game Night infrastructure (as stub)

### Social Features

#### Reactions/Emotes
- 6 reaction types
- Rate-limited per player
- TV display animation + audio
- Available during gameplay
- Player-triggered

#### Per-Game Tutorials
- 30-second interactive first-play guides
- Roulette: numbers, bet types, payout basics
- Three Card Poker: hand rankings, betting flow
- Triggered on first play of each game
- Skippable

### v2.0 Analytics Events

| Event | Purpose |
|-------|---------|
| `game.started` | Track which games are played, frequency, player count |
| `game.completed` | Session length, chip results, player count |
| `speed_variant.selected` | Adoption rate of speed modes |
| `quick_play.used` | Quick Play vs manual game selection |
| `casino_crawl.used` | Auto-rotation adoption |
| `game.switched` | Frequency and direction of game switching |
| `tutorial.started` / `tutorial.completed` / `tutorial.skipped` | Tutorial engagement |
| `reaction.sent` | Reaction usage frequency and type distribution |

### v2.0 Technical Prerequisites

- TCP hand evaluator strength bug fix (rank-band bases)
- Roulette two-tab controller design implementation
- Roulette spin client-driven completion (same as video playback pattern)
- Build-time reducer name collision check test
- Fire TV Stick performance profiling (7-game state shape)
- `wrapWithGameNightCheck` utility in v2.0 round-complete phases (no-op when GN inactive)
- Craps test suite specification document (ready for v2.1 dev)

### v2.0 Does NOT Include

- Craps (ships in v2.1)
- Game Night Mode scoring/leaderboard/ceremony (ships in v2.1)
- Any persistence-dependent features
- Cosmetics, achievements, Crews, jackpot, tournaments
- Wild card or lowball variants
- Bounty tournament mode
- Additional Blackjack side bets

### v2.0 Success Criteria

| Metric | Target |
|--------|--------|
| Games per session | ≥1.5 (vs 1.0 in v1) |
| Roulette play rate | ≥15% of sessions |
| TCP play rate | ≥10% of sessions |
| Speed variant adoption | ≥20% of sessions |
| Quick Play / Casino Crawl usage | ≥10% of sessions |
| Session length | Stable or increased vs v1 |
| Tutorial completion rate | ≥70% for first-time players |

---

## v2.1: "GAME NIGHT" (6-8 Weeks After v2.0)

**Theme:** The structured competitive evening. The weekly ritual.
**Goal:** Game Night Mode + Craps = differentiator. 90-minute structured evening.
**Hard dependency:** Craps test suite spec completed in v2.0

### New Game: Craps
**Complexity:** Large | **Risk:** Medium-High

**Core Mechanics:**
- Most social casino game: communal betting on shared dice rolls
- Rotating shooter role (clockwise after seven-out)
- Two-phase structure: Come-Out Roll + Point Phase
- Come-Out outcomes: Natural (7/11 = Pass wins), Craps (2/3/12), Point Established (4-10)
- Point Phase: Hit point = Pass wins, Seven-out = Don't Pass wins

**Bet Types (v1 - 6 total):**
1. **Pass Line** (1:1) - Before come-out
2. **Don't Pass** (1:1) - Before come-out
3. **Come** (1:1) - After point established
4. **Don't Come** (1:1) - After point established
5. **Place Bets** - Specific numbers (4/10: 9:5, 5/9: 7:5, 6/8: 7:6)
6. **Field** (1:1, 2x on 2, 3x on 12) - Any roll
7. **Odds Bets** (true odds) - After point/come point set (max 3x original bet)

**Craps Simple Mode (DEFAULT):**
- Only **Pass Line** and **Don't Pass** visible
- Two large buttons: "PASS LINE" (green), "DON'T PASS" (red)
- Drama preserved: "Hit the point or seven-out"
- Point phase works normally

**Craps Advanced Mode (TOGGLE):**
- "Show Advanced Bets" toggle on controller
- Reveals: Come, Don't Come, Place, Field, Odds
- Persists per player per session
- Display always shows full table layout

**Technical Specifications:**
- Dice RNG: `crypto.getRandomValues()`, seed-based replay, distribution validation tests
- Bet resolution: Single `setCrapsRollResults` reducer dispatch (batched, RC-1)
- Come bet game-switch rule: Active come/don't-come bets returned at face value (RC-5)
- Place bet "working" flag: `placeBetsWorkOnComeOut` checked in resolution logic (M2)
- Error handling: Wallet balance, table max, bet timing validation
- Per-game tutorial: 30-second interactive guide

**Phases:**
```
CRAPS_POSTING_BLINDS → CRAPS_BETTING → CRAPS_ROLL_DICE
→ CRAPS_RESOLVE_ROLL → CRAPS_ROUND_COMPLETE
(loop or game switch)
```

**Complexity Note:** 6+ bet types with different resolution rules per roll outcome. Come bet persistence across rounds is architecturally unique. Requires exhaustive test suite.

### Game Night Mode (Full Implementation)
**Complexity:** Large | **Risk:** Medium

**Core Concept:**
- Structured competitive evening
- Multi-game tournament within a single session
- Automated game rotation
- Rank-based scoring system

**Scoring System:**
- Rank-based (Decision 1 in Roadmap):
  - **1st place:** 100 points
  - **2nd place:** 70 points
  - **3rd place:** 45 points
  - **4th place:** 25 points
  - Bonus points for stretch goals (game-specific)
- **Normalization:** Rank-based (NOT chip-multiplier system)
- Fairer across games with different payout structures
- Harder to game (can't farm points with high-variance games)

**Game Night Phases:**
- `GN_SETUP` - Configure round count, game selection
- `GN_LEADERBOARD` - Display standings between games
- `GN_CHAMPION` - Final ceremony with shareable results card

**Features:**
- Rank-based scoring across all games
- Per-round leaderboard display
- Round limits (auto-advance when reached)
- Game auto-rotation during Game Night
- Asset preloading buffer during leaderboard display (evict previous, preload next)

**Champion Ceremony:**
- Final standings display
- Shareable results card (PNG)
- Highlight moment included
- Branding + QR code
- Web Share API on controller

### Craps Enhancements
- Simple Mode default (Pass/Don't Pass only)
- Advanced Mode toggle for full bet menu
- Shooter role rotation display
- Come bet persistence rules
- Odds bet calculation and payout
- Dice roll animation (premium video asset)
- Working Place bets during come-out

### Enhanced Casino Crawl
- Full Game Night scoring integration
- Sequential game rotation with Game Night metadata
- Becomes "automated Game Night" instead of just auto-rotation
- Round completion triggers `wrapWithGameNightCheck`

### New Social Features

#### Spectator Mode
- Read-only controller mode
- Spectators see TV summary
- Can send reactions
- No betting or actions

#### Shareable Results Card
- PNG generation with:
  - Final standings
  - Highlight moment/clip
  - Branding
  - QR code
- Web Share API on controller
- Organic acquisition channel

#### Blackjack Tournament Mode
- Fixed-hand tournament variant
- Equal starting chips for all players
- Highest non-bust count after N rounds wins
- Leaderboard overlay every 5 rounds
- Competitive variant of Blackjack

### v2.1 Parallel Workstream: Persistence Layer Design

**Timeline:** During v2.0 & v2.1 development (NOT shipping until v2.2)

**Deliverable:** Architecture TDD document (RC-8)

**Components (Design Phase):**
1. Player Identity Service (design: device fingerprint-based)
2. Database choice (recommendation: Redis + DynamoDB)
3. Schema design (profiles, cosmetics, leaderboards, Crews)
4. API contracts
5. Deployment topology
6. VGF `IPersistence` interface

**Implementation Schedule (Weeks 1-14 of v2.0/v2.1):**
- Weeks 1-2: Architecture TDD
- Weeks 3-6: Player Identity Service
- Weeks 5-8: VGF `IPersistence` implementation (Redis backing)
- Weeks 7-10: Profile Service (REST endpoints, stats accumulation)
- Weeks 9-12: Inventory Service (cosmetics, achievements, challenge state)
- Weeks 11-14: Companion API (phone-only endpoints)

### v2.1 Analytics Events (Game Night-Specific)

| Event | Purpose |
|-------|---------|
| `game_night.started` | GN session initiation |
| `game_night.round_completed` | Game completion within GN |
| `game_night.finished` | Full GN session completion |
| `game_night.champion_crowned` | Winner determined |
| `results_card.generated` | Card creation |
| `results_card.shared` | Organic acquisition signal |
| `spectator_mode.entered` | Spectator engagement |
| `craps.round_completed` | Craps-specific completion |

### v2.1 Technical Prerequisites

- Activate `wrapWithGameNightCheck` utility (built as no-op in v2.0)
- Route to `GN_LEADERBOARD` when round limits reached
- Craps dice RNG spec (crypto.getRandomValues, seed storage, distribution tests)
- Craps come bet game-switch rule implementation
- Craps "working" Place bet flag check in resolution
- Roulette near-miss wheel adjacency map
- Craps bet resolution test suite (exhaustive: all bet types × all outcomes × multi-player)
- GN_LEADERBOARD as asset preload buffer (A3)
- Video asset priority tiers (premium vs placeholder)
- Persistence architecture TDD (RC-8) - design only

### v2.1 Success Criteria

| Metric | Target |
|--------|--------|
| Game Night completion rate | ≥50% of Game Nights that start are finished |
| Game Night weekly return rate | ≥40% who complete play again within 7 days |
| Craps play rate | ≥20% of sessions |
| Results card share rate | ≥10% of Game Nights generate a share |
| Craps Simple vs Advanced | ≥30% graduate to Advanced within 3 sessions |

---

## v2.2: "COME BACK TOMORROW" (6-8 Weeks After v2.1)

**Theme:** Daily engagement. The retention engine.
**Goal:** Convert weekly players into daily-active users.
**Hard Dependency:** Persistence layer LIVE (not just designed)

### Core Feature: Phone Companion Mode
**Complexity:** Medium | **Risk:** Medium

**Standalone Web App (No TV Required)**

**Features:**
- Daily bonus collection
- Challenge progress tracking
- Profile viewing
- Crew stats display (when Crews ship in v2.3+)
- Push notifications ("Game Night tonight at 7!")
- Authentication: device fingerprint-based identity from persistence layer

**Purpose:** Bridge between "weekly party app" and "daily engagement app"

### Retention Features

#### Daily Login Bonuses
- 7-day escalating cycle
- Streak multiplier (bonus on consecutive days)
- Collected via phone companion OR TV app
- Cross-device claim tracking

**Bonus Structure (Example - TBD):**
- Day 1: Base amount
- Day 2: 1.2x base
- Day 3: 1.5x base
- Day 4: 2x base
- Day 5: 2.5x base
- Day 6: 3x base
- Day 7: 5x base (full week bonus)
- Streak multiplier on renewal (2+ weeks in a row = 1.5x bonus)

#### Weekly Challenges
- **3 concurrent slots** (Bronze, Silver, Gold)
- **Assignment algorithm** weights underplayed games
- **Progress tracking** via persistence layer
- **Cross-game discovery** - challenges drive new game exploration
- **Completion tracking** - analytics on challenge engagement

**Examples:**
- "Win 3 hands of Hold'em" (Bronze)
- "Play all 7 games in one session" (Silver)
- "Hit 21 in Blackjack 5 times" (Gold)
- "Reach 1000 chips without using Speed modes" (Challenge)

#### Player Profiles
- **Persistent stats:**
  - Win/loss record per game
  - Win rates (%)
  - Total sessions played
  - Total chips won/lost
  - Favourite game
  - All-time high score
- **Displayed on:**
  - TV between games (brief stats card)
  - Phone companion (full profile view)
- **Cross-session persistence:** stored in DynamoDB

#### Basic Cosmetics (Phase 1)
- **20 items total:**
  - Card backs (4 designs)
  - Table felts (5 designs)
  - Avatar frames (6 designs)
  - Dealer outfits (3 designs)
  - Chip designs (2 designs)
- **Earned via:** Achievements
- **Displayed on:** TV during gameplay
- **Equipped per:** Session or persistent selection

#### Achievement System (Phase 1)
- **~25 achievements** for v2.2 launch
- **Categories:**
  - Getting Started (5 intro achievements)
  - Per-game mastery (4 per game × 7 games = 28, but culled to fit budget)
  - Social milestones (5 group/spectator achievements)
  - Cosmetic unlocks (each achievement unlocks one cosmetic)
- **Progression:**
  - Bronze → Silver → Gold per game
  - Cumulative progress tracking
  - Display on TV
  - Pop-up notifications on unlock

#### Game Night Streaks (Cross-Session)
- **Weekly streak counter** persisted
- **Streak rewards:**
  - 2-week: 50 bonus chips
  - 4-week: 100 bonus chips
  - 8-week: 500 bonus chips
  - 12-week: 1000 bonus chips
  - 26-week: 5000 bonus chips
  - 52-week: 10000 bonus chips
- **Streak broken:** Reset and notification on next GN play
- **Motivation:** Primary retention driver

#### Progressive Jackpot
- **3-tier system:**
  - Mini Jackpot: 5% contribution, wins when hit triple-or-better in Hold'em
  - Major Jackpot: 1% contribution, wins when hit four-of-a-kind or better
  - Grand Jackpot: 1% contribution, wins when hit royal flush in any game
- **Funding:** 1% contribution from all bets (configurable per game)
- **Persistence:** Cross-session state in Redis (hot tier)
- **Display:** Persistent ticker on TV showing current amounts
- **Opt-in:** Players choose to participate (affects final chip payout)
- **Economy:** Play-money context (not real-money gambling)

### v2.2 Analytics Events (Retention-Specific)

| Event | Purpose |
|--------|---------|
| `daily_bonus.claimed` | Claim rate, streak length, channel (phone vs TV) |
| `daily_bonus.streak_broken` | Streak-breaking patterns |
| `challenge.assigned` | Challenge selection algorithm performance |
| `challenge.completed` | Completion rate, time-to-completion, tier distribution |
| `challenge.drove_new_game` | Did challenge cause first play of a game? |
| `companion.opened` | Phone companion daily active usage |
| `companion.notification_received` | Push notification delivery |
| `companion.notification_tapped` | Push notification effectiveness |
| `cosmetic.unlocked` | Cosmetic engagement |
| `cosmetic.equipped` | Cosmetic popularity |
| `achievement.completed` | Milestone tracking, unlock velocity |
| `jackpot.contributed` | Opt-in rate, contribution frequency |
| `jackpot.won` | Jackpot hit frequency, prize amounts |
| `profile.viewed` | Profile engagement, self vs others |

### v2.2 Success Criteria

| Metric | Target |
|--------|--------|
| DAU/MAU stickiness | ≥22% (up from ~15% in v2.0) |
| Phone companion daily active rate | ≥30% of WAU open 3x/week |
| Daily bonus claim rate | ≥40% of returning players claim ≥4/7 days |
| Challenge completion rate | ≥50% of assigned challenges completed |
| Cosmetic equip rate | ≥25% of returning players equip at least one |
| Jackpot participation | ≥20% of sessions contribute to jackpot |
| Cross-game play driven by challenges | ≥15% of new-game-first-plays driven by challenges |

### v2.2 Prerequisites

- **Persistence layer LIVE:**
  - Redis for hot state (sessions, jackpot)
  - DynamoDB for cold state (profiles, cosmetics, achievements)
  - Player Identity Service operational
  - VGF `IPersistence` implementation active
- **Phone Companion Mode** deployed and operational
- **Challenge assignment algorithm** tested
- **Daily bonus mechanics** implemented and tested
- **Cosmetic system** integrated with profile persistence
- **Achievement tracking** system live
- **Jackpot calculation and state management**

---

## v2.3+: "DATA-DRIVEN ITERATION" (Rolling 4-6 Week Sprints)

**Theme:** Only ship what the data supports.
**Goal:** Double down on what works. Cut what doesn't.
**Dependency:** v2.0, v2.1, v2.2 analytics data

### Contingent Features (Ship If Thresholds Met)

| Feature | Ship If... | Data Signal |
|---------|-----------|-------------|
| **Crews** | Companion adoption >30% WAU AND identity persistence >90% | WAU, identity retention |
| **Account Linking** | Identity loss rate >10% over 4 weeks | Device churn rate |
| **SNG Tournaments** | GN completion >50% AND tournament interest signal | Tournament signup requests, GN completion rate |
| **Bounty Tournament (Hold'em)** | Hold'em session frequency stable or growing | Game play distribution |
| **Wild Card Variant (5-Card Draw)** | 5-Card Draw play rate >15% of total sessions | Game play distribution |
| **Extended Cosmetics (50+)** | Basic cosmetic equip rate >40% | Cosmetic equip rate |
| **Crew Leaderboards** | Crew creation >1,000 in first 4 weeks | Crew adoption |
| **Additional Blackjack Side Bets** | Side bet participation >30% in BJ sessions | BJ side bet usage |
| **Rabbit Hunting** | Hold'em session length stagnates | Session length trend |
| **Streaming Mode** | Organic stream count >100/week | Streaming activity |
| **Replays/Highlights** | Results card share rate >15% | Share rate |

### Data-Driven Decision Metrics (Required Before v2.3)

| Metric | Informs |
|--------|---------|
| Game play distribution (% per game) | Which games to invest in |
| Speed variant adoption rate | Whether speed modes become defaults |
| Game Night completion rate | Whether scoring/ceremony working |
| Game Night return rate (7-day) | Whether weekly ritual forming |
| Daily bonus claim rate | Whether companion working |
| Challenge completion rate | Challenge difficulty tuning |
| Cross-game play driven by challenges | Whether challenges drive discovery |
| Identity persistence rate (8 weeks) | Whether Crews viable |
| Cosmetic equip rate | Whether cosmetics matter |
| Jackpot opt-in rate | Whether play-money jackpots work |

---

## DEFERRED TO v3

| Feature | Why | Prerequisite |
|---------|-----|-------------|
| **Online Multiplayer (no TV)** | Breaks TV-first constraint. Massively expands market. Required for 1M DAU target. | Separate PRD, major VGF architecture work |
| **Multi-TV Tournaments** | Multiple living rooms competing simultaneously | Online multiplayer infrastructure, tournament service |
| **Lowball Variant** | Niche audience, confuses casual players with inverted rankings | Wild Card ships and is validated first |
| **All-In Insurance** | Play-money context removes "bad beat rage-quit" problem | Real-money play OR data showing rage-quit is real |
| **Scheduled/Recurring Tournaments** | Assumes daily sessions. Scheduling for co-located groups is nightmare. | Online multiplayer, scheduling service |
| **Clip Recording** | Platform-dependent (Fire TV Cube). Niche audience. | Fire TV Cube adoption data, platform API investigation |
| **Sic Bo** | Asian market expansion. Requires localisation. | Localisation infrastructure, Asian market entry strategy |
| **Let It Ride** | Low differentiation from Hold'em | v2 game variety data showing demand |
| **Battle Pass / Season Pass** | Monetisation layer (v2 has no monetisation) | Monetisation strategy, mature persistence layer |

---

## CUT FROM v2 (Original Proposals)

| Feature | Original Priority | Why Cut | Could Revisit If... |
|---------|------------------|--------|-------------------|
| **All-In Insurance** | P2 | Play-money context makes bad beats funny, not devastating. Wallet-deduction model is confusing. | Data shows significant rage-quit after all-in losses |
| **Lowball Variant** | P2 | Inverted rankings confuse casual players. Niche appeal. Medium complexity for low impact. | 5-Card Draw becomes popular (>15% sessions) |
| **Daily/Weekly Recurring Tournaments** | P1-P2 | "Daily tournament" assumes daily sessions. Scheduling nightmare for co-located groups. | Online multiplayer enables remote participation |

---

## SUMMARY TABLE: Features by Release

```
╔═════════════════════════════════════════════════════════════════════╗
║                    FEATURE RELEASE MATRIX                          ║
╠═════════════╦════════════╦════════════╦════════════╦════════════════╣
║             ║    v1      ║   v2.0     ║   v2.1     ║    v2.2        ║
║             ║ (Baseline) ║ 8 weeks    ║ 8 weeks    ║   8 weeks      ║
╠═════════════╬════════════╬════════════╬════════════╬════════════════╣
║ GAMES       ║            ║            ║            ║                ║
║  Hold'em    ║     ✓      ║     ✓      ║     ✓      ║      ✓         ║
║  5CD        ║     ✓      ║     ✓      ║     ✓      ║      ✓         ║
║  BJ Classic ║     ✓      ║     ✓      ║     ✓      ║      ✓         ║
║  BJ Comp    ║     ✓      ║     ✓      ║     ✓      ║      ✓         ║
║  Roulette   ║            ║     ✓      ║     ✓      ║      ✓         ║
║  TCP        ║            ║     ✓      ║     ✓      ║      ✓         ║
║  Craps      ║            ║            ║     ✓      ║      ✓         ║
╠═════════════╬════════════╬════════════╬════════════╬════════════════╣
║ MODES       ║            ║            ║            ║                ║
║  Speed      ║            ║     ✓      ║     ✓      ║      ✓         ║
║  Quick Play ║            ║     ✓      ║     ✓      ║      ✓         ║
║  Casino Crw ║            ║     ✓      ║     ✓      ║      ✓         ║
║  Game Night ║            ║            ║     ✓      ║      ✓         ║
║  Spectator  ║            ║            ║     ✓      ║      ✓         ║
║  Companion  ║            ║            ║            ║      ✓         ║
╠═════════════╬════════════╬════════════╬════════════╬════════════════╣
║ SOCIAL      ║            ║            ║            ║                ║
║  Reactions  ║            ║     ✓      ║     ✓      ║      ✓         ║
║  Results    ║            ║            ║     ✓      ║      ✓         ║
║  Streaks    ║            ║            ║            ║      ✓         ║
║  Profiles   ║            ║            ║            ║      ✓         ║
╠═════════════╬════════════╬════════════╬════════════╬════════════════╣
║ ENGAGEMENT  ║            ║            ║            ║                ║
║  Tutorials  ║            ║     ✓      ║     ✓      ║      ✓         ║
║  Challenges ║            ║            ║            ║      ✓         ║
║  Bonuses    ║            ║            ║            ║      ✓         ║
║  Cosmetics  ║            ║            ║            ║      ✓         ║
║  Achievements║           ║            ║            ║      ✓         ║
║  Jackpot    ║            ║            ║            ║      ✓         ║
╠═════════════╬════════════╬════════════╬════════════╬════════════════╣
║ BACKEND     ║            ║            ║            ║                ║
║  Persistence║            ║    (Design)║  (Design)  ║      ✓         ║
║  Identity   ║            ║   (Design) ║  (Design)  ║      ✓         ║
║  Database   ║            ║   (Design) ║  (Design)  ║      ✓         ║
╚═════════════╩════════════╩════════════╩════════════╩════════════════╝
```

---

## CRITICAL TECHNICAL DECISIONS

### Architecture & Multi-Game
1. **Single VGF Ruleset** with phase namespacing per game (CASINO-PRD Decision D-001)
2. **Flat game state union** instead of inheritance (inverted from PokerGameState)
3. **Game-specific routing** in phase `next` functions (no shared helpers)
4. **Wallet sync points** at game-start and game-end boundaries only

### Game Mechanics
5. **TCP hand evaluator** rank-band bases: 6000/5000/4000/3000/2000/1000 (RC-3)
6. **Roulette spin completion** client-driven + 8s server fallback (RC-6)
7. **Craps come bet game-switch rule** returns at face value (RC-5)
8. **Game Night scoring** rank-based (1st=100, 2nd=70, 3rd=45, 4th=25) NOT chip-multiplier (Decision 1, Roadmap)

### Persistence
9. **Redis + DynamoDB** recommended (Redis for hot, DynamoDB for cold state)
10. **Device fingerprint identity** (v2.2), optional account linking (v2.3+)
11. **Persistence layer design** complete before v2.0 ships (RC-8)

---

## KNOWN RISKS & MITIGATIONS

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Persistence takes >14 weeks | Critical | Start immediately, use managed services |
| Fire TV can't handle 7-game state | High | Profile early, batch resolution, delta updates if needed |
| Craps test coverage insufficient | High | Mandate exhaustive suite before v2.1 ship |
| Craps overwhelms casual players | Medium | A/B test Simple Mode, adjust if >60% stay in Simple |
| Daily bonuses fail without companion | High | Companion is P0 in v2.2, TV-only fallback if delayed |
| Play-money economy feels hollow | Medium | Monitor jackpot opt-in & streak rates |
| Game Night scoring feels unfair | Medium | Playtest before launch, monitor repeat rate |
| Video asset delays v2.1 | Medium | Ship with placeholders, premium for key moments |
| Identity persistence loss (8+ weeks) | High | Track churn, expedite account linking if >10% loss |

---

## SCOPE BOUNDARIES

### v2.0 Explicit Out of Scope
- Craps (ships v2.1)
- Game Night scoring/leaderboard/ceremony (ships v2.1)
- Any persistence-dependent features
- Cosmetics, achievements, Crews, jackpot, tournaments
- Wild card or lowball variants
- Bounty tournament mode
- Additional Blackjack side bets

### v2.1 Explicit Out of Scope
- Phone Companion Mode (ships v2.2)
- Daily bonuses (ships v2.2)
- Cosmetics/achievements (ships v2.2)
- Crews (conditional v2.3+)
- Online multiplayer (deferred v3)

### v2.2 Explicit Out of Scope
- Crews (conditional v2.3+)
- Optional account linking (conditional v2.3+)
- Streaming mode (conditional v2.3+)
- Online multiplayer (deferred v3)

---

## DOCUMENT AUTHORITY & GOVERNANCE

**Hierarchy:**
1. `CANONICAL-DECISIONS.md` (19 binding decisions, highest authority)
2. `CASINO-V2-ROADMAP-FINAL.md` (release scope & timing)
3. `CASINO-GAME-DESIGN.md` (technical architecture)
4. `CASINO-V2-PRD.md` (feature specifications)
5. `CASINO-V2-NEW-GAMES.md` (game design specs)
6. `CASINO-PRD.md` (v1 baseline)

**Last Aligned:** 2026-02-28

---

## END COMPREHENSIVE FEATURE REVIEW

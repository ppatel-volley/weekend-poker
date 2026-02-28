# Weekend Casino v2 — Consolidated Product Requirements Document

> **Status:** Final
> **Authority:** Authoritative source for v2 product requirements and feature specifications. **Defers to `CASINO-V2-ROADMAP-FINAL.md` for release scope, timing, and phasing decisions.** Defers to `CANONICAL-DECISIONS.md` on any conflict.
> **Version:** 1.0
> **Date:** 2026-02-27
> **Author:** Product Management
> **Canonical Decisions:** See `docs/CANONICAL-DECISIONS.md` (overrides this document on any conflict)
> **Governance Hierarchy:** Canonical Decisions > Roadmap > Game Design > PRD > Everything Else
> **Supersedes:** Individual v2 proposals (`CASINO-V2-NEW-GAMES.md`, `CASINO-V2-EXISTING-GAME-CHANGES.md`, `CASINO-V2-RETENTION.md`) for all normative requirements and priorities. Those documents are retained as non-normative design context only — they are NOT authoritative unless explicitly referenced by this PRD or the canonical decisions register.
> **Depends On:** `CASINO-PRD.md` (v1 baseline), `CASINO-GAME-DESIGN.md` (architecture patterns)

---

## Table of Contents

1. [Executive Summary & Vision](#1-executive-summary--vision)
2. [Release Overview](#2-release-overview)
3. [v2.0 "More Casino"](#3-v20-more-casino)
4. [v2.1 "Game Night"](#4-v21-game-night)
5. [v2.2 "Come Back Tomorrow"](#5-v22-come-back-tomorrow)
6. [v2.3+ "Data-Driven"](#6-v23-data-driven)
7. [Persistence Layer (Parallel Workstream)](#7-persistence-layer-parallel-workstream)
8. [Changes to Existing Games](#8-changes-to-existing-games)
9. [Cross-Cutting Requirements](#9-cross-cutting-requirements)
10. [Success Metrics per Release](#10-success-metrics-per-release)
11. [Resolved Contradictions Appendix](#11-resolved-contradictions-appendix)
12. [Deferred / Cut Features](#12-deferred--cut-features)

---

## 1. Executive Summary & Vision

### Vision

Weekend Casino v2 transforms the product from a multi-game casino into a **weekly social ritual platform**. Where v1 established the technical foundation (multi-game architecture, voice-first interaction, TV-first party model), v2 builds the engagement systems that make players return every week and, eventually, every day.

### Strategic Insight

Both the PM review and the principal engineer review converged on the same conclusion: **the retention systems that drive DAU require persistent backend infrastructure that does not exist today.** This fundamentally reshapes the ship order. Games ship first (frontend-heavy, no backend dependency). Retention ships last (blocked on persistence). Infrastructure runs in parallel throughout.

### Scale Targets

| Metric | 6 Months Post v2.0 | Full v2 Lifecycle (Post v2.2) |
|--------|--------------------|-----------------------------|
| DAU | 50-100K | 200-500K |
| WAU | 150-300K | — |
| MAU | 300-500K | — |
| DAU/MAU | 20-25% | 25-30% |

The 1M DAU target is deferred to v3, contingent on online multiplayer breaking the TV-first co-location ceiling (D-017).

### Three Parallel Workstreams

1. **Games** — New games and game improvements (frontend-heavy, ships first)
2. **Infrastructure** — Persistence layer, player identity, companion app (backend-heavy, starts immediately, enables retention)
3. **Retention** — All meta-game systems (blocked on infrastructure, ships last)

---

## 2. Release Overview

```
Week 0          Week 8          Week 16         Week 24
|--- v2.0 ------|--- v2.1 ------|--- v2.2 ------|--- v2.3+ --->
|               |               |               |
| Roulette      | Craps         | Phone Comp.   | Data-driven
| TCP           | Game Night    | Daily Bonuses  | iteration
| Speed modes   | BJ Tournament | Challenges    |
| Quick Play    | Spectator     | Profiles      |
| Casino Crawl  | Share Card    | Cosmetics     |
| Reactions     | Casino Crawl  | Achievements  |
| Tutorials     |   (full)      | Jackpot       |
|               |               | Streaks       |
|               |               |               |
|========= Persistence Layer (parallel) ========|
| TDD + Design  | Identity + DB | Services live |
```

| Release | Theme | Timeline | Key Dependency |
|---------|-------|----------|----------------|
| **v2.0** | "More Casino" | Weeks 0-8 | None — all frontend |
| **v2.1** | "Game Night" | Weeks 8-16 | Craps test suite |
| **v2.2** | "Come Back Tomorrow" | Weeks 16-24 | Persistence layer live |
| **v2.3+** | "Data-Driven" | Week 24+ | v2.0-v2.2 analytics data |

---

## 3. v2.0 "More Casino"

**Theme:** More games, faster play, zero setup friction.
**Timeline:** 6-8 weeks.
**Goal:** Validate the multi-game architecture. Give players more reasons to play. Ship confidence-building features with low technical risk.

### 3.1 Roulette

**Priority:** P0 — v2.0
**Complexity:** M
**Technical Risk:** Medium
**Source:** `CASINO-V2-NEW-GAMES.md` Sections 9-16

#### User Stories

- **US-R1:** As a player, I want to place bets on numbers, colours, and ranges so that I can enjoy the roulette experience with my friends.
- **US-R2:** As a casual player, I want large, easily tappable outside-bet buttons so that I can bet quickly without navigating a complex grid.
- **US-R3:** As a returning player, I want a "Repeat Last" button so that I can replay my previous bets with a single tap.
- **US-R4:** As a new player, I want a 30-second tutorial the first time I play roulette so that I understand the basics.

#### Requirements

**Game Type:** European single-zero roulette (37 pockets, 2.7% house edge).

**Bet Types:**

| Category | Bets | Payouts |
|----------|------|---------|
| Inside | Straight Up (35:1), Split (17:1), Street (11:1), Corner (8:1), Six Line (5:1) | High risk, high reward |
| Outside | Red/Black (1:1), Odd/Even (1:1), High/Low (1:1), Dozen (2:1), Column (2:1) | Low risk, low reward |

**Bet Limits:**

| Constant | Default |
|----------|---------|
| `ROULETTE_MIN_BET` | 5 |
| `ROULETTE_MAX_INSIDE_BET` | 100 |
| `ROULETTE_MAX_OUTSIDE_BET` | 500 |
| `ROULETTE_MAX_TOTAL_BET` | 1,000 |

**Controller UX — Two-Tab Layout (Decision 7):**

- **Tab 1 "Quick Bets" (default):** Red/Black, Odd/Even, High/Low, Dozens, Columns — six large, tappable button groups. Plus "My Numbers" row (3-5 favourite number presets) and "REPEAT LAST" button. No scrolling. Covers 80%+ of casual bets.
- **Tab 2 "Number Grid":** Full 37-number grid for inside bets. Tap a number for straight-up; tap again to add chips. Split/Corner/Street via context menu (one extra tap for much better accuracy on small screens). Voice-first for numbers: "Number 17", "Split 17 and 20".

**Spin Completion (Decision 8):**

- Display dispatches `completeRouletteSpin` when ball-landing animation finishes.
- Server hard timeout at 8 seconds as fallback (`forceCompleteRouletteSpin`).
- `endIf` checks `state.roulette.spinComplete === true`.
- Same pattern as video playback (V-CRITICAL-3).

**Phase Flow:**

```
GAME_SELECT → ROULETTE_PLACE_BETS → ROULETTE_NO_MORE_BETS
  → ROULETTE_SPIN → ROULETTE_RESULT → ROULETTE_PAYOUT
  → ROULETTE_ROUND_COMPLETE → loop
```

**Near-Miss Detection:** Server-side European wheel adjacency map. If a player's straight-up bet is adjacent (depth=2) to the winning number on the physical wheel layout, trigger `roulette_near_miss` video overlay.

**Dealer Characters:** Pierre Beaumont (refined French croupier) and "Vegas" Veronica Lane (glamorous American croupier).

**Video Assets:** 11 total (2 phase prompts, 1 spin overlay, 4 outcome triggers, 3 big-win celebrations, 1 ambient loop).

**Tutorial:** 3-step, ~25-second guided first-play on controller. Triggers on first roulette play per session. Demonstrates outside bets and introduces straight-up betting.

#### Acceptance Criteria

- [ ] European single-zero wheel with all 37 pockets renders correctly on Display
- [ ] All inside and outside bet types can be placed and resolve correctly
- [ ] Two-tab controller layout with Quick Bets as default
- [ ] "Repeat Last" button replays previous round's bets
- [ ] Favourite numbers (3-5) persist within session
- [ ] Spin animation completes with client-driven signal + server hard timeout
- [ ] Near-miss detection triggers video overlay when applicable
- [ ] Bet validation rejects insufficient funds, below-minimum, above-maximum, and above-total-limit bets with inline error messages
- [ ] Voice commands for all bet types functional
- [ ] Tutorial triggers for first-time roulette players

---

### 3.2 Three Card Poker

**Priority:** P0 — v2.0 (D-015)
**Complexity:** S-M
**Technical Risk:** Low
**Source:** `CASINO-V2-NEW-GAMES.md` Sections 17-24

#### User Stories

- **US-TCP1:** As a player, I want to play a fast poker variant where each hand takes under 30 seconds so that I can enjoy quick games between longer sessions.
- **US-TCP2:** As a player, I want to place a Pair Plus side bet so that I can win based on hand quality regardless of the dealer.
- **US-TCP3:** As a new player, I want a tutorial showing the 3-card hand rankings so that I understand the different ranking from standard poker.

#### Requirements

**Hand Rankings (3-card, different from 5-card):**

| Rank | Hand |
|------|------|
| 1 | Straight Flush |
| 2 | Three of a Kind |
| 3 | Straight |
| 4 | Flush |
| 5 | Pair |
| 6 | High Card |

Note: In 3-card poker, straights rank above flushes because straights are rarer with only 3 cards (48 combos vs 1,096).

**Game Flow:** Ante → Optional Pair Plus → Deal 3 cards each → Play or Fold → Dealer Reveal → Resolution.

**Dealer Qualification:** Queen-high or better. If dealer doesn't qualify: Ante pays 1:1, Play bet pushes.

**Ante Bonus:** Straight (1:1), Three of a Kind (4:1), Straight Flush (5:1) — pays regardless of dealer hand.

**Pair Plus Payouts:** Pair (1:1), Flush (3:1), Straight (6:1), Three of a Kind (30:1), Straight Flush (40:1).

**Bet Limits:**

| Constant | Default |
|----------|---------|
| `TCP_MIN_ANTE` | 10 |
| `TCP_MAX_ANTE` | 500 |
| `TCP_MAX_PAIR_PLUS` | 100 |

**Phase Flow:**

```
GAME_SELECT → TCP_PLACE_BETS → TCP_DEAL_CARDS → TCP_PLAYER_DECISIONS
  → TCP_DEALER_REVEAL → TCP_SETTLEMENT → TCP_ROUND_COMPLETE → loop
```

Six phases. Simultaneous player decisions (no sequential turns). Under 30 seconds per round.

**Hand Evaluator:** Uses rank-band bases with 1000-wide gaps (6000/5000/4000/3000/2000/1000) to ensure monotonic ordering. The strength value is a single sortable integer — no need to compare rank categories first. (RC-3 fix.)

**Dealer Characters:** Shared with existing Blackjack dealers (Ace Malone, Scarlett Vega, Chip Dubois) per D-010, or [NEEDS SPEC] — confirm whether TCP uses existing BJ dealers or new dedicated dealers.

**Video Assets:** [NEEDS SPEC] — TCP video asset count not specified in source docs. Estimate 8-10 assets (ante prompt, deal, reveal, qualification check, win/loss celebrations, big pair plus hit, ambient).

**Tutorial:** [NEEDS SPEC] — 30-second tutorial covering 3-card rankings and the Play/Fold decision. Format consistent with Roulette and Craps tutorials.

#### Acceptance Criteria

- [ ] 3-card hand evaluator produces correct rankings with monotonic strength ordering
- [ ] Dealer qualification check (Queen-high or better) works correctly
- [ ] Ante Bonus pays on Straight, Three of a Kind, Straight Flush regardless of dealer hand
- [ ] Pair Plus resolves independently of Play/Fold decision
- [ ] Simultaneous player decisions (no sequential turns)
- [ ] Round completes in under 30 seconds with typical play
- [ ] Bet validation for Ante and Pair Plus limits
- [ ] Voice commands for ante amounts, play/fold decisions

---

### 3.3 Speed Variants (Hold'em, 5-Card Draw, Blackjack)

**Priority:** P0 — v2.0
**Complexity:** S each
**Technical Risk:** Very Low
**Source:** `CASINO-V2-EXISTING-GAME-CHANGES.md` Sections 1.1, 2.3, 3.1

#### User Stories

- **US-SPD1:** As a group with limited time, I want a speed mode so that we can play 25-30 hands in 20 minutes instead of 8-10.
- **US-SPD2:** As a player, I want auto-fold on timeout in speed mode so that the pace never slows down.

#### Requirements

All speed variants are config-driven changes to existing game timers and animation speeds. No new game logic.

**Speed Hold'em:**

| Setting | Standard | Speed |
|---------|----------|-------|
| Action timer | 30s | 10s |
| Deal animation | ~2s | ~0.8s |
| Blind increase | Manual | Every 5 hands (auto) |
| Auto-fold on timeout | No | Yes |
| Auto-deal delay | Manual | 3s after previous hand |

**Speed 5-Card Draw:**

| Setting | Standard | Speed |
|---------|----------|-------|
| Action timer | 30s | 15s |
| Draw selection timer | 30s | 10s |
| Deal animation | ~3s | ~1s |
| Auto-fold on timeout | No | Yes |

**Speed Blackjack:**

| Setting | Standard | Speed |
|---------|----------|-------|
| Auto-stand | No | Hard 17+ |
| Card animation | ~1s | ~0.5s |
| Bet timer | 30s | 10s |
| Auto-rebuy | No | Yes (if wallet allows) |

#### Acceptance Criteria

- [ ] Speed variant selectable from lobby for each game
- [ ] All timers and animation speeds apply correctly per config
- [ ] Auto-fold/auto-stand logic triggers on timeout
- [ ] Auto-blind increase in Speed Hold'em every 5 hands
- [ ] Session stats track speed vs standard variant play

---

### 3.4 Quick-Play Mode

**Priority:** P0 — v2.0
**Complexity:** S
**Technical Risk:** Low
**Source:** `CASINO-V2-EXISTING-GAME-CHANGES.md` Section 4.1

#### User Stories

- **US-QP1:** As a host, I want to tap "Quick Play" so that a random game starts with default settings in 5 seconds.
- **US-QP2:** As a player, I want the game to auto-rotate every 10 hands so that I experience variety without having to choose.

#### Requirements

- Host taps "Quick Play" to skip lobby configuration entirely
- Random game selected, weighted by inverse recency (favours games played less recently this session)
- Default settings applied (medium blinds/bets, standard variant)
- Game starts in 5 seconds with countdown on TV
- Auto-rotates to a different game every 10 hands/rounds
- Continues until host says "Stop" or all players leave
- New `QP_AUTO_ROTATE` phase: 3-second transition screen ("Switching to Blackjack!")

#### Acceptance Criteria

- [ ] Quick Play accessible from lobby with single tap
- [ ] Game selection weighted by inverse recency
- [ ] 5-second countdown before game start
- [ ] Auto-rotation after 10 hands/rounds per game
- [ ] Transition screen displays between games
- [ ] Host can stop Quick Play at any time

---

### 3.5 Casino Crawl (Stub)

**Priority:** P0 — v2.0 (stub), upgraded in v2.1
**Complexity:** S
**Technical Risk:** Low
**Source:** `CASINO-V2-EXISTING-GAME-CHANGES.md` Section 4.2, Roadmap Section 2

#### User Stories

- **US-CC1:** As a host, I want to tap "Casino Crawl" so that the system automatically plans a multi-game evening for us.

#### Requirements — v2.0 Stub

In v2.0, Casino Crawl is a **simplified auto-rotation** without scoring:

- System generates a lineup of all available games in random order
- Plays a set number of hands/rounds per game (8 Hold'em → 8 Draw → 10 BJ → 15 Roulette → etc.)
- Auto-switches between games with transition screen
- **No scoring, no leaderboard, no champion ceremony** — those arrive with full Game Night Mode in v2.1

This gives players the "one-tap multi-game evening" experience immediately. The scoring/competitive layer is added in v2.1.

#### Acceptance Criteria (v2.0)

- [ ] Casino Crawl accessible from lobby
- [ ] Auto-generates game lineup with all available games
- [ ] Plays configured number of hands/rounds per game
- [ ] Auto-switches with transition screen
- [ ] Host can end Casino Crawl at any time

---

### 3.6 Reactions / Emotes

**Priority:** P0 — v2.0
**Complexity:** S
**Technical Risk:** Very Low
**Source:** `CASINO-V2-RETENTION.md` Section 7.4

#### User Stories

- **US-RX1:** As a player, I want to send quick reactions during gameplay so that I can express emotions without interrupting the game.

#### Requirements

6 reactions available during all gameplay:

| Reaction | TV Animation | Audio |
|----------|-------------|-------|
| Clap | Clapping hands near player's seat | Clap sound |
| Laugh | Laughing emoji | Short laugh |
| Groan | Facepalm | Groan sound |
| Fire | Fire emoji | Sizzle |
| Taunt | Pointing finger | "Ooh!" crowd sound |
| Shock | Jaw-drop | Gasp |

- Rate limit: max 3 reactions per 10 seconds per player
- Controller UI: collapsible reaction bar at bottom of game screen
- TV display: animated overlay near the sending player's seat area

#### Acceptance Criteria

- [ ] All 6 reactions render correctly on TV Display
- [ ] Rate limiting enforced (3 per 10 seconds)
- [ ] Audio plays with each reaction
- [ ] Reactions visible to all players
- [ ] Collapsible bar does not obstruct primary game UI

---

### 3.7 Per-Game Tutorials

**Priority:** P0 — v2.0
**Complexity:** S
**Technical Risk:** Low
**Source:** PM Review, `CASINO-V2-NEW-GAMES.md` Sections 1.2, 9.1

#### Requirements

30-second interactive first-play guides for Roulette and Three Card Poker (the two new v2.0 games).

- Trigger: first time a player enters a new game in a session
- Displayed on the controller only (other players unaffected)
- 3-4 steps with auto-advance and skip button
- Dealer narrates via TTS
- Does not block other players

#### Acceptance Criteria

- [ ] Tutorial triggers on first play of each new game per session
- [ ] Skip button visible from step 1
- [ ] Dealer TTS narration accompanies each step
- [ ] Tutorial does not block or slow down other players
- [ ] Correct tutorial content for Roulette and TCP

---

### 3.8 v2.0 Technical Prerequisites

| Prerequisite | Owner | Notes |
|-------------|-------|-------|
| Fix TCP hand evaluator strength bug (M4) | Game dev | Rank-band bases with 1000-wide gaps. Must fix before TCP ships. |
| Roulette two-tab controller design | UX/Game dev | Revise from single scrollable grid per Decision 7. |
| Roulette spin client-driven completion | Game dev | Same pattern as video playback per Decision 8. |
| Build-time reducer name collision check (RC-7) | Game dev | Test verifying no duplicate reducer names across all game modules. |
| Fire TV Stick performance profiling | Engineering | Profile state size + broadcast frequency with 5-game state shape on baseline hardware. |
| `wrapWithGameNightCheck` utility in v2.0 round-complete phases | Game dev | Build Game Night guard wrapper into all v2.0 round-complete `next` functions from the start (no-op when Game Night inactive). Avoids refactoring every game when v2.1 adds Game Night Mode (W2). |
| Craps test suite specification (document only) | QA/Game dev | Exhaustive list of bet type x outcome x player count test cases. No code — just the scenario document. Ready at v2.0 ship (week 8) so Craps dev starts immediately in v2.1. |

### 3.9 v2.0 Exclusions

v2.0 does NOT include:

- Craps (v2.1)
- Game Night Mode scoring/leaderboard/ceremony (v2.1)
- Any persistence-dependent features
- Cosmetics, achievements, Crews, jackpot, tournaments
- Wild card or lowball variants (v2.3+ / cut)
- Bounty tournament mode (v2.3+)
- Additional Blackjack side bets (v2.3+)

### 3.10 v2.0 Analytics Events

| Event | Purpose |
|-------|---------|
| `game.started` | Track which games are played, frequency, player count |
| `game.completed` | Session length, chip results, player count |
| `speed_variant.selected` | Speed mode adoption rate |
| `quick_play.used` | Quick Play vs manual game selection |
| `casino_crawl.used` | Auto-rotation adoption |
| `game.switched` | Game switching frequency and direction |
| `tutorial.started` / `tutorial.completed` / `tutorial.skipped` | Tutorial engagement |
| `reaction.sent` | Reaction usage frequency and type distribution |

---

## 4. v2.1 "Game Night"

**Theme:** The structured competitive evening. The weekly ritual. THE product.
**Timeline:** 6-8 weeks after v2.0.
**Goal:** Game Night Mode is the differentiator. Craps is the headliner game. Together they make Weekend Casino the best 90 minutes of the week.

### 4.1 Craps

**Priority:** P0 — v2.1 (D-016)
**Complexity:** L
**Technical Risk:** Medium-High
**Source:** `CASINO-V2-NEW-GAMES.md` Sections 1-8

#### User Stories

- **US-CR1:** As a casual player, I want Simple Mode (Pass Line / Don't Pass only) so that I can enjoy craps without being overwhelmed.
- **US-CR2:** As an experienced player, I want to toggle Advanced Mode to access Come, Don't Come, Place, Field, and Odds bets.
- **US-CR3:** As the shooter, I want to tap or say "Roll!" to throw the dice with a visceral 3D animation.
- **US-CR4:** As a new player, I want a 30-second tutorial explaining the come-out roll and point phase.

#### Requirements

**Core Mechanics:**

- Two standard dice. Rotating shooter (clockwise after seven-out).
- Two-phase structure: Come-Out Roll → Point Phase.
- Come-out: 7/11 = Natural (Pass wins). 2/3/12 = Craps (Pass loses, Don't Pass wins on 2/3, pushes on 12). Anything else = Point established.
- Point Phase: hit the point = Pass wins. Roll 7 = seven-out, Pass loses.

**Simple Mode (Default — Decision 6):**

- Only Pass Line and Don't Pass visible on controller
- Two large buttons: "PASS LINE" (green) and "DON'T PASS" (red)
- Server accepts all bet types regardless — Simple Mode is purely a UI filter
- "Show Advanced Bets" toggle at bottom of controller reveals full bet menu
- Toggle state persists per player per session
- Host can force Advanced Mode for all players via lobby config

**v1 Bet Types (6 total):**

| Bet | Payout |
|-----|--------|
| Pass Line | 1:1 |
| Don't Pass | 1:1 |
| Come | 1:1 |
| Don't Come | 1:1 |
| Place Bets (4,5,6,8,9,10) | 9:5 / 7:5 / 7:6 |
| Field | 1:1 (2x on 2, 3x on 12) |

Plus Odds bets (true odds, no house edge) behind Pass/Don't Pass and Come/Don't Come. Max odds: 3x (configurable).

**Phase Flow:**

```
GAME_SELECT → CRAPS_NEW_SHOOTER → CRAPS_COME_OUT_BETTING → CRAPS_COME_OUT_ROLL
  → [Natural/Craps] → CRAPS_COME_OUT_RESOLUTION → CRAPS_ROUND_COMPLETE → loop
  → [Point Established] → CRAPS_POINT_BETTING → CRAPS_POINT_ROLL
  → [Point Hit/Seven-Out] → CRAPS_POINT_RESOLUTION → CRAPS_ROUND_COMPLETE → loop
  → [Other Number] → CRAPS_POINT_RESOLUTION → CRAPS_POINT_BETTING → loop
```

**Batched Resolution (RC-1):** `resolveCrapsRoll` thunk computes all bet resolutions and dispatches a single `setCrapsRollResults` reducer with the full resolution array. Minimises state broadcasts during the most complex resolution phase.

**Place Bet Working/Not Working (M2):** Place bets default "off" during come-out rolls. The `working` flag is checked in resolution logic alongside `config.placeBetsWorkOnComeOut`.

**Game-Switch Come Bet Rule (RC-5):** If the table switches games while players have active Come/Don't Come bets with established points, all such bets are returned to the player's wallet at face value (no resolution, no odds payout). Implemented in `returnActiveComeBets` thunk. Display shows "Bets returned" with neutral yellow indicator.

**Dice RNG (M1):** `crypto.getRandomValues()`. Seed stored in `ServerCrapsState` for replay. Distribution validation tests required.

**Bet Limits:**

| Constant | Default |
|----------|---------|
| `CRAPS_MIN_BET` | 10 |
| `CRAPS_MAX_BET` | 500 |
| `CRAPS_MAX_ODDS_MULTIPLIER` | 3 |

**Dealer Characters:** "Lucky" Luciano (high-energy carnival barker) and "Diamond" Dolores (smooth, sardonic veteran).

**Video Assets:** 12 total (4 gameplay overlays, 4 outcome celebrations, 3 big-moment full-screens, 1 ambient loop).

**Tutorial:** 4-step, ~30-second guided first-play covering come-out roll and point phase. Displayed on controller only.

#### Acceptance Criteria

- [ ] Simple Mode shows only Pass Line and Don't Pass
- [ ] Advanced Mode toggle reveals all 6 bet types + Odds
- [ ] All bet types resolve correctly for all dice outcomes
- [ ] Batched resolution dispatches single reducer call
- [ ] Place bets respect working/not-working flag
- [ ] Come bets returned at face value on game switch
- [ ] Shooter rotation works correctly (clockwise after seven-out)
- [ ] Dice RNG uses CSPRNG with stored seed
- [ ] Exhaustive test suite covers all bet type x outcome x player count combinations
- [ ] 3D dice roll animation completes in 2.5-3.5 seconds
- [ ] Voice commands for all bet types and roll action

---

### 4.2 Game Night Mode (Full)

**Priority:** P0 — v2.1
**Complexity:** L
**Technical Risk:** Medium
**Source:** `CASINO-V2-RETENTION.md` Section 1

#### User Stories

- **US-GN1:** As a host, I want to set up a Game Night by picking 3-5 games, setting round counts, and choosing a theme so that our evening has structure.
- **US-GN2:** As a player, I want to see a leaderboard between games showing my rank and points so that I know how I'm doing.
- **US-GN3:** As the Game Night champion, I want a dramatic reveal ceremony with confetti and a shareable results card.
- **US-GN4:** As a player, I want fair scoring across games with different payout structures so that my poker win matters as much as my roulette win.

#### Requirements

**Scoring System — Rank-Based (D-014):**

Game Night uses rank-based scoring. The chip-multiplier normalisation system is deprecated and MUST NOT be implemented. No `GAME_NIGHT_NORMALISERS` constant. No `normaliseChipResult` function.

| Rank | Points |
|------|--------|
| 1st | 100 |
| 2nd | 70 |
| 3rd | 45 |
| 4th | 25 |

Plus bonus points for spectacular plays (Royal Flush: +50, Straight Flush: +30, Straight-up roulette hit: +25, Hot Shooter in craps: +20, etc.) and a margin bonus (up to +30 for dominant wins).

**Setup Flow:**

```
LOBBY → GN_SETUP (host picks 3-5 games, round counts, order or shuffle, optional theme)
  → Players connect, see lineup on TV and controllers
  → GAME_SELECT → [Game 1 phases] → GN_LEADERBOARD
  → GAME_SELECT → [Game 2 phases] → GN_LEADERBOARD
  → ... → [Game N phases] → GN_CHAMPION → SESSION_SUMMARY
```

**New Phases:**

| Phase | Purpose |
|-------|---------|
| `GN_SETUP` | Host configures Game Night |
| `GN_LEADERBOARD` | Shown between games with scores and next game preview (15-20 seconds) |
| `GN_CHAMPION` | Champion ceremony at the end |

**Themes:** `'high_roller'`, `'beginner_friendly'`, `'all_poker'`, `'dice_and_wheels'`, `'casino_crawl'`

**Champion Ceremony:**
1. Dramatic pause (2s): screen dims, drumroll
2. Countdown reveal: 4th → 3rd → 2nd with total points and highlight stat
3. Champion reveal (3s): winner's name, confetti, crown animation, victory jingle
4. Stats card (5s): branded results with date, rankings, best performance, highlight moment, session duration
5. Share prompt: controllers show "Share Results" with PNG generation and Web Share API

**Streak Tracking (Session-Local in v2.1):**
- Track Game Night championship streaks within session
- Cross-session streak tracking arrives in v2.2 with persistence layer

#### Acceptance Criteria

- [ ] Host can configure Game Night with 3-5 games
- [ ] Rank-based scoring awards correct points per game
- [ ] Bonus points trigger for all defined spectacular plays
- [ ] Leaderboard displays correctly between games
- [ ] Champion ceremony plays with dramatic reveal sequence
- [ ] Results card generates as shareable PNG
- [ ] Web Share API works on phone controller
- [ ] `wrapWithGameNightCheck` utility activates and routes to `GN_LEADERBOARD` at round limits

---

### 4.3 Casino Crawl (Full — v2.1 Upgrade)

**Priority:** P0 — v2.1
**Complexity:** S
**Technical Risk:** Low

In v2.1, Casino Crawl upgrades from auto-rotation to full Game Night scoring. It becomes "automated Game Night" — one tap, all games, full competitive structure.

- Uses `GameNightState` with `theme: 'casino_crawl'` and auto-generated `gameLineup`
- All available games in random order
- Game Night scoring, leaderboard between games, champion ceremony at the end

#### Acceptance Criteria

- [ ] Casino Crawl triggers full Game Night scoring in v2.1
- [ ] All available games included in lineup
- [ ] Leaderboard and champion ceremony display correctly
- [ ] Single-tap start from lobby

---

### 4.4 Blackjack Tournament Mode

**Priority:** P1 — v2.1
**Complexity:** M
**Technical Risk:** Low
**Source:** `CASINO-V2-EXISTING-GAME-CHANGES.md` Section 3.2

#### User Stories

- **US-BJT1:** As a player, I want a fixed-hand tournament where we all start with equal chips so that Blackjack becomes player-vs-player.
- **US-BJT2:** As a player, I want to see a leaderboard every 5 rounds showing chip standings.

#### Requirements

| Rule | Detail |
|------|--------|
| Rounds | 20 (configurable: 10, 20, 30) |
| Starting chips | Equal for all (10,000) |
| Objective | Highest chip count after N rounds |
| Tie-breaker | Most natural blackjacks, then most hands won |

Leaderboard overlay every 5 rounds showing standings, chip counts, and stats (most blackjacks, biggest single win).

#### Acceptance Criteria

- [ ] Equal starting chips for all players
- [ ] Correct round counting and game end
- [ ] Leaderboard displays every 5 rounds
- [ ] Tie-breaker logic works correctly
- [ ] Tournament integrates with Game Night Mode as a structured segment

---

### 4.5 Spectator Mode

**Priority:** P1 — v2.1
**Complexity:** S
**Technical Risk:** Low
**Source:** `CASINO-V2-RETENTION.md` Section 7.1

#### User Stories

- **US-SP1:** As a 5th person at game night, I want to connect as a spectator so that I can watch the game and send reactions.

#### Requirements

- Spectators connect via QR but in read-only mode
- See TV summary on their phone, but NO private card information
- Can send reactions (emojis) that appear on TV
- Spectator count shown on TV: "3 players, 2 spectators watching"

#### Acceptance Criteria

- [ ] Spectator can connect without being a player
- [ ] No private card data sent to spectators
- [ ] Reactions from spectators display on TV
- [ ] Spectator count visible to all

---

### 4.6 Shareable Results Card

**Priority:** P1 — v2.1
**Complexity:** S
**Technical Risk:** Low
**Source:** `CASINO-V2-RETENTION.md` Section 7.3

#### Requirements

- PNG generation with final standings, highlight moment, Weekend Casino branding, QR code
- Web Share API on controller
- Generated after every Game Night

#### Acceptance Criteria

- [ ] PNG renders with correct data and branding
- [ ] Share button works via Web Share API
- [ ] Download option as fallback

---

### 4.7 v2.1 Technical Prerequisites

| Prerequisite | Owner | Notes |
|-------------|-------|-------|
| Game Night meta-phase routing activation | Game dev | Activate `wrapWithGameNightCheck(innerNext)` utility. Wire in Craps round-complete phase. |
| Craps dice RNG specification (M1) | Game dev | CSPRNG, seed stored for replay, distribution validation tests. |
| Craps come bet game-switch rule (RC-5) | Game dev | Active come bets returned at face value on game switch. |
| Craps "working" flag for Place bets (M2) | Game dev | `placeBetsWorkOnComeOut` checked in resolution logic. |
| Roulette near-miss wheel adjacency map (M3) | Game dev | Server-side adjacency detection for video triggers. |
| Craps bet resolution test suite | QA/Game dev | Exhaustive coverage of all bet types x all roll outcomes x multi-player scenarios. |
| `GN_LEADERBOARD` as asset preloading buffer (A3) | Game dev | Evict previous game's video assets, preload next game's during leaderboard display. |
| Video asset priority tiers | Art/Video | Premium assets for craps dice roll, Game Night ceremony. Placeholders for lower-priority moments. |
| Persistence architecture TDD (RC-8) | Backend | Design document for database, identity, API layer. Must be complete before v2.1 ships. |

---

## 5. v2.2 "Come Back Tomorrow"

**Theme:** Daily engagement. The retention engine. This is where the DAU growth happens.
**Timeline:** 6-8 weeks after v2.1 (coincides with persistence layer completion).
**Goal:** Convert weekly Game Night players into daily-active users.
**Hard Dependency:** Persistence layer must be live.

### 5.1 Phone Companion Mode

**Priority:** P0 — v2.2 (D-018)
**Complexity:** M
**Technical Risk:** Medium
**Source:** Roadmap Decision 3

#### User Stories

- **US-PC1:** As a player, I want to collect my daily bonus from my phone without needing a TV so that I can maintain my streak between game nights.
- **US-PC2:** As a player, I want to check my challenge progress from my phone so that I know what to work on at the next game night.
- **US-PC3:** As a player, I want push notifications reminding me about Game Night so that I don't forget.

#### Requirements

Standalone phone web app providing:

- Daily bonus collection (phone-only, no TV needed)
- Challenge progress tracking
- Profile viewing
- Crew stats (when Crews ship in v2.3+)
- Push notifications ("Game Night tonight at 7!")

This is the critical bridge between "weekly party app" and "daily engagement app." Without it, daily bonuses and streaks are features for a product that doesn't exist.

#### Acceptance Criteria

- [ ] Accessible via web URL on phone (no app download required)
- [ ] Daily bonus collection works without TV connection
- [ ] Challenge progress displays correctly
- [ ] Profile with stats viewable
- [ ] Push notifications deliverable and tappable
- [ ] Player identity persists across sessions via device fingerprint

---

### 5.2 Daily Login Bonuses

**Priority:** P0 — v2.2 (Roadmap wins over Retention doc's P0/v2.0 priority)
**Complexity:** S
**Technical Risk:** Low
**Source:** `CASINO-V2-RETENTION.md` Section 2.2

#### User Stories

- **US-DLB1:** As a player, I want escalating daily rewards so that I'm motivated to log in every day.
- **US-DLB2:** As a player, I want a streak multiplier that increases my rewards for consecutive weeks.

#### Requirements

7-day escalating cycle:

| Day | Base Reward | Notes |
|-----|------------|-------|
| Mon | 500 chips | Reset day |
| Tue | 750 chips | |
| Wed | 1,000 chips | |
| Thu | 1,500 chips | |
| Fri | 2,000 chips + Game Night Boost ticket | +10% bonus points in next Game Night |
| Sat | 2,500 chips | |
| Sun | 5,000 chips + Mystery Cosmetic Crate | Random cosmetic item |

Streak multiplier: after completing a full 7-day cycle, next cycle multiplier increases. Caps at 2.0x after 4 consecutive weeks.

Claimable via Phone Companion OR TV app.

#### Acceptance Criteria

- [ ] Correct escalating rewards per day
- [ ] Streak multiplier applies correctly (1.0x-2.0x)
- [ ] Multiplier caps at 2.0x after 4 weeks
- [ ] Claimable on both phone companion and TV
- [ ] Game Night Boost ticket applies +10% in next Game Night
- [ ] Mystery Crate awards random cosmetic

---

### 5.3 Weekly Challenges

**Priority:** P0 — v2.2 (Roadmap wins over Retention doc's P0/v2.0 priority)
**Complexity:** M
**Technical Risk:** Medium
**Source:** `CASINO-V2-RETENTION.md` Section 2.3

#### User Stories

- **US-WC1:** As a player, I want 3 challenges per week (Bronze/Silver/Gold) so that I always have something to work towards.
- **US-WC2:** As a player who only plays Hold'em, I want challenges that push me to try other games so that I discover new favourites.

#### Requirements

Three challenge slots, refreshing every Monday at 00:00 UTC:

| Tier | Difficulty | Reward | Example |
|------|-----------|--------|---------|
| Bronze | Easy (1 session) | 1,000 chips | "Play 5 hands of any poker game" |
| Silver | Medium (specific play) | 3,000 chips + XP | "Win 3 blackjack hands in a row" |
| Gold | Hard (skill/luck) | 8,000 chips + XP + cosmetic | "Hit a flush or better in Hold'em" |

**Assignment Algorithm:**
- 40% chance Silver or Gold targets an underplayed game (not played in 14 days)
- No duplicate challenges from last 2 weeks
- Challenges span all game types (poker, blackjack, craps, roulette, cross-game)

Progress tracked via persistence layer. Viewable on phone companion and TV.

#### Acceptance Criteria

- [ ] 3 challenges assigned every Monday at 00:00 UTC
- [ ] Challenge progress tracks correctly across sessions
- [ ] Rewards distribute on completion (chips, XP, cosmetic for Gold)
- [ ] Assignment algorithm weights toward underplayed games
- [ ] No duplicate challenges within 2-week window
- [ ] Progress viewable on phone companion and TV

---

### 5.4 Player Profiles

**Priority:** P1 — v2.2 (Roadmap wins over Existing Changes doc's P1/v2.1 priority)
**Complexity:** M
**Technical Risk:** Medium
**Source:** `CASINO-V2-EXISTING-GAME-CHANGES.md` Section 4.3

#### User Stories

- **US-PP1:** As a player, I want to see my total stats, win rates, and favourite game so that I feel invested in my progress.
- **US-PP2:** As a player, I want to see a "Player Spotlight" card on TV between games showing a random player's stats.

#### Requirements

Profile data includes:
- Aggregate stats (total sessions, hands played, chips won/lost, net result)
- Per-game stats (hands played, win rate, biggest win/loss, game-specific metrics)
- Game Night stats (played, championships, win rate)
- Social stats (unique opponents, favourite game)
- Cosmetics (unlocked, equipped)
- Achievements (list of completed)
- Streaks (Game Night streak, daily login streak)

Display:
- TV: "Player Spotlight" card between games (random player)
- Controller: "Profile" tab showing own profile

Storage: per-player in persistence layer, keyed by player identifier (device fingerprint + name).

#### Acceptance Criteria

- [ ] All stat categories accumulate correctly across sessions
- [ ] Per-game stats correct for each game type
- [ ] Player Spotlight renders correctly on TV
- [ ] Profile tab accessible on controller
- [ ] Profile persists across sessions via persistence layer

---

### 5.5 Basic Cosmetics (20 Items)

**Priority:** P1 — v2.2
**Complexity:** M
**Technical Risk:** Medium
**Source:** `CASINO-V2-RETENTION.md` Section 5

#### Requirements

| Category | Description | Count |
|----------|------------|-------|
| Card Backs | Back-of-card design | ~7 |
| Table Felts | Table surface colour/pattern | ~5 |
| Avatar Frames | Border around player avatar | ~4 |
| Chip Designs | Chip colour/pattern | ~4 |

Earned via achievements (primary source), daily login crates, weekly challenge Gold rewards, and Game Night streak milestones.

All cosmetics visible on TV Display. Host's card back used as default for unregistered players.

#### Acceptance Criteria

- [ ] 20 cosmetic items available
- [ ] Cosmetics render correctly on TV Display
- [ ] Equip/unequip functional on controller
- [ ] Cosmetics persist across sessions
- [ ] Correct unlock conditions for each cosmetic

---

### 5.6 Achievement System (Phase 1: ~25 Achievements)

**Priority:** P1 — v2.2 (Roadmap wins over Existing Changes doc's P1/v2.1 priority. Phase 1 = ~25, not 49.)
**Complexity:** M
**Technical Risk:** Medium
**Source:** `CASINO-V2-EXISTING-GAME-CHANGES.md` Section 4.4, `CASINO-V2-RETENTION.md` Section 5.3

#### Requirements

Phase 1 achievement categories (~25 achievements):

| Category | Examples | Approx Count |
|----------|---------|-------------|
| Getting Started | First hand, first win, first Game Night | 5 |
| Poker Mastery | Win 100 hands, hit Royal Flush | 5 |
| Blackjack Mastery | Win 100 rounds, hit 10 naturals | 4 |
| Game Night | Win 1/5/10 Game Nights | 3 |
| Cross-Game | Win in every game, play all games in one session | 3 |
| Social | Play with 5/10 different people | 2 |
| Collector | Unlock 10/25 cosmetics | 3 |

Each achievement unlocks a specific cosmetic reward.

Phase 2 (v2.3+) adds remaining achievements to reach ~49 total, including Crew achievements, Jackpot achievements, and extended mastery tiers.

**Notification:** Toast on TV (3 seconds) + persistent notification on controller with unlocked cosmetic.

#### Acceptance Criteria

- [ ] ~25 achievements trackable
- [ ] Progress updates correctly per game action
- [ ] Cosmetic reward unlocks on completion
- [ ] TV toast notification displays on achievement
- [ ] Controller shows persistent achievement notification
- [ ] Achievement progress persists across sessions

---

### 5.7 Progressive Jackpot

**Priority:** P1 — v2.2 (v2.2 per roadmap, not v2.1 per retention doc)
**Complexity:** M
**Technical Risk:** Medium
**Source:** `CASINO-V2-RETENTION.md` Section 4

#### User Stories

- **US-JP1:** As a player, I want to see a jackpot ticker on the TV at all times so that I feel every bet could win big.
- **US-JP2:** As a player, I want to win mini and major jackpots frequently enough to feel rewarded.

#### Requirements

**Contribution:** 1% of every main bet across all games.

**3-Tier System:**

| Tier | Trigger | Payout | Reset |
|------|---------|--------|-------|
| Mini | Three of a Kind in poker / BJ 21+3 hit / Pass-line + odds win | 5% of jackpot | Immediate re-seed |
| Major | Straight Flush / Natural BJ + Perfect Pair / Hot shooter (10+ rolls) | 15% of jackpot | After 100 bets |
| Grand | Royal Flush / Natural BJ + PP + 21+3 / Same roulette number twice | 80% of jackpot | Re-seed to 10,000 |

**Display:** Persistent ticker in top-right corner of TV during all gameplay. Pulses gently. Increments visibly when contributions added. Full celebration sequence on tier win.

**Storage:** Cross-session jackpot state in Redis (requires persistence layer).

#### Acceptance Criteria

- [ ] 1% contribution deducted correctly from all bets
- [ ] Jackpot ticker displays on TV during all games
- [ ] All 3 tiers trigger at correct conditions
- [ ] Correct payout and reset behaviour per tier
- [ ] Jackpot state persists across sessions via Redis
- [ ] Celebration sequence plays on win

---

### 5.8 Game Night Streaks (Cross-Session)

**Priority:** P1 — v2.2
**Complexity:** S
**Technical Risk:** Low
**Source:** `CASINO-V2-RETENTION.md` Section 1.6

#### Requirements

Weekly Game Night streak counter persisted across sessions.

**Streak Rewards:**

| Streak | Reward |
|--------|--------|
| 2 weeks | 500 bonus chips + "Regular" badge |
| 4 weeks | 2,000 bonus chips + "Committed" card back |
| 8 weeks | 5,000 bonus chips + "Dedicated" table felt |
| 12 weeks | 10,000 bonus chips + "Veteran" chip set + gold crown avatar frame |
| 26 weeks | 25,000 bonus chips + "Legend" dealer outfit unlock |
| 52 weeks | 100,000 bonus chips + "Founder" exclusive set |

#### Acceptance Criteria

- [ ] Streak increments on Game Night completion
- [ ] Streak resets if a week is missed
- [ ] Correct rewards at each milestone
- [ ] Streak persists across sessions

---

### 5.9 Progressive Side Bet (Blackjack Jackpot Feed)

**Priority:** P1 — v2.2 (ships with jackpot system, not v2.1 per existing changes doc)
**Complexity:** S
**Technical Risk:** Low
**Source:** `CASINO-V2-EXISTING-GAME-CHANGES.md` Section 3.3

#### Requirements

- Fixed 100-chip side bet in Blackjack that feeds the progressive jackpot
- Toggle alongside existing side bets during `BJ_PLACE_BETS`
- Mini trigger: Natural Blackjack with side bet active
- Major trigger: Natural BJ + Perfect Pair
- Grand trigger: Natural BJ + Perfect Pair + 21+3 Suited Triple

#### Acceptance Criteria

- [ ] Side bet toggle available in BJ betting phase
- [ ] 100% of side bet goes to jackpot pool
- [ ] All 3 trigger conditions detected correctly
- [ ] Jackpot ticker pulses with player colour when active

---

### 5.10 v2.2 Analytics Events

| Event | Purpose |
|-------|---------|
| `daily_bonus.claimed` | Claim rate, streak length, channel (phone vs TV) |
| `daily_bonus.streak_broken` | Streak-breaking patterns |
| `challenge.assigned` / `challenge.completed` | Challenge engagement |
| `challenge.drove_new_game` | Did challenge cause first play of a game? |
| `companion.opened` | Phone companion daily active usage |
| `companion.notification_received` / `companion.notification_tapped` | Push notification effectiveness |
| `cosmetic.unlocked` / `cosmetic.equipped` | Cosmetic engagement |
| `achievement.completed` | Achievement milestone tracking |
| `jackpot.contributed` / `jackpot.won` | Jackpot economy health |
| `profile.viewed` | Profile engagement |

---

## 6. v2.3+ "Data-Driven"

**Theme:** Only ship what the data supports. No speculative features.
**Timeline:** Rolling 4-6 week sprints after v2.2.
**Goal:** Double down on what works. Cut what doesn't.

### 6.1 Candidate Features with Gating Criteria

| Feature | Ship If... | Source |
|---------|-----------|--------|
| **Crews** | Companion adoption > 30% WAU AND identity persistence > 90% over 8 weeks | Retention |
| **Optional Account Linking (email/phone)** | Identity loss rate > 10% over 4 weeks (pre-Crews requirement) | PM Review |
| **SNG Tournaments** | Game Night completion rate > 50% AND tournament interest signal | Retention |
| **Bounty Tournament (Hold'em)** | Hold'em session frequency stable or growing | Existing Changes |
| **Wild Card Variant (5-Card Draw)** | 5-Card Draw play rate > 15% of total sessions | Existing Changes |
| **Extended Cosmetics (50+ items)** | Basic cosmetic equip rate > 40% of returning players | Retention |
| **Crew Leaderboards** | Crew creation > 1,000 in first 4 weeks | Retention |
| **Additional BJ Side Bets (Lucky Ladies, Royal Match)** | Side bet participation > 30% in existing BJ sessions | Existing Changes |
| **Rabbit Hunting (Hold'em)** | Session length stagnates (indicates need for more social moments) | Existing Changes |
| **Achievement System Phase 2 (~24 more)** | Phase 1 completion rate > 30% of active players | Retention / Existing Changes |
| **Streaming Mode** | Organic stream count > 100/week | PM Review |
| **Replays/Highlights** | Results card share rate > 15% | Retention |

### 6.2 Data Required Before v2.3 Decisions

| Metric | Source | Informs |
|--------|--------|---------|
| Game play distribution (% sessions per game) | v2.0 | Which games to invest in |
| Speed variant adoption rate | v2.0 | Whether speed modes become defaults |
| Game Night completion rate | v2.1 | Whether scoring/ceremony works |
| Game Night return rate (% within 7 days) | v2.1 | Whether weekly ritual is forming |
| Daily bonus claim rate (phone vs TV) | v2.2 | Whether companion mode works |
| Challenge completion rate by tier | v2.2 | Challenge difficulty tuning |
| Cross-game play driven by challenges | v2.2 | Whether challenges drive discovery |
| Identity persistence rate (8 weeks) | v2.2 | Whether Crews are viable |
| Cosmetic equip rate | v2.2 | Whether cosmetics matter to party players |
| Jackpot interest (opt-in rate) | v2.2 | Whether play-money jackpots work |

---

## 7. Persistence Layer (Parallel Workstream)

**Priority:** Critical infrastructure — starts immediately, runs in parallel, ships with v2.2
**Source:** Roadmap Decision 4, D-019

### 7.1 Why This Is Critical

Every retention feature in v2.2 (daily bonuses, challenges, profiles, achievements, cosmetics, streaks, jackpot) requires a database, player identity, and API services that do not exist. VGF's `MemoryStorage` is volatile. This is a 2-4 month backend project.

### 7.2 Components

1. **Player Identity Service** — Device fingerprint (v2.2), optional email/phone account linking (v2.3)
2. **Database** — Redis for hot state (jackpot, active sessions), DynamoDB for cold state (profiles, cosmetics, leaderboards, Crews)
3. **Profile/Inventory Service** — REST API for player data outside VGF
4. **VGF `IPersistence` Implementation** — Concrete backing store for session state persistence

### 7.3 Timeline

| Weeks | Deliverable | Owner |
|-------|------------|-------|
| 1-2 | Architecture TDD (database choice, schema design, API contracts, deployment topology) | Backend lead |
| 3-6 | Player Identity Service (device fingerprint, token generation, session association) | Backend |
| 5-8 | VGF `IPersistence` implementation with Redis backing store | Backend |
| 7-10 | Profile Service (REST endpoints for player data, stats accumulation) | Backend |
| 9-12 | Inventory Service (cosmetics, achievements, challenge state) | Backend |
| 11-14 | Companion API (phone-only endpoints for bonus collection, challenge tracking) | Backend |

### 7.4 Architecture Requirements

- **Persistence TDD must be completed before v2.0 ships** (week 8)
- Redis + DynamoDB recommended (managed services to reduce ops burden)
- Device fingerprint-based identity as primary mechanism
- `IPersistence` implementation must handle session state serialisation/deserialisation
- API contracts must support phone companion mode (no TV required)

### 7.5 Key Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Takes longer than 14 weeks | Critical | Start architecture TDD immediately. Use managed services. Scope v2.2 to what's ready. |
| Identity persistence loss over 8 weeks | High | Track from v2.2 launch. If > 10% loss: expedite account linking to v2.3 priority. |

#### Acceptance Criteria

- [ ] Architecture TDD complete before v2.0 ships
- [ ] Player Identity Service creates and retrieves player identities via device fingerprint
- [ ] Redis stores hot state (jackpot, active sessions) with sub-100ms latency
- [ ] DynamoDB stores cold state (profiles, cosmetics) with sub-500ms latency
- [ ] `IPersistence` implementation passes VGF integration tests
- [ ] Profile Service REST API serves player data
- [ ] Companion API endpoints work without TV connection
- [ ] 90%+ identity persistence over 8-week cohort

---

## 8. Changes to Existing Games

This section consolidates all enhancements to v1 games (Hold'em, 5-Card Draw, Blackjack) across releases.

### 8.1 v2.0 Changes

| Game | Change | Complexity |
|------|--------|-----------|
| Hold'em | Speed Hold'em variant (10s timer, auto-fold, auto-blind every 5 hands) | S |
| 5-Card Draw | Speed Draw variant (15s timer, 10s draw timer, auto-fold) | S |
| Blackjack | Speed Blackjack variant (auto-stand on hard 17+, 10s bet timer, auto-rebuy) | S |
| All games | Quick-Play auto-rotation integration | S |
| All games | Casino Crawl auto-rotation integration (stub) | S |
| All games | Reactions/emotes during gameplay | S |
| All games | `wrapWithGameNightCheck` utility in round-complete phases (no-op) | S |

### 8.2 v2.1 Changes

| Game | Change | Complexity |
|------|--------|-----------|
| Blackjack | Tournament Mode (fixed-hand, equal starting chips, leaderboard every 5 rounds) | M |
| All games | Game Night scoring integration via `wrapWithGameNightCheck` activation | S |
| All games | Casino Crawl upgrade to full Game Night scoring | S |

### 8.3 v2.2 Changes

| Game | Change | Complexity |
|------|--------|-----------|
| Blackjack | Progressive side bet (100-chip jackpot feed) | S |
| All games | Cosmetic rendering (card backs, table felts, chip designs, avatar frames) | M |
| All games | Achievement trigger hooks in game logic | S |
| All games | Challenge progress tracking hooks | S |
| All games | Profile stat accumulation hooks | S |
| All games | Jackpot contribution (1% of every main bet) | S |

### 8.4 v2.3+ Candidates (Data-Gated)

| Game | Change | Gate |
|------|--------|------|
| Hold'em | Bounty / Knockout Tournament Mode | Hold'em session frequency stable or growing |
| Hold'em | Rabbit Hunting ("show what would have come") | Session length stagnates |
| 5-Card Draw | Wild Card Variant (Deuces Wild / Jokers Wild) | 5-Card Draw play rate > 15% |
| Blackjack | Lucky Ladies side bet (4:1 to 1000:1) | Side bet participation > 30% |
| Blackjack | Royal Match side bet (5:2 to 25:1) | Side bet participation > 30% |

---

## 9. Cross-Cutting Requirements

### 9.1 Game Night Scoring (D-014)

**Rank-based scoring is the ONLY scoring system.** Per canonical decision D-014:

- 1st = 100 pts, 2nd = 70, 3rd = 45, 4th = 25
- Bonus points for spectacular plays
- Margin bonus (up to +30) for dominant wins
- The chip-multiplier normalisation system is DEPRECATED
- `GAME_NIGHT_NORMALISERS` constant MUST NOT be implemented
- `normaliseChipResult` function MUST NOT be implemented

### 9.2 Shared Player Wallet

Per D-005:
- Every player starts each session with 10,000 chips
- Wallet persists across games within the session
- Per-game sub-wallets funded from main wallet at game start
- Synced back at round completion

Blackjack max bet: 500 chips (D-006).

### 9.3 Video Asset Management

Per D-012 and D-013:
- Canonical video asset count: 51 (v1 baseline)
- v2.0 adds ~21 new assets (Roulette: 11, TCP: ~10) → v2.0 total: ~72
- v2.1 adds ~12 new assets (Craps: 12) → v2.1 total: ~84
- **Per-game lazy loading** with priority queue (max 3 concurrent downloads)
- Sprite sheets for short overlays
- Graceful degradation on slow connections
- **NO bulk preloading** of all videos at session start (D-013)
- `GN_LEADERBOARD` phase used as asset preloading buffer (evict previous game's assets, preload next game's)

### 9.4 Video State

Per D-011:
- Server-authoritative video playback state
- `VIDEO_HARD_TIMEOUT` scheduler timeout is primary mechanism
- Display's `completeVideo` dispatch is an optimisation, not the authority
- `endIf` never calls `Date.now()`

### 9.5 Dealer Characters

**Existing (v1):**
- Poker: Vincent, Maya, Remy, Jade
- Blackjack: Ace Malone, Scarlett Vega, Chip Dubois (D-010)

**New (v2):**
- Craps: "Lucky" Luciano, "Diamond" Dolores
- Roulette: Pierre Beaumont, "Vegas" Veronica Lane

### 9.6 Architecture Patterns

Per D-001 through D-004:
- Single expanded `GameRuleset` with phase namespaces (D-001)
- `CasinoGameState` is a flat union type with optional game-specific sub-objects (D-002)
- Phase naming: `UPPER_SNAKE_CASE` with game-specific underscore prefix (D-003)
- `CasinoGame` enum uses `snake_case` values (D-004)

Extended `CasinoGame` type:
```typescript
type CasinoGame = 'holdem' | 'five_card_draw' | 'blackjack_classic'
  | 'blackjack_competitive' | 'craps' | 'roulette' | 'three_card_poker'
```

### 9.7 Game Switching

- v1/v2.0: Host-only game switching between rounds (D-008)
- v2: Vote-based mechanism for any player to propose a game change (D-008)

[NEEDS SPEC] — The vote-based game switching mechanism for v2 needs detailed requirements: vote threshold, timeout, UI for proposing and voting, integration with Game Night mode (which has a fixed lineup).

### 9.8 Bet Validation (All New Games)

Per M6 fix, all bet placement thunks validate before dispatching:

| Validation | Error Message |
|------------|--------------|
| `amount > wallet.balance` | "Not enough chips. You have $[balance]." |
| `amount < minBet` | "Minimum bet is $[minBet]." |
| `amount > maxBet` | "Maximum bet is $[maxBet]." |
| `totalBets + amount > maxTotalBet` | "Table max reached ($[maxTotalBet])." |
| Bet type unavailable in current phase | "[Bet] isn't available during [phase]." |
| Conflicting bets | "You can't bet both sides." |

Pattern: validate in thunk, reject with `SET_BET_ERROR` dispatch, fail-fast in reducer (throw on invalid input, never silently ignore).

### 9.9 Soft 17 Rule (D-009)

Dealer stands on soft 17 by default. Configurable per `BlackjackDifficulty` setting (hard difficulty may hit on soft 17).

### 9.10 Competitive Blackjack (D-007)

v1 uses sequential player turns (not simultaneous). Splitting not available. Simultaneous play deferred to v2.

[NEEDS SPEC] — Simultaneous competitive Blackjack for v2 needs detailed design: how simultaneous decisions interact, timer synchronisation, display layout for parallel play.

---

## 10. Success Metrics per Release

### 10.1 v2.0 Success Criteria (8 weeks post-launch)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Games played per session | >= 1.5 (up from 1.0) | Players using multiple games |
| Roulette play rate | >= 15% of sessions | New game finding audience |
| TCP play rate | >= 10% of sessions | Quick-game niche served |
| Speed variant adoption | >= 20% of sessions | Short-session use case is real |
| Quick Play / Casino Crawl usage | >= 10% of sessions | Low-friction modes valued |
| Session length | Stable or increased vs v1 | More games didn't fragment sessions |
| Tutorial completion rate | >= 70% for new-game first-timers | Onboarding working |

### 10.2 v2.1 Success Criteria (8 weeks post-launch)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Game Night completion rate | >= 50% | Structured format engaging |
| Game Night weekly return rate | >= 40% play again within 7 days | Weekly ritual forming |
| Craps play rate | >= 20% of sessions | Social energy thesis validated |
| Results card share rate | >= 10% of Game Nights | Organic acquisition active |
| Craps Simple Mode → Advanced | >= 30% graduate within 3 sessions | Tiered complexity working |

### 10.3 v2.2 Success Criteria (8 weeks post-launch)

| Metric | Target | Rationale |
|--------|--------|-----------|
| DAU/MAU stickiness | >= 22% (up from ~15%) | Daily engagement working |
| Phone companion daily active | >= 30% of WAU open 3x/week | Companion bridging daily gap |
| Daily bonus claim rate | >= 40% claim at least 4/7 days | Streak mechanic sticky |
| Challenge completion rate | >= 50% of assigned completed | Challenges achievable |
| Cross-game play via challenges | >= 20% completions in underplayed game | Discovery engine working |
| Identity persistence (8-week cohort) | >= 90% | Persistence layer reliable |

### 10.4 North Star: Full v2 Lifecycle

| Metric | Target | Timeline |
|--------|--------|----------|
| DAU | 50-100K | 6 months post v2.0 |
| DAU | 200-500K | Full v2 lifecycle (post v2.2 retention systems) |
| WAU | 150-300K | 6 months post v2.0 |
| MAU | 300-500K | 6 months post v2.0 |
| DAU/MAU | 20-25% | Post v2.2 |

50-100K is the 6-month milestone target. 200-500K is the full v2 lifecycle aspirational target if v2.2+ retention systems materially outperform baseline. 1M DAU moves to v3 (D-017).

---

## 11. Resolved Contradictions Appendix

This section documents every cross-document contradiction identified and how it was resolved using the governance hierarchy (Canonical Decisions > Roadmap > Game Design > PRD).

### C-01: Daily Bonuses Priority

| Source | Said | Resolution |
|--------|------|-----------|
| Retention doc | P0/v2.0 | **Roadmap wins: v2.2** |
| Roadmap | v2.2 | Daily bonuses require persistence layer, which ships with v2.2. |

### C-02: Weekly Challenges Priority

| Source | Said | Resolution |
|--------|------|-----------|
| Retention doc | P0/v2.0 | **Roadmap wins: v2.2** |
| Roadmap | v2.2 | Challenges require persistence layer for cross-session tracking. |

### C-03: Bounty Tournament

| Source | Said | Resolution |
|--------|------|-----------|
| Existing Changes doc | P1/v2.1 | **Roadmap wins: v2.3+** |
| Roadmap | v2.3+ (data-gated) | Ships only if Hold'em session frequency is stable or growing. |

### C-04: Wild Card Variant

| Source | Said | Resolution |
|--------|------|-----------|
| Existing Changes doc | P1/v2.1 | **Roadmap wins: v2.3+** |
| Roadmap | v2.3+ (data-gated) | Ships only if 5-Card Draw play rate > 15% of sessions. |

### C-05: Player Profiles

| Source | Said | Resolution |
|--------|------|-----------|
| Existing Changes doc | P1/v2.1 | **Roadmap wins: v2.2** |
| Roadmap | v2.2 | Profiles require persistence layer. |

### C-06: Achievement System

| Source | Said | Resolution |
|--------|------|-----------|
| Existing Changes doc | P1/v2.1 | **Roadmap wins: v2.2** |
| Roadmap | v2.2 | Achievements require persistence layer. |

### C-07: Progressive Side Bet

| Source | Said | Resolution |
|--------|------|-----------|
| Existing Changes doc | P1/v2.1 | **v2.2** |
| Roadmap | Jackpot system in v2.2 | Side bet feeds jackpot; ships when jackpot ships. |

### C-08: Casino Crawl Phasing

| Source | Said | Resolution |
|--------|------|-----------|
| Existing Changes doc | Ships with Game Night | **Two phases documented** |
| Roadmap | Stub in v2.0, full in v2.1 | v2.0: auto-rotation without scoring. v2.1: full Game Night scoring. Both phases specified in this PRD. |

### C-09: DAU Targets

| Source | Said | Resolution |
|--------|------|-----------|
| Roadmap body | 50-100K at 6 months | **Both are correct, different timelines** |
| D-017 | 200-500K for full v2 | 50-100K is the 6-month target. 200-500K is the full v2 lifecycle target if retention systems outperform baseline. 1M DAU = v3. |

### C-10: All-In Insurance & Lowball Variant

| Source | Said | Resolution |
|--------|------|-----------|
| Existing Changes doc | P2 features | **CUT from v2 per roadmap** |
| Roadmap | Cut from v2 | All-In Insurance: play-money context removes the problem it solves. Lowball: confuses casual players, niche appeal. Both deferred to v3+. |

### C-11: Achievement Count

| Source | Said | Resolution |
|--------|------|-----------|
| Retention doc / Existing Changes | ~49 achievements | **Phase 1 = ~25, Phase 2 adds rest** |
| Roadmap | ~25 Phase 1 | Phase 1 (v2.2) ships ~25 achievements covering Getting Started, per-game mastery basics, Game Night, cross-game, social, and collector categories. Phase 2 (v2.3+) adds Crew, Jackpot, and extended mastery achievements to reach ~49. |

### C-12: TCP Ships in v2.0

| Source | Said | Resolution |
|--------|------|-----------|
| PM Review (earlier) | Defer TCP from v2 | **D-015: TCP ships in v2.0** |
| Principal Engineer + Roadmap Decision 5 | TCP in v2.0 | TCP is lowest-risk new game, fills quick-game niche, validates multi-game architecture. |

### C-13: Game Night Scoring System

| Source | Said | Resolution |
|--------|------|-----------|
| New Games doc (original) | Chip-multiplier normalisation | **D-014: Rank-based scoring** |
| Retention doc + Roadmap Decision 1 | Rank-based (100/70/45/25) | Simpler, fairer, harder to game, easier to implement. Chip-multiplier system deprecated. |

---

## 12. Deferred / Cut Features

### 12.1 Cut from v2

Features explicitly removed from the v2 scope based on review feedback.

| Feature | Original Priority | Why Cut | Could Revisit If... |
|---------|-----------------|---------|-------------------|
| **All-In Insurance** | P2 | Play-money context means bad beats are funny, not devastating. Wallet-deduction model is confusing. (PM review) | Data shows significant rage-quit after all-in losses. |
| **Lowball Variant** | P2 | Inverted rankings confuse casual players. Niche appeal. Medium complexity for low impact. (PM review) | 5-Card Draw popular enough to warrant variant investment. |
| **Daily/Weekly Recurring Tournaments** | P1-P2 | "Daily tournament" assumes daily sessions — this is a weekly party game. Scheduling for co-located groups is impractical. (PM review) | Online multiplayer enables remote tournament participation. |

### 12.2 Deferred to v3

Features requiring fundamental product or architectural changes beyond v2 scope.

| Feature | Why Deferred | Prerequisite |
|---------|-------------|-------------|
| **Online Multiplayer (no TV)** | Breaks TV-first constraint. Required for 1M DAU. | Separate PRD. Major VGF architecture work. |
| **Multi-TV Tournaments** | Multiple living rooms competing simultaneously. | Online multiplayer infrastructure. |
| **Scheduled / Recurring Tournaments** | Requires players at specific times and places. Doesn't fit party model without online play. | Online multiplayer. Scheduling service. |
| **Clip Recording** | Platform-dependent (Fire TV Cube). Niche audience. | Fire TV Cube adoption data. |
| **Sic Bo** | Asian market expansion. Requires localisation. | Localisation infrastructure. |
| **Let It Ride** | Low differentiation from Hold'em. | v2 game variety data showing demand. |
| **Battle Pass / Season Pass** | Monetisation layer. v2 has no monetisation. | Monetisation strategy. |
| **Lowball Variant** | Cut from v2. Could return if Wild Card validates first. | Wild Card ships and is validated. |

---

## Risk Register

| Risk | Severity | Likelihood | Mitigation | Owner |
|------|----------|-----------|------------|-------|
| Persistence layer takes > 14 weeks | Critical | Medium | Start TDD immediately. Managed services. Scope v2.2 to what's ready. | Backend lead |
| Fire TV Stick can't handle 7-game state broadcasts | High | Low | Profile early (v2.0 prerequisite). Batch resolution dispatches. Delta-based updates as fallback. | Engineering |
| Craps test coverage insufficient | High | Medium | Mandate exhaustive test suite before Craps ships. Block v2.1 on coverage threshold. | QA lead |
| Craps overwhelms casual players despite Simple Mode | Medium | Medium | A/B test Simple Mode adoption. If > 60% stay in Simple Mode after 3 sessions, consider making it the only mode. | PM |
| Daily bonuses don't work without companion mode | High | High | Companion mode is P0 for v2.2. If persistence delays, ship TV-only with reduced expectations. | PM + Backend |
| Play-money economy makes retention feel hollow | Medium | Medium | Monitor jackpot opt-in and streak continuation. If below thresholds, add chip sinks. | PM |
| Game Night scoring feels unfair to specialists | Medium | Medium | Playtest before launch. Monitor repeat rate by scoring margin. | PM + Game design |
| Video asset production delays v2.1 | Medium | High | Ship with placeholder animations. Premium video for: craps dice roll, Game Night ceremony, roulette spin. | Art lead |
| Identity persistence loss over 8 weeks | High | High | Track from v2.2 launch. If > 10% loss, expedite account linking to v2.3. | Backend |

---

## Open Questions / Needs Spec

Items identified as underspecified during consolidation:

1. **[NEEDS SPEC]** TCP dealer characters — confirm whether TCP uses existing BJ dealers or new dedicated dealers.
2. **[NEEDS SPEC]** TCP video asset count and specifications — not detailed in source docs.
3. **[NEEDS SPEC]** TCP tutorial content — format and steps not specified.
4. **[NEEDS SPEC]** Vote-based game switching mechanism (v2) — detailed UI, vote threshold, timeout, Game Night interaction.
5. **[NEEDS SPEC]** Simultaneous competitive Blackjack (v2) — how simultaneous decisions work, display layout.
6. **[NEEDS SPEC]** Phone Companion Mode technical architecture — web app framework, authentication flow, push notification service.
7. **[NEEDS SPEC]** Cosmetic rendering specifications — asset formats, resolution requirements, animation specs for animated cosmetics.
8. **[NEEDS SPEC]** Craps Tutorial persistence — currently triggers once per session. With persistence layer (v2.2+), should only trigger for truly new players.
9. **[NEEDS SPEC]** La Partage rule for roulette — noted as "deferred to v2 as configurable option" but not assigned to a specific release.

---

*This document consolidates requirements from `CASINO-V2-NEW-GAMES.md`, `CASINO-V2-EXISTING-GAME-CHANGES.md`, `CASINO-V2-RETENTION.md`, and `CASINO-V2-ROADMAP-FINAL.md`. All contradictions resolved per the governance hierarchy documented in `CANONICAL-DECISIONS.md`. This PRD should be revisited after each release based on actual performance data.*

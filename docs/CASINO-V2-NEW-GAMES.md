# Weekend Casino v2 — New Game Designs

> **Version:** 1.3
> **Date:** 2026-02-28
> **Author:** Senior Game Designer
> **Status:** Final
> **Authority:** New game design specifications for v2 (Craps, Roulette, Three Card Poker). Defers to `CASINO-V2-ROADMAP-FINAL.md` for release timing.
> **Last Aligned:** 2026-02-28
> **Canonical Decisions:** See `docs/CANONICAL-DECISIONS.md`
> **Supersedes:** — | **Superseded By:** `CASINO-V2-ROADMAP-FINAL.md` (for release scope/timing)
> **Depends on:** `CASINO-GAME-DESIGN.md` (v2.1) — all architecture patterns, state conventions, and video integration standards from that document apply here.

### Revision Log (v1.3)

> Addresses cross-document contradictions identified in `docs/codex-feedback.md`:
>
> **TCP-1:** Three Card Poker restored to **v2.0** ship target, aligning with `docs/CASINO-V2-ROADMAP-FINAL.md` Decision 5. PM-2 deferral to v2.1 superseded. Section III header, asset counts (Section 28), and revision log updated.
> **SCORING-1:** Game Night scoring system (Section 25) replaced chip-multiplier normalisation with **rank-based scoring** from `docs/CASINO-V2-RETENTION.md` Section 1.3, aligning with `docs/CASINO-V2-ROADMAP-FINAL.md` Decision 1. All `GAME_NIGHT_NORMALISERS`, `normaliseChipResult`, and "coordination in progress" notes removed.
> **ASSETS-1:** Video asset counts in Section 28 updated to align with canonical ship timing (TCP in v2.0, Craps in v2.1). v2.0 Launch Total is **72** (51 v1 + 21 v2.0 new). v2.1 cumulative total is **84** (51 + 21 + 12). Maths made explicit.

### Revision Log (v1.2)

> Addresses feedback from `docs/REVIEW-V2-PRINCIPAL.md`:
>
> **RC-1:** Batched craps bet resolution into single `setCrapsRollResults` reducer dispatch (Section 2, `resolveCrapsRoll` thunk). Leverages VGF's thunk-level broadcast batching.
> **RC-2:** Redesigned Roulette controller UX with two-tab layout: Quick Bets (outside bets, large buttons, favourite numbers, REPEAT LAST) + Number Grid (inside bets, context menu for splits/corners). Section 12 fully rewritten.
> **RC-3:** Fixed TCP hand evaluator strength calculation. Rank-band bases now use 1000-wide gaps (6000/5000/4000/3000/2000/1000) ensuring monotonic ordering. `dealerQualifies` updated for new encoding. Section 19.
> **RC-4:** Game Night scoring mismatch with retention doc — **RESOLVED.** Rank-based scoring adopted per Roadmap Decision 1. Chip-multiplier system removed. Section 25 rewritten.
> **RC-5:** Added game-switch come bet resolution rule. Active come/don't-come bets returned at face value on game switch. New `returnActiveComeBets` thunk. Section 2, `CRAPS_ROUND_COMPLETE`.
> **RC-6:** Roulette spin timing now uses client-driven completion signal + server hard timeout (8s fallback). Follows V-CRITICAL-3 pattern from v1. New `completeRouletteSpin` and `forceCompleteRouletteSpin` thunks. Section 10.
> **M1:** Added dice RNG specification — `crypto.getRandomValues()`, seed-based replay, distribution validation test. Section 27.
> **M2:** Added working/not-working Place bet check in `resolveCrapsRoll`. Place bets default "off" during come-out. Section 2.
> **M3:** Added roulette near-miss detection via European wheel adjacency map. Server-side calculation, Display-side animation. Section 15.
> **M6:** Added bet validation error handling specification. Validate in thunk, reject with error dispatch, fail-fast in reducer. Section 2.

### Revision Log (v1.1)

> Addresses feedback from `docs/REVIEW-V2-PM.md`:
>
> **PM-1:** Added Craps Simple Mode (Section 1.1) — Pass Line / Don't Pass only by default, all other bets behind "Advanced" toggle. Fixes the 6/10 Ease of Learning score.
> **PM-2:** ~~Three Card Poker shipping priority revised from v2.0 to v2.1.~~ **SUPERSEDED by Roadmap Decision 5:** TCP ships in **v2.0**. See `docs/CASINO-V2-ROADMAP-FINAL.md` Decision 5.
> **PM-3:** Added per-game tutorials for Craps and Roulette (Sections 1.2 and 9.1). 30-second guided first-play experiences.
> **PM-4:** Added video asset priority tiers (Section 28). Premium vs placeholder classification for launch.
> **PM-5:** Added Game Night scoring playtesting caveat (Section 25).
> **PM-6:** Added CrapsConfig.simpleMode flag to state shape and controller UX.

---

## Table of Contents

### I. Craps
1. [Craps Rules Specification](#1-craps-rules-specification)
2. [Craps Phase Flow](#2-craps-phase-flow)
3. [Craps State Shape](#3-craps-state-shape)
4. [Craps Controller UX](#4-craps-controller-ux)
5. [Craps Display & 3D](#5-craps-display--3d)
6. [Craps Voice Commands](#6-craps-voice-commands)
7. [Craps Video Integration](#7-craps-video-integration)
8. [Craps Dealer Characters](#8-craps-dealer-characters)

### II. Roulette
9. [Roulette Rules Specification](#9-roulette-rules-specification)
10. [Roulette Phase Flow](#10-roulette-phase-flow)
11. [Roulette State Shape](#11-roulette-state-shape)
12. [Roulette Controller UX](#12-roulette-controller-ux)
13. [Roulette Display & 3D](#13-roulette-display--3d)
14. [Roulette Voice Commands](#14-roulette-voice-commands)
15. [Roulette Video Integration](#15-roulette-video-integration)
16. [Roulette Dealer Characters](#16-roulette-dealer-characters)

### III. Three Card Poker
17. [Three Card Poker Rules Specification](#17-three-card-poker-rules-specification)
18. [Three Card Poker Phase Flow](#18-three-card-poker-phase-flow)
19. [Three Card Poker State Shape](#19-three-card-poker-state-shape)
20. [Three Card Poker Controller UX](#20-three-card-poker-controller-ux)
21. [Three Card Poker Display & 3D](#21-three-card-poker-display--3d)
22. [Three Card Poker Voice Commands](#22-three-card-poker-voice-commands)
23. [Three Card Poker Video Integration](#23-three-card-poker-video-integration)
24. [Three Card Poker Dealer Characters](#24-three-card-poker-dealer-characters)

### IV. Cross-Game Concerns
25. [Game Night Mode Integration](#25-game-night-mode-integration)
26. [Phase Enum & Routing Table Extensions](#26-phase-enum--routing-table-extensions)
27. [Server-Side State Extensions](#27-server-side-state-extensions)
28. [Estimated Video Asset Counts](#28-estimated-video-asset-counts)

### V. Deferred Game Evaluations
29. [Sic Bo Assessment](#29-sic-bo-assessment)
30. [Let It Ride Assessment](#30-let-it-ride-assessment)

---

# I. Craps

## 1. Craps Rules Specification

### Overview

Craps is the single most social casino game in existence. The entire table bets on the same pair of dice rolled by a rotating "shooter." In live casinos, craps tables draw the biggest crowds, the loudest cheers, and the most visceral reactions of any game on the floor. That energy translates directly to our couch-multiplayer model.

Our adaptation preserves the core magic — **communal betting on a shared outcome** — while simplifying the bet menu for a 2-4 player party audience on a TV + phone controller setup.

### Core Mechanics

**Dice:** Two standard six-sided dice. The shooter rolls both. Results range from 2 to 12.

**Rotating Shooter:** The shooter role rotates clockwise after each "seven-out" (the shooter loses the point). The shooter must place a Pass Line or Don't Pass bet to roll. Other players may bet however they like.

**Two-Phase Structure:** Every craps round has two potential phases:
1. **Come-Out Roll:** The shooter's first roll establishes the game state.
2. **Point Phase:** If the come-out roll establishes a "point," subsequent rolls attempt to hit that point again before rolling a 7.

### Come-Out Roll Outcomes

| Dice Total | Outcome | Effect |
|------------|---------|--------|
| 7 or 11 | **Natural** | Pass Line wins, Don't Pass loses. Round ends. New come-out roll. |
| 2, 3, or 12 | **Craps** | Pass Line loses. Don't Pass wins on 2 or 3; pushes on 12 (the "bar"). Round ends. |
| 4, 5, 6, 8, 9, 10 | **Point Established** | The number becomes "the point." A puck marker goes ON. Play continues. |

### Point Phase

Once a point is established, the shooter keeps rolling until:
- **Point hit:** The shooter rolls the point number again. Pass Line wins (1:1). Don't Pass loses. Shooter retains the dice.
- **Seven-out:** The shooter rolls a 7. Pass Line loses. Don't Pass wins (1:1). Shooter passes the dice to the next player.

### v1 Bet Types

We launch with 6 bet types. This covers 90% of real craps play. Exotic bets (hardways, hop bets, horn bets, big 6/8) are deferred to v2.

| Bet | When Placed | Resolution | Payout |
|-----|-------------|------------|--------|
| **Pass Line** | Before come-out roll | Wins on natural (7/11), loses on craps (2/3/12). If point set: wins if point hit, loses on 7-out. | 1:1 |
| **Don't Pass** | Before come-out roll | Opposite of Pass Line. Wins on 2/3, pushes on 12, loses on 7/11. If point set: wins on 7-out, loses if point hit. | 1:1 |
| **Come** | After point established | Acts like a personal Pass Line on the next roll. If next roll is 7/11: wins. If 2/3/12: loses. Otherwise, that number becomes the Come bet's own "point." | 1:1 |
| **Don't Come** | After point established | Opposite of Come. Wins on 2/3, pushes on 12, loses on 7/11. Otherwise, number becomes Don't Come point — wins on 7, loses if that number hits. | 1:1 |
| **Place Bets** | After point established | Bet on a specific number (4, 5, 6, 8, 9, or 10) being rolled before a 7. | Varies (see below) |
| **Field** | Any roll | One-roll bet. Wins on 2, 3, 4, 9, 10, 11, 12. Loses on 5, 6, 7, 8. | 1:1 (2x on 2, 3x on 12) |

**Place Bet Payouts:**

| Number | Payout | True Odds |
|--------|--------|-----------|
| 4 or 10 | 9:5 | 2:1 |
| 5 or 9 | 7:5 | 3:2 |
| 6 or 8 | 7:6 | 6:5 |

### Odds Bets (Free Odds)

After a point is established, players with Pass/Don't Pass or Come/Don't Come bets may place an additional "Odds" bet behind their original bet. Odds bets pay at true odds (no house edge). This is the single best bet in any casino.

| Point | Pass Line Odds Payout | Don't Pass Odds Payout |
|-------|-----------------------|------------------------|
| 4 or 10 | 2:1 | 1:2 |
| 5 or 9 | 3:2 | 2:3 |
| 6 or 8 | 6:5 | 5:6 |

**Max odds:** 3x the original bet (configurable: 1x, 2x, 3x, 5x, 10x). Default 3x for v1.

### Bet Timing Rules

| Bet Type | Can Place During Come-Out? | Can Place During Point Phase? | Can Remove? |
|----------|---------------------------|-------------------------------|-------------|
| Pass Line | Yes (required for shooter) | No (locked after come-out) | No |
| Don't Pass | Yes | No (locked after come-out) | Yes (but why would you?) |
| Come | No | Yes | No (locked after Come point set) |
| Don't Come | No | Yes | Yes (after DC point set) |
| Place Bets | No | Yes | Yes (can turn "off" or remove) |
| Field | Yes | Yes | Yes (resolves each roll) |
| Odds | No | Yes (after point/come point set) | Yes |

### Minimum and Maximum Bets

| Constant | Default | Range |
|----------|---------|-------|
| `CRAPS_MIN_BET` | 10 | 5-100 |
| `CRAPS_MAX_BET` | 500 | 100-5,000 |
| `CRAPS_MAX_ODDS_MULTIPLIER` | 3 | 1, 2, 3, 5, 10 |

---

### 1.1 Craps Simple Mode

> **[PM-1 FIX]** The market research scores Craps at 6/10 for Ease of Learning. The full bet menu (Pass, Don't Pass, Come, Don't Come, Place, Field, Odds) will overwhelm casual party players. Simple Mode is the default experience.

**Simple Mode (default):**
- Only **Pass Line** and **Don't Pass** bets are visible on the controller
- The controller shows two large buttons: "PASS LINE" (green) and "DON'T PASS" (red)
- No Come, Don't Come, Place, Field, or Odds bets
- The shooter's experience is identical (they must place one of the two)
- The point phase still works normally — the drama of "hit the point or seven-out" is fully preserved
- When the point is established, a simple prompt says: "The point is [N]. If [Shooter] rolls [N] again, Pass Line wins! If they roll 7, Don't Pass wins!"

**This makes Craps as simple as roulette:** pick a side, roll, watch. Two choices. Zero confusion.

**Advanced Mode (toggle):**
- A small "Show Advanced Bets" toggle appears at the bottom of the controller betting screen
- Tapping it reveals the full bet menu (Come, Don't Come, Place, Field, Odds)
- The toggle state persists per player per session (once you go advanced, you stay advanced)
- The Display always shows the full table layout regardless of mode — advanced bettors can see where their Place bets and Come points are
- The host can force Advanced Mode for all players via lobby configuration

**State impact:**

```typescript
interface CrapsConfig {
  // ... existing fields ...
  /** Whether Simple Mode is active (default: true) */
  simpleMode: boolean
}
```

The controller reads `craps.config.simpleMode` to determine which bets to show. The server accepts all bet types regardless — Simple Mode is purely a UI filter, not a game logic constraint. A player who toggles to Advanced can place any bet. A player in Simple Mode can only place Pass Line or Don't Pass.

**Voice command impact in Simple Mode:**
- "pass line" and "don't pass" work normally
- "come bet", "place the six", etc. are rejected with: "That bet isn't available in Simple Mode. Tap 'Advanced Bets' to unlock more options."

---

### 1.2 Craps Tutorial (Guided First Play)

> **[PM-3 FIX]** 30-second guided first-play tutorial for new Craps players.

**Trigger:** First time a player enters a Craps game in a session (checked via `sessionStats.gamesPlayed.craps === 0`). Can be dismissed immediately. Does not trigger for players who have played Craps before in any session (requires persistent identity — deferred to v2.1 with account system; for v2.0, triggers once per session).

**Tutorial flow (on the controller, 4 steps, ~30 seconds total):**

| Step | Controller Display | Duration | Auto-advance? |
|------|-------------------|----------|---------------|
| 1 | "Welcome to Craps! The shooter rolls two dice. Everyone bets on the outcome." | 5s | Yes |
| 2 | "Tap **PASS LINE** to bet that the shooter wins. Most players bet Pass Line." [Pass Line button pulses green] | 8s | After player taps or timeout |
| 3 | "The shooter rolls. If they roll **7 or 11**, you win! If they roll **2, 3, or 12**, you lose. Any other number sets the **point**." | 8s | Yes |
| 4 | "If a point is set, the shooter keeps rolling. Hit the point = you win! Roll a 7 = you lose. That's it! Have fun!" [SKIP TUTORIAL button visible from step 1] | 5s | Yes |

**Display (TV) during tutorial:** Normal game state. The tutorial only appears on the controller of the player who hasn't played before. Other players are unaffected.

**TTS:** The dealer narrates the tutorial steps for the learning player: "Welcome to the table! Let me show you the ropes..."

---

## 2. Craps Phase Flow

```
GAME_SELECT --> CRAPS_NEW_SHOOTER --> CRAPS_COME_OUT_BETTING --> CRAPS_COME_OUT_ROLL
  --> [Natural/Craps] --> CRAPS_COME_OUT_RESOLUTION --> CRAPS_ROUND_COMPLETE --> loop
  --> [Point Established] --> CRAPS_POINT_BETTING --> CRAPS_POINT_ROLL
  --> [Point Hit/Seven-Out] --> CRAPS_POINT_RESOLUTION --> CRAPS_ROUND_COMPLETE --> loop
  --> [Other Number] --> CRAPS_POINT_RESOLUTION --> CRAPS_POINT_BETTING --> loop
```

### Phase Definitions

#### `CRAPS_NEW_SHOOTER`

| Property | Value |
|----------|-------|
| `onBegin` | Initialise `craps` sub-state if first round. Assign shooter (rotate clockwise from last). Announce shooter via TTS: "[Player], you're up! Pick up the dice." Fund game-local from wallet (M1 Sync Point 1). Set `craps.newShooterReady = true`. |
| `endIf` | `state.craps?.newShooterReady === true` |
| `next` | `'CRAPS_COME_OUT_BETTING'` |
| `onEnd` | Reset `newShooterReady`. |

#### `CRAPS_COME_OUT_BETTING`

| Property | Value |
|----------|-------|
| `onBegin` | Clear previous roll result. Enable bet placement for all players. Shooter MUST place Pass Line or Don't Pass (minimum bet auto-placed if timeout). All players may place Pass/Don't Pass and Field bets. Display "COME OUT ROLL" puck state (OFF). Set betting timer (`CRAPS_BET_TIMEOUT_MS = 30_000`). |
| `endIf` | `state.craps?.allComeOutBetsPlaced === true` |
| `next` | `'CRAPS_COME_OUT_ROLL'` |
| `onEnd` | Lock all bets. Deduct from wallets. |

**Bet placement completion logic:**
- Shooter has placed Pass/Don't Pass (auto-placed on timeout)
- All other players have either placed bets or confirmed "no bet" (auto-confirmed on timeout)
- The `allComeOutBetsPlaced` flag is set by a thunk that checks all players

> **[M6 FIX] Bet validation error handling (applies to all three new games):**
>
> All bet placement thunks (`placeCrapsBet`, `placeRouletteBet`, `setTCPAnte`) validate before dispatching the corresponding reducer. Validation failures are communicated via a `SET_BET_ERROR` root reducer that sets a per-player transient error message. The controller displays the error inline (red text below the offending bet area, auto-clears after 3 seconds). The bet is NOT placed.
>
> | Validation | Error Message | Recovery |
> |------------|--------------|----------|
> | `amount > wallet.balance` | "Not enough chips. You have $[balance]." | Player adjusts amount |
> | `amount < minBet` | "Minimum bet is $[minBet]." | Player adjusts amount |
> | `amount > maxBet` | "Maximum bet is $[maxBet]." | Player adjusts amount |
> | `totalBets + amount > maxTotalBet` (roulette) | "Table max reached ($[maxTotalBet])." | Player removes other bets or confirms |
> | Bet type unavailable in current phase (e.g., Come during come-out) | "Come bets aren't available during the come-out roll." | Player waits for point phase |
> | Bet conflicts with existing bet (e.g., Pass Line + Don't Pass) | "You can't bet both sides." | Player removes conflicting bet |
>
> **Pattern:** Validate in thunk (has access to full state context), reject with error dispatch, never allow invalid state into the reducer. The reducer itself assumes valid input — it does NOT silently return unchanged state on invalid input (the v1 anti-pattern noted in Appendix C5). If somehow invalid input reaches the reducer, it throws (fail-fast) rather than silently ignoring.

#### `CRAPS_COME_OUT_ROLL`

| Property | Value |
|----------|-------|
| `onBegin` | Display "Shooter rolls!" prompt. Wait for shooter to press "ROLL" on controller (or voice: "Roll!" / auto-roll after 15s). Generate dice result server-side (stored in `ServerGameState.craps.nextRoll`). Dispatch `setCrapsRollResult` with the two dice values. Set `craps.rollComplete = true`. |
| `endIf` | `state.craps?.rollComplete === true` |
| `next` | `crapsAfterComeOutRoll(state)` — see routing below |
| `onEnd` | Reset `rollComplete`. |

```typescript
function crapsAfterComeOutRoll(state: CasinoGameState): CasinoPhase {
  const total = state.craps!.lastRollTotal
  if (total === 7 || total === 11 || total === 2 || total === 3 || total === 12) {
    return CasinoPhase.CrapsComeOutResolution  // natural or craps
  }
  return CasinoPhase.CrapsPointResolution  // point established — resolve then move to point betting
}
```

#### `CRAPS_COME_OUT_RESOLUTION`

| Property | Value |
|----------|-------|
| `onBegin` | Resolve Pass Line and Don't Pass bets. Resolve Field bets. Pay winners, collect losers. TTS: natural -> "Seven! Winner!" / "Eleven! Winner!" or craps -> "Craps! Two!" / "Three craps!" / "Twelve, craps — bar the don'ts!" Update wallets. Set `craps.comeOutResolutionComplete = true`. |
| `endIf` | `state.craps?.comeOutResolutionComplete === true` |
| `next` | `'CRAPS_ROUND_COMPLETE'` |
| `onEnd` | Reset `comeOutResolutionComplete`. |

#### `CRAPS_POINT_BETTING`

| Property | Value |
|----------|-------|
| `onBegin` | Display the point number prominently ("POINT IS [N]"). Enable point-phase bets: Come, Don't Come, Place Bets, Field, Odds (behind existing Pass/Don't Pass and Come bets). Betting timer: `CRAPS_BET_TIMEOUT_MS`. Existing Pass/Don't Pass bets are LOCKED (cannot be changed or removed). |
| `endIf` | `state.craps?.allPointBetsPlaced === true` |
| `next` | `'CRAPS_POINT_ROLL'` |
| `onEnd` | Lock new bets. Deduct from wallets. |

#### `CRAPS_POINT_ROLL`

| Property | Value |
|----------|-------|
| `onBegin` | Same as come-out roll — shooter presses ROLL. Generate dice, dispatch result. Set `craps.rollComplete = true`. |
| `endIf` | `state.craps?.rollComplete === true` |
| `next` | `'CRAPS_POINT_RESOLUTION'` |
| `onEnd` | Reset `rollComplete`. |

#### `CRAPS_POINT_RESOLUTION`

This is the most complex craps phase — it handles multiple bet types with different resolution conditions.

| Property | Value |
|----------|-------|
| `onBegin` | Run `resolveCrapsRoll` thunk (see below). Set `craps.pointResolutionComplete = true`. |
| `endIf` | `state.craps?.pointResolutionComplete === true` |
| `next` | `crapsAfterPointResolution(state)` — see routing below |
| `onEnd` | Reset `pointResolutionComplete`. |

```typescript
function crapsAfterPointResolution(state: CasinoGameState): CasinoPhase {
  const craps = state.craps!
  if (craps.sevenOut) {
    return CasinoPhase.CrapsRoundComplete  // seven-out: round over, new shooter
  }
  if (craps.pointHit) {
    return CasinoPhase.CrapsRoundComplete  // point hit: round over, same shooter
  }
  // Neither point nor seven — resolve Come/Don't Come points, Place bets, Field, then bet again
  return CasinoPhase.CrapsPointBetting
}
```

**`resolveCrapsRoll` thunk logic:**

> **[RC-1 FIX]** The thunk computes all bet resolutions internally and dispatches a **single** `setCrapsRollResults` reducer with the full resolution array, rather than dispatching individual `resolveCrapsBet` calls per bet. This leverages VGF's thunk-level broadcast batching (the thunk handler only broadcasts once after the thunk completes), minimising state broadcasts during the most complex resolution phase.

> **[M2 FIX]** Place bet "working/not working" during come-out: the resolution logic checks `bet.working` AND `config.placeBetsWorkOnComeOut` before resolving Place bets. By default, Place bets are "off" (not working) during come-out rolls. The `working` flag is set to `false` when entering `CRAPS_COME_OUT_BETTING` (unless `config.placeBetsWorkOnComeOut === true`), and set to `true` when entering `CRAPS_POINT_BETTING`.

```typescript
interface CrapsRollResolution {
  betId: string
  status: 'won' | 'lost' | 'push' | 'returned'
  payout: number
}

async function resolveCrapsRoll(ctx: ThunkCtx): Promise<void> {
  const state = ctx.getState()
  const craps = state.craps!
  const total = craps.lastRollTotal
  const point = craps.point
  const resolutions: CrapsRollResolution[] = []

  // 1. Resolve Field bets (every roll)
  resolutions.push(...resolveFieldBets(craps, total))

  // 2. Check for point hit or seven-out
  if (total === point) {
    resolutions.push(...resolvePassLineBets(craps, 'win'))
    resolutions.push(...resolveDontPassBets(craps, 'lose'))
    resolutions.push(...resolveOddsBets(craps, point, 'pass_win'))
    // [M2] Only resolve Place bets that are 'working'
    resolutions.push(...resolvePlaceBets(craps, total, 'win', /* workingOnly */ true))
    resolutions.push(...resolveComeBetsOnPoint(craps, total))
    // Dispatch single atomic resolution
    ctx.dispatch('setCrapsRollResults', resolutions, /* pointHit */ true, /* sevenOut */ false)
  } else if (total === 7) {
    resolutions.push(...resolvePassLineBets(craps, 'lose'))
    resolutions.push(...resolveDontPassBets(craps, 'win'))
    resolutions.push(...resolveOddsBets(craps, point, 'dont_pass_win'))
    // [M2] All place bets lose on 7 (regardless of working flag — 7 kills everything)
    resolutions.push(...resolveAllPlaceBets(craps, 'lose'))
    resolutions.push(...resolveAllComeBets(craps, 'seven'))
    ctx.dispatch('setCrapsRollResults', resolutions, /* pointHit */ false, /* sevenOut */ true)
  } else {
    // 3. Not point, not 7 — resolve Place bets for this number, advance Come/Don't Come
    // [M2] Only resolve Place bets that are 'working'
    resolutions.push(...resolvePlaceBets(craps, total, 'win', /* workingOnly */ true))
    resolutions.push(...resolveComeBetsOnNumber(craps, total))
    ctx.dispatch('setCrapsRollResults', resolutions, /* pointHit */ false, /* sevenOut */ false)
  }

  ctx.dispatch('setCrapsPointResolutionComplete', true)
}
```

**Note on `setCrapsRollResults` reducer:** This is a single reducer that atomically applies all bet resolutions, point-hit/seven-out flags, and wallet updates in one state transition. The resolution array is computed entirely within the thunk (which has access to `ServerCrapsState` for hidden data). The reducer itself is pure — it receives the pre-computed results and applies them to state.
```

#### `CRAPS_ROUND_COMPLETE`

| Property | Value |
|----------|-------|
| `onBegin` | Update session stats. Sync wallet (M1 Sync Point 2). If seven-out: rotate shooter. If point hit: same shooter retains dice. **If `gameChangeRequested` and active come bets exist: run `returnActiveComeeBets` thunk (see below).** Set `craps.roundCompleteReady = true`. |
| `endIf` | `state.craps?.roundCompleteReady === true` |
| `next` | If `gameChangeRequested`: `'GAME_SELECT'`. If seven-out: `'CRAPS_NEW_SHOOTER'`. If point hit (or natural/craps): `'CRAPS_COME_OUT_BETTING'`. |
| `onEnd` | Reset round state (clear bets, roll result, point flags). Preserve Come/Don't Come bets that have established points (these carry over between rounds). |

> **[RC-5 FIX] Game-switch come bet resolution rule:** If the table switches games via `gameChangeRequested` while players have active Come/Don't Come bets with established points, those bets cannot be left in limbo — the game they belong to is ending. **Rule: all active come/don't-come bets with established points are returned to the player's wallet at face value (no resolution, no odds payout, no win/loss).** Any odds behind those come bets are also returned at face value.
>
> This is implemented in the `returnActiveComeBets` thunk, which runs in `CRAPS_ROUND_COMPLETE.onBegin` when `gameChangeRequested === true`:
>
> ```typescript
> async function returnActiveComeBets(ctx: ThunkCtx): Promise<void> {
>   const state = ctx.getState()
>   const comeBets = state.craps?.comeBets ?? []
>   const activeBets = comeBets.filter(b => b.comePoint !== null && b.status === 'active')
>   for (const bet of activeBets) {
>     // Return base bet at face value
>     ctx.dispatch('resolveCrapsComeBet', bet.id, 'returned', bet.amount)
>     // Return odds behind this come bet at face value
>     if (bet.oddsAmount > 0) {
>       ctx.dispatch('returnCrapsComeBetOdds', bet.id, bet.oddsAmount)
>     }
>   }
> }
> ```
>
> The `'returned'` status is added to the existing status union: `status: 'active' | 'won' | 'lost' | 'push' | 'returned'`. The Display shows "Bets returned" for each returned come bet with a neutral (yellow) indicator, not win-green or loss-red. TTS: "Come bets returned. Switching games."

---

## 3. Craps State Shape

```typescript
interface CrapsState {
  /** Current shooter's player ID */
  shooterPlayerId: string

  /** Shooter seat index (for rotation) */
  shooterIndex: number

  /** The established point (null during come-out) */
  point: number | null

  /** Whether the puck is ON (point established) or OFF (come-out) */
  puckOn: boolean

  /** Last roll result */
  lastRollDie1: number
  lastRollDie2: number
  lastRollTotal: number

  /** Roll history for the current shooter's turn (for stats/display) */
  rollHistory: CrapsRollResult[]

  /** All active bets across all players */
  bets: CrapsBet[]

  /** Come bet tracking (each Come/Don't Come can have its own point) */
  comeBets: CrapsComeBet[]

  /** Per-player state */
  players: CrapsPlayerState[]

  /** Round outcome flags */
  sevenOut: boolean
  pointHit: boolean

  /** Phase transition flags (C1 pattern) */
  newShooterReady: boolean
  allComeOutBetsPlaced: boolean
  rollComplete: boolean
  comeOutResolutionComplete: boolean
  allPointBetsPlaced: boolean
  pointResolutionComplete: boolean
  roundCompleteReady: boolean

  /** Configuration */
  config: CrapsConfig
}

interface CrapsRollResult {
  die1: number
  die2: number
  total: number
  rollNumber: number
  isHardway: boolean  // both dice same value (e.g., 4+4 = hard 8)
}

interface CrapsBet {
  id: string
  playerId: string
  type: CrapsBetType
  amount: number
  /** For Place bets: which number (4,5,6,8,9,10) */
  targetNumber?: number
  /** For Odds bets: which bet this is behind */
  parentBetId?: string
  /** Whether this bet is currently "working" (active) */
  working: boolean
  /** Resolution status */
  status: 'active' | 'won' | 'lost' | 'push' | 'returned'
  /** Payout amount (set on resolution) */
  payout: number
}

type CrapsBetType =
  | 'pass_line'
  | 'dont_pass'
  | 'come'
  | 'dont_come'
  | 'place'
  | 'field'
  | 'pass_odds'
  | 'dont_pass_odds'
  | 'come_odds'
  | 'dont_come_odds'

interface CrapsComeBet {
  id: string
  playerId: string
  type: 'come' | 'dont_come'
  amount: number
  /** The Come bet's established point (null if just placed, waiting for next roll) */
  comePoint: number | null
  /** Odds behind this Come bet */
  oddsAmount: number
  status: 'active' | 'won' | 'lost' | 'push'
}

interface CrapsPlayerState {
  playerId: string
  /** Total amount currently at risk on the table */
  totalAtRisk: number
  /** Whether this player has confirmed their bets for the current phase */
  betsConfirmed: boolean
  /** Net result for the current round */
  roundResult: number
}

interface CrapsConfig {
  minBet: number
  maxBet: number
  maxOddsMultiplier: number  // 1x, 2x, 3x, 5x, 10x
  /** Whether Place bets are "on" during come-out rolls (default: off) */
  placeBetsWorkOnComeOut: boolean
}
```

**Relationship to root state:**

The `craps` field on `CasinoGameState` holds this sub-state. Initialised in `CRAPS_NEW_SHOOTER.onBegin`. Cleared on game switch.

```typescript
// Extension to CasinoGameState
interface CasinoGameState {
  // ... existing fields ...
  craps?: CrapsState
}

// Extension to CasinoGame type
type CasinoGame = 'holdem' | 'five_card_draw' | 'blackjack_classic'
  | 'blackjack_competitive' | 'craps' | 'roulette' | 'three_card_poker'
```

---

## 4. Craps Controller UX

### Come-Out Betting Screen

Displayed during `CRAPS_COME_OUT_BETTING`:

**Layout (top to bottom):**
1. **Header:** "COME OUT ROLL" + wallet balance + "Shooter: [Name]"
2. **Quick bet buttons (primary):**
   - "PASS LINE" (green, large) — the default bet, highlighted
   - "DON'T PASS" (red, large) — for the contrarians
3. **Additional bets (collapsible section):**
   - "FIELD" (yellow) — one-roll bet
4. **Chip selector:** Tap preset amounts (10, 25, 50, 100) to set bet size
5. **Confirm button:** "CONFIRM BETS" (large, green)
6. **Timer bar:** 30-second countdown

**Shooter's controller additionally shows:**
- "YOU ARE THE SHOOTER" banner at the top (gold, prominent)
- Pass Line or Don't Pass is required — the confirm button is disabled until one is selected

### Point Phase Betting Screen

Displayed during `CRAPS_POINT_BETTING`:

**Layout:**
1. **Header:** "POINT IS [N]" (large, with the puck icon) + wallet balance
2. **Existing bets summary:** Shows all active bets with amounts
3. **New bet options:**
   - "COME" (green) — personal pass line for next roll
   - "DON'T COME" (red)
   - "PLACE [4]" "PLACE [5]" "PLACE [6]" "PLACE [8]" "PLACE [9]" "PLACE [10]" — grid of 6 buttons
   - "FIELD" (yellow) — one-roll
   - "ADD ODDS" — appears next to existing Pass/Don't Pass and Come bets with established points
4. **Chip selector + confirm button + timer**

### Shooter's Roll Screen

Displayed during `CRAPS_COME_OUT_ROLL` and `CRAPS_POINT_ROLL` when this player is the shooter:

**Layout:**
1. **Header:** "YOUR ROLL" / "ROLL FOR THE POINT: [N]"
2. **Large "ROLL!" button** — centred, pulsing, impossible to miss. Takes up 40% of the screen.
3. **Bet summary** below the button — shows what's riding on this roll
4. Voice prompt: "Say 'roll' or tap to roll the dice!"

**Non-shooter's view during roll:**
1. "Waiting for [Shooter] to roll..."
2. Active bets summary
3. Point indicator

### Roll Result View

After the dice are rolled (all players see this):
1. **Dice result:** Large display of both dice faces + total
2. **Outcome text:** "SEVEN! WINNER!" / "POINT IS 8" / "SEVEN OUT!" etc.
3. **Bet results:** Each of the player's bets shows +/- chip amounts with green/red colouring
4. **Net result:** "You won 150 chips" / "You lost 75 chips"

---

## 5. Craps Display & 3D

### Table Layout

The TV displays a **simplified craps table** viewed from above at a slight angle:

```
+----------------------------------------------------------+
|                     CRAPS TABLE                            |
|  +----------------------------------------------------+  |
|  |           [PASS LINE - curved along edge]           |  |
|  |  [COME]                                             |  |
|  |        [4] [5] [SIX] [8] [NINE] [10]  <- Place    |  |
|  |                                                      |  |
|  |              [FIELD: 2,3,4,9,10,11,12]              |  |
|  |                                                      |  |
|  |           [DON'T PASS BAR]                          |  |
|  |  [DON'T COME]                                       |  |
|  +----------------------------------------------------+  |
|     [P1 chips]  [P2 chips]  [P3 chips]  [P4 chips]      |
|                                                            |
|     [PUCK: OFF/ON point]        [DICE]   [STICKMAN]      |
+----------------------------------------------------------+
```

**Key visual elements:**
- **The puck:** Large ON/OFF indicator. When ON, displays the point number prominently. Glows.
- **Player chip stacks:** Each player's bets are colour-coded (Player 1 = blue, P2 = red, P3 = green, P4 = gold). Chips physically sit on the bet areas of the table.
- **Dice:** 3D rendered dice with physics simulation. This is THE money shot.
- **Stickman character:** The dealer/stickman stands at the centre of the table.

### Dice Roll Animation — THE SPECTACULAR MOMENT

The dice roll is the single most important animation in the entire craps experience. It must feel **visceral, physical, and electric.**

**Roll sequence:**
1. **Wind-up (500ms):** Camera pushes in slightly. Ambient sound dips. The shooter's chips glow.
2. **Throw (300ms):** Dice launch from the shooter's end of the table with a subtle arc. Physics engine calculates tumble, bounce, and spin.
3. **Bounce & tumble (800ms-1200ms):** Dice hit the far wall (the "backboard"), bounce back, tumble across the felt. Real physics — no canned animation. The dice must feel weighty and unpredictable.
4. **Settle (400ms):** Dice come to rest. Camera zooms in on the result.
5. **Result flash (300ms):** The dice faces illuminate. The total appears above them in large text.
6. **Crowd reaction (500ms):** Based on outcome — chips fly to winners, losers' chips fade. Player name plates flash green/red.

**Total animation time: ~2.5-3.5 seconds** — fast enough to keep pace, slow enough to build tension.

**Camera behaviour during the roll:**
- Camera follows the dice from throw to settle with a smooth tracking shot
- On a dramatic outcome (seven-out, point hit, natural), camera lingers on the dice with a slight slow-motion effect
- After settling, camera pulls back to the full table view showing bet resolution

### Bet Placement Visualisation

When a player places a bet on their controller:
1. A chip in the player's colour flies from their chip stack to the bet area on the table
2. Chip "clinks" onto the felt with a satisfying sound
3. The bet amount appears as floating text above the chip
4. Multiple players' chips stack in the same area with slight offsets

### Point Puck Animation

When the point is established:
1. The puck flips from "OFF" (black side) to "ON" (white side) with a 3D rotation
2. The puck slides to the point number's position on the table
3. The point number on the puck glows

### Player Seat Layout

Players are positioned along the bottom of the table:
```
[P1 rail]  [P2 rail]  [P3 rail]  [P4 rail]
```
Each player has:
- Name plate
- Chip rack showing total chips
- Active bet indicators (mini icons showing which bets are active)
- Shooter indicator (golden dice icon next to the current shooter)

---

## 6. Craps Voice Commands

### Craps-Specific Commands

| Voice Command | Intent | Phase | Notes |
|---------------|--------|-------|-------|
| "pass line" / "pass" | `craps_pass_line` | CRAPS_COME_OUT_BETTING | |
| "don't pass" / "against" | `craps_dont_pass` | CRAPS_COME_OUT_BETTING | |
| "come bet" / "come" | `craps_come` | CRAPS_POINT_BETTING | |
| "don't come" | `craps_dont_come` | CRAPS_POINT_BETTING | |
| "place the [number]" / "place [number]" | `craps_place` | CRAPS_POINT_BETTING | Numbers 4,5,6,8,9,10 |
| "field" / "field bet" | `craps_field` | Any betting phase | |
| "odds" / "add odds" / "back it up" | `craps_odds` | CRAPS_POINT_BETTING | Adds odds behind existing bet |
| "roll" / "roll the dice" / "let 'em fly" | `craps_roll` | CRAPS_*_ROLL (shooter only) | |
| "bet [amount]" | `craps_set_amount` | Any betting phase | Sets the chip amount for next bet |
| "no bet" / "pass" / "skip" | `craps_no_bet` | Any betting phase | Confirms no additional bets |
| "confirm" / "done betting" | `craps_confirm_bets` | Any betting phase | Locks in all placed bets |

### Slot Map (Craps Phases)

```typescript
const crapsSlotMap = [
  'pass', 'line', 'dont', 'come', 'field',
  'place', 'four', 'five', 'six', 'eight', 'nine', 'ten',
  'odds', 'back', 'roll', 'dice', 'bet',
  'confirm', 'done', 'no bet', 'skip',
]
```

---

## 7. Craps Video Integration

### Phase-by-Phase Video Triggers

| Phase | Trigger Event | Asset Key | Mode | Duration | Blocks | Skippable | Priority | Notes |
|-------|--------------|-----------|------|----------|--------|-----------|----------|-------|
| `CRAPS_NEW_SHOOTER` | New shooter assigned | `craps_new_shooter` | overlay | 2,000ms | No | No | low | "[Player] picks up the dice!" with spotlight effect on shooter |
| `CRAPS_COME_OUT_ROLL` | Dice roll begins | `craps_dice_throw` | overlay | 1,500ms | No | No | low | Cinematic dice-in-hand close-up before the throw |
| `CRAPS_COME_OUT_RESOLUTION` | Natural (7/11) | `craps_natural_winner` | overlay | 3,000ms | No | No | medium | "WINNER!" — chips cascade, crowd cheers, gold sparkle |
| `CRAPS_COME_OUT_RESOLUTION` | Craps (2/3/12) | `craps_craps_out` | overlay | 2,500ms | No | No | medium | "CRAPS!" — ominous tone, red flash, commiseration |
| `CRAPS_POINT_RESOLUTION` | Point established (first time) | `craps_point_set` | overlay | 2,500ms | No | No | medium | Puck flips to ON. "THE POINT IS [N]!" — dramatic announcement with spotlight on puck |
| `CRAPS_POINT_RESOLUTION` | Point hit! | `craps_point_hit` | full_screen | 4,000ms | Yes | Yes (after 2s) | high | THIS IS THE BIG MOMENT. Full-screen celebration. Confetti, neon, dice highlight, crowd roar. The shooter just won everyone money. |
| `CRAPS_POINT_RESOLUTION` | Seven-out | `craps_seven_out` | full_screen | 3,500ms | Yes | Yes (after 1s) | high | Devastating. Red lighting, dramatic music drop, sympathetic dealer reaction. The table just lost. |
| `CRAPS_POINT_RESOLUTION` | Hard way hit (e.g., hard 8 = 4+4) | `craps_hardway` | overlay | 2,000ms | No | No | medium | "HARD [N]!" — dramatic hit effect for the hardway number |
| `CRAPS_ROUND_COMPLETE` | Player wins >= 500 chips in round | `craps_big_winner` | overlay | 3,000ms | No | No | high | Big winner celebration — chips rain on the winning player |
| `CRAPS_ROUND_COMPLETE` | Total table wins >= 1000 chips | `craps_table_on_fire` | full_screen | 4,000ms | Yes | Yes (after 2s) | critical | "TABLE'S ON FIRE!" — communal celebration, everyone winning together |
| `CRAPS_POINT_ROLL` | Shooter's 10th+ consecutive roll without seven-out | `craps_hot_shooter` | overlay | 2,500ms | No | No | high | "HOT SHOOTER!" — the shooter is on a legendary run |

### Craps Ambient

| Asset Key | Mode | When Active | Description |
|-----------|------|-------------|-------------|
| `craps_ambient_table` | background | During all Craps phases | Lively craps table energy — crowd murmur, occasional distant cheers, chip sounds, the background buzz of a hot table. More energetic than poker ambience. |

### Why Craps Video Matters

The craps table is the loudest, most energetic spot in any casino. Our video triggers must capture that energy:
- **Come-out naturals:** The table erupts. Everyone on Pass Line wins. This should feel like a sports highlight.
- **Point hit:** This is the payoff after multiple rolls of tension. The longer the point phase lasted, the bigger the release.
- **Seven-out:** Devastating for the table. The Don't Pass bettors quietly collect while everyone else groans. The emotional whiplash is the drama.
- **Hot shooter streak:** A shooter who keeps rolling without sevening out becomes a folk hero. The "hot shooter" overlay builds this narrative.

### Estimated Craps Video Assets: 12

| Category | Count |
|----------|-------|
| Gameplay overlays (new shooter, dice throw, point set, hardway) | 4 |
| Outcome celebrations (natural, craps, point hit, seven-out) | 4 |
| Big moment full-screens (point hit, seven-out, table on fire) | 3 |
| Ambient loop | 1 |
| **Total** | **12** |

---

## 8. Craps Dealer Characters

Craps uses a "stickman" — the dealer who calls the action and handles the dice. This character is more of a hype man than a traditional card dealer.

### "Lucky" Luciano (Stickman)

- **Personality:** High-energy carnival barker meets Vegas showman. Fast-talking, rhyming, rhythmic. The stickman IS the craps table energy.
- **Voice:** Fast-paced tenor with a staccato rhythm. Classic craps calls with flair.
- **Catchphrase:** "New shooter coming out!"

**Voice line categories:**

| Category | Example Lines |
|----------|--------------|
| New shooter | "New shooter coming out! Give 'em room!" / "[Player], step up! The dice are yours!" |
| Come-out natural 7 | "SEVEN! Winner winner! Front line pays!" / "Lucky seven! Pass line takes it!" |
| Come-out natural 11 | "Yo-leven! Pass line winner!" |
| Come-out craps 2 | "Aces! Snake eyes! Line away!" / "Two craps! Tough break!" |
| Come-out craps 3 | "Three craps! Ace-deuce!" |
| Come-out craps 12 | "Twelve! Box cars! Don't pass bars!" |
| Point established | "Point is [N]! Mark it!" / "[N] is the point! Odds are open!" |
| Point hit | "[N]! WINNER! Pay the line!" / "There it is! [N]! The shooter does it!" |
| Seven-out | "Seven out! Line away! Pay the don'ts!" / "Seven! New shooter!" |
| Field win | "Field's good! Pay the field!" |
| Hardway | "Hard [N]! Both dice showing [N/2]!" |
| Hot streak | "The shooter's on FIRE! Who's riding this wave?" |

### "Diamond" Dolores (Stickman)

- **Personality:** Smooth, cool, slightly sardonic. She's seen a thousand shooters come and go. Calls the action with effortless precision and the occasional wry observation.
- **Voice:** Warm contralto, unhurried delivery, dry wit between calls.
- **Catchphrase:** "The dice don't lie."

**Voice line categories:**

| Category | Example Lines |
|----------|--------------|
| New shooter | "Fresh dice. [Player], they're all yours." / "New shooter on the line." |
| Come-out natural 7 | "Seven, natural. Pass line collects." |
| Come-out natural 11 | "Yo. Pass line winner." |
| Come-out craps | "Craps. Line away." / "That's a two. The dice are feeling spicy." |
| Point established | "Point's [N]. Place your bets accordingly." |
| Point hit | "[N]. There's your point. Pay the front." / "And that's how it's done. [N]." |
| Seven-out | "Seven out. Don'ts collect. Next shooter." / "And there it is. Seven. The dice always come home eventually." |
| Hot streak | "Ten rolls deep. The table's starting to believe." |
| Big loss | "The table gives, and the table takes. That's the game." |

### Craps Dealer Constants

```typescript
export const CRAPS_DEALER_CHARACTERS = ['lucky_luciano', 'diamond_dolores'] as const
export type CrapsDealerCharacter = typeof CRAPS_DEALER_CHARACTERS[number]
```

---

# II. Roulette

## 9. Roulette Rules Specification

### Overview

Roulette is visually the most spectacular game in any casino. A ball spinning on a wheel, bouncing between numbers, slowing to a crawl — the entire table holds its breath. On a big TV screen, this moment is pure cinema.

We use **European (single-zero) roulette** for better player odds (2.7% house edge vs 5.26% for American double-zero). This is the standard in most non-US casinos and is more player-friendly for a social game.

### The Wheel

37 numbered pockets: 0-36.

| Numbers | Colour |
|---------|--------|
| 0 | Green |
| 1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36 | Red |
| 2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35 | Black |

### Bet Types

#### Inside Bets (on specific numbers)

| Bet | Description | Payout |
|-----|-------------|--------|
| **Straight Up** | Single number | 35:1 |
| **Split** | Two adjacent numbers (horizontal or vertical) | 17:1 |
| **Street** | Row of three numbers (e.g., 1-2-3) | 11:1 |
| **Corner** | Four numbers sharing a corner (e.g., 1-2-4-5) | 8:1 |
| **Six Line** | Two adjacent streets (6 numbers, e.g., 1-2-3-4-5-6) | 5:1 |

#### Outside Bets (on groups)

| Bet | Description | Payout |
|-----|-------------|--------|
| **Red / Black** | Colour of winning number | 1:1 |
| **Odd / Even** | Odd or even winning number | 1:1 |
| **High / Low** | 1-18 (Low) or 19-36 (High) | 1:1 |
| **Dozen** | 1st 12 (1-12), 2nd 12 (13-24), 3rd 12 (25-36) | 2:1 |
| **Column** | One of three vertical columns on the betting grid | 2:1 |

**Zero rule:** All outside bets (1:1 and 2:1 payouts) lose when the ball lands on 0. The "La Partage" rule (return half on even-money bets when 0 hits) is deferred to v2 as a configurable option.

### Bet Limits

| Constant | Default | Range |
|----------|---------|-------|
| `ROULETTE_MIN_BET` | 5 | 1-50 |
| `ROULETTE_MAX_INSIDE_BET` | 100 | 50-1,000 |
| `ROULETTE_MAX_OUTSIDE_BET` | 500 | 100-5,000 |
| `ROULETTE_MAX_TOTAL_BET` | 1,000 | 500-10,000 |

### Multiple Players, Same Numbers

Multiple players can bet on the same number. If it hits, ALL players with bets on that number win independently. This creates a shared celebration moment — "We BOTH had 17!" — which is perfect for the party model.

---

### 9.1 Roulette Tutorial (Guided First Play)

> **[PM-3 FIX]** 30-second guided first-play tutorial for new Roulette players.

**Trigger:** Same as Craps tutorial — first time playing Roulette in a session.

**Tutorial flow (on the controller, 3 steps, ~25 seconds total):**

| Step | Controller Display | Duration | Auto-advance? |
|------|-------------------|----------|---------------|
| 1 | "Welcome to Roulette! Pick a number, a colour, or a range. The wheel decides." | 5s | Yes |
| 2 | "Try tapping **RED** or **BLACK** for an easy bet. You win if the ball lands on your colour!" [Red and Black buttons pulse] | 10s | After player taps or timeout |
| 3 | "Feeling lucky? Tap a **number** for a straight-up bet — it pays **35 to 1**! Place your bets, then watch the wheel." [SKIP TUTORIAL button visible from step 1] | 8s | Yes |

Roulette needs less tutorial than Craps — the concept is almost universally understood. The tutorial's job is to show the controller layout, not teach the game.

---

## 10. Roulette Phase Flow

```
GAME_SELECT --> ROULETTE_PLACE_BETS --> ROULETTE_NO_MORE_BETS
  --> ROULETTE_SPIN --> ROULETTE_RESULT --> ROULETTE_PAYOUT
  --> ROULETTE_ROUND_COMPLETE --> loop
```

### Phase Definitions

#### `ROULETTE_PLACE_BETS`

| Property | Value |
|----------|-------|
| `onBegin` | Initialise `roulette` sub-state if first round. Clear previous round bets and results. Enable betting UI on all controllers. Display betting board on TV. Fund game-local from wallet if first round (M1 Sync Point 1). Start betting timer: `ROULETTE_BET_TIMEOUT_MS = 45_000` (longer than other games — roulette betting is more complex). TTS: "Place your bets!" |
| `endIf` | `state.roulette?.allBetsPlaced === true` |
| `next` | `'ROULETTE_NO_MORE_BETS'` |
| `onEnd` | Lock bets. Deduct from wallets. |

**Bet placement completion:** All players must either place at least one bet or confirm "no bet." Timer expiry auto-confirms. A "Last bets!" warning at 10 seconds remaining.

#### `ROULETTE_NO_MORE_BETS`

| Property | Value |
|----------|-------|
| `onBegin` | TTS: "No more bets!" Disable betting on all controllers. Brief pause (1.5s) for dramatic effect. Highlight all placed bets on the TV display. Set `roulette.bettingClosed = true`. |
| `endIf` | `state.roulette?.bettingClosed === true` |
| `next` | `'ROULETTE_SPIN'` |
| `onEnd` | — |

#### `ROULETTE_SPIN`

| Property | Value |
|----------|-------|
| `onBegin` | Generate winning number server-side (stored in `ServerGameState.roulette.winningNumber`). Dispatch `setRouletteWinningNumber` with the result. Trigger the wheel spin animation on Display. TTS: "The wheel spins!" The phase waits for the Display to signal animation completion (client-driven) OR a server hard timeout (fallback). |
| `endIf` | `state.roulette?.spinComplete === true` |
| `next` | `'ROULETTE_RESULT'` |
| `onEnd` | — |

> **[RC-6 FIX]** Spin timing uses a **client-driven completion signal with server hard timeout**, following the same pattern as video playback (V-CRITICAL-3 from the v1 architecture review). The server does NOT rely solely on `setTimeout(6000)` because:
>
> 1. JavaScript `setTimeout` is imprecise on a busy Node.js event loop (could fire at 6.1s-6.3s).
> 2. The Display's animation clock is frame-rate-dependent (Fire TV Stick at 30fps vs Fire TV Cube at 60fps).
> 3. If the server fires `spinComplete` before the Display finishes the ball-landing sequence, the result is revealed while the ball is still visibly bouncing — immersion-breaking.
>
> **Completion protocol:**
> 1. `ROULETTE_SPIN.onBegin` dispatches `setRouletteWinningNumber` and schedules the hard timeout: `ctx.scheduler.upsertTimeout({ name: 'roulette:spin-timeout', delayMs: ROULETTE_SPIN_HARD_TIMEOUT_MS, mode: 'hold', dispatch: { kind: 'thunk', name: 'forceCompleteRouletteSpin' } })`
> 2. The Display plays the spin animation. When the ball settles into the pocket and the landing animation completes, the Display dispatches: `completeRouletteSpin` (a root-scoped thunk).
> 3. `completeRouletteSpin` thunk: cancels the hard timeout, sets `roulette.spinComplete = true`.
> 4. `forceCompleteRouletteSpin` thunk (fallback): fires if the Display never dispatches completion (e.g., Display disconnected, animation froze). Sets `roulette.spinComplete = true` unconditionally.
>
> **Timing constants:**
>
> | Constant | Value | Notes |
> |----------|-------|-------|
> | `ROULETTE_SPIN_ANIMATION_TARGET_MS` | 6,000 | Target animation duration on Display. Not a hard contract — the animation finishes when it finishes. |
> | `ROULETTE_SPIN_HARD_TIMEOUT_MS` | 8,000 | Server fallback. 2 seconds of slack beyond the target animation. If the Display hasn't reported completion by 8s, force it. |

**New thunks:**

| Thunk | Scope | Description |
|-------|-------|-------------|
| `completeRouletteSpin` | **root** (dispatched by Display client) | Cancels hard timeout, sets `spinComplete = true`. Only accepted during `ROULETTE_SPIN` phase. |
| `forceCompleteRouletteSpin` | **ROULETTE_SPIN** | Fallback: unconditionally sets `spinComplete = true`. Fired by scheduler if Display never reports. |

#### `ROULETTE_RESULT`

| Property | Value |
|----------|-------|
| `onBegin` | Announce the winning number: TTS: "[N], [colour]!" Display highlights the winning number on the board. Mark winning/losing bets. Brief display pause (2s) for players to absorb the result. Set `roulette.resultAnnounced = true`. |
| `endIf` | `state.roulette?.resultAnnounced === true` |
| `next` | `'ROULETTE_PAYOUT'` |
| `onEnd` | — |

#### `ROULETTE_PAYOUT`

| Property | Value |
|----------|-------|
| `onBegin` | Calculate payouts for all winning bets across all players. Update wallets. Display payout amounts per player. TTS announces big wins: "Straight up! [Player] wins [amount]!" Set `roulette.payoutComplete = true`. |
| `endIf` | `state.roulette?.payoutComplete === true` |
| `next` | `'ROULETTE_ROUND_COMPLETE'` |
| `onEnd` | — |

#### `ROULETTE_ROUND_COMPLETE`

| Property | Value |
|----------|-------|
| `onBegin` | Update session stats. Add winning number to history display. Sync wallet (M1 Sync Point 2). Set `roulette.roundCompleteReady = true`. |
| `endIf` | `state.roulette?.roundCompleteReady === true` |
| `next` | If `gameChangeRequested`: `'GAME_SELECT'`. Otherwise: `'ROULETTE_PLACE_BETS'`. |
| `onEnd` | — |

---

## 11. Roulette State Shape

```typescript
interface RouletteState {
  /** Winning number for the current round (null until spin) */
  winningNumber: number | null

  /** Colour of the winning number */
  winningColour: 'red' | 'black' | 'green' | null

  /** All bets placed this round */
  bets: RouletteBet[]

  /** Per-player state */
  players: RoulettePlayerState[]

  /** Recent winning numbers (last 20 — for the history board) */
  history: RouletteHistoryEntry[]

  /** Spin animation state */
  spinState: 'idle' | 'spinning' | 'slowing' | 'stopped'

  /** [M3] Near-miss data: players whose straight-up bets were adjacent to the winning number on the wheel */
  nearMisses: { playerId: string; betNumber: number }[]

  /** Phase transition flags (C1 pattern) */
  allBetsPlaced: boolean
  bettingClosed: boolean
  spinComplete: boolean
  resultAnnounced: boolean
  payoutComplete: boolean
  roundCompleteReady: boolean

  /** Configuration */
  config: RouletteConfig
}

interface RouletteBet {
  id: string
  playerId: string
  type: RouletteBetType
  amount: number
  /** For inside bets: which numbers are covered */
  numbers: number[]
  /** Resolution */
  status: 'active' | 'won' | 'lost'
  payout: number
}

type RouletteBetType =
  | 'straight_up'
  | 'split'
  | 'street'
  | 'corner'
  | 'six_line'
  | 'red'
  | 'black'
  | 'odd'
  | 'even'
  | 'high'
  | 'low'
  | 'dozen_1'
  | 'dozen_2'
  | 'dozen_3'
  | 'column_1'
  | 'column_2'
  | 'column_3'

interface RoulettePlayerState {
  playerId: string
  /** Total amount bet this round */
  totalBet: number
  /** Total payout this round */
  totalPayout: number
  /** Net result this round */
  roundResult: number
  /** Whether bets are confirmed */
  betsConfirmed: boolean
  /** Favourite bets (saved from previous rounds, quick re-bet) */
  favouriteBets?: RouletteBet[]
  /** [RC-2] Player's favourite numbers for Quick Bets tab (max 5, persists per session) */
  favouriteNumbers: number[]
}

interface RouletteHistoryEntry {
  roundNumber: number
  number: number
  colour: 'red' | 'black' | 'green'
}

interface RouletteConfig {
  minBet: number
  maxInsideBet: number
  maxOutsideBet: number
  maxTotalBet: number
  /** La Partage rule: return half of even-money bets on 0 (v2) */
  laPartage: boolean
}
```

**Server-side state extension:**

```typescript
interface ServerRouletteState {
  /** Pre-determined winning number (set before spin animation begins) */
  winningNumber: number
}
```

---

## 12. Roulette Controller UX

> **[RC-2 FIX]** The v1.0 design used a single scrollable 37-number grid. The principal engineer review correctly identifies this as unusable on a 6-inch phone: the minimum 44px touch targets produce 830px+ of scrollable content, split/corner bet border-tapping is below minimum touch target size (10-15px hit zones), and the scroll-to-bet-to-scroll workflow is far too slow for roulette's pace. The redesigned controller uses a **two-tab layout** that puts 80%+ of casual bets on a single non-scrolling screen.

### Two-Tab Betting Layout

**Tab bar (sticky, always visible at top):**
```
+-------------------------------------------+
|  Wallet: $8,450  |  Round: 12             |
|  Chip: [$5] [$10] [$25] [$50]            |
+-------------------------------------------+
|  [ QUICK BETS ]  |  [ NUMBER GRID ]       |
+-------------------------------------------+
```

#### Tab 1: Quick Bets (default view)

This is the **default tab**. Covers 80%+ of casual roulette bets with zero scrolling. All buttons meet minimum 48px touch target (Material Design).

```
+-------------------------------------------+
|                                           |
|   [  RED  ]         [  BLACK  ]           |
|   (large, red bg)   (large, black bg)     |
|                                           |
|   [  ODD  ]         [  EVEN  ]            |
|                                           |
|   [ 1-18 LOW ]      [ 19-36 HIGH ]       |
|                                           |
+-------------------------------------------+
|   [1st DOZEN]  [2nd DOZEN]  [3rd DOZEN]  |
|                                           |
|   [Column 1]  [Column 2]  [Column 3]     |
|                                           |
+-------------------------------------------+
|  MY NUMBERS (tap to bet, long-press edit) |
|  [ 7 ]  [ 17 ]  [ 23 ]  [ + ]           |
+-------------------------------------------+
|  [ REPEAT LAST ] (large, prominent)       |
+-------------------------------------------+
|  Current bets: $150                       |
|  [CONFIRM BETS]     [CLEAR ALL]          |
+-------------------------------------------+
```

**Key design decisions:**

1. **Outside bets are large, tappable buttons.** Red/Black are the biggest (full-width, ~60px tall). Odd/Even and High/Low are the same size. Dozens and Columns are a row of three. No scrolling needed.

2. **"My Numbers" row:** Players can pre-set 3-5 favourite numbers as quick-access buttons. Default: empty. The `[+]` button opens a number picker modal (grid of 0-36). Once set, favourite numbers persist across rounds (stored in `RoulettePlayerState.favouriteNumbers`). This covers the "I always bet 17" casual pattern without requiring the full number grid.

3. **"REPEAT LAST" is the primary action after round 1.** After the first round, this button is promoted to the most prominent position (top of the tab, full-width, pulsing green). Market research shows 60%+ of roulette players repeat their bets. This single button eliminates all interaction for the majority case.

4. **Voice-first for specific numbers.** The Quick Bets tab has a microphone hint: "Say a number to bet it" at the bottom. Voice commands ("number 17", "split 17 and 20") are dramatically faster than navigating to the Number Grid tab for inside bets.

#### Tab 2: Number Grid (advanced view)

For players who want to place inside bets directly on the grid. This tab is **secondary** — most players will never need it.

```
+-------------------------------------------+
|  [  0 - GREEN  ]                          |
+-------------------------------------------+
|  [ 1]R  [ 2]B  [ 3]R    |  [1st 12]     |
|  [ 4]B  [ 5]R  [ 6]B    |               |
|  [ 7]R  [ 8]B  [ 9]R    |               |
|  [10]B  [11]B  [12]R    |               |
+-------------------------------------------+
|  [13]B  [14]R  [15]B    |  [2nd 12]     |
|  [16]R  [17]B  [18]R    |               |
|  [19]R  [20]B  [21]R    |               |
|  [22]B  [23]R  [24]B    |               |
+-------------------------------------------+
|  [25]R  [26]B  [27]R    |  [3rd 12]     |
|  [28]B  [29]B  [30]R    |               |
|  [31]B  [32]R  [33]B    |               |
|  [34]R  [35]B  [36]R    |               |
+-------------------------------------------+
|  Current bets: $150                       |
|  [CONFIRM BETS]     [CLEAR ALL]          |
+-------------------------------------------+
```

**Interaction model (Number Grid tab):**
1. Chip selector is sticky at the top (shared across tabs)
2. Tap a number cell to place a straight-up bet
3. Tap the same number again to add another chip
4. Long-press to remove a chip from a number
5. **Split/Corner/Street bets:** NOT available via direct grid tap (the hit zones are too small on a phone). Instead, tap a number and a context menu appears: "Straight Up $5" / "Split with [adjacent numbers]" / "Street [row]" / "Corner [available corners]". This trades one extra tap for dramatically better accuracy.
6. Confirm/Clear buttons are sticky at the bottom

**State impact (favourite numbers):**

```typescript
interface RoulettePlayerState {
  // ... existing fields ...
  /** Player's favourite numbers for Quick Bets tab (max 5, persists per session) */
  favouriteNumbers: number[]
}
```

### Result Display (Controller)

After the spin:
1. Winning number displayed large with colour background
2. Each of the player's bets shows WIN/LOSE with chip amounts
3. Net result: "+$175" (green) or "-$50" (red)

---

## 13. Roulette Display & 3D

### The Wheel — THE Visual Centrepiece

The roulette wheel on the TV is the most visually spectacular element in the entire Weekend Casino application. This is not negotiable.

**Wheel rendering:**
- Full 3D European roulette wheel with all 37 numbered pockets
- Polished wooden bowl, chrome deflectors, brass frets between pockets
- Numbers alternate red/black with green zero
- The wheel sits at the top-centre of the screen, large (40% of viewport)

**Spin animation — 6 seconds of pure cinema:**

1. **Launch (0-500ms):** The croupier's hand flicks the ball into the wheel. Ball enters from the outer track. Wheel rotates in the opposite direction.
2. **Fast spin (500ms-2500ms):** Ball whips around the outer track at high speed. The wheel spins beneath. Camera holds a medium shot showing the full wheel.
3. **Deceleration (2500ms-4500ms):** Ball slows. Starts bouncing off the diamond-shaped deflectors on the rim. Each bounce is physics-simulated and sounds crisp. Camera begins a slow push-in.
4. **Dramatic slowdown (4500ms-5500ms):** Ball drops into the inner ring of pockets. Bounces between 2-3 pockets. Camera is now in tight on the wheel. Audio cuts to near-silence except for the clicking of the ball between pockets.
5. **Landing (5500ms-6000ms):** Ball settles into the winning pocket. Camera zooms to the result. The winning number illuminates. A beat of silence — then the reaction.

**This sequence must be smooth, physically convincing, and mesmerising.** If someone walks into the room during a roulette spin and doesn't stop to watch, we've failed.

### Table Layout (Around the Wheel)

```
+----------------------------------------------------------+
|                                                            |
|              +-----------------------+                     |
|              |                       |                     |
|              |    [ROULETTE WHEEL]   |                     |
|              |                       |                     |
|              +-----------------------+                     |
|                                                            |
|  [BETTING BOARD - simplified layout]                      |
|  Shows all placed bets with player-colour-coded chips     |
|                                                            |
|  [P1]$150   [P2]$200   [P3]$75   [P4]$325               |
|                                                            |
|  [HISTORY BOARD: last 10 numbers with colours]            |
|  [17R] [0G] [23R] [8B] [31B] [14R] [2B] [36R] [19R] [5R]|
|                                                            |
|  [CROUPIER / DEALER CHARACTER]                            |
+----------------------------------------------------------+
```

**Betting board on TV:** Shows a condensed version of the betting grid with all players' chips visible. Each player's chips are a distinct colour. When a bet resolves, winning chips glow and losing chips fade/shatter.

**History board:** The last 10-20 winning numbers displayed as coloured circles (red/black/green) at the bottom of the screen. Classic "scoreboard" that roulette players obsess over.

### Post-Spin Resolution Animation

1. Winning number illuminates on both the wheel and the betting board
2. All bets on losing numbers fade to grey and dissolve (0.5s)
3. All bets on winning numbers/areas glow and payout chips fly from the centre to the winning players' chip racks
4. Big wins (straight-up hit) get a special celebration: the winning number on the wheel pulses with light, chips cascade

---

## 14. Roulette Voice Commands

### Roulette-Specific Commands

| Voice Command | Intent | Phase | Notes |
|---------------|--------|-------|-------|
| "red" / "on red" | `roulette_red` | ROULETTE_PLACE_BETS | Places current chip on red |
| "black" / "on black" | `roulette_black` | ROULETTE_PLACE_BETS | Places current chip on black |
| "number [N]" / "[N]" / "straight up [N]" | `roulette_straight` | ROULETTE_PLACE_BETS | Straight-up bet on number N |
| "odd" / "even" | `roulette_odd_even` | ROULETTE_PLACE_BETS | |
| "high" / "low" / "1 to 18" / "19 to 36" | `roulette_high_low` | ROULETTE_PLACE_BETS | |
| "first dozen" / "second dozen" / "third dozen" | `roulette_dozen` | ROULETTE_PLACE_BETS | |
| "split [N] and [N]" | `roulette_split` | ROULETTE_PLACE_BETS | Split bet |
| "repeat" / "same again" / "repeat last" | `roulette_repeat` | ROULETTE_PLACE_BETS | Re-place all bets from previous round |
| "clear" / "clear all" | `roulette_clear` | ROULETTE_PLACE_BETS | Remove all bets |
| "confirm" / "done" / "that's it" | `roulette_confirm` | ROULETTE_PLACE_BETS | Lock in bets |
| "no bet" / "skip" | `roulette_no_bet` | ROULETTE_PLACE_BETS | Skip this round |

### Slot Map

```typescript
const rouletteSlotMap = [
  'red', 'black', 'odd', 'even', 'high', 'low',
  'number', 'straight', 'split', 'corner', 'street',
  'dozen', 'first', 'second', 'third', 'column',
  'zero', 'green',
  'repeat', 'same', 'again', 'clear', 'confirm', 'done',
  'no bet', 'skip',
  // Numbers 0-36 are handled by the number parser, not the slot map
]
```

---

## 15. Roulette Video Integration

### Phase-by-Phase Video Triggers

| Phase | Trigger Event | Asset Key | Mode | Duration | Blocks | Skippable | Priority | Notes |
|-------|--------------|-----------|------|----------|--------|-----------|----------|-------|
| `ROULETTE_PLACE_BETS` | Round begins | `roulette_place_bets` | overlay | 1,500ms | No | No | low | "Place Your Bets!" with chips scattering visual |
| `ROULETTE_NO_MORE_BETS` | Betting closes | `roulette_no_more_bets` | overlay | 1,500ms | No | No | low | "No More Bets!" — dramatic hand wave, bets lock |
| `ROULETTE_SPIN` | THE SPIN | `roulette_the_spin` | overlay | 2,000ms | No | No | medium | Overlay that enhances the wheel spin — light trails, dramatic camera angles. Plays UNDER the wheel animation, not replacing it. |
| `ROULETTE_RESULT` | Ball lands on 0 (green) | `roulette_zero` | overlay | 3,000ms | No | No | high | "ZERO!" — green flash, dramatic. Everyone on outside bets loses. |
| `ROULETTE_PAYOUT` | Straight-up hit (35:1) | `roulette_straight_up_hit` | full_screen | 5,000ms | Yes | Yes (after 2s) | critical | THE BIG MOMENT. 35:1 payout. Full-screen neon celebration, chip avalanche, dramatic music. This is the roulette equivalent of a royal flush. |
| `ROULETTE_PAYOUT` | Multiple players win on same number | `roulette_shared_win` | overlay | 3,000ms | No | No | high | "SHARED WIN!" — both players' names highlighted, communal celebration |
| `ROULETTE_PAYOUT` | Player wins >= 500 chips | `roulette_big_win` | overlay | 3,000ms | No | No | high | Big win celebration overlay |
| `ROULETTE_PAYOUT` | Near miss (ball bounced out of winning pocket) | `roulette_near_miss` | overlay | 2,000ms | No | No | medium | "SO CLOSE!" — agonising near-miss replay. The ball almost landed on a player's number. Devastating. Addictive. |
| `ROULETTE_ROUND_COMPLETE` | Same number hits twice in a row | `roulette_repeat_number` | overlay | 2,500ms | No | No | medium | "IT HIT AGAIN!" — double hit surprise |
| `ROULETTE_ROUND_COMPLETE` | 3+ reds/blacks in a row (streak) | `roulette_colour_streak` | overlay | 2,000ms | No | No | low | "[N] [colours] in a row!" — streak notification for pattern watchers |

### Roulette Ambient

| Asset Key | Mode | When Active | Description |
|-----------|------|-------------|-------------|
| `roulette_ambient_table` | background | During all Roulette phases | Elegant European casino atmosphere — crystal chandeliers, soft gold lighting, muted conversation, the occasional distant clink of champagne glasses. More refined than the craps table energy. |

### Near-Miss Detection (Server-Side)

> **[M3 FIX]** The `roulette_near_miss` video trigger requires server-side near-miss detection. Since the server determines the winning number before the animation, the "near miss" is calculated using a **wheel-layout adjacency map** — if a player has a straight-up bet on a number that is physically adjacent to the winning number on the European wheel, that's a near miss.

```typescript
/**
 * European roulette wheel layout: physical order of pockets clockwise.
 * The near-miss check uses this to determine adjacency, NOT the numerical grid layout.
 */
const EUROPEAN_WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const

/**
 * Returns the numbers physically adjacent to a given number on the wheel.
 * Adjacency depth = 2 (the two pockets either side of the winning pocket).
 */
function getAdjacentNumbers(winningNumber: number, depth: number = 2): number[] {
  const idx = EUROPEAN_WHEEL_ORDER.indexOf(winningNumber)
  const adjacent: number[] = []
  for (let d = 1; d <= depth; d++) {
    adjacent.push(EUROPEAN_WHEEL_ORDER[(idx + d) % 37]!)
    adjacent.push(EUROPEAN_WHEEL_ORDER[(idx - d + 37) % 37]!)
  }
  return adjacent
}

/**
 * Near-miss check: run after the winning number is determined.
 * If any player has a straight-up bet on a wheel-adjacent number, trigger the near-miss video.
 */
function detectNearMisses(
  winningNumber: number,
  bets: RouletteBet[]
): { playerId: string; betNumber: number }[] {
  const adjacent = getAdjacentNumbers(winningNumber)
  return bets
    .filter(b => b.type === 'straight_up' && adjacent.includes(b.numbers[0]!))
    .map(b => ({ playerId: b.playerId, betNumber: b.numbers[0]! }))
}
```

The Display animation uses this data to show the ball bouncing near the player's number before settling into the winning pocket. The near-miss data is included in the `ROULETTE_RESULT` state update so the Display knows which numbers to emphasise in the ball-landing sequence.

### Why Roulette Video Matters

Roulette is THE most visually cinematic casino game. The wheel spin is inherently dramatic — it's a physical object with real physics that determines fate. Our video layer enhances this:

- **The spin itself:** The wheel animation IS the video moment. The overlay enhances but doesn't replace the physics.
- **The near-miss:** When the ball bounces out of a player's number, the "near miss" effect triggers the same neurological reward as an actual win. This is the most psychologically compelling moment in roulette. Detected server-side via wheel adjacency map (see above).
- **The straight-up hit:** 35:1 is life-changing (in chip terms). This must feel like winning the lottery.
- **Shared wins:** Two players both betting on the same number and hitting is a party-defining moment.

### Estimated Roulette Video Assets: 11

| Category | Count |
|----------|-------|
| Phase prompts (place bets, no more bets) | 2 |
| Spin enhancement overlay | 1 |
| Outcome triggers (zero, near miss, repeat, streak) | 4 |
| Big win celebrations (straight-up, shared, big win) | 3 |
| Ambient loop | 1 |
| **Total** | **11** |

---

## 16. Roulette Dealer Characters

Roulette uses a "croupier" — elegant, precise, in control. The croupier spins the wheel and announces results.

### "Monsieur" Pierre Beaumont (Croupier)

- **Personality:** Impeccably French. Elegant, precise, slightly theatrical. Every spin is a ceremony. Treats the wheel with the reverence of a sommelier presenting a grand cru.
- **Voice:** Refined mid-range, measured French-accented English, unhurried. Each number is announced with weight.
- **Catchphrase:** "Rien ne va plus." ("No more bets.")

**Voice line categories:**

| Category | Example Lines |
|----------|--------------|
| Place bets | "Place your bets, s'il vous plait." / "The table is open." |
| No more bets | "Rien ne va plus. No more bets." / "The wheel decides now." |
| Spin | "And the wheel... spins." / "Round and round she goes." |
| Result | "[Number], [colour]." (clean, precise) / "Vingt-trois, rouge. Twenty-three, red." |
| Zero | "Zero. The house collects." / "Zéro. A cruel mistress." |
| Straight-up win | "Magnifique! Straight up on [N]. Thirty-five to one." |
| Big outside win | "Red wins. As it should." / "First dozen. Well played." |
| Near miss | "Ah... so close. The ball had other plans." |
| Repeat number | "Incroyable. [N] again. The wheel has a memory tonight." |

### "Vegas" Veronica Lane (Croupier)

- **Personality:** Glamorous American croupier. High-energy but polished. Turns every spin into an event. Works the crowd (the players) like a game show host.
- **Voice:** Bright, clear, fast-paced. Builds excitement through pacing.
- **Catchphrase:** "Let's see where she lands!"

**Voice line categories:**

| Category | Example Lines |
|----------|--------------|
| Place bets | "Alright, get those chips down! Clock's ticking!" / "Who's feeling lucky?" |
| No more bets | "No more bets! Hands off the felt!" |
| Spin | "Here we GO!" / "Spinning it up!" |
| Result | "[Number], [colour]!" (punchy) / "It's [N]! [Colour]!" |
| Zero | "ZERO! Oh that hurts!" |
| Straight-up win | "[Player]! STRAIGHT UP! Thirty-five to one, are you kidding me?!" |
| Near miss | "Oh! It ALMOST landed on [N]! Can you believe that?!" |
| Streak | "That's [X] [colours] in a row! The table's running hot!" |

### Roulette Dealer Constants

```typescript
export const ROULETTE_DEALER_CHARACTERS = ['pierre_beaumont', 'veronica_lane'] as const
export type RouletteDealerCharacter = typeof ROULETTE_DEALER_CHARACTERS[number]
```

---

# III. Three Card Poker (v2.0)

> **[ROADMAP DECISION 5]** Three Card Poker ships in **v2.0**. The final consolidated roadmap (`docs/CASINO-V2-ROADMAP-FINAL.md`, Decision 5) resolved the PM vs principal engineer conflict in favour of shipping TCP in v2.0. TCP is the lowest-risk new game (6 phases, no complex bet persistence, simultaneous decisions), fills the "quick game" niche (20-second hands), and validates the multi-game architecture expansion before Craps adds complexity in v2.1. The earlier PM-2 deferral to v2.1 is superseded.

## 17. Three Card Poker Rules Specification

### Overview

Three Card Poker is the fastest poker variant. Each player gets 3 cards, makes a single decision (play or fold), and the hand resolves against the dealer. Rounds take under 30 seconds. It's the perfect "quick hit" game between longer sessions of Hold'em or craps.

### Hand Rankings (3-Card Poker)

Three Card Poker uses a **different hand ranking** than standard 5-card poker because with only 3 cards, straights are harder to make than flushes (only 48 possible straights vs 1,096 possible flushes from a 52-card deck).

| Rank | Hand | Description | Example | Frequency |
|------|------|-------------|---------|-----------|
| 1 | **Straight Flush** | Three consecutive cards, same suit | 5-6-7 of hearts | 48 combos |
| 2 | **Three of a Kind** | Three cards of same rank | K-K-K | 52 combos |
| 3 | **Straight** | Three consecutive cards, any suit | 9-10-J | 720 combos |
| 4 | **Flush** | Three cards of same suit, not consecutive | 2-7-Q of spades | 1,096 combos |
| 5 | **Pair** | Two cards of same rank | 8-8-A | 3,744 combos |
| 6 | **High Card** | None of the above | A-J-4 | 16,440 combos |

**Important:** In 3-card poker, A-2-3 is the lowest straight (not A-K-Q). The highest straight is Q-K-A.

### Game Flow

1. **Ante:** Each player places an Ante bet (required to play)
2. **Optional Pair Plus:** Side bet that pays on hand quality regardless of dealer outcome
3. **Deal:** Each player and the dealer receive 3 cards face-down
4. **Decision:** Players view their cards and choose Play (match the Ante) or Fold (lose Ante)
5. **Reveal:** Dealer reveals their hand
6. **Qualify:** Dealer must have Queen-high or better to "qualify"
7. **Resolution:** If dealer qualifies, compare hands. If dealer doesn't qualify, Ante pays 1:1, Play bet pushes.

### Ante Bonus

Regardless of the dealer's hand, players with premium hands receive an Ante Bonus:

| Hand | Ante Bonus |
|------|-----------|
| Straight Flush | 5:1 |
| Three of a Kind | 4:1 |
| Straight | 1:1 |

The Ante Bonus pays even if the dealer doesn't qualify and even if the player would lose the comparison (edge case: player has a straight, dealer has a flush but doesn't qualify — player still gets the Ante Bonus on top of the push/win).

### Pair Plus Side Bet

An independent side bet placed alongside the Ante. Pays based solely on the player's hand quality:

| Hand | Pair Plus Payout |
|------|-----------------|
| Straight Flush | 40:1 |
| Three of a Kind | 30:1 |
| Straight | 6:1 |
| Flush | 3:1 |
| Pair | 1:1 |
| Less than Pair | Lose |

The Pair Plus bet resolves independently of the dealer's hand and the Play/Fold decision. A player can fold their Ante but still win Pair Plus if they have a pair or better.

### Payout Summary

| Outcome | Ante | Play | Pair Plus |
|---------|------|------|-----------|
| Player folds | Lose | N/A | Resolves independently |
| Dealer doesn't qualify, player plays | 1:1 | Push | Resolves independently |
| Dealer qualifies, player wins | 1:1 + Ante Bonus | 1:1 | Resolves independently |
| Dealer qualifies, player loses | Lose | Lose | Resolves independently |
| Dealer qualifies, tie | Push | Push | Resolves independently |

### Bet Limits

| Constant | Default | Range |
|----------|---------|-------|
| `TCP_MIN_ANTE` | 10 | 5-100 |
| `TCP_MAX_ANTE` | 500 | 100-5,000 |
| `TCP_MAX_PAIR_PLUS` | 100 | 25-1,000 |

---

## 18. Three Card Poker Phase Flow

```
GAME_SELECT --> TCP_ANTE --> TCP_DEAL --> TCP_DECISION
  --> TCP_DEALER_REVEAL --> TCP_PAYOUT --> TCP_ROUND_COMPLETE --> loop
```

This is intentionally simple. Six phases. Under 30 seconds per round. Lightning fast.

### Phase Definitions

#### `TCP_ANTE`

| Property | Value |
|----------|-------|
| `onBegin` | Initialise `threeCardPoker` sub-state if first round. Clear previous hand state. Enable Ante placement on all controllers. Optional Pair Plus toggle. Fund from wallet if first round (M1 Sync Point 1). Betting timer: `TCP_BET_TIMEOUT_MS = 20_000`. TTS: "Ante up!" |
| `endIf` | `state.threeCardPoker?.allAntesPlaced === true` |
| `next` | `'TCP_DEAL'` |
| `onEnd` | Lock bets. Deduct from wallets. |

#### `TCP_DEAL`

| Property | Value |
|----------|-------|
| `onBegin` | Shuffle deck. Deal 3 cards to each player and 3 to the dealer (all face-down). Player cards sent to controllers. Dealer cards stored server-side. Set `threeCardPoker.dealComplete = true`. |
| `endIf` | `state.threeCardPoker?.dealComplete === true` |
| `next` | `'TCP_DECISION'` |
| `onEnd` | — |

#### `TCP_DECISION`

| Property | Value |
|----------|-------|
| `onBegin` | All players simultaneously view their 3 cards on controllers. Each decides: Play (places a Play bet equal to their Ante) or Fold (forfeits Ante). Timer: `TCP_DECISION_TIMEOUT_MS = 15_000`. Auto-fold on timeout. |
| `endIf` | `state.threeCardPoker?.allDecisionsMade === true` |
| `next` | `'TCP_DEALER_REVEAL'` |
| `onEnd` | — |

**Simultaneous decisions:** Unlike blackjack's sequential turns, Three Card Poker decisions happen simultaneously. All players decide at the same time. This is possible because decisions don't affect each other — each player's hand is independent. No `activePlayerIndex` needed.

#### `TCP_DEALER_REVEAL`

| Property | Value |
|----------|-------|
| `onBegin` | Reveal dealer's 3 cards on TV display. Evaluate dealer qualification (Queen-high or better). Dramatic card-flip animation. TTS: "Dealer shows [hand description]." / "Dealer does not qualify." Set `threeCardPoker.dealerRevealed = true`. |
| `endIf` | `state.threeCardPoker?.dealerRevealed === true` |
| `next` | `'TCP_PAYOUT'` |
| `onEnd` | — |

#### `TCP_PAYOUT`

| Property | Value |
|----------|-------|
| `onBegin` | For each player: resolve Ante (vs dealer or auto-win if dealer DNQ), resolve Play bet, resolve Pair Plus, calculate Ante Bonus. Update wallets. Display results. TTS announces notable outcomes. Set `threeCardPoker.payoutComplete = true`. |
| `endIf` | `state.threeCardPoker?.payoutComplete === true` |
| `next` | `'TCP_ROUND_COMPLETE'` |
| `onEnd` | — |

#### `TCP_ROUND_COMPLETE`

| Property | Value |
|----------|-------|
| `onBegin` | Update session stats. Sync wallet (M1 Sync Point 2). Set `threeCardPoker.roundCompleteReady = true`. |
| `endIf` | `state.threeCardPoker?.roundCompleteReady === true` |
| `next` | If `gameChangeRequested`: `'GAME_SELECT'`. Otherwise: `'TCP_ANTE'`. |
| `onEnd` | — |

---

## 19. Three Card Poker State Shape

```typescript
interface ThreeCardPokerState {
  /** Per-player hand state */
  playerHands: TCPPlayerHand[]

  /** Dealer's hand (hidden until reveal) */
  dealerHand: TCPDealerHand

  /** Whether the dealer qualifies (Queen-high or better) */
  dealerQualifies: boolean | null

  /** Phase transition flags (C1 pattern) */
  allAntesPlaced: boolean
  dealComplete: boolean
  allDecisionsMade: boolean
  dealerRevealed: boolean
  payoutComplete: boolean
  roundCompleteReady: boolean

  /** Round number (for stats) */
  roundNumber: number

  /** Configuration */
  config: TCPConfig
}

interface TCPPlayerHand {
  playerId: string
  /** Player's 3 cards (sent to controller, hidden on TV until showdown) */
  cards: Card[]
  /** Ante bet amount */
  anteBet: number
  /** Play bet amount (= anteBet if playing, 0 if folded) */
  playBet: number
  /** Pair Plus side bet amount (0 if not placed) */
  pairPlusBet: number
  /** Decision: play, fold, or undecided */
  decision: 'undecided' | 'play' | 'fold'
  /** Evaluated hand rank */
  handRank: TCPHandRank | null
  /** Ante bonus earned (0 if none) */
  anteBonus: number
  /** Pair Plus payout (0 if lost or not placed) */
  pairPlusPayout: number
  /** Total payout for the round */
  totalPayout: number
  /** Net result */
  roundResult: number
}

interface TCPDealerHand {
  /** Dealer's cards (empty/hidden until reveal phase) */
  cards: Card[]
  /** Whether cards have been revealed on display */
  revealed: boolean
  /** Evaluated hand rank */
  handRank: TCPHandRank | null
}

type TCPHandRank =
  | 'straight_flush'
  | 'three_of_a_kind'
  | 'straight'
  | 'flush'
  | 'pair'
  | 'high_card'

interface TCPConfig {
  minAnte: number
  maxAnte: number
  maxPairPlus: number
}
```

**Server-side state extension:**

```typescript
interface ServerTCPState {
  /** Deck for this round */
  deck: Card[]
  /** Dealer's hidden cards (revealed in TCP_DEALER_REVEAL) */
  dealerCards: Card[]
  /** Player cards (sent to individual controllers) */
  playerCards: Map<string, Card[]>
}
```

**Hand evaluation function (3-card specific):**

> **[RC-3 FIX]** The strength calculation uses rank-band bases with 1000-wide gaps to ensure monotonic ordering: all straight flush strengths > all three-of-a-kind strengths > all straight strengths > all flush strengths > all pair strengths > all high card strengths. The previous version (v1.0) used bases of 600/500/400/300/200/0, which caused flush strengths (300 + 14\*100+13\*10+2 = 1732) to numerically exceed straight strengths (400 + 14 = 414). This meant raw `strength` comparison alone would produce incorrect results. The fix below ensures `strength` is a single sortable value — no need to compare `rank` first.

```typescript
/**
 * Rank-band bases. Each band is 1000 wide. Kicker values stay within 0-999.
 * This guarantees: straight_flush > three_of_a_kind > straight > flush > pair > high_card
 * regardless of the specific cards involved.
 */
const TCP_RANK_BASE = {
  straight_flush:   6000,
  three_of_a_kind:  5000,
  straight:         4000,
  flush:            3000,
  pair:             2000,
  high_card:        1000,
} as const

/**
 * Evaluates a 3-card poker hand.
 * NOT reusing the 5-card evaluateHand — different ranking system.
 *
 * Kicker encoding (within each 1000-wide band):
 * - straight_flush / straight: top rank (0-14). A-2-3 low straight uses rank 3 (low ace).
 * - three_of_a_kind: trip rank (0-14).
 * - flush / high_card: ranks[0]*15^2 + ranks[1]*15 + ranks[2] (max 14*225+14*15+14 = 3360,
 *   but we clamp to 0-999 by dividing: ranks[0]*49 + ranks[1]*7 + ranks[2], max = 14*49+14*7+14 = 784).
 * - pair: pairRank*15 + kicker (max 14*15+14 = 224).
 */
function evaluateTCPHand(cards: [Card, Card, Card]): {
  rank: TCPHandRank
  /** Numeric strength for comparison (higher = better). Monotonically ordered across ALL ranks. */
  strength: number
} {
  const ranks = cards.map(c => rankToNumeric(c.rank)).sort((a, b) => b - a)
  const suits = cards.map(c => c.suit)
  const allSameSuit = suits[0] === suits[1] && suits[1] === suits[2]
  const allSameRank = ranks[0] === ranks[1] && ranks[1] === ranks[2]
  const isSequential = (ranks[0]! - ranks[2]! === 2 && new Set(ranks).size === 3)
    || (ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2)  // A-2-3 low straight
  const hasPair = ranks[0] === ranks[1] || ranks[1] === ranks[2]

  // For A-2-3 low straight, treat the top rank as 3 (not 14) for kicker purposes
  const straightTopRank = (ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2) ? 3 : ranks[0]!

  if (isSequential && allSameSuit) return { rank: 'straight_flush', strength: TCP_RANK_BASE.straight_flush + straightTopRank }
  if (allSameRank) return { rank: 'three_of_a_kind', strength: TCP_RANK_BASE.three_of_a_kind + ranks[0]! }
  if (isSequential) return { rank: 'straight', strength: TCP_RANK_BASE.straight + straightTopRank }
  if (allSameSuit) return { rank: 'flush', strength: TCP_RANK_BASE.flush + ranks[0]! * 49 + ranks[1]! * 7 + ranks[2]! }
  if (hasPair) {
    const pairRank = ranks[0] === ranks[1] ? ranks[0]! : ranks[1]!
    const kicker = ranks.find(r => r !== pairRank)!
    return { rank: 'pair', strength: TCP_RANK_BASE.pair + pairRank * 15 + kicker }
  }
  return { rank: 'high_card', strength: TCP_RANK_BASE.high_card + ranks[0]! * 49 + ranks[1]! * 7 + ranks[2]! }
}

/**
 * Dealer qualifies with Queen-high or better.
 * Uses the rank field for quick classification, then checks the high card
 * against Queen (12) using the kicker encoding.
 */
function dealerQualifies(hand: { rank: TCPHandRank; strength: number }): boolean {
  if (hand.rank !== 'high_card') return true  // any pair or better qualifies
  // High card kicker = ranks[0]*49 + ranks[1]*7 + ranks[2]. Queen = 12, so Q-high minimum = 12*49 = 588.
  const kicker = hand.strength - TCP_RANK_BASE.high_card
  const highRank = Math.floor(kicker / 49)
  return highRank >= 12  // Queen = 12, King = 13, Ace = 14
}
```

---

## 20. Three Card Poker Controller UX

### Ante Screen

Displayed during `TCP_ANTE`:

**Layout:**
```
+----------------------------------+
|  Wallet: $7,200  |  Round: 8     |
+----------------------------------+
|         THREE CARD POKER         |
|                                  |
|  Ante: [$10] [$25] [$50] [$100] |
|                                  |
|  [x] Pair Plus: $25             |
|      (toggle on/off, set amount) |
|                                  |
|  Total bet: $75                  |
|                                  |
|  [CONFIRM ANTE]                  |
+----------------------------------+
```

### Decision Screen

Displayed during `TCP_DECISION`:

**Layout:**
```
+----------------------------------+
|         YOUR HAND                |
|                                  |
|    [Kh]   [Qs]   [9d]          |
|                                  |
|    Hand: King-Queen high         |
|    Ante: $50  |  Pair Plus: $25  |
|                                  |
|  [  PLAY  $50  ]   [ FOLD ]     |
|   (green, large)    (red)        |
|                                  |
|  Timer: 12s remaining            |
+----------------------------------+
```

The three cards are displayed prominently. The hand evaluation is shown as text below (e.g., "Pair of Jacks", "Flush: A-10-7", "Straight: 9-10-J").

The PLAY button shows the cost (equal to Ante). FOLD forfeits the Ante. Decisions are final and immediate.

### Waiting/Result Screen

After decision, before dealer reveal:
- "Waiting for other players..." (shows your cards dimmed)
- After reveal: shows dealer's hand, qualification status, and your win/loss

---

## 21. Three Card Poker Display & 3D

### Table Layout

The TV shows a **compact Three Card Poker table**:

```
+----------------------------------------------------------+
|                                                            |
|                    [DEALER]                                |
|               [3 cards face-down]                         |
|               ___________________                         |
|              /                   \                        |
|             /   [Pair Plus area]  \                       |
|            /    [Ante area]        \                      |
|           /     [Play area]         \                     |
|          |  [P1]  [P2]  [P3]  [P4]  |                   |
|          |__________________________|                     |
|                                                            |
+----------------------------------------------------------+
```

Each player position shows:
- Three cards (face-down until showdown, then face-up)
- Ante chip stack
- Pair Plus chip (if placed)
- Play chip (if played, appears after decision)
- Decision indicator: "PLAY" (green) or "FOLD" (red, cards grey out)

### Deal Animation

1. Cards fly from the deck to each player position (3 cards each, dealt one at a time clockwise)
2. 3 cards to the dealer position (face-down)
3. Duration: ~100ms per card, ~2 seconds total for 4 players + dealer

### Decision Display

During `TCP_DECISION`, the TV shows all player positions with face-down cards and a timer. As players decide:
- "PLAY" — player's area gets a green glow, a play chip appears
- "FOLD" — player's cards flip and fade, a red "FOLD" indicator appears

### Dealer Reveal Animation

The marquee moment in Three Card Poker:
1. Camera pushes in on the dealer's 3 cards
2. Cards flip one at a time (left to right) with a dramatic 3D rotation
3. Each card reveal pauses briefly (~400ms) for the audience to register
4. After all 3 cards revealed, qualification check appears: "DEALER QUALIFIES" or "DEALER DOES NOT QUALIFY"
5. Camera pulls back to show the full table for resolution

### Resolution Display

Winning players' cards glow green, chips fly to their stacks. Losing players' cards dim. The dealer's hand is compared visually against each player's hand with a brief highlight animation.

---

## 22. Three Card Poker Voice Commands

### TCP-Specific Commands

| Voice Command | Intent | Phase | Notes |
|---------------|--------|-------|-------|
| "ante [amount]" / "ante up" | `tcp_ante` | TCP_ANTE | |
| "pair plus" / "side bet" | `tcp_pair_plus` | TCP_ANTE | Toggle Pair Plus |
| "play" / "I'm in" / "call" | `tcp_play` | TCP_DECISION | Match Ante with Play bet |
| "fold" / "I'm out" | `tcp_fold` | TCP_DECISION | Forfeit Ante |
| "confirm" / "deal" | `tcp_confirm` | TCP_ANTE | Confirm bets |

### Slot Map

```typescript
const tcpSlotMap = [
  'ante', 'play', 'fold', 'pair', 'plus', 'side',
  'confirm', 'deal', 'in', 'out', 'call',
]
```

---

## 23. Three Card Poker Video Integration

### Phase-by-Phase Video Triggers

| Phase | Trigger Event | Asset Key | Mode | Duration | Blocks | Skippable | Priority | Notes |
|-------|--------------|-----------|------|----------|--------|-----------|----------|-------|
| `TCP_ANTE` | Round begins | `tcp_ante_up` | overlay | 1,500ms | No | No | low | "Ante Up!" prompt |
| `TCP_DEAL` | Cards dealt | `tcp_deal_cinematic` | overlay | 1,500ms | No | No | low | Brief dealing cinematic |
| `TCP_DEALER_REVEAL` | Dealer doesn't qualify | `tcp_dealer_dnq` | overlay | 2,500ms | No | No | medium | "DEALER DOES NOT QUALIFY!" — everyone who played wins. Communal celebration. |
| `TCP_DEALER_REVEAL` | Dealer reveals premium hand | `tcp_dealer_strong` | overlay | 2,000ms | No | No | medium | Ominous reveal — dealer has trips or straight flush. |
| `TCP_PAYOUT` | Straight Flush (player) | `tcp_straight_flush` | full_screen | 4,000ms | Yes | Yes (after 2s) | critical | HUGE moment. 40:1 on Pair Plus. Full cinematic celebration. |
| `TCP_PAYOUT` | Three of a Kind (player) | `tcp_three_of_a_kind` | full_screen | 3,500ms | Yes | Yes (after 1s) | high | 30:1 on Pair Plus. Major celebration. |
| `TCP_PAYOUT` | All players fold | `tcp_all_fold` | overlay | 2,000ms | No | No | low | Dealer collects antes. Brief commiseration. |
| `TCP_PAYOUT` | Player wins >= 300 chips | `tcp_big_win` | overlay | 2,500ms | No | No | high | Big win overlay |

### TCP Ambient

| Asset Key | Mode | When Active | Description |
|-----------|------|-------------|-------------|
| `tcp_ambient_table` | background | During all TCP phases | Fast-paced casino floor energy — quick hands, rapid shuffles, the sound of chips clicking. More urgent than the leisurely poker vibe. |

### Estimated TCP Video Assets: 9

| Category | Count |
|----------|-------|
| Phase prompts (ante, deal) | 2 |
| Dealer reveal triggers (DNQ, strong hand) | 2 |
| Win celebrations (straight flush, trips, big win) | 3 |
| Other (all fold) | 1 |
| Ambient loop | 1 |
| **Total** | **9** |

---

## 24. Three Card Poker Dealer Characters

Three Card Poker shares dealers with the existing blackjack roster (Ace Malone, Scarlett Vega, Chip Dubois) since both are player-vs-dealer card games. However, each dealer has TCP-specific voice lines.

### TCP-Specific Voice Lines for Existing Dealers

**Ace Malone — TCP lines:**

| Category | Example Lines |
|----------|--------------|
| Deal | "Three cards each. Simple as it gets." |
| Player straight flush | "Straight flush! In THREE cards! That's remarkable." |
| Dealer DNQ | "I don't qualify. Your ante pays, play pushes. Easy money." |
| All fold | "Nobody's playing? Come on, live a little." |

**Scarlett Vega — TCP lines:**

| Category | Example Lines |
|----------|--------------|
| Deal | "Three cards. One decision. No excuses." |
| Player straight flush | "Straight flush. The Pair Plus just paid for your entire evening." |
| Dealer DNQ | "I'm below Queen-high. Not my finest moment." |
| Player folds strong hand | "You folded a pair? Bold strategy. Wrong, but bold." |

**Chip Dubois — TCP lines:**

| Category | Example Lines |
|----------|--------------|
| Deal | "Three cards coming up! Quick and snappy!" |
| Player straight flush | "STRAIGHT FLUSH! OH MY! Forty to one on the Pair Plus!!!" |
| Dealer DNQ | "I don't qualify! Everyone who played gets PAID! Love it!" |
| All fold | "Everyone folded?! Next round's gonna be the one, I can feel it!" |

### TCP Dealer Assignment

Three Card Poker uses the blackjack dealer roster:

```typescript
// TCP shares the blackjack dealer character set
export const TCP_DEALER_CHARACTERS = BLACKJACK_DEALER_CHARACTERS
export type TCPDealerCharacter = BlackjackDealerCharacter
```

---

# IV. Cross-Game Concerns

## 25. Game Night Mode Integration

### Rank-Based Scoring System

> **[ROADMAP DECISION 1]** The final consolidated roadmap (`docs/CASINO-V2-ROADMAP-FINAL.md`, Decision 1) resolved the scoring conflict in favour of the **rank-based system** from `docs/CASINO-V2-RETENTION.md` Section 1.3. The chip-multiplier normalisation system previously in this section is **deprecated and removed**. The `GAME_NIGHT_NORMALISERS` constant and `normaliseChipResult` function must NOT be implemented.

Game Night Mode requires a scoring system that works fairly across all games regardless of their different chip payout structures. The rank-based system solves this by awarding points based on **relative player placement** per game, not raw chip values.

**Scoring Formula:**

Players are ranked 1st through 4th per game (by net chip result within that game). Points are awarded by rank position. Points accumulate across all games in the Game Night session. The player with the highest cumulative Game Night Points (GNP) at the end of the session is the champion.

```typescript
interface GameNightScore {
  playerId: string
  gameId: CasinoGame
  roundsPlayed: number
  netChipResult: number          // raw chips won/lost in this game
  performanceRank: number        // 1st, 2nd, 3rd, 4th among players
  bonusPoints: number            // from achievements during the game
  gameNightPoints: number        // final normalised score for this game
}

// Points awarded per game based on rank
const RANK_POINTS: Record<number, number> = {
  1: 100,   // 1st place
  2: 70,    // 2nd place
  3: 45,    // 3rd place
  4: 25,    // 4th place
}

// Bonus point triggers (per game)
const BONUS_TRIGGERS = {
  // Poker (Hold'em & 5-Card Draw)
  ROYAL_FLUSH: 50,
  STRAIGHT_FLUSH: 30,
  FOUR_OF_A_KIND: 20,
  BIGGEST_BLUFF: 15,            // Won pot with worst hand at showdown
  COMEBACK_KID: 10,             // Recovered from <20% starting stack to positive

  // Blackjack
  NATURAL_BLACKJACK: 10,
  FIVE_CARD_CHARLIE: 20,        // 5 cards without busting
  PERFECT_PAIRS_HIT: 15,
  THREE_WINS_IN_A_ROW: 10,
  DOUBLE_DOWN_WIN: 10,

  // Craps
  HOT_SHOOTER: 20,              // 5+ rolls before sevening out
  HARDWAY_HIT: 15,
  PASS_LINE_STREAK_5: 10,

  // Roulette
  STRAIGHT_UP_HIT: 25,          // Hit a single number
  COLOUR_STREAK_5: 10,          // 5 correct colour bets in a row
}

function calculateGameNightPoints(
  players: GameNightScore[],
  gameResults: GameResult
): GameNightScore[] {
  // 1. Rank players by net chip result for this game
  const ranked = [...players].sort((a, b) => b.netChipResult - a.netChipResult)
  ranked.forEach((p, i) => { p.performanceRank = i + 1 })

  // 2. Assign rank points
  ranked.forEach(p => {
    p.gameNightPoints = RANK_POINTS[p.performanceRank] ?? 10
  })

  // 3. Add margin bonus: top player gets extra points proportional to lead
  const first = ranked[0]
  const second = ranked[1]
  if (first && second && first.netChipResult > 0) {
    const marginRatio = (first.netChipResult - second.netChipResult) / first.netChipResult
    first.gameNightPoints += Math.round(marginRatio * 30) // up to 30 bonus for dominant win
  }

  // 4. Add achievement bonus points
  ranked.forEach(p => {
    p.gameNightPoints += p.bonusPoints
  })

  return ranked
}
```

> **Source of truth:** `docs/CASINO-V2-RETENTION.md` Section 1.3 is the canonical reference for the rank-based scoring system. This section mirrors that specification for implementation convenience within the new games context.

#### Why Rank-Based Scoring Works

- **Fairness:** A player who dominates poker but loses at blackjack does not auto-win. Every game matters equally in base points (100/70/45/25 split).
- **Simplicity:** Easy to explain to players — "1st place gets 100 points, 2nd gets 70, and so on."
- **Cross-game balance:** No per-game normalisation constants to tune. Games with wildly different payout structures are treated identically.
- **Anti-gaming:** Players cannot farm points by choosing high-variance games.
- **Bonus depth:** Achievement bonuses reward notable plays without distorting the core ranking.

**Bonus points (per game) — summary table:**

| Game | Achievement | Bonus Points |
|------|------------|--------------|
| Hold'em / Draw | Royal Flush | +50 |
| Hold'em / Draw | Straight Flush | +30 |
| Hold'em / Draw | Four of a Kind | +20 |
| Hold'em / Draw | Biggest Bluff | +15 |
| Hold'em / Draw | Comeback Kid | +10 |
| Blackjack | Natural Blackjack | +10 |
| Blackjack | Five Card Charlie | +20 |
| Blackjack | Perfect Pairs Hit | +15 |
| Blackjack | Three Wins in a Row | +10 |
| Blackjack | Double Down Win | +10 |
| Craps | Hot Shooter (5+ rolls) | +20 |
| Craps | Hardway Hit | +15 |
| Craps | Pass Line Streak (5) | +10 |
| Roulette | Straight-up Hit | +25 |
| Roulette | Colour Streak (5) | +10 |

---

## 26. Phase Enum & Routing Table Extensions

### CasinoPhase Enum Additions

```typescript
export enum CasinoPhase {
  // ... existing phases from v1 ...

  // Craps
  CrapsNewShooter = 'CRAPS_NEW_SHOOTER',
  CrapsComeOutBetting = 'CRAPS_COME_OUT_BETTING',
  CrapsComeOutRoll = 'CRAPS_COME_OUT_ROLL',
  CrapsComeOutResolution = 'CRAPS_COME_OUT_RESOLUTION',
  CrapsPointBetting = 'CRAPS_POINT_BETTING',
  CrapsPointRoll = 'CRAPS_POINT_ROLL',
  CrapsPointResolution = 'CRAPS_POINT_RESOLUTION',
  CrapsRoundComplete = 'CRAPS_ROUND_COMPLETE',

  // Roulette
  RoulettePlaceBets = 'ROULETTE_PLACE_BETS',
  RouletteNoMoreBets = 'ROULETTE_NO_MORE_BETS',
  RouletteSpin = 'ROULETTE_SPIN',
  RouletteResult = 'ROULETTE_RESULT',
  RoulettePayout = 'ROULETTE_PAYOUT',
  RouletteRoundComplete = 'ROULETTE_ROUND_COMPLETE',

  // Three Card Poker
  TcpAnte = 'TCP_ANTE',
  TcpDeal = 'TCP_DEAL',
  TcpDecision = 'TCP_DECISION',
  TcpDealerReveal = 'TCP_DEALER_REVEAL',
  TcpPayout = 'TCP_PAYOUT',
  TcpRoundComplete = 'TCP_ROUND_COMPLETE',
}
```

### GAME_SELECT Routing Table Extension

```typescript
// Addition to the existing routing table in GAME_SELECT phase
const gameSelectRouting: Record<CasinoGame, CasinoPhase> = {
  holdem: CasinoPhase.PostingBlinds,
  five_card_draw: CasinoPhase.DrawPostingBlinds,
  blackjack_classic: CasinoPhase.BjPlaceBets,
  blackjack_competitive: CasinoPhase.BjcPlaceBets,
  // New games
  craps: CasinoPhase.CrapsNewShooter,
  roulette: CasinoPhase.RoulettePlaceBets,
  three_card_poker: CasinoPhase.TcpAnte,
}
```

### CasinoGame Type Extension

```typescript
export const CASINO_GAMES = [
  'holdem', 'five_card_draw', 'blackjack_classic', 'blackjack_competitive',
  'craps', 'roulette', 'three_card_poker',
] as const
export type CasinoGame = typeof CASINO_GAMES[number]
```

### CasinoGameState Extension

```typescript
interface CasinoGameState {
  // ... existing fields ...

  // New game sub-states
  craps?: CrapsState
  roulette?: RouletteState
  threeCardPoker?: ThreeCardPokerState
}
```

---

## 27. Server-Side State Extensions

```typescript
interface ServerGameState {
  // ... existing fields ...

  /** Craps private state */
  craps?: ServerCrapsState

  /** Roulette private state */
  roulette?: ServerRouletteState

  /** Three Card Poker private state */
  threeCardPoker?: ServerTCPState
}

/** Craps: dice results are pre-generated server-side */
interface ServerCrapsState {
  /** Pre-generated dice results (consumed on each roll) */
  nextRoll: { die1: number; die2: number }
  /** RNG seed for the current shooter's session (for deterministic replay/debugging) */
  rngSeed: string
  /** Sequential roll index for this seed (increments each roll) */
  rollIndex: number
}

/**
 * [M1 FIX] Dice RNG specification:
 *
 * Use `crypto.getRandomValues()` (Node.js `crypto.randomInt(1, 7)`) for each die.
 * This is a CSPRNG — cryptographically secure, uniform distribution, not predictable.
 *
 * For reproducibility/debugging, each shooter session generates a random seed
 * (stored in `ServerCrapsState.rngSeed`). The seed + rollIndex can be used to
 * replay the exact sequence of rolls for debugging or dispute resolution.
 *
 * Distribution validation: the RNG must produce the correct probability distribution
 * for two dice (each die independently uniform 1-6). The sum distribution should be:
 *   P(2)=1/36, P(3)=2/36, P(4)=3/36, P(5)=4/36, P(6)=5/36, P(7)=6/36,
 *   P(8)=5/36, P(9)=4/36, P(10)=3/36, P(11)=2/36, P(12)=1/36
 * Add a unit test that rolls 100,000 times and verifies the distribution
 * is within 1% of expected for each total.
 */

/** Roulette: winning number is pre-determined before spin */
interface ServerRouletteState {
  winningNumber: number
}

/** TCP: deck and hidden dealer cards */
interface ServerTCPState {
  deck: Card[]
  dealerCards: Card[]
  playerCards: Map<string, Card[]>
}
```

### Ruleset File Structure Extension

Following the pattern from Appendix C2 of the v1 Game Design:

```
apps/server/src/ruleset/
  index.ts                          -- Updated to include new games
  // ... existing files ...
  craps/
    phases.ts                       -- 8 Craps phases
    reducers.ts                     -- Craps reducers
    thunks.ts                       -- resolveCrapsRoll, etc.
    helpers.ts                      -- payout calculations, bet resolution
    constants.ts                    -- CRAPS_MIN_BET, payout tables, etc.
  roulette/
    phases.ts                       -- 6 Roulette phases
    reducers.ts                     -- Roulette reducers
    thunks.ts                       -- resolveRouletteBets, etc.
    helpers.ts                      -- payout calculations, number-to-colour map
    constants.ts                    -- ROULETTE wheel layout, bet limits, etc.
  three-card-poker/
    phases.ts                       -- 6 TCP phases
    reducers.ts                     -- TCP reducers
    thunks.ts                       -- resolveTCPHands, etc.
    hand-evaluator.ts               -- evaluateTCPHand (3-card specific)
    constants.ts                    -- payout tables, TCP_MIN_ANTE, etc.
```

### Reducer & Thunk Registry (New Games)

#### Craps Reducers

| Reducer | Scope | Args | Description |
|---------|-------|------|-------------|
| `initCrapsState` | **CRAPS_NEW_SHOOTER** | `config: CrapsConfig` | Initialise `craps` sub-state |
| `setCrapsShooter` | **CRAPS_NEW_SHOOTER** | `playerId, index` | Set current shooter |
| `setCrapsNewShooterReady` | **CRAPS_NEW_SHOOTER** | `boolean` | Phase flag |
| `placeCrapsBet` | **CRAPS_COME_OUT_BETTING, CRAPS_POINT_BETTING** | `bet: CrapsBet` | Add a bet |
| `removeCrapsBet` | **CRAPS_COME_OUT_BETTING, CRAPS_POINT_BETTING** | `betId` | Remove a bet |
| `confirmCrapsBets` | **CRAPS_COME_OUT_BETTING, CRAPS_POINT_BETTING** | `playerId` | Mark player bets confirmed |
| `setAllComeOutBetsPlaced` | **CRAPS_COME_OUT_BETTING** | `boolean` | Phase flag |
| `setAllPointBetsPlaced` | **CRAPS_POINT_BETTING** | `boolean` | Phase flag |
| `setCrapsRollResult` | **CRAPS_COME_OUT_ROLL, CRAPS_POINT_ROLL** | `die1, die2` | Set roll result |
| `setCrapsRollComplete` | **CRAPS_COME_OUT_ROLL, CRAPS_POINT_ROLL** | `boolean` | Phase flag |
| `setCrapsPoint` | **CRAPS_COME_OUT_RESOLUTION, CRAPS_POINT_RESOLUTION** | `number \| null` | Set/clear the point |
| `setCrapsPointHit` | **CRAPS_POINT_RESOLUTION** | `boolean` | Flag point hit |
| `setCrapsSevenOut` | **CRAPS_POINT_RESOLUTION** | `boolean` | Flag seven-out |
| `resolveCrapsBet` | **CRAPS_COME_OUT_RESOLUTION, CRAPS_POINT_RESOLUTION** | `betId, status, payout` | Resolve a single bet (used by come-out resolution) |
| `setCrapsRollResults` | **CRAPS_POINT_RESOLUTION** | `resolutions: CrapsRollResolution[], pointHit, sevenOut` | [RC-1] Atomic batch resolution — resolves ALL bets + flags in a single state update |
| `resolveCrapsComeBet` | **CRAPS_ROUND_COMPLETE** | `betId, status, payout` | [RC-5] Resolve a come bet (used by `returnActiveComeBets`) |
| `returnCrapsComeBetOdds` | **CRAPS_ROUND_COMPLETE** | `betId, amount` | [RC-5] Return odds behind a come bet at face value |
| `setCrapsComeOutResolutionComplete` | **CRAPS_COME_OUT_RESOLUTION** | `boolean` | Phase flag |
| `setCrapsPointResolutionComplete` | **CRAPS_POINT_RESOLUTION** | `boolean` | Phase flag |
| `setCrapsRoundCompleteReady` | **CRAPS_ROUND_COMPLETE** | `boolean` | Phase flag |
| `clearCrapsState` | **CRAPS_ROUND_COMPLETE** | — | Clear `craps` sub-state |

#### Craps Thunks

| Thunk | Scope | Description |
|-------|-------|-------------|
| `generateCrapsRoll` | **CRAPS_COME_OUT_ROLL, CRAPS_POINT_ROLL** | Generate random dice server-side (CSPRNG, see M1) |
| `resolveCrapsRoll` | **CRAPS_POINT_RESOLUTION** | [RC-1] Full resolution logic. Computes all bet resolutions internally, dispatches single `setCrapsRollResults` reducer. |
| `resolveComeOutBets` | **CRAPS_COME_OUT_RESOLUTION** | Resolve Pass/Don't Pass/Field on come-out |
| `returnActiveComeBets` | **CRAPS_ROUND_COMPLETE** | [RC-5] Returns active come/don't-come bets at face value on game switch |

#### Roulette Reducers

| Reducer | Scope | Args | Description |
|---------|-------|------|-------------|
| `initRouletteState` | **ROULETTE_PLACE_BETS** | `config: RouletteConfig` | Initialise `roulette` sub-state |
| `placeRouletteBet` | **ROULETTE_PLACE_BETS** | `bet: RouletteBet` | Add a bet |
| `removeRouletteBet` | **ROULETTE_PLACE_BETS** | `betId` | Remove a bet |
| `confirmRouletteBets` | **ROULETTE_PLACE_BETS** | `playerId` | Mark player bets confirmed |
| `setRouletteFavouriteNumbers` | **root** | `playerId, numbers: number[]` | [RC-2] Set player's favourite numbers for Quick Bets tab (max 5, persists per session) |
| `setAllRouletteBetsPlaced` | **ROULETTE_PLACE_BETS** | `boolean` | Phase flag |
| `setRouletteBettingClosed` | **ROULETTE_NO_MORE_BETS** | `boolean` | Phase flag |
| `setRouletteWinningNumber` | **ROULETTE_SPIN** | `number` | Set the winning number |
| `setRouletteSpinComplete` | **ROULETTE_SPIN** | `boolean` | Phase flag |
| `setRouletteNearMisses` | **ROULETTE_RESULT** | `nearMisses: { playerId, betNumber }[]` | [M3] Set near-miss data for Display animation |
| `setRouletteResultAnnounced` | **ROULETTE_RESULT** | `boolean` | Phase flag |
| `resolveRouletteBet` | **ROULETTE_PAYOUT** | `betId, status, payout` | Resolve a bet |
| `setRoulettePayoutComplete` | **ROULETTE_PAYOUT** | `boolean` | Phase flag |
| `addRouletteHistory` | **ROULETTE_ROUND_COMPLETE** | `entry: RouletteHistoryEntry` | Add to history board |
| `setRouletteRoundCompleteReady` | **ROULETTE_ROUND_COMPLETE** | `boolean` | Phase flag |
| `clearRouletteState` | **ROULETTE_ROUND_COMPLETE** | — | Clear sub-state |

#### Roulette Thunks

| Thunk | Scope | Description |
|-------|-------|-------------|
| `generateRouletteResult` | **ROULETTE_SPIN** | Generate random number server-side |
| `completeRouletteSpin` | **root** | [RC-6] Client-driven spin completion. Dispatched by Display when ball-landing animation finishes. Cancels hard timeout, sets `spinComplete`. |
| `forceCompleteRouletteSpin` | **ROULETTE_SPIN** | [RC-6] Server fallback (8s hard timeout). Sets `spinComplete` unconditionally if Display never reports. |
| `resolveRouletteBets` | **ROULETTE_PAYOUT** | Calculate all payouts |
| `detectAndDispatchNearMisses` | **ROULETTE_RESULT** | [M3] Checks wheel adjacency map, dispatches near-miss data for Display animation |

#### Three Card Poker Reducers

| Reducer | Scope | Args | Description |
|---------|-------|------|-------------|
| `initTCPState` | **TCP_ANTE** | `config: TCPConfig` | Initialise sub-state |
| `setTCPAnte` | **TCP_ANTE** | `playerId, amount` | Set ante amount |
| `setTCPPairPlus` | **TCP_ANTE** | `playerId, amount` | Set Pair Plus amount |
| `confirmTCPAnte` | **TCP_ANTE** | `playerId` | Confirm bets |
| `setAllTCPAntesPlaced` | **TCP_ANTE** | `boolean` | Phase flag |
| `setTCPDealComplete` | **TCP_DEAL** | `boolean` | Phase flag |
| `setTCPPlayerCards` | **TCP_DEAL** | `playerId, cards` | Set player's 3 cards |
| `setTCPDecision` | **TCP_DECISION** | `playerId, decision` | Play or fold |
| `setAllTCPDecisionsMade` | **TCP_DECISION** | `boolean` | Phase flag |
| `revealTCPDealer` | **TCP_DEALER_REVEAL** | `cards, qualifies` | Reveal dealer hand |
| `setTCPDealerRevealed` | **TCP_DEALER_REVEAL** | `boolean` | Phase flag |
| `setTCPPayoutComplete` | **TCP_PAYOUT** | `boolean` | Phase flag |
| `setTCPRoundCompleteReady` | **TCP_ROUND_COMPLETE** | `boolean` | Phase flag |
| `clearTCPState` | **TCP_ROUND_COMPLETE** | — | Clear sub-state |

#### Three Card Poker Thunks

| Thunk | Scope | Description |
|-------|-------|-------------|
| `dealTCPCards` | **TCP_DEAL** | Shuffle, deal 3 to each player + dealer |
| `resolveTCPHands` | **TCP_PAYOUT** | Evaluate all hands, calculate payouts |

---

## 28. Estimated Video Asset Counts

> **[PM-4 FIX]** The PM review correctly flags that 32 new video assets is too many to produce at premium quality for launch. Assets are now classified into three tiers: **Premium** (must be polished for launch — these are the moments that define the product), **Standard** (ship with decent quality, iterate later), and **Placeholder** (ship with basic animation/text overlay, replace with premium video post-launch).

### Per-Game Summary

| Game | Gameplay Overlays | Celebrations | Ambient | Total |
|------|-------------------|-------------|---------|-------|
| Roulette (v2.0) | 4 | 6 | 1 | **11** |
| Three Card Poker (v2.0) | 3 | 5 | 1 | **9** |
| Craps (v2.1) | 5 | 6 | 1 | **12** |
| **v2.0 Total (Roulette + TCP)** | **7** | **11** | **2** | **20** |
| **v2.1 Add-on (Craps)** | **5** | **6** | **1** | **12** |

### Video Asset Priority Tiers (v2.0 Launch + v2.1 Add-on)

**Tier 1 — PREMIUM (must be polished, 6 assets):**

These are the moments that sell the product. If a player sees one of these on a stream or a share, they should want to play.

| Asset Key | Game | Why Premium |
|-----------|------|------------|
| `craps_point_hit` | Craps | THE craps payoff moment. Communal win. Full-screen celebration. |
| `craps_seven_out` | Craps | THE craps devastation moment. Full-screen. Emotional whiplash. |
| `roulette_straight_up_hit` | Roulette | 35:1 payout. Full-screen. The roulette equivalent of a royal flush. |
| `game_select_craps` | Shared | First impression of the game. Sets the tone. |
| `game_select_roulette` | Shared | First impression. The wheel must look spectacular from frame one. |
| `craps_table_on_fire` | Craps | Communal celebration. The "everyone wins" moment. Shareable. |

**Tier 2 — STANDARD (ship with decent quality, 8 assets):**

| Asset Key | Game | Notes |
|-----------|------|-------|
| `craps_natural_winner` | Craps | Come-out natural — frequent, should feel good |
| `craps_craps_out` | Craps | Come-out craps — frequent, needs drama |
| `craps_point_set` | Craps | Point established — transition moment |
| `roulette_the_spin` | Roulette | Spin enhancement — plays every round |
| `roulette_zero` | Roulette | Zero hit — everyone loses, dramatic |
| `roulette_shared_win` | Roulette | Communal win — party-defining moment |
| `craps_ambient_table` | Craps | Background loop — sets the mood |
| `roulette_ambient_table` | Roulette | Background loop — sets the mood |

**Tier 3 — PLACEHOLDER (basic text/animation overlay, replace post-launch, 9 assets):**

| Asset Key | Game | Placeholder Approach |
|-----------|------|---------------------|
| `craps_new_shooter` | Craps | Text overlay: "[Player] picks up the dice!" |
| `craps_dice_throw` | Craps | Skip — the 3D dice animation IS the moment |
| `craps_hardway` | Craps | Text overlay: "HARD [N]!" with flash |
| `craps_big_winner` | Craps | Reuse `craps_point_hit` celebration at lower intensity |
| `craps_hot_shooter` | Craps | Text overlay: "HOT SHOOTER!" with fire effect |
| `roulette_place_bets` | Roulette | Text overlay: "Place Your Bets!" |
| `roulette_no_more_bets` | Roulette | Text overlay: "No More Bets!" |
| `roulette_near_miss` | Roulette | Text overlay: "SO CLOSE!" — placeholder is fine, emotion is contextual |
| `roulette_big_win` | Roulette | Reuse generic `big_win` overlay with roulette theming |

**Production budget summary:**
- Premium assets: 6 (high investment — external video production or premium AI generation)
- Standard assets: 8 (moderate investment — can be produced in-house)
- Placeholder assets: 9 (minimal investment — text overlays, particle effects, reused elements)
- **v2.0 Roulette + TCP effort: equivalent to ~10-12 "real" video assets** (vs 21 raw-count assets across those two games and game-select intro). **Craps (12 assets) ships in v2.1** with its own production pass.

### Combined with v1

| Source | Asset Count |
|--------|-----------|
| v1 games (Hold'em, Draw, Blackjack Classic, BJ Competitive) | 51 (per v1 doc) |
| v2.0 Roulette (incl. game-select intro) | 11 |
| v2.0 Three Card Poker (game-specific) | 9 |
| v2.0 TCP game-select intro | 1 |
| v2.1 Craps (incl. game-select intro) | 12 |
| Shared session videos (intro, outro, transitions) | Already counted in v1 |
| **v2.0 New Asset Total** | **21** (11 + 9 + 1) |
| **v2.0 Launch Total (v1 + v2.0)** | **72** (51 v1 + 21 v2.0) |
| **v2.1 Add-on Total (Craps)** | **12** |
| **v2.1 Cumulative Total (v1 + v2.0 + v2.1)** | **84** (51 + 21 + 12) |

### Game-Select Intro Videos (New)

| Asset Key | Content | Duration |
|-----------|---------|----------|
| `game_select_craps` | Dice tumbling across green felt, craps table from above, crowd energy audio. "CRAPS" title card. | 4,000ms |
| `game_select_roulette` | Wheel spinning in slow motion, ball in flight, luxury casino lighting. "ROULETTE" title card. | 4,000ms |
| `game_select_three_card_poker` | Three cards fanning out dramatically, dealer's hands on felt. "THREE CARD POKER" title card. | 4,000ms |

---

# V. Deferred Game Evaluations

## 29. Sic Bo Assessment

### What Is Sic Bo?

Sic Bo is a dice game of Chinese origin played with three dice. Players bet on various outcomes of the dice roll — specific totals, specific numbers appearing, triples, doubles, etc. The dice are traditionally shaken in a chest/cage, which is visually dramatic.

### Party Fit Analysis

| Criterion | Score | Notes |
|-----------|-------|-------|
| Social/Party Appeal | 7/10 | Multiple players bet independently on the same roll. Some communal energy but less than craps (no rotating shooter). |
| Spectator Appeal | 8/10 | Three dice tumbling in a shaking cage is very visual on TV. Fast reveals. |
| Round Speed | 9/10 | Bet -> Shake -> Result. Under 30 seconds. Very fast. |
| Ease of Learning | 6/10 | The betting board has many options (50+ bet types in full Sic Bo). Needs heavy simplification. |
| Strategic Depth | 3/10 | Almost purely luck-based. Bet selection is the only decision. Less strategic than craps. |
| Phone Controller Fit | 7/10 | Betting grid on phone works well. Similar to roulette's controller model. |
| **Overall Party Fit** | **6/10** | Decent but overlaps significantly with craps. Both are dice games. |

### Recommendation: Defer to Phase 3

**Arguments for:**
- Opens the Asian market (Sic Bo is extremely popular in Macau and Asian casinos)
- Simpler rules than craps — lower barrier to entry
- Visual dice cage animation would be spectacular on TV
- Fast rounds suit the party pacing

**Arguments against:**
- Overlaps heavily with craps (both are dice-betting games). Having both in the initial v2 lineup is redundant.
- Lower social energy than craps — no shooter role, less communal investment
- Strategic depth is too low for long sessions without additional meta-mechanics
- Development effort is medium (complex betting board, payout calculations for 50+ bet types)

**Verdict:** Add Sic Bo in **Phase 3** (months 12-18) as part of the Asian market expansion. By then, craps has had time to prove the dice-game model, and Sic Bo can differentiate by offering a simpler, faster alternative. The visual dice cage animation could be repurposed from craps' dice physics engine.

**Estimated DAU impact:** Low-medium. Sic Bo is niche outside Asia. Within the Asian market, it could be a significant draw — potentially +5-10% DAU in that region. Global impact: negligible at launch, meaningful after Asian market localisation.

---

## 30. Let It Ride Assessment

### What Is Let It Ride?

Let It Ride is a poker-based casino game where players receive 3 cards and two community cards are revealed progressively. At each reveal, players can "let it ride" (keep their bet) or "pull back" one of their three equal bets. The final 5-card hand is evaluated using standard poker rankings, with payouts based on hand quality.

### Party Fit Analysis

| Criterion | Score | Notes |
|-----------|-------|-------|
| Social/Party Appeal | 6/10 | Community cards create shared moments (similar to Hold'em). The "let it ride / pull back" decision adds individual tension. But fundamentally, everyone plays against the house, not each other. |
| Spectator Appeal | 7/10 | Community card reveals on TV create progressive tension. Three decision points per hand give multiple dramatic beats. |
| Round Speed | 7/10 | Three decision points slow it slightly compared to TCP. ~45 seconds per round. |
| Ease of Learning | 7/10 | Requires poker hand knowledge but the decisions are binary (ride/pull back). Simpler than Hold'em. |
| Strategic Depth | 4/10 | Optimal strategy is formulaic and well-documented. Limited bluffing or opponent reading. |
| Phone Controller Fit | 8/10 | Phone shows 3 private cards. Two buttons: "Let It Ride" / "Pull Back." Clean UX. |
| **Overall Party Fit** | **6/10** | Decent but doesn't offer enough differentiation from Three Card Poker and Hold'em. |

### Recommendation: Defer to Phase 3

**Arguments for:**
- Community cards create natural shared TV moments (like Hold'em)
- Progressive reveal structure (3 cards -> community 1 -> community 2) builds escalating tension
- Good "bridge" game for players who find Hold'em intimidating but want more depth than TCP
- Simple UX — binary decisions at each step

**Arguments against:**
- Overlaps with both Hold'em (community cards, poker hand rankings) and Three Card Poker (player vs. house, simple decisions)
- Lower strategic depth than Hold'em, lower speed than TCP — falls between two stools
- The "pull back" mechanic, while interesting, doesn't create strong social moments between players
- Development effort is low, but adding another poker variant risks "poker fatigue" in the game menu

**Verdict:** Add Let It Ride in **Phase 3** as a "casual poker" option. It fills the niche between TCP's simplicity and Hold'em's complexity. Best positioned as a Game Night Mode warm-up game or a casual option for groups with mixed poker experience levels.

**Estimated DAU impact:** Low. Let It Ride is not a draw on its own. It adds variety for existing players but is unlikely to attract new users who wouldn't already be interested in Hold'em or TCP. Marginal retention benefit from portfolio diversity.

---

## Appendix A: New Game Constants

```typescript
// ── Craps constants ─────────────────────────────────────────
export const CRAPS_MIN_BET = 10
export const CRAPS_MAX_BET = 500
export const CRAPS_MAX_ODDS_MULTIPLIER = 3
export const CRAPS_BET_TIMEOUT_MS = 30_000
export const CRAPS_ROLL_TIMEOUT_MS = 15_000      // auto-roll if shooter doesn't press
export const CRAPS_FIELD_DOUBLE_ON_2 = true       // Field pays 2x on 2
export const CRAPS_FIELD_TRIPLE_ON_12 = true      // Field pays 3x on 12

export const CRAPS_PLACE_PAYOUTS: Record<number, { pays: number; for: number }> = {
  4: { pays: 9, for: 5 },
  5: { pays: 7, for: 5 },
  6: { pays: 7, for: 6 },
  8: { pays: 7, for: 6 },
  9: { pays: 7, for: 5 },
  10: { pays: 9, for: 5 },
}

export const CRAPS_ODDS_PAYOUTS: Record<number, { pass: [number, number]; dontPass: [number, number] }> = {
  4:  { pass: [2, 1], dontPass: [1, 2] },
  5:  { pass: [3, 2], dontPass: [2, 3] },
  6:  { pass: [6, 5], dontPass: [5, 6] },
  8:  { pass: [6, 5], dontPass: [5, 6] },
  9:  { pass: [3, 2], dontPass: [2, 3] },
  10: { pass: [2, 1], dontPass: [1, 2] },
}

// ── Roulette constants ──────────────────────────────────────
export const ROULETTE_MIN_BET = 5
export const ROULETTE_MAX_INSIDE_BET = 100
export const ROULETTE_MAX_OUTSIDE_BET = 500
export const ROULETTE_MAX_TOTAL_BET = 1_000
export const ROULETTE_BET_TIMEOUT_MS = 45_000     // longer for complex betting
export const ROULETTE_SPIN_DURATION_MS = 6_000
export const ROULETTE_RESULT_DISPLAY_MS = 2_000

export const ROULETTE_RED_NUMBERS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
] as const

export const ROULETTE_BLACK_NUMBERS = [
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
] as const

export const ROULETTE_PAYOUTS: Record<RouletteBetType, number> = {
  straight_up: 35,
  split: 17,
  street: 11,
  corner: 8,
  six_line: 5,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  high: 1,
  low: 1,
  dozen_1: 2,
  dozen_2: 2,
  dozen_3: 2,
  column_1: 2,
  column_2: 2,
  column_3: 2,
}

// ── Three Card Poker constants ──────────────────────────────
export const TCP_MIN_ANTE = 10
export const TCP_MAX_ANTE = 500
export const TCP_MAX_PAIR_PLUS = 100
export const TCP_BET_TIMEOUT_MS = 20_000
export const TCP_DECISION_TIMEOUT_MS = 15_000

export const TCP_ANTE_BONUS: Record<TCPHandRank, number> = {
  straight_flush: 5,
  three_of_a_kind: 4,
  straight: 1,
  flush: 0,
  pair: 0,
  high_card: 0,
}

export const TCP_PAIR_PLUS_PAYOUTS: Record<TCPHandRank, number> = {
  straight_flush: 40,
  three_of_a_kind: 30,
  straight: 6,
  flush: 3,
  pair: 1,
  high_card: 0,  // lose
}

// ── All dealer characters (combined) ────────────────────────
export const CRAPS_DEALER_CHARACTERS = ['lucky_luciano', 'diamond_dolores'] as const
export const ROULETTE_DEALER_CHARACTERS = ['pierre_beaumont', 'veronica_lane'] as const
// TCP shares blackjack dealers: ['ace_malone', 'scarlett_vega', 'chip_dubois']

export const ALL_DEALER_CHARACTERS = [
  ...DEALER_CHARACTERS,                   // poker: vincent, maya, remy, jade
  ...BLACKJACK_DEALER_CHARACTERS,         // blackjack + TCP: ace_malone, scarlett_vega, chip_dubois
  ...CRAPS_DEALER_CHARACTERS,             // craps: lucky_luciano, diamond_dolores
  ...ROULETTE_DEALER_CHARACTERS,          // roulette: pierre_beaumont, veronica_lane
] as const
```

## Appendix B: VoiceIntent Type Extension (v2)

```typescript
export type VoiceIntent =
  // ... existing intents from v1 ...
  // Game selection intents (add new games)
  | 'select_craps' | 'select_roulette' | 'select_three_card_poker'
  // Craps intents
  | 'craps_pass_line' | 'craps_dont_pass'
  | 'craps_come' | 'craps_dont_come'
  | 'craps_place' | 'craps_field' | 'craps_odds'
  | 'craps_roll' | 'craps_set_amount'
  | 'craps_no_bet' | 'craps_confirm_bets'
  // Roulette intents
  | 'roulette_red' | 'roulette_black'
  | 'roulette_straight' | 'roulette_split'
  | 'roulette_odd_even' | 'roulette_high_low'
  | 'roulette_dozen' | 'roulette_column'
  | 'roulette_repeat' | 'roulette_clear'
  | 'roulette_confirm' | 'roulette_no_bet'
  // Three Card Poker intents
  | 'tcp_ante' | 'tcp_pair_plus'
  | 'tcp_play' | 'tcp_fold' | 'tcp_confirm'
```

## Appendix C: Game Selection Voice Commands (v2)

| Voice Command | Intent | Phase |
|---------------|--------|-------|
| "play craps" / "craps" / "shoot dice" | `select_craps` | GAME_SELECT |
| "play roulette" / "roulette" / "spin the wheel" | `select_roulette` | GAME_SELECT |
| "three card poker" / "three card" / "TCP" | `select_three_card_poker` | GAME_SELECT |

## Appendix D: Controller Phase Routing (v2)

```typescript
function ControllerPhaseRouter() {
  const phase = usePhase()
  const state = useStateSync() as CasinoGameState | null

  if (!phase) return <ConnectingView />
  if (phase === 'LOBBY') return <ControllerLobby />
  if (phase === 'GAME_SELECT') return <GameSelectController />

  switch (state?.selectedGame) {
    case 'holdem':
      return <HoldemControllerGameplay phase={phase} />
    case 'five_card_draw':
      return <FiveCardDrawController phase={phase} />
    case 'blackjack_classic':
      return <BlackjackClassicController phase={phase} />
    case 'blackjack_competitive':
      return <BlackjackCompetitiveController phase={phase} />
    // New v2 games
    case 'craps':
      return <CrapsController phase={phase} />
    case 'roulette':
      return <RouletteController phase={phase} />
    case 'three_card_poker':
      return <ThreeCardPokerController phase={phase} />
    default:
      return <ControllerLobby />
  }
}
```

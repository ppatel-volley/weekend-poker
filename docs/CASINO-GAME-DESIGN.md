# Weekend Casino — Game Design Document

> **Status:** Final
> **Authority:** Technical game design for Weekend Casino. Authoritative for state shapes, phase flows, reducer/thunk specifications, and video integration patterns.
> **Last Aligned:** 2026-02-28
> **Canonical Decisions:** See `docs/CANONICAL-DECISIONS.md`
> **Supersedes:** — | **Superseded By:** —
>
> **Version:** 2.2
> **Date:** 2026-02-28
> **Author:** Senior Game Designer

### Revision Log (v2.2)

> Addresses cross-document contradictions identified in `docs/codex-feedback.md`:
>
> **ASSETS-1:** Cleaned up Section 28 — removed stale 77-asset language from cross-reference header. Confirmed alignment with `docs/CASINO-VIDEO-ASSETS.md` v2 (**51 assets**). Historical cross-reference tables retained as reference only; resolution notes updated for clarity.

### Revision Log (v2.1)

> Addresses ALL items from the principal engineer review (`docs/REVIEW-GAME-DESIGN-PRINCIPAL.md`): 6 critical issues, 4 major concerns, 6 minor issues, 3 video-critical issues, 3 video-major issues, 2 video-minor issues, and 8 recommended changes (RC-1 through RC-8).
>
> **Critical fixes (C1-C6):**
> - C1: Replaced all `endIf: () => true` immediate transitions with explicit state flags
> - C2: Removed poker helper reuse in dynamic `next` routing; each game has its own routing functions
> - C3: Every reducer and thunk now explicitly declares its scope (root vs phase-scoped)
> - C4: Separate `setDrawHoleCards` reducer; `setHoleCards` stays typed as `[Card, Card]` for Hold'em
> - C5: Full multi-game server-side state design (`ServerGameState` replaces `ServerHandState`)
> - C6: Inverted inheritance: `CasinoGameState` is now a flat union, NOT extending `PokerGameState`
>
> **Major fixes (M1-M4):**
> - M1: Wallet/stack sync points defined at game-start and game-end boundaries
> - M2: `availableActions` is computed, never stored — removed from `BlackjackHand` interface
> - M3: Competitive Blackjack simultaneous play deferred to v2; v1 uses sequential turns
> - M4: `evaluateHand` works with any hand size >= 5 (confirmed via `combinations5` logic)
>
> **Video integration fixes (V-CRITICAL, V-MAJOR, V-MINOR):**
> - V-CRITICAL-1: `startVideo` reducer no longer calls `Date.now()` — renamed to `setVideoPlayback` pure reducer; timestamp passed from caller
> - V-CRITICAL-2: `endIf` no longer uses `Date.now()` for video timeout — replaced with server-side scheduled thunk (`VIDEO_HARD_TIMEOUT`)
> - V-CRITICAL-3: Display's `completeVideo` dispatch is now an optimisation, not the primary mechanism — server timer is the source of truth
> - V-MAJOR-1: Added overlay priority system (`low`/`medium`/`high`/`critical`), cooldown, and per-round cap for blackjack
> - V-MAJOR-2: Replaced unrealistic bulk preloading with priority queue (max 3 concurrent), sprite sheets for short overlays, graceful degradation
> - V-MAJOR-3: Split video state into `videoPlayback` (foreground) and `backgroundVideo` (ambient loops) — prevents overlay eviction
> - V-MINOR-1: Corrected asset count from ~49 to 51 (recount: 7+9+10+16+9)
> - V-MINOR-3: Added `skipDelayMs` and `priority` to `VideoPlayback` interface for per-video skip timing
>
> **Minor / recommended changes (RC-1 through RC-8, Reviews 2.6-3.6):**
> - RC-6: Added Appendix C2 (Ruleset File Structure) — per-game file organisation
> - RC-8: All-in skip draw phase in `drawBetting1NextPhase` routing
> - Review 2.6: Added loop guard (`MAX_DEALER_CARDS = 21`) and shoe exhaustion check in `playDealerHand`
> - Review 2.7: Clarified `selectedForDiscard: Set<number>` is local React state, not VGF state
> - Review 2.8: Explicit `rankToNumeric` definition (A=14) with required test cases for straight edge cases
> - Review 3.1: Documented Hold'em phase naming ambiguity (unprefixed `SHOWDOWN` vs `DRAW_SHOWDOWN`)
> - Review 3.2: Created `BlackjackDifficulty` type separate from `BotDifficulty`
> - Review 3.3: Cleaned up Appendix B (removed working-draft self-corrections)
> - Review 3.5: Added Appendix C3 (Error Handling) — reducer failure, thunk failure, shoe corruption, connection recovery
> - Review 3.6: Added Appendix C4 (Phase Context Adapter Pattern) — documents `adaptPhaseCtx` for new games

---

## Table of Contents

### I. Multi-Game Architecture
1. [Platform Overview](#1-platform-overview)
2. [Game Selection Lobby](#2-game-selection-lobby)
3. [Multi-Ruleset Architecture](#3-multi-ruleset-architecture)
4. [Shared Player Wallet](#4-shared-player-wallet)

### II. 5-Card Draw Poker
5. [5-Card Draw Rules Specification](#5-5-card-draw-rules-specification)
6. [5-Card Draw Phase Flow](#6-5-card-draw-phase-flow)
7. [5-Card Draw State Shape](#7-5-card-draw-state-shape)
8. [5-Card Draw Controller UX](#8-5-card-draw-controller-ux)
9. [5-Card Draw Display & 3D](#9-5-card-draw-display--3d)

### III. Blackjack — Classic Dealer Mode
10. [Blackjack Classic Rules Specification](#10-blackjack-classic-rules-specification)
11. [Blackjack Classic Phase Flow](#11-blackjack-classic-phase-flow)
12. [Blackjack Classic State Shape](#12-blackjack-classic-state-shape)
13. [Blackjack Classic Controller UX](#13-blackjack-classic-controller-ux)
14. [Blackjack Classic Display & 3D](#14-blackjack-classic-display--3d)

### IV. Blackjack — Competitive Variant
15. [Competitive Blackjack Rules](#15-competitive-blackjack-rules)
16. [Competitive Blackjack Phase Flow & State](#16-competitive-blackjack-phase-flow--state)

### V. Shared Design Elements
17. [Dealer Characters](#17-dealer-characters)
18. [Voice Commands](#18-voice-commands)
19. [Controller Adaptation](#19-controller-adaptation)
20. [Shared Constants & Configuration](#20-shared-constants--configuration)

### VI. Video Integration
21. [Video System Architecture](#21-video-system-architecture)
22. [Shared Video Triggers](#22-shared-video-triggers)
23. [Hold'em Video Integration Points](#23-holdem-video-integration-points)
24. [5-Card Draw Video Integration Points](#24-5-card-draw-video-integration-points)
25. [Blackjack Classic Video Integration Points](#25-blackjack-classic-video-integration-points)
26. [Blackjack Competitive Video Integration Points](#26-blackjack-competitive-video-integration-points)
27. [Video Playback State & Constants](#27-video-playback-state--constants)

---

# I. Multi-Game Architecture

## 1. Platform Overview

Weekend Casino extends the existing Weekend Poker platform from a single Texas Hold'em game into a multi-game casino platform. The platform retains the core VGF architecture (server-authoritative, Redux-inspired state, phase-based flow, Display TV + Controller phone) and adds two new games: **5-Card Draw Poker** and **Blackjack**.

All three games share:
- The same VGF server instance and session
- The same player connection model (QR code join, Socket.IO transport)
- The same Display/Controller split (TV shows table, phone shows private info + controls)
- The same voice pipeline (push-to-talk on controller, Recognition Service STT, server-side intent parsing)
- The same hand evaluator (poker games only — shared `evaluateHand` from the poker engine)
- The same blind/ante system (poker games share `BlindLevel` from `@weekend-poker/shared`)
- A shared player wallet that persists across game changes within a session

---

## 2. Game Selection Lobby

### Design

The Game Selection Lobby replaces the existing `LOBBY` phase as the entry point. When players first connect, they land in the lobby. The host (first connected player, or whoever holds the "dealer button" equivalent) selects the game. Between hands/rounds, the host can switch games. Vote-based game switching (where any player can propose a change) is deferred to v2.

### Phase: `GAME_SELECT`

This phase sits between `LOBBY` (player connection/readiness) and each game's first phase.

```
LOBBY --> GAME_SELECT --> [Selected Game's First Phase]
```

**Phase definition:**

| Property | Value |
|----------|-------|
| `onBegin` | Reset any game-specific state; preserve player list + wallets. Display game selection UI on TV and controllers. |
| `endIf` | `state.selectedGame !== null && state.gameSelectConfirmed === true` |
| `next` | Dynamic: routes to the first phase of the selected game (see routing table below) |
| `onEnd` | Freeze `selectedGame`; initialise game-specific state fields. |

**Routing table:**

| `selectedGame` | Next Phase |
|----------------|------------|
| `'holdem'` | `POSTING_BLINDS` |
| `'five_card_draw'` | `DRAW_POSTING_BLINDS` |
| `'blackjack_classic'` | `BJ_PLACE_BETS` |
| `'blackjack_competitive'` | `BJC_PLACE_BETS` |

### Can Players Change Games Between Rounds?

Yes. The `HandComplete` / `BJSettlement` phases check a `gameChangeRequested` flag. If set, the next phase routes to `GAME_SELECT` instead of starting another hand/round.

**State fields for game selection:**

```typescript
type CasinoGame = 'holdem' | 'five_card_draw' | 'blackjack_classic' | 'blackjack_competitive'

// Added to shared game state
selectedGame: CasinoGame | null
gameSelectConfirmed: boolean
gameChangeRequested: boolean               // v1: host-only; v2: any player via vote
gameChangeVotes: Record<string, CasinoGame>  // v2 only — vote-based game switching deferred
```

### Controller UX — Game Selection

The controller displays a vertical list of game cards:
- **Texas Hold'em** — icon: poker chips + community cards
- **5-Card Draw** — icon: hand of 5 cards, fanned
- **Blackjack (Classic)** — icon: ace + face card
- **Blackjack (Competitive)** — icon: crossed swords + cards

The host taps to select. Other players see the selection in real time and can confirm via a "Ready" button (reuses existing lobby ready mechanism). For v1, only the host can initiate a game change (between hands/rounds). Vote-based game changing (any player proposes, majority required) is deferred to v2.

### Display UX — Game Selection

The TV shows an animated carousel of game options with card-table-themed backgrounds. The currently highlighted game shows a brief rules summary and a preview of the table layout. The dealer character introduces each game as the carousel scrolls.

---

## 3. Multi-Ruleset Architecture

### Approach: Single Session, Phase-Namespaced Games

Rather than creating separate `GameRuleset` instances per game and spinning up new sessions, we use **a single expanded `GameRuleset`** with phase namespaces. This avoids the complexity of session switching and preserves the player list and wallet state seamlessly.

**Why not separate rulesets?**
- VGF sessions are tied 1:1 to a ruleset. Switching rulesets means creating a new session, which disconnects all clients.
- Players' wallet balances would need to be persisted and restored across sessions — adding a persistence layer that doesn't exist in the current architecture.
- The shared reducers (addPlayer, removePlayer, wallet management) would be duplicated across rulesets.

**Phase namespace convention:**

| Game | Phase Prefix | Example |
|------|-------------|---------|
| Hold'em | *(none — existing)* | `POSTING_BLINDS`, `PRE_FLOP_BETTING` |
| 5-Card Draw | `DRAW_` | `DRAW_POSTING_BLINDS`, `DRAW_BETTING_1` |
| Blackjack Classic | `BJ_` | `BJ_PLACE_BETS`, `BJ_DEAL_INITIAL` |
| Blackjack Competitive | `BJC_` | `BJC_PLACE_BETS`, `BJC_PLAYER_TURNS` |
| Shared | *(none)* | `LOBBY`, `GAME_SELECT` |

> **[Review 3.1 note]** Hold'em phases are unprefixed because they are the original game. This creates a naming ambiguity: `SHOWDOWN` and `HAND_COMPLETE` are Hold'em-specific but their names look generic. They are NOT shared phases — each game has its own: `DRAW_SHOWDOWN`, `DRAW_HAND_COMPLETE`, `BJ_SETTLEMENT`, `BJ_HAND_COMPLETE`, etc. A future refactor could add a `HE_` prefix for Hold'em phases (e.g., `HE_SHOWDOWN`) for full consistency, but this is deferred to avoid a breaking change to the existing poker codebase.

**Reducers and thunks** are registered globally (shared) plus per-game in the relevant phase definitions. Game-specific reducers are scoped to their phases — e.g., `discardCards` only exists in `DRAW_DRAW_PHASE`.

### State Shape Strategy

> **[C6 FIX]** `CasinoGameState` does NOT extend `PokerGameState`. Extending forces every game to carry poker-specific fields (`communityCards`, `sidePots`, `minRaiseIncrement`, etc.) that are meaningless in blackjack. Instead, `CasinoGameState` defines a flat shared base with game-specific sub-objects. The existing `PokerGameState` fields are wrapped inside a `holdem?: HoldemState` sub-object.

```typescript
/** Shared base — no game-specific fields at the root level */
interface CasinoGameState {
  // VGF required
  [key: string]: unknown
  phase: CasinoPhase
  previousPhase?: CasinoPhase

  // Multi-game fields
  selectedGame: CasinoGame | null
  gameSelectConfirmed: boolean
  gameChangeRequested: boolean               // v1: host-only trigger
  gameChangeVotes: Record<string, CasinoGame> // v2 only — vote-based switching deferred

  // Shared wallet (replaces per-game stacks for cross-game play)
  wallet: Record<string, number>  // playerId -> balance

  // Shared player roster (all games use the same player list)
  players: CasinoPlayer[]

  // Shared table config
  dealerCharacterId: string
  blindLevel: BlindLevel
  handNumber: number
  dealerIndex: number

  // Shared lobby state
  lobbyReady: boolean

  // Shared TTS / dealer
  dealerMessage: string | null
  ttsQueue: TTSMessage[]

  // Session tracking
  sessionStats: SessionStats

  // Video playback (Section VI)
  videoPlayback?: VideoPlayback

  // Game-specific state (only populated when that game is active)
  holdem?: HoldemState
  fiveCardDraw?: FiveCardDrawState
  blackjack?: BlackjackState
  blackjackCompetitive?: BlackjackCompetitiveState
}

/** Shared player type — game-specific player data lives in sub-states */
interface CasinoPlayer {
  id: string
  name: string
  seatIndex: number
  isBot: boolean
  botConfig?: BotConfig
  isConnected: boolean
  sittingOutHandCount: number
}

/** Hold'em-specific state (previously the poker-only fields on PokerGameState) */
interface HoldemState {
  players: HoldemPlayerState[]  // poker-specific per-player (stack, bet, status, lastAction)
  communityCards: Card[]
  pot: number
  sidePots: SidePot[]
  currentBet: number
  minRaiseIncrement: number
  activePlayerIndex: number
  holeCards: Record<string, [Card, Card]>
  handHistory: HandAction[]
  lastAggressor: string | null
  dealingComplete: boolean
}

/** Poker-specific player fields */
interface HoldemPlayerState {
  playerId: string
  stack: number
  bet: number
  status: PlayerStatus
  lastAction: PlayerAction | null
}
```

**Migration note:** The existing `PokerGameState` interface is preserved in `@weekend-poker/shared` for backwards compatibility during the transition. A `toHoldemState(pokerGameState)` adapter extracts the poker-specific fields into the new `HoldemState` shape.

Each game's sub-state is initialised when entering that game's first phase and cleared when leaving. This keeps the state reasonably small and prevents stale data from one game leaking into another.

---

## 4. Shared Player Wallet

Players carry a single chip balance across all games within a session. The `wallet` field on the root state replaces the per-player `stack` field for cross-game tracking.

```typescript
// Wallet management reducers (global)
updateWallet: (state, playerId: string, delta: number) => {
  const current = state.wallet[playerId] ?? 0
  return {
    ...state,
    wallet: { ...state.wallet, [playerId]: current + delta },
  }
}

setWalletBalance: (state, playerId: string, amount: number) => {
  return {
    ...state,
    wallet: { ...state.wallet, [playerId]: amount },
  }
}
```

When a game starts, the player's game-local balance is funded from the wallet. When a hand/round completes, the game-local balance syncs back to the wallet. The wallet balance is displayed on both the controller and the Display HUD at all times.

**Starting balance:** Configurable (1,000-50,000 chips; default **10,000**). The `STARTING_WALLET` constant replaces the poker-only `STARTING_STACK`. Rebuys replenish the wallet (unlimited rebuys for v1 — this is a social game).

> **[M1 FIX]** Wallet/stack sync points — precisely defined:

**Sync Point 1 — Game Start (entering a game's first phase):**
In each game's first phase `onBegin` (e.g., `DRAW_POSTING_BLINDS.onBegin`, `BJ_PLACE_BETS.onBegin`):
1. Read each player's `wallet[playerId]` balance
2. Set the game-local balance (e.g., `holdem.players[i].stack`, `blackjack.bets[i].mainBet`)
3. The wallet is NOT deducted here — the game's own reducers track in-game money flow

**Sync Point 2 — Hand/Round End (at `*_HAND_COMPLETE.onEnd`):**
1. Calculate each player's net result for the hand (winnings - buy-in for that hand)
2. Apply delta to `wallet[playerId]` via the root `updateWallet` reducer
3. Clear the game-specific sub-state balance fields

**Sync Point 3 — Game Switch (exiting to `GAME_SELECT`):**
1. Same as Sync Point 2 — settle any in-progress game state
2. Clear the game sub-state entirely

**Single source of truth rule:** During active gameplay, the game sub-state's balance fields are the live values. The root `wallet` is a snapshot that is only updated at sync points. The controller displays `wallet[playerId]` between hands and the game-local balance during hands.

---

# II. 5-Card Draw Poker

## 5. 5-Card Draw Rules Specification

### Overview

5-Card Draw is a classic poker variant where each player receives 5 private cards, with one draw round to exchange cards, sandwiched between two betting rounds. It uses the same standard poker hand rankings as Texas Hold'em.

### Ante Structure

5-Card Draw uses the **same `BlindLevel` system** as Texas Hold'em. The blinds structure from `@weekend-poker/shared/constants/poker.ts` applies identically:

| Level | Small Blind | Big Blind | Min Buy-In | Max Buy-In |
|-------|-------------|-----------|------------|------------|
| 1 | 5 | 10 | 200 | 1,000 |
| 2 | 10 | 20 | 400 | 2,000 |
| 3 | 25 | 50 | 1,000 | 5,000 |
| 4 | 50 | 100 | 2,000 | 10,000 |
| 5 | 100 | 200 | 4,000 | 20,000 |

The dealer button rotates identically to Hold'em. Small and big blinds are posted by the two players to the left of the dealer.

### Deal

Each player receives **5 cards**, dealt one at a time clockwise starting from the player to the left of the dealer button. All cards are private (no community cards).

### First Betting Round

Begins with the player to the left of the big blind (UTG equivalent). Standard no-limit betting rules apply:
- **Actions:** Fold, Check (if no bet facing), Call, Bet/Raise, All-In
- **Min raise:** Equal to the big blind or the size of the last raise, whichever is larger (same `minRaiseIncrement` logic as Hold'em)
- Round ends when all active players have acted and bets are equalised (same logic as Hold'em's betting completion, but implemented in its own `isDrawBettingComplete` function — see [C2 FIX])

### Draw Phase

After the first betting round, each remaining (non-folded) player may discard **0 to 3 cards** and receive replacements from the deck. The draw proceeds clockwise starting from the player to the left of the dealer.

**Draw rules:**
- A player may discard 0 cards ("stand pat")
- A player may discard 1, 2, or 3 cards
- Discarded cards are removed from the player's hand and placed face-down in a discard pile (not returned to the deck)
- Replacement cards are dealt from the top of the remaining deck
- If the deck runs low (fewer cards than needed for remaining draws), the discard pile is shuffled and used as a replacement deck — but this is extremely unlikely with 4 players max (20 cards dealt + up to 12 discarded vs 52 card deck)

**Draw order:** Sequential, clockwise from left of dealer. Each player selects and confirms their discards before the next player's turn.

### Second Betting Round

Begins with the first active player to the left of the dealer button (not the big blind — post-draw betting starts from the same position as post-flop betting in Hold'em). Same rules as the first betting round.

### Showdown

If two or more players remain after the second betting round, hands are revealed and compared. The **same `evaluateHand` function** from the poker engine is used, but with a 5-card input rather than 7-card input.

**Implementation note on `evaluateHand`:**

> **[M4 FIX]** Confirmed: the existing `evaluateHand` function in `hand-evaluator.ts` works with any hand size >= 5. The `combinations5(cards)` helper generates C(n,5) combinations. For a 5-card input, C(5,5) = 1 combination — it evaluates the hand directly. For a 7-card Hold'em input, C(7,5) = 21 combinations and picks the best. The function signature accepts `Card[]` with no length constraint. **However**, this has not been tested with exactly 5 cards in the existing test suite. A regression test should be added before implementation:

```typescript
// Required test: evaluateHand with exactly 5 cards
test('evaluateHand works with 5-card input', () => {
  const royalFlush: Card[] = [
    { rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'spades' },
    { rank: 'Q', suit: 'spades' }, { rank: 'J', suit: 'spades' },
    { rank: '10', suit: 'spades' },
  ]
  const result = evaluateHand(royalFlush)
  expect(result.category).toBe(HandCategory.ROYAL_FLUSH)
})
```

### Hand Rankings

Identical to Texas Hold'em. From best to worst:
1. Royal Flush
2. Straight Flush
3. Four of a Kind
4. Full House
5. Flush
6. Straight
7. Three of a Kind
8. Two Pair
9. One Pair
10. High Card

---

## 6. 5-Card Draw Phase Flow

```
LOBBY --> GAME_SELECT --> DRAW_POSTING_BLINDS --> DRAW_DEALING --> DRAW_BETTING_1
  --> DRAW_DRAW_PHASE --> DRAW_BETTING_2 --> DRAW_SHOWDOWN --> DRAW_POT_DISTRIBUTION
  --> DRAW_HAND_COMPLETE --> (loop to DRAW_POSTING_BLINDS or GAME_SELECT)
```

### Phase Definitions

#### `DRAW_POSTING_BLINDS`

| Property | Value |
|----------|-------|
| `onBegin` | Initialise `fiveCardDraw` sub-state via `initDrawState` reducer. Increment `handNumber`. Rotate dealer button. Post small blind and big blind. Fund game-local stacks from wallets (M1 Sync Point 1). |
| `endIf` | Both blinds posted: `players.some(p => p.lastAction === 'post_small_blind' && p.bet > 0) && players.some(p => p.lastAction === 'post_big_blind' && p.bet > 0)` |
| `next` | `'DRAW_DEALING'` |
| `onEnd` | — |

**Note:** This is functionally identical to the existing Hold'em `POSTING_BLINDS` phase. The implementation can call the same helper functions (`getSmallBlindIndex`, `getBigBlindIndex`, `rotateDealerButtonFn`).

#### `DRAW_DEALING`

| Property | Value |
|----------|-------|
| `onBegin` | Create and shuffle a fresh deck. Deal 5 cards to each active player, one at a time, clockwise from left of dealer. Store deck remainder and hole cards in `ServerGameState.draw`. Broadcast hole cards via `setDrawHoleCards` reducer (5-card hands in `fiveCardDraw.holeCards: Record<string, Card[]>`). Set `fiveCardDraw.dealingComplete = true`. |
| `endIf` | `state.fiveCardDraw?.dealingComplete === true` |
| `next` | `'DRAW_BETTING_1'` |
| `onEnd` | Reset `fiveCardDraw.dealingComplete` to `false`. |

> **[C4 FIX]** Hold'em's `holeCards: Record<string, [Card, Card]>` is NOT widened. 5-Card Draw has its own `fiveCardDraw.holeCards: Record<string, Card[]>` field and its own `setDrawHoleCards` reducer. This preserves Hold'em's tuple type safety — any code accessing `holdem.holeCards[playerId]` still gets `[Card, Card]`, not a loosened `Card[]` that could be any length.

#### `DRAW_BETTING_1`

| Property | Value |
|----------|-------|
| `onBegin` | Set active player to UTG (first active player left of big blind). Set `fiveCardDraw.currentBet` to big blind amount. |
| `endIf` | `isDrawBettingComplete(state) \|\| isDrawOnlyOnePlayerRemaining(state)` |
| `next` | `drawBetting1NextPhase(state)` — see below |
| `onEnd` | `updateDrawPot` reducer (collect bets into pot, calculate side pots). |

> **[C2 FIX]** `isDrawBettingComplete` and `drawBetting1NextPhase` are 5-Card Draw-specific functions, NOT reused from Hold'em's `bettingEndIf` / `bettingNextPhase`. Hold'em helpers hardcode Hold'em phase names; draw needs its own.

```typescript
function drawBetting1NextPhase(state: CasinoGameState): CasinoPhase {
  if (isDrawOnlyOnePlayerRemaining(state)) return CasinoPhase.DrawHandComplete
  // [RC-8 FIX] If all remaining players are all-in, skip the draw phase entirely
  if (isDrawAllRemainingAllIn(state)) return CasinoPhase.DrawShowdown
  return CasinoPhase.DrawDrawPhase
}
```

#### `DRAW_DRAW_PHASE`

| Property | Value |
|----------|-------|
| `onBegin` | Set `drawPhaseActive = true`. Set active player to first active player left of dealer. Initialise `drawSelections` as empty for all active players. |
| `endIf` | All active (non-folded, non-all-in) players have confirmed their draw: `state.fiveCardDraw.allDrawsComplete === true` |
| `next` | `'DRAW_BETTING_2'` |
| `onEnd` | Set `drawPhaseActive = false`. Reset `drawSelections`. |

**Sub-state management during draw phase:**

The draw phase requires tracking per-player card selections. This is stored in `fiveCardDraw.drawSelections`:

```typescript
interface DrawSelection {
  playerId: string
  discardIndices: number[]  // indices (0-4) of cards to discard
  confirmed: boolean
}
```

When a player confirms their draw:
1. The `confirmDraw` reducer marks their selection as confirmed
2. The `executeDraw` thunk:
   - Removes the discarded cards from the player's hand
   - Deals replacement cards from the deck (via `ServerGameState.draw`)
   - Updates `holeCards` with the new hand
   - Adds discarded cards to the discard pile
   - Advances `activePlayerIndex` to the next player who hasn't drawn
3. When all players have drawn, sets `allDrawsComplete = true`

#### `DRAW_BETTING_2`

| Property | Value |
|----------|-------|
| `onBegin` | Set active player to first active player left of dealer. Reset `fiveCardDraw.currentBet` to 0. Reset `fiveCardDraw.minRaiseIncrement` to big blind. Reset all players' `lastAction` to null. |
| `endIf` | `isDrawBettingComplete(state) \|\| isDrawOnlyOnePlayerRemaining(state)` |
| `next` | `drawBetting2NextPhase(state)` — see below |
| `onEnd` | `updateDrawPot` reducer. |

> **[C2 FIX]** Own routing function, not Hold'em's `bettingNextPhase`.

```typescript
function drawBetting2NextPhase(state: CasinoGameState): CasinoPhase {
  if (isDrawOnlyOnePlayerRemaining(state)) return CasinoPhase.DrawHandComplete
  return CasinoPhase.DrawShowdown
}
```

#### `DRAW_SHOWDOWN`

| Property | Value |
|----------|-------|
| `onBegin` | Reveal all remaining players' hands on the Display. The hand evaluator runs to determine the winner. Set `fiveCardDraw.showdownComplete = true`. |
| `endIf` | `state.fiveCardDraw?.showdownComplete === true` |
| `next` | `'DRAW_POT_DISTRIBUTION'` |

> **[C1 FIX]** Previously `endIf: () => true`. Now uses an explicit state flag set in `onBegin`. This prevents cascading transition issues — `onBegin` runs first, sets the flag, then `endIf` checks it on the next tick when a reducer fires.

#### `DRAW_POT_DISTRIBUTION`

| Property | Value |
|----------|-------|
| `onBegin` | Call `resolveDrawWinners` (5-Card Draw variant of `resolveWinners` — see C2 fix below). Dispatch `awardPot` with winner IDs and amounts. Set `fiveCardDraw.potDistributed = true`. |
| `endIf` | `state.fiveCardDraw?.potDistributed === true` |
| `next` | `'DRAW_HAND_COMPLETE'` |

> **[C1 FIX]** Explicit flag `potDistributed` replaces `() => true`.

#### `DRAW_HAND_COMPLETE`

| Property | Value |
|----------|-------|
| `onBegin` | Mark busted players (wallet === 0). Update session stats. Sync wallet (M1 Sync Point 2). Set `fiveCardDraw.handCompleteReady = true`. |
| `endIf` | `state.fiveCardDraw?.handCompleteReady === true` |
| `next` | If `gameChangeRequested`: `'GAME_SELECT'`. If fewer than `MIN_PLAYERS_TO_START` playable: `'LOBBY'`. Otherwise: `'DRAW_POSTING_BLINDS'`. |

> **[C1 FIX]** Explicit flag `handCompleteReady` replaces `() => true`.

---

## 7. 5-Card Draw State Shape

```typescript
interface FiveCardDrawState {
  /** Per-player draw-specific state */
  players: DrawPlayerState[]

  /** Hole cards per player (5-card hands) — separate from Hold'em's [Card, Card] */
  holeCards: Record<string, Card[]>  // [C4 FIX] Own field, not shared with Hold'em

  /** Pot and betting (own fields, not sharing Hold'em's root-level pot) */
  pot: number
  sidePots: SidePot[]
  currentBet: number
  minRaiseIncrement: number
  activePlayerIndex: number

  /** Whether the draw phase is currently active */
  drawPhaseActive: boolean

  /** Per-player draw selections during the draw phase */
  drawSelections: DrawSelection[]

  /** Whether all active players have completed their draw */
  allDrawsComplete: boolean

  /** Cards discarded this hand (for deck exhaustion fallback) */
  discardPile: Card[]

  /** Index of the player currently selecting cards to draw (during draw phase) */
  drawActivePlayerIndex: number

  /** [C1 FIX] Explicit phase transition flags */
  dealingComplete: boolean
  showdownComplete: boolean
  potDistributed: boolean
  handCompleteReady: boolean

  /** Hand history for this hand */
  handHistory: HandAction[]
  lastAggressor: string | null
}

interface DrawPlayerState {
  playerId: string
  stack: number
  bet: number
  status: PlayerStatus
  lastAction: PlayerAction | null
}

interface DrawSelection {
  playerId: string
  /** Card indices (0-4) selected for discard. Empty = stand pat. */
  discardIndices: number[]
  /** Has the player confirmed their draw selection? */
  confirmed: boolean
  /** How many cards were drawn (set after execution) */
  cardsDrawn: number
}
```

**Relationship to root state:**

The `fiveCardDraw` field on `CasinoGameState` holds this sub-state. It is initialised in `DRAW_POSTING_BLINDS.onBegin` and cleared in `DRAW_HAND_COMPLETE.onEnd` (or when switching to a different game).

> **[C4 FIX]** 5-Card Draw has its own `fiveCardDraw.holeCards: Record<string, Card[]>` field. Hold'em's `holdem.holeCards: Record<string, [Card, Card]>` is untouched. The `ServerGameState` (see C5) also separates deck/hole-card storage per game.

---

## 8. 5-Card Draw Controller UX

### Hand Display

The controller shows all 5 of the player's cards in a horizontal fan layout. Each card is tappable during the draw phase.

**Card layout:**
- 5 cards arranged in a slight arc (fan shape)
- Each card: 60px wide x 90px tall (slightly smaller than Hold'em's 80x120 to fit 5 across)
- Cards overlap by ~15px to fit comfortably on narrow phone screens
- Suit colour coding: red for hearts/diamonds, white for spades/clubs (same as Hold'em)

### Betting Controls

**Identical to Hold'em.** The same `ControllerGameplay` component and action button grid apply:
- FOLD (red)
- CHECK / CALL $X (blue)
- RAISE (orange) with slider
- ALL IN $X (pink)

The existing `processPlayerAction` thunk handles the same `PlayerAction` type.

### Draw Phase Controls

During the draw phase, the controller switches to a **draw selection mode**:

1. **Card selection:** Each of the 5 cards becomes tappable. Tapping a card toggles its "discard" state (visually: card slides up ~20px and gets a red border/overlay)
2. **Selection counter:** Text at the top reads "Select 0-3 cards to discard" with a live count: "Discarding: X cards"
3. **Confirm button:** A large green "CONFIRM DRAW" button at the bottom. If 0 cards selected, the button reads "STAND PAT". If >3 cards selected, the button is disabled with the text "Max 3 cards"
4. **Timer:** The same `ACTION_TIMEOUT_MS` (30 seconds) applies. If the timer expires, the player automatically stands pat (draws 0)

**Controller state during draw** (local React state only — NOT synced through VGF):
- `selectedForDiscard: Set<number>` — indices 0-4 of cards toggled for discard [Review 2.7: this is purely local `useState` on the controller — `Set` is not JSON-serialisable and MUST NOT enter VGF state]
- On confirm: dispatches `confirmDraw` reducer with the selected indices
- After draw execution: the controller's `holeCards` updates via VGF state sync with the new 5-card hand

### Draw Confirmation Flow

```
1. Player sees 5 cards with text: "Select cards to discard (0-3)"
2. Player taps cards to toggle discard selection
   - Selected cards: slide up, red border, slight opacity reduction
   - Deselected cards: normal position
3. Player taps "CONFIRM DRAW" / "STAND PAT"
4. Server executes draw:
   - Removes discarded cards
   - Deals replacements from deck
   - Updates holeCards in state
5. Controller animates: old cards fade out, new cards fade in
6. Text changes to: "Waiting for other players to draw..."
7. When all draws complete, phase transitions to DRAW_BETTING_2
```

---

## 9. 5-Card Draw Display & 3D

### Table Layout Differences from Hold'em

The 5-Card Draw table has **no community cards area** in the centre. The centre of the table shows:
- The pot amount (chip pile, same as Hold'em)
- The dealer button indicator
- The discard pile (face-down stack during draw phase)

Player seats are arranged identically to Hold'em (up to 4 positions around the table).

### Card Dealing Animation

**Deal animation (5 cards per player):**
1. Deck sits in front of the dealer character
2. Cards fly one at a time to each player position, clockwise
3. Each card lands face-down at the player's seat area, fanning slightly
4. **10 total dealing animations** for 2 players, **20 for 4 players** (5 x player count, dealt one at a time in rounds)
5. Duration per card: ~150ms flight + ~50ms settle = 200ms per card
6. Total dealing time: ~2-4 seconds depending on player count
7. After all cards are dealt, a brief pause (500ms), then cards at each seat flip face-up simultaneously (from the Display's perspective, all cards are visible — the TV shows all hands face-up for spectator entertainment)

### Draw Animation

**Discard animation:**
1. Selected cards at a player's seat slide up slightly (match controller preview)
2. Cards flip face-down
3. Cards fly from the player's seat to the centre discard pile
4. Duration: ~300ms per card, staggered by 100ms

**Replacement deal animation:**
1. New cards fly from the deck to the player's seat
2. Cards land face-down, then flip face-up
3. Duration: ~300ms per card, staggered by 100ms

**Sequence:** Each player's discard + replacement happens sequentially (matching the game flow). The camera may pan to focus on the active drawer.

### Camera Behaviour

- During dealing: wide shot showing all seats and the deck
- During betting rounds: same as Hold'em (focus follows active player with smooth dolly)
- During draw phase: camera pans to each player as they select and execute their draw
- During showdown: zoom in on the winning hand

### No Community Cards

The `CommunityCards` component is **hidden** during 5-Card Draw. The `GameView2D`/`GameView` component checks `selectedGame` and conditionally renders the community cards area.

---

# III. Blackjack — Classic Dealer Mode

## 10. Blackjack Classic Rules Specification

### Overview

Classic Blackjack: players compete against an AI dealer. The goal is to get a hand value as close to 21 as possible without going over ("busting"). Face cards are worth 10, aces are worth 1 or 11 (whichever is more favourable), and all other cards are face value.

### Shoe Configuration

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| `deckCount` | 6 | 1-8 | Number of 52-card decks in the shoe |
| `cutCardPosition` | 0.75 | 0.5-0.9 | Percentage through shoe where cut card is placed |
| `shuffleTrigger` | `'cut_card'` | `'cut_card' \| 'every_hand' \| 'manual'` | When to reshuffle |

When the cut card is reached (dealt past the `cutCardPosition` percentage of total cards), the shoe is reshuffled after the current hand completes.

### Card Values

| Card | Value |
|------|-------|
| 2-10 | Face value |
| J, Q, K | 10 |
| A | 1 or 11 (auto-optimised) |

A hand containing an ace counted as 11 is "soft" (e.g., A-6 = soft 17). A hand where all aces must be counted as 1 to stay at or under 21 is "hard".

### Hand Value Calculation

```typescript
function calculateHandValue(cards: Card[]): { value: number; soft: boolean } {
  let total = 0
  let aceCount = 0

  for (const card of cards) {
    if (card.rank === 'A') {
      aceCount++
      total += 11
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      total += 10
    } else {
      total += parseInt(card.rank, 10)
    }
  }

  // Downgrade aces from 11 to 1 as needed
  while (total > 21 && aceCount > 0) {
    total -= 10
    aceCount--
  }

  const soft = aceCount > 0 && total <= 21
  return { value: total, soft }
}
```

### Player Actions

| Action | When Available | Effect |
|--------|---------------|--------|
| **Hit** | Hand value < 21, not stood | Deal one card. If hand > 21, bust. |
| **Stand** | Any time during turn | End turn. Hand value is final. |
| **Double Down** | First two cards only (hand value 9, 10, or 11 — configurable to "any two cards") | Double the bet, receive exactly one more card, then stand automatically. |
| **Split** | First two cards are the same rank | Split into two separate hands. Each hand gets one additional card. Requires matching the original bet for the second hand. Can split up to 4 hands total. |
| **Insurance** | Dealer's up-card is an Ace | Side bet of up to half the original bet. Pays 2:1 if dealer has blackjack. |
| **Surrender** | First two cards only, before any other action | Forfeit half the bet and end the hand immediately. Not available after splitting. |

### Split Rules (Detailed)

- Maximum 4 hands from splits (3 re-splits)
- Splitting aces: each ace receives exactly one card; no further hits allowed
- After splitting, double down is permitted on split hands (configurable: `allowDoubleAfterSplit`)
- Re-splitting aces is **not** permitted (configurable: `allowResplitAces`)
- A 21 achieved after splitting aces (or any split) does **not** count as a natural blackjack — it pays 1:1, not 3:2

### Dealer Behaviour

| Rule | Default | Configurable |
|------|---------|--------------|
| Dealer stands on soft 17 | Yes (`dealerStandsSoft17: true`) | Yes |
| Dealer peeks for blackjack (with ace or 10 up) | Yes | No |

Dealer plays automatically after all players have acted. The dealer reveals the hole card and hits/stands according to the fixed rules.

### Payout Table

| Outcome | Payout |
|---------|--------|
| Player wins (not blackjack) | 1:1 |
| Player blackjack (natural 21 on first 2 cards) | 3:2 |
| Push (tie) | Bet returned |
| Insurance (dealer has blackjack) | 2:1 on insurance bet |
| Surrender | Half bet returned |

### Side Bets

#### Perfect Pairs

Pays when the player's first two cards form a pair.

| Pair Type | Description | Payout |
|-----------|-------------|--------|
| Mixed Pair | Same rank, different colour | 5:1 |
| Coloured Pair | Same rank, same colour, different suit | 12:1 |
| Perfect Pair | Same rank, same suit | 25:1 |

#### 21+3

Evaluates the player's first two cards + the dealer's up-card as a 3-card poker hand.

| Hand | Description | Payout |
|------|-------------|--------|
| Flush | All same suit | 5:1 |
| Straight | Three consecutive ranks | 10:1 |
| Three of a Kind | All same rank (different suits) | 30:1 |
| Straight Flush | Consecutive ranks, same suit | 40:1 |
| Suited Triple | All same rank and suit (multi-deck only) | 100:1 |

### Difficulty Levels

Difficulty does **not** affect the dealing order or card distribution — that would be cheating. Instead, difficulty modulates:

| Setting | Easy | Standard | Hard |
|---------|------|----------|------|
| Deck count | 1 | 4 | 8 |
| Dealer stands soft 17 | Yes | Yes | No (hits) |
| Double down on | Any two cards | 9, 10, or 11 only | 10 or 11 only |
| Surrender allowed | Yes | Yes | No |
| Double after split | Yes | Yes | No |
| Blackjack payout | 3:2 | 3:2 | 6:5 |
| Penetration depth | 90% | 75% | 50% |

Higher difficulty = more decks (harder to count), less player-favourable rules, and earlier shuffle (less information from counting).

---

## 11. Blackjack Classic Phase Flow

```
GAME_SELECT --> BJ_PLACE_BETS --> BJ_DEAL_INITIAL --> BJ_INSURANCE
  --> BJ_PLAYER_TURNS --> BJ_DEALER_TURN --> BJ_SETTLEMENT --> BJ_HAND_COMPLETE
  --> (loop to BJ_PLACE_BETS or GAME_SELECT)
```

### The Sequential Player Turn Problem

Blackjack's `BJ_PLAYER_TURNS` phase is fundamentally different from poker's simultaneous betting rounds. In poker, all players act on the same hand state. In blackjack, each player acts sequentially on their own independent hand against the dealer. A single VGF phase handles this by tracking which player (and which of their split hands) is currently active.

### Phase Definitions

#### `BJ_PLACE_BETS`

| Property | Value |
|----------|-------|
| `onBegin` | Reset hand state. Check if shoe needs reshuffling (cut card passed). Initialise `blackjack.hands` for each player with empty cards and no bets. Display bet placement UI. |
| `endIf` | All connected players have placed their bets: `state.blackjack.allBetsPlaced === true` |
| `next` | `'BJ_DEAL_INITIAL'` |
| `onEnd` | Deduct bet amounts from player wallets. |

**Bet placement state:**

```typescript
interface BetPlacement {
  playerId: string
  mainBet: number
  perfectPairsBet: number
  twentyOnePlusThreeBet: number
  confirmed: boolean
}
```

Each player sets their main bet (required, min = big blind equivalent) and optional side bets. A "DEAL" button on the controller confirms. A timer (`ACTION_TIMEOUT_MS`) applies; on timeout, the player's last bet is reused, or the minimum bet if they haven't bet this session.

#### `BJ_DEAL_INITIAL`

| Property | Value |
|----------|-------|
| `onBegin` | Deal from shoe: each player gets 2 cards face-up, dealer gets 1 face-up + 1 face-down (hole card). Evaluate side bets (Perfect Pairs and 21+3) immediately — results stored but not paid until settlement. Check for dealer blackjack peek if dealer shows ace or 10. |
| `endIf` | `state.blackjack.initialDealComplete === true` |
| `next` | If dealer shows an ace: `'BJ_INSURANCE'`. If dealer has blackjack (peeked): `'BJ_DEALER_TURN'`. Otherwise: `'BJ_PLAYER_TURNS'`. |
| `onEnd` | — |

#### `BJ_INSURANCE`

| Property | Value |
|----------|-------|
| `onBegin` | Offer insurance to all players. Display insurance prompt on controllers. |
| `endIf` | All players have accepted or declined insurance: `state.blackjack.allInsuranceDecided === true` |
| `next` | If dealer has blackjack: `'BJ_DEALER_TURN'` (skip player turns). Otherwise: `'BJ_PLAYER_TURNS'`. |
| `onEnd` | If dealer has blackjack, pay insurance bets 2:1 now. |

**Insurance state:**

```typescript
interface InsuranceDecision {
  playerId: string
  amount: number       // 0 = declined
  decided: boolean
}
```

Timer: 15 seconds. On timeout: insurance declined.

#### `BJ_PLAYER_TURNS`

This is the most complex phase in the entire casino platform.

| Property | Value |
|----------|-------|
| `onBegin` | Set `activePlayerIndex` to first player (leftmost seat). Set `activeHandIndex` to 0. |
| `endIf` | `state.blackjack.allPlayerTurnsComplete === true` |
| `next` | `'BJ_DEALER_TURN'` |
| `onEnd` | — |

**Sequential player turn logic:**

The phase uses `activePlayerIndex` and `activeHandIndex` to track which player's which hand is currently in play. The flow within this single phase:

```
For each player (left to right):
  For each hand (0 to N, where N increases on splits):
    While hand is not stood/busted/21:
      Wait for player action (hit/stand/double/split/surrender)
      Execute action
      If busted or stood or 21: advance to next hand or next player
```

**Advancing logic (thunk: `advanceBlackjackTurn`):**

```typescript
async function advanceBlackjackTurn(ctx: ThunkCtx): Promise<void> {
  const state = ctx.getState()
  const bj = state.blackjack!
  const currentPlayer = bj.playerHands[bj.activePlayerIndex]

  // Try next hand for current player
  if (currentPlayer && bj.activeHandIndex < currentPlayer.hands.length - 1) {
    ctx.dispatch('setBlackjackActiveHand', bj.activeHandIndex + 1)
    return
  }

  // Try next player
  if (bj.activePlayerIndex < bj.playerHands.length - 1) {
    ctx.dispatch('setBlackjackActivePlayer', bj.activePlayerIndex + 1)
    ctx.dispatch('setBlackjackActiveHand', 0)
    return
  }

  // All players done
  ctx.dispatch('setAllPlayerTurnsComplete', true)
}
```

**Action timeout:** Same 30-second timer per decision. On timeout: stand automatically.

#### `BJ_DEALER_TURN`

| Property | Value |
|----------|-------|
| `onBegin` | Reveal dealer's hole card. If all players busted, skip dealer play. Otherwise, dealer hits/stands according to rules (stand on soft 17 if `dealerStandsSoft17`, otherwise hit). Each dealer card dealt with a short animation delay (~1 second between cards). |
| `endIf` | `state.blackjack.dealerTurnComplete === true` |
| `next` | `'BJ_SETTLEMENT'` |
| `onEnd` | — |

**Dealer play logic (thunk):**

```typescript
async function playDealerHand(ctx: ThunkCtx): Promise<void> {
  const bj = ctx.getState().blackjack!

  // If all players busted, dealer doesn't need to play
  const anyPlayerStanding = bj.playerHands.some(ph =>
    ph.hands.some(h => h.status === 'stood' || h.status === 'blackjack')
  )
  if (!anyPlayerStanding) {
    ctx.dispatch('setDealerTurnComplete', true)
    return
  }

  // Reveal hole card
  ctx.dispatch('revealDealerHoleCard')

  // Dealer hits until standing condition met
  // [Review 2.6 FIX] Loop guard: max 21 iterations (dealer cannot have > 21 cards)
  const MAX_DEALER_CARDS = 21
  let cardsDealt = 0

  while (cardsDealt < MAX_DEALER_CARDS) {
    const state = ctx.getState()
    const dealer = state.blackjack!.dealerHand
    const { value, soft } = calculateHandValue(dealer.cards)

    if (value > 21) {
      ctx.dispatch('setDealerStatus', 'busted')
      break
    }

    const mustHit = value < 17 || (value === 17 && soft && !state.blackjack!.config.dealerStandsSoft17)

    if (!mustHit) {
      ctx.dispatch('setDealerStatus', 'stood')
      break
    }

    // [Review 2.6 FIX] Check shoe exhaustion before dealing
    const shoe = state.blackjack!.shoe
    if (shoe.cardsRemaining <= 0) {
      // Shoe exhausted mid-dealer-turn: dealer stands at current value
      ctx.logger.warn('Shoe exhausted during dealer turn — dealer stands')
      ctx.dispatch('setDealerStatus', 'stood')
      break
    }

    // Deal one card from shoe
    await new Promise(resolve => setTimeout(resolve, 1000))  // animation delay
    ctx.dispatch('dealCardToDealer')
    cardsDealt++
  }

  ctx.dispatch('setDealerTurnComplete', true)
}
```

#### `BJ_SETTLEMENT`

| Property | Value |
|----------|-------|
| `onBegin` | Compare each player hand against dealer. Calculate payouts (main bets, side bets, insurance). Update wallets. Set `blackjack.settlementComplete = true`. |
| `endIf` | `state.blackjack?.settlementComplete === true` |
| `next` | `'BJ_HAND_COMPLETE'` |

> **[C1 FIX]** Explicit flag replaces `() => true`.

**Payout calculation:**

For each player hand:
1. If player busted: lose bet (already deducted)
2. If dealer busted and player didn't: pay 1:1
3. If player has natural blackjack and dealer doesn't: pay 3:2 (or 6:5 on hard difficulty)
4. If player hand > dealer hand: pay 1:1
5. If tied: push (return bet)
6. If player hand < dealer hand: lose bet

Side bet payouts are calculated in `BJ_DEAL_INITIAL` but actually paid during settlement.

#### `BJ_HAND_COMPLETE`

| Property | Value |
|----------|-------|
| `onBegin` | Update session stats. Check shoe reshuffle trigger. Sync wallet (M1 Sync Point 2). Set `blackjack.handCompleteReady = true`. |
| `endIf` | `state.blackjack?.handCompleteReady === true` |
| `next` | If `gameChangeRequested`: `'GAME_SELECT'`. If shoe needs reshuffle: reshuffle, then `'BJ_PLACE_BETS'`. Otherwise: `'BJ_PLACE_BETS'`. |

> **[C1 FIX]** Explicit flag replaces `() => true`.

---

## 12. Blackjack Classic State Shape

```typescript
interface BlackjackState {
  /** Blackjack-specific configuration */
  config: BlackjackConfig

  /** Shoe state */
  shoe: ShoeState

  /** Dealer's hand */
  dealerHand: BlackjackDealerHand

  /** Per-player hand state (index matches player seat order) */
  playerHands: BlackjackPlayerEntry[]

  /** Bet placement tracking */
  bets: BetPlacement[]

  /** Insurance decisions */
  insuranceDecisions: InsuranceDecision[]

  /** Side bet results (evaluated after initial deal) */
  sideBetResults: SideBetResult[]

  /** Phase sub-state flags */
  allBetsPlaced: boolean
  initialDealComplete: boolean
  allInsuranceDecided: boolean
  allPlayerTurnsComplete: boolean
  dealerTurnComplete: boolean
  settlementComplete: boolean       // [C1 FIX]
  handCompleteReady: boolean        // [C1 FIX]

  /** Active turn tracking */
  activePlayerIndex: number
  activeHandIndex: number
}

interface BlackjackConfig {
  deckCount: number                    // 1-8
  cutCardPosition: number              // 0.5-0.9
  shuffleTrigger: 'cut_card' | 'every_hand' | 'manual'
  dealerStandsSoft17: boolean
  allowDoubleAfterSplit: boolean
  allowResplitAces: boolean
  allowSurrender: boolean
  maxSplitHands: number                // default: 4
  blackjackPayout: '3:2' | '6:5'
  doubleDownRestriction: 'any' | '9_10_11' | '10_11'
  minBet: number
  maxBet: number
}

interface ShoeState {
  /** Number of cards remaining in the shoe (actual cards stored server-side) */
  cardsRemaining: number
  /** Total cards in a fresh shoe */
  totalCards: number
  /** Whether the cut card has been passed */
  cutCardPassed: boolean
  /** Whether a reshuffle is pending (after current hand) */
  reshufflePending: boolean
}

interface BlackjackDealerHand {
  /** Dealer's visible cards (up-card always at index 0) */
  cards: Card[]
  /** Whether the hole card has been revealed */
  holeCardRevealed: boolean
  /** Dealer's hand status */
  status: 'waiting' | 'playing' | 'stood' | 'busted' | 'blackjack'
  /** Dealer's visible hand value (only counts revealed cards) */
  visibleValue: number
  /** Dealer's full hand value (after hole card reveal) */
  fullValue: number
}

interface BlackjackPlayerEntry {
  playerId: string
  /** Array of hands (starts with 1, grows with splits up to maxSplitHands) */
  hands: BlackjackHand[]
}

interface BlackjackHand {
  /** Cards in this hand */
  cards: Card[]
  /** Hand value (auto-calculated, ace-optimised) */
  value: number
  /** Whether the hand is soft (contains an ace counted as 11) */
  soft: boolean
  /** Current bet on this hand */
  bet: number
  /** Hand status */
  status: 'active' | 'stood' | 'busted' | 'blackjack' | 'surrendered' | 'doubled'
  /** Whether this hand was created by a split */
  isSplit: boolean
}
```

> **[M2 FIX]** `availableActions` is **computed, never stored** in state. It is derived on the controller from the hand's current state. Storing it would create a stale data risk (the reducer would need to recompute after every action) and violates the principle that derived data should not be persisted.

```typescript
/**
 * Pure function — called on the controller to determine available actions.
 * NOT a reducer, NOT stored in VGF state.
 */
function getAvailableBlackjackActions(
  hand: BlackjackHand,
  config: BlackjackConfig,
  playerWallet: number,
  handCount: number,
): BlackjackAction[] {
  if (hand.status !== 'active') return []

  const actions: BlackjackAction[] = ['hit', 'stand']

  const isFirstTwoCards = hand.cards.length === 2

  if (isFirstTwoCards) {
    // Double down
    const value = hand.value
    const canDouble = config.doubleDownRestriction === 'any'
      || (config.doubleDownRestriction === '9_10_11' && [9, 10, 11].includes(value))
      || (config.doubleDownRestriction === '10_11' && [10, 11].includes(value))
    if (canDouble && playerWallet >= hand.bet) {
      actions.push('double_down')
    }

    // Split
    if (
      hand.cards[0]!.rank === hand.cards[1]!.rank
      && handCount < config.maxSplitHands
      && playerWallet >= hand.bet
      && !hand.isSplit  // can't re-split aces by default
    ) {
      actions.push('split')
    }

    // Surrender
    if (config.allowSurrender && !hand.isSplit) {
      actions.push('surrender')
    }
  }

  return actions
}

type BlackjackAction = 'hit' | 'stand' | 'double_down' | 'split' | 'insurance' | 'surrender'

interface BetPlacement {
  playerId: string
  mainBet: number
  perfectPairsBet: number
  twentyOnePlusThreeBet: number
  confirmed: boolean
}

interface InsuranceDecision {
  playerId: string
  amount: number
  decided: boolean
}

interface SideBetResult {
  playerId: string
  betType: 'perfect_pairs' | '21_plus_3'
  outcome: string         // e.g., 'mixed_pair', 'flush', 'none'
  payout: number          // multiplier (0 if lost)
  winAmount: number       // actual chips won
}
```

### Server-Side Blackjack State

The shoe's actual card array is stored server-side (same pattern as `ServerGameState` — see C5 below), never broadcast to clients. The client only sees `ShoeState.cardsRemaining`.

> **[C5 FIX]** Full multi-game server-side state design. The existing `ServerHandState` (poker-specific: `deck: Card[]`, `holeCards: Map<string, [Card, Card]>`) is replaced by `ServerGameState`, which holds per-game private data:

```typescript
/**
 * Multi-game server-side state — stores ALL private data that must NOT
 * be broadcast to clients via VGF state sync.
 *
 * Replaces the old poker-only ServerHandState.
 * Stored in-memory Map<sessionId, ServerGameState>.
 * In production, backed by Redis for persistence across restarts.
 */
interface ServerGameState {
  /** Currently active game (mirrors CasinoGameState.selectedGame) */
  activeGame: CasinoGame | null

  /** Hold'em private state */
  holdem?: ServerHoldemState

  /** 5-Card Draw private state */
  draw?: ServerDrawState

  /** Blackjack Classic private state */
  blackjack?: ServerBlackjackState

  /** Blackjack Competitive private state */
  blackjackCompetitive?: ServerBlackjackCompetitiveState
}

/** Hold'em (unchanged from existing ServerHandState) */
interface ServerHoldemState {
  deck: Card[]
  holeCards: Map<string, [Card, Card]>
}

/** 5-Card Draw */
interface ServerDrawState {
  deck: Card[]
  holeCards: Map<string, Card[]>  // 5-card hands
  discardPile: Card[]
}

/** Blackjack Classic */
interface ServerBlackjackState {
  shoe: Card[]                    // the actual shoe contents (6-deck = 312 cards)
  dealerHoleCard: Card | null     // hidden until BJ_DEALER_TURN reveal
}

/** Blackjack Competitive (same shoe, no dealer hole card) */
interface ServerBlackjackCompetitiveState {
  shoe: Card[]
  playerHoleCards: Map<string, Card[]>  // private until BJC_SHOWDOWN
}

// Module-level storage (same pattern as existing ServerHandState)
const sessions = new Map<string, ServerGameState>()

export function getServerGameState(sessionId: string): ServerGameState | undefined {
  return sessions.get(sessionId)
}

export function setServerGameState(sessionId: string, state: ServerGameState): void {
  sessions.set(sessionId, state)
}

/**
 * Lifecycle: when switching games, clear the old game's server state
 * and initialise the new one. Called in GAME_SELECT.onEnd.
 */
export function switchGameServerState(
  sessionId: string,
  newGame: CasinoGame
): void {
  const current = sessions.get(sessionId) ?? { activeGame: null }
  // Clear old game state
  delete current.holdem
  delete current.draw
  delete current.blackjack
  delete current.blackjackCompetitive
  current.activeGame = newGame
  sessions.set(sessionId, current)
}
```

**Migration note:** The existing `getServerHandState` / `setServerHandState` / `getHoleCards` functions in `server-state.ts` are preserved with deprecation warnings. They delegate to `ServerGameState.holdem` internally.

---

## 13. Blackjack Classic Controller UX

### Bet Placement Screen

Displayed during `BJ_PLACE_BETS`:

**Layout (top to bottom):**
1. **Header:** "Place Your Bets" + wallet balance
2. **Main bet area:** Circular chip selector with preset amounts (10, 25, 50, 100, ALL IN). Tap to add chips, long-press to remove. Current bet displayed prominently.
3. **Side bets area (collapsible):**
   - "Perfect Pairs" toggle + chip selector
   - "21+3" toggle + chip selector
4. **Confirm button:** Large green "DEAL" button
5. **Timer bar:** Visual countdown (same style as poker action timer)

**Chip denominations displayed:**
- $10 (white)
- $25 (red)
- $50 (blue)
- $100 (black)

### Player Turn Controls

Displayed during `BJ_PLAYER_TURNS` when it's this player's turn:

**Layout:**
1. **Hand display:** Player's current hand cards + hand value. If split, tabs/swipe to switch between hands with an indicator showing which is active.
2. **Dealer's up-card:** Small display of the dealer's visible card + value
3. **Action buttons:** Dynamic grid based on `availableActions`:

| Action | Button Colour | Condition |
|--------|--------------|-----------|
| HIT | Green | Always (unless stood/busted/21) |
| STAND | Blue | Always |
| DOUBLE DOWN | Orange | First two cards only (configurable), sufficient balance |
| SPLIT | Purple | First two cards of same rank, fewer than `maxSplitHands`, sufficient balance |
| SURRENDER | Grey | First two cards only, surrender allowed in config |

4. **Waiting state:** When not this player's turn: "Waiting for [PlayerName]..." with their cards/value visible

### Split Hand Management

When a player has multiple hands from splitting:
- **Tab bar** at the top of the hand area shows "Hand 1", "Hand 2", etc.
- The **active hand** tab is highlighted (green border)
- Inactive hand tabs show their current value and status (e.g., "Hand 2: 18 (stood)")
- The controller automatically scrolls to the active hand
- A pulsing indicator marks which hand is being played

### Insurance Prompt

During `BJ_INSURANCE`:
- Modal overlay on the controller
- "Dealer shows an Ace. Take insurance?"
- Slider for insurance amount (0 to half of main bet)
- "YES" / "NO" buttons
- Timer: 15 seconds, default to "NO" on timeout

---

## 14. Blackjack Classic Display & 3D

### Table Layout

The Display shows a **semicircular blackjack table** viewed from above/behind the players:

```
                  [DEALER]
               _______________
              /               \
             /    [chip tray]   \
            /                     \
           |  [P1]  [P2]  [P3]  [P4] |
           |__________________________|

   Camera is behind/above the player seats, looking toward the dealer.
```

**Table surface:** Green felt with gold betting circle outlines for each seat and side bet areas.

**Dealer position:** Top-centre of the screen. Dealer character model visible (upper body). Chip tray and shoe visible to the dealer's right.

**Player positions:** Bottom of the screen, evenly spaced in an arc. Each position has:
- Main betting circle (centre)
- Perfect Pairs side bet circle (left)
- 21+3 side bet circle (right)
- Card display area (above the betting circles)
- Chip stack for the current bet (inside the betting circle)

### Card Dealing

**Initial deal animation:**
1. Cards fly from the shoe (dealer's right) to each player position, left to right
2. First round: one card face-up to each player, then one face-up to dealer
3. Second round: one card face-up to each player, then one face-**down** (hole card) to dealer
4. Duration: ~200ms per card flight

**Hit card animation:**
1. Card flies from shoe to the active player's hand position
2. Card arrives face-up
3. Hand value display updates with a brief "counting" animation

### Dealer Hole Card

- The dealer's hole card is rendered face-down (card back texture visible)
- During `BJ_DEALER_TURN`, the hole card flips face-up with a 3D rotation animation (~400ms)
- If the dealer peeks (ace/10 up-card), a brief "peek" animation plays but the card remains hidden

### Split Hand Visual Layout

When a player splits:
- The original betting circle splits into two circles side by side (or shifts left/right)
- Each circle gets its own card stack and chip pile
- A subtle connector line links the split hands
- Up to 4 split hand positions can fit (getting progressively smaller)
- The active hand has a glowing border

### Chip Placement Animation

During `BJ_PLACE_BETS`:
- As players confirm bets on their controllers, chips appear in their betting circles on the Display
- Chip stack builds up with satisfying "clink" sound effects
- Side bet chips appear in their respective circles (different chip colours/sizes)

### Shoe Visual

- The shoe is rendered as a physical card shoe object to the dealer's right
- Cards visibly deplete from the shoe as they're dealt
- When the cut card is reached, a brief visual indicator (yellow card visible in shoe)

---

# IV. Blackjack — Competitive Variant

## 15. Competitive Blackjack Rules

### Overview

Competitive Blackjack pits players **against each other** rather than against the house. There is no AI dealer making decisions — the dealer character simply deals cards and narrates. Each player tries to get the highest hand value without busting, and the highest non-busted hand wins the round's pot.

### Key Differences from Classic

| Aspect | Classic | Competitive |
|--------|---------|-------------|
| Opponent | AI dealer | Other players |
| Splits | Up to 4 hands | **Not allowed** (keeps it simple and fair) |
| Insurance | Available | **Not available** (no dealer hand to insure against) |
| Side bets | Perfect Pairs, 21+3 | **Not available** |
| Double Down | Standard rules | Available (doubles your stake in the pot) |
| Surrender | Configurable | Available (forfeit half your ante) |
| Dealer hand | Competes against players | **None** — dealer only deals |
| Payout | Fixed payouts vs house | Pot-based: winner takes the pot |

### Ante Structure

Instead of betting against the house, all players ante into a shared pot:

- **Ante:** Fixed amount per round (equal to the big blind equivalent from the shared `BlindLevel`)
- **Double Down:** When a player doubles down, they add their ante amount again to the pot
- **Surrender:** Player forfeits half their ante (returned to the pot)

### Scoring

Each round is standalone (no multi-round scoring). The winner of each round takes the pot. Ties split the pot equally.

**Winner determination:**
1. All busted players lose their ante (stays in pot)
2. Among non-busted players, highest hand value wins
3. If tied, pot is split equally among tied players
4. Natural blackjack (21 on first 2 cards) beats a non-natural 21

### Player Actions

| Action | Available | Effect |
|--------|-----------|--------|
| Hit | Standard | Deal one card |
| Stand | Standard | End turn |
| Double Down | First two cards, sufficient balance | Double ante contribution, receive exactly one card, stand |
| Surrender | First two cards | Forfeit half ante, end turn |

### Turn Order

> **[M3 FIX]** Simultaneous play is deferred to v2. The implementation complexity (parallel state tracking, conflict resolution when multiple players act on the same tick, UI for showing/hiding multiple active states) is significant and not worth the risk for launch.

**v1: Sequential turns (left-to-right).** Each player acts in seat order. Other players see a "Waiting for [PlayerName]..." state on their controllers. Cards remain private (face-down on Display) until showdown. This matches the `BJ_PLAYER_TURNS` pattern from Classic Blackjack, reusing the `activePlayerIndex` tracking.

**v2 (future): Simultaneous play.** Each player acts independently on their controller. Actions are batched and revealed after all players have acted or the timer expires. This prevents information asymmetry and speeds up play. Implementation requires:
- Parallel action queuing on the server
- Conflict-free reducer design (each player's actions only touch their own sub-state)
- Display UI for showing N active players simultaneously
- Timer synchronisation across all controllers

---

## 16. Competitive Blackjack Phase Flow & State

### Phase Flow

```
GAME_SELECT --> BJC_PLACE_BETS --> BJC_DEAL_INITIAL --> BJC_PLAYER_TURNS
  --> BJC_SHOWDOWN --> BJC_SETTLEMENT --> BJC_HAND_COMPLETE
  --> (loop to BJC_PLACE_BETS or GAME_SELECT)
```

### Phase Definitions

#### `BJC_PLACE_BETS`

| Property | Value |
|----------|-------|
| `onBegin` | Reset hand state. Each player's ante is automatically deducted (fixed amount). No bet selection needed — the ante is the blind level's big blind. |
| `endIf` | All connected players confirmed ready (or auto-confirmed after 5 seconds). `state.blackjackCompetitive.allAntesPosted === true` |
| `next` | `'BJC_DEAL_INITIAL'` |

#### `BJC_DEAL_INITIAL`

| Property | Value |
|----------|-------|
| `onBegin` | Deal 2 cards face-down to each player from the shoe. Cards are private — stored in `ServerGameState.blackjackCompetitive.playerHoleCards` and sent only to the owning controller (same pattern as poker hole cards). No dealer hand is dealt. |
| `endIf` | `state.blackjackCompetitive.dealComplete === true` |
| `next` | `'BJC_PLAYER_TURNS'` |

#### `BJC_PLAYER_TURNS`

| Property | Value |
|----------|-------|
| `onBegin` | Set `activePlayerIndex` to first player (leftmost seat). Set all player statuses to `'active'`. Start 30-second per-player action timer. |
| `endIf` | All players have stood, busted, doubled, or surrendered: `state.blackjackCompetitive.allTurnsComplete === true` |
| `next` | `'BJC_SHOWDOWN'` |

> **[M3 FIX]** v1 uses sequential turns, not simultaneous.

**v1 sequential turn mechanics:**
- Each player acts in seat order, tracked by `activePlayerIndex`
- The active player sees their cards and action buttons on their controller
- Other players see "Waiting for [PlayerName]..." with face-down cards
- The Display shows each player's seat with face-down cards and card count
- When a player busts, their cards flip face-up and status shows "BUST"
- `advanceBjcTurn` thunk advances to next player after each action resolves
- Per-player 30-second timer; auto-stand on timeout

#### `BJC_SHOWDOWN`

| Property | Value |
|----------|-------|
| `onBegin` | Reveal all players' hands on the Display. Determine winner(s). Set `blackjackCompetitive.showdownComplete = true`. |
| `endIf` | `state.blackjackCompetitive?.showdownComplete === true` |
| `next` | `'BJC_SETTLEMENT'` |

> **[C1 FIX]** Explicit flag replaces `() => true`.

**Showdown animation:**
1. All remaining hands flip face-up simultaneously
2. Hand values appear above each player's cards
3. Winner is highlighted (green glow)
4. Losing hands grey out

#### `BJC_SETTLEMENT`

| Property | Value |
|----------|-------|
| `onBegin` | Award pot to winner(s). Handle surrendered players (half ante returned). Set `blackjackCompetitive.settlementComplete = true`. |
| `endIf` | `state.blackjackCompetitive?.settlementComplete === true` |
| `next` | `'BJC_HAND_COMPLETE'` |

> **[C1 FIX]** Explicit flag replaces `() => true`.

#### `BJC_HAND_COMPLETE`

| Property | Value |
|----------|-------|
| `onBegin` | Update session stats. Check shoe reshuffle. Sync wallet (M1 Sync Point 2). Set `blackjackCompetitive.handCompleteReady = true`. |
| `endIf` | `state.blackjackCompetitive?.handCompleteReady === true` |
| `next` | If `gameChangeRequested`: `'GAME_SELECT'`. Otherwise: `'BJC_PLACE_BETS'`. |

> **[C1 FIX]** Explicit flag replaces `() => true`.

### Competitive Blackjack State Shape

```typescript
interface BlackjackCompetitiveState {
  /** Shoe state (shared with classic blackjack) */
  shoe: ShoeState

  /** Per-player hands (no splits, so always exactly 1 hand per player) */
  playerHands: CompetitivePlayerHand[]

  /** Pot (sum of all antes + double-down additions) */
  pot: number

  /** Ante amount for this round */
  anteAmount: number

  /** Active turn tracking [M3 FIX — sequential turns in v1] */
  activePlayerIndex: number

  /** Phase flags */
  allAntesPosted: boolean
  dealComplete: boolean
  allTurnsComplete: boolean
  showdownComplete: boolean          // [C1 FIX]
  settlementComplete: boolean        // [C1 FIX]
  handCompleteReady: boolean         // [C1 FIX]

  /** Config */
  config: CompetitiveBlackjackConfig
}

interface CompetitivePlayerHand {
  playerId: string
  cards: Card[]          // private until showdown
  value: number          // computed
  soft: boolean          // computed
  status: 'active' | 'stood' | 'busted' | 'doubled' | 'surrendered'
  hasDoubled: boolean
  /** Whether this player's hand has been revealed (showdown) */
  revealed: boolean
}

interface CompetitiveBlackjackConfig {
  deckCount: number
  cutCardPosition: number
  allowDoubleDown: boolean
  allowSurrender: boolean
}
```

---

# V. Shared Design Elements

## 17. Dealer Characters

### Existing Poker Dealers

The existing codebase defines four dealer characters in `DEALER_CHARACTERS`: `'vincent'`, `'maya'`, `'remy'`, `'jade'`. These are poker-focused personalities. For blackjack, we add new characters with blackjack-specific dialogue.

### New Blackjack Dealer Characters

#### "Ace" Malone

- **Personality:** Smooth, old-school Vegas. Think a young Dean Martin behind the table. Charming, slightly cocky, but always professional.
- **Voice:** Warm baritone, measured pace, occasional playful inflection.
- **Catchphrase:** "Let's see what the shoe has to say."
- **Interaction style:** Builds tension before revealing cards. Compliments bold plays. Gently ribbing players who bust on obvious hits.

**Voice line categories:**

| Category | Example Lines |
|----------|--------------|
| Greeting | "Welcome to the table. Ace Malone, at your service." / "Pull up a seat, the cards are warm tonight." |
| Dealing | "Cards are flying." / "Two for you, and two for me." |
| Player blackjack | "Twenty-one on the nose! Beautiful hand." / "Natural blackjack. That's how it's done." |
| Player bust | "Ooh, one too many. House collects." / "Twenty-two. Sometimes the cards just don't cooperate." |
| Dealer bust | "Well, would you look at that. Dealer busts. Drinks are on me." |
| Push | "We'll call that one a draw. Your money stays put." |
| Insurance offered | "I'm showing an ace. Care to protect that bet?" |
| Split | "Same rank? Could be double the fun... or double the trouble." |
| Big win | "That's a hefty payout. Don't spend it all in one place." |

#### Scarlett Vega

- **Personality:** Sharp, witty, slightly intimidating. A dealer who's seen everything and isn't easily impressed. Respects good strategy, openly amused by bad plays.
- **Voice:** Crisp alto, quick delivery, dry humour.
- **Catchphrase:** "The house always has an opinion."
- **Interaction style:** Quick commentary, statistical observations ("That's a 62% chance to bust, just so you know"), and the occasional raised eyebrow.

**Voice line categories:**

| Category | Example Lines |
|----------|--------------|
| Greeting | "Scarlett Vega. Let's not waste time — place your bets." / "Another round? I admire the persistence." |
| Dealing | "From the shoe." / "Two each. Standard procedure." |
| Player blackjack | "Blackjack. Clean and efficient. I approve." |
| Player bust | "And that's mathematics for you." / "Hit on sixteen? Bold. Wrong, but bold." |
| Dealer bust | "Even I'm not immune to a bad run. Take your chips." |
| Push | "Seventeen-seventeen. Nobody wins, nobody learns." |
| Insurance offered | "Insurance is available. Statistically, it's a poor bet. But it's your money." |
| Split | "Splitting eights? Smart. Splitting tens? Questionable." |
| Player surrender | "Discretion is the better part of valour. Half back." |

#### Chip Dubois

- **Personality:** Enthusiastic, slightly over-the-top, the kind of dealer who makes beginners feel welcome. Every hand is exciting. Every outcome deserves a reaction.
- **Voice:** Upbeat tenor, energetic pace, genuine warmth.
- **Catchphrase:** "Every card is a new adventure!"
- **Interaction style:** Celebrates everything. Encourages new players. Narrates the action like a sports commentator.

**Voice line categories:**

| Category | Example Lines |
|----------|--------------|
| Greeting | "Hey hey! Chip Dubois here! Ready to deal some excitement?" / "Welcome back! Missed you at the table." |
| Dealing | "Here we go, here we go! Cards incoming!" / "Two for you, aaand two for me!" |
| Player blackjack | "BLACKJACK! Oh that is beautiful! Three-to-two, coming your way!" |
| Player bust | "Ohhh no! Twenty-three! Tough break, tough break. We'll get 'em next hand!" |
| Dealer bust | "Ha! I busted! You love to see it! Everyone's a winner!" |
| Push | "Tie game! Nobody goes home sad!" |
| Insurance offered | "Ace showing! Want some insurance? Just in case?" |
| Split | "Two of the same! Split 'em up! Double the action!" |
| Double down | "Doubling down! I like the confidence! Let's see that card!" |

### Dealer Assignment

- **Poker games:** Use the existing `dealerCharacterId` from `DEALER_CHARACTERS` (vincent, maya, remy, jade)
- **Blackjack games:** Use the new blackjack dealers (ace_malone, scarlett_vega, chip_dubois)
- **Competitive blackjack:** The dealer is cosmetic only (no dealer hand). Same blackjack character set.
- Players can change the dealer character in the lobby/game select screen

### Dealer Character Constants

```typescript
export const BLACKJACK_DEALER_CHARACTERS = ['ace_malone', 'scarlett_vega', 'chip_dubois'] as const
export type BlackjackDealerCharacter = typeof BLACKJACK_DEALER_CHARACTERS[number]

// All dealer characters across all games
export const ALL_DEALER_CHARACTERS = [...DEALER_CHARACTERS, ...BLACKJACK_DEALER_CHARACTERS] as const
```

---

## 18. Voice Commands

### Game Selection Commands

| Voice Command | Intent | Phase |
|---------------|--------|-------|
| "play poker" / "Texas Hold'em" / "hold'em" | `select_holdem` | GAME_SELECT |
| "play draw" / "five card draw" / "draw poker" | `select_five_card_draw` | GAME_SELECT |
| "play blackjack" / "twenty-one" / "blackjack" | `select_blackjack` | GAME_SELECT |
| "competitive blackjack" / "versus blackjack" | `select_blackjack_competitive` | GAME_SELECT |
| "change game" / "switch game" / "new game" | `request_game_change` | Any HandComplete phase (v1: host-only) |

### Hold'em Voice Commands (Existing)

Unchanged from the current implementation:

| Voice Command | Intent |
|---------------|--------|
| "fold" | `fold` |
| "check" | `check` |
| "call" | `call` |
| "bet [amount]" | `bet` |
| "raise [amount]" / "raise to [amount]" | `raise` |
| "all in" / "I'm all in" | `all_in` |
| "ready" | `ready` |
| "start" / "start game" | `start` |

### 5-Card Draw Voice Commands

| Voice Command | Intent | Phase |
|---------------|--------|-------|
| "draw [N]" / "give me [N]" | `draw_cards` | DRAW_DRAW_PHASE |
| "stand pat" / "keep all" / "no draw" | `stand_pat` | DRAW_DRAW_PHASE |
| "discard [N]" | `discard_cards` | DRAW_DRAW_PHASE |
| All Hold'em betting commands | Same intents | DRAW_BETTING_1, DRAW_BETTING_2 |

**Note:** Voice-based card selection (e.g., "discard the three and the seven") is deferred to v2. For v1, card selection during the draw phase is touch-only on the controller; the voice commands `draw [N]` and `stand pat` confirm the draw after touch selection.

### Blackjack Voice Commands

| Voice Command | Intent | Phase |
|---------------|--------|-------|
| "hit" / "hit me" / "card" | `bj_hit` | BJ_PLAYER_TURNS / BJC_PLAYER_TURNS |
| "stand" / "stay" / "hold" | `bj_stand` | BJ_PLAYER_TURNS / BJC_PLAYER_TURNS |
| "double" / "double down" | `bj_double_down` | BJ_PLAYER_TURNS |
| "split" / "split them" | `bj_split` | BJ_PLAYER_TURNS |
| "insurance" / "take insurance" | `bj_insurance` | BJ_INSURANCE |
| "no insurance" / "decline" | `bj_no_insurance` | BJ_INSURANCE |
| "surrender" / "give up" | `bj_surrender` | BJ_PLAYER_TURNS / BJC_PLAYER_TURNS |

### VoiceIntent Type Extension

```typescript
export type VoiceIntent =
  // Existing poker intents
  | 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in'
  | 'ready' | 'start' | 'settings'
  // Game selection intents
  | 'select_holdem' | 'select_five_card_draw'
  | 'select_blackjack' | 'select_blackjack_competitive'
  | 'request_game_change'
  // 5-Card Draw intents
  | 'draw_cards' | 'stand_pat' | 'discard_cards'
  // Blackjack intents
  | 'bj_hit' | 'bj_stand' | 'bj_double_down' | 'bj_split'
  | 'bj_insurance' | 'bj_no_insurance' | 'bj_surrender'
  // Fallback
  | 'unknown'
```

### Slot Map Updates

The Recognition Service uses per-phase slot maps for keyword boosting. New slot maps needed:

| Phase Group | Boosted Words |
|-------------|---------------|
| Game selection | poker, hold'em, draw, blackjack, twenty-one, competitive, change, switch |
| 5-Card Draw draw phase | draw, one, two, three, stand, pat, keep, discard |
| Blackjack player turn | hit, stand, stay, hold, double, split, insurance, surrender |
| Blackjack betting | bet, chips, deal, all in, minimum, maximum |

---

## 19. Controller Adaptation

### Architecture: Phase-Based Component Routing

The controller app uses a `ControllerPhaseRouter` component that switches between views based on the current VGF phase. This pattern extends naturally to multiple games:

```typescript
function ControllerPhaseRouter() {
  const phase = usePhase()
  const state = useStateSync() as CasinoGameState | null

  if (!phase) return <ConnectingView />

  // Shared phases
  if (phase === 'LOBBY') return <ControllerLobby />
  if (phase === 'GAME_SELECT') return <GameSelectController />

  // Route by active game
  switch (state?.selectedGame) {
    case 'holdem':
      return <HoldemControllerGameplay phase={phase} />
    case 'five_card_draw':
      return <FiveCardDrawController phase={phase} />
    case 'blackjack_classic':
      return <BlackjackClassicController phase={phase} />
    case 'blackjack_competitive':
      return <BlackjackCompetitiveController phase={phase} />
    default:
      return <ControllerLobby />
  }
}
```

### Common Controller Elements (All Games)

These appear on every controller screen regardless of the active game:

| Element | Position | Description |
|---------|----------|-------------|
| Player name | Top-left | Display name from member state |
| Wallet balance | Top-right | Shared wallet balance, always visible |
| Game indicator | Top-centre | Small icon/text showing current game |
| Push-to-talk button | Bottom | Voice command button (same as current) |

### Game-Specific Controller Differences

| Element | Hold'em | 5-Card Draw | Blackjack Classic | Blackjack Competitive |
|---------|---------|-------------|--------------------|-----------------------|
| Card display | 2 hole cards | 5 cards (tappable during draw) | Hand cards + value | Hand cards + value |
| Action buttons | Fold/Check/Call/Raise/AllIn | Same as Hold'em + Draw controls | Hit/Stand/Double/Split/Surrender | Hit/Stand/Double/Surrender |
| Bet controls | Raise slider | Raise slider | Chip selector + side bets | N/A (fixed ante) |
| Special UI | — | Draw selection mode | Insurance prompt, split tabs | Simultaneous play timer |

### Display Adaptation

The Display (`PhaseRouter`) follows the same pattern:

```typescript
function PhaseRouter() {
  const phase = usePhase()
  const state = useStateSync() as CasinoGameState | null

  if (!phase) return <ConnectingView />
  if (phase === 'LOBBY') return <LobbyView />
  if (phase === 'GAME_SELECT') return <GameSelectDisplay />

  switch (state?.selectedGame) {
    case 'holdem':
      return <HoldemGameView />
    case 'five_card_draw':
      return <FiveCardDrawGameView />
    case 'blackjack_classic':
      return <BlackjackClassicGameView />
    case 'blackjack_competitive':
      return <BlackjackCompetitiveGameView />
    default:
      return <LobbyView />
  }
}
```

Each game view has its own 3D scene, table layout, camera rig, and animation system, but shares common components (player name plates, chip piles, dealer character rendering, HUD overlay).

---

## 20. Shared Constants & Configuration

### New Constants (additions to `@weekend-poker/shared/constants/poker.ts`)

```typescript
// ── Game types ───────────────────────────────────────────────
export const CASINO_GAMES = ['holdem', 'five_card_draw', 'blackjack_classic', 'blackjack_competitive'] as const
export type CasinoGame = typeof CASINO_GAMES[number]

// ── Wallet constants ─────────────────────────────────────────
export const STARTING_WALLET = 10_000  // Default starting balance (configurable 1,000-50,000)
export const MIN_STARTING_WALLET = 1_000
export const MAX_STARTING_WALLET = 50_000

// ── 5-Card Draw constants ────────────────────────────────────
export const DRAW_MAX_DISCARD = 3
export const DRAW_HAND_SIZE = 5
export const DRAW_TIMEOUT_MS = 30_000  // same as ACTION_TIMEOUT_MS

// ── Blackjack constants ──────────────────────────────────────
export const BJ_DEFAULT_DECK_COUNT = 6
export const BJ_DEFAULT_CUT_CARD_POSITION = 0.75
export const BJ_NATURAL_BLACKJACK_PAYOUT_3_2 = 1.5
export const BJ_NATURAL_BLACKJACK_PAYOUT_6_5 = 1.2
export const BJ_INSURANCE_PAYOUT = 2
export const BJ_MAX_SPLIT_HANDS = 4
export const BJ_MIN_BET = 10
export const BJ_MAX_BET = 500
export const BJ_DEALER_TURN_CARD_DELAY_MS = 1_000
export const BJ_BET_TIMEOUT_MS = 30_000
export const BJ_INSURANCE_TIMEOUT_MS = 15_000
export const BJ_ACTION_TIMEOUT_MS = 30_000

// ── Blackjack difficulty presets ─────────────────────────────
// [Review 3.2 FIX] Separate type — blackjack difficulty is table rules, not bot AI
export type BlackjackDifficulty = 'easy' | 'standard' | 'hard'

export const BJ_DIFFICULTY_PRESETS: Record<BlackjackDifficulty, Partial<BlackjackConfig>> = {
  easy: {
    deckCount: 1,
    dealerStandsSoft17: true,
    doubleDownRestriction: 'any',    // Any two cards
    allowSurrender: true,
    allowDoubleAfterSplit: true,
    blackjackPayout: '3:2',
    cutCardPosition: 0.9,
  },
  standard: {
    deckCount: 4,
    dealerStandsSoft17: true,
    doubleDownRestriction: '9_10_11', // 9, 10, or 11 only
    allowSurrender: true,
    allowDoubleAfterSplit: true,
    blackjackPayout: '3:2',
    cutCardPosition: 0.75,
  },
  hard: {
    deckCount: 8,
    dealerStandsSoft17: false,
    doubleDownRestriction: '10_11',  // 10 or 11 only
    allowSurrender: false,
    allowDoubleAfterSplit: false,
    blackjackPayout: '6:5',
    cutCardPosition: 0.5,
  },
}

// ── Side bet payout tables ───────────────────────────────────
export const PERFECT_PAIRS_PAYOUTS = {
  mixed_pair: 5,
  coloured_pair: 12,
  perfect_pair: 25,
} as const

export const TWENTY_ONE_PLUS_THREE_PAYOUTS = {
  flush: 5,
  straight: 10,
  three_of_a_kind: 30,
  straight_flush: 40,
  suited_triple: 100,
} as const

// ── Blackjack dealer characters ──────────────────────────────
export const BLACKJACK_DEALER_CHARACTERS = ['ace_malone', 'scarlett_vega', 'chip_dubois'] as const
export type BlackjackDealerCharacter = typeof BLACKJACK_DEALER_CHARACTERS[number]
```

### Phase Enum Extension

```typescript
export enum CasinoPhase {
  // Shared
  Lobby = 'LOBBY',
  GameSelect = 'GAME_SELECT',

  // Hold'em (existing, unchanged)
  PostingBlinds = 'POSTING_BLINDS',
  DealingHoleCards = 'DEALING_HOLE_CARDS',
  PreFlopBetting = 'PRE_FLOP_BETTING',
  DealingFlop = 'DEALING_FLOP',
  FlopBetting = 'FLOP_BETTING',
  DealingTurn = 'DEALING_TURN',
  TurnBetting = 'TURN_BETTING',
  DealingRiver = 'DEALING_RIVER',
  RiverBetting = 'RIVER_BETTING',
  AllInRunout = 'ALL_IN_RUNOUT',
  Showdown = 'SHOWDOWN',
  PotDistribution = 'POT_DISTRIBUTION',
  HandComplete = 'HAND_COMPLETE',

  // 5-Card Draw
  DrawPostingBlinds = 'DRAW_POSTING_BLINDS',
  DrawDealing = 'DRAW_DEALING',
  DrawBetting1 = 'DRAW_BETTING_1',
  DrawDrawPhase = 'DRAW_DRAW_PHASE',
  DrawBetting2 = 'DRAW_BETTING_2',
  DrawShowdown = 'DRAW_SHOWDOWN',
  DrawPotDistribution = 'DRAW_POT_DISTRIBUTION',
  DrawHandComplete = 'DRAW_HAND_COMPLETE',

  // Blackjack Classic
  BjPlaceBets = 'BJ_PLACE_BETS',
  BjDealInitial = 'BJ_DEAL_INITIAL',
  BjInsurance = 'BJ_INSURANCE',
  BjPlayerTurns = 'BJ_PLAYER_TURNS',
  BjDealerTurn = 'BJ_DEALER_TURN',
  BjSettlement = 'BJ_SETTLEMENT',
  BjHandComplete = 'BJ_HAND_COMPLETE',

  // Blackjack Competitive
  BjcPlaceBets = 'BJC_PLACE_BETS',
  BjcDealInitial = 'BJC_DEAL_INITIAL',
  BjcPlayerTurns = 'BJC_PLAYER_TURNS',
  BjcShowdown = 'BJC_SHOWDOWN',
  BjcSettlement = 'BJC_SETTLEMENT',
  BjcHandComplete = 'BJC_HAND_COMPLETE',
}
```

---

## Appendix A: Side Bet Evaluation Logic

### Perfect Pairs Evaluation

```typescript
function evaluatePerfectPairs(card1: Card, card2: Card): 'perfect_pair' | 'coloured_pair' | 'mixed_pair' | 'none' {
  if (card1.rank !== card2.rank) return 'none'
  if (card1.suit === card2.suit) return 'perfect_pair'

  const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds'
  if (isRed(card1.suit) === isRed(card2.suit)) return 'coloured_pair'
  return 'mixed_pair'
}
```

### 21+3 Evaluation

```typescript
/**
 * [Review 2.8] rankToNumeric mapping — Ace = 14 (high). This MUST be consistent
 * across the entire codebase. The existing poker engine uses the same convention.
 */
function rankToNumeric(rank: CardRank): number {
  const mapping: Record<CardRank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  }
  return mapping[rank]
}

function evaluate21Plus3(
  playerCard1: Card, playerCard2: Card, dealerUpCard: Card
): 'suited_triple' | 'straight_flush' | 'three_of_a_kind' | 'straight' | 'flush' | 'none' {
  const cards = [playerCard1, playerCard2, dealerUpCard]
  const ranks = cards.map(c => rankToNumeric(c.rank)).sort((a, b) => a - b)
  const suits = cards.map(c => c.suit)

  const allSameSuit = suits[0] === suits[1] && suits[1] === suits[2]
  const allSameRank = ranks[0] === ranks[1] && ranks[1] === ranks[2]
  const isStraight = (ranks[2]! - ranks[0]! === 2 && new Set(ranks).size === 3)
    || (ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 14)  // A-2-3 wheel

  if (allSameRank && allSameSuit) return 'suited_triple'
  if (isStraight && allSameSuit) return 'straight_flush'
  if (allSameRank) return 'three_of_a_kind'
  if (isStraight) return 'straight'
  if (allSameSuit) return 'flush'
  return 'none'
}
```

> **[Review 2.8] Required tests:** The implementer MUST write unit tests covering every 3-card straight edge case: `A-2-3` (wheel), `Q-K-A`, `10-J-Q`, `K-A-2` (NOT a straight), and same-rank non-straights. Also verify `rankToNumeric` returns 14 for Ace — the wheel case depends on it.

---

## Appendix B: Blackjack Hand Value Edge Cases

### Soft vs Hard Hands

| Hand | Value | Type |
|------|-------|------|
| A-6 | 17 | Soft 17 |
| A-6-5 | 12 | Hard 12 (ace downgrades to 1) |
| A-A | 12 | Soft 12 (one ace = 11, one = 1) |
| Hand | Calculation | Value | Soft? |
|------|-------------|-------|-------|
| A-6 | 11+6=17 | 17 | Yes (ace=11) |
| A-6-5 | 11+6+5=22, downgrade ace: 1+6+5=12 | 12 | No (all aces=1) |
| A-A | 11+1=12 | 12 | Yes (one ace=11) |
| A-A-9 | 11+11+9=31, downgrade one ace: 11+1+9=21 | 21 | Yes (one ace=11) |
| A-A-K | 11+11+10=32, downgrade both: 1+1+10=12 | 12 | No (both aces=1) |
| A-5-5 | 11+5+5=21 | 21 | Yes (ace=11) |
| K-Q-A | 10+10+11=31, downgrade: 10+10+1=21 | 21 | No (ace=1) |

The `calculateHandValue` function handles all these cases correctly via the "downgrade aces" loop.

---

## Appendix C2: Ruleset File Structure

> **[RC-6]** The existing poker ruleset is 1,090 lines. Adding 3 more games' phases, reducers, and thunks would push a single file to 3,000-4,000 lines — unmaintainable and merge-conflict-prone. Factor into separate files per game:

```
apps/server/src/ruleset/
  index.ts                          -- Top-level GameRuleset export (combines all games)
  types.ts                          -- CasinoGameState, shared types
  shared/
    phases.ts                       -- LOBBY, GAME_SELECT phase definitions
    reducers.ts                     -- Root reducers (addPlayer, wallet, video, etc.)
    thunks.ts                       -- Root thunks (VIDEO_HARD_TIMEOUT, etc.)
  holdem/
    phases.ts                       -- All 14 Hold'em phases
    reducers.ts                     -- Hold'em-specific reducers
    thunks.ts                       -- processPlayerAction, evaluateHands, etc.
    helpers.ts                      -- bettingEndIf, bettingNextPhase, etc.
  five-card-draw/
    phases.ts                       -- 8 Draw phases
    reducers.ts                     -- Draw reducers (setDrawHoleCards, etc.)
    thunks.ts                       -- executeDraw, processDrawPlayerAction, etc.
    helpers.ts                      -- isDrawBettingComplete, drawBettingNextPhase, etc.
  blackjack-classic/
    phases.ts                       -- 7 BJ phases
    reducers.ts                     -- BJ reducers
    thunks.ts                       -- processBlackjackAction, playDealerHand, etc.
    hand-value.ts                   -- calculateHandValue, getAvailableBlackjackActions
  blackjack-competitive/
    phases.ts                       -- 6 BJC phases
    reducers.ts
    thunks.ts
```

**`index.ts` composition pattern:**

```typescript
import { sharedPhases, sharedReducers, sharedThunks } from './shared'
import { holdemPhases, holdemReducers, holdemThunks } from './holdem'
import { drawPhases, drawReducers, drawThunks } from './five-card-draw'
import { bjPhases, bjReducers, bjThunks } from './blackjack-classic'
import { bjcPhases, bjcReducers, bjcThunks } from './blackjack-competitive'

export const casinoRuleset: GameRuleset<CasinoGameState> = {
  setup: createInitialState,
  reducers: { ...sharedReducers, ...holdemReducers, ...drawReducers, ...bjReducers, ...bjcReducers },
  thunks: { ...sharedThunks, ...holdemThunks, ...drawThunks, ...bjThunks, ...bjcThunks },
  phases: { ...sharedPhases, ...holdemPhases, ...drawPhases, ...bjPhases, ...bjcPhases },
  actions: {},
  onConnect,
  onDisconnect,
}
```

---

## Appendix C3: Error Handling

> **[Review 3.5]** Error handling and recovery patterns for the multi-game casino.

### Reducer Failures

VGF catches reducer errors internally — if a reducer throws (e.g., from `Object.freeze()` violation), the state remains unchanged and the error is logged. **No action needed at the game design level**, but implementers should ensure all reducers return new objects via spread, never mutate.

### Thunk Failures (Partial State Updates)

Thunks that dispatch multiple reducers sequentially may fail mid-execution. For example, `executeDraw` removes discards (dispatch 1), deals replacements (dispatch 2), and updates the active player (dispatch 3). If dispatch 2 fails, the player's hand is in an inconsistent state (cards removed but not replaced).

**Mitigation:** Wrap multi-dispatch thunks in try/catch. On failure, dispatch a recovery reducer that restores the hand to its pre-draw state (using data captured at the start of the thunk):

```typescript
async function executeDraw(ctx: ThunkCtx, playerId: string): Promise<void> {
  const priorHand = ctx.getState().fiveCardDraw!.holeCards[playerId]!.slice()
  try {
    ctx.dispatch('removeDiscardedCards', playerId)
    ctx.dispatch('dealReplacements', playerId)
    ctx.dispatch('advanceDrawActivePlayer')
  } catch (error) {
    ctx.logger.error('executeDraw failed — restoring hand', { playerId, error })
    ctx.dispatch('setDrawHoleCards', playerId, priorHand)  // restore
  }
}
```

### Shoe Corruption Detection

Before each deal from the shoe, the thunk verifies `ServerGameState.blackjack.shoe.length > 0`. If the shoe is empty when it shouldn't be (cards remaining count mismatch), log an error and trigger an emergency reshuffle of discards.

### State Corruption (Card Count Mismatch)

At `*_HAND_COMPLETE.onBegin`, run a sanity check: total cards dealt to all players + shoe remaining + discards should equal `deckCount * 52`. If not, log a warning. This is a diagnostic tool, not a blocking check — the game continues regardless.

### Connection-Related Recovery

- **Player disconnects mid-hand:** The VGF `onDisconnect` handler marks the member as `ConnectionState.Disconnected`. The game-specific handler auto-folds (poker) or auto-stands (blackjack) after `ACTION_TIMEOUT_MS`.
- **Display disconnects during blocking video:** The server-side `VIDEO_HARD_TIMEOUT` scheduled thunk fires and clears the video, unblocking the phase. No Display needed for game logic to proceed.

## Appendix C4: Phase Context Adapter Pattern

> **[Review 3.6]** Documents the `adaptPhaseCtx` utility used to bridge VGF's `IOnBeginContext` / `IOnEndContext` to a thunk-like API. All new games should use this pattern.

VGF's `onBegin` and `onEnd` lifecycle hooks receive `IOnBeginContext` / `IOnEndContext`, which have `reducerDispatcher` and `thunkDispatcher` but NOT the same API shape as `IThunkContext`. The existing poker ruleset (line ~591-605) provides an `adaptPhaseCtx` adapter:

```typescript
/**
 * Adapts VGF's IOnBeginContext or IOnEndContext to a thunk-like dispatch interface.
 * All new games MUST use this adapter in onBegin/onEnd hooks instead of accessing
 * reducerDispatcher/thunkDispatcher directly.
 */
function adaptPhaseCtx(ctx: IOnBeginContext<CasinoGameState> | IOnEndContext<CasinoGameState>) {
  return {
    getState: () => ctx.getState(),
    dispatch: (name: string, ...args: unknown[]) => ctx.reducerDispatcher(name, ...args),
    dispatchThunk: (name: string, ...args: unknown[]) => ctx.thunkDispatcher(name, ...args),
    logger: ctx.logger,
    session: ctx.session,
    scheduler: ctx.scheduler,  // Available on IOnBeginContext (v4+)
  }
}
```

**Usage in new game phases:**

```typescript
// In any phase's onBegin/onEnd:
onBegin: async (ctx) => {
  const adapted = adaptPhaseCtx(ctx)
  const now = Date.now()
  adapted.dispatch('initDrawState')
  adapted.dispatch('setVideoPlayback', 'draw_dealing_cinematic', 'overlay', now, 2000, false, false, 0, 'low')
  // ... rest of onBegin logic
}
```

This adapter should be extracted to a shared utility file (`src/ruleset/shared/adaptPhaseCtx.ts`) as part of the ruleset factoring (Appendix C2, RC-6).

---

## Appendix C: Complete Reducer & Thunk Registry

> **[C3 FIX]** Every reducer and thunk explicitly declares its **scope**: `root` (available in all phases) or the specific phase(s) it's registered to. VGF resolves dispatch names as: exact match -> `{phase}:{name}` -> `root:{name}`. Phase-scoped reducers are ONLY available during that phase. Root reducers are always available.

### Root Reducers (available in ALL phases)

| Reducer | Scope | Args | Description |
|---------|-------|------|-------------|
| `setSelectedGame` | **root** | `game: CasinoGame` | Set the selected game |
| `confirmGameSelect` | **root** | — | Mark game selection as confirmed |
| `requestGameChange` | **root** | — | Set `gameChangeRequested` flag (v1: host-only) |
| `voteGameChange` | **root** | `playerId, game` | Record a game change vote (v2 only — deferred) |
| `updateWallet` | **root** | `playerId, delta` | Add/subtract from wallet |
| `setWalletBalance` | **root** | `playerId, amount` | Set wallet to exact amount |
| `addPlayer` | **root** | `player: CasinoPlayer` | Add player to roster |
| `removePlayer` | **root** | `playerId` | Remove player from roster |
| `setDealerMessage` | **root** | `message: string \| null` | Update dealer display message |
| `enqueueTTS` | **root** | `message: TTSMessage` | Add TTS message to queue |
| `dequeueTTS` | **root** | `messageId: string` | Remove TTS from queue |
| `setVideoPlayback` | **root** | `assetKey, mode, startedAt, durationMs, blocksPhase, skippable, skipDelayMs, priority` | Set foreground video state (pure reducer — timestamp passed from caller) [V-CRITICAL-1] |
| `completeVideo` | **root** | — | Mark foreground video as completed |
| `clearVideo` | **root** | — | Clear foreground video state |
| `setBackgroundVideo` | **root** | `assetKey: string, loop: boolean` | Set ambient background video loop [V-MAJOR-3] |
| `clearBackgroundVideo` | **root** | — | Clear background video (e.g., on game switch) [V-MAJOR-3] |

### Root Thunks (available in ALL phases)

| Thunk | Scope | Args | Description |
|-------|-------|------|-------------|
| `VIDEO_HARD_TIMEOUT` | **root** | — | Server-side fallback: marks video complete if Display stalls [V-CRITICAL-2] |

### 5-Card Draw Reducers

| Reducer | Scope | Args | Description |
|---------|-------|------|-------------|
| `initDrawState` | **DRAW_POSTING_BLINDS** | — | Initialise `fiveCardDraw` sub-state |
| `setDrawHoleCards` | **DRAW_DEALING, DRAW_DRAW_PHASE** | `playerId, cards: Card[]` | Set player's 5-card hand [C4 FIX] |
| `setDrawDealingComplete` | **DRAW_DEALING** | `boolean` | Flag dealing done |
| `setDrawSelection` | **DRAW_DRAW_PHASE** | `playerId, indices: number[]` | Update player's discard selection |
| `confirmDraw` | **DRAW_DRAW_PHASE** | `playerId` | Mark player's draw as confirmed |
| `setAllDrawsComplete` | **DRAW_DRAW_PHASE** | `boolean` | Flag all draws done |
| `setDrawActivePlayer` | **DRAW_DRAW_PHASE** | `index: number` | Set active player in draw phase |
| `updateDrawPlayerBet` | **DRAW_BETTING_1, DRAW_BETTING_2** | `playerId, amount, action` | Update bet/action |
| `updateDrawPot` | **DRAW_BETTING_1, DRAW_BETTING_2** | — | Collect bets into pot |
| `setDrawShowdownComplete` | **DRAW_SHOWDOWN** | `boolean` | Flag showdown done [C1] |
| `setDrawPotDistributed` | **DRAW_POT_DISTRIBUTION** | `boolean` | Flag pot distributed [C1] |
| `setDrawHandCompleteReady` | **DRAW_HAND_COMPLETE** | `boolean` | Flag hand complete [C1] |
| `clearDrawState` | **DRAW_HAND_COMPLETE** | — | Clear `fiveCardDraw` sub-state |

### 5-Card Draw Thunks

| Thunk | Scope | Args | Description |
|-------|-------|------|-------------|
| `executeDraw` | **DRAW_DRAW_PHASE** | `playerId` | Remove discards, deal replacements, update state |
| `processDrawPlayerAction` | **DRAW_BETTING_1, DRAW_BETTING_2** | `playerId, action, amount?` | Validate and execute betting action |
| `resolveDrawWinners` | **DRAW_POT_DISTRIBUTION** | — | Evaluate hands and distribute pot [C2] |

### Blackjack Classic Reducers

| Reducer | Scope | Args | Description |
|---------|-------|------|-------------|
| `initBlackjackState` | **BJ_PLACE_BETS** | `config: BlackjackConfig` | Initialise `blackjack` sub-state |
| `setBlackjackBet` | **BJ_PLACE_BETS** | `playerId, mainBet, ppBet, 21p3Bet` | Set player's bets |
| `confirmBlackjackBet` | **BJ_PLACE_BETS** | `playerId` | Mark bet as confirmed |
| `setAllBetsPlaced` | **BJ_PLACE_BETS** | `boolean` | Flag all bets placed |
| `dealBlackjackCard` | **BJ_DEAL_INITIAL, BJ_PLAYER_TURNS** | `playerId, handIndex, card` | Add card to player hand |
| `dealCardToDealer` | **BJ_DEAL_INITIAL, BJ_DEALER_TURN** | — | Deal one card to dealer from shoe |
| `revealDealerHoleCard` | **BJ_DEALER_TURN** | — | Flip dealer's hidden card |
| `setBlackjackPlayerStatus` | **BJ_PLAYER_TURNS** | `playerId, handIndex, status` | Update hand status |
| `splitHand` | **BJ_PLAYER_TURNS** | `playerId, handIndex` | Split a hand into two |
| `setBlackjackActivePlayer` | **BJ_PLAYER_TURNS** | `index` | Set which player is active |
| `setBlackjackActiveHand` | **BJ_PLAYER_TURNS** | `index` | Set which hand is active |
| `setAllPlayerTurnsComplete` | **BJ_PLAYER_TURNS** | `boolean` | Flag all player turns done |
| `setInsuranceDecision` | **BJ_INSURANCE** | `playerId, amount` | Record insurance decision |
| `setAllInsuranceDecided` | **BJ_INSURANCE** | `boolean` | Flag all insurance decided |
| `setDealerStatus` | **BJ_DEALER_TURN** | `status` | Update dealer hand status |
| `setDealerTurnComplete` | **BJ_DEALER_TURN** | `boolean` | Flag dealer turn done |
| `setInitialDealComplete` | **BJ_DEAL_INITIAL** | `boolean` | Flag initial deal done |
| `setSettlementComplete` | **BJ_SETTLEMENT** | `boolean` | Flag settlement done [C1] |
| `setBjHandCompleteReady` | **BJ_HAND_COMPLETE** | `boolean` | Flag hand complete [C1] |
| `updateShoeState` | **BJ_DEAL_INITIAL, BJ_PLAYER_TURNS, BJ_DEALER_TURN** | `cardsRemaining, cutCardPassed` | Update shoe count |
| `clearBlackjackState` | **BJ_HAND_COMPLETE** | — | Clear `blackjack` sub-state |

### Blackjack Classic Thunks

| Thunk | Scope | Args | Description |
|-------|-------|------|-------------|
| `processBlackjackAction` | **BJ_PLAYER_TURNS** | `playerId, action: BlackjackAction` | Validate and execute BJ action |
| `advanceBlackjackTurn` | **BJ_PLAYER_TURNS** | — | Advance to next hand/player |
| `playDealerHand` | **BJ_DEALER_TURN** | — | Execute dealer's automatic play |
| `settleBlackjackHands` | **BJ_SETTLEMENT** | — | Calculate and distribute payouts |
| `evaluateSideBets` | **BJ_DEAL_INITIAL** | — | Evaluate Perfect Pairs and 21+3 |

### Blackjack Competitive Reducers

| Reducer | Scope | Args | Description |
|---------|-------|------|-------------|
| `initBjcState` | **BJC_PLACE_BETS** | `config: CompetitiveBlackjackConfig` | Initialise sub-state |
| `setBjcAllAntesPosted` | **BJC_PLACE_BETS** | `boolean` | Flag antes posted |
| `setBjcDealComplete` | **BJC_DEAL_INITIAL** | `boolean` | Flag deal done |
| `dealBjcCard` | **BJC_PLAYER_TURNS** | `playerId, card` | Add card to player |
| `setBjcPlayerStatus` | **BJC_PLAYER_TURNS** | `playerId, status` | Update status |
| `setBjcAllTurnsComplete` | **BJC_PLAYER_TURNS** | `boolean` | Flag turns done |
| `setBjcShowdownComplete` | **BJC_SHOWDOWN** | `boolean` | Flag showdown done [C1] |
| `setBjcSettlementComplete` | **BJC_SETTLEMENT** | `boolean` | Flag settlement done [C1] |
| `setBjcHandCompleteReady` | **BJC_HAND_COMPLETE** | `boolean` | Flag hand complete [C1] |
| `clearBjcState` | **BJC_HAND_COMPLETE** | — | Clear sub-state |

### Blackjack Competitive Thunks

| Thunk | Scope | Args | Description |
|-------|-------|------|-------------|
| `processBjcAction` | **BJC_PLAYER_TURNS** | `playerId, action` | Validate and execute action |
| `advanceBjcTurn` | **BJC_PLAYER_TURNS** | — | Advance to next player (sequential, v1) [M3] |
| `settleBjcRound` | **BJC_SETTLEMENT** | — | Calculate winner and distribute pot |

---

---

# VI. Video Integration

> **Cross-reference:** The full video asset inventory, AI generation prompts, and visual style guide live in [`docs/CASINO-VIDEO-ASSETS.md`](./CASINO-VIDEO-ASSETS.md). This section defines **where** and **how** videos integrate with the VGF phase flow and gameplay loop.

## 21. Video System Architecture

### Overview

Pre-generated AI videos (produced via Nano Banana Pro or equivalent) provide cinematic moments throughout the casino experience. The target aesthetic is **high-end Las Vegas** — Bellagio, Wynn, Aria-calibre luxury. Videos are used for intros, celebrations, transitions, ambient atmosphere, and milestone moments.

Videos play on the **Display (TV) only**. The controller phone does not play videos — it continues to show the player's hand/controls with a dimmed overlay and a "Watch the screen" prompt during full-screen video moments.

### Playback Modes

| Mode | Behaviour | Display Area | Gameplay Paused? |
|------|-----------|-------------|-----------------|
| **Full-Screen** | Video takes over the entire Display. 3D scene hidden. | 100% of viewport | Yes — phase holds until video completes |
| **Overlay** | Video composited on top of the 3D scene with alpha/blend. | Partial viewport (top banner, corner, etc.) | No — gameplay continues underneath |
| **Background** | Video plays behind/beneath the 3D scene as ambient atmosphere. | Full viewport, behind 3D layer | No |
| **Transition** | Full-screen video bridges between two scenes (game change, session events). | 100% of viewport | Yes — phase holds until video completes |

### Video Playback State

Videos are triggered by dispatching a reducer that populates a `videoPlayback` field on the root state. The Display reads this field and renders the `<VideoPlayer>` component accordingly.

```typescript
interface VideoPlayback {
  /** Unique asset key referencing the video (maps to a URL/path in the asset manifest) */
  assetKey: string
  /** Playback mode determines rendering behaviour */
  mode: 'full_screen' | 'overlay' | 'background' | 'transition'
  /** Whether the current phase should hold (endIf blocked) until the video finishes */
  blocksPhase: boolean
  /** Timestamp when playback started (for sync and timeout) */
  startedAt: number
  /** Expected duration in milliseconds (hard timeout — phase advances even if video stalls) */
  durationMs: number
  /** Whether playback has completed (set by the Display client via reducer) */
  completed: boolean
  /** Whether the player can skip this video (tap/click to skip) */
  skippable: boolean
}
```

### Phase Integration Pattern

When a video `blocksPhase: true`, the current phase's `endIf` checks the `completed` flag:

> **[V-CRITICAL-2 FIX]** `endIf` MUST NOT use `Date.now()`. VGF only evaluates `endIf` after reducer dispatches — if no reducers fire between the timeout expiry and the next state change, the timeout never triggers. The hard timeout is implemented via a **scheduled thunk** that dispatches `completeVideo` after `durationMs + buffer`, guaranteeing a reducer fires.

```typescript
endIf: (ctx) => {
  const state = ctx.session.state as CasinoGameState
  // If a blocking video is playing, hold the phase until the server marks it complete
  // NO Date.now() here — the timeout is handled by the scheduled thunk below
  if (state.videoPlayback && state.videoPlayback.blocksPhase && !state.videoPlayback.completed) {
    return false
  }
  // ... normal endIf logic
  return normalEndIfCondition(state)
}
```

**Hard timeout mechanism (server-side scheduled thunk):**

```typescript
// In any onBegin/thunk that dispatches setVideoPlayback with blocksPhase: true:
const now = Date.now()
ctx.dispatch('setVideoPlayback', assetKey, mode, now, durationMs, blocksPhase, skippable, skipDelayMs, priority)

// Schedule a hard timeout — guarantees completeVideo fires even if Display stalls
await ctx.scheduler.upsertTimeout({
  name: `video:timeout:${assetKey}`,
  delayMs: durationMs + VIDEO_HARD_TIMEOUT_BUFFER_MS,
  mode: 'hold',
  dispatch: { kind: 'thunk', name: 'VIDEO_HARD_TIMEOUT' },
})
```

```typescript
// Root thunk: VIDEO_HARD_TIMEOUT
VIDEO_HARD_TIMEOUT: async (ctx) => {
  const state = ctx.getState()
  if (state.videoPlayback && !state.videoPlayback.completed) {
    ctx.dispatch('completeVideo')
  }
}
```

> **[V-CRITICAL-3 FIX]** The Display client CAN dispatch `completeVideo` as an **optimisation** (video finished early / player skipped), but the **server-side scheduled thunk is the primary mechanism**. If the Display disconnects, the server timer fires and clears the video. The Display's dispatch is a nice-to-have that makes the UX snappier — it is NOT required for correctness.

**Dev mode note:** VGF's `NoOpScheduler` does not fire timers in dev mode. Use the `DevScheduler` pattern (`services.scheduler ?? ctx.scheduler`) or add a `setTimeout` fallback in the thunk for local development.

### Fallback Behaviour

If a video fails to load (network error, missing asset, decode failure):

1. The Display dispatches `completeVideo` immediately (optimisation — server timeout is backup)
2. The server-side `VIDEO_HARD_TIMEOUT` scheduled thunk also fires after `durationMs + buffer`
3. The phase advances as if the video played successfully
4. No error is shown to the player — the experience silently degrades to gameplay-only
5. An error is logged server-side for monitoring

### Video Reducers

```typescript
// Pure reducer — sets foreground video state. Timestamp and all values passed from caller.
// [V-CRITICAL-1 FIX] No Date.now() in the reducer. The caller (thunk or onBegin) captures the timestamp.
setVideoPlayback: (state, assetKey: string, mode: VideoPlayback['mode'], startedAt: number, durationMs: number, blocksPhase: boolean, skippable: boolean, skipDelayMs: number, priority: VideoPriority) => ({
  ...state,
  videoPlayback: {
    assetKey,
    mode,
    blocksPhase,
    startedAt,
    durationMs,
    completed: false,
    skippable,
    skipDelayMs,
    priority,
  },
})

// Mark video as completed (dispatched by Display client)
completeVideo: (state) => ({
  ...state,
  videoPlayback: state.videoPlayback ? { ...state.videoPlayback, completed: true } : undefined,
})

// Clear foreground video state
clearVideo: (state) => ({
  ...state,
  videoPlayback: undefined,
})

// [V-MAJOR-3] Set background/ambient video (persists across overlays)
setBackgroundVideo: (state, assetKey: string, loop: boolean) => ({
  ...state,
  backgroundVideo: { assetKey, loop },
})

// [V-MAJOR-3] Clear background video (e.g., when switching games)
clearBackgroundVideo: (state) => ({
  ...state,
  backgroundVideo: undefined,
})
```

---

## 22. Shared Video Triggers

These videos apply regardless of which game is currently active.

### Session-Level Videos

| Trigger | Asset Key | Mode | Duration | Blocks Phase | Skippable | When |
|---------|-----------|------|----------|-------------|-----------|------|
| First connection (session start) | `casino_intro` | full_screen | 8,000ms | Yes | Yes (after 3s) | `LOBBY.onBegin` — first time only (check `sessionStats.handsPlayed === 0`) |
| Game selection confirmed | `game_select_{game}` | transition | 4,000ms | Yes | Yes (after 1s) | `GAME_SELECT.onEnd` — plays the intro for the selected game |
| Game change (switching games) | `game_transition` | transition | 3,000ms | Yes | No | `GAME_SELECT.onBegin` when entered from a `HandComplete` phase (not from `LOBBY`) |
| Session end / all players leave | `casino_outro` | full_screen | 6,000ms | No | Yes | Triggered by `endSession` thunk |

### Casino Intro Video (`casino_intro`)

Plays once when the first player connects. Full-screen cinematic: sweeping exterior shot of a luxury casino at night, push through the doors, across the floor, to the table. Sets the premium Vegas tone.

- **Phase:** `LOBBY`
- **Integration:** `LOBBY.onBegin` checks `state.sessionStats.handsPlayed === 0 && state.players.length === 1` (first player just joined). Dispatches `setVideoPlayback('casino_intro', 'full_screen', Date.now(), 8000, true, true, 3000, 'critical')` (timestamp captured in lifecycle hook, passed to pure reducer).
- **endIf update:** Lobby's `endIf` adds the video completion check before the normal readiness check.

### Game-Specific Intro Videos

Each game has a short intro video that plays during the transition from game selection to the first hand:

| Asset Key | Content Description | Duration |
|-----------|-------------------|----------|
| `game_select_holdem` | Camera swoops to a poker table. Chips scatter. Cards fan. "Texas Hold'em" title card. | 4,000ms |
| `game_select_five_card_draw` | Close-up of a hand of 5 cards being drawn and fanned. Vintage poker parlour feel. "5-Card Draw" title card. | 4,000ms |
| `game_select_blackjack_classic` | Dealer's hands on green felt. Shoe slides cards. Ace + King land. "Blackjack" title card. | 4,000ms |
| `game_select_blackjack_competitive` | Split-screen of two players' hands. Tension music. Cards flip. "Competitive Blackjack" title card. | 4,000ms |

---

## 23. Hold'em Video Integration Points

### Phase-by-Phase Video Triggers

| Phase | Trigger Event | Asset Key | Mode | Duration | Blocks | Skippable | Notes |
|-------|--------------|-----------|------|----------|--------|-----------|-------|
| `POSTING_BLINDS` | Hand #1 of session | `holdem_first_hand` | overlay | 3,000ms | No | No | "First Hand" banner animation. Overlay only — blinds post underneath. |
| `SHOWDOWN` | Any showdown reached | `holdem_showdown_reveal` | overlay | 2,000ms | No | No | Dramatic card-flip cinematic overlay (slow-motion card turn, light flares). Plays behind the actual card reveal animation. |
| `POT_DISTRIBUTION` | Pot >= 500 chips | `holdem_big_pot` | overlay | 3,000ms | No | No | Chips cascade / fireworks overlay for significant pots. |
| `POT_DISTRIBUTION` | Royal Flush | `holdem_royal_flush` | full_screen | 5,000ms | Yes | Yes (after 2s) | Ultimate celebration. Full-screen cinematic — neon lights, confetti, dramatic music sting. |
| `POT_DISTRIBUTION` | Straight Flush | `holdem_straight_flush` | full_screen | 4,000ms | Yes | Yes (after 2s) | Premium hand celebration. |
| `POT_DISTRIBUTION` | Four of a Kind | `holdem_four_of_a_kind` | overlay | 3,000ms | No | No | Strong hand celebration overlay. |
| `HAND_COMPLETE` | Player busted (stack = 0) | `holdem_player_busted` | overlay | 2,500ms | No | No | Commiseration / dramatic moment. |
| `ALL_IN_RUNOUT` | All-in runout begins | `holdem_all_in_runout` | overlay | 2,000ms | No | No | Tension-building overlay (heartbeat, slow motion, dramatic lighting). Plays during the runout dealing. |

### Celebration Tier Logic

The `POT_DISTRIBUTION.onBegin` thunk checks the winning hand category and triggers the appropriate video:

```typescript
// In PotDistribution.onBegin thunk (after resolveWinners)
// Timestamp captured in the thunk, passed to the pure reducer. Priority determines preemption.
const now = Date.now()
const winnerHand = evaluateHand(winnerCards)

if (winnerHand.category === HandCategory.ROYAL_FLUSH) {
  ctx.dispatch('setVideoPlayback', 'holdem_royal_flush', 'full_screen', now, 5000, true, true, 2000, 'critical')
} else if (winnerHand.category === HandCategory.STRAIGHT_FLUSH) {
  ctx.dispatch('setVideoPlayback', 'holdem_straight_flush', 'full_screen', now, 4000, true, true, 2000, 'critical')
} else if (winnerHand.category === HandCategory.FOUR_OF_A_KIND) {
  ctx.dispatch('setVideoPlayback', 'holdem_four_of_a_kind', 'overlay', now, 3000, false, false, 0, 'high')
} else if (state.pot >= 500) {
  ctx.dispatch('setVideoPlayback', 'holdem_big_pot', 'overlay', now, 3000, false, false, 0, 'medium')
}
```

### Ambient / Background Videos

| Asset Key | Mode | When Active | Description |
|-----------|------|-------------|-------------|
| `holdem_ambient_table` | background | During all gameplay phases | Subtle atmospheric loop — candlelight flicker, distant casino floor ambience, slight smoke haze. Renders behind the 3D scene. |

---

## 24. 5-Card Draw Video Integration Points

### Phase-by-Phase Video Triggers

| Phase | Trigger Event | Asset Key | Mode | Duration | Blocks | Skippable | Notes |
|-------|--------------|-----------|------|----------|--------|-----------|-------|
| `DRAW_DEALING` | Deal begins | `draw_dealing_cinematic` | overlay | 2,000ms | No | No | Brief cinematic overlay of cards being shuffled and dealt in a classic poker parlour setting. |
| `DRAW_DRAW_PHASE` | Phase begins | `draw_the_draw` | overlay | 1,500ms | No | No | "The Draw" title card overlay with dramatic reveal styling. |
| `DRAW_SHOWDOWN` | Showdown reached | `draw_showdown_reveal` | overlay | 2,000ms | No | No | Cards fan out dramatically — same feel as Hold'em showdown but with a 5-card fan. |
| `DRAW_POT_DISTRIBUTION` | Royal Flush | `draw_royal_flush` | full_screen | 5,000ms | Yes | Yes (after 2s) | Same celebration tier as Hold'em. |
| `DRAW_POT_DISTRIBUTION` | Straight Flush | `draw_straight_flush` | full_screen | 4,000ms | Yes | Yes (after 2s) | Premium hand celebration. |
| `DRAW_POT_DISTRIBUTION` | Four of a Kind | `draw_four_of_a_kind` | overlay | 3,000ms | No | No | Strong hand overlay. |
| `DRAW_POT_DISTRIBUTION` | Full House or better + pot >= 300 | `draw_big_hand` | overlay | 2,500ms | No | No | Solid hand with a decent pot. |
| `DRAW_DRAW_PHASE` | Player stands pat | `draw_stand_pat` | overlay | 1,500ms | No | No | Brief dramatic overlay — "Standing Pat" — implies confidence, builds tension. |
| `DRAW_DRAW_PHASE` | Player discards 3 (max) | `draw_going_deep` | overlay | 1,500ms | No | No | "Going Deep" overlay — dramatic music sting, implies desperation or a bold play. |

### 5-Card Draw Ambient

| Asset Key | Mode | When Active | Description |
|-----------|------|-------------|-------------|
| `draw_ambient_parlour` | background | During all 5-Card Draw phases | Old-school poker parlour ambience — wood panelling, green glass lamp, cigar smoke, jazz in the background. Distinct from Hold'em's modern casino feel. |

---

## 25. Blackjack Classic Video Integration Points

### Phase-by-Phase Video Triggers

| Phase | Trigger Event | Asset Key | Mode | Duration | Blocks | Skippable | Notes |
|-------|--------------|-----------|------|----------|--------|-----------|-------|
| `BJ_PLACE_BETS` | Phase begins (each round) | `bj_place_bets_prompt` | overlay | 1,500ms | No | No | "Place Your Bets" text animation with chip-toss visual. Brief and non-intrusive. |
| `BJ_DEAL_INITIAL` | Initial deal begins | `bj_deal_cinematic` | overlay | 2,000ms | No | No | Cinematic card-from-shoe sequence. Overlay plays simultaneously with the actual dealing animation. |
| `BJ_DEAL_INITIAL` | Player dealt natural blackjack | `bj_natural_blackjack` | overlay | 3,000ms | No | No | Celebration overlay — gold flash, "BLACKJACK!" text, dramatic sting. Plays immediately when the natural is detected. |
| `BJ_INSURANCE` | Insurance offered | `bj_insurance_dramatic` | overlay | 2,000ms | No | No | Dramatic tension builder — dealer's ace glows, ominous music, "Insurance?" text overlay. |
| `BJ_PLAYER_TURNS` | Player doubles down | `bj_double_down_bold` | overlay | 1,500ms | No | No | "Doubling Down!" — bold move acknowledgement. Brief and punchy. |
| `BJ_PLAYER_TURNS` | Player splits | `bj_split_action` | overlay | 1,500ms | No | No | Cards separate with a visual flourish. |
| `BJ_PLAYER_TURNS` | Player busts | `bj_player_bust` | overlay | 2,000ms | No | No | Sympathetic bust animation — cards crumble or shatter effect. |
| `BJ_PLAYER_TURNS` | Player hits 21 (non-natural) | `bj_twenty_one` | overlay | 2,000ms | No | No | Celebration — "21!" with gold sparkle. Less dramatic than natural blackjack. |
| `BJ_DEALER_TURN` | Hole card reveal | `bj_hole_card_reveal` | overlay | 2,500ms | No | No | The marquee moment. Dramatic slow-motion card flip. Tension peaks. The actual card reveal animation plays simultaneously. |
| `BJ_DEALER_TURN` | Dealer busts | `bj_dealer_bust` | overlay | 3,000ms | No | No | Celebration — dealer bust is a win for all standing players. Confetti, chip shower. |
| `BJ_DEALER_TURN` | Dealer gets blackjack | `bj_dealer_blackjack` | overlay | 2,500ms | No | No | Dramatic sting — dealer reveals blackjack. Ominous. |
| `BJ_SETTLEMENT` | Player wins >= 500 chips in a round | `bj_big_win` | full_screen | 4,000ms | Yes | Yes (after 2s) | Big win celebration — full-screen neon, chips raining. |
| `BJ_SETTLEMENT` | Player wins side bet (any) | `bj_side_bet_win` | overlay | 2,500ms | No | No | Side bet payout celebration — distinct visual from main bet wins. |
| `BJ_SETTLEMENT` | Perfect Pair (25:1 payout) | `bj_perfect_pair` | overlay | 3,000ms | No | No | Premium side bet celebration. |
| `BJ_SETTLEMENT` | 21+3 Suited Triple (100:1 payout) | `bj_suited_triple` | full_screen | 5,000ms | Yes | Yes (after 2s) | Jackpot-tier celebration. Extremely rare. Full cinematic treatment. |

### Blackjack Ambient

| Asset Key | Mode | When Active | Description |
|-----------|------|-------------|-------------|
| `bj_ambient_table` | background | During all Blackjack Classic phases | Modern high-roller blackjack table ambience — soft spotlights, polished felt, crystal glasses, murmur of the casino floor. |

### Blackjack Video Timing Considerations

Blackjack has a faster pace than poker — hands resolve in 30-60 seconds vs poker's 2-5 minutes. Video overlays must be **brief and non-blocking** to avoid disrupting the rhythm. The design intentionally avoids full-screen blocking videos during standard play. Full-screen moments are reserved for:
- Extremely rare outcomes (suited triple, 100:1 payout)
- Major financial wins (>= 500 chips)
- Session-level events (game intro, game change)

---

## 26. Blackjack Competitive Video Integration Points

### Phase-by-Phase Video Triggers

| Phase | Trigger Event | Asset Key | Mode | Duration | Blocks | Skippable | Notes |
|-------|--------------|-----------|------|----------|--------|-----------|-------|
| `BJC_PLACE_BETS` | Round begins | `bjc_ante_up` | overlay | 1,500ms | No | No | "Ante Up!" — competitive framing, player-vs-player energy. |
| `BJC_PLAYER_TURNS` | All players acting simultaneously | `bjc_simultaneous_action` | overlay | 1,500ms | No | No | Brief "All players act!" overlay with split-screen visual energy. |
| `BJC_PLAYER_TURNS` | Player busts | `bjc_player_bust` | overlay | 2,000ms | No | No | Same bust visual as classic but with competitive framing ("One down!"). |
| `BJC_SHOWDOWN` | Showdown begins | `bjc_showdown` | full_screen | 3,000ms | Yes | Yes (after 1s) | Cards flip face-up — dramatic simultaneous reveal. Full-screen cinematic. This IS the showdown moment. |
| `BJC_SETTLEMENT` | Winner determined (close margin, 1 point diff) | `bjc_close_call` | overlay | 2,500ms | No | No | "By a hair!" — tension acknowledgement for narrow victories. |
| `BJC_SETTLEMENT` | Winner with natural 21 | `bjc_natural_winner` | overlay | 3,000ms | No | No | Natural blackjack wins the round — premium celebration. |
| `BJC_SETTLEMENT` | All other players busted (sole survivor) | `bjc_last_standing` | overlay | 3,000ms | No | No | "Last One Standing!" — the only non-busted player wins by default. |
| `BJC_SETTLEMENT` | Pot >= 400 chips | `bjc_big_pot` | overlay | 3,000ms | No | No | Competitive big-pot celebration. |

### Competitive Blackjack Ambient

| Asset Key | Mode | When Active | Description |
|-----------|------|-------------|-------------|
| `bjc_ambient_arena` | background | During all Competitive BJ phases | More intense atmosphere than classic — tighter lighting, darker surroundings, spotlight on the table. Arena/tournament feel rather than casual casino floor. |

---

## 27. Video Playback State & Constants

### State Addition to CasinoGameState

> **[V-MAJOR-1 + V-MAJOR-3 FIX]** The single `videoPlayback` field is split into two: `videoPlayback` for foreground videos (overlays, full-screen, transitions) and `backgroundVideo` for persistent ambient loops. This prevents overlay triggers from evicting the background video, and allows overlays to play on top of the ambient layer.

```typescript
interface CasinoGameState {
  // ... existing fields ...

  /** Currently playing foreground video — overlay, full_screen, or transition */
  videoPlayback?: VideoPlayback

  /** Persistent background/ambient video loop — separate from foreground */
  backgroundVideo?: BackgroundVideo
}

interface VideoPlayback {
  assetKey: string
  mode: 'full_screen' | 'overlay' | 'transition'
  blocksPhase: boolean
  startedAt: number
  durationMs: number
  completed: boolean
  skippable: boolean
  skipDelayMs: number            // [V-MINOR-3 FIX] Per-video skip delay
  priority: VideoPriority        // [V-MAJOR-1] For overlay spam prevention
}

type VideoPriority = 'low' | 'medium' | 'high' | 'critical'

interface BackgroundVideo {
  assetKey: string
  loop: boolean
}
```

> **[V-MAJOR-1] Overlay spam prevention rules:**
> 1. A higher-priority video always preempts a lower-priority one
> 2. Same-priority: the new video is **dropped** (first one wins)
> 3. **Cooldown:** After a foreground video completes, a 1-second cooldown applies before `low`-priority videos can trigger. `medium`+ bypass the cooldown.
> 4. **Per-round cap (blackjack):** Max 3 foreground video triggers per round to prevent the YouTube-montage effect. `critical`-priority (full-screen celebrations) bypass the cap.

**Priority assignments:**

| Priority | Used For | Examples |
|----------|----------|---------|
| `low` | Per-round prompts, routine actions | `bj_place_bets_prompt`, `bj_deal_cinematic`, `draw_the_draw` |
| `medium` | Notable gameplay moments | `bj_player_bust`, `bj_twenty_one`, `holdem_big_pot` |
| `high` | Major celebrations, showdowns | `holdem_four_of_a_kind`, `bj_big_win`, `bjc_showdown` |
| `critical` | Rare/jackpot events, session events | `holdem_royal_flush`, `bj_suited_triple`, `casino_intro` |

### Video Constants

```typescript
// ── Video timing constants ───────────────────────────────────
export const VIDEO_SKIP_DELAY_DEFAULT_MS = 2_000   // Default skip delay (overridden per-video)
export const VIDEO_HARD_TIMEOUT_BUFFER_MS = 1_000  // Extra time beyond durationMs before hard-killing
export const VIDEO_OVERLAY_COOLDOWN_MS = 1_000     // [V-MAJOR-1] Cooldown after overlay for low-priority
export const VIDEO_BJ_MAX_OVERLAYS_PER_ROUND = 3   // [V-MAJOR-1] Per-round cap for blackjack

// ── Video category durations (defaults) ──────────────────────
export const VIDEO_DURATION_INTRO = 8_000
export const VIDEO_DURATION_GAME_SELECT = 4_000
export const VIDEO_DURATION_TRANSITION = 3_000
export const VIDEO_DURATION_CELEBRATION_MAJOR = 5_000
export const VIDEO_DURATION_CELEBRATION_MINOR = 3_000
export const VIDEO_DURATION_OVERLAY_BRIEF = 1_500
export const VIDEO_DURATION_OVERLAY_STANDARD = 2_000
export const VIDEO_DURATION_OVERLAY_EXTENDED = 3_000
export const VIDEO_DURATION_AMBIENT_LOOP = -1       // Loops indefinitely

// ── Video asset manifest (maps asset keys to file paths / URLs) ──
// The actual manifest is loaded at runtime from a JSON config.
// See docs/CASINO-VIDEO-ASSETS.md for the full asset inventory.
```

### Display Component Architecture

```typescript
/**
 * Top-level Display component wraps the game view with a video layer.
 * [V-MAJOR-3 FIX] Background and foreground videos are separate state fields.
 */
function DisplayRoot() {
  const state = useStateSync() as CasinoGameState
  const video = state?.videoPlayback
  const bgVideo = state?.backgroundVideo

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* Background/ambient video layer (behind 3D scene) — separate field, never evicted by overlays */}
      {bgVideo && (
        <VideoPlayer assetKey={bgVideo.assetKey} layer="background" loop={bgVideo.loop} />
      )}

      {/* 3D game scene */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <PhaseRouter />
      </div>

      {/* Overlay video layer (on top of 3D scene) */}
      {video && video.mode === 'overlay' && (
        <VideoPlayer assetKey={video.assetKey} layer="overlay" />
      )}

      {/* Full-screen / transition video (covers everything) */}
      {video && (video.mode === 'full_screen' || video.mode === 'transition') && (
        <VideoPlayer
          assetKey={video.assetKey}
          layer="fullscreen"
          skippable={video.skippable}
          onComplete={() => dispatch('completeVideo')}
        />
      )}
    </div>
  )
}
```

### Controller Behaviour During Videos

When `videoPlayback` is set with `mode === 'full_screen' || mode === 'transition'`:
- The controller dims its UI (50% opacity overlay)
- A "Watch the screen" message appears
- Action buttons are disabled (but the timer pauses too — no player is disadvantaged)
- When the video completes, the controller returns to normal

When `videoPlayback` is set with `mode === 'overlay'`:
- No change to controller — gameplay continues normally
- The video is Display-only

### Video Preloading Strategy

> **[V-MAJOR-2 FIX]** With 51 assets totalling an estimated 100-250MB (compressed 720p H.264), bulk preloading is not realistic. The strategy uses a **priority queue** that preloads only the most likely next video(s), not all possible triggers. Browsers limit concurrent preload requests, and blackjack phases can transition in under 1 second — there is no time to preload between fast phases.

**Preloading rules:**

1. **Max 3 concurrent preloads** at any time. The priority queue evicts lowest-priority entries when the limit is reached.
2. **Preload the selected game's ambient video** during the `game_select_{game}` transition (4 seconds of cover time). This is the highest-priority preload — ambient loops are always needed.
3. **Preload the single most likely next trigger**, not all possible triggers for a phase.
4. **Short overlays (<=2s) can use sprite sheets or WebM clips** bundled with the initial app load (~50-200KB each). This eliminates network latency for brief, frequent overlays like `bj_place_bets_prompt` and `draw_the_draw`.
5. **Accept graceful degradation.** If a video is not yet loaded when triggered, the Display fades in when data is available. The overlay renderer shows a brief opacity ramp (100-200ms) rather than a hard cut. Missing frames are invisible to the player.

| Current Phase | Preload (max 2-3 assets) |
|---------------|---------|
| `LOBBY` | `casino_intro` only |
| `GAME_SELECT` | The selected game's `game_select_{game}` + that game's ambient video |
| Any betting phase (poker) | `holdem_showdown_reveal` (most likely next) |
| `BJ_DEAL_INITIAL` | `bj_natural_blackjack` (conditional on dealt cards) |
| `BJ_PLAYER_TURNS` | `bj_hole_card_reveal` (always plays next phase) |
| `BJ_DEALER_TURN` | `bj_dealer_bust` or `bj_dealer_blackjack` (conditional on dealer's up card) |
| Any `PotDistribution` / `Settlement` | Celebration video matching the winning hand tier (known from state) |

Videos are served from a CDN with aggressive cache headers (`Cache-Control: public, max-age=31536000, immutable`). After a session's first play-through, most assets will be in the browser cache.

### Complete Video Asset Key Registry

For cross-referencing with `docs/CASINO-VIDEO-ASSETS.md`:

**Shared (7 assets):**
`casino_intro`, `casino_outro`, `game_select_holdem`, `game_select_five_card_draw`, `game_select_blackjack_classic`, `game_select_blackjack_competitive`, `game_transition`

**Hold'em (9 assets):**
`holdem_first_hand`, `holdem_showdown_reveal`, `holdem_big_pot`, `holdem_royal_flush`, `holdem_straight_flush`, `holdem_four_of_a_kind`, `holdem_player_busted`, `holdem_all_in_runout`, `holdem_ambient_table`

**5-Card Draw (10 assets):**
`draw_dealing_cinematic`, `draw_the_draw`, `draw_showdown_reveal`, `draw_royal_flush`, `draw_straight_flush`, `draw_four_of_a_kind`, `draw_big_hand`, `draw_stand_pat`, `draw_going_deep`, `draw_ambient_parlour`

**Blackjack Classic (16 assets):**
`bj_place_bets_prompt`, `bj_deal_cinematic`, `bj_natural_blackjack`, `bj_insurance_dramatic`, `bj_double_down_bold`, `bj_split_action`, `bj_player_bust`, `bj_twenty_one`, `bj_hole_card_reveal`, `bj_dealer_bust`, `bj_dealer_blackjack`, `bj_big_win`, `bj_side_bet_win`, `bj_perfect_pair`, `bj_suited_triple`, `bj_ambient_table`

**Blackjack Competitive (9 assets):**
`bjc_ante_up`, `bjc_simultaneous_action`, `bjc_player_bust`, `bjc_showdown`, `bjc_close_call`, `bjc_natural_winner`, `bjc_last_standing`, `bjc_big_pot`, `bjc_ambient_arena`

**Total: 51 unique video assets** across all games and shared elements (7 + 9 + 10 + 16 + 9). [V-MINOR-1 FIX: corrected from ~49]

---

## 28. Video Asset Cross-Reference

> Cross-references the 51 game design trigger keys (this document, Sections 22-26) against the video assets in [`docs/CASINO-VIDEO-ASSETS.md`](./CASINO-VIDEO-ASSETS.md) v2 (51 assets). The original v1 video spec had 77 assets; after alignment, both documents now reference **51 unique video assets**. [V-MINOR-1 FIX: corrected count from ~49 to 51]

### 28.1 Shared Assets Cross-Reference

| Game Design Asset Key | Video Spec Asset ID(s) | Playback Mode (GD / VS) | Duration (GD / VS) | Status | Notes |
|---|---|---|---|---|---|
| `casino_intro` | S01 `intro-shared-casino-exterior` + S02 `intro-shared-casino-lobby` | full_screen / full_screen | 8s / 5s+8s=13s | **DURATION MISMATCH** | GD specifies one 8s video. VS splits into two assets (5s exterior + 8s lobby = 13s total). Either chain S01->S02 as a single sequence, or extend GD duration to ~13s, or trim VS to fit 8s. Recommend: chain S01+S02 into a single 8s edit in post. |
| `casino_outro` | S07 `transition-shared-table-to-lobby` | full_screen / full_screen | 6s / 4s | **DURATION MISMATCH** | GD wants 6s, VS has 4s. Extend S07 or create a dedicated outro asset. S07 is a "return to lobby" transition — GD wants a proper "leaving the casino" outro (exit through doors, exterior at night). **Recommend: new asset needed.** |
| `game_select_holdem` | S04 `transition-shared-lobby-to-holdem` | transition / full_screen | 4s / 5s | **DURATION MISMATCH** | GD: 4s, VS: 5s. Minor — trim VS by 1s in post. Mode difference cosmetic (both full-screen in practice). |
| `game_select_five_card_draw` | S05 `transition-shared-lobby-to-draw` | transition / full_screen | 4s / 5s | **DURATION MISMATCH** | Same as above — trim by 1s. |
| `game_select_blackjack_classic` | S06 `transition-shared-lobby-to-blackjack` | transition / full_screen | 4s / 5s | **DURATION MISMATCH** | Same as above — trim by 1s. |
| `game_select_blackjack_competitive` | *(none)* | transition | 4s | **GAP: No video asset** | VS has no lobby-to-competitive-blackjack transition. VS only has one blackjack transition (S06). Need either a new asset or reuse S06 with a different title card overlay. |
| `game_transition` | S08 `transition-shared-card-fan-wipe` or S09 `transition-shared-chip-cascade` | transition / full_screen | 3s / 2s | **PARTIAL MATCH** | GD envisions a "walking through casino" transition. VS offers two generic wipe transitions (card fan and chip cascade). Different creative vision — GD is more cinematic, VS is more functional. Could use wipe transitions as fallback; a proper corridor-walk asset would match GD intent better. |

### 28.2 Hold'em Assets Cross-Reference

| Game Design Asset Key | Video Spec Asset ID(s) | Playback Mode (GD / VS) | Duration (GD / VS) | Status | Notes |
|---|---|---|---|---|---|
| `holdem_first_hand` | H18 `transition-holdem-new-hand` | overlay / full_screen | 3s / 3s | **MODE MISMATCH** | GD wants overlay ("First Hand" banner), VS has full-screen (shuffle sequence). GD's overlay is less intrusive for what is a minor moment. Recommend: use H18 as overlay or create a simpler banner overlay. |
| `holdem_showdown_reveal` | H17 `transition-holdem-showdown` | overlay / full_screen | 2s / 4s | **MODE + DURATION MISMATCH** | GD: overlay, 2s. VS: full_screen, 4s. GD deliberately keeps this as overlay so the actual 3D card flip is visible underneath. A 4s full-screen would hide the gameplay moment. **Recommend: VS should produce an overlay-compatible version (alpha channel or edge-only effects) at 2s.** |
| `holdem_big_pot` | H04 `celebration-holdem-big-pot` | overlay / full_screen | 3s / 6s | **MODE + DURATION MISMATCH** | GD: overlay 3s, VS: full_screen 6s. A 6s full-screen for a big pot is too disruptive for gameplay pacing. Recommend: overlay version at 3s. Reserve H04 for truly massive pots if desired. |
| `holdem_royal_flush` | H05 `celebration-holdem-royal-flush` | full_screen / full_screen | 5s / 8s | **DURATION MISMATCH** | GD: 5s, VS: 8s. 8s is long for a celebration. Recommend: trim to 5-6s in post. Both agree on full_screen. |
| `holdem_straight_flush` | H06 `celebration-holdem-straight-flush` | full_screen / full_screen | 4s / 6s | **DURATION MISMATCH** | Trim VS to 4-5s. |
| `holdem_four_of_a_kind` | H07 `celebration-holdem-four-of-a-kind` | overlay / full_screen | 3s / 5s | **MODE + DURATION MISMATCH** | GD: overlay 3s, VS: full_screen 5s. GD keeps this as overlay because four-of-a-kind is not rare enough to pause gameplay. Recommend: overlay version at 3s. |
| `holdem_player_busted` | H12 `loss-holdem-allin-loss` | overlay / full_screen | 2.5s / 5s | **MODE + DURATION MISMATCH** | GD: overlay 2.5s (brief commiseration), VS: full_screen 5s (dramatic loss). GD approach is better for pacing — player busting shouldn't halt the game for 5 seconds. |
| `holdem_all_in_runout` | *(none)* | overlay | 2s | **GAP: No video asset** | VS has H10 `celebration-holdem-allin-win` (for the win) but nothing for the tension-building runout itself. Need a new asset: heartbeat, slow-motion, dramatic lighting overlay. |
| `holdem_ambient_table` | H19 `ambient-holdem-room-mood` | background / video texture | loops / 6s loop | OK | Match. Both are ambient loops. VS also has H20 (whisky glass) and H21 (waiting) as additional ambient options. |

### 28.3 5-Card Draw Assets Cross-Reference

| Game Design Asset Key | Video Spec Asset ID(s) | Playback Mode (GD / VS) | Duration (GD / VS) | Status | Notes |
|---|---|---|---|---|---|
| `draw_dealing_cinematic` | D12 `transition-draw-dealing` | overlay / full_screen | 2s / 3s | **MODE MISMATCH** | GD: overlay (dealing happens underneath). VS: full_screen. Recommend overlay at 2s. |
| `draw_the_draw` | D13 `transition-draw-discard` | overlay / full_screen | 1.5s / 3s | **MODE + DURATION MISMATCH** | GD wants a brief "The Draw" title overlay. VS has a full-screen discard animation at 3s. Different intent — GD is a title card, VS is a gameplay transition. Both useful but serve different purposes. **Recommend: create a 1.5s overlay title card. D13 can be used as an optional discard transition.** |
| `draw_showdown_reveal` | D14 `transition-draw-showdown` | overlay / full_screen | 2s / 4s | **MODE + DURATION MISMATCH** | Same issue as Hold'em showdown. GD wants overlay so 3D reveal is visible. Recommend overlay at 2s. |
| `draw_royal_flush` | D05 `celebration-draw-royal-flush` | full_screen / full_screen | 5s / 8s | **DURATION MISMATCH** | Trim to 5-6s. |
| `draw_straight_flush` | D06 `celebration-draw-straight-flush` | full_screen / full_screen | 4s / 6s | **DURATION MISMATCH** | Trim to 4-5s. |
| `draw_four_of_a_kind` | D07 `celebration-draw-four-of-a-kind` | overlay / full_screen | 3s / 5s | **MODE + DURATION MISMATCH** | Overlay at 3s recommended. |
| `draw_big_hand` | D04 `celebration-draw-big-pot` | overlay / full_screen | 2.5s / 6s | **MODE + DURATION MISMATCH** | GD: full house+ with decent pot, overlay 2.5s. VS: big pot, full_screen 6s. Recommend overlay 2.5-3s. |
| `draw_stand_pat` | *(none)* | overlay | 1.5s | **GAP: No video asset** | VS has no "standing pat" moment. Unique to GD's design for dramatic draw-phase moments. Need new asset. |
| `draw_going_deep` | *(none)* | overlay | 1.5s | **GAP: No video asset** | VS has no "discard 3" dramatic moment. Need new asset. |
| `draw_ambient_parlour` | D16 `ambient-draw-lounge-mood` | background / video texture | loops / 6s loop | OK | Match. VS also has D17 (smoke wisps) and D18 (waiting). |

### 28.4 Blackjack Classic Assets Cross-Reference

| Game Design Asset Key | Video Spec Asset ID(s) | Playback Mode (GD / VS) | Duration (GD / VS) | Status | Notes |
|---|---|---|---|---|---|
| `bj_place_bets_prompt` | *(none)* | overlay | 1.5s | **GAP: No video asset** | VS has no "Place Your Bets" prompt overlay. Need new asset — text animation with chip-toss visual. |
| `bj_deal_cinematic` | B17 `transition-blackjack-dealing` | overlay / full_screen | 2s / 3s | **MODE MISMATCH** | GD: overlay (dealing happens underneath). VS: full_screen. Recommend overlay at 2s. |
| `bj_natural_blackjack` | B04 `celebration-blackjack-natural` | overlay / full_screen | 3s / 6s | **MODE + DURATION MISMATCH** | GD: overlay 3s (detected during deal, don't halt the game). VS: full_screen 6s. GD pacing is critical here — blackjack is fast. Recommend overlay at 3s. |
| `bj_insurance_dramatic` | *(none)* | overlay | 2s | **GAP: No video asset** | VS has B08 `celebration-blackjack-insurance-pays` (for when insurance wins) but no tension/prompt video for when insurance is offered. Need new asset. |
| `bj_double_down_bold` | B06 `celebration-blackjack-double-down-win` | overlay / full_screen | 1.5s / 5s | **MODE + DURATION + CONTEXT MISMATCH** | GD triggers on the double-down action itself. VS triggers on the double-down win. Different moments. GD needs a brief action acknowledgement; VS has a win celebration. **Both are useful but need separate assets.** |
| `bj_split_action` | B07 `celebration-blackjack-split-double-win` | overlay / full_screen | 1.5s / 6s | **CONTEXT MISMATCH** | GD: triggered when a split happens (action). VS: triggered when both split hands win (celebration). Completely different moments. **GD's split action overlay needs a new asset.** |
| `bj_player_bust` | B13 `loss-blackjack-bust` | overlay / full_screen | 2s / 4s | **MODE + DURATION MISMATCH** | GD: overlay 2s (quick, sympathetic). VS: full_screen 4s. Blackjack pacing demands overlay. Recommend overlay at 2s. |
| `bj_twenty_one` | *(none)* | overlay | 2s | **GAP: No video asset** | VS has no non-natural 21 celebration. B04 covers natural blackjack only. Need new asset — "21!" with gold sparkle. |
| `bj_hole_card_reveal` | B19 `transition-blackjack-dealer-reveal` | overlay / full_screen | 2.5s / 3s | **MODE MISMATCH** | GD: overlay (3D card flip plays simultaneously underneath). VS: full_screen. **Critical: the overlay mode is essential here — the actual card reveal must be visible.** Recommend overlay 2.5s. |
| `bj_dealer_bust` | B12 `special-blackjack-dealer-bust` | overlay / full_screen | 3s / 4s | **DURATION MISMATCH** | Minor — trim to 3s. Mode OK (VS has full-screen but GD wants overlay). |
| `bj_dealer_blackjack` | B14 `loss-blackjack-dealer-21` | overlay / full_screen | 2.5s / 4s | **MODE + DURATION MISMATCH** | GD: overlay 2.5s ominous sting. VS: full_screen 4s. Recommend overlay. |
| `bj_big_win` | B03 `celebration-blackjack-standard-win` or custom | full_screen / full_screen | 4s / 4s | OK | Duration matches. B03 is "standard win" though — for a big win (>=500 chips), might want something more dramatic. VS has B09 `celebration-blackjack-streak` (5s) which could work. |
| `bj_side_bet_win` | B10 `special-blackjack-perfect-pair` + B11 `special-blackjack-21+3` | overlay / PiP overlay | 2.5s / 3s | **PARTIAL MATCH** | GD has a generic `bj_side_bet_win` plus specific `bj_perfect_pair`. VS has separate assets for each side bet type (B10, B11) as PiP. Good alignment on concept, but GD should split into two specific triggers matching VS. |
| `bj_perfect_pair` | B10 `special-blackjack-perfect-pair` | overlay / PiP overlay | 3s / 3s | OK | Duration matches. Mode difference is cosmetic (PiP vs overlay — both non-blocking). |
| `bj_suited_triple` | *(none directly — B11 covers 21+3 generically)* | full_screen | 5s | **PARTIAL MATCH** | GD wants a jackpot-tier full_screen celebration for the 100:1 suited triple specifically. B11 is a generic 21+3 PiP at 3s. The suited triple is rare enough to warrant its own full-screen asset. **Need new asset for the jackpot moment.** |
| `bj_ambient_table` | B21 `ambient-blackjack-floor-energy` | background / video texture | loops / 6s loop | OK | Match. VS also has B22 (chrome reflections) and B23 (waiting). |

### 28.5 Blackjack Competitive Assets Cross-Reference

| Game Design Asset Key | Video Spec Asset ID(s) | Playback Mode (GD / VS) | Duration (GD / VS) | Status | Notes |
|---|---|---|---|---|---|
| `bjc_ante_up` | *(none)* | overlay | 1.5s | **GAP: No video asset** | VS has no competitive blackjack-specific assets at all. The entire competitive variant is missing from the video spec. |
| `bjc_simultaneous_action` | *(none)* | overlay | 1.5s | **GAP: No video asset** | Same — no competitive BJ coverage in VS. |
| `bjc_player_bust` | B13 `loss-blackjack-bust` (reuse) | overlay / full_screen | 2s / 4s | **REUSE POSSIBLE** | Can reuse the classic BJ bust asset with mode/duration adjustments. |
| `bjc_showdown` | *(none)* | full_screen | 3s | **GAP: No video asset** | The signature competitive BJ moment has no asset. Needs a new simultaneous-reveal cinematic. |
| `bjc_close_call` | *(none)* | overlay | 2.5s | **GAP: No video asset** | No competitive BJ coverage. |
| `bjc_natural_winner` | B04 `celebration-blackjack-natural` (reuse) | overlay / full_screen | 3s / 6s | **REUSE POSSIBLE** | Can reuse with mode/duration adjustment. |
| `bjc_last_standing` | *(none)* | overlay | 3s | **GAP: No video asset** | No competitive BJ coverage. |
| `bjc_big_pot` | *(none)* | overlay | 3s | **GAP: No video asset** | No competitive BJ coverage. |
| `bjc_ambient_arena` | *(none)* | background | loops | **GAP: No video asset** | Competitive BJ needs its own distinct ambient (arena/tournament feel). Nothing in VS. |

### 28.6 Unmatched Video Spec Assets (in VS v1, no trigger in GD)

> **RESOLVED (Video Spec v2):** The video spec has been updated to v2 (**51 assets**, aligned with GDD's 51 trigger keys). The original v1 spec contained 77 assets; after the alignment pass, 28 unmatched assets were either added as GD triggers, reclassified as scene-level textures, deferred, or removed. The table below is retained for historical reference only.

These 28 assets existed in the video spec v1 but had no corresponding trigger point in the game design:

| Video Spec ID | Asset ID | Description | Recommendation |
|---|---|---|---|
| S03 | `intro-shared-logo-reveal` | Logo materialises in gold particles | **ADD TRIGGER:** Play before `casino_intro` or after it. Could be the very first thing on session start (before lobby). Add as `casino_logo_reveal`, full_screen, 4s, skippable. |
| S10 | `transition-shared-loading` | Elegant loading animation | **ADD TRIGGER:** Use during initial asset loading / game boot. Not phase-triggered — Display shows this while waiting for VGF connection. Add as a non-phase-driven asset. |
| S11 | `ambient-shared-city-bokeh` | Nighttime city bokeh | **ADD TRIGGER:** Use as video texture in the 3D scene (window panes in the casino rooms). Not a phase trigger — applied as a scene prop texture. Document as a scene-level asset. |
| S12 | `ambient-shared-chandelier-sparkle` | Crystal chandelier close-up | **ADD TRIGGER:** Same as S11 — scene-level video texture for ceiling/chandelier props across all rooms. |
| S13 | `ambient-shared-lobby-idle` | Slow lobby pan | **ADD TRIGGER:** Play on Display during `LOBBY` phase when no player activity for 15+ seconds. Add as `lobby_idle_loop`, background, loops. |
| S14 | `dealer-shared-entrance` | Dealer walks to table | **ADD TRIGGER:** Play during the first hand of each game session (after game select, before first deal). Add as `dealer_entrance`, PiP overlay, 5s, non-blocking. |
| S15 | `dealer-shared-shuffle-closeup` | Riffle shuffle close-up | **NO TRIGGER NEEDED:** VS marks this as "Reference" — development use only, not shipped. |
| S16 | `dealer-shared-ready` | Dealer nod — "ready" | **ADD TRIGGER:** Play after dealer entrance, or at the start of each hand. Add as `dealer_ready`, PiP overlay, 3s, non-blocking. |
| H01 | `intro-holdem-vault-doors` | Mahogany doors opening | **COVERED:** Part of `game_select_holdem` experience. S04 is the corridor-to-doors transition; H01 is the doors opening. Chain S04 -> H01 for the full intro. |
| H02 | `intro-holdem-table-reveal` | Crane down to table | **COVERED:** Continuation of H01. Chain H01 -> H02 for the complete room reveal. |
| H03 | `celebration-holdem-standard-win` | Chips slide to winner, warm glow | **ADD TRIGGER:** Standard pot win (pot < 500, non-premium hand). Currently no trigger for ordinary wins. Add as `holdem_standard_win`, overlay, 4s, non-blocking. |
| H08 | `celebration-holdem-full-house` | Full house celebration | **ADD TRIGGER:** Currently GD has no full-house-specific celebration. Add as `holdem_full_house`, overlay, 3s, non-blocking. Slot between four_of_a_kind and big_pot in the celebration tier. |
| H09 | `celebration-holdem-flush` | Flush celebration | **ADD TRIGGER:** Same gap — no flush-specific trigger. Add as `holdem_flush`, overlay, 3s, non-blocking. |
| H10 | `celebration-holdem-allin-win` | All-in win dramatic | **ADD TRIGGER:** Winning an all-in showdown. Different from `holdem_all_in_runout` (which is tension during the runout). Add as `holdem_allin_win`, full_screen, 5s, skippable after 2s. Plays during POT_DISTRIBUTION when the winner was all-in. |
| H11 | `loss-holdem-fold` | Cards muck animation | **ADD TRIGGER (OPTIONAL):** Could trigger when a significant pot is won by fold (everyone folds to a big bet). Low priority — risk of video fatigue on routine folds. Recommend: skip for v1. |
| H13 | `loss-holdem-bad-beat` | Bad beat close-up | **ADD TRIGGER:** When a player with a strong hand (two pair+) loses to a better hand. Add as `holdem_bad_beat`, overlay, 3s, non-blocking. Triggers in SHOWDOWN/POT_DISTRIBUTION. |
| H14 | `transition-holdem-to-flop` | Push-in as 3 cards appear | **ADD TRIGGER (OPTIONAL):** Could play during `DEALING_FLOP` phase. Currently GD has no per-street transition videos. Risk: adds 3s to every flop deal, slowing the game. Recommend: skip for v1 or make optional. |
| H15 | `transition-holdem-to-turn` | Single card slides out | **Same as H14 — optional, potential pacing issue.** |
| H16 | `transition-holdem-to-river` | Dramatic push-in, single card | **Same as H14 — optional. This one could work for the river specifically (more dramatic).** |
| H18 | `transition-holdem-new-hand` | Shuffle, dealer button moves | **PARTIALLY COVERED:** Mapped to `holdem_first_hand` but that's only hand #1. H18 could trigger on every new hand in POSTING_BLINDS.onBegin. Risk: pacing drag. Recommend: use only for hand #1 or after a long pause between hands. |
| H20 | `ambient-holdem-whisky-glass` | Whisky glass close-up | **SCENE TEXTURE:** Not a trigger — use as video texture in the 3D scene (prop on the table). |
| H21 | `ambient-holdem-waiting` | Overhead table, waiting | **ADD TRIGGER:** Same pattern as lobby idle — play after 15s inactivity during any Hold'em phase. |
| D01 | `intro-draw-lounge-entrance` | Beaded curtain entrance | **COVERED:** Part of `game_select_five_card_draw`. Chain S05 -> D01 for full intro. |
| D02 | `intro-draw-table-reveal` | Bar to table tracking shot | **COVERED:** Continuation of D01. Chain D01 -> D02. |
| D03 | `celebration-draw-standard-win` | Chips collect, amber light | **ADD TRIGGER:** Standard win, same gap as Hold'em. Add `draw_standard_win`, overlay, 3s. |
| D08 | `celebration-draw-perfect-draw` | Exact cards needed drawn | **ADD TRIGGER:** When a player draws and significantly improves their hand (e.g., draws to a flush/straight). Add `draw_perfect_draw`, overlay, 3s. Evaluate improvement in the `executeDraw` thunk. |
| D09 | `loss-draw-fold` | Cards tossed, lamp dims | **OPTIONAL:** Same as H11 — routine folds don't need video. Skip for v1. |
| D10 | `loss-draw-bad-hand` | Disappointing reveal | **ADD TRIGGER:** When a player's hand at showdown is high-card or worse after drawing cards. Add `draw_bad_hand`, overlay, 2.5s. |
| D11 | `loss-draw-allin-loss` | Chips slide away | **ADD TRIGGER:** Player goes all-in and loses. Add `draw_allin_loss`, overlay, 3s. |
| D15 | `transition-draw-new-hand` | Deck gathered, shuffle | **OPTIONAL:** Same pacing concern as H18. |
| D17 | `ambient-draw-smoke-wisps` | Cigar smoke in light beam | **SCENE TEXTURE:** Video texture for the 3D scene, not a trigger. |
| D18 | `ambient-draw-waiting` | Table from above, waiting | **ADD TRIGGER:** Idle loop, same as H21. |
| B01 | `intro-blackjack-floor-entrance` | Sweep onto casino floor | **COVERED:** Part of `game_select_blackjack_classic`. Chain S06 -> B01. |
| B02 | `intro-blackjack-table-reveal` | Track to hero table | **COVERED:** Continuation of B01. Chain B01 -> B02. |
| B03 | `celebration-blackjack-standard-win` | Chips push, bright lighting | **PARTIALLY COVERED:** Mapped to `bj_big_win` but B03 is standard, not big. Add `bj_standard_win`, overlay, 3s for normal wins. |
| B05 | `celebration-blackjack-five-card-charlie` | Five cards under 21 | **ADD TRIGGER:** Five-card Charlie (5 cards without busting) is a notable achievement. Add `bj_five_card_charlie`, overlay, 3s. Triggers in BJ_PLAYER_TURNS when a player's hand reaches 5 cards without busting. |
| B07 | `celebration-blackjack-split-double-win` | Both split hands win | **ADD TRIGGER:** When both hands after a split win against the dealer. Add `bj_split_double_win`, overlay, 4s. Triggers in BJ_SETTLEMENT. |
| B08 | `celebration-blackjack-insurance-pays` | Insurance paid out | **ADD TRIGGER:** When insurance bet pays off. Add `bj_insurance_pays`, overlay, 3s. Triggers in BJ_INSURANCE.onEnd when dealer has blackjack. |
| B09 | `celebration-blackjack-streak` | Winning streak, chips stacking | **ADD TRIGGER:** When a player wins 3+ consecutive hands. Add `bj_winning_streak`, overlay, 3s. Requires tracking consecutive wins in blackjack state. |
| B15 | `loss-blackjack-push` | Push result, chips stay | **ADD TRIGGER:** On a push (tie with dealer). Add `bj_push`, overlay, 2s. Triggers in BJ_SETTLEMENT. |
| B16 | `loss-blackjack-insurance-lost` | Insurance side bet lost | **ADD TRIGGER:** When insurance bet loses. Add `bj_insurance_lost`, PiP overlay, 2s. Triggers in BJ_INSURANCE.onEnd when dealer doesn't have blackjack. |
| B18 | `transition-blackjack-hit` | Card slides from shoe | **OPTIONAL:** Could trigger on every hit. Risk: extreme pacing drag — hits happen every few seconds. Skip for v1. |
| B20 | `transition-blackjack-new-round` | Cards sweep into discard | **OPTIONAL:** Between rounds. Low priority — skip for v1 or use as ambient. |
| B22 | `ambient-blackjack-chrome-reflections` | Chrome shoe close-up | **SCENE TEXTURE:** Video texture for 3D scene, not a trigger. |
| B23 | `ambient-blackjack-waiting` | Table from above, waiting | **ADD TRIGGER:** Idle loop, same as others. |

### 28.7 Summary of Findings

> **UPDATE:** The video spec has been revised to v2 (51 assets, aligned with GDD's 51 trigger keys). All 10 gaps, 28 unmatched assets, mode mismatches, and duration mismatches identified in the original cross-reference (Sections 28.1-28.6 above) have been resolved in the video spec v2 revision. The tables above are retained as historical documentation of the analysis that drove the alignment.

#### Resolution Status

| Issue Category | v1 Count | v2 Status |
|---|---|---|
| GD keys missing video assets (gaps) | 10 | **All resolved** — video spec v2 added assets for all 10 gaps including competitive BJ coverage |
| Unmatched VS assets (no GD trigger) | 28 | **All resolved** — assets either added as GD triggers, reclassified as scene textures, deferred to v2, or removed |
| Mode mismatches (full_screen vs overlay) | ~15 | **All resolved** — video spec v2 produces overlay-compatible versions for all GD-overlay assets |
| Duration mismatches | ~12 | **All resolved** — video spec v2 aligns durations to GD targets; longer "director's cut" versions retained for future use |

Both documents now reference **51 unique video assets** with matching asset keys, playback modes, and durations.

---

*End of Game Design Document*

# Weekend Casino v2 — Existing Game Improvements & Cross-Game Features

> **Status:** Reference Only
> **Authority:** Existing game improvement proposals. Defers to `CASINO-V2-ROADMAP-FINAL.md` for release timing and scope.
> **Last Aligned:** 2026-02-28
> **Canonical Decisions:** See `docs/CANONICAL-DECISIONS.md`
> **Supersedes:** — | **Superseded By:** `CASINO-V2-ROADMAP-FINAL.md` (for release scope/timing)
>
> **Version:** 1.0
> **Date:** 2026-02-27
> **Author:** PM — Game Design
> **Objective:** Enhance existing games (Hold'em, 5-Card Draw, Blackjack) with variants, modes, and cross-game features that drive daily engagement and game variety.
> **Depends on:** [CASINO-PRD.md](./CASINO-PRD.md), [CASINO-GAME-DESIGN.md](./CASINO-GAME-DESIGN.md), [CASINO-V2-RETENTION.md](./CASINO-V2-RETENTION.md)

---

## Table of Contents

1. [Hold'em Improvements](#1-holdem-improvements)
2. [5-Card Draw Improvements](#2-5-card-draw-improvements)
3. [Blackjack Improvements](#3-blackjack-improvements)
4. [Cross-Game Features](#4-cross-game-features)
5. [Priority Summary](#5-priority-summary)

---

## 1. Hold'em Improvements

### 1.1 Speed Poker Variant

**What:** A fast-paced Hold'em mode with shorter timers, quicker animations, and accelerated blind levels.

| Setting | Standard Hold'em | Speed Poker |
|---------|-----------------|-------------|
| Action timer | 30 seconds | 10 seconds |
| Deal animation | ~2 seconds | ~0.8 seconds |
| Blind increase | Manual (host-controlled) | Every 5 hands automatically |
| Auto-fold on timeout | No (default check if possible) | Yes — always fold on timeout |
| Pre-flop auto-deal | After manual start | Auto-deal 3 seconds after previous hand |

**Why it drives DAU:** Speed Poker solves the "we only have 20 minutes" problem. When a group has limited time, Standard Hold'em feels too slow — you get through 8-10 hands. Speed Poker delivers 25-30 hands in the same window. More hands = more action = more dopamine = "let's play one more round."

**Expected retention impact:** +10-15% session frequency for time-constrained groups. Enables "quick game before dinner" use case that Standard Hold'em can't serve.

**VGF integration:**

```typescript
interface HoldemConfig {
  // ... existing fields ...
  variant: 'standard' | 'speed'
  actionTimeoutMs: number           // 30000 or 10000
  dealAnimationSpeedMultiplier: number  // 1.0 or 2.5
  autoBlindIncrease: boolean
  autoBlindIntervalHands: number    // 5 for speed
  autoDealDelayMs: number           // 0 for standard (manual), 3000 for speed
  foldOnTimeout: boolean            // false for standard, true for speed
}
```

**Phase changes:** No new phases. The existing Hold'em phases use the config values for timers and animation speeds. The `HAND_COMPLETE` phase checks `autoBlindIncrease` and increments `blindLevel` every N hands.

**Implementation complexity:** S — config-driven changes to existing timers and animation speeds. No new game logic.

**Priority:** P0 — ships with v2. Low effort, high value.

### 1.2 Bounty / Knockout Tournament Mode

**What:** Each player has a bounty on their head. When you eliminate a player (they bust out), you collect their bounty as bonus chips. Creates an aggressive, action-packed dynamic.

**Rules:**

| Rule | Detail |
|------|--------|
| Buy-in | Fixed (e.g., 5,000 chips) |
| Starting bounty | 25% of buy-in (e.g., 1,250 chips) |
| Bounty payout | Collected immediately when a player busts |
| Bounty growth | The eliminator's bounty increases by 50% of the collected bounty |
| Elimination | Player is eliminated when their stack reaches 0. No rebuys. |
| Winner | Last player standing. Wins remaining prize pool. |

**Bounty display on TV:** Each player's seat shows their current bounty as a badge next to their chip count. Growing bounties create visible targets — "Player 2 has a 3,750 bounty, everyone's gunning for them."

**State shape:**

```typescript
interface BountyTournamentState {
  isActive: boolean
  bounties: Record<string, number>   // playerId -> current bounty
  eliminationOrder: string[]         // playerIds in order of elimination
  bountiesCollected: Record<string, number>  // playerId -> total bounties won
}
```

**Why it drives DAU:** Bounty mode transforms passive play into aggression. Every player has a visible price on their head. "I knocked out 3 people tonight" is a bragging point that drives rematch requests. The escalating bounties create a "bigger target" dynamic that gets more exciting as the game progresses.

**Expected retention impact:** +10% rematch rate (players who play again immediately after a bounty tournament).

**Implementation complexity:** M — new tournament lifecycle, bounty tracking, elimination detection, prize pool management. Reuses existing Hold'em phases.

**Priority:** P1 — ships in v2.1.

### 1.3 All-In Insurance Side Bet

**What:** When a player goes all-in, they can optionally buy "insurance" — a side bet that pays out if they lose the all-in.

**Rules:**

| Rule | Detail |
|------|--------|
| Availability | Only when going all-in and at least one opponent calls |
| Cost | 10% of the all-in amount (deducted from wallet, not stack) |
| Payout | If the all-in player loses: 50% of the all-in amount returned to wallet |
| If player wins | Insurance cost is lost (sunk cost) |
| Limit | One insurance per hand per player |

**Controller UX:** When a player goes all-in and is called, a 5-second prompt appears on their phone: "Buy All-In Insurance? Cost: 500 chips. Get back 2,500 if you lose."

**Why it drives DAU:** Reduces the sting of bad beats. Getting rivered on an all-in is the #1 rage-quit trigger in poker. Insurance softens the blow, keeping players in the session longer instead of tilting and leaving.

**Expected retention impact:** +5% session continuation rate after bad beats.

**VGF integration:**

```typescript
interface AllInInsurance {
  playerId: string
  allInAmount: number
  insuranceCost: number             // 10% of allInAmount
  purchased: boolean
  resolved: boolean
  payout: number                    // 0 or 50% of allInAmount
}

// Added to HoldemState
allInInsurance?: AllInInsurance[]
```

**Implementation complexity:** S — simple side bet, resolved at showdown. UI is a timed prompt.

**Priority:** P2 — ships in v2.2.

### 1.4 Rabbit Hunting (Show What Would Have Come)

**What:** After a hand ends (fold or showdown), any player can tap "Rabbit Hunt" to see what community cards would have been dealt if the hand continued.

**Rules:**
- Available for 10 seconds after hand ends
- Only shows undealt community cards (e.g., if someone folds on the flop, show the turn and river)
- The rabbit-hunted cards are shown on the TV with a translucent "ghost" effect — clearly marked as hypothetical
- Costs 100 chips per rabbit hunt (small fee to prevent spamming)

**Controller UX:** After a hand ends, a "Rabbit Hunt (100 chips)" button appears on all controllers for 10 seconds.

**Why it drives DAU:** Rabbit hunting creates "what if" moments — "I folded and the river would have given me a flush!" These moments generate stories, arguments, and social energy. They also teach players about hand equity ("I should have called there").

**VGF integration:**

```typescript
// Thunk: rabbitHunt
// Reads undealt cards from ServerGameState.deck
// Dispatches setRabbitCards with the hypothetical community cards
// Only available in HAND_COMPLETE phase for 10 seconds

interface RabbitHuntState {
  requestedBy: string | null
  hypotheticalCards: Card[]
  revealedAt: number | null
}

// Added to HoldemState
rabbitHunt?: RabbitHuntState
```

**Implementation complexity:** S — reads from existing deck state, displays on TV with a ghost effect. Timer-gated.

**Priority:** P2 — ships in v2.2.

---

## 2. 5-Card Draw Improvements

### 2.1 Wild Card Variant (Deuces Wild / Jokers Wild)

**What:** Optional wild cards that can represent any card. Two sub-variants:

**Deuces Wild:**
- All four 2s are wild
- A wild card completes any hand (e.g., 2-K-K-K-A = Four of a Kind)
- New hand: "Five of a Kind" (e.g., 2-2-A-A-A) — ranks above a Royal Flush

**Jokers Wild:**
- Two Jokers added to the deck (54-card deck)
- Jokers are wild
- "Five of a Kind" ranks above Royal Flush

**Hand ranking (with wilds):**

| Rank | Hand | Example |
|------|------|---------|
| 1 | Five of a Kind | A-A-A-A-2(wild) or A-A-A-Joker-Joker |
| 2 | Royal Flush | A-K-Q-J-10 (with or without wilds) |
| 3 | Straight Flush | 5-6-7-8-9 suited |
| ... | (standard rankings) | |

**State shape:**

```typescript
interface FiveCardDrawConfig {
  // ... existing fields ...
  wildCardMode: 'none' | 'deuces_wild' | 'jokers_wild'
}

// Hand evaluator needs a wildcard-aware mode
function evaluateHandWithWilds(cards: Card[], wildCardMode: WildCardMode): HandResult {
  // Replace wild cards with every possible card, find the best hand
  // This is computationally bounded: max 4 wilds x 52 possible replacements
  // For 2 wilds: 52 x 52 = 2,704 combinations — trivial
}
```

**Why it drives DAU:** Wild cards inject chaos and excitement into 5-Card Draw. "Deuces Wild" is the most popular video poker variant for a reason — every hand has potential. The "Five of a Kind" possibility creates a new, aspirational hand that doesn't exist in standard poker.

**Expected retention impact:** +10% 5-Card Draw session frequency. Converts players who find standard Draw "boring" compared to Hold'em.

**Implementation complexity:** M — hand evaluator extension for wild cards, new hand ranking (Five of a Kind), 54-card deck option, config UI.

**Priority:** P1 — ships in v2.1.

### 2.2 Lowball Variant (Lowest Hand Wins)

**What:** Inverted hand rankings. The worst poker hand wins. A-2-3-4-5 is the best hand (the "wheel"). Straights and flushes do NOT count against you in "2-7 Lowball" rules.

**Lowball hand ranking (2-7 rules):**

| Rank | Hand | Example |
|------|------|---------|
| 1 (best) | 2-3-4-5-7 unsuited | The "number one" |
| 2 | 2-3-4-5-6 unsuited | |
| 3 | Any 7-high unsuited with no pairs | |
| ... | Lower is better. Pairs are bad. Flushes/straights count. | |
| Worst | Any hand with pairs, trips, etc. | Four aces = terrible |

**Alternative: Ace-to-Five Lowball** (simpler for casual players):
- Aces are always low
- Straights and flushes are ignored
- A-2-3-4-5 ("the wheel") is the best hand
- This is easier to understand for newcomers

**Config:**

```typescript
interface FiveCardDrawConfig {
  // ... existing fields ...
  lowballMode: 'none' | 'ace_to_five' | 'deuce_to_seven'
}
```

**Why it drives DAU:** Lowball turns poker strategy on its head. Experienced players love it because it exercises different skills. Casual players love it because their "bad hands" are suddenly winners. The game becomes unpredictable, which drives repeat play.

**Expected retention impact:** +5-8% Draw engagement for experienced players seeking variety.

**Implementation complexity:** M — separate hand evaluator for lowball rankings. Two variants with different rules. Config and UI.

**Priority:** P2 — ships in v2.2.

### 2.3 Speed Draw (15-Second Turns)

**What:** Same as Speed Poker (Section 1.1) but for 5-Card Draw. 15-second action timer, faster animations, auto-fold on timeout.

| Setting | Standard Draw | Speed Draw |
|---------|-------------|------------|
| Action timer | 30 seconds | 15 seconds |
| Draw selection timer | 30 seconds | 10 seconds |
| Deal animation | ~3 seconds | ~1 second |
| Auto-fold on timeout | No | Yes |
| Auto-deal delay | Manual | 2 seconds |

**Why it drives DAU:** Same rationale as Speed Poker — enables the "quick game" use case. Draw games are naturally faster than Hold'em (no community cards, fewer betting rounds), so Speed Draw is very quick — approximately 60-90 seconds per hand.

**VGF integration:** Config-driven, same as Speed Poker. Uses `FiveCardDrawConfig.variant: 'standard' | 'speed'`.

**Implementation complexity:** S — config-driven timer changes.

**Priority:** P1 — ships with Speed Poker in v2.

---

## 3. Blackjack Improvements

### 3.1 Speed Blackjack (Auto-Stand on Hard 17+)

**What:** An accelerated Blackjack mode where obvious decisions are made automatically:

| Auto-action | Condition |
|------------|-----------|
| Auto-stand | Hard 17, 18, 19, 20 (no reasonable player hits these) |
| Auto-hit prompt | Hard 5-8 (always correct to hit, but still show card for the visual) |
| Faster card animation | 0.5s per card (vs 1s standard) |
| Reduced bet timer | 10 seconds (vs 30 seconds) |
| Auto-rebuy | If wallet allows, auto-rebuy at same bet level |

**Why it drives DAU:** Standard Blackjack has natural pauses that slow down the party energy. Speed Blackjack keeps the momentum going. More rounds per minute = more decisions = more engagement per session. This is the "arcade mode" of Blackjack.

**Expected retention impact:** +10% Blackjack session frequency. Especially popular with groups who already know the rules and want action, not tutorial.

**VGF integration:**

```typescript
interface BlackjackConfig {
  // ... existing fields ...
  variant: 'standard' | 'speed'
  autoStandThreshold: number        // 17 for speed mode
  autoHitThreshold: number          // 8 for speed mode
  dealAnimationSpeedMultiplier: number  // 2.0 for speed
  betTimeoutMs: number              // 10000 for speed
  autoRebuy: boolean                // true for speed
}
```

**Implementation complexity:** S — config-driven timer and auto-action changes within existing `BJ_PLAYER_TURNS` phase logic.

**Priority:** P0 — ships with v2.

### 3.2 Blackjack Tournament Mode

**What:** A fixed-hand tournament where players compete on total chip earnings over a set number of rounds.

**Rules:**

| Rule | Detail |
|------|--------|
| Rounds | 20 (configurable: 10, 20, 30) |
| Starting chips | Equal for all players (10,000) |
| Objective | Highest chip count after N rounds wins |
| Betting | Free choice each round (no minimum, no maximum cap beyond stack) |
| Side bets | Available (optional — adds risk/reward variance) |
| Tie-breaker | Most natural blackjacks, then most hands won |

**Leaderboard (TV display):**

Between every 5 rounds, a mini-leaderboard flashes on TV:

```
Round 10 of 20 — BLACKJACK TOURNAMENT
======================================
1st  Player 3  $14,200  (+4,200)
2nd  Player 1  $11,800  (+1,800)
3rd  Player 2  $9,500   (-500)
4th  Player 4  $7,100   (-2,900)

Most Blackjacks: Player 3 (3)
Biggest Single Win: Player 1 ($4,000 double-down)
```

**Why it drives DAU:** Tournament Blackjack transforms Blackjack from "player vs dealer" into "player vs player." The competitive element is what's missing from standard Blackjack's party appeal (Market Research scored Blackjack's social element as "Medium"). Adding a tournament structure lifts it to "High."

**Expected retention impact:** +15% Blackjack engagement. Converts Blackjack from a "play for 10 minutes" game to a "play for 30 minutes" structured event.

**State shape:**

```typescript
interface BlackjackTournamentState {
  isActive: boolean
  totalRounds: number
  currentRound: number
  startingChips: number
  playerResults: Record<string, BlackjackTournamentPlayerResult>
}

interface BlackjackTournamentPlayerResult {
  playerId: string
  currentChips: number
  handsWon: number
  naturalBlackjacks: number
  biggestSingleWin: number
  biggestSingleLoss: number
}
```

**Implementation complexity:** M — tournament lifecycle wrapper around existing Blackjack phases. Leaderboard overlay on TV.

**Priority:** P1 — ships in v2.1.

### 3.3 Progressive Side Bet (Jackpot Feed)

**What:** A new side bet option in Blackjack that feeds directly into the cross-game progressive jackpot (see CASINO-V2-RETENTION.md Section 4).

**Rules:**

| Rule | Detail |
|------|--------|
| Bet amount | Fixed: 100 chips per round |
| Contribution | 100% goes to jackpot pool (this is the "jackpot fee") |
| Mini jackpot trigger | Natural Blackjack with any side bet active |
| Major jackpot trigger | Natural Blackjack + Perfect Pair |
| Grand jackpot trigger | Natural Blackjack + Perfect Pair + 21+3 Suited Triple |
| Payout | See jackpot tier structure in CASINO-V2-RETENTION.md |

**Controller UX:** During `BJ_PLACE_BETS`, a "JACKPOT BET: 100" toggle appears alongside existing side bets. When active, the jackpot ticker on TV pulses with the player's colour.

**Why it drives DAU:** Directly links Blackjack play to the visible jackpot. Every round where you see the jackpot climb by 100 chips per player reinforces the "I could win big" feeling. The jackpot bet is cheap enough (100 chips) to be always-on for most players.

**Implementation complexity:** S — new side bet slot, integrates with existing jackpot system.

**Priority:** P1 — ships with jackpot system in v2.1.

### 3.4 Additional Side Bets

**Lucky Ladies:**

| Condition | Payout |
|-----------|--------|
| Any 20 | 4:1 |
| Suited 20 | 10:1 |
| Matched 20 (same rank + suit, multi-deck) | 25:1 |
| Queen of Hearts pair | 200:1 |
| Queen of Hearts pair + dealer Blackjack | 1000:1 |

**Royal Match:**

| Condition | Payout |
|-----------|--------|
| Suited first two cards | 5:2 |
| Royal Match (K+Q same suit) | 25:1 |

**Why these drive DAU:** Side bets add "lottery ticket" moments to every hand. The Queen of Hearts pair at 200:1 is the kind of story players tell friends — "I hit the Lucky Ladies for 200x!" — which drives word-of-mouth.

**State shape:**

```typescript
interface BlackjackSideBets {
  perfectPairs: number               // existing
  twentyOnePlusThree: number         // existing
  luckyLadies: number                // new
  royalMatch: number                 // new
  jackpotBet: number                 // new (Section 3.3)
}

// Added to BetPlacement
interface BetPlacement {
  // ... existing fields ...
  luckyLadiesBet: number
  royalMatchBet: number
  jackpotBet: number
}
```

**Implementation complexity:** S per side bet — each is an independent evaluation at deal time.

**Priority:** P2 — ships in v2.2.

---

## 4. Cross-Game Features

### 4.1 Quick-Play Mode

**What:** Skip the lobby entirely. Tap "Quick Play" and get thrown into a random game with default settings. Perfect for when the group just wants to play NOW without debating which game to pick.

**Flow:**

```
Host taps "Quick Play"
  |
  v
Random game selected (weighted by group's play history — favours games played less recently)
  |
  v
Default settings applied (medium blinds/bets, standard variant)
  |
  v
Game starts in 5 seconds (countdown on TV)
  |
  v
After 10 hands/rounds, automatically rotates to a different game
  |
  v
Continues until host says "Stop" or all players leave
```

**Why it drives DAU:** Removes decision paralysis. "What should we play?" is a 5-minute discussion that sometimes ends with "let's just watch TV." Quick Play eliminates that friction entirely. The auto-rotation exposes players to all games, increasing cross-game engagement.

**VGF integration:**

```typescript
interface QuickPlayConfig {
  isActive: boolean
  rotationIntervalHands: number     // default: 10
  gameWeights: Record<CasinoGame, number>  // weighted by inverse recency
  gamesPlayed: CasinoGame[]         // history for this session
  autoRotate: boolean               // auto-switch after N hands
}
```

**New phase:**

| Phase | Purpose |
|-------|---------|
| `QP_AUTO_ROTATE` | Brief transition screen (3 seconds): "Switching to Blackjack!" Then routes to the new game's first phase. |

**Implementation complexity:** S — random game selection, auto-rotation counter in `HAND_COMPLETE` / `BJ_HAND_COMPLETE` phases.

**Priority:** P0 — ships with v2. Very low effort, high convenience value.

### 4.2 Casino Crawl

**What:** An automated Game Night that cycles through ALL available games without the host having to configure anything. It's "Quick Play meets Game Night" — structured multi-game evening with zero setup.

**Flow:**

```
Host taps "Casino Crawl"
  |
  v
System generates a lineup: all available games in random order
  - 8 hands Hold'em -> 8 hands 5-Card Draw -> 10 rounds Blackjack -> 15 rolls Craps -> 15 spins Roulette
  |
  v
Game Night scoring kicks in automatically
  |
  v
Champion crowned at end
```

**Difference from Game Night:** Game Night requires the host to pick games and configure settings. Casino Crawl is fully automated — one tap and the evening is planned.

**Why it drives DAU:** Casino Crawl is the ultimate "just press play" feature. It's specifically designed for the "I don't want to think, I just want to play" mood. It also guarantees every player tries every game, which drives discovery and cross-game retention.

**VGF integration:** Casino Crawl is a Game Night with pre-configured settings. It reuses the `GameNightState` from CASINO-V2-RETENTION.md with `theme: 'casino_crawl'` and auto-generated `gameLineup`.

**Implementation complexity:** S — wrapper around existing Game Night logic with auto-configuration.

**Priority:** P0 — ships with Game Night in v2.

### 4.3 Player Profiles with Stats

**What:** Persistent player profiles that track stats, win rates, and favourite games across all sessions.

**Profile data:**

```typescript
interface PlayerProfile {
  playerId: string
  playerName: string
  avatarId: string

  // Aggregate stats
  totalSessions: number
  totalHandsPlayed: number
  totalChipsWon: number
  totalChipsLost: number
  netChipResult: number

  // Per-game stats
  gameStats: Record<CasinoGame, GameSpecificStats>

  // Game Night stats
  gameNightsPlayed: number
  gameNightChampionships: number
  gameNightWinRate: number          // championships / gameNightsPlayed

  // Social stats
  uniqueOpponents: number
  crewId: string | null
  favouriteGame: CasinoGame         // most played

  // Cosmetics
  unlockedCosmetics: string[]
  equippedCosmetics: EquippedCosmetics
  achievements: string[]

  // Streaks
  gameNightStreak: GameNightStreak
  dailyLoginStreak: DailyLoginState
}

interface GameSpecificStats {
  handsPlayed: number
  handsWon: number
  winRate: number
  biggestWin: number
  biggestLoss: number
  // Poker-specific
  showdownWinRate?: number
  bluffsSuccessful?: number
  royalFlushCount?: number
  // Blackjack-specific
  naturalBlackjackCount?: number
  doubleDownWinRate?: number
  perfectPairHits?: number
}

interface EquippedCosmetics {
  cardBack: string | null
  tableFelt: string | null
  chipDesign: string | null
  avatarFrame: string | null
  victoryAnimation: string | null
  cardDealEffect: string | null
}
```

**Display on TV:** Between games, the TV can show a "Player Spotlight" card for a random player:

```
+--------------------------------------------------+
|  PLAYER SPOTLIGHT: Player 2                       |
|                                                    |
|  Favourite Game: Texas Hold'em                     |
|  Total Win Rate: 42%                               |
|  Game Nights Won: 7                                |
|  Biggest Win: 15,000 chips (Blackjack double-down) |
|  Achievement: "Royal Treatment" (hit a Royal Flush) |
|  Crew: The High Rollers (Level 5)                  |
+--------------------------------------------------+
```

**Controller:** Each player can view their own profile on their phone controller via a "Profile" tab.

**Why it drives DAU:** Stats create **investment psychology**. A player with 200 games played and 12 Game Night championships has a visible track record they don't want to abandon. The profile is also a social signalling mechanism — "Look at my stats" drives competitive ego.

**Storage:** Per-player data stored on the server, keyed by player identifier (device fingerprint + name). Synced to the TV host's account for persistence.

**Implementation complexity:** M — stat tracking (events already exist), storage, profile UI on controller and TV.

**Priority:** P1 — ships in v2.1.

### 4.4 Achievement System with Milestone Rewards

**What:** A structured achievement system that rewards players for milestones across all games. Each achievement unlocks a specific cosmetic reward (see CASINO-V2-RETENTION.md Section 5.3).

**Achievement categories:**

| Category | Examples | Count |
|----------|---------|-------|
| **Getting Started** | First hand, first win, first Game Night | 5 |
| **Poker Mastery** | Win 100 hands, hit Royal Flush, bluff successfully 10 times | 10 |
| **Blackjack Mastery** | Win 100 rounds, hit 10 naturals, win 5 double-downs in a row | 8 |
| **Game Night** | Win 1/5/10/25 Game Nights, maintain 4/12/26/52-week streak | 8 |
| **Social** | Play with 5/10/25 different people, create a Crew, reach Crew level 5 | 6 |
| **Collector** | Unlock 10/25/50 cosmetics, complete a cosmetic set | 5 |
| **Cross-Game** | Win at least 1 hand in every game, play all games in a single session | 4 |
| **Jackpot** | Win any jackpot tier, win Grand jackpot | 3 |
| **Total** | | **~49 achievements** |

**Achievement notification:** When achieved, a toast notification appears on the TV (3 seconds) and a persistent notification on the player's controller with the unlocked cosmetic.

**State shape:**

```typescript
interface Achievement {
  achievementId: string
  category: AchievementCategory
  name: string
  description: string
  condition: AchievementCondition
  reward: {
    cosmeticId: string
    chips: number
    xp: number
  }
}

interface PlayerAchievementProgress {
  achievementId: string
  progress: number                  // current count
  target: number                    // required count
  completed: boolean
  completedAt: string | null
}
```

**Analytics events:**
- `achievement.progress` — `{ playerId, achievementId, progress, target }`
- `achievement.completed` — `{ playerId, achievementId, category, reward }`

**Why it drives DAU:** Achievements create long-term goals. A player at 47/49 achievements will grind for months to complete the set. Each achievement is a micro-goal that gives a dopamine hit on completion, and the cosmetic reward provides a visible, permanent marker of the accomplishment.

**Implementation complexity:** M — achievement tracking, condition evaluation, notification system. Most conditions can be derived from existing stat tracking.

**Priority:** P1 — ships in v2.1.

---

## 5. Priority Summary

### P0 — Ships with v2 (low effort, high value)

| Feature | Game | Complexity | DAU Impact |
|---------|------|-----------|------------|
| Speed Poker | Hold'em | S | +10-15% session frequency |
| Speed Draw | 5-Card Draw | S | +10% Draw engagement |
| Speed Blackjack | Blackjack | S | +10% BJ session frequency |
| Quick-Play Mode | Cross-game | S | Reduces friction, +5% sessions |
| Casino Crawl | Cross-game | S | One-tap Game Night, drives variety |

**Total P0 effort:** ~1 sprint. All config-driven changes to existing systems.

### P1 — Ships in v2.1

| Feature | Game | Complexity | DAU Impact |
|---------|------|-----------|------------|
| Wild Card Variant | 5-Card Draw | M | +10% Draw engagement |
| Bounty Tournament | Hold'em | M | +10% rematch rate |
| BJ Tournament Mode | Blackjack | M | +15% BJ engagement |
| Progressive Side Bet | Blackjack | S | Links BJ to jackpot system |
| Player Profiles | Cross-game | M | Long-term investment psychology |
| Achievement System | Cross-game | M | Completionist drive |

### P2 — Ships in v2.2+

| Feature | Game | Complexity | DAU Impact |
|---------|------|-----------|------------|
| All-In Insurance | Hold'em | S | +5% session continuation |
| Rabbit Hunting | Hold'em | S | Social moment creation |
| Lowball Variant | 5-Card Draw | M | Variety for experienced players |
| Lucky Ladies Side Bet | Blackjack | S | Lottery-ticket moments |
| Royal Match Side Bet | Blackjack | S | Lottery-ticket moments |

---

## Appendix: How Existing Game Changes Compound with Retention Systems

The improvements in this document are not standalone features. They integrate with the retention systems from CASINO-V2-RETENTION.md:

| Improvement | Retention System Integration |
|------------|----------------------------|
| Speed variants | Enables "quick session" daily challenges. "Play 5 speed hands" is completable in 3 minutes. |
| Bounty Tournament | Feeds Tournament Mode leaderboards. Bounty kills count toward weekly challenges. |
| Wild Card variant | New achievement category ("Hit Five of a Kind"). Crew challenges can target wild-card games. |
| BJ Tournament | Integrates with Game Night Mode as a structured blackjack segment. |
| Side bets | Feed progressive jackpot. Create achievement triggers ("Hit 10 Perfect Pairs"). |
| Quick Play / Casino Crawl | Directly feeds cross-game challenges. The fastest path to "play all games" challenge completion. |
| Player Profiles | Display Crew level, achievement count, and streak status. Social signalling for all retention systems. |
| Achievements | Reward cosmetics from the cosmetic system. Drive completionism across all games. |

Every feature in this document answers the question: **"Why would a player come back TOMORROW because of this?"**

- Speed variants: "I only have 10 minutes — I can still get a quick game in." (lowers the barrier to daily play)
- Bounty mode: "I need revenge on Player 2 after they knocked me out last time." (competitive ego)
- Wild cards: "I've never hit Five of a Kind — tonight's the night." (aspiration)
- Quick Play: "Can't be bothered choosing — just give me a game." (removes friction)
- Side bets: "The jackpot is at 150,000 — I need to play Blackjack to trigger it." (jackpot chase)
- Profiles: "I'm 3 achievements away from completing the Poker Mastery set." (completionism)

---

*All retention benchmarks and competitive data sourced from [MARKET-RESEARCH-CASINO-GAMES.md](./MARKET-RESEARCH-CASINO-GAMES.md).*

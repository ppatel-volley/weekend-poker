# Weekend Casino v2 — Retention & Meta-Game Systems

> **Status:** Reference Only
> **Authority:** Retention system designs and meta-game proposals. Defers to `CASINO-V2-ROADMAP-FINAL.md` for release timing and scope.
> **Last Aligned:** 2026-02-28
> **Canonical Decisions:** See `docs/CANONICAL-DECISIONS.md`
> **Supersedes:** — | **Superseded By:** `CASINO-V2-ROADMAP-FINAL.md` (for release scope/timing)
>
> **Version:** 1.1
> **Date:** 2026-02-28
> **Author:** PM — Retention & Growth
> **Objective:** Design the systems that drive 200-500K DAU (v2 target) through weekly return visits, daily engagement, and social obligation. The 1M DAU target is deferred to v3, contingent on online multiplayer (see `docs/CANONICAL-DECISIONS.md` D-017).
> **Depends on:** [CASINO-PRD.md](./CASINO-PRD.md), [CASINO-GAME-DESIGN.md](./CASINO-GAME-DESIGN.md), [MARKET-RESEARCH-CASINO-GAMES.md](./MARKET-RESEARCH-CASINO-GAMES.md)

---

## Table of Contents

1. [Game Night Mode](#1-game-night-mode)
2. [Daily & Weekly Engagement Loops](#2-daily--weekly-engagement-loops)
3. [Crews (Persistent Friend Groups)](#3-crews-persistent-friend-groups)
4. [Progressive Jackpot](#4-progressive-jackpot)
5. [Unlockable Cosmetics](#5-unlockable-cosmetics)
6. [Tournament Mode](#6-tournament-mode)
7. [Social Features](#7-social-features)
8. [Priority Roadmap](#8-priority-roadmap)

---

## 1. Game Night Mode

**THE killer feature.** No other casino app does this. This is the "poker night" ritual digitised — a structured multi-game evening with a champion crowned at the end. This is what makes Weekend Casino a weekly habit, not a one-off novelty.

### 1.1 Why This Drives DAU

Players don't come back for a single hand of blackjack. They come back for **the ritual**. Game Night Mode creates a standing weekly appointment — "Friday is Casino Night" — the same way poker night works in real life. The host sends a text, the mates show up, and the evening has structure. Social obligation + competitive ego + FOMO on missing the weekly session = a retention loop that no solo mobile casino can replicate.

**Expected retention impact:**
- D7 retention lift: +30-40% for players who complete at least one Game Night (benchmark: Jackbox repeat session data shows structured party modes drive 2-3x return rates vs unstructured play)
- Weekly active user conversion: 60%+ of Game Night players return the following week (vs ~35% baseline for unstructured casino sessions)
- Session length increase: 2-3x (45-90 min Game Night vs 15-30 min single-game session)

### 1.2 Flow

```
Host opens Weekend Casino
  |
  v
Lobby: Host taps "Game Night" (prominent button, above single-game selection)
  |
  v
Game Night Setup:
  - Host picks 3-5 games from available pool (Hold'em, 5-Card Draw, Blackjack, Craps, Roulette, etc.)
  - Host sets round count per game (default: 10 hands poker / 10 rounds blackjack / 15 rolls craps / 15 spins roulette)
  - Host sets order or selects "Shuffle" (random order)
  - Host optionally sets a theme ("High Roller Night", "Beginner Friendly", "All Poker", "Dice & Wheels")
  |
  v
Players connect via QR, see Game Night lineup on TV and controllers
  |
  v
Game 1 begins -> Rounds play -> Game 1 ends -> Leaderboard shown on TV
  |
  v
Transition screen: leaderboard + stats + dealer commentary ("Player 2 is on fire!")
  |
  v
Game 2 begins -> ... -> Game N ends
  |
  v
Champion Ceremony (TV): dramatic reveal, confetti, stats card, shareable image
  |
  v
Session Summary: full breakdown per game, per player, overall champion
```

### 1.3 Normalised Scoring System

The core problem: how do you compare a 500-chip pot win in Hold'em to a 3:2 blackjack payout to a craps pass-line win? Raw chip values are meaningless across games with different bet structures.

**Solution: Game Night Points (GNP)**

Each game awards points based on **relative performance**, not absolute chip values. This normalises across games with wildly different payout structures.

#### Scoring Formula

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

// Points awarded per game
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

  // Craps (v2)
  HOT_SHOOTER: 20,              // 5+ rolls before sevening out
  HARDWAY_HIT: 15,
  PASS_LINE_STREAK_5: 10,

  // Roulette (v2)
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

#### Why This Works

- **Fairness:** A player who dominates poker but loses at blackjack doesn't auto-win. Every game matters equally in base points (100/70/45/25 split).
- **Excitement:** Bonus points for spectacular plays create highlight moments and keep things unpredictable.
- **Margin bonus:** Rewarding dominant wins prevents sandbagging — if you're winning, you're incentivised to win big.
- **Cross-game variety:** The ranking is per-game, so a player who is mediocre at everything but terrible at nothing can beat a specialist who bombs one game.

### 1.4 Leaderboard (TV Display Between Games)

Between each game, the TV shows a full-screen leaderboard for 15-20 seconds:

```
+--------------------------------------------------+
|         GAME NIGHT LEADERBOARD                    |
|                                                    |
|  After: Blackjack (Game 2 of 4)                   |
|                                                    |
|  1st  Player 1    ████████████████  245 pts        |
|  2nd  Player 3    ██████████████    210 pts        |
|  3rd  Player 2    ████████████      185 pts        |
|  4th  Player 4    ██████████        155 pts        |
|                                                    |
|  Last game MVP: Player 3 (+75 pts from Blackjack)  |
|  Hot streak: Player 1 (1st in last 2 games)        |
|                                                    |
|  Next up: CRAPS                                     |
|  "Player 3 is closing in! This next game is        |
|   anyone's to win." — Dealer                        |
+--------------------------------------------------+
```

**State shape:**

```typescript
interface GameNightState {
  isActive: boolean
  gameLineup: CasinoGame[]           // ordered list of games to play
  currentGameIndex: number
  roundsPerGame: Record<CasinoGame, number>
  scores: Record<string, GameNightPlayerTotal>  // playerId -> running total
  gameResults: GameNightGameResult[]  // completed games
  theme: GameNightTheme | null
  championId: string | null           // set at end
  startedAt: number                   // timestamp
}

interface GameNightPlayerTotal {
  playerId: string
  playerName: string
  totalPoints: number
  gamesPlayed: number
  firstPlaceCount: number
  bonusPointsTotal: number
}

interface GameNightGameResult {
  game: CasinoGame
  scores: GameNightScore[]
  duration: number                    // ms
  highlightMoment: string | null      // e.g. "Player 2 hit a Royal Flush!"
}

type GameNightTheme = 'high_roller' | 'beginner_friendly' | 'all_poker' | 'dice_and_wheels' | 'casino_crawl'
```

### 1.5 Champion Ceremony

When the final game ends, the TV plays a **Champion Ceremony** sequence:

1. **Dramatic pause** (2 seconds): screen dims, drumroll audio
2. **Countdown reveal**: 4th place shown first, then 3rd, then 2nd, each with their total points and highlight stat
3. **Champion reveal** (3 seconds): winner's name and avatar shown large with confetti particle effect, crown animation, and a victory jingle
4. **Stats card** (5 seconds): a branded results card showing:
   - Date and theme
   - All player rankings
   - Best single-game performance
   - Highlight moment (e.g., "Player 2's Royal Flush in Hold'em")
   - Total hands/rounds played
   - Session duration
5. **Share prompt**: Controllers show "Share Results" button that generates a shareable image (PNG) with the stats card — downloadable or shareable to social media via Web Share API

**Video integration:** The champion ceremony is a prime candidate for AI-generated cinematic video moments (see CASINO-GAME-DESIGN.md Section VI). A 5-10 second "crown the champion" video with personalised name overlay.

**Analytics events:**
- `game_night.started` — `{ sessionId, playerCount, gameCount, games: CasinoGame[], theme }`
- `game_night.game_completed` — `{ sessionId, gameIndex, game, rankings, duration }`
- `game_night.leaderboard_viewed` — `{ sessionId, gameIndex, leaderPositions }`
- `game_night.champion_crowned` — `{ sessionId, championId, totalPoints, marginOfVictory, gamesPlayed, sessionDuration }`
- `game_night.results_shared` — `{ sessionId, shareMethod: 'download' | 'web_share', platform }`

### 1.6 Streak Tracking

**Weekly Game Night Streak:** Tracks consecutive weeks where a player completes at least one Game Night session.

```typescript
interface GameNightStreak {
  playerId: string
  currentStreak: number           // consecutive weeks
  longestStreak: number
  lastGameNightWeek: string       // ISO week "2026-W09"
  totalGameNights: number
  totalChampionships: number
}
```

**Streak rewards:**

| Streak | Reward |
|--------|--------|
| 2 weeks | 500 bonus chips + "Regular" badge |
| 4 weeks | 2,000 bonus chips + "Committed" card back |
| 8 weeks | 5,000 bonus chips + "Dedicated" table felt |
| 12 weeks | 10,000 bonus chips + "Veteran" chip set + gold crown avatar frame |
| 26 weeks (6 months) | 25,000 bonus chips + "Legend" dealer outfit unlock |
| 52 weeks (1 year) | 100,000 bonus chips + "Founder" exclusive set (card back + felt + chips + avatar frame) |

**Why this drives weekly returns:** Breaking a streak triggers loss aversion. A player at week 11 will push their group to play because losing the week-12 reward feels like wasting 11 weeks of effort. The group social pressure compounds this — "We can't skip this week, I'm on a 7-week streak!"

**Implementation complexity:** S — streak logic is a simple counter updated at Game Night completion. Storage is per-player in their profile.

### 1.7 VGF Integration Notes

Game Night Mode adds a `gameNight` sub-state to `CasinoGameState`:

```typescript
interface CasinoGameState {
  // ... existing fields ...
  gameNight?: GameNightState        // populated when Game Night is active
}
```

**New phases:**

| Phase | Purpose |
|-------|---------|
| `GN_SETUP` | Host configures Game Night (game selection, rounds, theme) |
| `GN_LEADERBOARD` | Shown between games with scores and next game preview |
| `GN_CHAMPION` | Champion ceremony at the end |

**Phase flow:**

```
LOBBY -> GN_SETUP -> GAME_SELECT -> [Game 1 phases] -> GN_LEADERBOARD
  -> GAME_SELECT -> [Game 2 phases] -> GN_LEADERBOARD
  -> ... -> [Game N phases] -> GN_CHAMPION -> SESSION_SUMMARY
```

**Implementation complexity:** L — requires new phases, scoring logic, leaderboard UI on TV, champion ceremony assets, share functionality.

**Priority:** P0 — ships in v2 launch. This IS the product.

---

## 2. Daily & Weekly Engagement Loops

### 2.1 Why This Drives DAU

Daily loops create the "check the app" habit. Even on days when a player isn't hosting a Game Night, they open the app to collect their bonus, check challenge progress, and see if mates are online. This converts weekly-only players into daily-active users.

**Expected retention impact:**
- D1 retention lift: +15-25% (benchmark: social casino apps with streak mechanics show 15-25% higher D7 retention — Market Research Section 4)
- DAU/MAU improvement: +5-8 percentage points (from ~20% to ~25-28%)

### 2.2 Daily Login Bonuses

**Escalating 7-day cycle with a streak multiplier:**

| Day | Base Reward | Streak Multiplier (Week 2+) | Notes |
|-----|------------|----------------------------|-------|
| Day 1 (Mon) | 500 chips | 1.0x | Reset day |
| Day 2 (Tue) | 750 chips | 1.1x | |
| Day 3 (Wed) | 1,000 chips | 1.2x | |
| Day 4 (Thu) | 1,500 chips | 1.3x | |
| Day 5 (Fri) | 2,000 chips + Game Night Boost ticket | 1.4x | Game Night Boost: +10% bonus points in next Game Night |
| Day 6 (Sat) | 2,500 chips | 1.5x | |
| Day 7 (Sun) | 5,000 chips + Mystery Cosmetic Crate | 1.5x | Crate contains a random cosmetic item (card back, felt, or chip design) |

**Streak multiplier:** After completing a full 7-day cycle, the multiplier for the NEXT cycle increases. Caps at 2.0x after 4 consecutive weeks.

**Total weekly value (base):** 13,250 chips + 1 Game Night Boost + 1 Mystery Crate
**Total weekly value (max streak):** 26,500 chips + 1 Game Night Boost + 1 Mystery Crate

**State shape:**

```typescript
interface DailyLoginState {
  playerId: string
  currentDayInCycle: number          // 1-7
  consecutiveWeeks: number           // for streak multiplier
  lastClaimDate: string              // ISO date "2026-02-27"
  streakMultiplier: number           // 1.0 - 2.0
  totalChipsClaimed: number
  totalCratesOpened: number
}
```

**Analytics events:**
- `daily_bonus.claimed` — `{ playerId, day, chips, multiplier, hasBoost, hasCrate }`
- `daily_bonus.streak_broken` — `{ playerId, previousStreak, lastClaimDate }`

**Implementation complexity:** S — simple counter, claim endpoint, UI overlay on app open.

**Priority:** P0 — ships with v2.

### 2.3 Weekly Challenges

Three challenge slots, refreshing every Monday at 00:00 UTC. Players always have something to work towards.

#### Challenge Tiers

| Tier | Difficulty | Reward | Example |
|------|-----------|--------|---------|
| **Bronze** | Easy — completable in 1 session | 1,000 chips | "Play 5 hands of any poker game" |
| **Silver** | Medium — requires specific play | 3,000 chips + XP | "Win 3 blackjack hands in a row" |
| **Gold** | Hard — requires skill or luck | 8,000 chips + XP + cosmetic item | "Hit a flush or better in Hold'em" |

#### Challenge Pool (Examples)

**Cross-game challenges (drive variety):**
- "Play 3 different games this week" (Bronze) — forces players to try games they normally skip
- "Complete a Game Night with 3+ games" (Silver) — directly drives the core feature
- "Win at least 1 round in every available game" (Gold) — mastery across all games

**Poker challenges:**
- "Win 10 hands of Hold'em" (Bronze)
- "Win a hand with a full house or better" (Silver)
- "Win 3 hands in a row in 5-Card Draw" (Gold)
- "Successfully bluff an opponent off the best hand" (Gold)

**Blackjack challenges:**
- "Play 20 rounds of Blackjack" (Bronze)
- "Win 3 blackjack hands in a row" (Silver)
- "Hit a Perfect Pair side bet" (Gold)
- "Win 5 double-down hands in a session" (Gold)

**Craps challenges (v2):**
- "Place 10 bets on craps" (Bronze)
- "Win 3 pass-line bets in a row" (Silver)
- "Roll the dice 10+ times as shooter without sevening out" (Gold)

**Roulette challenges (v2):**
- "Place 15 bets on roulette" (Bronze)
- "Hit a straight-up number bet" (Silver)
- "Win 5 colour bets in a row" (Gold)

#### Challenge Assignment Logic

Each player gets 1 Bronze, 1 Silver, 1 Gold challenge per week. The selection algorithm:

```typescript
function assignWeeklyChallenges(player: PlayerProfile): Challenge[] {
  const pool = getAllChallenges()

  // Weight toward games the player HASN'T played recently
  // This drives cross-game engagement
  const underplayedGames = getUnderplayedGames(player, lookbackDays: 14)

  // 40% chance the Silver or Gold challenge targets an underplayed game
  const bronze = selectRandom(pool.bronze)
  const silver = Math.random() < 0.4
    ? selectFromGames(pool.silver, underplayedGames)
    : selectRandom(pool.silver)
  const gold = Math.random() < 0.4
    ? selectFromGames(pool.gold, underplayedGames)
    : selectRandom(pool.gold)

  // Never assign duplicates from last 2 weeks
  return deduplicate([bronze, silver, gold], player.recentChallenges)
}
```

**Why challenges drive DAU:** A player who normally only plays Hold'em gets a Silver challenge "Win 3 blackjack hands in a row." They open the app specifically to complete that challenge, discover they enjoy blackjack, and now play both games regularly. Challenges expand the player's game repertoire, which increases session variety, which increases return rate.

**State shape:**

```typescript
interface WeeklyChallengeState {
  playerId: string
  weekId: string                     // ISO week "2026-W09"
  challenges: ActiveChallenge[]
  completedThisWeek: number
}

interface ActiveChallenge {
  challengeId: string
  tier: 'bronze' | 'silver' | 'gold'
  description: string
  targetGame: CasinoGame | 'any'
  progress: number
  target: number
  completed: boolean
  reward: ChallengeReward
}

interface ChallengeReward {
  chips: number
  xp: number
  cosmeticId?: string              // for Gold tier
}
```

**Analytics events:**
- `challenge.assigned` — `{ playerId, weekId, challenges: { id, tier, game }[] }`
- `challenge.progress` — `{ playerId, challengeId, progress, target }`
- `challenge.completed` — `{ playerId, challengeId, tier, reward }`
- `challenge.drove_new_game` — `{ playerId, challengeId, game }` (tracked when challenge causes first play of a game)

**Implementation complexity:** M — challenge system, progress tracking, assignment algorithm, UI.

**Priority:** P0 — ships with v2.

---

## 3. Crews (Persistent Friend Groups)

### 3.1 The TV-First Problem

Weekend Casino doesn't have traditional user accounts with friend lists. It's a TV app where players connect via QR code each session. So how do you build persistent friend groups?

**Solution: Crew Codes**

A Crew is a persistent group identified by a short alphanumeric code (e.g., "ACES42"). Players join a Crew by entering the code on their phone controller. The Crew persists via the TV host's account (the Volley account that owns the TV app).

```
Player opens Weekend Casino on TV
  |
  v
First time: "Create a Crew" or "Join a Crew"
  - Create: generates a 6-character code, asks for Crew name
  - Join: enter an existing code
  |
  v
Crew is linked to the TV host's Volley account
Phone players join the Crew via code during their first session
  |
  v
Crew members are remembered across sessions
When a returning player scans the QR, they're auto-matched to their Crew
```

**Player identification:** Phone players are identified by a combination of:
1. Device fingerprint (browser local storage token)
2. Player name (entered on first join)
3. Optional: phone number or email (for cross-device persistence — v3)

This is deliberately lightweight. No sign-up wall. No app download. The friction must be near zero.

### 3.2 Crew Structure

```typescript
interface Crew {
  crewId: string                     // internal UUID
  crewCode: string                   // 6-char alphanumeric, user-facing
  crewName: string                   // "The High Rollers", "Friday Night Crew"
  createdBy: string                  // host account ID
  members: CrewMember[]
  xp: number
  level: number
  weeklyStats: CrewWeeklyStats
  allTimeStats: CrewAllTimeStats
  crewChallenges: CrewChallenge[]
  cosmetics: string[]                // unlocked cosmetic IDs
}

interface CrewMember {
  playerId: string                   // device fingerprint + name hash
  playerName: string
  joinedAt: string
  role: 'captain' | 'member'        // captain = TV host
  personalXP: number
  gamesPlayed: number
  gameNightsAttended: number
  lastActiveDate: string
}

interface CrewWeeklyStats {
  weekId: string
  handsPlayed: number
  gamesPlayed: number
  gameNightsCompleted: number
  totalChipsWon: number
  challengesCompleted: number
}
```

### 3.3 Crew XP and Levelling

Every action by any Crew member contributes to the Crew's XP pool:

| Action | XP |
|--------|-----|
| Complete a game session | 50 |
| Complete a Game Night | 200 |
| Win a Game Night championship | 100 |
| Complete a weekly challenge (any tier) | 25/50/100 |
| Complete a Crew challenge | 150 |
| All members log in during the same week | 300 |
| 4-member Game Night (full crew) | 150 bonus |

**Level thresholds:**

| Level | XP Required | Unlock |
|-------|------------|--------|
| 1 | 0 | Crew created, basic badge |
| 2 | 500 | Crew card back (shared design) |
| 3 | 1,500 | Crew table felt colour choice |
| 4 | 3,500 | Crew chip design |
| 5 | 7,000 | Crew avatar frame |
| 6 | 12,000 | Premium Crew card back (animated) |
| 7 | 20,000 | Premium table felt (animated) |
| 8 | 30,000 | Crew dealer outfit unlock |
| 9 | 45,000 | Crew title ("Legendary Crew") |
| 10 | 65,000 | Ultimate Crew bundle (exclusive animated set) |

### 3.4 Crew Challenges

Weekly Crew challenges that require collective effort:

| Challenge | Target | Reward |
|-----------|--------|--------|
| "Crew Grind" | Play 50 hands collectively this week | 500 Crew XP + 2,000 chips each |
| "All In" | Every member plays at least one session this week | 300 Crew XP + 1,500 chips each |
| "Variety Pack" | Crew members collectively play every available game | 400 Crew XP + 3,000 chips each |
| "Game Night Regulars" | Complete 2 Game Nights this week | 600 Crew XP + 5,000 chips each |
| "Hot Streak" | Any Crew member wins 5 games in a row across any game | 250 Crew XP + special card back |

### 3.5 How Crews Drive Social Obligation

The Crew system creates **appointment pressure**:

1. **"We need you this week"**: Crew challenges require participation from all members. If one person doesn't show up, the whole Crew misses out. This is the Huuuge Casino Club model adapted for real-world friend groups.
2. **Visible contribution**: Each member's activity is visible in the Crew stats. The person who hasn't played this week stands out. Social shame is a powerful motivator.
3. **Shared progression**: Levelling up the Crew is a group project. Cosmetics unlocked by the Crew are used by everyone. Walking away means your mates lose out.
4. **Crew leaderboard**: Crews compete against other Crews globally. "Our Crew is ranked #247 — let's get to top 100" is a real motivator.

**Why this drives DAU:** A player might not care about their own daily bonus. But they DO care about letting their Crew down. Social obligation is the most powerful retention force in gaming. (Benchmark: Huuuge Casino's club system was the primary driver of their rise to #1 social casino — Market Research Section 4.)

**Implementation complexity:** M — Crew creation, code system, XP tracking, challenge system. The TV-first identification is the main engineering challenge.

**Priority:** P1 — ships in v2.1 (one sprint after v2 launch).

---

## 4. Progressive Jackpot

### 4.1 Design

A single, cross-game progressive jackpot that grows with every bet placed in every game. The jackpot is **always visible** on the TV display — a persistent gold ticker in the top-right corner during all gameplay. It is a constant reminder that any hand, any round, any roll could pay off big.

### 4.2 How It Works

**Contribution:** 1% of every main bet across all games is added to the jackpot pool.

```typescript
interface ProgressiveJackpot {
  currentAmount: number              // always displayed on TV
  seedAmount: number                 // minimum jackpot after reset (10,000 chips)
  contributionRate: number           // 0.01 (1%)
  lastWonBy: string | null           // playerId
  lastWonAt: string | null           // ISO datetime
  lastWonAmount: number | null
  triggersThisSession: number        // how many times triggered this session
}
```

**Jackpot contribution per game:**

| Game | Contribution Source | Rate |
|------|-------------------|------|
| Hold'em | Every pot (1% of total pot at showdown) | 1% |
| 5-Card Draw | Every pot (1% of total pot at showdown) | 1% |
| Blackjack | Every main bet placed | 1% |
| Craps (v2) | Every bet placed | 1% |
| Roulette (v2) | Every bet placed | 1% |

### 4.3 Trigger Conditions

The jackpot can be won during any game, but only through rare, spectacular plays:

| Game | Trigger | Probability (approx.) |
|------|---------|----------------------|
| Hold'em | Royal Flush at showdown | ~1 in 650,000 hands |
| 5-Card Draw | Royal Flush at showdown | ~1 in 650,000 hands |
| Blackjack | Natural Blackjack with a Perfect Pair side bet hit | ~1 in 5,000 rounds (with side bet active) |
| Craps (v2) | Hit all 6 hardway bets in a single shooter session | ~1 in 50,000 sessions |
| Roulette (v2) | Hit the same number twice in a row on straight-up bets | ~1 in 1,369 (1/37 x 1/37) |

**Tiered jackpot (softens the rarity problem):**

To prevent the jackpot from being unreachable, implement a 3-tier system:

| Tier | Trigger | Payout | Reset To |
|------|---------|--------|----------|
| **Mini** | Three of a Kind in poker / Blackjack with a 21+3 side bet hit / Pass-line + odds win in craps | 5% of jackpot | Immediately re-seeds from contributions |
| **Major** | Straight Flush in poker / Natural Blackjack + Perfect Pair / Hot shooter (10+ rolls) | 15% of jackpot | Re-seeds after 100 bets |
| **Grand** | Royal Flush / Natural BJ + Perfect Pair + 21+3 all hitting / Roulette same number twice | 80% of jackpot | Re-seeds to 10,000 chips |

### 4.4 Display Integration

The jackpot ticker is a permanent UI element on the TV:

```
+--------------------------------------------------+
|  [Game UI]                    JACKPOT: $127,450   |
|                               Mini: $6,372        |
|                               Major: $19,117      |
|                               Grand: $101,961     |
+--------------------------------------------------+
```

- The ticker **pulses gently** every few seconds as a subtle animation
- When a contribution is added (after each hand/round), the number visibly increments with a coin-drop animation
- When a tier is won, the TV plays a **jackpot celebration** sequence: screen flash, bell sound, confetti, and the winning amount prominently displayed for 5 seconds

### 4.5 Why This Drives DAU

The jackpot creates a **"lottery ticket" feeling** on every single action. Players aren't just playing poker — they're playing poker with a chance to win 100,000+ chips on any hand. The constant visible ticker on the TV reinforces this every second.

**Psychological mechanism:** Variable-ratio reinforcement (the most addictive schedule in behavioural psychology). Every bet could be the one. The jackpot doesn't need to be won often — its visible growth IS the reward loop.

**Expected impact:**
- Session length: +10-15% (players play "just a few more hands" chasing the jackpot)
- Cross-game play: +20% (players try different games because each has jackpot triggers)
- Benchmark: EveryMatrix reports progressive jackpots boost player engagement by 20-35% (Market Research Section 4)

**Implementation complexity:** S — contribution math is trivial, trigger detection integrates into existing hand evaluation, UI is a persistent overlay component.

**Priority:** P1 — ships in v2.1.

---

## 5. Unlockable Cosmetics

### 5.1 Cosmetic Categories

All cosmetics are visible to everyone on the TV display. Your choices affect the shared experience.

| Category | Description | Display Location | Estimated Count (v2) |
|----------|------------|-----------------|---------------------|
| **Card Backs** | Back-of-card design | TV: visible during deal animation, face-down cards | 20 designs |
| **Table Felts** | Table surface colour/pattern | TV: covers the entire table | 15 designs |
| **Chip Designs** | Chip colour/pattern/material | TV: visible in all betting/pot displays | 12 designs |
| **Dealer Outfits** | Outfit/style for dealer characters | TV: dealer character appearance | 8 outfits |
| **Avatar Frames** | Border around player avatar | TV + Controller: player name plates | 10 frames |
| **Victory Animations** | Celebration effect when winning | TV: plays on pot win / Game Night victory | 8 animations |
| **Card Deal Effects** | Trail/particle effect on card movement | TV: during dealing and draw | 6 effects |

### 5.2 How to Earn Cosmetics

| Source | Example | Frequency |
|--------|---------|-----------|
| **Daily login (Day 7)** | Mystery Crate: random common cosmetic | Weekly |
| **Weekly challenges (Gold)** | Specific cosmetic as reward | Weekly |
| **Game Night streaks** | Streak milestone cosmetics (Section 1.6) | Monthly+ |
| **Crew levelling** | Crew-branded cosmetics | Progressive |
| **Achievements** | Milestone unlocks (see below) | One-time |
| **Seasonal events** | Limited-time event cosmetics | Seasonal |
| **Premium purchase** | Battle Pass exclusive cosmetics | Monthly |

### 5.3 Achievement Milestones

One-time achievements that unlock specific cosmetics:

| Achievement | Condition | Cosmetic Reward |
|------------|-----------|----------------|
| First Blood | Win your first hand in any game | "Lucky" card back |
| Hat Trick | Win 3 Game Nights | "Champion" avatar frame |
| Century | Play 100 total hands/rounds | "Veteran" table felt |
| Royal Treatment | Hit a Royal Flush | "Royal" card back (animated gold) |
| All-Rounder | Win at least one hand in every available game | "Rainbow" chip set |
| Marathon | Play a 3+ hour session | "Night Owl" avatar frame |
| Social Butterfly | Play with 10 different people | "Crowd" victory animation |
| Streak Master | Maintain a 12-week Game Night streak | "Inferno" card deal effect |
| Jackpot Hunter | Win any tier of the progressive jackpot | "Jackpot" table felt (animated coins) |
| Crew Legend | Reach Crew level 10 | "Legend" dealer outfit |

### 5.4 Display on TV

- **Card backs:** When cards are dealt or placed face-down, the active player's chosen card back is shown. If the host has a premium card back, it's used as the default for bots and unregistered players.
- **Table felts:** The host's selected felt is used as the table surface. Can be voted on if Crews implement preferences.
- **Chip designs:** The active player's chip design is used for their bet display and pot contribution.
- **Victory animations:** Plays on the TV when the player wins a pot. Different from the default chip-slide animation.

### 5.5 Controller Personalisation

The phone controller reflects the player's cosmetic choices:
- Card backs shown for face-down cards on controller
- Avatar frame around the player's name and chip count
- Subtle background tint matching their chip design colour

### 5.6 Why This Drives DAU

Cosmetics create **completionist psychology**. Players who have 15 out of 20 card backs will grind for the remaining 5. Visible cosmetics on the TV create **social signalling** — "that player has the Royal card back, they must have hit a Royal Flush" — which drives aspiration in other players.

**Expected impact:**
- Session count: +10-15% (players grinding for specific achievements)
- Monetisation: 15-25% of total revenue (industry benchmark for cosmetic-only social casino monetisation — Market Research Section 7)

**Implementation complexity:** M — asset creation, inventory system, rendering on TV, controller theming.

**Priority:** P1 — basic cosmetics in v2, expanded in v2.1+.

---

## 6. Tournament Mode

### 6.1 Overview

Tournaments add structured competitive play beyond the casual Game Night. They create appointment mechanics ("The Saturday Night Showdown starts at 8 PM") and leaderboard bragging rights.

### 6.2 Tournament Types

#### Sit-and-Go (SNG) Tournaments

Start when enough players are connected. No scheduling required.

| Setting | Value |
|---------|-------|
| Players | 2-4 (TV model limit) |
| Buy-in | Fixed (1,000 / 5,000 / 10,000 chips) |
| Structure | Single game, rising blinds (Hold'em/5-Card Draw) or fixed rounds (Blackjack) |
| Duration | 20-45 minutes |
| Prizes | 1st: 60% of pool, 2nd: 30%, 3rd: 10% |
| Trigger | Starts when all connected players are ready |

#### Scheduled Tournaments

Created by the host with a fixed start time. Other Crews can join via tournament code.

| Setting | Value |
|---------|-------|
| Players | 2-4 per TV (multi-TV via tournament code) |
| Buy-in | Set by creator |
| Structure | Game Night format (multi-game) or single game |
| Duration | 30-90 minutes |
| Prizes | Configurable pool split + cosmetic prizes |

**Multi-TV note:** For v2, tournaments are local to a single TV (2-4 players). Multi-TV tournaments (where multiple living rooms compete simultaneously via tournament code, with results aggregated on a global leaderboard) are a v3 feature. The infrastructure for this is tournament codes + server-side leaderboard aggregation — technically feasible but requires significant backend work.

#### Daily / Weekly Recurring Tournaments

System-created tournaments that run automatically:

| Tournament | Frequency | Game | Entry | Prize |
|-----------|-----------|------|-------|-------|
| **Daily Dash** | Every day at 20:00 local | Random game (rotates daily) | Free | 5,000 chips + Daily Dash card back |
| **Weekend Showdown** | Saturday 20:00 local | Game Night (3 games) | 2,000 chips | 25,000 chips + Weekend Warrior cosmetic |
| **Monthly Masters** | First Saturday of month | Game Night (5 games) | 10,000 chips | 100,000 chips + Monthly Masters exclusive cosmetic |

### 6.3 Tournament Leaderboards

**Per-tournament results** are stored and displayed:

```typescript
interface TournamentResult {
  tournamentId: string
  tournamentType: 'sng' | 'scheduled' | 'daily' | 'weekly' | 'monthly'
  game: CasinoGame | 'game_night'
  participants: TournamentParticipant[]
  startedAt: string
  endedAt: string
  totalPrizePool: number
}

interface TournamentParticipant {
  playerId: string
  playerName: string
  crewId: string | null
  finalRank: number
  prize: number
  points: number                    // for leaderboard ranking
}
```

**Season leaderboard:** Tournament results contribute to a seasonal leaderboard (resets monthly). Top 10 players at end of month receive exclusive cosmetics.

### 6.4 Why This Drives DAU

- **Appointment mechanics:** "The Weekend Showdown is Saturday at 8" — players return at specific times
- **FOMO:** Monthly Masters exclusives can never be re-earned. Miss the month, miss the cosmetic.
- **Competitive ego:** Leaderboard rankings create public status. "I'm ranked #3 in February" is a social signal.

**Expected impact:**
- Weekly return rate: +15-20% for tournament participants
- Saturday DAU spike: +40-60% during Weekend Showdown hours (benchmark: Zynga Poker's Sunday tournament drives their highest-traffic day)

**Implementation complexity:** L — tournament lifecycle management, blind structure progression, leaderboard backend, scheduling.

**Priority:** P1 — SNG tournaments in v2.1, scheduled tournaments in v2.2, recurring in v2.3.

---

## 7. Social Features

### 7.1 Spectator Mode

Allow additional viewers to watch a game on the TV without being a player.

**Design:**
- The TV already displays the full game state. Additional phones can connect as "Spectators" instead of players.
- Spectators see the same TV view summary on their phone, but NO private card information.
- Spectators can send reactions (emojis) that appear briefly on the TV.
- Spectator count shown on TV: "3 players, 2 spectators watching"

**Use case:** A 5th person arrives at game night. They can watch and react while waiting for someone to sit out.

**Implementation complexity:** S — spectators are just controllers in read-only mode. The phone shows a simplified view.

**Priority:** P1 — ships in v2.1.

### 7.2 Replays and Highlights

After each Game Night, the system generates a text-based highlight reel:

```
GAME NIGHT HIGHLIGHTS — February 28, 2026
==========================================
Game 1: Texas Hold'em (15 hands)
  - Hand 5: Player 2 bluffed Player 1 off a straight with a pair of 3s!
  - Hand 11: Player 3 hit a Full House (Kings full of Aces)

Game 2: Blackjack (12 rounds)
  - Round 3: Player 1 doubled down on 11 and hit 21!
  - Round 9: Player 4 hit a Perfect Pair (25:1 payout!)

Game 3: Craps (18 rolls)
  - Player 2 rolled 14 times as shooter — HOT STREAK!
  - Player 3 won the biggest single bet: 5,000 chips on the pass line

CHAMPION: Player 2 (285 Game Night Points)
MVP Moment: The 14-roll craps streak that sealed the victory
```

**Storage:** Highlights are stored per-session and accessible from the host's profile. Retained for 90 days.

**Implementation complexity:** M — requires game event logging, highlight selection algorithm, formatted output.

**Priority:** P2 — ships in v2.2.

### 7.3 Shareable Moments

**Results card:** After each Game Night, a PNG image is generated showing the final standings, highlight moment, and Weekend Casino branding. Shareable via Web Share API on the phone controller.

**Clip recording:** If the TV platform supports screen recording (Fire TV Cube has this natively), allow players to mark a moment for clipping. The last 30 seconds are saved as a video file.

**Social integration:** The share card includes:
- Weekend Casino logo
- QR code to download/open the app
- Branded template with game night stats
- "Come play with us! weekendcasino.com"

**Why this drives DAU:** Every shared results card is an organic advertisement. The friend who sees it on social media thinks "that looks fun" and downloads the app. Social sharing has the highest-quality acquisition (4x more likely to be a daily user — Market Research Section 5).

**Implementation complexity:** M (results card), L (clip recording — platform-dependent).

**Priority:** P1 (results card), P3 (clip recording).

### 7.4 Reactions and Emotes

During gameplay, players can send quick reactions from their phone controller:

| Reaction | Display on TV | Audio |
|----------|-------------|-------|
| Clap | Clapping hands animation near player's seat | Clap sound |
| Laugh | Laughing emoji animation | Short laugh |
| Groan | Facepalm animation | Groan sound |
| Fire | Fire emoji animation | Sizzle sound |
| Taunt | Pointing finger animation | "Ooh!" crowd sound |
| Shock | Jaw-drop animation | Gasp sound |

**Rate limit:** Max 3 reactions per 10 seconds per player (prevent spam).

**Controller UI:** A collapsible reaction bar at the bottom of the game screen. Tap to expand, tap a reaction to send.

**Implementation complexity:** S — simple event dispatch, TV-side animation trigger, rate limiter.

**Priority:** P1 — ships in v2.

---

## 8. Priority Roadmap

### P0 — Must ship with v2 launch

| Feature | Complexity | Expected DAU Impact | Rationale |
|---------|-----------|-------------------|-----------|
| Game Night Mode | L | +30-40% weekly return | THE product. Without this, we're just another casino app. |
| Daily Login Bonuses | S | +15-25% D1 retention | Table stakes. Every social casino does this. Not having it is leaving DAU on the table. |
| Weekly Challenges | M | +10-15% cross-game play | Drives game variety. Prevents players from only playing one game. |
| Reactions/Emotes | S | +5% session engagement | Low cost, high social value. Makes the party feel alive. |

### P1 — Ships in v2.1 (1 sprint after v2)

| Feature | Complexity | Expected DAU Impact | Rationale |
|---------|-----------|-------------------|-----------|
| Crews | M | +20-25% weekly return | Social obligation is the strongest retention force. Must ship soon after v2. |
| Progressive Jackpot | S | +10-15% session length | Constant visible reminder. Low effort, high engagement. |
| Spectator Mode | S | +5% session size | Removes the "5th person problem." Increases group size. |
| Basic Cosmetics (20 items) | M | +10% grind motivation | Players need things to earn. |
| SNG Tournaments | M | +15% competitive engagement | Quick competitive format. |
| Shareable Results Card | S | Organic acquisition driver | Every share is a free ad. |

### P2 — Ships in v2.2+

| Feature | Complexity | Expected DAU Impact | Rationale |
|---------|-----------|-------------------|-----------|
| Scheduled Tournaments | L | +15-20% appointment return | Creates specific times players must be in the app. |
| Replays/Highlights | M | +5% re-engagement | Players revisit to see their highlights. |
| Extended Cosmetics (50+ items) | M | +5-10% completionist grind | More things to earn = more reasons to play. |
| Crew Leaderboards (Global) | M | +10% Crew engagement | Competition between Crews drives group coordination. |

### P3 — Future (v3+)

| Feature | Complexity | Expected DAU Impact | Rationale |
|---------|-----------|-------------------|-----------|
| Multi-TV Tournaments | XL | +20% competitive reach | Expands from 4 players to unlimited. |
| Clip Recording | L | Organic virality | Platform-dependent. Requires Fire TV integration. |
| Battle Pass | M | Recurring revenue | Monetisation layer on top of cosmetics. |
| Season Pass | M | Monthly appointment | Forces monthly re-engagement. |

---

## Appendix: Retention Model

### How These Systems Compound

```
Day 1: Player downloads, plays one Game Night. Fun. (D1 retention: ~40%)
Day 2: Daily bonus notification. Opens app, collects 500 chips. Sees challenge progress. (D1 -> D2: 60%)
Day 3-6: Daily bonus each day. Checks challenge progress. Finishes Bronze challenge. (Daily open rate: 50%)
Day 7: Collects Mystery Crate from 7-day login. Unlocks "Lucky" card back. Posts to group chat: "We playing Friday?"
Day 8 (Friday): Game Night #2. Crew earns XP. Player is 2nd on the leaderboard. Wants revenge. Shares results card.
Day 14: Game Night #3. Streak at 2 weeks. Gets the "Regular" badge. Crew is Level 3 — they unlock the crew card back.
Day 28: 4-week streak. The crew can't skip now — they'd lose the streak AND the next Crew level.
```

**The flywheel:**
1. **Game Night** creates the weekly ritual (social + competitive)
2. **Daily bonuses** create the daily open habit (loss aversion)
3. **Challenges** drive cross-game play (discovery)
4. **Crews** create social obligation (peer pressure)
5. **Jackpot** creates moment-to-moment excitement (variable reward)
6. **Cosmetics** create long-term goals (completionism)
7. **Tournaments** create appointment mechanics (FOMO)
8. **Sharing** drives acquisition (virality)

Each system reinforces the others. A player who only cares about cosmetics still plays Game Night (because that's how you earn them). A player who only cares about Game Night still collects daily bonuses (because the streak multiplier helps). A player who only cares about their Crew still tries new games (because Crew challenges require it).

**Target: 25-30% DAU/MAU stickiness** (top-performing social casino benchmark). With the social compounding from our TV + phone model, 28% is achievable.

---

*All retention benchmarks sourced from the Weekend Casino Market Research document. See [MARKET-RESEARCH-CASINO-GAMES.md](./MARKET-RESEARCH-CASINO-GAMES.md) for data sources.*

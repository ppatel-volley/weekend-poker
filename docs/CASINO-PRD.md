# Weekend Casino — Product Requirements Document

> **Status:** Final
> **Authority:** Product requirements for Weekend Casino v1. Authoritative for product scope, user stories, and feature specifications.
> **Last Aligned:** 2026-02-28
> **Canonical Decisions:** See `docs/CANONICAL-DECISIONS.md`
> **Supersedes:** Weekend Poker PRD v1.0 (for casino-specific scope) | **Superseded By:** —
>
> **Version:** 1.1
> **Date:** 2026-02-28
> **Author:** Product Management
> **Extends:** Weekend Poker PRD v1.0 (2026-02-09) — that document remains authoritative for poker-specific rules not restated here. This PRD adds multi-game architecture, new games, and cross-game systems.

---

## Table of Contents

### I. Product Overview
1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Target Audience](#3-target-audience)
4. [Platform Requirements](#4-platform-requirements)

### II. Rebrand & Migration
5. [Rebrand Scope](#5-rebrand-scope)
6. [Package & Directory Rename Plan](#6-package--directory-rename-plan)

### III. Game Selection & Lobby
7. [Casino Lobby & Game Selection](#7-casino-lobby--game-selection)
8. [Session Model](#8-session-model)

### IV. Texas Hold'em (Existing)
9. [Texas Hold'em Integration](#9-texas-holdem-integration)

### V. 5-Card Draw Poker (New)
10. [5-Card Draw — Game Mechanics](#10-5-card-draw--game-mechanics)
11. [5-Card Draw — Phase Design](#11-5-card-draw--phase-design)
12. [5-Card Draw — Voice Commands](#12-5-card-draw--voice-commands)
13. [5-Card Draw — AI Bots](#13-5-card-draw--ai-bots)
14. [5-Card Draw — Display & Controller UX](#14-5-card-draw--display--controller-ux)

### VI. Blackjack (New)
15. [Blackjack — Game Overview](#15-blackjack--game-overview)
16. [Blackjack Classic Dealer Mode — Mechanics](#16-blackjack-classic-dealer-mode--mechanics)
17. [Blackjack Classic Dealer Mode — Phase Design](#17-blackjack-classic-dealer-mode--phase-design)
18. [Blackjack Classic Dealer Mode — Side Bets & Insurance](#18-blackjack-classic-dealer-mode--side-bets--insurance)
19. [Blackjack Competitive Variant — Mechanics](#19-blackjack-competitive-variant--mechanics)
20. [Blackjack Competitive Variant — Phase Design](#20-blackjack-competitive-variant--phase-design)
21. [Blackjack — Voice Commands](#21-blackjack--voice-commands)
22. [Blackjack — Display & Controller UX](#22-blackjack--display--controller-ux)
23. [Blackjack — Dealer Characters](#23-blackjack--dealer-characters)

### VII. Cross-Game Systems
24. [Shared Player Wallet](#24-shared-player-wallet)
25. [Cross-Game Session Statistics](#25-cross-game-session-statistics)
26. [Dealer System Extensions](#26-dealer-system-extensions)

### VIII. Technical Architecture
27. [Multi-Ruleset Architecture](#27-multi-ruleset-architecture)
28. [State Management — Multi-Game](#28-state-management--multi-game)
29. [Controller Adaptation Layer](#29-controller-adaptation-layer)
30. [Performance Considerations](#30-performance-considerations)

### IX. Quality & Operations
31. [Error Handling Per Game](#31-error-handling-per-game)
32. [Analytics Events](#32-analytics-events)
33. [Accessibility](#33-accessibility)
34. [Testing Strategy](#34-testing-strategy)

### X. Cinematic Video Assets
35. [Video Moments & Integration](#35-video-moments--integration)
36. [Video Playback Architecture](#36-video-playback-architecture)

### XI. Project Management
37. [Milestones & Phasing](#37-milestones--phasing)
38. [Risk Register](#38-risk-register)

---

# I. Product Overview

## 1. Executive Summary

Weekend Casino is the evolution of Weekend Poker from a single Texas Hold'em experience into a multi-game casino platform for Smart TV and Fire TV. Players still speak their actions to AI dealer characters, still use their phones as private controllers, and still enjoy premium 3D visuals rendered on cloud GPUs via Amazon GameLift Streams. The difference: they now choose from multiple games — Texas Hold'em, 5-Card Draw Poker, and Blackjack — all within a single session, with a shared chip wallet that carries between games.

**What is changing:**
- Full rebrand from "Weekend Poker" to "Weekend Casino" (packages, user-facing text, directory names)
- New casino lobby with game selection before play begins
- Two new games: 5-Card Draw Poker and Blackjack (two modes)
- Blackjack-specific dealer characters alongside existing poker dealers
- Shared player wallet that persists across games within a session
- Cross-game session statistics
- Adaptive controller UI that reconfigures per game type
- AI-generated cinematic video moments — intros, celebrations, transitions, and ambient scene elements with a premium Las Vegas aesthetic

**What is NOT changing:**
- VGF framework (still server-authoritative, Redux-like, Socket.IO transport)
- Two-device model (Display on TV via GameLift Streams, Controller on phone)
- Voice-first interaction model
- AI bot system (hybrid rules + LLM architecture)
- Cloud rendering via GameLift Streams
- All existing Texas Hold'em rules, mechanics, and dealer characters (Vincent, Maya, Remy, Jade)

**Core value proposition:** A living-room casino night that feels like the real thing — multiple games, one session, same friends, same premium experience.

---

## 2. Product Overview

| Attribute | Detail |
|---|---|
| **Product** | Weekend Casino |
| **Games** | Texas Hold'em, 5-Card Draw Poker, Blackjack (Classic Dealer + Competitive) |
| **Players** | 1–4 (any mix of humans and AI bots) |
| **Minimum to start** | 2 players (human or bot) |
| **Input** | Voice commands (primary), mobile touch (secondary), TV remote (fallback) |
| **Output** | 3D rendered table on TV, private cards/controls on phone, dealer narration via TTS |
| **Session model** | Single session across games; shared wallet; game type selected in lobby |
| **Framework** | VGF v4.8.0, server-authoritative |
| **Monetisation** | Not in scope for v1 |
| **Localisation** | v1 is English-only. All dealer characters, voice commands, TTS, and UI copy are English. Localisation deferred to v2. |

---

## 3. Target Audience

### Primary

- **Casual game-night groups** (25–45 years old) who want variety beyond a single card game
- **Groups of friends/family** looking for a shared living-room activity on Smart TV
- **Casino-curious players** who want to try different games in a low-pressure, social environment

### Secondary

- **Solo players** who want to practise against AI opponents across multiple games
- **Poker regulars** from Weekend Poker who want fresh content without losing their favourite game
- **Blackjack enthusiasts** who want a social, voice-controlled blackjack experience

### User Personas

**"Game Night Greg"** — Hosts a weekly game night with 3 mates. After 2 hours of Hold'em, they want to switch to Blackjack without closing the app. Shared chips carry over.

**"Learning Lisa"** — Played poker once, enjoyed it. Now wants to try 5-Card Draw (simpler than Hold'em) and Blackjack. The AI dealer guides her through each game.

**"Variety Vic"** — Loves card games but gets bored playing one game all night. Wants to bounce between poker and blackjack with the same group, keeping track of who's up overall.

**"Blackjack Brian"** — Not a poker player. Joins game night specifically for blackjack. Happy to sit out during poker rounds or play as a casual bot opponent.

---

## 4. Platform Requirements

No changes from the existing Weekend Poker PRD (Section 4). The platform stack remains:

| Component | Technology |
|---|---|
| Display (TV) | Thin client via GameLift Streams (WebRTC to browser) |
| Controller (Phone) | Mobile browser (Chrome, Safari, Firefox), Socket.IO to VGF server |
| Cloud Rendering | GameLift Streams `gen4n_high`, Windows Server 2022 |
| VGF Server | Node.js 22+, @volley/vgf v4.8.0 with `FailoverVGFServiceFactory` |

---

# II. Rebrand & Migration

## 5. Rebrand Scope

### 5.1 Package Names

| Current | New |
|---|---|
| `@weekend-poker/shared` | `@weekend-casino/shared` |
| `@weekend-poker/server` | `@weekend-casino/server` |
| `@weekend-poker/display` | `@weekend-casino/display` |
| `@weekend-poker/controller` | `@weekend-casino/controller` |

### 5.2 Root Package

| Current | New |
|---|---|
| `"name": "weekend-poker"` | `"name": "weekend-casino"` |

### 5.3 Script Filter References

All `pnpm --filter @weekend-poker/*` references in root `package.json` scripts update to `@weekend-casino/*`.

### 5.4 User-Facing Text

| Location | Change |
|---|---|
| TV lobby title | "Weekend Poker" → "Weekend Casino" |
| Phone controller header | "Weekend Poker" → "Weekend Casino" |
| Session summary header | "Weekend Poker Session Summary" → "Weekend Casino Session Summary" |
| Browser tab title | "Weekend Poker" → "Weekend Casino" |
| QR code landing page | "Join Weekend Poker" → "Join Weekend Casino" |
| README, documentation | All references updated |
| Loading screen | "Weekend Poker" → "Weekend Casino" |

### 5.5 Repository Name

| Current | New |
|---|---|
| `weekend-poker` | `weekend-casino` |

The root directory rename (`C:\volley\dev\weekend-poker` → `C:\volley\dev\weekend-casino`) is a file-system-level change. Coordinate with the team to rename after all other changes are merged.

### 5.6 What Does NOT Change

- VGF framework package names (`@volley/vgf`, `@volley/recognition-client-sdk`) — these are external dependencies
- Internal poker-domain type names (`PokerGameState`, `PokerPlayer`, etc.) — these remain as-is because they are game-specific types. Blackjack will have its own types (`BlackjackGameState`, etc.)
- Git history — the rename is a commit, not a rewrite

---

## 6. Package & Directory Rename Plan

### 6.1 Execution Order

This order prevents broken imports during the migration:

1. **Create a feature branch** (`feat/casino-rebrand`)
2. **Update `packages/shared/package.json`** — change `name` to `@weekend-casino/shared`
3. **Update all workspace dependency references** — every `package.json` that has `"@weekend-poker/shared": "workspace:*"` becomes `"@weekend-casino/shared": "workspace:*"`
4. **Update all import statements** — search-and-replace `@weekend-poker/` → `@weekend-casino/` across all `.ts` and `.tsx` files
5. **Update app package names** — `@weekend-poker/server`, `@weekend-poker/display`, `@weekend-poker/controller` → `@weekend-casino/*`
6. **Update root `package.json`** — name and all `--filter` references
7. **Update `pnpm-workspace.yaml`** — no path changes needed (packages/ and apps/ stay the same)
8. **Run `pnpm install`** — regenerate lockfile with new package names
9. **Run `pnpm typecheck && pnpm test:run && pnpm build`** — verify nothing is broken
10. **Update user-facing strings** — lobby titles, headers, loading screens, QR landing page
11. **Commit, push, open PR**
12. **Post-merge:** Rename root directory and update CI/CD paths

### 6.2 Verification Criteria

- `pnpm typecheck` passes with zero errors
- `pnpm test:run` passes all existing tests
- `pnpm build` produces artefacts for all three apps
- No remaining references to `@weekend-poker` in any source file (verified by `grep -r "@weekend-poker" --include="*.ts" --include="*.tsx" --include="*.json"`)
- Display client renders lobby with "Weekend Casino" branding
- Controller shows "Weekend Casino" header

---

# III. Game Selection & Lobby

## 7. Casino Lobby & Game Selection

### 7.1 Lobby Flow

The lobby now includes a game selection step before play begins:

```
TV app launches
  |
  v
Main Menu (Weekend Casino branding)
  |
  v
"New Session" -> VGF session created -> QR code displayed
  |
  v
Players scan QR code -> phones connect as Controllers
  |
  v
Players enter name, select avatar, tap Ready
  |
  v
Host selects game type (Texas Hold'em / 5-Card Draw / Blackjack)
  |
  v
Game-specific configuration:
  - Hold'em: blind level, bot count/difficulty, dealer character
  - 5-Card Draw: ante level, bot count/difficulty, dealer character
  - Blackjack: mode (Classic/Competitive), deck count, dealer character
  |
  v
Host taps "Start Game" (min 2 players/bots)
  |
  v
3D scene loads for selected game -> gameplay begins
```

### 7.2 Game Selection UI (TV Display)

The lobby presents three game cards in a horizontal carousel:

| Game Card | Visual | Label | Status |
|---|---|---|---|
| Texas Hold'em | Poker table icon with cards | "Texas Hold'em" | Available |
| 5-Card Draw | Five-card fan icon | "5-Card Draw" | Available |
| Blackjack | Blackjack table with 21 | "Blackjack" | Available |

**Selection behaviour:**
- Host navigates with TV remote (left/right) or voice ("Pick Hold'em", "Pick Blackjack", "Pick 5-Card Draw")
- Selected game card enlarges with a gold border highlight
- Below the selected card, game-specific configuration options appear
- Non-host players see the selection but cannot change it

### 7.3 Game Selection UI (Phone Controller)

- Host's phone shows game selection as a swipeable carousel matching the TV layout
- Non-host phones display "Host is choosing a game..." with the current selection
- After game is selected, all phones show game-specific configuration relevant to their role (e.g., bot difficulty for host, "waiting to start" for others)

### 7.4 Switching Games Mid-Session

Players can switch games without ending the session. **v1: Host-only game switching.** The host (session creator) controls game selection. This is simpler to implement and avoids vote-coordination complexity for launch. Vote-based switching (majority vote mechanism) is deferred to v2 (see Section 39.4).

**User stories:**

- As a host, I want to switch from Hold'em to Blackjack between hands, so that the group can play multiple games in one night without losing their chip stacks
- As a non-host player, when the host switches games, I want a smooth transition with my wallet preserved, so that the change feels seamless

**Flow:**
1. Host says "Change game" or taps "Change Game" on phone (only between hands / between blackjack rounds)
2. Current game pauses; lobby returns to game selection on TV
3. Host picks the new game and configuration
4. All players' wallets carry over (Section 24)
5. Host taps "Start Game"; new 3D scene loads; gameplay begins

**Acceptance criteria:**
- Given a session with 4 players in Hold'em, when the host says "Change game" between hands, then the lobby re-appears with the game selection carousel
- Given a game switch, when the lobby appears, then all 4 players remain connected and each player's wallet balance is preserved
- Given a non-host player says "Change game", then the dealer responds "Only the host can switch games"
- Given a session in the middle of a Hold'em hand, when the host says "Change game", then the system responds "Finish this hand first"
- Given a game switch from Hold'em to Blackjack, when the new game loads, then the 3D scene fully replaces the poker scene (no shared casino floor)

**Edge cases:**
- If a player is sitting out when the game switches, they remain in the session but start the new game as active
- If a player's wallet is at zero when switching, they must rebuy before the new game starts (automatic prompt)
- Bots from the previous game are removed; host configures new bots for the new game

### 7.5 Lobby User Stories

- As a **host**, when I open the casino lobby, I want to see all available games with clear descriptions, so that I can pick the right game for my group
- As a **host**, when I select a game, I want to configure game-specific settings (blind level, deck count, bot count, dealer character), so that the experience matches my group's skill level
- As a **non-host player**, when the host is choosing a game, I want to see which game is being considered and a brief description, so that I know what to expect
- As a **first-time player**, when I connect for the first time, I want to see a brief tutorial overlay explaining the lobby flow (scan, ready up, wait for host), so that I don't feel lost
- As a **host**, when all players have readied up, I want the "Start Game" button to pulse and a voice prompt ("Everyone's ready. Say 'start game' to begin."), so that the transition feels natural

**Acceptance criteria:**
- Given a new session with no games played, when the host views the lobby, then all four game options are visible with game card art, title, and 1-line description
- Given the host has selected Blackjack, when a non-host player views their phone, then they see "Host selected: Blackjack" with the current configuration summary
- Given all players are ready, when the host taps "Start Game" or says "Start game", then the game-specific 3D scene begins loading within 1 second

### 7.6 Voice Commands — Lobby

| Intent | Phrases | Who | Response |
|---|---|---|---|
| Select game | "Pick Hold'em", "Pick Blackjack", "Play 5-Card Draw" | Host | Selection updates on TV |
| Change game | "Change game", "Switch game", "Back to lobby" | Host only | Returns to lobby game selection (between rounds only). Non-host: "Only the host can switch games." |
| Start game | "Start game", "Deal", "Let's go" | Host | Game begins if min 2 players |
| Ready up | "Ready", "I'm ready" | Any player | Player marked ready |

**Analytics events:**
- `lobby.game_selected` — `{ gameType, sessionId, playerCount }`
- `lobby.game_switched` — `{ fromGame, toGame, sessionId, handsPlayedInPreviousGame }`
- `lobby.session_started` — `{ gameType, playerCount, botCount, sessionId }`

**Accessibility:**
- Game selection cards have visible text labels (never rely on icon alone)
- Selected state indicated by border + text label ("Selected") + audio cue
- Voice-navigable: "Next game", "Previous game", "Select this"

---

## 8. Session Model

### 8.1 Session Lifecycle (Multi-Game)

A single VGF session spans the entire casino night. Games are phases within that session.

```
SESSION_START
  |
  v
CASINO_LOBBY (game selection)
  |
  v
GAME_ACTIVE (Hold'em / 5-Card Draw / Blackjack)
  |  ^
  |  | "Change game" -> back to CASINO_LOBBY
  v  |
GAME_ACTIVE (...)
  |
  v
SESSION_END (host ends or all players leave)
  |
  v
SESSION_SUMMARY (cross-game stats)
```

### 8.2 Session State Schema

```typescript
/** Flat shared base — no game-specific fields at root. See Section 28.1 for full hierarchy. */
interface CasinoGameState {
  phase: CasinoPhase
  selectedGame: CasinoGame | null
  wallet: Record<string, number>          // playerId -> balance (cross-game)
  players: CasinoPlayer[]
  sessionStats: SessionStats
  videoPlayback?: VideoPlayback
  // Game-specific sub-objects (only populated when that game is active)
  holdem?: HoldemState
  fiveCardDraw?: FiveCardDrawState
  blackjack?: BlackjackState
  blackjackCompetitive?: BlackjackCompetitiveState
}

type CasinoGame = 'holdem' | 'five_card_draw' | 'blackjack_classic' | 'blackjack_competitive'

interface CasinoPlayer {
  id: string
  name: string
  wallet: number // shared across games
  avatarId: string
  isBot: boolean
  isHost: boolean
  isReady: boolean
  currentGameStatus: 'active' | 'sitting-out' | 'spectating'
}

interface LobbyConfig {
  selectedGame: CasinoGame | null
  blindLevel?: BlindLevel // for poker games
  anteLevel?: AnteLevel // for 5-card draw
  deckCount?: number // for blackjack (1-8)
  dealerCharacterId: string
  botConfigs: BotConfig[]
}
```

### 8.3 Session Persistence

- Session state persists in Redis via VGF's `FailoverVGFServiceFactory`
- Wallet balances survive reconnections and game switches
- If the VGF server restarts, the session is recoverable from Redis (VGF failover guarantee)
- Session timeout: 4 hours of inactivity

---

# IV. Texas Hold'em (Existing)

## 9. Texas Hold'em Integration

### 9.1 What Changes

Texas Hold'em rules, mechanics, phases, voice commands, AI bots, dealer characters, and UX are fully defined in the existing Weekend Poker PRD (Sections 5–13) and remain unchanged. The only modifications are:

| Change | Detail |
|---|---|
| Entry point | Game is now selected from the casino lobby instead of being the default |
| Wallet integration | Player stacks come from the shared wallet (Section 24) instead of a standalone buy-in |
| Game-switch support | Host can return to casino lobby between hands |
| Phase naming | Hold'em phases are prefixed (`POSTING_BLINDS`, `PRE_FLOP_BETTING`, etc.) to avoid collisions with other game phases |
| Session stats | Hand results feed into cross-game statistics (Section 25) |

### 9.2 Hold'em Buy-In from Wallet

When starting Hold'em from the casino lobby:

1. Each player's buy-in is deducted from their shared wallet
2. Default buy-in: 100 big blinds (or wallet balance if lower)
3. Players can choose their buy-in amount (20–100 BB range, capped at wallet balance)
4. When switching away from Hold'em, each player's remaining stack is returned to their wallet

**Acceptance criteria:**
- Given a player with a wallet balance of 5,000 and blinds at 25/50, when Hold'em starts, then their default buy-in is 5,000 (100 BB) and their wallet shows 0 remaining
- Given a player with a wallet balance of 2,000 and blinds at 50/100, when Hold'em starts, then their buy-in is capped at 2,000 (20 BB) and their wallet shows 0
- Given a player with 3,500 chips at the Hold'em table, when the host switches to Blackjack, then 3,500 is returned to the player's wallet

### 9.3 Existing Dealer Characters (Poker)

The four existing dealer characters remain poker-specific:

| Dealer | Personality | Games |
|---|---|---|
| Vincent | Old-school professional | Texas Hold'em, 5-Card Draw |
| Maya | Warm and encouraging | Texas Hold'em, 5-Card Draw |
| Remy | Witty and playful | Texas Hold'em, 5-Card Draw |
| Jade | Cool and dramatic | Texas Hold'em, 5-Card Draw |

These four dealers are available for both poker variants (Hold'em and 5-Card Draw) but not for Blackjack. Blackjack has its own dealer roster (Section 23).

---

# V. 5-Card Draw Poker (New)

## 10. 5-Card Draw — Game Mechanics

### 10.1 Core Rules

**Deck:** Standard 52-card deck, no jokers. Fisher-Yates shuffle before each hand.

**Hole Cards:** Each player receives 5 private cards dealt one at a time, clockwise, starting from the player left of the dealer button.

**No Community Cards:** Unlike Hold'em, there are no shared cards. Each player's hand is entirely private.

**Best Hand:** Standard poker hand rankings (identical to Hold'em — see Weekend Poker PRD Section 5.2). The best 5-card hand wins. Since players hold exactly 5 cards, there are no "best 5 of 7" combinations — the hand IS the 5 cards.

### 10.2 Hand Rankings

Identical to Hold'em (Royal Flush through High Card). Tiebreaker rules are identical. The existing `packages/shared` hand evaluation engine is reused directly — it already evaluates 5-card hands.

### 10.3 Table Positions (4-Player)

| Seat | Position | Role |
|------|----------|------|
| 1 | Button (Dealer) | Last to act in all betting rounds |
| 2 | Small Blind (SB) | Posts half the big blind |
| 3 | Big Blind (BB) | Posts the minimum bet |
| 4 | Under the Gun (UTG) | First to act pre-draw |

Button rotates clockwise after each hand. When heads-up: the button is the small blind.

### 10.4 Ante Structure

5-Card Draw uses blinds (not antes) to keep the system consistent with Hold'em. Same blind structure (Weekend Poker PRD Section 5.4). Host selects blind level in lobby.

### 10.5 Betting Actions

Identical to Hold'em: Fold, Check, Bet, Call, Raise, All-In. Same no-limit rules. Same minimum bet / minimum raise rules. Same all-in / side pot rules (Weekend Poker PRD Sections 5.5–5.7).

### 10.6 The Draw Phase

After the first betting round, each remaining player may discard 0–3 cards and receive replacement cards from the deck.

**Draw rules:**
- Players discard up to 3 cards
- Discards are placed in the discard pile (face-down, not visible)
- Replacement cards are dealt from the top of the remaining deck
- If a player discards 0 cards ("stand pat"), they keep their entire hand
- Draw order: clockwise from the player left of the dealer button
- Each player has 30 seconds (+ 15-second time bank) to decide their draw
- If timer expires: player stands pat (keeps all 5 cards)

**Deck exhaustion rule (edge case):** With 4 players, the maximum cards needed is 20 (deal) + 12 (draw) = 32 cards from a 52-card deck. There are always enough cards. No reshuffle of discards is needed.

### 10.7 Showdown

- Occurs after the second (post-draw) betting round if 2+ players remain
- Last aggressor shows first; if no bets in the final round, first active player clockwise from button
- **House rule:** All hands shown at showdown (consistent with Hold'em house rules)
- Identical pot distribution rules to Hold'em

### 10.8 Cash Game & Rebuy Rules

Identical to Hold'em (Weekend Poker PRD Section 5.9).

### 10.9 House Rules Summary

| Rule | Setting | Rationale |
|------|---------|-----------|
| Show all hands at showdown | ON | Entertainment and learning |
| Maximum discard | 3 cards | Standard 5-card draw rule |
| Unlimited rebuys | ON | Consistent with Hold'em |
| Straddle | OFF | Not applicable to 5-card draw |
| Disconnection protection | Stand pat + check/fold | Prevents stalling |
| Action timer | 30 seconds + 15-second time bank | Consistent with Hold'em |
| Draw timer | 30 seconds + 15-second time bank | Same as action timer |

---

## 11. 5-Card Draw — Phase Design

### 11.1 Phase Diagram

```
CASINO_LOBBY
  |  (host selects 5-Card Draw, min 2 players ready)
  v
DRAW_POSTING_BLINDS
  |
  v
DRAW_DEALING (5 cards per player)
  |
  v
DRAW_BETTING_1 --> [all fold but one] --> DRAW_HAND_COMPLETE
  |                 \
  |                  +-> [all remaining all-in] --> DRAW_SHOWDOWN
  v
DRAW_DRAW_PHASE (each player discards 0-3, receives replacements)
  |
  v
DRAW_BETTING_2 --> [all fold but one] --> DRAW_HAND_COMPLETE
  |
  v
DRAW_SHOWDOWN
  |
  v
DRAW_POT_DISTRIBUTION
  |
  v
DRAW_HAND_COMPLETE --> [button rotation, rebuy phase] --> DRAW_POSTING_BLINDS
```

### 11.2 Phase Descriptions

| Phase | Duration | Key Logic |
|-------|----------|-----------|
| **DRAW_POSTING_BLINDS** | ~1s | Auto-post SB and BB; deduct from stacks |
| **DRAW_DEALING** | ~3s | Shuffle, deal 5 cards per player with animation; store privately |
| **DRAW_BETTING_1** | Variable | UTG acts first; BB has option to check or raise if no raise |
| **DRAW_DRAW_PHASE** | Variable | Each player selects cards to discard (0–3); replacements dealt |
| **DRAW_BETTING_2** | Variable | First active player left of button acts first |
| **DRAW_SHOWDOWN** | ~3s | Reveal all hands; evaluate best 5-card hands |
| **DRAW_POT_DISTRIBUTION** | ~2s | Award pots; announce winner(s) via TTS |
| **DRAW_HAND_COMPLETE** | ~3s | Rotate button; process rebuys; inter-hand delay; loop |

### 11.3 Draw Phase Detail

The draw phase is the unique mechanic that differentiates 5-Card Draw from Hold'em.

**Flow per player (sequential, clockwise):**

```
[Set Current Player = First to Act (left of button)]
  |
  v
[Dealer announces: "[Player], how many cards?"]
  |
  v
[Player selects cards to discard via voice or touch]
  |
  v
[Timeout?] --> Stand pat (keep all 5)
  |
  v
[Player confirms: "Draw 2" / "Stand pat" / "Keep them all"]
  |
  v
[Dealer: "[Player] draws [N]" / "[Player] stands pat"]
  |
  v
[Server: remove discarded cards, deal N replacements]
  |
  v
[Next player clockwise]
  |
  v
[All players drawn?] --> [End draw phase, begin second betting]
```

**All-in before draw:** Players who went all-in during the first betting round still participate in the draw phase. They select discards normally. They do not participate in the second betting round.

---

## 12. 5-Card Draw — Voice Commands

### 12.1 Draw-Specific Commands

| Intent | Canonical Form | When Legal | Dealer Response |
|---|---|---|---|
| Draw cards | "Draw [N]" | Draw phase, player's turn | "[Player] draws [N]." |
| Stand pat | "Stand pat" / "Keep them" / "No cards" | Draw phase, player's turn | "[Player] stands pat." |
| Discard specific | "Discard the [rank]" / "Throw away the [rank] and [rank]" | **Deferred to v2** — touch-only for v1 | "[Player] discards [N]." |

### 12.2 Natural Language Variations

- **Draw:** "Draw two", "Give me 2", "I'll take 3", "2 cards please", "Change 2"
- **Stand pat:** "Stand pat", "I'm good", "Keep them all", "No cards", "None", "I'll stay"
- **Discard specific:** *(Deferred to v2)* "Throw away the 3 and the 7", "Discard my lowest two", "Get rid of the off-suit" — v1 uses touch-only card selection

**Disambiguation rules:**
- "Draw" without a number: dealer asks "How many?"
- "Draw 4" or "Draw 5": dealer says "Maximum 3 cards. How many would you like?"
- Discarding specific cards by rank: **Deferred to v2.** In v1, players select cards via touch on the phone controller. Voice is limited to "Draw [N]" (draws from rightmost) and "Stand pat"

### 12.3 Phone Controller — Draw Interaction

During the draw phase, the phone shows:
- All 5 cards face-up
- Tap cards to toggle selection (selected cards dim and shift up)
- "Discard [N] selected" button appears when cards are selected
- "Stand Pat" button always visible
- Voice button for verbal draw commands
- Counter showing "X of 3 selected"

### 12.4 Slot Map (Draw Phase)

```typescript
// v1: count-based draw commands only (no card-specific discard by name)
const drawPhaseSlotMap = [
  'draw', 'one', 'two', 'three', 'none',
  'stand pat', 'keep',
  'no cards', 'give me', 'change'
]
// v2 additions: 'discard', 'throw away', card rank names
```

**Analytics events:**
- `draw.cards_drawn` — `{ playerId, count, handNumber }`
- `draw.stood_pat` — `{ playerId, handNumber }`
- `draw.draw_timeout` — `{ playerId, handNumber }`

**Accessibility:**
- Screen reader announces card values during draw selection
- High-contrast card selection state (not just dimming — checkmark overlay)
- Voice alternative for all touch actions

---

## 13. 5-Card Draw — AI Bots

### 13.1 Bot Architecture

Same hybrid architecture as Hold'em: rules-based for Easy, LLM-driven for Medium/Hard.

### 13.2 Easy Bot Draw Strategy (Rules Engine)

| Hand | Draw Action |
|---|---|
| Four of a Kind, Full House, Flush, Straight | Stand pat |
| Three of a Kind | Discard 2 non-trip cards |
| Two Pair | Discard 1 kicker (90%), stand pat (10%) |
| One Pair | Discard 3 non-pair cards |
| Four to a Flush | Discard 1 non-flush card (70%), discard all non-flush + others (30% — mistake) |
| Four to a Straight (open-ended) | Discard 1 non-straight card (60%), keep all (40% — mistake) |
| Nothing | Discard 3 lowest (80%), discard 2 lowest (20%) |

**Betting behaviour:** Identical Easy bot strategy tables to Hold'em (PRD Section 8.3), adapted: pre-draw = pre-flop, post-draw = post-flop. The key difference is there is no board texture to consider.

### 13.3 Medium/Hard Bot Draw Strategy (LLM)

The LLM receives:
- Current 5-card hand
- Pre-computed hand strength, draw probabilities (probability of improving with N discards)
- Opponent draw counts from the draw phase (visible information)
- Opponent betting patterns
- Pot odds

The LLM decides draw action + betting action. Same structured JSON output format as Hold'em.

**Draw information as reads:** A key strategic element of 5-Card Draw is reading opponents based on how many cards they drew. Medium bots track this. Hard bots use it as a primary input for post-draw strategy (e.g., "opponent stood pat — likely has a strong made hand or is bluffing").

### 13.4 Bot Draw Timing

| Bot Level | Draw Decision | Additional Delay |
|---|---|---|
| Easy | 0.5–1.5s | 0s |
| Medium | 1–3s | 0.5–1s artificial pause |
| Hard | 1–2s | 1–3s (appears to deliberate) |

---

## 14. 5-Card Draw — Display & Controller UX

### 14.1 3D Scene

The 5-Card Draw scene reuses the poker room environment (same table, chairs, lighting, atmosphere). Differences:

| Element | Hold'em | 5-Card Draw |
|---|---|---|
| Community cards | 5 cards in centre | None |
| Player card representation | 2 cards face-down at each seat | 5 cards face-down at each seat |
| Draw animation | N/A | Discarded cards slide to discard pile; new cards dealt from deck |
| Dealer hand | Deals 2 per player | Deals 5 per player; deals replacement cards during draw |

The camera angle and overall composition match Hold'em to maintain visual consistency.

### 14.2 Draw Phase Animation

1. Dealer announces "[Player], how many cards?"
2. Player selects discards (phone) or speaks ("Draw 2")
3. Discarded cards flip face-down and slide to discard pile (0.5s)
4. New cards dealt from deck to player's position (0.5s per card)
5. Camera briefly follows card movement
6. Dealer announces "[Player] draws [N]"
7. Next player's turn

### 14.3 Controller Layout — 5-Card Draw

```
+----------------------------------+
|   [Ah] [Kd] [7s] [3c] [2h]     |  <- 5 cards, tappable during draw
|                                  |
|   Stack: $2,450  |  Pot: $850   |
|                                  |
|  -- Betting Phase --             |
|  [FOLD]   [CHECK/CALL $200]     |
|  [RAISE ---|----|----- $500]    |
|  [ALL IN $2,450]                |
|                                  |
|  -- Draw Phase --                |
|  Tap cards to discard (0-3)      |
|  [DISCARD 2 SELECTED]           |
|  [STAND PAT]                    |
|                                  |
|  [ HOLD TO SPEAK ]              |
+----------------------------------+
```

**User stories:**

- As a player, I want to see all 5 of my cards on my phone, so that I can evaluate my hand
- As a player, I want to tap cards to select them for discard during the draw phase, so that I can choose which cards to replace
- As a player, I want to speak "draw two" during my draw turn, so that I can use voice instead of touch
- As a player, I want to see how many cards each opponent drew on the TV, so that I can read their likely hand strength

**Acceptance criteria:**
- Given it is my draw turn, when I tap 2 cards on my phone, then those cards visually shift up and dim, the "Discard 2 Selected" button appears, and a counter shows "2 of 3 selected"
- Given I have selected 3 cards, when I tap a 4th card, then the system does not select it and briefly flashes a "Maximum 3" message
- Given it is not my draw turn, when I try to select cards, then nothing happens (selection is disabled)
- Given an opponent draws 3 cards, when the draw phase completes, then the TV display shows "Drew 3" next to that opponent's seat

---

# VI. Blackjack (New)

## 15. Blackjack — Game Overview

Blackjack ships with two distinct modes, selectable in the casino lobby:

| Mode | Description | Players |
|---|---|---|
| **Classic Dealer** | Standard casino blackjack: players vs AI dealer | 1–4 players, each independently vs the house |
| **Competitive** | Players compete against each other: closest to 21 wins | 2–4 players, no house dealer |

Both modes share the same card values, hand evaluation, and 3D scene, but have fundamentally different game loops.

### 15.1 Card Values

| Card | Value |
|---|---|
| 2–10 | Face value |
| J, Q, K | 10 |
| Ace | 1 or 11 (player's choice; automatically optimised) |

### 15.2 Hand Value Calculation

- Sum all card values
- Aces are counted as 11 unless that would bust (exceed 21), in which case they count as 1
- A hand with an Ace counted as 11 is "soft" (e.g., Ace + 6 = soft 17)
- A hand with all Aces counted as 1 is "hard" (e.g., Ace + 6 + King = hard 17)

### 15.3 Winning Conditions

**Blackjack (natural):** An Ace + a 10-value card (10, J, Q, K) as the initial two cards. Pays 3:2 by default (6:5 on Hard difficulty — see Section 16.6). Beats all non-blackjack 21s.

**Bust:** Hand value exceeds 21. Automatic loss.

**Push:** Player and dealer (Classic) or two competing players (Competitive) have the same hand value. Bet is returned.

---

## 16. Blackjack Classic Dealer Mode — Mechanics

### 16.1 Overview

1–4 human/bot players each play independently against an AI dealer. Each player has their own hand and bet. The dealer follows fixed rules (stands on soft 17 by default; configurable per difficulty — see difficulty presets below).

### 16.2 Shoe Configuration

| Setting | Options | Default |
|---|---|---|
| Number of decks | 1, 2, 4, 6, 8 | 6 |
| Penetration | 50%–90% (when to reshuffle) | 75% |
| Cut card | Placed at penetration depth | Yes |

Host selects deck count in the lobby. The shoe is shuffled before play and reshuffled when the cut card is reached.

**Card counting difficulty levels (configurable):**

| Difficulty | Deck Count | Penetration | Effect |
|---|---|---|---|
| Easy (counter-friendly) | 1 | 90% | Single deck, deep penetration — card counting is viable |
| Standard | 4 | 75% | Moderate shoe — typical for casual play |
| Hard (counter-hostile) | 8 | 50% | Many decks, early shuffle — card counting is nearly useless |

### 16.3 Betting

| Rule | Value |
|---|---|
| Minimum bet | 10 chips |
| Maximum bet | 500 chips (or player's wallet balance, whichever is lower) |
| Blackjack payout | 3:2 default (6:5 on Hard difficulty — see Section 16.6) |
| Insurance payout | 2:1 |
| Standard win payout | 1:1 |
| Push | Bet returned |
| Surrender refund | 50% of bet returned |

### 16.4 Player Actions

| Action | When Legal | Effect |
|---|---|---|
| **Hit** | Hand value < 21, not stood | Receive one additional card |
| **Stand** | Any time on player's turn | End turn with current hand |
| **Double Down** | Initial two cards only (before any hit) | Double bet, receive exactly one more card, then stand |
| **Split** | Initial two cards are a pair (same value) | Split into two independent hands, each with a separate bet equal to the original |
| **Insurance** | Dealer shows an Ace as upcard | Side bet of half the original bet; pays 2:1 if dealer has blackjack |
| **Surrender** | Initial two cards only, before any other action | Forfeit half the bet, hand is over |

### 16.5 Split Rules

| Rule | Setting |
|---|---|
| Max splits per hand | 3 (resulting in up to 4 hands) |
| Split Aces | Allowed; receive exactly 1 card per Ace (no further hits) |
| Split 10-value cards | Only identical (e.g., K-K yes, K-Q no) |
| Double after split | Allowed |
| Blackjack after split | Counts as 21, not blackjack (no 3:2 payout) |
| Re-split Aces | Not allowed |

### 16.6 Dealer Rules (Fixed)

The AI dealer follows strict casino rules — no decisions, no personality in play (personality is in narration only):

1. Dealer reveals hole card after all players act
2. Dealer **stands** on soft 17 by default (`dealerStandsSoft17: true`). On **Hard difficulty only**, dealer hits on soft 17 (`dealerStandsSoft17: false`).
3. Dealer stands on hard 17 or higher
4. Dealer stands on soft 18 or higher
5. Dealer hits on 16 or lower
6. If all players have busted, dealer does not draw (hand is already resolved)

**Difficulty presets** (per GDD Section 10):

| Difficulty | Deck Count | Dealer Soft 17 | Blackjack Payout | Double Down On |
|---|---|---|---|---|
| Easy | 1 | Stands | 3:2 | Any two cards |
| Standard | 4 | Stands | 3:2 | 9, 10, or 11 only |
| Hard | 8 | Hits | 6:5 | 10 or 11 only |

### 16.7 Round Resolution

1. Each player's hand is compared independently to the dealer's final hand
2. Player blackjack vs dealer blackjack = push
3. Player blackjack vs dealer non-blackjack = player wins 3:2
4. Player > dealer (both ≤ 21) = player wins 1:1
5. Player = dealer = push (bet returned)
6. Player < dealer (both ≤ 21) = player loses bet
7. Player bust = player loses bet (regardless of dealer's hand)
8. Dealer bust, player not bust = player wins 1:1

### 16.8 Edge Cases

- **Dealer blackjack with insurance:** Players who took insurance receive 2:1 on their insurance bet. All other bets are lost (unless player also has blackjack = push on main bet)
- **Multiple splits:** Each split hand is resolved independently. A player can have up to 4 hands with separate bets
- **Insufficient chips for split/double:** Action is unavailable if wallet + stack cannot cover the additional bet
- **Deck exhaustion mid-round:** With 4 players, 4 hands each (max splits), and a dealer hand, the theoretical maximum cards in a single round is ~45. With an 8-deck shoe (416 cards, Hard) or 4-deck shoe (208 cards, Standard), this is never an issue. With the 1-deck shoe (52 cards, Easy) and 4 players, exhaustion is possible but extremely unlikely. If it occurs: reshuffle discards, continue dealing

---

## 17. Blackjack Classic Dealer Mode — Phase Design

### 17.1 Phase Diagram

```
CASINO_LOBBY
  |  (host selects Blackjack Classic, min 1 player)
  v
BJ_PLACE_BETS (all players place bets simultaneously)
  |
  v
BJ_DEAL_INITIAL (2 cards per player + 2 for dealer, one face-up)
  |
  v
BJ_INSURANCE --> [dealer shows Ace] --> BJ_INSURANCE
  |                  \
  |                   +-> [dealer does not show Ace] --> skip
  v
BJ_PLAYER_TURNS (each player acts: hit/stand/double/split/surrender)
  |
  v
BJ_DEALER_TURN (dealer reveals hole card, hits per rules)
  |
  v
BJ_SETTLEMENT (compare all hands, pay/collect)
  |
  v
BJ_HAND_COMPLETE --> [check shoe penetration, reshuffle if needed] --> BJ_PLACE_BETS
```

### 17.2 Phase Descriptions

| Phase | Duration | Key Logic |
|-------|----------|-----------|
| **BJ_PLACE_BETS** | Variable (15s timeout) | All players place bets simultaneously via voice/touch; side bets placed here too |
| **BJ_DEAL_INITIAL** | ~3s | Deal 2 cards per player + 2 for dealer (one face-up, one face-down); check for dealer blackjack peek |
| **BJ_INSURANCE** | ~5s | If dealer upcard is Ace, offer insurance to all players; 5-second decision window |
| **BJ_PLAYER_TURNS** | Variable | Each player acts on their hand(s) sequentially, left to right. Actions: hit, stand, double, split, surrender |
| **BJ_DEALER_TURN** | ~2–4s | Dealer reveals hole card, hits until 17+ per fixed rules; animated card dealing |
| **BJ_SETTLEMENT** | ~3s | Compare each player's hand(s) to dealer; pay/collect; announce results via TTS |
| **BJ_HAND_COMPLETE** | ~2s | Update wallets; check shoe penetration; reshuffle animation if cut card reached; loop |

### 17.3 Betting Phase Detail

**Simultaneous betting:** Unlike poker, all players bet at the same time. Each player sees betting controls on their phone.

**Flow:**
1. Dealer announces: "Place your bets."
2. All players select bet amount (voice or phone controls)
3. 15-second timeout; players who haven't bet get the minimum bet auto-placed
4. Side bets (Perfect Pairs, 21+3) are placed here as optional additions
5. Dealer announces: "Bets are placed. [Total] on the table."

**User story:** As a player, I want to place my bet and optional side bets quickly using voice or touch, so that the round starts promptly.

**Acceptance criteria:**
- Given the betting phase, when I say "Bet 200", then 200 chips are deducted from my wallet and placed on the table
- Given the betting phase, when 15 seconds pass without me betting, then the minimum bet (10) is auto-placed
- Given I have insufficient chips for the minimum bet, then I am prompted to rebuy or sit out

### 17.4 Player Turn Detail

Each player acts on their hand(s) independently, in seat order (left to right from the dealer's perspective).

```
[Set Current Player = Seat 1]
  |
  v
[Dealer: "[Player], your cards: [hand]. What would you like to do?"]
  |
  v
[Player acts: Hit / Stand / Double / Split / Surrender]
  |
  v
[If Hit and hand < 21: offer another action]
[If Hit and hand = 21: auto-stand]
[If Hit and hand > 21: bust, move to next player]
[If Stand / Double / Surrender: move to next player]
[If Split: create second hand, act on first hand, then second]
  |
  v
[All players acted?] --> [Dealer turn]
```

---

## 18. Blackjack Classic Dealer Mode — Side Bets & Insurance

### 18.1 Side Bets

Side bets are optional wagers placed during the betting phase, in addition to the main bet.

#### Perfect Pairs

| Outcome | Payout | Description |
|---|---|---|
| Perfect Pair | 25:1 | Same rank and same suit (e.g., Ace of Spades + Ace of Spades — only possible with multi-deck shoe) |
| Coloured Pair | 12:1 | Same rank and same colour but different suit (e.g., 7 of Hearts + 7 of Diamonds) |
| Mixed Pair | 5:1 | Same rank, different colour (e.g., King of Clubs + King of Hearts) |
| No Pair | Lose | Initial two cards are not a pair |

**Minimum side bet:** 5 chips. **Maximum side bet:** 500 chips.

#### 21+3

Combines the player's initial 2 cards with the dealer's upcard to form a 3-card poker hand:

| Outcome | Payout | Description |
|---|---|---|
| Suited Three of a Kind | 100:1 | Three cards of the same rank and suit (multi-deck only) |
| Straight Flush | 40:1 | Three consecutive cards of the same suit |
| Three of a Kind | 30:1 | Three cards of the same rank |
| Straight | 10:1 | Three consecutive cards, mixed suits |
| Flush | 5:1 | Three cards of the same suit, not consecutive |
| No Match | Lose | None of the above |

**Minimum side bet:** 5 chips. **Maximum side bet:** 500 chips.

### 18.2 Insurance

- Offered when dealer's upcard is an Ace
- Insurance bet = up to half the main bet
- If dealer has blackjack: insurance pays 2:1
- If dealer does not have blackjack: insurance bet is lost, play continues normally
- Players have 5 seconds to decide; default is no insurance

**User story:** As a player, I want the option to take insurance when the dealer shows an Ace, so that I can protect my bet against a dealer blackjack.

**Acceptance criteria:**
- Given the dealer's upcard is an Ace, when the insurance phase begins, then each player sees "Insurance? Yes/No" on their phone with a 5-second timer
- Given I say "Insurance", then half my main bet is placed as an insurance wager
- Given I say "No insurance" or the timer expires, then no insurance bet is placed
- Given the dealer has blackjack and I took insurance, then I receive 2:1 on my insurance bet and lose my main bet (net break-even)

**Analytics events:**
- `blackjack.side_bet_placed` — `{ type: 'perfect_pairs' | '21+3', amount, playerId }`
- `blackjack.side_bet_result` — `{ type, outcome, payout, playerId }`
- `blackjack.insurance_taken` — `{ playerId, amount }`
- `blackjack.insurance_result` — `{ playerId, dealerHadBlackjack, payout }`

---

## 19. Blackjack Competitive Variant — Mechanics

### 19.1 Overview

In the Competitive variant, there is no AI dealer hand. Players compete against each other: the player closest to 21 without busting wins the round's pot.

### 19.2 How It Differs from Classic

| Aspect | Classic Dealer | Competitive |
|---|---|---|
| Opponent | AI dealer (fixed rules) | Other players |
| Betting | Each player bets against the house | All bets go into a pot; winner takes the pot |
| Bust | Lose to house | Bust = out of the round; if all bust, lowest hand value wins |
| Side bets | Perfect Pairs, 21+3 | Not available |
| Insurance | Available | Not available (no dealer hand) |
| Split | Available | **Not allowed** (keeps it simple and fair for v1) |
| Surrender | Available | Not available (you're competing, not insuring) |
| Payout | 1:1, 3:2, 2:1 | Winner takes pot |

### 19.3 Round Flow

1. All players ante (fixed amount based on blind level)
2. All players receive 2 cards each (no dealer hand)
3. Each player acts: Hit, Stand, or Double Down (no splits in Competitive)
4. After all players act, hands are revealed
5. Player closest to 21 without busting wins the pot
6. Ties: pot is split equally

### 19.4 Competitive Betting

| Rule | Value |
|---|---|
| Ante | Equal to one big blind (selected in lobby) |
| Optional raise before cards | After seeing initial 2 cards, players can raise the pot (one raise per player, up to 3x ante) |
| Pot | Sum of all antes + raises |
| Winner | Highest hand ≤ 21; ties split |
| All bust | Lowest hand value wins (closest to 21 while over). If tied, split pot |

### 19.5 All-Bust Rule

If every player busts, the "least bust" player wins. The player with the lowest hand value (closest to 21 from above) takes the pot. If tied, the pot is split.

**Example:** Player A has 24, Player B has 27, Player C has 22. Player C wins (closest to 21 from above).

### 19.6 Edge Cases

- **One player remaining (all others bust):** That player wins regardless of their hand value
- **All players stand on low values:** The highest hand wins even if it's a 12
- **Splits:** Not allowed in Competitive mode (deferred to v2 if needed)

**User story:** As a competitive blackjack player, I want to see all other players' hands at showdown, so that I know who won and can learn from their decisions.

**Acceptance criteria:**
- Given a competitive round where all players have acted, when showdown occurs, then all hands are revealed simultaneously on the TV display
- Given Player A has 20 and Player B has 21 (not blackjack), when resolution occurs, then Player B wins the pot and the dealer announces "Player B wins with 21!"
- Given all players bust, when resolution occurs, then the player with the lowest value wins and the dealer announces "Everyone busted! Player C takes it with 22 — closest to 21."

---

## 20. Blackjack Competitive Variant — Phase Design

### 20.1 Phase Diagram

```
CASINO_LOBBY
  |  (host selects Blackjack Competitive, min 2 players)
  v
BJC_PLACE_BETS (all players post ante)
  |
  v
BJC_DEAL_INITIAL (2 cards per player, no dealer hand)
  |
  v
BJC_PLAYER_TURNS (each player: hit/stand/double/split)
  |
  v
BJC_SHOWDOWN (reveal all hands)
  |
  v
BJC_SETTLEMENT (determine winner, distribute pot)
  |
  v
BJC_HAND_COMPLETE --> BJC_PLACE_BETS
```

### 20.2 Phase Descriptions

| Phase | Duration | Key Logic |
|-------|----------|-----------|
| **BJC_PLACE_BETS** | ~2s | Auto-post ante from each player's wallet |
| **BJC_DEAL_INITIAL** | ~2s | Deal 2 cards per player; no dealer cards |
| **BJC_PLAYER_TURNS** | Variable | Each player: hit/stand/double (no splits). **Sequential, left-to-right** for v1. Simultaneous play deferred to v2. |
| **BJC_SHOWDOWN** | ~2s | All hands revealed on TV |
| **BJC_SETTLEMENT** | ~3s | Determine winner; distribute pot; announce via TTS |
| **BJC_HAND_COMPLETE** | ~2s | Update wallets; loop |

---

## 21. Blackjack — Voice Commands

### 21.1 Blackjack-Specific Commands

| Intent | Canonical Form | When Legal | Dealer Response |
|---|---|---|---|
| Hit | "Hit" / "Hit me" | Player's turn, hand < 21 | "[Player] hits. [Card]. [Total]." |
| Stand | "Stand" / "Stay" | Player's turn | "[Player] stands on [total]." |
| Double Down | "Double down" / "Double" | Initial 2 cards only | "[Player] doubles down. [Card]. [Total]." |
| Split | "Split" | Initial 2 cards are a pair | "[Player] splits. Playing first hand..." |
| Insurance | "Insurance" / "Yes" | Insurance offer (dealer shows Ace) | "[Player] takes insurance." |
| No Insurance | "No" / "No insurance" | Insurance offer | "[Player] passes on insurance." |
| Surrender | "Surrender" / "Give up" | Initial 2 cards, Classic mode only | "[Player] surrenders. Half the bet returned." |
| Bet amount | "Bet [amount]" | Betting phase | "[Player] bets [amount]." |
| Side bet | "Perfect Pairs [amount]" / "21+3 [amount]" | Betting phase, Classic mode | "[Player] places [side bet type] for [amount]." |
| Raise (Competitive) | "Raise [amount]" / "Raise" | Raise round, Competitive mode | "[Player] raises [amount]." |

### 21.2 Natural Language Variations

- **Hit:** "Hit me", "Another card", "One more", "Card", "Hit"
- **Stand:** "Stand", "Stay", "I'm good", "That's enough", "Hold"
- **Double:** "Double down", "Double", "Double it"
- **Split:** "Split", "Split them", "Split the pair"
- **Insurance:** "Insurance", "Take insurance", "Insure", "Yes" (during insurance offer)
- **Surrender:** "Surrender", "Give up", "I surrender"

### 21.3 Slot Maps

```typescript
const blackjackBettingSlotMap = [
  'bet', 'hundred', 'thousand', 'fifty', 'twenty',
  'perfect pairs', '21 plus 3', 'side bet',
  'minimum', 'maximum', 'same bet', 'double bet'
]

const blackjackPlaySlotMap = [
  'hit', 'hit me', 'stand', 'stay', 'double', 'double down',
  'split', 'insurance', 'no insurance', 'surrender',
  'another card', 'one more', 'enough', 'hold'
]
```

### 21.4 Informational Commands (Blackjack-Specific)

| Intent | Phrases | Response |
|---|---|---|
| Card count (shoe remaining) | "How many cards left?" | Dealer announces approximate cards remaining in shoe |
| My hand total | "What do I have?" | Dealer reads hand value: "You have a soft 17" |
| Dealer upcard | "What's the dealer showing?" | Dealer repeats upcard: "I'm showing a 7" |
| Odds reminder | "Should I hit?" | Dealer: "I can't advise, but basic strategy says..." (educational mode only, configurable) |

**Analytics events:**
- `blackjack.action` — `{ action, playerId, handValue, dealerUpcard, handIndex }`
- `blackjack.round_result` — `{ playerId, result: 'win'|'lose'|'push'|'blackjack'|'bust', payout }`
- `blackjack.shoe_reshuffled` — `{ roundNumber, cardsDealt }`

**Accessibility:**
- All voice commands have touch equivalents on controller
- Hand totals announced verbally and displayed with large text
- Card suits announced with name, not just colour ("Ace of Spades", not "black Ace")

---

## 22. Blackjack — Display & Controller UX

### 22.1 3D Scene — Blackjack

The blackjack scene is a separate 3D environment (not the poker room). A semicircular blackjack table with 4 player positions facing the dealer.

**Key 3D elements:**
- Semicircular blackjack table with green felt and mahogany rail
- 1–4 player positions arranged in an arc
- Dealer position at the straight edge
- Card shoe to dealer's left
- Chip tray in front of dealer
- Player betting circles (brass inlay on felt)
- Discard tray
- Same room environment (dark wood panelling, pendant lights, premium aesthetic)
- Dealer avatar behind the table (upper body, blackjack-specific characters)

### 22.2 Table Layout (Top-Down)

```
            DEALER
     [Shoe]  |  [Discard]
    _________|_________
   /  P1  P2  P3  P4  \
  /    O   O   O   O    \
 |   Cards displayed     |
 |   in front of each    |
 |   player position     |
  \______________________/
```

### 22.3 Card Display — Classic Mode

| Element | Display |
|---|---|
| Player cards | Face-up, fanned slightly, in front of player position |
| Dealer upcard | Face-up, prominently displayed |
| Dealer hole card | Face-down until dealer turn; flip animation on reveal |
| Split hands | Two fans of cards side by side; active hand highlighted |
| Bust indicator | Cards cross-faded with red X overlay; "BUST" text |
| Blackjack indicator | Cards glow gold; "BLACKJACK!" text with sparkle effect |

### 22.4 Controller Layout — Blackjack Classic

```
+----------------------------------+
|   [Ah] [Kd]     Hand: 21        |
|                  BLACKJACK!      |
|                                  |
|   Bet: $200  |  Wallet: $4,800  |
|   Dealer shows: 7               |
|                                  |
|  [HIT]     [STAND]              |
|  [DOUBLE DOWN]   [SPLIT]        |
|  [SURRENDER]                    |
|                                  |
|  Side bets: None                |
|                                  |
|  [ HOLD TO SPEAK ]              |
+----------------------------------+
```

- Only legal actions are shown (e.g., Split only visible with a pair; Double only on first two cards)
- Split hands shown as tabs ("Hand 1" / "Hand 2") with active hand highlighted
- Insurance prompt overlays when dealer shows Ace

### 22.5 Controller Layout — Blackjack Competitive

```
+----------------------------------+
|   [Ah] [Kd]     Hand: 21        |
|                  BLACKJACK!      |
|                                  |
|   Pot: $800  |  Wallet: $4,800  |
|   Your ante: $200               |
|                                  |
|  [HIT]     [STAND]              |
|  [DOUBLE DOWN]                  |
|                                  |
|  [ HOLD TO SPEAK ]              |
+----------------------------------+
```

No splits, no surrender, no insurance, no side bets in Competitive mode.

### 22.6 Scene Budget — Blackjack

| Metric | Target |
|---|---|
| Additional triangles (over poker scene) | ~15,000 |
| Additional assets | Semicircular table, card shoe, chip tray, discard tray, betting circles |
| Shared assets | Room environment, lighting, chairs, atmospheric effects |
| Total scene (blackjack) | < 80,000 triangles |

**User stories:**

- As a player, I want to see my cards and the dealer's upcard on the TV, so that I can make informed decisions
- As a player, I want to see my hand total calculated automatically on my phone, so that I don't have to do mental arithmetic
- As a player, I want to see a clear animation when the dealer reveals their hole card, so that the suspense feels authentic
- As a player with split hands, I want to see both hands clearly separated on my phone, so that I can act on the correct hand

**Acceptance criteria:**
- Given a Classic Blackjack round where I have an Ace and a King, then my phone displays "21 — BLACKJACK!" with gold highlighting
- Given I have split into 2 hands, then my phone shows two tabs ("Hand 1: 14" / "Hand 2: 8") and the active hand's tab is highlighted
- Given the dealer's turn, when the hole card is revealed, then a flip animation plays on the TV (duration 0.8s) and the dealer announces the card

### 22.6 Blackjack AI Bots

Blackjack bot strategy follows the same hybrid architecture as poker bots (rules engine for Easy, basic strategy for Standard, enhanced for Hard). Bot difficulty names align with the game difficulty presets (Easy/Standard/Hard).

| Difficulty | Decision Strategy | Bet Sizing | Card Counting |
|---|---|---|---|
| **Easy** | Basic strategy with ~20% random mistakes (e.g., hitting on 17, standing on 12 vs dealer 6) | Flat bet (minimum) | No |
| **Standard** | Perfect basic strategy table — mathematically optimal play for every hand vs dealer upcard | Flat bet with occasional 2x increases on "hot streaks" (cosmetic, not strategic) | No |
| **Hard** | Perfect basic strategy + card counting influence. Hi-Lo running count affects bet sizing (not play deviations in v1). | Proportional to true count: 1x (TC <= 1), 2x (TC 2-3), 4x (TC 4+), minimum (TC < 0) | Yes (Hi-Lo) |

**Basic strategy table:** The canonical chart covering hard totals, soft totals, and pairs vs all dealer upcards. Hit, Stand, Double, Split, Surrender decisions. Implemented as a lookup table, not heuristics.

**Side bet participation:** Easy/Standard bots do not place side bets. Hard bots place side bets at a configurable frequency (default 15% of rounds).

**Competitive blackjack bots:** Same decision strategy as Classic. Raise-round strategy: Easy bots always check; Standard bots raise with 19+; Hard bots raise based on hand strength relative to remaining players (if they can see their hand is strong).

---

## 23. Blackjack — Dealer Characters

### 23.1 Blackjack Dealer Roster

Blackjack gets its own set of dealer characters that are thematically distinct from the poker dealers. These dealers specialise in blackjack commentary, shoe management, and the specific rhythm of blackjack play. See GDD Section 17 for full voice line tables per category.

| Dealer | Personality | Voice | Catchphrase | Example Line |
|---|---|---|---|---|
| **"Ace" Malone** | Smooth, old-school Vegas. Think a young Dean Martin behind the table. Charming, slightly cocky, always professional. | Warm baritone, measured pace, occasional playful inflection | "Let's see what the shoe has to say." | "Twenty-one on the nose! Beautiful hand." |
| **Scarlett Vega** | Sharp, witty, slightly intimidating. Seen everything and isn't easily impressed. Respects good strategy, amused by bad plays. | Crisp alto, quick delivery, dry humour | "The house always has an opinion." | "Hit on sixteen? Bold. Wrong, but bold." |
| **Chip Dubois** | Enthusiastic, over-the-top, makes beginners feel welcome. Every hand is exciting. Every outcome deserves a reaction. | Upbeat tenor, energetic pace, genuine warmth | "Every card is a new adventure!" | "BLACKJACK! Oh that is beautiful! Three-to-two, coming your way!" |

### 23.2 Personality Calibration

Same `DealerPersonality` interface as poker dealers (Weekend Poker PRD Section 9.2). Each blackjack dealer has blackjack-specific lines:

```typescript
interface BlackjackDealerPersonality extends DealerPersonality {
  shoeComment: string[]       // "Fresh shoe. Let's go."
  bustReaction: string[]      // "Ooh, that's a bust." / "Over the line."
  blackjackCall: string[]     // "Blackjack!" / "Natural 21!"
  pushComment: string[]       // "Push. Nobody wins, nobody loses."
  insuranceOffer: string[]    // "Insurance, anyone?" / "Ace showing. Protect your bets?"
  splitComment: string[]      // "Splitting the pair. Brave choice."
  doubleDownComment: string[] // "Doubling down. All or nothing."
}
```

### 23.3 Dealer Availability by Game

| Dealer | Hold'em | 5-Card Draw | Blackjack Classic | Blackjack Competitive |
|---|---|---|---|---|
| Vincent | Yes | Yes | No | No |
| Maya | Yes | Yes | No | No |
| Remy | Yes | Yes | No | No |
| Jade | Yes | Yes | No | No |
| "Ace" Malone | No | No | Yes | Yes (cosmetic only) |
| Scarlett Vega | No | No | Yes | Yes (cosmetic only) |
| Chip Dubois | No | No | Yes | Yes (cosmetic only) |

```typescript
export const BLACKJACK_DEALER_CHARACTERS = ['ace_malone', 'scarlett_vega', 'chip_dubois'] as const
export type BlackjackDealerCharacter = typeof BLACKJACK_DEALER_CHARACTERS[number]
```

When the host switches between poker and blackjack, the dealer selection resets and the host must pick from the appropriate roster. In Competitive Blackjack, the dealer is cosmetic only (no dealer hand) but still provides commentary via TTS.

---

# VII. Cross-Game Systems

## 24. Shared Player Wallet

### 24.1 Design

Each player has a single wallet that persists across all games within a session. Chips won in Hold'em can be wagered in Blackjack.

```typescript
interface PlayerWallet {
  playerId: string
  balance: number       // current available balance (not in play)
  totalBuyIn: number    // total chips bought/rebought this session
  inPlay: number        // chips currently committed to an active game
  netResult: number     // running profit/loss (balance + inPlay - totalBuyIn)
}
```

### 24.2 Wallet Operations

| Operation | Trigger | Effect |
|---|---|---|
| **Initial buy-in** | Player joins session | Wallet balance set to starting amount (configurable: 1,000–50,000; default 10,000) |
| **Game buy-in** | Game starts or player re-enters | Balance deducted by buy-in amount; transferred to game stack |
| **Cash out** | Game ends or game switch | Game stack returned to wallet balance |
| **Rebuy** | Between hands (poker) or between rounds (blackjack) | Wallet balance deducted; added to game stack. If wallet is empty, rebuy from "the house" (unlimited rebuys for v1 — session is for fun, not profit) |
| **Win/Loss** | Hand/round completes | Game stack increases or decreases; wallet balance unchanged until cash-out |
| **Session end** | Host ends session | Final wallet balance used for session summary |

### 24.3 Unlimited Rebuys

For v1, rebuys are unlimited. If a player's wallet reaches zero and their game stack is also zero, they are automatically offered a rebuy at the default amount. This is a social game — nobody gets eliminated permanently.

**User story:** As a player who has lost all my chips in Hold'em, I want to rebuy and keep playing, so that I'm not excluded from game night.

**Acceptance criteria:**
- Given a player with wallet balance 0 and game stack 0, when a new hand/round begins, then the system automatically offers a rebuy prompt on their phone
- Given a player accepts a rebuy, then their wallet is credited with the default buy-in amount and they are dealt into the next hand/round
- Given a player declines a rebuy, then they sit out and watch (spectator mode) until they choose to rebuy

### 24.4 Wallet Display

| Location | What's Shown |
|---|---|
| Phone (in-game) | Game stack + "(Wallet: $X)" below |
| Phone (lobby) | Wallet balance prominently displayed |
| TV (in-game) | Player's game stack only (not wallet) |
| TV (lobby) | Each player's wallet balance next to their name |
| Session summary | Net result (profit/loss) per player |

**Analytics events:**
- `wallet.rebuy` — `{ playerId, amount, rebuyCount, gameType }`
- `wallet.game_buyin` — `{ playerId, amount, gameType }`
- `wallet.game_cashout` — `{ playerId, amount, gameType, netResult }`

---

## 25. Cross-Game Session Statistics

### 25.1 Tracked Statistics

| Statistic | Scope | Description |
|---|---|---|
| **Net result** | Session | Total profit/loss across all games |
| **Hands played** | Per game | Count of hands/rounds completed |
| **Win rate** | Per game | Percentage of hands/rounds won |
| **Best hand** | Per game | Strongest winning hand |
| **Biggest pot won** | Per game | Largest single pot/payout |
| **Time played** | Per game | Duration spent in each game |
| **Games played** | Session | List of games played with time in each |
| **Largest winning streak** | Per game | Consecutive hands/rounds won |
| **Blackjack count** | Blackjack only | Natural 21s dealt |
| **Splits made** | Blackjack only | Number of times player split |
| **Draws taken** | 5-Card Draw only | Total cards drawn across all hands |
| **Stood pat count** | 5-Card Draw only | Number of hands where player kept all 5 |

### 25.2 Session Summary — Multi-Game

When the host ends the session, the summary screen shows:

**TV Display:**
- Overall leaderboard ranked by net result
- Per-game breakdown (time in each game, hands played, win rate)
- Highlight reel across games: "Luckiest Player" (highest win rate), "High Roller" (most chips wagered), "Comeback King" (biggest negative-to-positive swing)
- Total session duration

**Phone Controller:**
- Personal net result across all games
- Per-game results (Hold'em P/L, 5-Card Draw P/L, Blackjack P/L)
- Personal best moment (biggest single win, across all games)
- "Play Again" button

**User story:** As a player, I want to see my results broken down by game type at the end of the session, so that I know which games I did well in.

**Acceptance criteria:**
- Given a session where I played Hold'em and Blackjack, when the session ends, then my phone shows separate net results for each game and an overall total
- Given a session with 4 players, when the session ends, then the TV shows a leaderboard ranked by overall net result with per-game breakdowns

**Analytics events:**
- `session.ended` — `{ sessionId, duration, playerCount, gamesPlayed: CasinoGame[], totalHands }`
- `session.player_result` — `{ playerId, netResult, gamesPlayed, timePerGame }`

---

## 26. Dealer System Extensions

### 26.1 Game-Specific Announcements

Each game type requires unique dealer announcements beyond the shared set:

**5-Card Draw additions:**

| Event | Dealer Says |
|---|---|
| Draw phase start | "Draw time. [Player], how many cards?" |
| Player draws N | "[Player] draws [N]." |
| Player stands pat | "[Player] stands pat." |
| Draw complete | "All players have drawn. [First to act], it's on you." |

**Blackjack Classic additions:**

| Event | Dealer Says |
|---|---|
| Betting open | "Place your bets." |
| Bets closed | "No more bets." |
| Player hand total | "That gives you [total]." |
| Bust | "[Player] busts with [total]." |
| Blackjack | "Blackjack! [Player] has a natural." |
| Dealer reveal | "Dealer has [total]." |
| Push | "Push with [Player]. Bet returned." |
| Insurance offer | "Insurance? Dealer is showing an Ace." |
| Shoe reshuffle | "Shuffling the shoe." |

**Blackjack Competitive additions:**

| Event | Dealer Says |
|---|---|
| Showdown | "Let's see what everyone has." |
| Winner | "[Player] wins with [total]! Takes the pot of [amount]." |
| All bust | "Everyone busted! [Player] wins with [total] — closest to 21." |
| Tie | "It's a tie between [Player A] and [Player B]. Pot is split." |

### 26.2 Bot Chat — Blackjack

Blackjack bots have game-specific chat:

| Event | Example (Easy Bot) | Example (Hard Bot) |
|---|---|---|
| Getting blackjack | "Woohoo! Twenty-one!" | "Natural." |
| Busting | "Oh no, too many!" | — (silence) |
| Winning | "I can't believe it!" | "As expected." |
| Splitting | "Ooh, two chances!" | "Splitting here." |
| Seeing dealer bust | "Lucky us!" | "House always loses eventually." |

---

# VIII. Technical Architecture

## 27. Multi-Ruleset Architecture

### 27.1 Design Principle

A single VGF server instance serves all game types via **one expanded `GameRuleset`** with phase namespaces. VGF sessions are 1:1 with rulesets — you cannot swap rulesets mid-session. Therefore, all four games' phases, reducers, and thunks are registered in a single `GameRuleset<CasinoGameState>` with underscore-prefixed phase names to prevent collisions.

> **Note:** This follows the GDD's architecture (Section 3), which explicitly rejects a `GameRulesetRegistry` approach. The single-ruleset design is a VGF framework constraint.

### 27.2 Single Ruleset Structure

```typescript
// One ruleset containing all games
const casinoRuleset: GameRuleset<CasinoGameState> = {
  setup: () => initialCasinoState(),
  reducers: { ...sharedReducers },
  thunks: { ...sharedThunks },
  phases: {
    // Casino top-level
    LOBBY: { ... },
    GAME_SELECT: { ... },
    // Hold'em (unprefixed — backwards compatible with existing code)
    POSTING_BLINDS: { ... },
    PRE_FLOP_BETTING: { ... },
    // 5-Card Draw (DRAW_ prefix)
    DRAW_POSTING_BLINDS: { ... },
    DRAW_DEALING: { ... },
    // Blackjack Classic (BJ_ prefix)
    BJ_PLACE_BETS: { ... },
    BJ_DEAL_INITIAL: { ... },
    // Blackjack Competitive (BJC_ prefix)
    BJC_PLACE_BETS: { ... },
    BJC_DEAL_INITIAL: { ... },
  },
  onConnect: casinoOnConnect,
  onDisconnect: casinoOnDisconnect,
}
```

### 27.3 Game Switching (Within Single Ruleset)

When the host selects a game in the casino lobby:

1. Current game's phase `onEnd` hooks fire (clean up game-specific state)
2. `CasinoGameState.selectedGame` is set to the new game
3. Phase transitions to the new game's entry phase (e.g., `DRAW_POSTING_BLINDS`, `BJ_PLACE_BETS`)
4. New game's phase `onBegin` hooks fire, initialising game-specific state
5. Display client loads the appropriate 3D scene
6. Controller client reconfigures UI for the new game type

### 27.4 Phase Namespacing

All game-specific phases use underscore-prefixed names to prevent collisions within the single ruleset:

| Game | Prefix | Example Phases |
|---|---|---|
| Casino (top-level) | None | `LOBBY`, `GAME_SELECT`, `SESSION_SUMMARY` |
| Texas Hold'em | None (unprefixed, backwards compatible) | `POSTING_BLINDS`, `PRE_FLOP_BETTING`, `SHOWDOWN` |
| 5-Card Draw | `DRAW_` | `DRAW_POSTING_BLINDS`, `DRAW_DEALING`, `DRAW_DRAW_PHASE` |
| Blackjack Classic | `BJ_` | `BJ_PLACE_BETS`, `BJ_DEAL_INITIAL`, `BJ_PLAYER_TURNS` |
| Blackjack Competitive | `BJC_` | `BJC_PLACE_BETS`, `BJC_DEAL_INITIAL`, `BJC_SHOWDOWN` |

Hold'em phases remain unprefixed for backwards compatibility with the existing codebase. All new games use underscore prefixes. Phase names are `UPPER_SNAKE_CASE` strings, matching VGF's string enum convention.

### 27.5 Shared Reducers and Thunks

| Reducer/Thunk | Scope | Description |
|---|---|---|
| `updateWallet` | Global | Modify player wallet balance |
| `switchGame` | Global | Transition from one game to another |
| `processVoiceCommand` | Global (with game-specific delegates) | Parse voice intent, delegate to active game's handler |
| `addBot` / `removeBot` | Global | Bot management |
| `updateSessionStats` | Global | Record game results in cross-game stats |

Game-specific reducers and thunks are registered in each game's ruleset and only active during that game's phases.

---

## 28. State Management — Multi-Game

### 28.1 State Hierarchy

`CasinoGameState` is a **flat shared base type** — it does NOT extend `PokerGameState`. Extending `PokerGameState` would force every game to carry poker-specific fields (`communityCards`, `sidePots`, `minRaiseIncrement`, etc.) that are meaningless in blackjack. Instead, all game-specific fields are isolated in optional sub-objects, including Hold'em (see GDD Section 3, fix C6).

```
CasinoGameState (flat shared base — no game-specific fields at root)
├── phase: CasinoPhase
├── selectedGame: CasinoGame | null
├── gameChangeRequested: boolean               // host-initiated game switch flag
├── wallet: Record<string, number>        // playerId -> balance (cross-game)
├── players: CasinoPlayer[]               // shared player roster
├── dealerCharacterId: string
├── blindLevel: BlindLevel
├── handNumber: number
├── dealerIndex: number
├── sessionStats: SessionStats
├── videoPlayback?: VideoPlayback          // see Section 36.4
├── holdem?: HoldemState                   // present when selectedGame = 'holdem'
├── fiveCardDraw?: FiveCardDrawState       // present when selectedGame = 'five_card_draw'
├── blackjack?: BlackjackState             // present when selectedGame = 'blackjack_classic'
└── blackjackCompetitive?: BlackjackCompetitiveState  // present when selectedGame = 'blackjack_competitive'
```

**Hold'em state is now a sub-object** (`holdem?: HoldemState`), not root-level fields. The existing `PokerGameState` interface is preserved in `@weekend-poker/shared` for backwards compatibility — a `toHoldemState(pokerGameState)` adapter handles migration. `HoldemState` contains: `players: HoldemPlayerState[]`, `communityCards`, `pot`, `sidePots`, `currentBet`, `minRaiseIncrement`, `activePlayerIndex`, `holeCards: Record<string, [Card, Card]>`, `handHistory`, `lastAggressor`, `dealingComplete`.

Each game's sub-state is initialised when entering that game's first phase and cleared when leaving. This keeps the broadcast state small and prevents stale data from one game leaking into another.

### 28.1a Wallet Sync Points

The `wallet: Record<string, number>` field is the cross-game balance. During active gameplay, the game sub-state's balance fields are the live values. The root `wallet` is a snapshot that syncs at exactly 3 points (see GDD Section 4, fix M1):

| Sync Point | When | What Happens |
|---|---|---|
| **1 — Game Start** | Entering a game's first phase (`onBegin` of `POSTING_BLINDS`, `DRAW_POSTING_BLINDS`, `BJ_PLACE_BETS`, `BJC_PLACE_BETS`) | Read `wallet[playerId]`, fund game-local balance. Wallet is NOT deducted — game reducers track in-game flow. |
| **2 — Hand/Round End** | `*_HAND_COMPLETE.onEnd` | Calculate net result per player. Apply delta via root `updateWallet` reducer. Clear game-specific balance fields. |
| **3 — Game Switch** | Exiting to `GAME_SELECT` | Same as Sync Point 2 (settle in-progress state), then clear the game sub-state entirely. |

**Single source of truth rule:** Controller displays `wallet[playerId]` between hands and the game-local balance during hands.

### 28.1b Server-Side State (ServerGameState)

Private state that is NOT broadcast to clients via VGF state sync. Replaces the poker-only `ServerHandState`. Stored in-memory (`Map<sessionId, ServerGameState>`), backed by Redis in production.

```typescript
interface ServerGameState {
  selectedGame: CasinoGame | null
  holdem?: ServerHoldemState        // deck, hole cards (unchanged from existing ServerHandState)
  draw?: ServerDrawState            // deck, hole cards (5-card hands)
  blackjack?: ServerBlackjackState  // shoe (full card array)
  blackjackCompetitive?: ServerBlackjackCompetitiveState  // shoe + hidden player hole cards
}
```

**Migration:** Existing `getServerHandState`/`setServerHandState` functions are preserved with deprecation warnings — they delegate to `ServerGameState.holdem` internally.

### 28.2 Blackjack-Specific State

```typescript
interface BlackjackState {
  shoeSize: number                // broadcast: cards remaining (approximate, for display)
  deckCount: number               // 1-8
  penetration: number             // 0.5-0.9
  dealerHand: BlackjackHand
  playerHands: BlackjackPlayerHand[]  // 1 per player, may have split hands
  roundPhase: BlackjackClassicPhase
  bettingTimeRemaining: number
  insuranceOffered: boolean
  handCompleteReady: boolean
}
```

**Note:** Shoe card array and discard pile are stored server-side in `ServerGameState.blackjack` (see Section 28.1b), never broadcast. The client only sees `shoeSize`.

```typescript

interface BlackjackHand {
  cards: Card[]
  value: number                   // best non-bust value
  isSoft: boolean
  isBlackjack: boolean
  isBust: boolean
  holeCardRevealed: boolean       // false until dealer turn
}

interface BlackjackPlayerHand {
  playerId: string
  hands: BlackjackHandSlot[]      // 1-4 (after splits)
  activeHandIndex: number
  insuranceBet: number
  sideBets: SideBet[]
}

interface BlackjackHandSlot {
  cards: Card[]
  value: number
  isSoft: boolean
  isBlackjack: boolean
  isBust: boolean
  bet: number
  isDoubledDown: boolean
  isStood: boolean
  result?: 'win' | 'lose' | 'push' | 'blackjack' | 'surrender'
  payout?: number
}

interface SideBet {
  type: 'perfect_pairs' | '21+3'
  amount: number
  result?: string
  payout?: number
}
```

**Note on `availableActions`:** Available player actions (hit, stand, double down, split, surrender, insurance) are **computed on the controller, never stored in state** (see GDD fix M2). A pure function `getAvailableBlackjackActions(hand, config, playerWallet, handCount)` derives available actions from the hand's current state. Storing derived data in VGF state creates stale data risk and violates server-authoritative principles.

### 28.3 5-Card Draw-Specific State

```typescript
interface FiveCardDrawState {
  holeCards: Record<string, Card[]>  // playerId -> 5-card hand (broadcast to all after showdown; private during play via ServerGameState.draw)
  players: DrawPlayerState[]
  pot: number
  sidePots: SidePot[]
  currentBet: number
  activePlayerIndex: number
  drawPhaseActive: boolean
  currentDrawPlayerIndex: number
  dealingComplete: boolean
  handCompleteReady: boolean
}

interface DrawPlayerState {
  playerId: string
  stack: number                       // game-local balance (synced from wallet at game start)
  bet: number
  status: PlayerStatus
  lastAction: PlayerAction | null
  discardedCards: Card[]              // cards discarded this hand (for display)
  drawCount: number                   // how many cards drawn (visible to all)
  drawConfirmed: boolean
}
```

**Note:** Deck and discard pile are stored server-side in `ServerGameState.draw` (see Section 28.1b), never broadcast to clients. Hold'em-shared fields (`dealerIndex`, `blindLevel`, `handNumber`, `dealerCharacterId`) are on the root `CasinoGameState`, not duplicated here.

---

## 29. Controller Adaptation Layer

### 29.1 Design

The phone controller renders different UIs based on the active game type. A single React app with game-specific components that mount/unmount based on `selectedGame`.

### 29.2 Component Structure

```
ControllerApp
├── CasinoLobbyUI (when selectedGame is null)
├── HoldemControllerUI (when selectedGame = 'holdem')
├── FiveCardDrawControllerUI (when selectedGame = 'five_card_draw')
│   └── DrawPhaseUI (card selection for draw)
├── BlackjackClassicControllerUI (when selectedGame = 'blackjack_classic')
│   ├── BettingUI (bet + side bets)
│   ├── InsuranceUI (overlay during insurance offer)
│   └── SplitHandsUI (tab-based hand navigation)
└── BlackjackCompetitiveControllerUI (when selectedGame = 'blackjack_competitive')
    ├── BettingUI (ante + raise)
    └── SplitHandsUI
```

### 29.3 Shared Controller Components

| Component | Used By | Purpose |
|---|---|---|
| VoiceButton | All games | Push-to-talk with real-time transcript |
| CardDisplay | All games | Renders N cards with consistent styling |
| ChipDisplay | All games | Shows stack/wallet with denomination breakdown |
| TimerBar | All games | Visual countdown for action timers |
| StatusBar | All games | Game name, pot/wallet, turn indicator |

---

## 30. Performance Considerations

### 30.1 Shoe State (Blackjack)

The shoe (up to 416 cards with 8 decks) is server-only state. It is never broadcast to clients. Clients receive only:
- `shoeSize: number` — approximate cards remaining
- Cards as they are dealt (added to hand state)

This prevents:
- Unnecessarily large state broadcasts
- Client-side card counting assistance

### 30.2 Split Hands State Size

A player can have up to 4 hands after splits. With 4 players, that's 16 active hands. Each hand has 2–11 cards. Maximum state for a single round:

- 16 hands x 11 cards max = 176 card objects
- Each card: ~20 bytes (rank + suit + value)
- Total: ~3.5 KB — negligible

### 30.3 Scene Loading

Each game has a separate 3D scene. When switching games:

1. Current scene unmounts (React Three Fiber handles cleanup)
2. Transition video plays full-screen (3–4s) — covers the scene swap (see Section 35.3)
3. New scene mounts and assets load behind the video
4. Video ends; new scene is revealed, ready for gameplay
5. If assets are already cached (same session), load is near-instant

**Optimization:** Pre-load all game scenes at session start. Video assets use per-game lazy loading with a priority queue (max 3 concurrent), sprite sheets for short overlays, and graceful degradation — NOT bulk preloading (see `docs/CANONICAL-DECISIONS.md` D-013). The total asset budget for all three scenes is under 200MB textures, manageable on the GameLift Streams cloud GPU instance.

### 30.4 State Broadcast Size

| Game | Typical Broadcast Size | Notes |
|---|---|---|
| Hold'em | ~2 KB | Existing, well-understood |
| 5-Card Draw | ~3 KB | 5 cards per player instead of 2 |
| Blackjack Classic | ~4 KB | Multiple hands, side bets, shoe metadata |
| Blackjack Competitive | ~2 KB | Simpler, no dealer hand or side bets |

All well within Socket.IO's comfort zone.

---

# IX. Quality & Operations

## 31. Error Handling Per Game

### 31.1 Common Errors (All Games)

| Error | Handling |
|---|---|
| Voice command not recognised | 3-strike escalation (same as Hold'em PRD Section 7.9) |
| Player disconnects | Auto-action after 30s (fold/stand pat/stand), seat held 3 hands/rounds |
| LLM timeout (bot decision) | Rules-based fallback (strong = play, weak = fold/stand) |
| VGF server restart | Redis state recovery; all clients auto-reconnect |

### 31.2 5-Card Draw-Specific Errors

| Error | Handling |
|---|---|
| Player tries to draw more than 3 | Dealer: "Maximum 3 cards." Phone blocks selection of 4th card |
| Draw timer expires | Auto-stand-pat (keep all 5 cards) |
| Voice discard of nonexistent card | Dealer: "You don't have a [rank]. Try again." |

### 31.3 Blackjack-Specific Errors

| Error | Handling |
|---|---|
| Player tries to hit on 21 | Auto-stand; dealer: "You've got 21! Standing." |
| Player tries to split non-pair | Dealer: "Those aren't a pair. Hit or stand?" |
| Player tries to double after hitting | Dealer: "Double down is only available on your first two cards." |
| Player tries to surrender after hitting | Dealer: "Surrender is only available on your first two cards." |
| Insufficient chips for double/split | Action greyed out on phone; if voiced: "Not enough chips. Hit or stand?" |
| Insurance timer expires | No insurance placed; play continues |
| Betting timer expires | Minimum bet auto-placed |
| All players bust (Competitive) | "Least bust" rule applies (Section 19.5) |

### 31.4 Blackjack Disconnection Handling

| Scenario | Auto-Action | Timing |
|---|---|---|
| Disconnect during betting phase | Minimum bet auto-placed | Immediate |
| Disconnect during player turn (single hand) | Stand on current hand | After 30s timeout |
| Disconnect during split play (multiple hands) | Stand on all remaining hands | After 30s timeout per hand |
| Disconnect during insurance decision | Insurance declined | After 15s timeout |
| Disconnect during competitive raise round | Check (pass) | After 10s timeout |
| Seat reservation (BJ) | Seat held for 5 rounds | BJ rounds are faster than poker hands; 5 rounds = roughly equivalent time to 3 poker hands |

### 31.5 Video Playback Errors

| Error | Handling |
|---|---|
| Video fails to load | Skip video silently; proceed to next game state. Log `video.load_failed`. No player-visible error. |
| Video playback stalls >2s | Fade to black (0.3s), proceed to next game state. Log `video.playback_stalled`. |
| Video asset missing from bundle | Skip silently — enables incremental asset delivery. |
| Multiple videos triggered simultaneously | Queue them; play sequentially. If queue exceeds 2 videos, drop all but the highest-priority (celebration > transition > ambient). |

---

## 32. Analytics Events

### 32.1 Event Taxonomy

All analytics events follow the format `{domain}.{action}` with a consistent base payload:

```typescript
interface AnalyticsEvent {
  event: string
  sessionId: string
  playerId: string          // Required — every event has a player context
  gameType: CasinoGame
  timestamp: number
}
```

> **Note:** `playerId` is required on the base, not optional. Game-specific event payloads should NOT repeat `playerId`.

### 32.2 Event Catalogue

| Event | Domain | Payload (in addition to base) |
|---|---|---|
| `lobby.game_selected` | Lobby | `{ gameType }` |
| `lobby.game_switched` | Lobby | `{ fromGame, toGame, handsPlayedPrevious }` |
| `lobby.session_started` | Lobby | `{ gameType, playerCount, botCount }` |
| `game.hand_started` | Game | `{ handNumber, playerCount }` |
| `game.hand_completed` | Game | `{ handNumber, winnerIds, potSize, duration }` |
| `game.voice_command` | Voice | `{ intent, raw_transcript, confidence, success }` |
| `game.touch_action` | Input | `{ action, amount? }` |
| `game.bot_decision` | Bot | `{ botId, difficulty, action, llmModel?, latency }` |
| `draw.cards_drawn` | 5-Card Draw | `{ count }` |
| `draw.stood_pat` | 5-Card Draw | — |
| `blackjack.action` | Blackjack | `{ action, handValue, dealerUpcard, handIndex }` |
| `blackjack.round_result` | Blackjack | `{ result, payout, handValue, dealerHandValue }` |
| `blackjack.side_bet_placed` | Blackjack | `{ type, amount }` |
| `blackjack.side_bet_result` | Blackjack | `{ type, outcome, payout }` |
| `blackjack.insurance_taken` | Blackjack | `{ amount }` |
| `blackjack.insurance_result` | Blackjack | `{ dealerHadBlackjack, payout }` |
| `blackjack.shoe_reshuffled` | Blackjack | `{ roundNumber, cardsDealt }` |
| `wallet.rebuy` | Wallet | `{ amount, rebuyCount }` |
| `wallet.game_buyin` | Wallet | `{ amount }` |
| `wallet.game_cashout` | Wallet | `{ amount, netResult }` |
| `session.ended` | Session | `{ duration, gamesPlayed, totalHands }` |
| `session.player_result` | Session | `{ netResult, gamesPlayed, timePerGame }` |
| `video.played` | Video | `{ assetKey, category, trigger, duration }` |
| `video.skipped` | Video | `{ assetKey, skipTimeMs }` |
| `video.load_failed` | Video | `{ assetKey, error }` |
| `video.playback_stalled` | Video | `{ assetKey, stallPositionMs }` |
| `video.impression` | Video | `{ assetKey, wasFirstPlay }` |

---

## 33. Accessibility

### 33.1 Universal Requirements (All Games)

| Requirement | Implementation |
|---|---|
| Colour-blind safe | Never rely on colour alone; every colour-coded element has text label, icon, or pattern |
| Large text at distance | Minimum 24px at 1080p for TV; 32px preferred; bold/medium weights |
| Screen reader support | Phone controller supports screen readers; all cards announced by name ("Ace of Spades") |
| Voice alternatives | All touch actions have voice equivalents |
| Touch alternatives | All voice actions have touch equivalents |
| High contrast | Ivory text on dark backgrounds; UI elements meet WCAG 2.1 AA contrast ratios |
| Motion reduction | `prefers-reduced-motion` respected on phone; TV animations non-optional (cloud-rendered) |
| Timing | All timers are generous (30s + 15s time bank); no time pressure for casual play |

### 33.2 Game-Specific Accessibility

**5-Card Draw:**
- During draw phase, selected cards have checkmark overlay (not just dimming)
- Voice: "Discard the 3 and the 7" as alternative to touch selection
- Card selection state announced to screen readers

**Blackjack:**
- Hand total always displayed as large text (not just cards)
- "Soft" vs "Hard" hand distinction clearly labelled (e.g., "Soft 17" not just "17")
- Split hands navigable via voice ("Switch to hand 2") and swipe (phone)
- Side bet outcomes explained verbally, not just as numbers

---

## 34. Testing Strategy

### 34.1 Unit Tests

| Area | Framework | Coverage Target |
|------|-----------|-----------------|
| Poker hand evaluation (shared) | Vitest | 95%+ (existing) |
| 5-Card Draw draw logic | Vitest | 95%+ |
| Blackjack hand evaluation | Vitest | 95%+ |
| Blackjack shoe management | Vitest | 90%+ |
| Side pot calculation (shared) | Vitest | 95%+ (existing) |
| Side bet evaluation | Vitest | 95%+ |
| Voice command intent parsing (per game) | Vitest | 90%+ |
| Wallet operations | Vitest | 95%+ |
| Session statistics aggregation | Vitest | 90%+ |

### 34.2 Integration Tests

| Test | Scope |
|------|-------|
| Full Hold'em hand lifecycle | Existing (no changes) |
| Full 5-Card Draw hand lifecycle | Deal -> 1st betting -> draw -> 2nd betting -> showdown -> pot distribution |
| Full Blackjack Classic round | Bet -> deal -> insurance -> player turns (hit/stand/double/split) -> dealer turn -> resolution |
| Full Blackjack Competitive round | Ante -> deal -> raise -> player turns -> showdown -> pot distribution |
| Game switching | Hold'em -> lobby -> Blackjack -> lobby -> 5-Card Draw; wallet preserved throughout |
| Multi-game session | Play 5 hands of Hold'em, switch to Blackjack, play 5 rounds; verify cross-game stats |
| Side pot with game switch | Build up chips in Hold'em, switch to Blackjack; wallet reflects correct balance |
| Bot integration per game | Bot decision -> action -> state update for each game type |
| Voice pipeline per game | Audio -> STT -> intent -> action for game-specific commands |

### 34.3 Blackjack Edge Case Tests

| Test Case | Verification |
|---|---|
| Dealer blackjack with player insurance | Insurance pays 2:1; main bet lost |
| Player blackjack vs dealer blackjack | Push |
| Player splits Aces, receives 10 | Counts as 21, not blackjack (no 3:2) |
| Player doubles with insufficient chips | Action unavailable |
| 4-way split | 4 independent hands resolved correctly |
| All players bust in Competitive | "Least bust" wins |
| Shoe exhaustion (1-deck, 4 players) | Graceful reshuffle of discards |
| Perfect Pairs with single deck | Perfect Pair (same suit) impossible; Coloured and Mixed only |

### 34.4 E2E Tests (Playwright)

- Session creation → game selection → play 1 hand of each game type → session summary
- Multi-player (2 browsers) → QR join → play through all 3 games → wallets correct
- Voice command flow per game type (mocked STT for e2e)

---

# X. Cinematic Video Assets

## 35. Video Moments & Integration

### 35.1 Overview

Weekend Casino uses **pre-generated AI videos** (produced via Nano Banana Pro or similar tools) for intros, celebrations, transitions, loading screens, and ambient scene elements. The target aesthetic is **high-end Las Vegas** — Bellagio, Wynn, Aria. Luxurious, cinematic, dramatic. These videos are a first-class feature, not polish — they define the premium feel of the product.

For the full inventory of video assets, exact AI generation prompts, and production pipeline, see the companion document: **[`docs/CASINO-VIDEO-ASSETS.md`](./CASINO-VIDEO-ASSETS.md)**.

### 35.2 Video Playback Modes

| Mode | Behaviour | Display Area | Gameplay Paused? | Implementation |
|------|-----------|-------------|-----------------|----------------|
| **Full-Screen** | Video takes over the entire Display. 3D scene hidden. | 100% of viewport | Yes — phase holds until video completes (`blocksPhase: true`) | `<video>` element overlaid on R3F canvas |
| **Overlay** | Video composited on top of the 3D scene with alpha/blend. Non-blocking. | Partial viewport (top banner, corner, etc.) | No — gameplay continues underneath | Composited `<video>` layer above R3F canvas, below UI |
| **Background** | Video plays behind/beneath the 3D scene as ambient atmosphere. | Full viewport, behind 3D layer | No | `VideoTexture` on plane geometry within R3F scene; MP4 H.264; loops indefinitely |
| **Transition** | Full-screen video bridges between two scenes (game change, session events). | 100% of viewport | Yes — phase holds until video completes | Same as full-screen; covers scene unload/load |

> **Note:** The GDD (Section 21) defines these four modes authoritatively. The majority of in-game video moments use **overlay** mode to maintain gameplay pacing. **Full-screen** is reserved for session-level events, transitions, and ultra-rare celebrations.

### 35.3 Video Trigger Points — Session-Level (Shared)

These videos play regardless of which game is currently active. Asset keys match the GDD Section 22 registry.

| Trigger | Asset Key | Mode | Duration | Blocks Phase | Skippable | When |
|---------|-----------|------|----------|-------------|-----------|------|
| First connection (session start) | `casino_intro` | full_screen | 8,000ms | Yes | Yes (after 3s) | `LOBBY.onBegin` — first time only (check `sessionStats.handsPlayed === 0`) |
| Game selection confirmed | `game_select_{game}` | transition | 4,000ms | Yes | Yes (after 1s) | `GAME_SELECT.onEnd` — plays the intro for the selected game type |
| Game change (switching games) | `game_transition` | transition | 3,000ms | Yes | No | `GAME_SELECT.onBegin` when entered from a `HandComplete` phase (not from `LOBBY`) |
| Session end / all players leave | `casino_outro` | full_screen | 6,000ms | No | Yes | Triggered by `endSession` thunk |
| Dealer walks to table | `dealer_entrance` | overlay | 5,000ms | No | No | First hand of each game session — plays after game selection, before first deal. PiP overlay (corner of screen). |
| Dealer ready gesture | `dealer_ready` | overlay | 3,000ms | No | No | After `dealer_entrance` completes, or at the start of each new hand. Brief nod/gesture. PiP overlay. |

**Game-specific intro videos (played via `game_select_{game}`):**

| Asset Key | Content | Duration |
|-----------|---------|----------|
| `game_select_holdem` | Camera swoops to poker table. Chips scatter. Cards fan. "Texas Hold'em" title card. | 4,000ms |
| `game_select_five_card_draw` | Close-up of 5 cards drawn and fanned. Vintage poker parlour feel. "5-Card Draw" title card. | 4,000ms |
| `game_select_blackjack_classic` | Dealer's hands on green felt. Shoe slides cards. Ace + King land. "Blackjack" title card. | 4,000ms |
| `game_select_blackjack_competitive` | Split-screen of two players' hands. Tension music. Cards flip. "Competitive Blackjack" title card. | 4,000ms |

**User stories:**

- As a player, when I launch Weekend Casino for the first time in a session, I want to see a cinematic entrance video, so that I feel immersed in a premium casino environment
- As a player, when I select a game for the first time, I want to see a brief reveal video introducing the game's setting, so that each game feels distinct and exciting
- As a host, when I switch games, I want a smooth transition video, so that the scene change feels intentional rather than jarring
- As a player at the end of the night, when the session ends, I want a cinematic outro, so that the experience has a satisfying conclusion

**Acceptance criteria:**
- Given a new session, when the first player connects, then `casino_intro` plays at full-screen 1080p 60fps for 8 seconds with `blocksPhase: true` before the lobby becomes interactive
- Given the entrance cinematic is playing, when a player says "Skip" or presses a button after the first 3 seconds, then the video fades out over 0.3s and the lobby appears immediately
- Given a game switch from Hold'em to Blackjack, when `game_transition` plays, then the Hold'em 3D scene is fully unloaded and the Blackjack scene is fully loaded before the 3-second video ends, so gameplay resumes without any loading spinner
- Given a game selection, when `game_select_{game}` plays, then it is skippable after 1 second and plays only once per game type per session

### 35.4 Video Trigger Points — Texas Hold'em

Asset keys and trigger details match GDD Section 23.

| Phase | Trigger Event | Asset Key | Mode | Duration | Blocks | Skippable | Notes |
|-------|--------------|-----------|------|----------|--------|-----------|-------|
| `POSTING_BLINDS` | Hand #1 of session | `holdem_first_hand` | overlay | 3,000ms | No | No | "First Hand" banner animation. Overlay only — blinds post underneath. |
| `SHOWDOWN` | Any showdown reached | `holdem_showdown_reveal` | overlay | 2,000ms | No | No | Dramatic card-flip cinematic overlay. Plays behind the actual card reveal animation. |
| `POT_DISTRIBUTION` | Pot >= 500 chips | `holdem_big_pot` | overlay | 3,000ms | No | No | Chips cascade / fireworks overlay for significant pots. |
| `POT_DISTRIBUTION` | Royal Flush | `holdem_royal_flush` | full_screen | 5,000ms | Yes | Yes (after 2s) | Ultimate celebration. Full-screen cinematic — neon lights, confetti, dramatic music. |
| `POT_DISTRIBUTION` | Straight Flush | `holdem_straight_flush` | full_screen | 4,000ms | Yes | Yes (after 2s) | Premium hand celebration. |
| `POT_DISTRIBUTION` | Four of a Kind | `holdem_four_of_a_kind` | overlay | 3,000ms | No | No | Strong hand celebration overlay. |
| `HAND_COMPLETE` | Player busted (stack = 0) | `holdem_player_busted` | overlay | 2,500ms | No | No | Commiseration / dramatic moment. |
| `ALL_IN_RUNOUT` | All-in runout begins | `holdem_all_in_runout` | overlay | 2,000ms | No | No | Tension overlay (heartbeat, slow motion). Plays during runout dealing. |

**Ambient:** `holdem_ambient_table` — background mode, loops during all Hold'em gameplay phases. Subtle candlelight flicker, distant casino floor ambience, slight smoke haze.

**Celebration tier logic:** `POT_DISTRIBUTION.onBegin` checks the winning hand category: Royal Flush > Straight Flush > Four of a Kind > big pot (>= 500 chips). Only the highest-tier video fires per hand.

### 35.5 Video Trigger Points — 5-Card Draw

Asset keys and trigger details match GDD Section 24. 5-Card Draw has its own distinct asset set (not shared with Hold'em).

| Phase | Trigger Event | Asset Key | Mode | Duration | Blocks | Skippable | Notes |
|-------|--------------|-----------|------|----------|--------|-----------|-------|
| `DRAW_DEALING` | Deal begins | `draw_dealing_cinematic` | overlay | 2,000ms | No | No | Cards shuffled and dealt in a classic poker parlour setting. |
| `DRAW_DRAW_PHASE` | Phase begins | `draw_the_draw` | overlay | 1,500ms | No | No | "The Draw" title card overlay with dramatic reveal styling. |
| `DRAW_DRAW_PHASE` | Player stands pat | `draw_stand_pat` | overlay | 1,500ms | No | No | "Standing Pat" — implies confidence, builds tension. |
| `DRAW_DRAW_PHASE` | Player discards 3 (max) | `draw_going_deep` | overlay | 1,500ms | No | No | "Going Deep" — dramatic music sting, implies desperation or a bold play. |
| `DRAW_SHOWDOWN` | Showdown reached | `draw_showdown_reveal` | overlay | 2,000ms | No | No | Cards fan out dramatically — 5-card fan reveal. |
| `DRAW_POT_DISTRIBUTION` | Royal Flush | `draw_royal_flush` | full_screen | 5,000ms | Yes | Yes (after 2s) | Same celebration tier as Hold'em equivalent. |
| `DRAW_POT_DISTRIBUTION` | Straight Flush | `draw_straight_flush` | full_screen | 4,000ms | Yes | Yes (after 2s) | Premium hand celebration. |
| `DRAW_POT_DISTRIBUTION` | Four of a Kind | `draw_four_of_a_kind` | overlay | 3,000ms | No | No | Strong hand overlay. |
| `DRAW_POT_DISTRIBUTION` | Full House or better + pot >= 300 | `draw_big_hand` | overlay | 2,500ms | No | No | Solid hand with a decent pot. |

**Ambient:** `draw_ambient_parlour` — background mode, loops during all 5-Card Draw phases. Old-school poker parlour ambience — wood panelling, green glass lamp, cigar smoke, jazz. Distinct from Hold'em's modern casino feel.

### 35.6 Video Trigger Points — Blackjack Classic

Asset keys and trigger details match GDD Section 25. Blackjack uses predominantly **overlay** mode to maintain its faster pace (hands resolve in 30-60s vs poker's 2-5 minutes).

| Phase | Trigger Event | Asset Key | Mode | Duration | Blocks | Skippable | Notes |
|-------|--------------|-----------|------|----------|--------|-----------|-------|
| `BJ_PLACE_BETS` | Phase begins (each round) | `bj_place_bets_prompt` | overlay | 1,500ms | No | No | "Place Your Bets" text animation with chip-toss visual. |
| `BJ_DEAL_INITIAL` | Initial deal begins | `bj_deal_cinematic` | overlay | 2,000ms | No | No | Cinematic card-from-shoe sequence. Plays simultaneously with dealing animation. |
| `BJ_DEAL_INITIAL` | Player dealt natural blackjack | `bj_natural_blackjack` | overlay | 3,000ms | No | No | Gold flash, "BLACKJACK!" text, dramatic sting. |
| `BJ_INSURANCE` | Insurance offered | `bj_insurance_dramatic` | overlay | 2,000ms | No | No | Dealer's ace glows, ominous music, "Insurance?" text overlay. |
| `BJ_PLAYER_TURNS` | Player doubles down | `bj_double_down_bold` | overlay | 1,500ms | No | No | "Doubling Down!" — bold move acknowledgement. |
| `BJ_PLAYER_TURNS` | Player splits | `bj_split_action` | overlay | 1,500ms | No | No | Cards separate with a visual flourish. |
| `BJ_PLAYER_TURNS` | Player busts | `bj_player_bust` | overlay | 2,000ms | No | No | Sympathetic bust animation — cards crumble/shatter. |
| `BJ_PLAYER_TURNS` | Player hits 21 (non-natural) | `bj_twenty_one` | overlay | 2,000ms | No | No | "21!" with gold sparkle. Less dramatic than natural BJ. |
| `BJ_DEALER_TURN` | Hole card reveal | `bj_hole_card_reveal` | overlay | 2,500ms | No | No | Marquee moment. Dramatic slow-motion card flip. |
| `BJ_DEALER_TURN` | Dealer busts | `bj_dealer_bust` | overlay | 3,000ms | No | No | Confetti, chip shower — win for all standing players. |
| `BJ_DEALER_TURN` | Dealer gets blackjack | `bj_dealer_blackjack` | overlay | 2,500ms | No | No | Ominous dramatic sting. |
| `BJ_SETTLEMENT` | Player wins >= 500 chips | `bj_big_win` | full_screen | 4,000ms | Yes | Yes (after 2s) | Neon, chips raining. |
| `BJ_SETTLEMENT` | Player wins side bet (any) | `bj_side_bet_win` | overlay | 2,500ms | No | No | Side bet payout celebration — distinct from main bet wins. |
| `BJ_SETTLEMENT` | Perfect Pair (25:1) | `bj_perfect_pair` | overlay | 3,000ms | No | No | Premium side bet celebration. |
| `BJ_SETTLEMENT` | 21+3 Suited Triple (100:1) | `bj_suited_triple` | full_screen | 5,000ms | Yes | Yes (after 2s) | Jackpot-tier. Extremely rare. Full cinematic. |

**Ambient:** `bj_ambient_table` — background mode, loops during all Blackjack Classic phases. Modern high-roller table ambience — soft spotlights, polished felt, crystal glasses.

**Design note:** Full-screen blocking videos are reserved for extremely rare outcomes (suited triple 100:1), major financial wins (>= 500 chips), and session-level events. All standard gameplay moments use non-blocking overlays.

### 35.6a Video Trigger Points — Blackjack Competitive

Asset keys and trigger details match GDD Section 26.

| Phase | Trigger Event | Asset Key | Mode | Duration | Blocks | Skippable | Notes |
|-------|--------------|-----------|------|----------|--------|-----------|-------|
| `BJC_PLACE_BETS` | Round begins | `bjc_ante_up` | overlay | 1,500ms | No | No | "Ante Up!" — competitive player-vs-player energy. |
| `BJC_PLAYER_TURNS` | All players acting | `bjc_simultaneous_action` | overlay | 1,500ms | No | No | "All players act!" with split-screen visual energy. |
| `BJC_PLAYER_TURNS` | Player busts | `bjc_player_bust` | overlay | 2,000ms | No | No | Bust visual with competitive framing ("One down!"). |
| `BJC_SHOWDOWN` | Showdown begins | `bjc_showdown` | full_screen | 3,000ms | Yes | Yes (after 1s) | Cards flip face-up — dramatic simultaneous reveal. This IS the showdown moment. |
| `BJC_SETTLEMENT` | Close margin (1 point diff) | `bjc_close_call` | overlay | 2,500ms | No | No | "By a hair!" — narrow victory acknowledgement. |
| `BJC_SETTLEMENT` | Winner with natural 21 | `bjc_natural_winner` | overlay | 3,000ms | No | No | Natural blackjack wins the round — premium celebration. |
| `BJC_SETTLEMENT` | All other players busted | `bjc_last_standing` | overlay | 3,000ms | No | No | "Last One Standing!" — sole survivor wins by default. |
| `BJC_SETTLEMENT` | Pot >= 400 chips | `bjc_big_pot` | overlay | 3,000ms | No | No | Competitive big-pot celebration. |

**Ambient:** `bjc_ambient_arena` — background mode, loops during all Competitive BJ phases. More intense than classic — tighter lighting, darker surroundings, spotlight on table. Arena/tournament feel.

### 35.7 Complete Asset Key Registry

For cross-referencing with `docs/CASINO-VIDEO-ASSETS.md` and GDD Section 27. **Total: 51 unique video assets.** See `docs/CASINO-VIDEO-ASSETS.md` v2 for the complete key list and `docs/CANONICAL-DECISIONS.md` D-012 for the canonical count.

**Shared (9 assets):**
`casino_intro`, `casino_outro`, `game_select_holdem`, `game_select_five_card_draw`, `game_select_blackjack_classic`, `game_select_blackjack_competitive`, `game_transition`, `dealer_entrance`, `dealer_ready`

**Hold'em (9 assets):**
`holdem_first_hand`, `holdem_showdown_reveal`, `holdem_big_pot`, `holdem_royal_flush`, `holdem_straight_flush`, `holdem_four_of_a_kind`, `holdem_player_busted`, `holdem_all_in_runout`, `holdem_ambient_table`

**5-Card Draw (10 assets):**
`draw_dealing_cinematic`, `draw_the_draw`, `draw_showdown_reveal`, `draw_royal_flush`, `draw_straight_flush`, `draw_four_of_a_kind`, `draw_big_hand`, `draw_stand_pat`, `draw_going_deep`, `draw_ambient_parlour`

**Blackjack Classic (16 assets):**
`bj_place_bets_prompt`, `bj_deal_cinematic`, `bj_natural_blackjack`, `bj_insurance_dramatic`, `bj_double_down_bold`, `bj_split_action`, `bj_player_bust`, `bj_twenty_one`, `bj_hole_card_reveal`, `bj_dealer_bust`, `bj_dealer_blackjack`, `bj_big_win`, `bj_side_bet_win`, `bj_perfect_pair`, `bj_suited_triple`, `bj_ambient_table`

**Blackjack Competitive (9 assets):**
`bjc_ante_up`, `bjc_simultaneous_action`, `bjc_player_bust`, `bjc_showdown`, `bjc_close_call`, `bjc_natural_winner`, `bjc_last_standing`, `bjc_big_pot`, `bjc_ambient_arena`

### 35.8 Video Playback Rules

| Rule | Specification |
|---|---|
| **Maximum cinematic duration** | 8 seconds (session intro). In-game blocking videos max 5 seconds. No video moment pauses gameplay for more than 8 seconds. |
| **Skip policy** | Per-trigger `skippable` field in the tables above. Full-screen intros: skippable after 1-3s (varies by trigger). Overlay videos: never skippable (they're brief and non-blocking). Transition videos: not skippable (masking scene loads). |
| **Skip input** | TV remote (any button), voice ("Skip", "Next"), phone (tap "Skip" button) |
| **`blocksPhase` integration** | When `blocksPhase: true`, the current phase's `endIf` holds until `videoPlayback.completed === true` or the hard timeout (`durationMs + 1,000ms buffer`) expires. See Section 36.4 for the state schema and integration pattern. |
| **Frequency cap** | Game intro videos (`game_select_{game}`) play once per game type per session. Celebration videos have no frequency cap but consecutive identical videos are suppressed (e.g., two natural blackjacks in a row — play video only for the first). |
| **Threshold for "big win" celebrations** | Hold'em: pot >= 500 chips (`holdem_big_pot`). Blackjack Classic: payout >= 500 chips (`bj_big_win`). 5-Card Draw: Full House or better + pot >= 300 (`draw_big_hand`). Blackjack Competitive: pot >= 400 chips (`bjc_big_pot`). |
| **Ultra-rare celebrations** | Royal Flush / Straight Flush: always plays full-screen, no suppression. Suited Triple (100:1): full-screen, no suppression. These are the headline moments. |
| **Audio** | Videos include baked-in cinematic audio. Game audio (TTS, ambient) fades to 10% during full-screen videos and restores on completion. Overlay videos play audio at 50% mix with game audio. Background/ambient videos are muted (`video.muted = true`). |
| **Encoding** | MP4 H.264 Baseline profile. 1080p 16:9. Target bitrate: 8 Mbps full-screen, 4 Mbps background/ambient textures. |
| **Total video asset budget** | < 150 MB (all 51 videos across all games). Loaded per-game via lazy loading with priority queue and eviction (see `docs/CANONICAL-DECISIONS.md` D-013). |
| **Controller behaviour during video** | Full-screen/transition: controller dims UI (50% opacity), shows "Watch the screen", disables action buttons. Overlay/background: no change to controller. |

### 35.9 Fallback Behaviour

| Failure | Fallback |
|---|---|
| Video fails to load (network/decode error) | Skip video entirely; proceed to next game state. No loading spinner, no error message to player. Log `video.load_failed` analytics event. |
| Video playback stalls mid-play | After 2s stall, fade to black over 0.3s and proceed to next game state. Log `video.playback_stalled`. |
| Video asset missing from bundle | Identical to load failure — skip silently. This enables incremental video asset delivery (ship game before all videos are produced). |
| Device cannot decode H.264 | Should not occur (GameLift Streams cloud GPU handles playback). If it does: skip silently. |

**Critical design principle:** No video failure should ever block gameplay. Videos are enhancers, not gates. The game must function identically with all videos removed.

### 35.10 User Stories — Video Moments

- As a player, when I hit a natural blackjack, I want to see a cinematic celebration video, so that the moment feels special and rewarding
- As a player, when I win an all-in showdown in Hold'em, I want a dramatic victory video, so that the tension pays off with a satisfying climax
- As a player, when games are switching, I want a smooth transition video instead of a loading screen, so that the experience feels seamless
- As a host, when I start a new session, I want the casino entrance cinematic to set the mood for the night
- As a player who just wants to play, when I see the intro cinematic, I want the option to skip after 3 seconds, so that I'm not forced to watch it every time
- As a player, when a video fails to load, I want the game to continue without interruption, so that technical issues don't ruin game night

### 35.11 Analytics Events — Video

See Section 32.2 for the canonical `video.*` event definitions. All video events use `assetKey` (not `videoId`) in their payload, and `gameType` is inherited from the base `AnalyticsEvent` interface.

### 35.12 Accessibility — Video

| Requirement | Implementation |
|---|---|
| Motion sensitivity | `prefers-reduced-motion`: disable celebration videos; keep essential transitions (they mask loading). Ambient video textures continue (they're subtle). |
| Audio description | Not required for v1 (videos are atmospheric, not informational). Revisit if videos carry narrative content. |
| Seizure safety | No strobing or rapid flashing in any video. Maximum 3 flashes per second (WCAG 2.3.1). |
| Skip mechanism | Always available for skippable videos; clearly labelled on phone ("Skip") and announced via voice prompt ("Say 'skip' to continue"). |

---

## 36. Video Playback Architecture

### 36.1 Implementation Strategy

Videos are played by the **Display client** running on the GameLift Streams cloud GPU. The video output is captured as part of the WebRTC stream and delivered to the TV — identical to how 3D rendering and TTS audio are delivered.

### 36.2 Full-Screen Video Playback

```
[VGF phase transition / game event triggers video]
  |
  v
[Server dispatches START_VIDEO thunk (assetKey, mode, durationMs, blocksPhase, skippable)]
  |  - Thunk dispatches SET_VIDEO_PLAYBACK reducer (timestamp from thunk, not reducer)
  |  - If blocksPhase: schedules FORCE_COMPLETE_VIDEO timeout (durationMs + 500ms grace)
  |
  v
[STATE_UPDATE broadcast → Display reads state.videoPlayback, mounts <VideoPlayer>]
  |
  v
[R3F canvas opacity -> 10% (0.3s fade)]
[<video> element plays at 100% opacity]
[Game audio fades to 10%]
  |
  v
[Video ends naturally OR player skips (SKIP_VIDEO thunk) OR server timeout fires]
  |
  v
[<video> fades out (0.3s)]
[R3F canvas opacity -> 100% (0.3s fade)]
[Game audio restores to 100%]
[COMPLETE_VIDEO reducer dispatched → CLEAR_VIDEO reducer dispatched]
[Server timeout cancelled (if client completed before deadline)]
  |
  v
[endIf sees videoPlayback.completed === true → phase continues]
```

### 36.3 Video Texture Playback (Background Mode)

Ambient video textures (`holdem_ambient_table`, `draw_ambient_parlour`, `bj_ambient_table`, `bjc_ambient_arena`) are implemented as `THREE.VideoTexture` applied to plane geometry within the R3F scene. They:
- Loop continuously with `video.loop = true`
- Cross-fade the last 0.5s into the first 0.5s to create seamless loops (handled in post-production)
- Load lazily after the 3D scene is interactive (non-blocking)
- Have `video.muted = true` (ambient audio comes from the scene's audio system, not the video)

### 36.4 State Schema — VideoPlayback

Videos are triggered by dispatching a reducer that populates a `videoPlayback` field on the root game state. The Display reads this field and renders the `<VideoPlayer>` component accordingly. This state IS broadcast via VGF (the server is authoritative over which video to play).

```typescript
/** Added to CasinoGameState — see GDD Section 27 */
interface VideoPlayback {
  /** Unique asset key referencing the video (maps to URL/path in asset manifest) */
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
  /** Whether the player can skip this video */
  skippable: boolean
}
```

**Phase integration pattern** — when `blocksPhase: true`, the current phase's `endIf` includes:

```typescript
endIf: (ctx) => {
  const state = ctx.session.state as CasinoGameState
  // If a blocking video is playing, hold the phase until it completes
  if (state.videoPlayback && state.videoPlayback.blocksPhase && !state.videoPlayback.completed) {
    return false
  }
  // ... normal endIf logic
  return normalEndIfCondition(state)
}
```

**Note:** The `endIf` does NOT use `Date.now()` for timeout — timeout enforcement is handled by the server-side scheduled timer (see `START_VIDEO` thunk below). This avoids non-deterministic predicates.

**Video reducers (root-level, available in all phases):**

```typescript
// Pure reducers — no Date.now(), no side effects
SET_VIDEO_PLAYBACK: (state, videoPlayback: VideoPlayback) => ({
  ...state,
  videoPlayback,
})

COMPLETE_VIDEO: (state) => ({
  ...state,
  videoPlayback: state.videoPlayback ? { ...state.videoPlayback, completed: true } : undefined,
})

CLEAR_VIDEO: (state) => ({
  ...state,
  videoPlayback: undefined,
})
```

**Video thunks (root-level, available in all phases):**

```typescript
// START_VIDEO — thunk handles timestamp + server-side timeout scheduling
START_VIDEO: async (ctx, assetKey: string, mode: string, durationMs: number, blocksPhase: boolean, skippable: boolean) => {
  const startedAt = Date.now()  // Timestamp in thunk, not reducer
  ctx.dispatch('SET_VIDEO_PLAYBACK', {
    assetKey, mode, blocksPhase, startedAt, durationMs, completed: false, skippable,
  })

  if (blocksPhase) {
    // Server-side hard timeout — guarantees phase unblocks even if client
    // never dispatches COMPLETE_VIDEO (disconnection, crash, stall).
    // This is the trust boundary: the SERVER controls phase progression.
    await ctx.scheduler.upsertTimeout({
      name: `video:${assetKey}`,
      delayMs: durationMs + 500,  // 500ms grace period for client to complete naturally
      mode: 'hold',
      dispatch: { kind: 'thunk', name: 'FORCE_COMPLETE_VIDEO' },
    })
  }
}

// FORCE_COMPLETE_VIDEO — server-side safety net, fires if client didn't complete in time
FORCE_COMPLETE_VIDEO: async (ctx) => {
  const state = ctx.getState()
  if (state.videoPlayback && !state.videoPlayback.completed) {
    ctx.dispatch('COMPLETE_VIDEO')
    ctx.dispatch('CLEAR_VIDEO')
  }
}

// SKIP_VIDEO — client-initiated skip (validated server-side)
SKIP_VIDEO: async (ctx) => {
  const state = ctx.getState()
  if (!state.videoPlayback || !state.videoPlayback.skippable) return
  // Cancel the scheduled timeout
  await ctx.scheduler.cancel(`video:${state.videoPlayback.assetKey}`)
  ctx.dispatch('COMPLETE_VIDEO')
  ctx.dispatch('CLEAR_VIDEO')
}
```

**Trust boundary:** The Display client plays the video locally and may dispatch `COMPLETE_VIDEO` when playback ends. However, the server does NOT trust the client — the scheduled `FORCE_COMPLETE_VIDEO` timeout guarantees the phase unblocks even if the client disconnects, crashes, or stalls. The client's `COMPLETE_VIDEO` dispatch is a courtesy that cancels the server timeout early (avoiding the 500ms grace period delay).

**Display-client-only tracking state** (not broadcast via VGF):

```typescript
interface VideoClientState {
  videosPlayedThisSession: string[]  // for frequency cap / first-play tracking
  ambientVideosLoaded: boolean       // true when background video textures are ready
}
```

### 36.5 Performance Impact

| Concern | Analysis |
|---|---|
| Memory (video assets) | < 150 MB total. GameLift Streams `gen4n_high` instances have ample memory. |
| Decode overhead | H.264 hardware decoding on cloud GPU. Negligible CPU impact. |
| Frame rate during video | R3F canvas is dimmed but still rendering (at reduced complexity). Video overlay is a simple `<video>` element composited by the browser. 60fps maintained. |
| Pre-loading | Per-game lazy loading with priority queue (max 3 concurrent downloads). Current game's assets are preloaded; previous game's assets are evicted on game switch. See `docs/CANONICAL-DECISIONS.md` D-013. |
| Video texture bandwidth | 4 Mbps per ambient texture. Only 1 ambient video active at a time (game-specific). No network impact (assets are local to the cloud GPU). |

---

# XI. Project Management

## 37. Milestones & Phasing

### Phase 1: Rebrand & Lobby (1 week)
- Package rename (@weekend-poker → @weekend-casino)
- Casino lobby with game selection UI
- Game switching infrastructure (ruleset registry, phase namespacing)
- Shared wallet implementation
- Hold'em integrated into new lobby flow
- All existing tests pass with new package names

### Phase 2: 5-Card Draw (1.5 weeks)
- 5-Card Draw game ruleset (phases, reducers, thunks)
- Draw phase mechanic (discard + replace)
- 5-Card Draw voice commands and slot maps
- 5-Card Draw bot strategies (Easy rules engine + Medium/Hard LLM prompts)
- 5-Card Draw 3D scene (reuse poker room, add draw animations)
- Controller UI for draw phase (card selection)
- Unit and integration tests

### Phase 3: Blackjack Classic (2 weeks)
- Blackjack hand evaluation engine
- Shoe management (multi-deck, penetration, reshuffle)
- Classic Dealer mode ruleset (all phases)
- Hit, Stand, Double Down, Split, Surrender, Insurance
- Side bets (Perfect Pairs, 21+3)
- Blackjack dealer characters ("Ace" Malone, Scarlett Vega, Chip Dubois)
- Blackjack 3D scene (semicircular table, shoe, etc.)
- Controller UI (betting, split hands, insurance overlay)
- Blackjack-specific voice commands and slot maps
- Unit and integration tests (including edge cases)

### Phase 4: Blackjack Competitive (1 week)
- Competitive variant ruleset (phases, pot system)
- All-bust resolution logic
- Competitive-specific UI (pot display, showdown)
- Tests

### Phase 5: Video Assets & Integration (1.5 weeks, parallel with Phase 3–4)
- Video asset production (AI-generated via Nano Banana Pro; see [`docs/CASINO-VIDEO-ASSETS.md`](./CASINO-VIDEO-ASSETS.md))
- Video playback infrastructure (VideoOverlay component, video texture setup)
- Video trigger integration per game type (phase transitions, event hooks)
- Skip/fallback logic and frequency capping
- Video pre-loading at session start
- Seamless loop post-production for ambient video textures
- Video analytics events

### Phase 6: Cross-Game Polish (1 week)
- Cross-game session statistics
- Session summary (multi-game breakdown)
- Game-switching e2e testing
- Analytics event implementation
- Accessibility audit and fixes (including video motion sensitivity)
- Performance profiling (scene loads, state sizes, video decode overhead)

### Phase 7: QA & Launch (1 week)
- Full QA pass across all games
- Multi-player playtesting
- Bot tuning (difficulty balance per game)
- Edge case testing
- Video playback verification on GameLift Streams
- Final performance optimisation

---

## 38. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Blackjack shoe state complexity causes performance issues | Low | Medium | Shoe is server-only, never broadcast. Card counting state is minimal. Profile early. |
| 2 | Split hands create confusing UX on phone | Medium | Medium | Tab-based navigation with clear active hand highlighting. Extensive playtesting. Voice navigation ("switch to hand 2"). |
| 3 | Scene switching latency disrupts flow | Medium | High | Pre-load all 3D scenes at session start. Video assets loaded per-game with lazy loading and eviction. Transition video covers load time. Target < 3s switch. |
| 4 | 5-Card Draw draw phase feels slow with 4 players | Medium | Medium | Parallel draw (all players select simultaneously, reveal sequentially). 30s timer keeps pace. |
| 5 | Side bets add betting phase complexity | Low | Low | Side bets are optional UI additions during betting phase. Default is no side bets. |
| 6 | Bot quality varies across games | Medium | Medium | Each game gets dedicated bot strategy development and tuning. Shared LLM integration layer reduces duplication. |
| 7 | Wallet balance bugs across game switches | Medium | High | Comprehensive integration tests for every game transition. Wallet operations are atomic reducers with before/after assertions. |
| 8 | Package rename breaks CI/CD | Low | High | Execute rename in a single PR with full test suite verification. Lockstep with CI config updates. |
| 9 | Voice command ambiguity between games | Low | Medium | Game-specific slot maps. "Hit" is unambiguous in Blackjack context. Voice commands are only parsed for the active game. |
| 10 | Card counting assistance via client inspection | Low | Low | Shoe state is server-only. Cards remaining is approximate. Acceptable for casual play. |
| 11 | AI-generated videos look inconsistent or low-quality | Medium | Medium | Generate multiple takes per prompt; curate aggressively. Production pipeline includes manual review gate. Fallback: stock footage from professional libraries. |
| 12 | Video loading adds latency during gameplay | Low | Medium | Per-game lazy loading with priority queue (max 3 concurrent). Current game's assets preloaded during lobby/game-select. Evict previous game's assets on switch. See D-013. |
| 13 | Celebration videos disrupt game pacing | Medium | Medium | Strict maximum duration (10s). Frequency cap prevents consecutive identical videos. Playtesting with real groups to calibrate which events warrant videos. |
| 14 | Video asset budget (150 MB) is insufficient for all games | Low | Low | Prioritise full-screen cinematics and game intros. Ambient video textures can be lower resolution (720p). Compress aggressively — 8 Mbps is generous. |
| 15 | Seamless video loops are difficult with AI generation | Medium | Low | Cross-fade 0.5s in post-production. AI-generated loops do not need to be pixel-perfect — the cross-fade hides seam artefacts. |

---

## 39. Future Roadmap (Post-v1)

Based on market research findings (see `docs/MARKET-RESEARCH-CASINO-GAMES.md`). None of the following is in scope for v1 — this section exists to inform architectural decisions and ensure v1 does not paint us into a corner.

### 39.1 v2 Game Additions

| Priority | Game | Party Fit Score | Rationale |
|----------|------|----------------|-----------|
| **1** | **Craps** | 9/10 | Highest social energy of any casino game. Communal betting on shared dice rolls, rotating shooter role, natural party atmosphere. The single best game for our TV + phone model. |
| **2** | **Roulette** | 8/10 | Most visually spectacular game on a TV. Dead-simple rules, universal appeal. Spinning wheel creates shared tension. Private bets on phone revealed after spin. |

**Architectural implication for v1:** The single expanded `GameRuleset<CasinoGameState>` must accommodate additional game phase namespaces (e.g., `CRAPS_` prefix, `ROUL_` prefix) and optional sub-state objects (`craps?: CrapsState`, `roulette?: RouletteState`) without restructuring.

### 39.2 v2 Feature: "Game Night Mode"

The killer differentiator. No competitor offers this.

**Concept:** The host selects 3-5 games from the casino menu. Players compete across all games with a unified scoring system displayed on the TV. A champion is crowned at the end of the evening with a dramatic ceremony and shareable results card.

**How it works:**
1. Host picks 3-5 games and sets round/hand count per game
2. Players compete across all games with a running cross-game scoreboard on the TV
3. Between games: stats, commentary, leaderboard updates ("Player 2 is on a hot streak!")
4. Champion crowned at end with cinematic celebration + shareable social media results card

**Why it matters:**
- Creates a reason to play multiple games (cross-game engagement)
- Creates a reason to return weekly ("rematch!")
- Creates shareable content (organic viral marketing)
- Transforms casual gambling into a structured weekly social ritual
- This is the Jackbox model applied to casino: the evening IS the product

**Architectural implication for v1:** The cross-game wallet and session statistics systems (Sections 24-25) already provide the data foundation. Game Night Mode adds a meta-layer on top — no v1 rework required if the wallet and stats interfaces are clean.

### 39.3 v2+ Retention Mechanics

| Priority | Mechanic | Description |
|----------|----------|-------------|
| **1** | **Daily/weekly login streaks with group bonuses** | Escalating daily rewards. Twist: if the whole Crew logs in the same week, everyone gets a multiplier. Social accountability drives return. |
| **2** | **Crews (persistent friend groups)** | Persistent teams that carry XP, rank, and unlocks across game nights. Crew vs. Crew leaderboards. Monthly championships. Adapted from Huuuge Casino's club model for real-world friend groups. |
| **3** | **Cross-game progressive jackpot** | Visible jackpot ticker on the TV during every game. Grows with every bet across all games. Can trigger randomly during any hand/roll. Creates persistent anticipation. |
| **4** | **Unlockable cosmetics** | Card deck designs, table themes, chip sets, avatar items, victory animations. Earned through play, challenges, and rare drops. Completionist hook. |

### 39.4 v2 Deferred Features (from v1 scope discussions)

These were explicitly descoped from v1:
- **Vote-based game switching** — v1 uses host-only switching; majority-vote mechanism (`gameChangeVotes`) deferred to v2
- **5-Card Draw voice card selection** — touch-only in v1; voice discard-by-rank commands deferred
- **Simultaneous competitive blackjack turns** — sequential in v1; simultaneous play deferred
- **Localisation** — v1 is English-only

### 39.5 v3+ Expansion Path

| Timeframe | Addition | Party Fit | Market |
|-----------|----------|-----------|--------|
| v3 | Sic Bo | 7/10 | Asia Pacific |
| v4 | Let It Ride | 6/10 | Western |
| v4+ | Baccarat | 5/10 | Asia Pacific only |

**Skip permanently:** Slots (solo, 3/10 party fit), Pai Gow Poker (too slow, 3/10 party fit).

### 39.6 Growth Target

**200-500K DAU is the v2 target** per revised market analysis and roadmap consolidation (`CASINO-V2-ROADMAP-FINAL.md`). The 1M DAU target moves to v3, contingent on online multiplayer breaking the TV-first co-location ceiling. The social casino genre achieves 20-26% DAU/MAU stickiness (well above mobile gaming average of ~15%). Our TV + Phone model is completely unique in the casino space — no major social casino operates this way. The intersection of the Jackbox party model and the $8.5B social casino market is unoccupied.

---

> **End of Document**
>
> This PRD, combined with the original Weekend Poker PRD (which remains authoritative for Hold'em-specific detail), provides the complete specification for Weekend Casino v1.0. All decisions have been made. Build it.

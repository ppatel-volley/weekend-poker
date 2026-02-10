# Weekend Poker — Product Requirements Document

> **Version:** 1.0
> **Date:** 2026-02-09
> **Author:** Product Management
> **Status:** Draft for Engineering & Leadership Review

---

## Table of Contents

### I. Product Overview
1. [Executive Summary](#1-executive-summary)
2. [Game Overview](#2-game-overview)
3. [Target Audience](#3-target-audience)
4. [Platform Requirements](#4-platform-requirements)

### II. Game Design
5. [Game Mechanics](#5-game-mechanics)
6. [Game Flow & Phase Design](#6-game-flow--phase-design)
7. [Voice Command Design](#7-voice-command-design)
8. [AI Bot Design](#8-ai-bot-design)
9. [Dealer System](#9-dealer-system)

### III. User Experience
10. [Display (TV) UI/UX](#10-display-tv-uiux)
11. [Controller (Phone) UI/UX](#11-controller-phone-uiux)
12. [Onboarding & Tutorial](#12-onboarding--tutorial)
13. [Session Flow](#13-session-flow)

### IV. Technical Architecture
14. [System Architecture](#14-system-architecture)
15. [State Management](#15-state-management)
16. [Voice Pipeline](#16-voice-pipeline)
17. [3D Rendering](#17-3d-rendering)
18. [Animation System](#18-animation-system)
19. [Network Architecture](#19-network-architecture)

### V. Art & Audio
20. [Visual Style Guide](#20-visual-style-guide)
21. [3D Asset List](#21-3d-asset-list)
22. [Audio Design](#22-audio-design)
23. [Pre-Rendered Video](#23-pre-rendered-video)

### VI. Quality & Operations
24. [Performance Requirements](#24-performance-requirements)
25. [Testing Strategy](#25-testing-strategy)
26. [Accessibility](#26-accessibility)
27. [Analytics & Metrics](#27-analytics--metrics)
28. [Deployment & Release](#28-deployment--release)

### VII. Project Management
29. [Milestones & Timeline](#29-milestones--timeline)
30. [Risk Register](#30-risk-register)
31. [Dependencies](#31-dependencies)
32. [Team & Skills Required](#32-team--skills-required)

---

# I. Product Overview

## 1. Executive Summary

Weekend Poker is a voice-controlled, 3D Texas Hold'em poker game built for Smart TV and Fire TV. Players speak their bets to an AI dealer who narrates the game through text-to-speech. Up to four players (any mix of humans and LLM-powered AI bots) sit at a premium virtual poker table rendered via React Three Fiber and streamed to the television through Amazon GameLift Streams. Human players connect their mobile phones as controllers by scanning a QR code — they see their private hole cards on the phone and interact through voice commands or touch.

**Core value proposition:** A living-room poker night experience that feels like sitting at a real table, with a professional AI dealer running the game by voice.

**Key differentiators:**
- **Voice-first interaction** — players talk to the dealer, not a UI
- **Phone-as-controller** — private cards on your phone, shared table on the TV
- **LLM-powered bots** — AI opponents with distinct personalities and adaptive play
- **Premium 3D visuals** — cloud-rendered via GameLift Streams, unconstrained by TV hardware
- **No-install thin client** — the TV runs a browser; the game runs on cloud GPUs

**Format:** No-Limit Texas Hold'em, cash game, 4 players max, unlimited rebuys.

---

## 2. Game Overview

| Attribute | Detail |
|---|---|
| **Game** | No-Limit Texas Hold'em |
| **Format** | Cash game with fixed blinds and unlimited rebuys |
| **Players** | 1–4 (any mix of humans and AI bots) |
| **Minimum to start** | 2 players (human or bot) |
| **Input** | Voice commands (primary), mobile touch (secondary), TV remote (fallback) |
| **Output** | 3D rendered table on TV, private cards on phone, dealer narration via TTS |
| **Session length** | Open-ended; players join and leave freely |
| **Monetisation** | Not in scope for v1 |

### What Makes This Different

Traditional poker video games put buttons on screen and ask players to tap. Weekend Poker puts a dealer in the room and asks players to talk. The voice-first design, combined with private cards on a phone and a shared 3D table on the TV, recreates the social dynamic of a real poker night — players around a table, chips in the centre, banter in the air.

---

## 3. Target Audience

### Primary

- **Casual poker players** (25–45 years old) who host or attend regular home games and want a polished digital alternative
- **Groups of friends/family** looking for a shared living-room activity on Smart TV
- **Poker-curious players** who know the basics but find online poker intimidating — the AI dealer guides them

### Secondary

- **Solo players** who want to practise against AI opponents with realistic personalities
- **Smart TV early adopters** and Fire TV owners looking for premium interactive content

### User Personas

**"Game Night Greg"** — Hosts a weekly poker night with 3 mates. Wants the experience without the hassle of physical cards and chips. Owns a Fire TV.

**"Learning Lisa"** — Played poker once at a casino, enjoyed it, wants to practise at home against forgiving AI bots before playing with friends.

**"Solo Steve"** — Watches poker on YouTube. Wants to play against AI opponents that feel like real people, not algorithms.

---

## 4. Platform Requirements

### Display (TV) — Thin Client via GameLift Streams

The TV does not run the game application. It receives a WebRTC video stream from Amazon GameLift Streams, where the game renders on cloud GPU instances.

| Requirement | Detail |
|---|---|
| **Fire TV** | Primary target; Chromium-based browser with WebRTC support |
| **Samsung Tizen** | Browser with WebRTC support (thin client only — no WebGL needed) |
| **LG webOS** | Browser with WebRTC support (thin client only — no WebGL needed) |
| **Resolution** | 1080p at 60fps delivered via GameLift Streams |
| **Network** | Minimum 10 Mbps broadband (WiFi) |

### Controller (Phone)

| Requirement | Detail |
|---|---|
| **Platform** | Mobile browser (Chrome, Safari, Firefox) |
| **Connection** | QR code scan to join session; Socket.IO WebSocket to VGF server |
| **Features** | Displays private hole cards, betting controls, push-to-talk voice |
| **Minimum** | Any smartphone with a modern browser and microphone access |

### Cloud Rendering

| Requirement | Detail |
|---|---|
| **Service** | Amazon GameLift Streams |
| **Stream class** | `gen4n_high` — sufficient for the poker scene's modest rendering budget |
| **Runtime** | Windows Server 2022 |
| **Display Client Packaging** | Electron application compiled to a Windows executable |
| **Delivery** | WebRTC via GameLift Streams Web SDK |
| **Regions** | us-east-1, us-west-2, eu-west-1 (initial launch); expand based on demand |

---

# II. Game Design

## 5. Game Mechanics

Weekend Poker implements standard No-Limit Texas Hold'em with house rules tuned for a casual 4-player experience. The rules below are the definitive reference for implementation.

### 5.1 Core Rules

**Deck:** Standard 52-card deck, no jokers. Suits are equal (no ranking). Shuffle via Fisher-Yates algorithm before each hand.

**Hole Cards:** Each player receives 2 private cards dealt one at a time, clockwise, starting from the player to the left of the dealer button.

**Community Cards:** 5 shared cards dealt in stages — flop (3), turn (1), river (1). Burn one card before each stage.

**Best Hand:** Players form the best 5-card hand from any combination of their 2 hole cards and 5 community cards.

### 5.2 Hand Rankings (Strongest to Weakest)

| Rank | Hand | Description |
|------|------|-------------|
| 1 | Royal Flush | A, K, Q, J, 10 of the same suit |
| 2 | Straight Flush | Five consecutive cards of the same suit |
| 3 | Four of a Kind | Four cards of the same rank |
| 4 | Full House | Three of a kind + a pair |
| 5 | Flush | Five cards of the same suit |
| 6 | Straight | Five consecutive cards, mixed suits |
| 7 | Three of a Kind | Three cards of the same rank |
| 8 | Two Pair | Two different pairs |
| 9 | One Pair | Two cards of the same rank |
| 10 | High Card | Highest card wins |

**Tiebreakers:** Resolved by kickers (highest unpaired cards). Ace can be high (A-K-Q-J-10) or low (A-2-3-4-5) in straights but cannot wrap (Q-K-A-2-3 is not valid). Split pots when hands are exactly equal; odd chips go to the player closest to the left of the dealer button.

### 5.3 Table Positions (4-Player)

| Seat | Position | Role |
|------|----------|------|
| 1 | Button (Dealer) | Last to act post-flop |
| 2 | Small Blind (SB) | Posts half the big blind |
| 3 | Big Blind (BB) | Posts the minimum bet |
| 4 | Under the Gun (UTG) | First to act pre-flop |

Button rotates clockwise after each hand. When heads-up (2 players): the button is the small blind.

### 5.4 Blind Structure

| Level | Small Blind | Big Blind | Min Buy-in (20 BB) | Max Buy-in (100 BB) |
|-------|-------------|-----------|---------------------|----------------------|
| 1 | 5 | 10 | 200 | 1,000 |
| 2 | 10 | 20 | 400 | 2,000 |
| 3 | 25 | 50 | 1,000 | 5,000 |
| 4 | 50 | 100 | 2,000 | 10,000 |
| 5 | 100 | 200 | 4,000 | 20,000 |

Blinds are fixed for the session (no escalation). Player selects a blind level when creating the table.

### 5.5 Betting Actions

| Action | When Legal | Effect |
|--------|------------|--------|
| **Fold** | Any turn | Surrender hand; forfeit chips in pot |
| **Check** | No bet facing you | Pass action; stay in |
| **Bet** | No bet in current round | Place a wager (minimum: 1 big blind) |
| **Call** | Facing a bet/raise | Match the current bet |
| **Raise** | Facing a bet/raise | Increase the current bet |
| **All-In** | Any turn | Bet all remaining chips |

**Critical implementation rule:** "Bet" and "Raise" are not interchangeable. A player facing no bet can only bet (not raise). A player facing an existing bet can only raise (not bet). The game engine must enforce this distinction. For voice commands, if a player says "raise" when no bet is open, the system should interpret it as a bet (or prompt for clarification).

### 5.6 No-Limit Betting Rules

1. **Minimum bet:** 1 big blind
2. **Minimum raise:** Equal to the previous bet or raise increment (e.g., if BB is 10 and Player A raises to 30, increment is 20, so Player B must raise to at least 50)
3. **Maximum bet/raise:** Entire stack (all-in)
4. **All-in exception:** A player may go all-in for less than the minimum raise. This does not reopen betting to players who have already acted (unless the all-in constitutes a full raise)
5. **All-in under big blind:** An all-in for less than the big blind does not constitute a legal opening bet. Subsequent players must still act against the full big blind amount
6. **No cap on raises** in no-limit (action ends when all but one player is all-in)

### 5.7 All-In & Side Pots

When a player goes all-in for less than the current bet, side pots are created. The fundamental rule: a player can only win from each opponent an amount equal to their own investment.

**Side pot algorithm:**
1. Collect all players' bets, sorted ascending
2. For each unique bet level, calculate the difference from the previous level, multiply by eligible players — this forms a pot
3. Unmatched chips are returned
4. At showdown, evaluate from the main pot first (all eligible players), then each side pot in order

**Example (4 players, all different stacks):**

| Player | Stack | All-in |
|--------|-------|--------|
| A | 25 | 25 |
| B | 50 | 50 |
| C | 75 | 75 |
| D | 100 | Calls 75 |

Main Pot: 25 x 4 = 100 (A, B, C, D eligible). Side Pot 1: 25 x 3 = 75 (B, C, D). Side Pot 2: 25 x 2 = 50 (C, D). D gets 25 back.

### 5.8 Showdown

- Occurs after the river betting round if 2+ players remain
- All-in showdown: remaining community cards dealt, all hands shown
- Showdown order: last aggressor shows first; if no river bets, first active player clockwise from button
- **House rule:** All hands shown at showdown (no mucking). This is more entertaining and helps players learn

### 5.9 Cash Game & Rebuy Rules

| Rule | Setting |
|------|---------|
| Buy-in range | 20–100 big blinds |
| Rebuys | Between hands only; any amount within buy-in range |
| Auto-rebuy | Optional player setting (rebuys to max when below threshold) |
| Busting out | Must rebuy minimum or leave |
| Sitting out | Max 3 hands; not dealt cards; removed after timeout |
| Sitting out return | Wait for the big blind to reach naturally |

### 5.10 House Rules Summary

| Rule | Setting | Rationale |
|------|---------|-----------|
| Show all hands at showdown | ON | Entertainment and learning |
| Unlimited rebuys | ON | Keeps everyone playing |
| Straddle | OFF | Too complex for casual play |
| Antes | OFF | Blinds only |
| Run it twice | OFF | v2 consideration |
| Disconnection protection | Check/fold after timeout | Prevents stalling |
| Action timer | 30 seconds + 15-second time bank per hand | Balances pace and thinking |

---

## 6. Game Flow & Phase Design

The game is structured as VGF phases with automatic transitions driven by game state.

### 6.1 Phase Diagram

```
LOBBY
  |  (min 2 players ready)
  v
POSTING_BLINDS
  |
  v
DEALING_HOLE_CARDS
  |
  v
PRE_FLOP_BETTING --> [all fold but one] --> HAND_COMPLETE
  |                \
  |                 +-> [all remaining players all-in] --> ALL_IN_RUNOUT
  v
DEALING_FLOP
  |
  v
FLOP_BETTING --> [all fold but one] --> HAND_COMPLETE
  |             \
  |              +-> [all remaining players all-in] --> ALL_IN_RUNOUT
  v
DEALING_TURN
  |
  v
TURN_BETTING --> [all fold but one] --> HAND_COMPLETE
  |             \
  |              +-> [all remaining players all-in] --> ALL_IN_RUNOUT
  v
DEALING_RIVER
  |
  v
RIVER_BETTING --> [all fold but one] --> HAND_COMPLETE
  |
  v
SHOWDOWN
  |
  v
POT_DISTRIBUTION
  |
  v
HAND_COMPLETE --> [button rotation, rebuy phase] --> POSTING_BLINDS

ALL_IN_RUNOUT:
  Deal remaining community cards (no betting rounds)
  -> SHOWDOWN -> POT_DISTRIBUTION -> HAND_COMPLETE
```

### 6.2 Phase Descriptions

| Phase | Duration | Key Logic |
|-------|----------|-----------|
| **Lobby** | Until start | QR code display, player join/ready, bot selection |
| **Posting Blinds** | ~1s | Auto-post SB and BB; deduct from stacks |
| **Dealing Hole Cards** | ~2s | Shuffle, deal 2 cards per player with animation; store privately |
| **Pre-Flop Betting** | Variable | UTG acts first; BB has option to check or raise if no raise |
| **Dealing Flop** | ~2s | Burn 1, deal 3 community cards with animation |
| **Flop/Turn/River Betting** | Variable | First active player left of button acts first |
| **Dealing Turn/River** | ~1.5s | Burn 1, deal 1 community card with animation |
| **All-In Runout** | ~3–5s | All remaining community cards dealt in sequence with animation; no betting. All hands revealed face-up before dealing |
| **Showdown** | ~3s | Reveal all hands; evaluate best 5-card hands |
| **Pot Distribution** | ~2s | Award pots (main + side); announce winner(s) via TTS |
| **Hand Complete** | ~3s (default) | Rotate button; process rebuys; check sitting-out; inter-hand delay (default 3s, configurable 1–5s in settings); loop |

### 6.3 Phase Transitions

Transitions are driven by VGF's `endIf` conditions:

- **Betting phases end when:** All active players have acted and bets are equalised, or all but one player has folded
- **Dealing phases end when:** Animation completes and dealer TTS finishes
- **Showdown ends when:** All pots distributed and winner announcement complete
- **Hand Complete ends when:** Button rotated, rebuys processed, inter-hand delay elapsed (default 3 seconds, configurable 1–5 seconds via host settings), automatic transition to next hand

### 6.4 Betting Round Flow (State Machine)

```
[Start Round]
     |
     v
[Set Current Player = First to Act]
     |
     v
[Player's Turn] -----> [Timeout?] --> Auto-check or auto-fold
     |
     +--- Voice/Touch Input
     |         |
     |    [Validate Action]
     |         |
     |    [Legal?] -- No --> Error message, re-prompt
     |         |
     |        Yes
     |         |
     |    [Execute Action]
     |    [Dealer Confirms via TTS]
     |         |
     |    [Update State]
     |         |
     v
[Next Active Player (clockwise, skip folded/all-in)]
     |
     v
[All Players Acted & Bets Equal?]
     |
    Yes --> [End Betting Round]
    No  --> [Back to Player's Turn]
```

---

## 7. Voice Command Design

Voice is the primary input method. Players speak to the dealer; the dealer responds via TTS. The system must be forgiving with natural language while remaining precise about bet amounts.

### 7.1 Architecture

```
Player speaks (phone mic)
    |
    v
[Push-to-talk (v1: phone controller only)]
    |
    v
[Recognition Service SDK] --> Real-time STT (Deepgram primary, Google fallback)
    |
    v
[Intent Recognition (NLU)] --> Parsed intent + entities (action, amount)
    |
    v
[Game Engine Validation] --> Is the action legal?
    |
    v
[Action Execution] --> Update game state
    |
    v
[Dealer TTS Response] --> Spoken confirmation
```

### 7.2 Core Action Commands

| Intent | Canonical Form | When Legal |
|--------|---------------|------------|
| Fold | "Fold" | Player's turn |
| Check | "Check" | No bet facing player |
| Call | "Call" | Facing a bet |
| Bet | "Bet [amount]" | No bet in current round |
| Raise | "Raise to [amount]" | Facing a bet |
| All-In | "All in" | Any turn |

### 7.3 Table Management Commands

| Intent | Canonical Form | When Legal | Dealer Response |
|--------|---------------|------------|-----------------|
| Sit out | "Sit me out" / "Take a break" | Between hands | "[Player] is sitting out." |
| Deal me in | "Deal me in" / "I'm back" | While sitting out | "[Player] is back. You'll be dealt in next hand." |
| Rebuy | "Rebuy" / "Buy more chips" | Between hands, stack below max | "[Player] rebuys for [amount]." |
| Cash out | "Cash out" / "I'm done" / "Leave table" | Any time (executes between hands) | "[Player] cashes out with [amount]. Good game!" |
| Pause game | "Pause" / "Take a break everyone" | Host only, between hands | "Game paused. Say 'resume' when ready." |
| Resume game | "Resume" / "Let's go" | Host only, while paused | "Game on. Dealing next hand." |

### 7.4 Informational Commands (Any Time)

| Intent | Example Phrases | Response |
|--------|----------------|----------|
| Check pot | "What's the pot?" | Dealer announces current pot |
| Check stack | "How many chips do I have?" | Dealer announces player's stack |
| Check bet | "What's the bet?" | Dealer announces current bet |
| How much to call | "How much to call?" | Dealer announces the **additional** chips needed |
| Read my cards | "What do I have?" / "Show my cards" | Dealer reads player's hole cards aloud |
| Check blinds | "What are the blinds?" | Dealer announces blind levels |
| Show hand rankings | "Show hand rankings" | Visual overlay on screen |
| Repeat | "Repeat that" / "Say that again" | Dealer repeats last announcement |
| Help | "Help" / "What can I say?" | Brief list of available commands |

### 7.5 Natural Language Variations

The intent recognition system must accept a broad range of phrasings. Key examples:

- **Fold:** "I fold", "I'm out", "Muck it", "No thanks"
- **Check:** "Check", "Knock", "No bet", "I'm good"
- **Call:** "Call", "I'll call", "Match it", "Stay in"
- **Raise:** "Raise to [X]", "Make it [X]", "Bump it to [X]"
- **All-In:** "All in", "Shove", "Ship it", "Send it"

**Disambiguation rules:**
- "Pass" resolves to **check** if no bet is facing; prompts "Did you mean fold?" if a bet is active
- "Raise [amount]" defaults to "raise TO [amount]". If the amount is less than the current bet, interpret as "raise BY"
- "Raise" without an amount: dealer asks "How much?"

### 7.6 Bet Amount Parsing

| Format | Example | Parsed Amount |
|--------|---------|---------------|
| Exact number | "200" / "two hundred" | 200 |
| BB multiple | "3x" / "three times" | 3 x big blind |
| Pot fraction | "half pot" | pot / 2 |
| Pot-sized | "pot" | current pot |
| Minimum | "min raise" | minimum legal raise |
| Maximum | "all in" | player's full stack |

**v1 scope:** Support exact numbers (digits and words), BB multiples, and pot fractions. Do **not** support poker chip slang ("a buck", "a nickel", "a dime") in v1 — the risk of bet-amount misinterpretation is too high. Chip slang may be considered for v2 with extensive testing.

### 7.7 Confirmation Patterns

**Implicit confirmation (default):** The dealer repeats the action as confirmation. Player can object within 2 seconds.

**Explicit confirmation (critical actions):**
- All-in: always ("All in for 1,500. Are you sure?")
- Bets exceeding 50% of player's stack
- Raising to 10x+ the pot
- Leaving the table

**Confirmation phrases (any of these confirm the pending action):**
- "Yes", "Yeah", "Yep", "Sure", "Do it", "Confirm", "Go ahead", "Absolutely", "Send it"

**Cancellation phrases (any of these cancel the pending action):**
- "No", "Nope", "Cancel", "Never mind", "Wait", "Go back", "Undo", "Stop"

If neither confirmation nor cancellation is detected within 5 seconds, the action is cancelled and the player is re-prompted.

### 7.8 Undo / Correction Rules

| Action | Revocable? | Rule |
|--------|-----------|------|
| Fold | **No** — irrevocable | Standard poker rule. "Fold stands." |
| Check | Yes — within 2s | If no other player has acted since |
| Call | Yes — within 2s | Chips returned, player chooses again |
| Bet/Raise | Yes — within 2s | Chips returned if no subsequent action |
| All-In | Within explicit confirmation only | Confirmed = irrevocable |

### 7.9 Error Handling

| Attempt | Response |
|---------|----------|
| 1st failure | "Sorry, could you say that again?" |
| 2nd failure | "I didn't catch that. Try saying 'fold', 'call', or 'raise'." |
| 3rd failure | "Still having trouble. Your options are on screen — use your remote or phone." |
| Timeout (30s + 15s bank) | Auto-check (if legal) or auto-fold |

### 7.10 Multi-Player Voice Identification

**v1 approach: Turn-based gating.** The system processes voice input during a player's turn without needing to identify the speaker. The dealer announces whose turn it is. Out-of-turn **action** commands (fold, check, call, bet, raise, all-in) are rejected: "It's not your turn." However, **informational** commands (Section 7.4) and **table management** commands (Section 7.3) are accepted from any player at any time — these do not affect game state and do not require turn gating.

**v2 consideration:** Optional voice profiles via speaker diarisation for out-of-turn rejection.

### 7.11 Latency Budget

| Component | Target | Maximum |
|-----------|--------|---------|
| STT processing | 200ms | 500ms |
| Intent parsing | 50ms | 100ms |
| Game validation | 10ms | 50ms |
| TTS generation | 200ms | 500ms |
| **Total round-trip** | **~500ms** | **~1,200ms** |

---

## 8. AI Bot Design

AI bots fill empty seats with opponents that have distinct personalities and a clear difficulty progression. The system uses a hybrid architecture: rules-based decisions for Easy bots, LLM-driven decisions for Medium and Hard bots, and LLM-generated personality for all levels.

### 8.1 Difficulty Levels

| Level | Style | Decision Engine | Target Win Rate (for opponent) |
|-------|-------|-----------------|-------------------------------|
| **Easy** | Loose-Passive | Rules-based + randomness | 60–70% for a beginner |
| **Medium** | Tight-Aggressive (TAG) | LLM-driven (Claude Sonnet 4.5) | 45–55% for an intermediate |
| **Hard** | Loose-Aggressive (LAG) | LLM-driven (Claude Opus 4.6) | 35–45% for an experienced player |

### 8.2 Why Hybrid Architecture

LLMs cannot reliably play badly on purpose — they are trained to be helpful and correct. Instructing an LLM to "make mistakes" produces inconsistent, non-human errors. The hybrid approach solves this:

- **Easy bots:** Rules engine makes all poker decisions with controlled randomness. The LLM only generates chat/personality responses. This guarantees consistent, beatable play.
- **Medium/Hard bots:** Full LLM decision-making. Instructions align with the model's natural reasoning ("play solidly" for Medium, "play aggressively and exploit" for Hard).

### 8.3 Easy Bot Behaviour

- Plays 60–70% of hands (far too many)
- Calls too often ("calling station")
- Rarely raises; folds to large bets with weak hands
- Doesn't bluff intentionally (**~5% bluff frequency** — accidental bluffs only)
- No position awareness; no opponent tracking
- Occasionally makes obvious mistakes (e.g., checking the nuts)

**Pre-Flop Strategy Table (Rules Engine):**

| Hand Tier | Examples | Action |
|-----------|---------|--------|
| Premium (top 5%) | AA, KK, QQ, AKs | Raise 3x BB (always) |
| Strong (top 15%) | JJ, TT, AQs, AKo | Raise 2.5x BB (80%), call (20%) |
| Playable (top 40%) | Any pair, suited connectors, Ax suited | Call (90%), fold (10%) |
| Marginal (top 70%) | Any two suited, any connector, Kx | Call (70%), fold (30%) |
| Junk (bottom 30%) | Unconnected off-suit low cards | Call (40%), fold (60%) |

**Post-Flop Strategy Table (Rules Engine):**

| Hand Strength | Board Texture | Action |
|--------------|---------------|--------|
| Monster (trips+, top two pair) | Any | Bet 50% pot (70%), check-call (30% — accidental slow-play) |
| Strong (top pair good kicker, overpair) | Any | Bet 50% pot (50%), check-call (50%) |
| Medium (middle pair, weak top pair) | Dry | Check-call (80%), fold to big bet (20%) |
| Medium (middle pair, weak top pair) | Wet/scary | Check-call (60%), fold (40%) |
| Draw (flush draw, open-ended straight) | Any | Check-call (90%), fold (10%) |
| Nothing (missed completely) | Any | Check-fold (95%), accidental bluff (5%) |

For full implementation detail, refer to the strategy tables in `docs/research/ai-bots.md` Section 3 (Easy Bot Decision Trees).

### 8.4 Medium Bot Behaviour

- Plays 25–35% of hands; position-aware
- Raises with strong hands, folds weak ones
- Continuation-bets with frequency adjusted by opponents: ~65–75% heads-up, ~40–50% vs 2, ~25–35% vs 3
- Semi-bluffs with draws (~20% bluff frequency)
- Standard bet sizing (50–75% pot)
- Folds to sustained pressure without a strong hand
- Basic opponent tracking (VPIP, PFR, aggression)

### 8.5 Hard Bot Behaviour

- Plays 40–50% of hands; wide but deliberate range
- Aggressive betting with both value hands and bluffs (~35% bluff frequency)
- Varies bet sizing to disguise hand strength
- Multi-street bluffs when the board story supports it
- Exploits opponents based on tracked patterns
- Occasionally slow-plays monster hands
- Full opponent profiling with adaptive strategy

### 8.6 Bot Personalities

Each bot has a distinct character expressed through TTS chat, timing, and play style. Example profiles:

**Easy:**
- *Sunny Sam* — Cheerful optimist. "Ooh, nice cards!" / "Can't win 'em all!"
- *Cautious Carol* — Nervous beginner. "I'll just call, I suppose..." / "Sorry, still learning!"
- *Chatty Charlie* — Social player. "Here we go again!" / "You're bluffing, I can tell!"

**Medium:**
- *Steady Eddie* — Solid regular. Calm, measured. "Fair enough." / "Good hand."
- *Cool Katie* — Confident recreational. "Let's make this interesting." / "Nice try."

**Hard:**
- *The Viper* — Cold shark. Minimal. "Raise." / "..."
- *Lucky Luke* — Charismatic risk-taker. "Let's gamble." / "What's life without a little risk?"
- *Professor Pat* — Analytical strategist. "Interesting spot." / "The maths says yes."

### 8.7 Making Bots Feel Human

**Timing variation:**

| Decision | Easy Bot | Medium Bot | Hard Bot |
|----------|----------|------------|----------|
| Obvious fold | 0.5–1.5s | 0.5–1.5s | 0.5–1s |
| Standard call | 1–2s | 1–3s | 1–2s |
| Standard raise | 1.5–3s | 2–4s | 1–3s |
| Big decision | 3–6s | 4–8s | 3–7s |

Artificial delay = target time minus actual processing time. LLM response `confidence` field modulates timing: high confidence (0.8–1.0) responds faster; low confidence (0.2–0.5) takes longer.

**Behavioural tells:**
- Easy bots: obvious tells (quick call = strong hand; long pause before bet = bluffing)
- Medium bots: subtle tells (chat before big bet = distraction)
- Hard bots: false tells (deliberately misleading timing)

**Emotional state:** Track tilt (0–1), confidence (0–1), and boredom (0–1) per bot. Losing big pots increases tilt; Easy bots tilt heavily (play even looser), Hard bots barely tilt.

**Chat frequency matrix:**

| Event | Easy | Medium | Hard |
|-------|------|--------|------|
| After folding | 40% | 15% | 5% |
| After calling | 50% | 20% | 10% |
| After raising | 60% | 30% | 15% |
| After winning a pot | 80% | 40% | 25% |
| After losing a big pot | 70% | 30% | 10% |
| After opponent all-in | 50% | 25% | 20% |
| During idle / waiting | 30% | 10% | 5% |

Frequencies are base rates; emotional state modulates: high tilt increases chat by +20%, high boredom increases by +10%. Capped at 90% to avoid every action triggering chat.

### 8.8 Bot Rebuy Policy

| Rule | Easy | Medium | Hard |
|------|------|--------|------|
| Auto-rebuy on bust | Yes, always | Yes, always | Yes, always |
| Rebuy amount | Max buy-in (100 BB) | Max buy-in (100 BB) | Varies: 60–100 BB |
| Top-up between hands | Never | Below 50 BB | Below 40 BB |
| Leave the table | Never | Never | Never |
| Post-rebuy behaviour | Immediately normal | Tighter for 2–3 hands | Cautious for 3–5 hands |

Bots always rebuy and never leave. This keeps all seats filled for a consistent experience.

### 8.9 Bot Fill Behaviour

Bots automatically fill empty seats to maintain a playable table:

| Trigger | Behaviour |
|---------|-----------|
| Session start | Host selects number and difficulty of bots in lobby. Remaining empty seats are filled to reach 4 players |
| Player leaves mid-session | Bot fills the vacated seat at the start of the next hand |
| Player sits out for 3+ hands | Bot does **not** replace them — seat stays reserved until removal |
| Player removed (timeout) | Bot fills seat at next hand |
| All seats occupied | No bots added |

**Host controls:**
- **Lobby:** Host chooses bot count (0–3) and difficulty per bot. Personality is randomly assigned from the difficulty pool (host sees a "re-roll" button to get a different personality)
- **Mid-session:** Host can say "Remove [bot name]" to open a seat or "Add a [difficulty] bot" to fill one. Changes take effect between hands
- **Auto-fill setting (default ON):** When enabled, departing human players are automatically replaced by a bot at the last-configured difficulty. Host can toggle this off ("No more bots")
- **Minimum players:** If auto-fill is off and player count drops below 2, the game pauses until a player joins or the host adds a bot

### 8.10 LLM Integration

**Pre-computed hand analysis:** LLMs cannot reliably calculate hand rankings or pot odds. The game engine pre-computes hand strength, draws, outs, pot odds, and board texture, then feeds these as facts in the prompt. This is the single most important decision for bot quality.

**Structured output:** LLM returns JSON with `thinking`, `action`, `amount`, `chat`, and `confidence` fields. Use constrained decoding or function calling.

**LLM temperature:**

| Difficulty | Temperature | Rationale |
|------------|-------------|-----------|
| Easy (chat only) | 0.9–1.0 | Varied, colourful chat |
| Medium | 0.4–0.6 | Consistent, solid decisions |
| Hard | 0.2–0.4 | Precise decisions; occasional 0.6–0.8 for creative bluffs |

**Fallback:** If the LLM times out or fails, a rules-based fallback decides: strong hand = bet/raise, draw = check/call, nothing = check/fold.

### 8.11 Cost Optimisation

| Difficulty | Model | LLM Role | Approx. Cost per Decision |
|------------|-------|----------|--------------------------|
| Easy | Claude Haiku 4.5 | Chat only (decisions are rules-based) | Very low |
| Medium | Claude Sonnet 4.5 | Full decision + chat | Low |
| Hard | Claude Opus 4.6 | Full decision + chat | Moderate |

Additional savings: pre-flop lookup tables eliminate ~30% of LLM calls; system prompts cached; short context for Easy bots.

---

## 9. Dealer System

The dealer is the game's voice — every state change, action, and announcement flows through them.

### 9.1 Dealer Announcements

| Event | Dealer Says |
|-------|-------------|
| New hand | "New hand. [Player] is the dealer." |
| Blinds posted | "Blinds are in. [SB], [amount]. [BB], [amount]." |
| Hole cards dealt | "Cards are out. [UTG], you're first to act." |
| Flop | "The flop: [card], [card], [card]." |
| Turn | "The turn: [card]." |
| River | "The river: [card]." |
| Player folds | "[Player] folds." |
| Player checks | "[Player] checks." |
| Player calls | "[Player] calls [amount]." |
| Player bets | "[Player] bets [amount]." |
| Player raises | "[Player] raises to [amount]." |
| Player all-in | "[Player] is all in for [amount]." |
| Turn prompt (no bet) | "[Player], it's on you. You can check or bet." |
| Turn prompt (facing bet) | "[Player], [amount] to call." |
| Time warning | "[Player], ten seconds." |
| Timeout | "[Player] checks." / "[Player] folds." |
| Winner | "[Player] wins [amount] with [hand name]." |
| All fold | "[Player] takes it down." |

### 9.2 Dealer Roster

The game features **multiple dealer characters**, each with a distinct name, appearance, voice, and personality. The host selects a dealer in the lobby, and the dealer can be changed between hands mid-session. Different dealers keep multi-session play fresh.

#### Dealer Characters (v1 — minimum 4)

| Dealer | Age | Gender | Personality | Tone | Example Line |
|---|---|---|---|---|---|
| **Vincent** | 50s | Male | Old-school professional | Austere, precise, no-nonsense. Classic casino dealer who's seen it all. | "The bet is 200 to you, Sarah. Clock is running." |
| **Maya** | 30s | Female | Warm and encouraging | Friendly, supportive, makes new players feel welcome. Genuinely happy when anyone wins. | "Nice call, Marcus! That took some nerve — and it paid off." |
| **Remy** | 40s | Male | Witty and playful | Quick with banter, light sarcasm, keeps the energy up. Never mean-spirited. | "Three all-ins before the flop? Must be something in the water tonight." |
| **Jade** | 20s | Female | Cool and dramatic | Builds tension, theatrical delivery, makes every hand feel like a main event. | "And the river... is the ace of spades. Oh, this changes everything." |

#### Shared Dealer Rules (All Personalities)

- **Never reveals hidden information** or gives strategic advice
- **Always announces game state accurately** — personality affects *how*, not *what*
- **Uses player names** in every turn prompt and action confirmation
- **Adapts commentary volume** to the moment — more talkative during big pots, quieter during routine hands

#### Personality Calibration System

The design team can tune each dealer's behaviour through a configuration object:

```typescript
interface DealerPersonality {
  id: string
  name: string
  age: string
  gender: string
  appearance: string // description for 3D model/Meshy prompt
  voiceId: string // TTS voice identifier
  commentaryFrequency: number // 0.0 (silent) to 1.0 (chatty) — how often they add flavour beyond required announcements
  humourLevel: number // 0.0 (austere) to 1.0 (playful) — tone of optional commentary
  dramaticTension: number // 0.0 (matter-of-fact) to 1.0 (theatrical) — how much they build suspense
  encouragement: number // 0.0 (neutral) to 1.0 (supportive) — warmth towards players
  formality: number // 0.0 (casual) to 1.0 (formal) — language register
  catchphrases: string[] // signature lines used occasionally
  bigMomentLines: string[] // lines for all-ins, big pots, dramatic reveals
  winLines: string[] // celebration lines when a player wins
  idleLines: string[] // lines during quiet moments or when a player is thinking
}
```

These parameters allow the design team to create new dealers or adjust existing ones without code changes — only the configuration data and TTS voice assignment change. Each dealer's dialogue is generated by combining the structured game announcements with personality-driven LLM prompts using these calibration values.

#### Dealer Selection

- **Lobby:** Host selects a dealer from the roster. Preview shows name, portrait, and a sample voice clip.
- **Mid-session:** Host can change the dealer between hands ("Switch dealer" voice command or phone button). The new dealer introduces themselves: "Evening, everyone. I'm Remy — I'll be taking over from here."
- **Random option:** "Surprise me" — randomly assigns a dealer. Good for repeat play.

### 9.3 Bot Chat Integration

Bot chat and dealer announcements share audio output but must not overlap:

1. Dealer action confirmation plays **first** (e.g., "Sunny Sam calls 60.")
2. Bot's chat message plays **after** dealer finishes (e.g., "Ooh, I've got a good feeling!")
3. Each bot has its own distinct TTS voice
4. Dealer has higher priority — bot chat may be truncated if the game needs to advance
5. Bot chat is slightly quieter than dealer announcements

### 9.4 TTS Requirements

- Latency: < 500ms for short phrases
- Natural prosody (not robotic); SSML support for emphasis and pacing
- Pre-generate common phrases ("Check", "Your turn", "All in!") for zero latency
- Dynamic phrases (player names, amounts) require real-time generation. Player names are entered at join (voice or typed) and must be pronounced naturally by the TTS engine — test common names and handle unusual spellings gracefully
- **Multiple dealer voices required** — each dealer character needs a distinct TTS voice that matches their personality and demographics. At minimum 4 distinct voices for the v1 roster. Voice selection is driven by `DealerPersonality.voiceId`
- Options: In-house TTS service (recognition-service repo), ElevenLabs, Amazon Polly, Google Cloud TTS

---

# III. User Experience

## 10. Display (TV) UI/UX

The TV shows the shared game — the 3D poker table, community cards, pot, player positions, and dealer narration. It never shows any player's private hole cards.

### 10.1 Design Philosophy

- **Legible at 3 metres:** Minimum 24px at 1080p; 32px preferred. Bold/medium weights only. No thin fonts
- **Premium aesthetic:** Art-deco brass frames, dark felt backgrounds, warm lighting
- **High contrast:** Ivory text (#F5F2ED) on dark backgrounds
- **TV safe zone:** All critical UI within 90% safe area (96px margin left/right, 54px top/bottom at 1080p)
- **Colour-blind accessible:** Never rely on colour alone — every colour-coded element has a text label, icon, or pattern

### 10.2 3D Table View

The default camera is a slightly elevated 45-degree bird's-eye view centred on the pot. Theatre.js manages camera transitions between phases (e.g., zoom to community cards on flop reveal, close-up on all-in showdown).

Key 3D elements visible on TV:
- Oval poker table with green felt, mahogany rim, leather rail
- 4 player positions with avatar frames and chip stacks
- Community cards in the centre
- Physical chip piles for pot and side pots
- Dealer avatar (upper body) behind the table
- Brass-framed placards showing bet amounts and pot total
- Atmospheric lighting, subtle particle effects (dust motes, cigar smoke)

### 10.3 HUD Elements

| Element | Position | Content |
|---------|----------|---------|
| Player info cards | At each seat | Avatar, name, chip count, current action |
| Pot display | Centre, above community cards | Chip pile + brass placard with total |
| Side pot display | Offset from main pot | Separate chip pile + "SIDE POT: $X" placard |
| Dealer speech bubble | Near dealer | Current announcement / action confirmation |
| Voice command hints | Bottom-left | "Say: Check, Fold, Raise [amount]" (60% opacity, fades after 3s) |
| Turn timer | Around active player's frame | Circular arc depleting clockwise (gold > amber > red) |
| Community cards | Centre table | Dealt face-down, flipped with animation; gold edge-glow on reveal |

### 10.4 Player Info Card

Each seat displays:
- Circular avatar in ornate 3D frame
- Player name (ivory, 28px)
- Chip count (gold, 32px)
- Current action indicator (bottom strip): fold = grey, check = green, call = blue, raise = gold, all-in = pulsing red — **each with text label**

### 10.5 Lobby View

- QR code prominently displayed for phone scanning
- Connected players shown with name, avatar, ready status
- **Dealer selection panel (host controls):**
  - Dealer roster displayed as portrait cards with name, personality tag (e.g., "Vincent — The Professional")
  - Tap a dealer to hear a voice sample and see a personality preview
  - "Surprise Me" option for random selection
- **Bot selection panel (host controls):**
  - Number of bots: 0–3 (slider or +/- buttons)
  - Per-bot difficulty: Easy / Medium / Hard (tap to cycle)
  - Personality is randomly assigned from the difficulty pool; host sees bot name and personality preview (e.g., "Sunny Sam — Cheerful optimist")
  - "Re-roll" button per bot slot to get a different personality from the same difficulty tier
  - v1 does **not** allow the host to choose a specific personality — only difficulty. Personality selection is a v2 feature
- Blind level selection
- "Start Game" button (host only, requires min 2 players)

---

## 11. Controller (Phone) UI/UX

The phone is each player's private window into the game. It shows their hole cards and provides betting controls.

### 11.1 What the Phone Shows

- **Hole cards:** Player's 2 private cards, displayed prominently
- **Betting controls:** Touch buttons for Fold, Check/Call, Raise (with amount slider/input), All-In
- **Push-to-talk button:** Hold to speak a voice command (v1 listening mode — always push-to-talk; open-mic / hybrid listening deferred to v2)
- **Status bar:** Chip count, current blind level, whose turn it is
- **Turn indicator:** Clear visual when it's this player's turn
- **Voice feedback:** Real-time transcript display as player speaks

### 11.2 Betting Controls Layout

```
+----------------------------------+
|   [Ah]  [Kd]   Your Cards       |
|                                  |
|   Stack: $2,450  |  Pot: $850   |
|                                  |
|  [FOLD]   [CHECK/CALL $200]     |
|                                  |
|  [RAISE ---|----|----- $500]    |
|            min        max        |
|                                  |
|  [ALL IN $2,450]                |
|                                  |
|  [ HOLD TO SPEAK ]              |
+----------------------------------+
```

- Buttons are context-sensitive: only legal actions appear
- Raise slider with min/max bounds and preset buttons (2x, 3x, pot, half-pot)
- All-In has a visual break / distinct styling as a "dangerous" action

### 11.3 Lobby Flow (Phone)

1. Scan QR code from TV
2. Phone opens controller web app
3. **Enter name** — two input methods:
   - **Voice:** Player says their name; recognition service transcribes it; player confirms ("That's right" / "No, it's..."). Dealer greets them: "Welcome to the table, [name]."
   - **Type:** Standard text input on phone. Fallback if voice fails or player prefers.
   - Name is stored in `SessionMember.state.displayName` and used by the dealer throughout the session (turn prompts, action confirmations, winner announcements).
   - Max 20 characters. Profanity filter applied.
4. Select avatar
5. Tap "Ready"
6. Wait for host to start game

---

## 12. Onboarding & Tutorial

### 12.1 First-Time Experience

1. **TV launch:** Intro cinematic (8s pre-rendered video) showing a premium poker room
2. **QR code:** Prominent display with instructions: "Scan with your phone to join"
3. **Phone join:** Clean, fast connection flow; name entry via voice or keyboard; avatar selection
4. **Quick tutorial (optional):** 2-minute guided hand with Easy bot, teaching:
   - How to speak commands ("Say 'call' to match the bet")
   - How to use phone controls as fallback
   - Basic hand rankings (visual overlay)
5. **Dealer guidance:** During first few hands, dealer provides extra context ("That's a pair of kings — a strong hand!")

### 12.2 Voice Command Training

- First-time players see voice command hints on both TV and phone
- Dealer occasionally reminds players of available commands
- After 3 failed voice attempts, visual controls are highlighted
- "Help" command always available to list options

---

## 13. Session Flow

### 13.1 Complete Session Lifecycle

```
1. TV app launches
2. Player presses "New Game" on TV remote
3. Display creates VGF session -> server returns sessionId
4. QR code displayed on TV with session URL
5. Players scan QR code -> phones connect as Controllers
6. Each player enters name (voice or type on phone), selects avatar, taps Ready
7. Host selects dealer character, blind level, and bot configuration
8. Host starts game (min 2 players/bots)
9. Game loop begins (see Phase Design, Section 6)
10. Between hands: rebuys, sitting out, new players joining
11. Players leave at any time ("Cash out" voice command or phone button)
12. Bots fill empty seats automatically
13. Host can end session ("End game" on TV or phone)
14. Session summary displayed (total chips won/lost, hands played, best hand)
```

### 13.2 Session Summary Screen

When the host ends the session or all players cash out, both TV and phone display a session summary:

**TV (Display) — Session Summary:**
- Leaderboard showing all players ranked by net profit/loss
- Per-player stats: hands played, hands won, biggest pot, best hand
- Session totals: hands played, duration, total pots dealt
- Highlight reel: "Hand of the Night" (largest pot), "Bluff of the Night" (biggest successful bluff), "Bad Beat" (strongest losing hand)
- "New Game" button to restart, "Exit" to return to main menu

**Phone (Controller) — Personal Summary:**
- Player's net result (chips won/lost), prominently displayed
- Personal stats: hands played, win rate, voice vs touch ratio, favourite action
- Best hand of the session (with card images)
- "Play Again" button, "Leave" button

### 13.3 Mid-Session Events

| Event | Handling |
|-------|---------|
| Player joins mid-game | Waits for next big blind position |
| Player disconnects | Auto-fold after 30s; seat held for 3 hands |
| Player reconnects | Socket.IO restores session; `sessionMemberId` is stable |
| Player leaves | Seat opened; bot fills if below minimum |
| Player sits out | Not dealt cards; removed after 3 hands of inactivity |
| All humans leave | Game pauses; resumes when a human reconnects |

---

# IV. Technical Architecture

## 14. System Architecture

### 14.1 High-Level Architecture

```
                    Smart TV / Fire TV (Thin Client)
                    +----------------------------------+
                    |  Browser -> WebRTC video/audio    |
                    |  (GameLift Streams Web SDK)       |
                    +----------------+-----------------+
                                     | WebRTC
                                     v
    GameLift Streams Cloud GPU Instance
    +--------------------------------------------------+
    |  React App (Display Client)                      |
    |  React Three Fiber + Three.js (3D rendering)     |
    |  Theatre.js (animations)                         |
    |  VGF Client SDK (Socket.IO -> VGF Server)        |
    |  TTS audio playback                              |
    +----------------+---------------------------------+
                     | Socket.IO
                     v
    VGF Game Server (Node.js)
    +--------------------------------------------------+
    |  @volley/vgf v4.3.1                              |
    |  Game Ruleset (phases, reducers, thunks)          |
    |  Poker Engine (hand eval, side pots, rules)       |
    |  AI Bot Manager (LLM calls, rules engine)         |
    |  Express HTTP (session API)                       |
    |  Socket.IO (real-time state broadcast)             |
    +------+----------+----------+---------------------+
           |          |          |
           v          v          v
        Redis      LLM API   Recognition
        (state,    (Claude,   Service
        scheduler) GPT-4)    (STT/TTS)
                              |
                              | WebSocket
                              v
                    Mobile Phone (Controller)
                    +----------------------------------+
                    |  React App (Controller Client)   |
                    |  VGF Client SDK (Socket.IO)      |
                    |  Recognition Client SDK           |
                    |  Mic capture + voice commands     |
                    |  Private card display             |
                    |  Betting controls                 |
                    +----------------------------------+
```

### 14.2 Component Responsibilities

| Component | Technology | Responsibility |
|-----------|-----------|---------------|
| **Display Client** | React 19 + R3F + Theatre.js | 3D rendering, animations, shared game view, TTS playback |
| **Controller Client** | React 19 + VGF hooks | Private cards, betting controls, voice input |
| **VGF Server** | Node.js 22 + @volley/vgf (`FailoverVGFServiceFactory`) | Game state, phase management, validation, broadcast |
| **Poker Engine** | TypeScript (server-side) | Hand evaluation, pot calculation, rules enforcement |
| **Bot Manager** | TypeScript + LLM APIs | Bot decisions, personality, timing, chat generation |
| **Recognition Service** | @volley/recognition-client-sdk | Speech-to-text via Deepgram/Google STT |
| **TTS Service** | In-house or external API | Text-to-speech for dealer and bot voices |
| **Redis** | ioredis | Session persistence, scheduler state |
| **GameLift Streams** | AWS | Cloud rendering, WebRTC delivery to TV |

### 14.3 GameLift Streams Session Lifecycle

```
1. TV app launches (Fire TV browser or thin client wrapper)
2. TV app calls backend API to create a GameLift Streams session
   -> Backend calls GameLift Streams CreateStreamSession API
   -> Specifies stream group, application ARN, target region
3. GameLift Streams provisions a cloud GPU instance
   -> Installs and launches the Display client application (React + R3F)
4. GameLift Streams returns a stream session URL + signal endpoint
5. TV app initialises GameLift Streams Web SDK with the session URL
   -> WebRTC connection established (video + audio downstream, input upstream)
6. Display client boots on the cloud GPU:
   a. Loads 3D scene and assets (from CDN)
   b. Initialises VGF client SDK
   c. Creates a VGF game session via VGF server HTTP API
   d. Receives sessionId + QR code URL
   e. Renders lobby with QR code (streamed to TV via WebRTC)
7. Players scan QR code -> phone Controller connects to VGF server via Socket.IO
8. Game proceeds (VGF manages all state; Display renders; TV receives stream)
9. Session ends:
   a. Host says "End game" or all players leave
   b. Display client notifies backend
   c. Backend calls GameLift Streams TerminateStreamSession
   d. Cloud GPU instance released
```

**Key points:**
- The TV never runs the game — it is a WebRTC viewer only
- The Display client on the cloud GPU is the "real" game renderer
- VGF server runs separately from GameLift Streams (on EKS) — the Display client connects to it via Socket.IO like any other VGF client
- GameLift Streams sessions are 1:1 with game sessions; session timeout should be set generously (e.g., 4 hours) to support long poker nights

### 14.4 Transport Separation

| Data Flow | Protocol | Layer |
|-----------|----------|-------|
| Game state sync (all clients) | Socket.IO WebSocket | VGF framework |
| Game video/audio to TV | WebRTC | GameLift Streams SDK |
| Voice audio from phone | WebSocket | Recognition Service SDK |
| LLM API calls | HTTPS | Server-side only |

**Clarification:** GameLift Streams uses WebRTC to deliver the rendered game video to the TV. This is entirely managed by the GameLift Streams SDK. The game code does not interact with WebRTC directly. VGF's Socket.IO handles all game state synchronisation independently.

**VGF Server class:** Production deployments must use `FailoverVGFServiceFactory` (not the base `VGFServiceFactory`). This provides automatic Redis failover and reconnection, which is essential for session durability during ElastiCache maintenance or transient failures.

**Public endpoint:** The VGF server must be reachable via a public HTTPS/WSS endpoint (e.g., `wss://poker-api.example.com`). Both the Display client (running inside GameLift Streams on an AWS cloud GPU) and the Controller client (running on players' phones on their home network) connect to this endpoint via Socket.IO. An Application Load Balancer (ALB) with sticky sessions (Socket.IO requires it) fronts the VGF server pods on EKS.

---

## 15. State Management

### 15.1 Game State Schema

The poker game state extends VGF's `BaseGameState`:

```typescript
interface PokerGameState extends BaseGameState {
  phase: PokerPhase
  players: PokerPlayer[]
  communityCards: Card[]
  pot: number
  sidePots: SidePot[]
  currentBet: number
  dealerIndex: number // seat index of the dealer button
  activePlayerIndex: number
  blindLevel: BlindLevel
  handNumber: number
  dealerCharacterId: string // which dealer character is active (e.g., 'vincent', 'maya')
  deck: Card[] // server-only; not broadcast
}

interface PokerPlayer {
  id: string
  name: string
  stack: number
  bet: number
  holeCards: [Card, Card] // private -- see Section 15.2
  status: 'active' | 'folded' | 'all-in' | 'sitting-out'
  isBot: boolean
  botConfig?: BotConfig
}
```

### 15.2 Private State Handling

VGF broadcasts full game state to all clients. For hole cards:

**Approach:** Store each player's hole cards in VGF's `SessionMember.state` (per-member state). The controller UI only renders the owning player's cards. Other players' cards are present in state but not displayed.

**Security note:** A technically savvy player could inspect WebSocket messages to see opponents' cards. For a casual game, this is an acceptable trade-off — players would need browser developer tools to extract the data, which is impractical during normal play. For competitive play, server-side redaction or encryption would be required (v2 consideration).

**Note:** VGF's legacy `actions` field in the game ruleset is **deprecated** as of VGF v4.x. All state mutations must be implemented as **reducers** (pure, synchronous state updates) and **thunks** (async operations). Do not use `actions` — they are retained for backwards compatibility only and will be removed in a future version.

### 15.3 Reducers (Pure State Updates)

- `placeBet(playerId, amount)` — Deduct from stack, add to player's bet and pot
- `fold(playerId)` — Set player status to folded
- `dealCommunityCards(cards)` — Add cards to community cards
- `rotateBlinds()` — Move dealer button, set new SB/BB
- `updatePot(amount)` — Adjust pot total
- `awardPot(playerId, amount)` — Add chips to winner's stack

### 15.4 Thunks (Async Operations)

- `startHand()` — Shuffle deck, deal hole cards, post blinds, transition to pre-flop
- `processPlayerAction(playerId, action, amount)` — Validate, execute, check end conditions
- `processVoiceCommand(transcript)` — Parse intent, validate, dispatch action
- `evaluateHands()` — Determine winner(s), handle side pots
- `distributePot()` — Award chips, announce via TTS
- `botDecision(botId)` — Build context, call LLM (or rules engine), parse response, execute
- `autoFoldPlayer(playerId)` — Timeout handler for disconnected/idle players

### 15.5 Scheduler Usage

- **Action timer:** `upsertTimeout("action-timer:{playerId}", 30_000)` — auto-check/fold
- **Time bank warning:** `upsertTimeout("time-warning:{playerId}", 20_000)` — "Ten seconds"
- **Bot thinking delay:** `upsertTimeout("bot-action:{botId}", delay)` — simulate thinking
- **Sit-out timer:** `upsertTimeout("sit-out:{playerId}", handCount)` — remove after 3 hands
- **Disconnect timer:** `upsertTimeout("disconnect-fold:{clientId}", 30_000)` — auto-fold

---

## 16. Voice Pipeline

### 16.1 End-to-End Flow

```
1. Player taps "speak" on phone (push-to-talk)
2. Phone MediaRecorder captures audio (PCM Linear16, 16kHz, mono)
3. Audio chunks streamed to SimplifiedVGFRecognitionClient
4. Recognition SDK sends to service (Deepgram primary, Google fallback)
5. Partial transcripts displayed on phone as player speaks
6. Player releases button (or auto-stop on keyword match)
7. Final transcript returned with confidence score
8. Game server parses intent: action + entities (amount)
9. Server validates against current game state
10. If valid: execute action, broadcast state, dealer confirms via TTS
11. If invalid: dealer explains why and re-prompts
```

### 16.2 Recognition Configuration

```typescript
const pokerRecognitionConfig = {
  provider: RecognitionProvider.DEEPGRAM,
  model: 'nova-2',
  language: 'en',
  sampleRate: 16000,
  encoding: AudioEncoding.LINEAR16,
  interimResults: true,
}
```

### 16.3 Keyword Boosting (Slot Maps)

Configure per-phase slot maps to boost poker vocabulary recognition accuracy:

| Phase | Slot Map |
|-------|----------|
| Lobby | `['ready', 'start', 'settings', 'easy', 'medium', 'hard']` |
| Betting | `['check', 'call', 'raise', 'fold', 'all in', 'bet', 'pot', 'half pot'] + amount values` |
| Showdown | `['next hand', 'leave table', 'rebuy']` |

### 16.4 Noise and Echo Considerations

- Push-to-talk mitigates most ambient noise issues
- Acoustic echo cancellation (AEC) may be needed: TV speakers play dealer TTS while phone mic is active
- Recognition service's Deepgram provider handles noise robustly
- Fallback to phone touch controls after 3 failed voice attempts

---

## 17. 3D Rendering

### 17.1 Technology Stack

| Technology | Role |
|-----------|------|
| React Three Fiber (`@react-three/fiber`) | React integration for Three.js |
| Three.js | Underlying WebGL renderer |
| `@react-three/drei` | Camera controls, environment maps, text, helpers |
| `@react-three/postprocessing` | Bloom, vignette post-processing |
| Theatre.js (`@theatre/r3f`) | Animation sequencing |
| GameLift Streams | Cloud GPU rendering; output streamed to TV |

### 17.2 Rendering Approach

The Display client runs on a GameLift Streams cloud GPU instance (`gen4n_high`), not on the TV. This means:

- **No TV WebGL constraints** — rendering is bounded by the cloud GPU
- **Higher fidelity possible** — more polygons, better post-processing, complex shaders
- **Consistent experience** — identical quality across all TV models
- **Post-processing viable** — bloom, vignette, tone mapping all feasible

### 17.3 Performance Optimisation

| Technique | Application |
|-----------|-------------|
| Instanced rendering | Chip stacks (many identical meshes) |
| Texture atlas | Card faces (52 cards in single draw call) |
| Static geometry merging | Room shell, furniture |
| `MeshStandardMaterial` | Most surfaces (cheaper than `MeshPhysicalMaterial`) |
| `MeshPhysicalMaterial` | 2–3 hero objects only (whisky glass, table rim clear-coat) |
| KTX2/Basis texture compression | All textures |
| HDRI at 256px | Ambient reflections (low memory) |
| Single 1024px shadow map | Pendant light only; PCFShadowMap (not PCFSoft) |

### 17.4 Scene Budget

| Metric | Target |
|--------|--------|
| Total triangles | < 85,000 |
| Draw calls | < 150 |
| Texture memory | < 128 MB |
| Target frame rate | 60fps (cloud GPU) |
| Max simultaneous particles | 50 |
| Post-processing | Bloom + Vignette + ACESFilmic tone mapping |

---

## 18. Animation System

### 18.1 Theatre.js Integration

Theatre.js provides a visual timeline editor for authoring cinematic animations, integrated with React Three Fiber via `@theatre/r3f`.

### 18.2 Animation Catalogue

| Animation | Trigger | Duration | Description |
|-----------|---------|----------|-------------|
| Card deal | Phase: Dealing | ~2s | Cards fly from deck to player positions |
| Card flip | Community card reveal | ~1s | Face-down to face-up with gold edge glow |
| Chip push | Bet placed | ~0.5s | Chips slide from player to centre |
| Pot collect | Winner determined | ~1.5s | Chips slide from centre to winner |
| Camera: overview | Default gameplay | Continuous | Gentle breathing drift |
| Camera: flop reveal | Flop dealt | ~1.5s | Zoom to community cards |
| Camera: showdown orbit | Showdown | ~3s | Slow 180-degree orbit |
| Camera: winner celebration | Hand won | ~2s | Pull-back dolly from winner |
| Turn timer depletion | Player's turn | 30s | Circular arc shader around avatar frame |
| Win sparkle | Big win | ~2s | Gold sparkle particles |
| Dealer nod | Hand complete | ~1s | Subtle dealer character animation |

### 18.3 Transition Rules

- All camera cuts use 0.4s ease-in-out interpolation
- No hard cuts during gameplay — smooth lerps only
- Animations triggered by VGF phase change events
- Animation completion feeds back to game flow (dealing phase doesn't end until animation finishes)

---

## 19. Network Architecture

### 19.1 Transport Protocol

| Connection | Protocol | Purpose |
|-----------|----------|---------|
| VGF Server <-> Display | Socket.IO (WebSocket) | Game state sync |
| VGF Server <-> Controller | Socket.IO (WebSocket) | Game state sync, player actions |
| GameLift Streams <-> TV | WebRTC | Video/audio delivery |
| Controller <-> Recognition Service | WebSocket | Voice audio streaming |
| VGF Server <-> LLM API | HTTPS | Bot decision requests |
| VGF Server <-> TTS Service | HTTPS/WebSocket | Dealer voice generation |

### 19.2 Reconnection

- Socket.IO: infinite reconnection attempts, 50ms initial delay, 500ms max delay, WebSocket-only
- `sessionMemberId` is stable across reconnections (connection ID may change)
- Disconnected players auto-fold after 30s; seat held for 3 hands
- Reconnecting players resume seamlessly — no QR re-scan needed

### 19.3 Latency Budget

| Path | Target | Impact |
|------|--------|--------|
| Player action -> state broadcast | < 100ms | Game responsiveness |
| Voice command -> dealer confirmation | < 1,200ms | Voice interaction feel |
| GameLift Streams input -> video | < 100ms | TV input responsiveness |
| Bot decision (Easy) | < 2s | Game pacing |
| Bot decision (Medium) | < 3s | Game pacing |
| Bot decision (Hard) | < 5s | Game pacing |

---

# V. Art & Audio

## 20. Visual Style Guide

### 20.1 Target Aesthetic

**Premium Realism** — a private high-stakes poker room in a luxury casino hotel. Polished mahogany, green baize, brushed brass, warm pendant lighting, moody shadows.

**Reference titles:** Poker Club (visual fidelity), Prominence Poker (noir atmosphere), WSOP console (broadcast camera style).

### 20.2 Colour Palette

```
Primary:
  Racing Green    #1B4D2E   (felt, brand accent)
  Mahogany        #4A1C0A   (wood trim)
  Antique Brass   #C9A84C   (metal accents, UI highlights)

Secondary:
  Cognac Leather  #5C3A1E   (rail, warm tones)
  Burgundy        #6B1D2A   (card backs, deep accents)
  Charcoal        #2A2A2E   (walls, shadows)

Neutrals:
  Ivory           #F5F2ED   (card faces, text)
  Near-Black      #1A1A1D   (ceiling, deep shadows)
  Warm Grey       #4A4845   (secondary text, dividers)

Chip Denominations:
  $5     White      #E8E4DC
  $25    Red        #C23B22
  $100   Black      #1C1C1C
  $500   Purple     #6B2D8B
  $1000  Gold       #D4A843
```

### 20.3 Lighting

Three-tier lighting model:

| Tier | Purpose | Implementation |
|------|---------|----------------|
| Key light | Warm overhead pendant (2700–3200 K) | `SpotLight` with soft penumbra, 1024px shadow map |
| Rim / accent | Cool edge highlights (5500 K) | Pair of `DirectionalLight` at steep rake, low intensity |
| Ambient fill | Deep warm ambient | `HemisphereLight` + HDRI ("Studio Small 09" from Poly Haven at 256px, `envMapIntensity: 0.15`) |

**Post-processing:** Bloom (`luminanceThreshold: 0.8`, `intensity: 0.35`, `radius: 0.6`), Vignette (`offset: 0.3`, `darkness: 0.65`), `ACESFilmicToneMapping` with `SRGBColorSpace` output.

**Colour space:** HDRI loaded in linear colour space. PBR albedo/diffuse textures authored in sRGB. Normal, roughness, metalness, and AO maps are linear.

### 20.4 Material Standards

All materials use PBR with `MeshStandardMaterial` (or `MeshPhysicalMaterial` for glass and clear-coat surfaces, limited to 2–3 objects).

| Material | Colour | Roughness | Metalness |
|----------|--------|-----------|-----------|
| Table felt | #1B4D2E | 0.85–0.90 | 0.0 |
| Table rail (leather) | #5C3A1E | 0.55 | 0.0 |
| Table rim (mahogany) | #4A1C0A | 0.35 | 0.0 (clear-coat) |
| Chip body | Per denomination | 0.25 | 0.0 |
| Chip metallic inlay | Per denomination | 0.15 | 0.85 |
| Cards (face) | #F5F2ED | 0.40 | 0.0 |
| Card backs | #6B1D2A + gold | 0.35 | 0.0 |
| Brass accents | #C9A84C | 0.25 | 0.90 |
| Glass (whisky tumbler) | Clear + amber tint | 0.05 | 0.0 (transmission: 0.95) |

### 20.5 Environment

An intimate octagonal private poker room (~8m diameter): single table, 4 leather chairs, dark panelled walls with art-deco moulding, low pendant lights, drinks cabinet, window with heavy drapes showing city bokeh, cigar smoke wisps, Persian rug.

---

## 21. 3D Asset List

### 21.1 Table & Furniture (5 assets)

| # | Asset | Poly Budget | Texture |
|---|-------|-------------|---------|
| 1 | Poker table (oval, 4-seat) | 3,000–5,000 | 2048px |
| 2 | Leather club chair (x4 instanced) | 2,000–3,000 ea. | 1024px |
| 3 | Dealer button | 200–400 | 512px |
| 3a | Small Blind marker (SB) | 100–200 | 256px |
| 3b | Big Blind marker (BB) | 100–200 | 256px |

### 21.2 Chips (6 assets)

| # | Asset | Poly Budget | Texture |
|---|-------|-------------|---------|
| 4–8 | Chip ($5, $25, $100, $500, $1000) | 300–500 ea. | 512px |
| 9 | Chip stacks (x5, x10, x20) | Instanced | -- |

### 21.3 Cards (5 assets)

| # | Asset | Poly Budget | Texture |
|---|-------|-------------|---------|
| 10 | Playing card (single mesh) | 100–200 | 1024px atlas |
| 11 | Card deck (stacked) | 400–600 | 512px |
| 11a | Card shoe / deck holder | 300–500 | 512px |
| 11b | Burn card pile / muck | 100–200 | 256px |

### 21.4 Dealer (2 assets)

| # | Asset | Poly Budget | Texture |
|---|-------|-------------|---------|
| 12 | Dealer avatar (upper body, rigged) | 8,000–12,000 | 2048px |
| 13 | Dealer hands (detailed, rigged) | 2,000–3,000 | 1024px |

**Note:** Dealer hands are the highest-risk AI-generated asset. Fallback: source from Sketchfab/TurboSquid marketplace ($20–50).

### 21.5 Player Representations (2 assets)

| # | Asset | Poly Budget | Texture |
|---|-------|-------------|---------|
| 14 | Player avatar frame (brass, silver, bronze, obsidian variants) | 500–800 ea. | 512px |
| 15 | Empty seat placeholder | 300–500 | 512px |

### 21.6 Environment (6 assets)

| # | Asset | Poly Budget | Texture |
|---|-------|-------------|---------|
| 16 | Room shell | 1,000–2,000 | 2048px tiling |
| 17 | Pendant light (x3) | 400–600 ea. | 512px |
| 18 | Wall sconce (x4) | 200–300 ea. | 512px |
| 19 | Window with drapes | 800–1,200 | 1024px |
| 20 | Drinks cabinet | 1,500–2,500 | 1024px |
| 21 | Door / entrance | 600–800 | 1024px |

### 21.7 Decorative Props (6 assets)

| # | Asset | Poly Budget | Texture |
|---|-------|-------------|---------|
| 22 | Whisky decanter | 500–800 | 512px |
| 23 | Whisky tumbler (x2) | 200–400 ea. | 512px |
| 24 | Cigar in ashtray | 300–500 | 512px |
| 25 | Framed poster (x2) | 100–200 ea. | 512px |
| 26 | Velvet rope barrier | 400–600 | 512px |
| 27 | Decorative rug | 100–200 | 1024px |

### 21.8 Particles & Effects (6 effects)

| # | Effect | Type |
|---|--------|------|
| 28 | Cigar smoke | Translucent particle sprites |
| 29 | Chip toss trail | Particle burst (0.3s) |
| 30 | Card deal whoosh | Speed-line sprite |
| 31 | Win celebration | Gold sparkle shower (2s) |
| 32 | Ambient dust motes | Slow-drift particles in light |
| 33 | Active player glow | Emission pulse shader |

### 21.9 UI Elements in 3D (7 assets)

| # | Asset | Notes |
|---|-------|-------|
| 34 | Pot chip pile (centre) | Instanced chips; scales with amount |
| 35 | Bet amount placard | Brass-framed; dynamic text |
| 36 | Voice command indicator | Floating mic icon / sound wave ring |
| 37 | Dealer speech bubble | Art-deco panel; dynamic text |
| 38 | Timer arc | Ring shader; depletes clockwise |
| 39 | Side pot chip pile | Separate pile; appears during all-in scenarios |
| 40 | Side pot placard | "SIDE POT: $X" label |

**Total estimated scene budget:** ~60,000–85,000 triangles.

### 21.10 Asset Production Pipeline

```
1. GENERATE   -> Meshy.AI text-to-3D (Refine Prompt ON for props, OFF for dealer)
2. EVALUATE   -> Review topology, UV layout, texture quality
3. REFINE     -> Blender: retopology, UV cleanup, texture fixes
4. OPTIMISE   -> Reduce poly count, compress textures to KTX2/Basis
5. EXPORT     -> glTF 2.0 / GLB
6. INTEGRATE  -> Import into R3F scene, apply PBR materials
7. ANIMATE    -> Theatre.js keyframes; Meshy auto-rig for dealer
8. TEST       -> Verify on GameLift Streams cloud GPU at 60fps
```

---

## 22. Audio Design

### 22.1 Sound Effects

| Sound | Trigger | Notes |
|-------|---------|-------|
| Card deal | Each card dealt | Crisp paper slide |
| Card flip | Community card revealed | Satisfying snap |
| Chip click | Bet placed | Ceramic chip stacking sound |
| Chip slide | Chips moving to pot/winner | Sliding across felt |
| Shuffle | New hand | Riffle shuffle sound |
| Timer tick | Last 10 seconds | Subtle clock tick, increasing tempo |
| Win fanfare | Hand won | Subtle brass sting (not overbearing) |
| All-in | Player goes all-in | Dramatic bass hit |
| Fold | Player folds | Soft card muck |

### 22.2 Ambient Audio

- Low background music: jazz or lounge, non-distracting, volume-adjustable
- Room ambience: subtle HVAC hum, distant city sounds through window
- No music during critical action moments (all-in, showdown)

### 22.3 TTS Voices

| Character | Voice Type | Volume |
|-----------|-----------|--------|
| Dealer | Professional, warm, configurable (gender/accent) | 100% |
| Easy bots | Friendly, casual, distinct per personality | 85% |
| Medium bots | Confident, measured | 85% |
| Hard bots | Cool, minimal | 85% |

**Audio routing:** All TTS audio (dealer announcements and bot chat) is played by the **Display client** on the GameLift Streams cloud GPU instance. GameLift Streams captures the system audio output as part of the WebRTC stream and delivers it to the TV speakers alongside the video. The VGF server does not route audio — it sends TTS text/SSML to the Display client, which calls the TTS service, decodes the audio, and plays it through the system audio device. This means the TV receives a single WebRTC stream containing both rendered video and all game audio.

---

## 23. Pre-Rendered Video

### 23.1 Video Integration Strategy

| Role | Description | Implementation |
|------|-------------|----------------|
| Full-screen cinematics | Intro, big win celebrations, transitions | `<video>` over R3F canvas; R3F dimmed |
| Video textures | City window bokeh, ambient room loop | `VideoTexture` on plane in R3F scene; MP4 H.264 |
| Reference material | Dealer dealing, chip physics, card flips | Used for Theatre.js timing reference only; not shipped |

### 23.2 Video Catalogue

| # | Video | Role | Duration | Resolution |
|---|-------|------|----------|------------|
| 1 | Intro cinematic (doors opening to poker room) | Full-screen | 8s | 1080p 16:9 |
| 2 | Dealer shuffle close-up | Reference | 4s | 1080p 16:9 |
| 3 | Card deal sequence | Reference | 5s | 1080p 16:9 |
| 4 | Chip bet push | Reference | 3s | 1080p 16:9 |
| 5 | Pot collect | Reference | 4s | 1080p 16:9 |
| 6 | Flop reveal | Reference | 5s | 1080p 16:9 |
| 7 | River reveal | Reference | 3s | 1080p 16:9 |
| 8 | Standard win | Full-screen | 4s | 1080p 16:9 |
| 9 | All-in victory | Full-screen | 6s | 1080p 16:9 |
| 10 | Room ambience loop | Video texture | 6s loop | 1080p 16:9 |
| 11 | City window bokeh | Video texture | 6s loop | 1080p 16:9 |
| 12 | Card fan transition (loading) | Full-screen | 4s loop | 1080p 16:9 |
| 13 | Chip stack build (loading) | Full-screen | 5s | 1080p 16:9 |

**Encoding:** MP4 H.264 Baseline profile. Target bitrate: 8 Mbps full-screen, 4 Mbps video textures. Total video asset size: < 50 MB.

**Loop handling:** AI video generation cannot reliably produce seamless loops. Cross-fade the last 0.5s into the first 0.5s in post-production for looping clips.

---

# VI. Quality & Operations

## 24. Performance Requirements

### 24.1 Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Frame rate (cloud GPU) | 60fps stable | GameLift Streams `gen4n_high` |
| Frame rate (TV delivery) | 60fps at 1080p | WebRTC stream |
| Scene load time | < 5s | Asset preloading; loading cinematic covers wait |
| Voice command round-trip | < 1,200ms | STT + intent + validation + TTS |
| Bot decision (Easy) | < 2s total | Rules engine + artificial delay |
| Bot decision (Medium) | < 3s total | LLM + artificial delay |
| Bot decision (Hard) | < 5s total | LLM + artificial delay |
| Controller connection | < 3s after QR scan | Socket.IO establish |
| State broadcast | < 100ms | VGF Socket.IO |

### 24.2 Network Requirements

| Requirement | Value |
|-------------|-------|
| TV bandwidth (GameLift Streams) | Minimum 10 Mbps |
| Controller bandwidth | Minimal (Socket.IO JSON + audio stream) |
| Latency tolerance (TV) | < 100ms ideal; poker is turn-based so tolerant of higher |
| Latency tolerance (voice) | < 500ms STT; < 500ms TTS |

---

## 25. Testing Strategy

### 25.1 Unit Tests

| Area | Framework | Coverage Target |
|------|-----------|-----------------|
| Poker engine (hand eval, pot calc, rules) | Vitest | 95%+ |
| Voice command intent parsing | Vitest | 90%+ |
| Bot decision rules engine (Easy) | Vitest | 90%+ |
| VGF phase transitions | Vitest | 85%+ |

### 25.2 Integration Tests

| Test | Scope |
|------|-------|
| Full hand lifecycle | Lobby -> deal -> 4 betting rounds -> showdown -> pot distribution |
| Side pot scenarios | 2, 3, 4 players all-in with different stacks |
| Bot integration | LLM call -> response parse -> action validate -> state update |
| Voice pipeline | Audio -> STT -> intent -> action -> TTS |
| Reconnection | Player disconnect -> reconnect -> state recovery |

### 25.3 Multi-Client Testing

VGF provides a multi-client tester (`vgf multi-client`, http://localhost:9001) for simulating multiple Display and Controller connections simultaneously.

### 25.4 Split-Screen Development Mode

During local development, the Display client runs in a split-screen layout that eliminates the need for a separate mobile device:

```
┌──────────────────────────────┬───────────────────┐
│                              │  Mock Controller   │
│       Display (Game)         │                   │
│         (2/3 width)          │   (1/3 width)     │
│                              │                   │
│   3D table, dealer,          │  ┌─────────────┐  │
│   community cards,           │  │ Player's    │  │
│   player representations     │  │ Hole Cards  │  │
│                              │  └─────────────┘  │
│                              │                   │
│                              │  [Push to Talk]   │
│                              │  [Fold][Check]    │
│                              │  [Raise: ____]    │
│                              │                   │
│                              │  ○ Mic  ○ Text    │
└──────────────────────────────┴───────────────────┘
```

| Aspect | Detail |
|--------|--------|
| **Layout** | Left 2/3 = Display client (game view); right 1/3 = mock mobile controller |
| **Controller count** | Single mock controller — one human player, remaining seats filled by AI bots |
| **Voice input toggle** | Switch between **real mic capture** (records from dev machine microphone, sends to recognition service for full pipeline testing) and **text input** (type commands directly, bypasses recognition service for faster iteration) |
| **Controller features** | Shows player's hole cards, betting controls (fold/check/call/raise with amount input), push-to-talk button, player name entry |
| **Activation** | Enabled via environment variable (e.g. `DEV_SPLIT_SCREEN=true`) or Vite dev server flag |
| **Production** | Completely stripped from production builds — the mock controller panel does not exist in the GameLift Streams deployment |

> **Implementation note:** The mock controller is a standard VGF Controller client rendered in an iframe or side panel within the same Electron window. It connects to the same VGF server instance as the Display client, behaving identically to a real phone controller. The only difference is the rendering context (side panel vs. mobile browser).

### 25.5 End-to-End / Platform Tests

| Platform | Test Focus |
|----------|-----------|
| Fire TV Stick 4K Max | GameLift Streams WebRTC playback; remote input forwarding |
| Samsung Tizen TV | WebRTC compatibility; thin client behaviour |
| LG webOS TV | WebRTC compatibility |
| iPhone Safari | Controller connection, voice capture, touch controls |
| Android Chrome | Controller connection, voice capture, touch controls |

### 25.6 Playwright E2E

Automated browser tests covering the full session flow: create session -> join -> play hand -> verify state.

---

## 26. Accessibility

### 26.1 Voice-Only Play

The game is designed to be fully playable by voice. All game state is announced by the dealer via TTS:
- Hole cards read aloud when dealt (and on demand: "What do I have?")
- Community cards announced
- Pot, stack, and bet amounts available on voice query
- All actions confirmed verbally

### 26.2 Colour-Blind Considerations

- No colour-only information: every colour-coded element has a **text label, icon, or pattern**
- Chip denominations: colour AND printed value on chip face
- Action indicators: colour AND text label ("FOLD", "RAISE $500")
- Timer: colour shift AND numeric countdown text inside the arc
- Voice command states: colour AND icon changes (mic -> tick -> question mark)
- Palette chosen with distinct luminance values for protanopia, deuteranopia, tritanopia
- Red (#C23B22) and green never used as sole differentiator on the same element
- Optional "High Contrast" UI toggle in settings

### 26.3 TV Readability

- Minimum 24px type at 1080p (32px preferred)
- Bold/medium font weights only
- All UI within 90% TV safe zone
- Dealer speech bubble auto-dismiss: 6 seconds minimum (or tied to next game event)

### 26.4 Subtitles

- All dealer speech available as optional subtitles
- Voice commands shown as text confirmations on screen

---

## 27. Analytics & Metrics

### 27.1 Game Events

| Event | Data |
|-------|------|
| Session start/end | Duration, player count, blind level |
| Hand played | Number, winner, pot size, showdown vs fold |
| Player action | Action type, amount, time taken, voice vs touch |
| Bot decision | Difficulty, action, LLM model, latency, fallback used |
| Voice command | Transcript, confidence, recognised intent, success/failure |
| Player join/leave | Method (QR, reconnect), session duration |
| Rebuy | Amount, player, hand number |

### 27.2 Success Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| Voice command success rate | > 85% | Voice usability |
| Average hand duration | 60–90 seconds | Game pacing |
| Session duration | > 20 minutes | Engagement |
| Hands per session | > 15 | Engagement |
| Voice vs touch ratio | > 60% voice | Voice-first adoption |
| Bot decision latency (p95) | < 3s Easy, < 5s Medium, < 7s Hard | Pacing |
| STT accuracy (intent correct) | > 90% | Voice reliability |
| GameLift Streams frame rate | > 55fps (p95) | Visual quality |

### 27.3 Monitoring

- Datadog integration (built into VGF) for metrics, tracing, and alerting
- LLM API call monitoring: latency, error rate, cost per session
- Recognition service health: accuracy, latency, failover events
- GameLift Streams: session utilisation, stream quality, input latency

---

## 28. Deployment & Release

### 28.1 Infrastructure

| Component | Deployment |
|-----------|-----------|
| VGF Game Server | Kubernetes (AWS EKS) |
| Redis | Amazon ElastiCache |
| Display Client | Electron app (Windows .exe) packaged as GameLift Streams application (S3 upload -> stream group) |
| Controller Client | Hosted web app (CDN-delivered) |
| TV Thin Client | Fire TV app (wrapping GameLift Streams Web SDK) |
| Recognition Service | Existing infrastructure (already deployed) |
| TTS Service | Existing infrastructure or external API |
| 3D Assets / Videos | CDN (loaded by cloud GPU instance) |

### 28.2 GameLift Streams Deployment

1. Build Display client as Electron application (Windows executable)
2. Upload to S3 bucket
3. Create GameLift Streams application referencing S3 build + Windows Server 2022 runtime
4. Configure stream group: `gen4n_high` class, capacity settings (always-on or on-demand), target regions
5. Players connect via TV browser -> GameLift Streams Web SDK handles WebRTC session

### 28.3 CI/CD Pipeline

```
Code push -> Lint + Typecheck -> Unit tests (Vitest) -> Build
  -> Integration tests -> E2E tests (Playwright)
  -> Deploy to staging (Kubernetes + GameLift Streams)
  -> Manual QA on TV hardware
  -> Deploy to production (staged rollout)
```

### 28.4 Release Strategy

- **Alpha:** Internal team testing; 2 players + 2 bots
- **Beta:** Closed beta with 20–50 external testers; all platforms
- **Launch:** Public release on Fire TV; Samsung/LG to follow

---

# VII. Project Management

## 29. Milestones & Timeline

### Phase 1: Foundation (MVP)

**Goal:** One human player can play a complete hand against 3 Easy bots via phone controller.

- VGF server with poker game state and phase transitions
- Poker engine: hand evaluation, pot calculation, all rules
- Easy bot rules engine (no LLM)
- Controller client: cards, basic betting controls
- Display client: basic 3D table (placeholder assets), community cards, pot
- No voice commands yet (touch controls only)
- No GameLift Streams (local rendering for dev)

### Phase 2: Voice & AI

**Goal:** Voice commands work. Medium/Hard bots powered by LLM.

- Recognition service integration (push-to-talk on phone)
- Intent parsing and voice command flow
- Dealer TTS announcements
- LLM-powered Medium and Hard bots
- Bot personality and chat
- Bot timing and emotional state

### Phase 3: Visual Polish

**Goal:** Premium 3D visuals and animations.

- Final 3D assets (Meshy.AI generation + Blender refinement)
- Theatre.js animation sequences (card dealing, camera work, celebrations)
- Lighting, post-processing, atmosphere
- Pre-rendered Nano Banana videos
- Sound effects and ambient audio

### Phase 4: Platform & Release

**Goal:** Production deployment on Fire TV via GameLift Streams.

- GameLift Streams integration and deployment
- TV thin client app
- Performance optimisation and profiling
- Multi-platform testing (Fire TV, Samsung, LG)
- Analytics integration
- Beta programme
- Public launch

---

## 30. Risk Register

| Risk | Severity | Probability | Mitigation |
|------|----------|------------|------------|
| **GameLift Streams input latency** | High | Medium | Deploy to nearest AWS regions; poker is turn-based so tolerant; monitor round-trip |
| **Voice recognition accuracy in noisy rooms** | High | Medium | Keyword boosting via slot maps; push-to-talk; visual fallback; error escalation |
| **LLM API latency for bot decisions** | Medium | Medium | Pre-compute hand analysis; mask with thinking animation; timeout fallback to rules engine |
| **GameLift Streams cost at scale** | Medium | Medium | On-demand capacity for non-peak; `gen4n_high` already cost-optimised; monitor session duration |
| **Network bandwidth (10 Mbps minimum)** | Medium | Low | Adaptive quality settings; clear minimum requirements in UI |
| **Meshy dealer character quality** | Medium | High | Budget 2–3 generation attempts + significant Blender retopology; fallback to marketplace asset |
| **Meshy dealer hands quality** | High | High | Primary fallback: marketplace hand model ($20–50); retopologise in Blender |
| **LLM cost per session** | Medium | Medium | Tiered model selection (Haiku for Easy, Sonnet for Medium, Opus for Hard); rules engine for Easy; cache prompts |
| **Private card security** | Low | Low | Acceptable for casual play; server-side redaction for competitive mode (v2) |
| **Socket.IO reliability** | Low | Low | VGF server and Display both in AWS; low-latency internal networking; auto-reconnection |

---

## 31. Dependencies

### External Services

| Dependency | Version | Purpose | Risk |
|-----------|---------|---------|------|
| @volley/vgf | 4.3.1 | Game framework | Low (internal, stable) |
| @volley/recognition-client-sdk | 0.1.424 | Voice recognition | Low (internal, stable) |
| Amazon GameLift Streams | Current | Cloud rendering & delivery | Medium (new service) |
| Claude API (Anthropic) | Latest (Opus 4.6, Sonnet 4.5, Haiku 4.5) | Bot AI decisions & chat | Low (established API) |
| GameLift Streams Web SDK | Current | TV thin client WebRTC | Medium (tied to GameLift Streams) |
| Deepgram | nova-2 | Primary STT provider | Low (fallback to Google) |
| React Three Fiber | Latest | 3D rendering | Low (mature ecosystem) |
| Theatre.js | Latest | Animation | Low (stable) |
| Meshy.AI | Meshy 5 | 3D asset generation | Medium (output quality varies) |
| Nano Banana | Current | Pre-rendered video | Low (reference material, not critical path) |

### Internal Services

| Service | Status | Needed By |
|---------|--------|-----------|
| Recognition Service | Production | Phase 2 |
| TTS Service | Production | Phase 2 |
| VGF Framework | Production (v4.3.1) | Phase 1 |

---

## 32. Team & Skills Required

| Role | Skills | Count |
|------|--------|-------|
| **Game Designer** | Texas Hold'em mechanics, voice UX, game balance | 1 |
| **Full-Stack TypeScript Engineer** | React, Node.js, VGF framework, Socket.IO | 2–3 |
| **3D Artist / Technical Artist** | Three.js, React Three Fiber, Blender, shader writing | 1 |
| **Theatre.js Animator** | Timeline authoring, camera work, cinematic sequences | 1 (or overlap with 3D artist) |
| **Voice / NLP Engineer** | Recognition SDK integration, command parsing, prompt engineering | 1 |
| **AI / LLM Engineer** | Prompt engineering, poker strategy, bot personality tuning | 1 |
| **QA (Smart TV / Streaming)** | Fire TV, Tizen, webOS testing, GameLift Streams, latency profiling | 1 |
| **DevOps** | AWS (GameLift Streams, S3, EKS), Kubernetes, Docker, Redis, CI/CD | 0.5 |

**Total:** 8–10 people.

---

## Appendices

### Appendix A: Research Document References

The following research documents form the basis of this PRD and should be consulted for implementation detail:

| Document | Location | Content |
|----------|----------|---------|
| Poker Rules | `docs/research/poker-rules.md` | Complete Texas Hold'em rules, hand rankings, side pot algorithm |
| Voice Commands | `docs/research/voice-commands.md` | Voice system design, NLU intents, dealer TTS responses |
| AI Bots | `docs/research/ai-bots.md` | LLM integration, difficulty levels, personalities, prompts |
| VGF Framework | `docs/research/vgf-framework.md` | Framework API, phases, hooks, state sync |
| Recognition Service | `docs/research/recognition-service.md` | STT SDK, WebSocket protocol, VGF integration |
| Mobile Controller | `docs/research/mobile-controller.md` | Phone controller architecture, QR flow |
| Tech Stack | `docs/research/tech-stack.md` | Full technology stack, GameLift Streams, infrastructure |
| Art Direction | `docs/research/art-direction.md` | Visual style, 3D assets, Meshy prompts, Nano Banana prompts |

### Appendix B: Review Findings Incorporated

This PRD incorporates validated findings from expert reviews:

- **Game Design Review** (`REVIEW-game-design.md`): Hybrid bot architecture for Easy bots, missing voice commands added ("How much to call?", "What do I have?", "Repeat that"), chip slang deferred to v2, undo/correction rules per action type, bot rebuy policy, c-bet frequency adjusted by opponent count, LLM temperature settings, bot timing reduced
- **Technical Review** (`REVIEW-technical.md`): Corrected recognition service result types (`Transcription` not `RESULT`), GameLift Streams architecture validated, private state security noted, GameLift Streams Web SDK added as dependency, WebRTC/Socket.IO transport distinction clarified
- **Art Direction Review** (`REVIEW-art-direction.md`): Missing assets added (SB/BB blind markers, side pot visualisation, burn pile, card shoe), HDRI specified (Studio Small 09 at 256px), bloom/vignette/tone-mapping parameters specified, Nano Banana integration strategy defined (full-screen/texture/reference), colour-blind accessibility added, TV safe zone guidance added, dealer hands marketplace fallback documented

### Appendix C: User Stories

**US-001:** As a player, I want to join a game by scanning a QR code with my phone, so that I can start playing quickly without account creation.

**US-002:** As a player, I want to see my private cards only on my phone, so that other players at the table cannot see my hand.

**US-003:** As a player, I want to say "raise to 200" and have the dealer confirm my action, so that I can play without touching my phone.

**US-004:** As a player, I want to ask "what's the pot?" at any time and hear the dealer announce it, so that I can make informed decisions.

**US-005:** As a player, I want to play against AI bots that feel like real people with personalities, so that solo play is entertaining.

**US-006:** As a host, I want to choose the blind level and number of bots before starting, so that I can customise the experience for my group.

**US-007:** As a beginner, I want the dealer to guide me through my first few hands, so that I can learn the rules while playing.

**US-008:** As a player, I want to rejoin the game if my phone disconnects, so that I don't lose my seat and chips.

**US-009:** As a player, I want to say "what do I have?" to hear my cards read aloud, so that I can play without looking at my phone.

**US-010:** As a player who is colour-blind, I want all game information conveyed through text labels in addition to colour, so that I can follow the game without difficulty.

**US-011:** As a host, I want to say "end game" to finish the session and see a summary of everyone's results, so that we can wrap up the evening cleanly.

**US-012:** As a player, I want to say "sit me out" to take a break and "deal me in" to return, so that I can step away without losing my seat.

**US-013:** As a player, I want each AI bot to have a distinct personality and chat style, so that they feel like real opponents rather than generic algorithms.

**US-014:** As a player, I want to see a session summary showing my total winnings, best hand, and hands played when the game ends, so that I have a sense of achievement.

**US-015:** As a player, I want the dealer to announce every action and card clearly via voice, so that I can follow the game by listening even when I'm not looking at the screen.

### Appendix D: Acceptance Criteria (Key Flows)

**AC-001: Complete Hand**
- Given 4 players (1 human, 3 bots) at blind level 25/50
- When a hand is played through all 4 betting rounds to showdown
- Then the correct winner is determined, pot is distributed accurately, button rotates, and the next hand begins automatically

**AC-002: Side Pot**
- Given Player A goes all-in for 100, Players B and C continue betting to 500
- When showdown occurs
- Then main pot (300) is evaluated among A, B, C and side pot (800) is evaluated among B, C only

**AC-003: Voice Command**
- Given it is the player's turn and they are facing a bet of 200
- When the player says "raise to 500"
- Then the dealer confirms "Player raises to 500", the bet is validated, and the game state updates

**AC-004: Bot Decision**
- Given it is an Easy bot's turn
- When the bot has a pair of aces
- Then the bot raises (never folds pocket aces) and chat reflects excitement within 2 seconds

**AC-005: Reconnection**
- Given a player's phone disconnects mid-hand
- When the phone reconnects within 30 seconds
- Then the player resumes their seat with their current hand and chip stack intact

**AC-006: Voice Error Escalation**
- Given the recognition service fails to parse a player's voice command
- When the player speaks 3 times without a valid intent being recognised
- Then the dealer says "Still having trouble. Your options are on screen — use your remote or phone." and the phone highlights touch betting controls

**AC-007: Bot Timing Feels Human**
- Given it is a Medium bot's turn with a standard call decision
- When the bot decides to call
- Then the bot waits 1–3 seconds before acting (not instant) and optionally chats before or after the action

**AC-008: Heads-Up Rule Transition**
- Given 4 players are in a session and 2 players leave
- When the next hand begins with exactly 2 players
- Then the button is the small blind, the other player is the big blind, and the button acts first pre-flop and second post-flop

**AC-009: Tutorial for New Players**
- Given a first-time player has joined and selected the optional tutorial
- When the tutorial hand begins with an Easy bot
- Then the dealer provides extra guidance ("That's a pair of kings — a strong hand!") and voice command hints appear on both TV and phone

---

*This document is the single source of truth for the Weekend Poker development team. For implementation-level detail, refer to the research documents listed in Appendix A.*

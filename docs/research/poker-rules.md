# Texas Hold'em Rules & Game Mechanics

> Comprehensive rules reference for video game implementation.
> Format: **No-Limit Texas Hold'em Cash Game** | **4 Players Max** | **Rebuy Allowed**

---

## Table of Contents

1. [Game Overview](#1-game-overview)
2. [Card Deck & Dealing](#2-card-deck--dealing)
3. [Hand Rankings](#3-hand-rankings)
4. [Table Positions & Dealer Button](#4-table-positions--dealer-button)
5. [Blind Structure](#5-blind-structure)
6. [Betting Rounds](#6-betting-rounds)
7. [Betting Actions & Rules](#7-betting-actions--rules)
8. [All-In & Side Pots](#8-all-in--side-pots)
9. [Showdown](#9-showdown)
10. [Winning the Pot](#10-winning-the-pot)
11. [Cash Game & Rebuy Rules](#11-cash-game--rebuy-rules)
12. [Dealer Button Rotation Edge Cases](#12-dealer-button-rotation-edge-cases)
13. [House Rules for Casual 4-Player Play](#13-house-rules-for-casual-4-player-play)
14. [Implementation Notes](#14-implementation-notes)

---

## 1. Game Overview

Texas Hold'em is played with a standard 52-card deck. Each player receives **two private cards** (hole cards), and **five community cards** are dealt face-up in stages across the centre of the table. Players construct the best possible **five-card poker hand** from any combination of their two hole cards and the five community cards.

A hand of poker proceeds through up to **four betting rounds**. Players may fold (surrender their hand), check (pass the action), call (match the current bet), raise (increase the bet), or go all-in (bet all remaining chips). The hand ends either when all but one player has folded, or at showdown after the final betting round.

### Key Terminology

| Term | Definition |
|------|-----------|
| **Hole Cards** | The two private cards dealt to each player |
| **Community Cards** | The five shared cards dealt face-up on the board |
| **Pot** | The total chips wagered during a hand |
| **Muck** | To discard a hand face-down without showing |
| **Board** | The community cards currently visible |
| **Action** | A player's turn to act (bet, check, call, raise, fold) |
| **Street** | A betting round (pre-flop, flop, turn, river) |

---

## 2. Card Deck & Dealing

### Deck Composition
- 52 cards: 4 suits (Spades, Hearts, Diamonds, Clubs) x 13 ranks (2-10, J, Q, K, A)
- No jokers or wild cards
- Suits have **no ranking** in Texas Hold'em (all suits are equal)

### Shuffle & Deal
1. **Shuffle** the full 52-card deck before each hand (Fisher-Yates algorithm recommended for implementation)
2. **Burn** (discard face-down) the top card before dealing community cards (flop, turn, river)
3. Deal hole cards **one at a time, clockwise**, starting with the player to the left of the dealer button
4. Each player receives exactly **2 hole cards**, dealt face-down

### Deal Sequence Per Hand
| Step | Action | Cards |
|------|--------|-------|
| 1 | Deal hole cards (2 rounds clockwise) | 2 per player |
| 2 | Pre-flop betting round | - |
| 3 | Burn 1, deal flop | 3 community cards |
| 4 | Flop betting round | - |
| 5 | Burn 1, deal turn | 1 community card |
| 6 | Turn betting round | - |
| 7 | Burn 1, deal river | 1 community card |
| 8 | River betting round | - |
| 9 | Showdown (if 2+ players remain) | - |

---

## 3. Hand Rankings

Ranked from **strongest to weakest**. In our game, these must be evaluated programmatically to determine the winner at showdown.

| Rank | Hand | Description | Example |
|------|------|-------------|---------|
| 1 | **Royal Flush** | A, K, Q, J, 10 of the same suit | A-K-Q-J-10 of Hearts |
| 2 | **Straight Flush** | Five consecutive cards of the same suit | 5-6-7-8-9 of Clubs |
| 3 | **Four of a Kind** | Four cards of the same rank | 9-9-9-9-K |
| 4 | **Full House** | Three of a kind + a pair | K-K-K-4-4 |
| 5 | **Flush** | Five cards of the same suit (not consecutive) | A-J-8-4-2 of Spades |
| 6 | **Straight** | Five consecutive cards of mixed suits | 4-5-6-7-8 |
| 7 | **Three of a Kind** | Three cards of the same rank | 7-7-7-Q-3 |
| 8 | **Two Pair** | Two different pairs | J-J-5-5-A |
| 9 | **One Pair** | Two cards of the same rank | 10-10-K-8-3 |
| 10 | **High Card** | No combination; highest card wins | A-K-9-6-2 |

### Tiebreaker Rules (Kickers)

When two or more players hold the same hand ranking, the winner is determined by **kickers** — the highest-value cards not part of the primary combination.

- **Royal Flush**: Always a tie (split pot) — only one per suit possible, and suits don't rank
- **Straight Flush / Straight**: Compare highest card in the sequence. A-2-3-4-5 is the **lowest** straight (the "wheel") — the Ace counts as 1
- **Flush**: Compare highest card, then second-highest, etc.
- **Four of a Kind**: Compare the quad rank, then the kicker
- **Full House**: Compare the three-of-a-kind rank first, then the pair rank
- **Three of a Kind**: Compare trips rank, then kickers in order
- **Two Pair**: Compare higher pair, then lower pair, then kicker
- **One Pair**: Compare pair rank, then kickers in order
- **High Card**: Compare cards from highest to lowest

> **Implementation note**: The Ace can be high (in A-K-Q-J-10) or low (in A-2-3-4-5). It cannot wrap around (e.g., Q-K-A-2-3 is **not** a valid straight).

### Best Five-Card Hand

Each player selects the **best 5 cards** from the 7 available (2 hole + 5 community). Possible configurations:
- 2 hole cards + 3 community cards
- 1 hole card + 4 community cards
- 0 hole cards + 5 community cards (plays the board)

---

## 4. Table Positions & Dealer Button

### The Dealer Button
A marker (the "button") indicates the nominal dealer position. The button rotates **clockwise** by one seat after each hand. The player on the button is the last to act in all post-flop betting rounds, giving them a significant positional advantage.

### Positions at a 4-Player Table

| Seat | Position | Role |
|------|----------|------|
| 1 | **Button (Dealer)** | Best position; acts last post-flop |
| 2 | **Small Blind (SB)** | Immediately left of button; posts small blind |
| 3 | **Big Blind (BB)** | Left of small blind; posts big blind |
| 4 | **Under the Gun (UTG)** | Left of big blind; first to act pre-flop |

> With 4 players, the UTG position is also the "cutoff" in full-ring terminology. Positions overlap at a short-handed table.

### Button Rotation Rules
- After each hand, the button moves **one position clockwise**
- If a player leaves, the button continues its normal rotation (skip empty seats)
- If a player sits out, they still post blinds in some house rules (see Section 13)
- The button **never skips a player** unless that player has been removed from the table

---

## 5. Blind Structure

Blinds are forced bets that ensure there is always something in the pot to play for.

### How Blinds Work
- **Small Blind (SB)**: Posted by the player immediately to the left of the dealer button. Typically half the big blind.
- **Big Blind (BB)**: Posted by the player two seats to the left of the dealer button. This sets the minimum bet for the hand.

### Recommended Blind Levels for Our Game

| Level | Small Blind | Big Blind | Min Buy-in (20 BB) | Max Buy-in (100 BB) |
|-------|-------------|-----------|---------------------|----------------------|
| 1 | 5 | 10 | 200 | 1,000 |
| 2 | 10 | 20 | 400 | 2,000 |
| 3 | 25 | 50 | 1,000 | 5,000 |
| 4 | 50 | 100 | 2,000 | 10,000 |
| 5 | 100 | 200 | 4,000 | 20,000 |

> In a cash game, blinds stay fixed (no escalation). Players choose a blind level when creating or joining a table.

### Dead Blinds
If a player misses their blind (e.g., sitting out), standard casino rules require them to post a "dead" small blind (goes into the pot but is not a live bet) AND a "live" big blind. However, this adds complexity that isn't suited to a casual video game.

**Our recommended approach** (see also Section 13 — House Rules): Returning players simply **wait for the big blind to reach them naturally**. This is the simplest implementation and avoids confusion about dead/live blind mechanics.

---

## 6. Betting Rounds

### Pre-Flop

1. Hole cards are dealt to each player
2. Small blind and big blind are posted
3. Action begins with the player to the **left of the big blind** (UTG in 4-player)
4. Each player may **fold**, **call** (match the big blind), or **raise**
5. Action continues clockwise until all active players have put in equal chips or folded
6. The big blind has the **option to check** (if no raise occurred) or raise — this is the "big blind option"

### Flop

1. Burn one card, deal **three community cards** face-up
2. Action begins with the **first active player to the left of the dealer button**
3. Players may **check** (if no bet), **bet**, **call**, **raise**, or **fold**
4. Continues until all active players have acted and bets are equalised

### Turn

1. Burn one card, deal **one community card** face-up (4th community card)
2. Betting follows the same rules as the flop
3. In many games, the minimum bet doubles on the turn — but in **no-limit**, any bet size is allowed (minimum = 1 big blind)

### River

1. Burn one card, deal **one community card** face-up (5th and final community card)
2. Betting follows the same rules as the flop and turn
3. If two or more players remain after this round, proceed to showdown

### Betting Round Flow (State Machine)

```
[Deal Cards / Community Cards]
        |
        v
[First Player to Act] --> FOLD --> [Remove from hand]
        |
        +--> CHECK (if no bet) --> [Next Player]
        |
        +--> BET / RAISE --> [Set new bet amount]
        |                          |
        |                          v
        |                   [Next Player must CALL, RAISE, or FOLD]
        |
        +--> CALL --> [Match current bet] --> [Next Player]
        |
        v
[All players acted & bets equal?]
        |
    YES --> [End betting round]
    NO  --> [Continue to next player]
```

---

## 7. Betting Actions & Rules

### Available Actions

| Action | When Available | Effect |
|--------|----------------|--------|
| **Fold** | Any time it's your turn | Surrender hand, forfeit any chips in the pot |
| **Check** | When no bet is facing you | Pass action to next player, stay in the hand |
| **Bet** | When no bet has been made in current round | Place a wager (min = 1 big blind) |
| **Call** | When facing a bet or raise | Match the current bet to stay in |
| **Raise** | When facing a bet or raise | Increase the current bet |
| **All-In** | Any time it's your turn | Bet all remaining chips |

### Bet vs Raise — Legal Action Matrix

> **Critical for implementation**: "Bet" and "Raise" are **not interchangeable**. The game engine must enforce which action is legal based on the current state of the betting round.

| Betting Round State | Fold | Check | Bet | Call | Raise | All-In |
|---------------------|------|-------|-----|------|-------|--------|
| No bet this round (unopened) | Yes | Yes | Yes | No | No | Yes |
| Facing a bet or raise | Yes | No | No | Yes | Yes | Yes |
| Player is already all-in | No | No | No | No | No | No |

- A player who faces **no bet** in the current round may **bet** (open the action) but may **not raise** (there is nothing to raise).
- A player who faces **an existing bet** may **call** or **raise** but may **not bet** (the action is already open).
- **All-in** is always available on your turn — it functions as either a bet or a raise depending on context.
- This distinction matters for voice commands: if a player says "raise" when no bet is open, the system should interpret it as a bet (or prompt for clarification).

### No-Limit Betting Rules

1. **Minimum bet**: Always equal to **one big blind**
2. **Minimum raise**: Must be at least equal to the **previous bet or raise increment**
   - Example: BB = 10, Player A raises to 30 (increment of 20). Player B must raise to at least 50 (30 + 20 increment)
   - Example: BB = 10, Player A raises to 25 (increment of 15). Player B must raise to at least 40 (25 + 15 increment)
3. **Maximum bet/raise**: A player may bet up to their **entire stack** (all-in)
4. **All-in exception**: If a player does not have enough chips to meet the minimum raise, they may still go all-in for whatever they have. However, this **does not reopen the betting** to players who have already acted (unless the all-in constitutes a full raise)
5. **Reopening the action**: A raise reopens the action only if it is at least a **full raise** (equal to or greater than the minimum raise increment)
6. **Cap on raises**: In no-limit, there is **no cap** on the number of raises — but in practice, action ends when all but one player is all-in
7. **String bets**: In a video game, this is handled by requiring the player to declare their full action at once (not a concern for voice commands if we confirm the full amount)

### Bet Sizing Guide (for voice commands)

For the voice interface, we need to support both **exact amounts** and **relative amounts**:

- "Bet 100" / "Raise to 200" — exact chip amounts
- "Raise 3x" / "Raise three times the big blind" — multiples of the big blind
- "Pot" / "Bet the pot" — match the current pot size
- "Half pot" — bet 50% of the pot
- "Min raise" / "Minimum" — the smallest legal raise
- "All-in" — bet everything

---

## 8. All-In & Side Pots

### When a Player Goes All-In

A player may go all-in at any point during a hand. If their stack is less than the amount needed to call or raise, they bet all their remaining chips. They remain in the hand for showdown but cannot win more from any single opponent than the amount they put in.

### Main Pot & Side Pot Creation

The fundamental rule: **A player can only win from each opponent an amount equal to their own investment.**

#### Example with 3 Players

| Player | Stack | Action |
|--------|-------|--------|
| A | 50 | All-in for 50 |
| B | 150 | Calls 50, then bets 100 more |
| C | 200 | Calls 150 total |

**Main Pot**: 50 x 3 = **150** (A, B, C can all win this)
**Side Pot**: 100 x 2 = **200** (only B and C can win this)

- If A has the best hand: A wins 150 (main pot). The side pot of 200 goes to B or C (whoever has the better hand between them).
- If B has the best hand: B wins everything (150 + 200 = 350).
- If C has the best hand: C wins everything (150 + 200 = 350).

#### Example with 4 Players (All Different Stacks)

| Player | Stack | All-in |
|--------|-------|--------|
| A | 25 | 25 |
| B | 50 | 50 |
| C | 75 | 75 |
| D | 100 | Calls 75 |

**Main Pot**: 25 x 4 = **100** (A, B, C, D eligible)
**Side Pot 1**: 25 x 3 = **75** (B, C, D eligible — A is excluded)
**Side Pot 2**: 25 x 2 = **50** (C, D eligible — A, B excluded)
**D gets back**: 25 (unmatched chips returned)

### Side Pot Algorithm (for Implementation)

```
1. Collect all players' bets into a list, sorted ascending by amount
2. For each unique bet level (from lowest to highest):
   a. Calculate the difference from the previous level
   b. Multiply by the number of eligible players at this level
   c. This forms a pot (main pot for the lowest level, side pot for each subsequent level)
   d. Record which players are eligible for each pot
3. Any unmatched chips are returned to the player
4. At showdown, evaluate pots from side pots down to main pot
   - Each pot is awarded to the best hand among its eligible players
```

### All-In Edge Cases

- **All-in for less than the big blind**: The player is all-in; they can only win a main pot proportional to their bet. **Important**: This incomplete bet does not constitute a legal "open" — subsequent players must still call or raise the **full big blind amount**, not the all-in amount. The all-in player's short bet is treated as a partial bet into the pot, not as a standard opening bet.
- **All-in raise that doesn't meet minimum**: The all-in stands, but the action is **not reopened** for players who already acted (the incomplete raise does not constitute a full raise)
- **All players all-in**: No further betting occurs; deal remaining community cards and go to showdown
- **All-in with side pot, no remaining bettor**: If only one player remains with chips and all others are all-in, no side pot betting occurs — the lone player gets their excess chips back if unmatched

---

## 9. Showdown

### When Showdown Occurs
- After the final betting round (river), if **two or more players** remain active
- If all remaining players are all-in at any point, the remaining community cards are dealt and showdown occurs immediately (no further betting)

### Showdown Order
1. The **last aggressor** (player who made the last bet or raise on the river) must show first
2. If no bets were made on the river (all players checked), the **first active player clockwise from the dealer button** shows first
3. Subsequent players show in **clockwise order**
4. A player may **muck** (discard face-down) if they see they are beaten — they forfeit their claim to the pot

### Showdown Rules for Our Game
- **All-in showdown**: When all remaining players are all-in, all hands are shown (no mucking)
- **Auto-show winner**: The winning hand is always revealed automatically
- **Optional muck**: Losing players may choose to muck or show (in our game, we should auto-show all hands for transparency and the learning/entertainment value)
- **Both hole cards**: To win any pot, both hole cards must be shown face-up

### Best Hand Determination
1. Each player constructs their **best 5-card hand** from 7 available cards
2. Compare hand rankings (Section 3)
3. If tied, compare kickers
4. If hands are exactly equal, **split the pot** evenly (odd chips go to the player closest to the left of the dealer button)

---

## 10. Winning the Pot

### Ways to Win
1. **All opponents fold**: You are the last player standing — you win the pot without showing your cards
2. **Best hand at showdown**: Your 5-card hand beats all remaining opponents
3. **Split pot**: Two or more players hold hands of equal value — the pot is divided equally

### Pot Distribution Rules
- **Single pot**: Goes to the winner (or split equally among tied winners)
- **Multiple pots (side pots)**: Each pot is evaluated independently, starting from the **last side pot** (highest) and working down to the main pot
- **Odd chips**: When splitting, any indivisible chip goes to the player **closest to the left of the dealer button**

---

## 11. Cash Game & Rebuy Rules

### Cash Game Format
Unlike tournaments, cash games have **fixed blinds** and players may leave or join at any time. Chips have a direct monetary value.

### Buy-In Rules
- **Minimum buy-in**: 20 big blinds (BB)
- **Maximum buy-in**: 100 big blinds (BB)
- Players must buy in within these limits when joining a table
- A player's buy-in determines their starting stack for that session

### Rebuy Rules
- **When**: A player may rebuy (add chips) **between hands only** — never during an active hand
- **Trigger**: A player can rebuy at any time their stack is below the maximum buy-in
- **Amount**: Any amount that keeps their total stack between the minimum and maximum buy-in
- **Auto-rebuy option**: Provide a setting to automatically rebuy to the maximum when a player's stack drops below a threshold (e.g., below 20 BB)
- **Topping up**: A player may "top up" their stack to the maximum buy-in between hands, even if they haven't busted
- **Busting out**: If a player loses all chips, they must rebuy (at least the minimum) to continue playing — or they leave the table

### Sitting Out
- A player may sit out for a limited time (e.g., 3 hands or a configurable timeout)
- While sitting out, the player is **not dealt cards**
- Blinds may or may not be posted while sitting out (configurable — see house rules)
- After the timeout, the player is removed from the table

---

## 12. Dealer Button Rotation Edge Cases

### Standard Rotation
After each hand, the dealer button moves **one seat clockwise** to the next active player.

### 2-Player (Heads-Up) Rules
When only 2 players remain at the table, special rules apply:
- The **button** is the **small blind** (and acts first pre-flop, last post-flop)
- The **other player** is the **big blind** (acts last pre-flop, first post-flop)
- This is the opposite of the standard 3+ player arrangement where the button is separate from the blinds

### Player Leaving Mid-Game
- If the small blind leaves, the button moves normally; the next player becomes SB
- If the big blind leaves, the next hand's BB is posted by the next eligible player
- **Dead button rule**: In some cases, the button may be placed in front of an empty seat to maintain fair blind rotation (not typically used in casual games — skip for our implementation)

### Player Joining Mid-Game
- A new player may join at any open seat
- They must wait for the big blind to reach them **OR** post a big blind immediately to be dealt in ("posting" — common in live poker)
- For our game: new players (or returning bots) should wait for the next big blind position for simplicity

---

## 13. House Rules for Casual 4-Player Play

These are recommended house rules to keep the game fun, fair, and well-paced for a casual 4-player video game.

### Recommended Defaults

| Rule | Setting | Rationale |
|------|---------|-----------|
| **Show all hands at showdown** | ON | More entertaining, helps players learn |
| **Auto-muck losing hands** | OFF | Show everything for transparency |
| **Unlimited rebuys** | ON | Keeps everyone playing; no elimination |
| **Auto-rebuy** | Optional (player preference) | Convenience setting |
| **Rebuy amount** | Any amount between min and max | Flexibility |
| **Sitting out timer** | 3 hands max | Keeps the game moving |
| **Straddle** | OFF | Adds complexity; not suited for casual play |
| **Antes** | OFF | Blinds only; simpler |
| **Run it twice** | OFF | Advanced feature; not needed |
| **Rabbit hunting** | OFF | Showing undealt cards; optional fun feature for later |
| **Disconnection protection** | Check/Fold after timeout | Prevents stalling |
| **Time bank** | 30 seconds per action, +15s bank per hand | Balances pace and thinking time |

### Hand-for-Hand Play
Not applicable in cash games (tournament concept only).

### Table Chat / Banter
- AI bots should have contextual chat/reactions (see AI bots document)
- Human players interact through voice

---

## 14. Implementation Notes

### Game State Machine

The hand progresses through these primary states:

```
WAITING_FOR_PLAYERS
    |
    v
POSTING_BLINDS
    |
    v
DEALING_HOLE_CARDS
    |
    v
PRE_FLOP_BETTING --> [all fold but one] --> HAND_COMPLETE
    |
    v
DEALING_FLOP
    |
    v
FLOP_BETTING --> [all fold but one] --> HAND_COMPLETE
    |
    v
DEALING_TURN
    |
    v
TURN_BETTING --> [all fold but one] --> HAND_COMPLETE
    |
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
HAND_COMPLETE --> [button rotation, rebuy phase] --> WAITING_FOR_PLAYERS
```

### Key Validation Rules for Implementation

1. **Bet validation**: Every bet/raise must be checked against minimum raise rules
2. **All-in validation**: Handle partial bets correctly; create side pots
3. **Turn order**: Strictly enforce clockwise action order; skip folded/all-in players
4. **Hand evaluation**: Must correctly handle all 10 hand rankings plus kicker logic
5. **Ace duality**: Handle Ace as both high (14) and low (1) in straights
6. **Split pots**: Handle exact ties with proper chip division and odd-chip rules
7. **Button rotation**: Handle all edge cases (player leaving, heads-up transition, etc.)
8. **Timing**: Enforce action timers; auto-fold on timeout (or check if checking is legal)

### Card Shuffling
Use the **Fisher-Yates algorithm** for cryptographically fair shuffling. Do not use naive shuffles (e.g., sorting with random comparators) as they produce biased distributions.

### Random Number Generation
For a casual game, a standard PRNG (e.g., `Math.random()` or language equivalent) is acceptable. For any competitive or ranked mode in the future, consider a CSPRNG.

### Hand Evaluation Performance
With 4 players, the hand evaluator will be called at most 4 times per showdown. Performance is not a concern at this scale. A lookup-table approach (e.g., the Two Plus Two evaluator) is overkill but could be used if desired. A straightforward rank-and-compare algorithm is sufficient.

---

## References

- [PokerNews - Texas Hold'em Rules](https://www.pokernews.com/poker-rules/texas-holdem.htm)
- [PokerListings - Texas Hold'em Betting Rules](https://www.pokerlistings.com/poker-guides/texas-holdem-betting-rules)
- [888poker - Poker Buy-In Guide](https://www.888poker.com/magazine/strategy/poker-buyin)
- [PokerNews - Showdown Rules & Procedures](https://www.pokernews.com/strategy/the-showdown-rules-procedures-and-etiquette-19237.htm)
- [888poker - Showdown/Mucking Guide](https://www.888poker.com/magazine/strategy/ultimate-guide-poker-showdown)
- [PokerListings - Side Pot Calculator](https://www.pokerlistings.com/poker-tools/poker-side-pot-calculator)
- [BetMGM - Side Pot Rules](https://poker.betmgm.com/en/blog/poker-guides/texas-holdem-side-pot-rules/)
- [Upswing Poker - Betting Rules](https://upswingpoker.com/betting-rules/)
- [Wikipedia - Texas Hold'em](https://en.wikipedia.org/wiki/Texas_hold_%27em)

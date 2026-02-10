# AI Bot System Design

> LLM-powered poker bots with personality across three difficulty levels.
> Format: **No-Limit Texas Hold'em** | **4 Players Max** | **Cash Game**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Difficulty Levels](#2-difficulty-levels)
3. [Playing Style Framework](#3-playing-style-framework)
4. [LLM Decision Engine](#4-llm-decision-engine)
5. [Game State Context](#5-game-state-context)
6. [Prompt Architecture](#6-prompt-architecture)
7. [Bot Personalities](#7-bot-personalities)
8. [Making Bots Feel Human](#8-making-bots-feel-human)
9. [Pre-Flop Strategy by Difficulty](#9-pre-flop-strategy-by-difficulty)
10. [Post-Flop Strategy by Difficulty](#10-post-flop-strategy-by-difficulty)
11. [Bluffing & Deception](#11-bluffing--deception)
12. [Performance & Cost Optimisation](#12-performance--cost-optimisation)
13. [Implementation Architecture](#13-implementation-architecture)

---

## 1. System Overview

### Design Goals

1. **Entertaining opponents** — bots should be fun to play against, not frustrating
2. **Believable behaviour** — bots should feel like real people, not algorithms
3. **Clear difficulty progression** — Easy bots are beatable by beginners; Hard bots challenge experienced players
4. **Personality-driven** — each bot has a distinct character with unique speech patterns and play styles
5. **LLM-powered personality** — use a large language model for nuanced decision-making (Medium/Hard) and personality-driven chat (all levels)

### Architecture Overview

```
[Game Engine] --> [Bot Decision Request]
                        |
                        v
                [Game State Formatter]
                        |
                        v
                [LLM Prompt Builder]
                  (personality + strategy + state)
                        |
                        v
                [LLM API Call]
                        |
                        v
                [Response Parser]
                  (extract action + amount + commentary)
                        |
                        v
                [Action Validator]
                  (ensure legal move)
                        |
                        v
                [Game Engine] <-- [Execute Action]
                        |
                        v
                [TTS Queue] --> 1. Dealer action confirmation (dealer voice)
                            --> 2. Bot chat message (bot's own voice, after dealer)
```

### Bot Chat Integration with Dealer TTS

Bot chat messages and dealer announcements share the same audio output but must not overlap. The integration rules:

1. **Separate voices**: Each bot has its own TTS voice, distinct from the dealer voice. This is how players tell them apart.
2. **Sequencing**: The dealer's action confirmation always plays **first** (e.g., "Sunny Sam calls 60."). The bot's chat message plays **after** the dealer finishes (e.g., "Ooh, I've got a good feeling about this one!").
3. **Queue priority**: Dealer announcements have higher priority than bot chat. If the game needs to move on (e.g., the next player's turn prompt), bot chat may be truncated or skipped.
4. **Chat is optional**: Not every action needs a chat message. The LLM may return an empty `chat` field, in which case only the dealer speaks.
5. **Concurrent bot chat**: If two bots act in quick succession, their chat messages queue sequentially — never overlap.
6. **Volume**: Bot chat should be slightly quieter than dealer announcements to maintain hierarchy.

---

## 2. Difficulty Levels

### Easy — "The Casual Player"

- **Target audience**: Complete beginners to poker
- **Win rate against Easy bot**: ~60-70% for a player who knows basic rules
- **Strategy profile**: Loose-Passive
- **Decision engine**: **Rules-based** (LLM used for chat/personality only — see Section 4)
- **Key behaviours**:
  - Plays too many hands (enters ~60-70% of pots)
  - Rarely raises or bets aggressively
  - Calls too often ("calling station" behaviour)
  - Doesn't bluff intentionally (but sometimes bets randomly)
  - Makes predictable, straightforward plays
  - Folds to big raises with weak hands
  - Doesn't adjust to opponent patterns
  - Occasionally makes obvious mistakes (e.g., checking the nuts on the river)

### Medium — "The Regular"

- **Target audience**: Players who know the basics and want a challenge
- **Win rate against Medium bot**: ~45-55% for an intermediate player
- **Strategy profile**: Tight-Aggressive (TAG)
- **Key behaviours**:
  - Plays a reasonable range of hands (~25-35% of pots)
  - Raises with strong hands, folds weak ones
  - Continuation-bets the flop after raising pre-flop (frequency adjusted for number of opponents — see Section 10)
  - Capable of basic bluffs (semi-bluffs with draws)
  - Position-aware (plays tighter from early position, looser from button)
  - Makes solid pot-sized bets with strong hands
  - Folds to sustained pressure without a strong hand
  - Has some awareness of opponent tendencies

### Hard — "The Shark"

- **Target audience**: Experienced players wanting a serious opponent
- **Win rate against Hard bot**: ~35-45% for an experienced player
- **Strategy profile**: Loose-Aggressive (LAG) with adaptive elements
- **Key behaviours**:
  - Plays a wide but deliberate range (~40-50% of pots)
  - Aggressive betting and raising with both strong hands and bluffs
  - Balances value bets and bluffs to be hard to read
  - Adjusts strategy based on opponent tendencies
  - Exploits opponents who are too tight or too loose
  - Applies pressure in position with large bets
  - Capable of multi-street bluffs
  - Varies bet sizing to disguise hand strength
  - Occasionally traps with slow plays
  - Uses pot odds and implied odds reasoning

---

## 3. Playing Style Framework

### The Four Quadrants

Poker playing styles exist on two axes:

```
        TIGHT                    LOOSE
        (selective hands)        (many hands)
        |                        |
AGGRESSIVE ----+----+----+----+----
(bet/raise)    |    |         |    |
               | TAG|         |LAG |
               |    |         |    |
               +----+---------+----+
               |    |         |    |
PASSIVE   ----| NIT|         |FISH|
(check/call)   |    |         |    |
               +----+---------+----+
```

| Style | Hands Played | Betting Pattern | Typical Label |
|-------|-------------|-----------------|---------------|
| **Tight-Aggressive (TAG)** | Few (20-30%) | Bets and raises | "Solid" / "Shark" |
| **Loose-Aggressive (LAG)** | Many (40-55%) | Bets and raises | "Maniac" / "Pro" |
| **Tight-Passive (NIT)** | Few (10-20%) | Checks and calls | "Rock" / "Nit" |
| **Loose-Passive (FISH)** | Many (50-70%) | Checks and calls | "Fish" / "Calling Station" |

### Mapping to Difficulty

| Difficulty | Primary Style | Secondary Traits |
|------------|--------------|------------------|
| **Easy** | Loose-Passive | Occasional Tight-Passive |
| **Medium** | Tight-Aggressive | Occasional Loose-Aggressive |
| **Hard** | Loose-Aggressive | Adaptive (shifts between all four) |

---

## 4. LLM Decision Engine

### Why Use an LLM?

Traditional poker bots use hand-coded decision trees or game-theory-optimal (GTO) solvers. These are technically strong but feel robotic and predictable. An LLM-powered bot can:

1. **Reason in natural language** about the game situation
2. **Express personality** through its decision process and chat
3. **Generate contextual commentary** that feels human
4. **Adapt strategy** based on described opponent patterns
5. **Make "human-like" mistakes** when instructed (for lower difficulty)

### The LLM Difficulty Control Problem

> **Known risk**: LLMs are fundamentally trained to be helpful and correct. Instructing an LLM to "play badly on purpose" fights against its training. Research (including Nate Silver's analysis) has shown LLMs struggle with poker decisions even when trying their best. Telling them to be deliberately weak produces inconsistent results — sometimes they ignore the instruction and play well, sometimes they make non-human mistakes, and sometimes they oscillate unpredictably.

**Our mitigation strategy — a hybrid approach by difficulty tier:**

| Difficulty | Decision Engine | LLM Role |
|------------|----------------|----------|
| **Easy** | **Rules-based decision tree** with controlled randomness | Chat/personality generation **only** — the LLM does not choose the poker action |
| **Medium** | **LLM-driven** (instructions align with LLM's training: "play solidly") | Full decision-making + chat |
| **Hard** | **LLM-driven** (instructions align: "play aggressively and exploit") | Full decision-making + chat |

This hybrid approach gives us:
- **Consistent Easy difficulty** — the rules engine always produces appropriately weak play
- **Human-like personality at all levels** — the LLM generates chat and reactions regardless
- **Best LLM performance for Medium/Hard** — the instructions align with how the model naturally reasons

### Decision Flow

#### Easy Bot Decision Flow (Hybrid — Rules + LLM for Chat)

```
[Game State] --> [Rules-Based Decision Engine]
                        |
                        v
                [Action decided by rules]
                        |
                        v
                [LLM Chat Generator]
                  (personality + game state + chosen action)
                        |
                        v
                [Response: action (from rules) + chat (from LLM)]
```

#### Medium & Hard Bot Decision Flow (Full LLM)

For each bot action, the LLM receives:

1. **System prompt**: Bot personality, difficulty level, strategy guidelines
2. **Game state**: Current hand context (see Section 5)
3. **Decision request**: "What is your action?"

The LLM returns a structured response:

```json
{
  "thinking": "I have top pair with a decent kicker. The pot is 200 and there's one caller. I should bet for value.",
  "action": "bet",
  "amount": 150,
  "chat": "Let's see where we stand.",
  "confidence": 0.8
}
```

### Structured Output

The LLM must return its response in a strict JSON format. Use constrained decoding or function calling to ensure valid output. The fields:

| Field | Type | Description |
|-------|------|-------------|
| `thinking` | string | Internal reasoning (not shown to players; useful for debugging) |
| `action` | enum | One of: `fold`, `check`, `call`, `bet`, `raise`, `all_in` |
| `amount` | number | Chip amount (for `bet`, `raise`); ignored for other actions |
| `chat` | string | Optional table talk to be spoken via TTS |
| `confidence` | float | 0.0-1.0 confidence level (used for timing/animation) |

---

## 5. Game State Context

### What to Pass to the LLM

The LLM needs enough context to make a reasonable decision without being overwhelmed. Structure the context as a clear text block.

```
=== GAME STATE ===

Your name: Lucky Luke
Your personality: Confident cowboy who likes to bluff
Difficulty: Hard

--- Hand Info ---
Hand #47
Your position: Button (Dealer)
Your hole cards: Ah Kd
Your stack: 1,850
Blinds: 25/50

--- Players ---
1. [SB] Sarah (Human) - Stack: 2,100 - Status: Active
2. [BB] Mike (Human) - Stack: 950 - Status: Active
3. [UTG] Robo Rick (Bot, Easy) - Stack: 1,600 - Status: Folded
4. [BTN] Lucky Luke (You) - Stack: 1,850 - Status: Active

--- Community Cards ---
Flop: Ks 7d 2c
Turn: (not yet dealt)
River: (not yet dealt)

--- Current Betting Round: Flop ---
Pot before this round: 200
Actions this round:
  - Sarah (SB): Check
  - Mike (BB): Bet 100
  - Your turn. The bet is 100 to you.

--- Hand History ---
Pre-flop:
  - Robo Rick (UTG): Fold
  - Lucky Luke (BTN): Raise to 150
  - Sarah (SB): Call 150
  - Mike (BB): Call 150
  Pot after pre-flop: 450

--- Your Hand Analysis ---
Current hand: Top pair (Kings) with Ace kicker
Draws: None
Relative strength: Very strong (top pair top kicker on a dry board)

--- Opponent Notes (from memory) ---
Sarah: Plays tight pre-flop, aggressive post-flop. Has bluffed 2 of last 5 hands.
Mike: Short-stacked. Tends to fold to large bets. Has not shown a bluff in 10 hands.

--- Legal Actions ---
You may: fold, call 100, raise (min 200, max 1850 all-in)
```

### Context Categories

| Category | Contents | Purpose |
|----------|----------|---------|
| **Identity** | Name, personality, difficulty | Sets character and skill level |
| **Hand info** | Position, hole cards, stack, blinds | Core decision data |
| **Players** | Names, stacks, statuses, positions | Table awareness |
| **Board** | Community cards, streets dealt | Board texture analysis |
| **Betting** | Current round actions, pot size | Pot odds calculation |
| **History** | Actions from previous streets this hand | Multi-street reasoning |
| **Hand analysis** | Pre-computed hand strength, draws | Helps LLM accuracy (see note) |
| **Opponent notes** | Tracked behavioural patterns | Enables adaptive play |
| **Legal actions** | Valid moves and bet ranges | Prevents illegal outputs |

> **Critical implementation note**: LLMs are notoriously poor at calculating hand rankings and pot odds from raw card data. **Pre-compute** hand strength, draw probabilities, and pot odds in code and include them as facts in the prompt. This drastically improves decision quality.

---

## 6. Prompt Architecture

### System Prompt Structure

The system prompt sets the bot's identity, difficulty constraints, and strategy guidelines. It remains constant across all decisions within a session.

#### Easy Bot System Prompt (Chat-Only — decisions are rules-based)

The Easy bot's poker decisions are made by a **rules-based engine** (see Section 9 & 10 for strategy tables). The LLM is only called to generate personality-driven chat responses.

```
You are a character sitting at a Texas Hold'em poker table. You are a casual,
friendly player who is still learning the game. You do NOT make poker decisions
-- those are handled for you. Your job is to provide in-character chat responses.

YOUR PERSONALITY:
{personality_description}

YOU JUST PERFORMED THIS ACTION:
{action_description}  (e.g., "You called a bet of 100" or "You folded")

THE CURRENT SITUATION:
{brief_game_context}

RESPOND WITH A SHORT CHAT MESSAGE (1-2 sentences max) that fits your personality
and reacts to what just happened. Be casual, natural, and in character.
Stay in character. Do not give poker advice. Do not reference being an AI.

Return your response as JSON: { "chat": "your message here" }
```

> **Why chat-only for Easy bots?** LLMs cannot reliably play badly on purpose. They are trained to be helpful and correct, so instructing them to make mistakes produces inconsistent, non-human errors. A rules-based engine gives us precise control over difficulty while the LLM provides the personality and banter that makes the bot feel human.

#### Medium Bot System Prompt

```
You are playing Texas Hold'em poker. You are a competent, experienced
recreational player who plays solid fundamental poker.

YOUR PERSONALITY:
{personality_description}

YOUR PLAYING STYLE:
- You play a tight-aggressive (TAG) style
- Pre-flop, you raise with strong hands and fold marginal ones
- You are position-aware: tighter from early position, looser from the button
- You continuation-bet the flop after raising pre-flop, but adjust frequency by
  the number of opponents: ~65-75% heads-up, ~40-50% vs 2, ~25-35% vs 3
- You make standard-sized bets (50-75% of the pot)
- You can semi-bluff with strong draws (flush draws, open-ended straights)
- You fold to sustained aggression without a strong hand
- You pay attention to pot odds for calling decisions

YOUR STRATEGIC GUIDELINES:
- Open-raise to 2.5-3x the big blind pre-flop
- Bet 50-75% of the pot on most streets
- Check-raise occasionally with very strong hands
- Fold to large river bets without at least top pair good kicker
- Don't call large bets chasing draws without proper pot odds

IMPORTANT RULES:
- You MUST return your decision as valid JSON
- Your "action" must be one of the legal actions listed
- Your "amount" must be within the legal range
- Keep your "chat" messages short (1-2 sentences max) and in character
```

#### Hard Bot System Prompt

```
You are playing Texas Hold'em poker. You are a skilled, dangerous player
who combines solid fundamentals with creative aggression.

YOUR PERSONALITY:
{personality_description}

YOUR PLAYING STYLE:
- You play a loose-aggressive (LAG) style with adaptive elements
- You open a wide range of hands, especially in position
- You apply relentless pressure with bets and raises
- You balance your range: you bet with both strong hands AND bluffs
- You vary your bet sizing to be unpredictable
- You are capable of multi-street bluffs when the story makes sense
- You occasionally slow-play monster hands to trap aggressive opponents
- You exploit opponents: against tight players, steal more; against loose
  players, value-bet thinner

YOUR STRATEGIC GUIDELINES:
- Open-raise with a wide range from late position (40-50% of hands)
- Play tighter from early position (20-25% of hands)
- Use bet sizing tells strategically (sometimes bet small with monsters)
- Three-bet pre-flop aggressively, especially in position
- Continuation-bet flops that favour your perceived range
- Barrel (bet multiple streets) when scare cards arrive
- Adjust to opponents: refer to the opponent notes and exploit patterns
- Calculate pot odds and implied odds for drawing decisions

EXPLOIT PATTERNS TO WATCH:
- If an opponent folds to c-bets more than 60%: bluff more on the flop
- If an opponent calls too much: value-bet thinner, bluff less
- If an opponent raises rarely: respect their raises (they have it)
- If an opponent is short-stacked: apply pressure with medium hands

IMPORTANT RULES:
- You MUST return your decision as valid JSON
- Your "action" must be one of the legal actions listed
- Your "amount" must be within the legal range
- Keep your "chat" messages short (1-2 sentences max) and in character
- In your "thinking", explicitly reason about pot odds, hand strength,
  and opponent tendencies
```

---

## 7. Bot Personalities

Each bot should have a distinct personality that comes through in their chat messages, timing, and play style. Below are example personality profiles.

### Easy Bot Personalities

#### "Sunny Sam"
- **Archetype**: The optimistic newcomer
- **Chat style**: Cheerful, easily impressed, self-deprecating
- **Example chat**: "Ooh, nice cards for me!" / "Ah well, can't win 'em all!" / "This is exciting!"
- **Play quirks**: Gets excited about any pair; calls with marginal hands because they "have a feeling"

#### "Cautious Carol"
- **Archetype**: The nervous beginner
- **Chat style**: Hesitant, apologetic, over-explains decisions
- **Example chat**: "I'll just call, I suppose..." / "Oh gosh, is that a lot?" / "Sorry, still learning!"
- **Play quirks**: Folds too much to aggression; rarely raises; always worried about losing

#### "Chatty Charlie"
- **Archetype**: The social player who's there for the banter
- **Chat style**: Talkative, makes jokes, comments on everything
- **Example chat**: "Here we go again!" / "You're bluffing, I can tell!" / "This reminds me of a time..."
- **Play quirks**: Plays too many hands because sitting out is boring; calls to stay in the conversation

### Medium Bot Personalities

#### "Steady Eddie"
- **Archetype**: The solid regular
- **Chat style**: Calm, measured, matter-of-fact
- **Example chat**: "Raise." / "Fair enough." / "Good hand."
- **Play quirks**: Textbook TAG play; rarely deviates from strategy; predictable but tough

#### "Cool Katie"
- **Archetype**: The confident recreational player
- **Chat style**: Relaxed, witty, competitive
- **Example chat**: "Let's make this interesting." / "I like my chances." / "Nice try."
- **Play quirks**: More willing to make creative plays than Steady Eddie; occasionally tries a bluff

#### "Old School Ozzy"
- **Archetype**: The experienced home game veteran
- **Chat style**: Gruff, been-there-done-that, poker wisdom
- **Example chat**: "I've seen this before." / "You'll learn." / "That's the way it goes."
- **Play quirks**: Plays solid but old-fashioned; doesn't adapt much; relies on experience

### Hard Bot Personalities

#### "The Viper"
- **Archetype**: The cold, calculating shark
- **Chat style**: Minimal, intimidating, precise
- **Example chat**: "Raise." / "..." / "Your call."
- **Play quirks**: Silent and aggressive; applies maximum pressure; uses bet sizing as a weapon

#### "Lucky Luke"
- **Archetype**: The charismatic risk-taker
- **Chat style**: Confident, playful, loves the action
- **Example chat**: "Let's gamble." / "You sure about that?" / "What's life without a little risk?"
- **Play quirks**: Wide opening range; loves to bluff; makes big moves that look reckless but are calculated

#### "Professor Pat"
- **Archetype**: The analytical strategist
- **Chat style**: Thoughtful, occasionally references poker theory
- **Example chat**: "Interesting spot." / "The maths says yes." / "I've got the right price."
- **Play quirks**: Makes decisions based on explicit reasoning; GTO-influenced; hard to exploit

---

## 8. Making Bots Feel Human

### Timing Variation

Bots must not respond instantly — this feels robotic. Introduce variable thinking time:

| Decision Complexity | Easy Bot | Medium Bot | Hard Bot |
|--------------------|----------|------------|----------|
| Obvious fold | 0.5-1.5s | 0.5-1.5s | 0.5-1s |
| Standard call | 1-2s | 1-3s | 1-2s |
| Standard raise | 1.5-3s | 2-4s | 1-3s |
| Big decision (all-in) | 3-6s | 4-8s | 3-7s |
| Bluff | 2-4s | 3-5s | 2-5s |

> **Note**: Easy bots should feel quick and breezy — they don't overthink. In a 4-player game with 3 bots and 4 betting rounds, slow bot turns compound quickly. A 10-second wait for an Easy bot decision would feel glacial.

**Timing calculation**: The artificial delay should be calculated as `target_time - actual_processing_time`. If the rules engine (Easy) or LLM call (Medium/Hard) takes 1.5s and the target thinking time is 2s, add only 0.5s of artificial delay.

Use the `confidence` field from the LLM response to modulate timing (Medium/Hard bots):
- High confidence (0.8-1.0): Respond faster
- Low confidence (0.2-0.5): Take longer, add a "thinking" animation

### Behavioural Tells (Subtle Cues)

Give bots subtle behavioural patterns that observant players can pick up on:

| Tell | Meaning | Bot Level |
|------|---------|-----------|
| Quick call | Strong hand (confident) | Easy, Medium |
| Long pause before bet | Bluffing (nervous) | Easy |
| Chat before big bet | Trying to distract (bluffing) | Medium |
| Silence after raise | Strong hand (focused) | Hard |
| Varying bet speed | No pattern (unpredictable) | Hard |

> **Important**: Easy bots should have obvious tells. Medium bots should have subtle tells. Hard bots should have **false tells** (deliberately misleading timing).

### Chat Frequency & Context

| Situation | Easy Bot | Medium Bot | Hard Bot |
|-----------|----------|------------|----------|
| Winning a hand | Always chats | Sometimes chats | Rarely chats |
| Losing a hand | Often chats (self-deprecating) | Sometimes chats | Rarely chats |
| Making a big bet | Chats excitedly | Occasionally quips | Silent or one word |
| Being bluffed (caught) | "I knew it!" | "Well played." | Silence |
| Folding | Often sighs/comments | Occasionally | Silent |

### Emotional State Simulation

Track a simple emotional state for each bot that influences decisions and chat:

```
emotional_state = {
  "tilt": 0.0,        // 0 = calm, 1 = fully tilted
  "confidence": 0.5,  // 0 = timid, 1 = overconfident
  "boredom": 0.0      // 0 = engaged, 1 = distracted
}
```

**Tilt triggers**:
- Losing a big pot: +0.2 tilt
- Getting bluffed (and shown): +0.3 tilt
- Bad beat (lost with strong hand): +0.4 tilt
- Winning a big pot: -0.3 tilt (resets towards calm)

**Tilt effects** (by difficulty):
- **Easy bots**: Tilt heavily — play even looser, call more, get stubborn
- **Medium bots**: Tilt moderately — slightly looser play, occasional frustrated chat
- **Hard bots**: Tilt minimally — tiny adjustments, might chat about it but play stays sharp

### Stack-Based Behaviour

Bots should adjust to their stack size:

| Stack Size | Behaviour |
|------------|-----------|
| Deep (100+ BB) | Full range of play; comfortable |
| Medium (40-100 BB) | Standard play |
| Short (20-40 BB) | Tighter; looking for spots to shove |
| Desperate (< 20 BB) | Push/fold mode; all-in or fold |
| Just rebought | Fresh and cautious for 2-3 hands |

### Bot Rebuy & Bankroll Policy

Bots need clear rules for how they handle busting out and rebuying. Without this, bots feel like ATMs that endlessly feed chips to human players.

| Rule | Easy Bot | Medium Bot | Hard Bot |
|------|----------|------------|----------|
| **Auto-rebuy on bust** | Yes, always | Yes, always | Yes, always |
| **Rebuy amount** | Always max buy-in (100 BB) | Max buy-in (100 BB) | Varies: 60-100 BB (to simulate human behaviour) |
| **Top-up between hands** | Never (doesn't think about it) | Tops up when below 50 BB | Tops up when below 40 BB (plays short for a few hands first) |
| **Leave the table** | Never (always available) | Never (always available) | Never (always available) |
| **Behaviour after rebuy** | Immediately back to normal | Slightly tighter for 2-3 hands | Plays cautiously for 3-5 hands, then adjusts |
| **Chat on rebuy** | "Here we go again!" / "Back for more!" | "Alright, let's go." | Minimal — silence or a brief comment |

> **Design note**: Bots always rebuy and never voluntarily leave. In a casual 4-player game, having a bot quit would disrupt the experience. The goal is to keep all seats filled. If the human player is on a massive heater and bots are haemorrhaging chips, the bots' rebuys simply keep the game going — this is expected and desirable for a casual cash game format.

---

## 9. Pre-Flop Strategy by Difficulty

### Hand Categories

| Category | Hands | Description |
|----------|-------|-------------|
| **Premium** | AA, KK, QQ, AKs | Always raise/re-raise |
| **Strong** | JJ, TT, AQs, AKo, AQo | Raise in most positions |
| **Playable** | 99-77, AJs-ATs, KQs, KJs, QJs | Raise from mid/late position |
| **Speculative** | 66-22, suited connectors (T9s-54s), suited aces (A9s-A2s) | Play from late position or as calls |
| **Marginal** | Offsuit broadways (KJo, QJo, JTo), weak suited hands | Fold from early position; occasional play from button |
| **Trash** | Everything else | Fold |

### Opening Ranges by Position (4-Player Table)

#### Easy Bot

| Position | Range (~60-70% of hands) |
|----------|-------------------------|
| UTG | All pairs, all suited aces, all suited broadways, all offsuit broadways, suited connectors down to 54s, random offsuit hands |
| Button | Nearly everything — folds only the worst hands |
| SB | Calls with almost anything |
| BB | Checks option always; calls raises with almost anything |

> Easy bots enter far too many pots. They call pre-flop raises with hands like K4o, J6s, etc.

#### Medium Bot

| Position | Range (~25-35% of hands) |
|----------|-------------------------|
| UTG | 77+, ATs+, KQs, AJo+, KQo |
| Button | 55+, A2s+, K9s+, Q9s+, J9s+, T9s, ATo+, KJo+, QJo |
| SB | Similar to button but calls more than raises |
| BB | Defends with top 40-50% against standard raises |

#### Hard Bot

| Position | Range (~40-50% of hands) |
|----------|-------------------------|
| UTG | 55+, A2s+, K9s+, Q9s+, J9s+, T9s, ATo+, KJo+ |
| Button | 22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 97s+, 87s, 76s, A2o+, K8o+, Q9o+, J9o+, T9o |
| SB | 3-bets aggressively OR completes with a wide range |
| BB | Defends aggressively; 3-bets premium hands and some bluffs |

---

## 10. Post-Flop Strategy by Difficulty

### Flop Strategy

#### Easy Bot
- **Has a pair or better**: Calls any bet up to the pot size
- **Has a draw**: Calls any bet (doesn't consider odds)
- **Has nothing**: Checks and folds to a bet (~60% of the time) or calls out of curiosity (~40%)
- **Rarely bets**: Only bets with two pair or better
- **Never check-raises**

#### Medium Bot
- **Strong hand (top pair+)**: Bets 50-70% of the pot for value
- **Draw (flush/straight)**: Semi-bluffs ~40% of the time; calls with correct odds
- **Nothing (as pre-flop raiser)**: Continuation-bets with frequency adjusted by number of opponents:
  - Heads-up: ~65-75% of the time, 40-50% pot
  - 2 opponents: ~40-50% of the time, 40-50% pot
  - 3 opponents: ~25-35% of the time (rarely bluff into a crowd)
- **Nothing (as caller)**: Check-folds most of the time
- **Check-raises**: Occasionally with very strong hands (sets, two pair)

#### Hard Bot
- **Strong hand**: Varies between betting (60%) and check-raising (20%) and slow-playing (20%)
- **Draw**: Aggressive with equity — bets and raises as semi-bluffs
- **Nothing**: Bluffs on good board textures where the flop favours their perceived range
- **Reads opponent**: If opponent folds to c-bets often, bluffs more; if opponent calls a lot, bluffs less
- **Bet sizing**: Varies intentionally to be harder to read

### Turn & River Strategy

| Factor | Easy | Medium | Hard |
|--------|------|--------|------|
| **Value betting** | Under-bets (weak sizing) | Standard (60-75% pot) | Varies (40-125% pot) |
| **Bluffing** | Almost never | Semi-bluffs with draws | Multi-street bluffs |
| **Folding to bets** | Calls too much | Folds without strong hands | Folds strategically |
| **River check-raise** | Never | Very rarely | Occasionally (polarised) |
| **Bet-sizing reads** | None | Basic | Advanced (adjusts to opponent sizing) |

---

## 11. Bluffing & Deception

### Bluff Frequency by Difficulty

| Difficulty | Bluff Frequency | Bluff Types |
|------------|----------------|-------------|
| **Easy** | ~5% of bets are bluffs | Accidental (bets without realising they're behind) |
| **Medium** | ~20% of bets are bluffs | Semi-bluffs with equity (draws); occasional pure bluff on river |
| **Hard** | ~35% of bets are bluffs | Balanced mix: semi-bluffs, pure bluffs, overbets as bluffs |

### When Hard Bots Bluff

The Hard bot should bluff in spots where it makes strategic sense:

1. **Missed draws on the river**: Bet as a bluff because checking guarantees losing
2. **Scare cards**: When an Ace, King, or completing straight/flush card falls and the bot can represent it
3. **Continuation from previous streets**: If the bot bet the flop and turn, a river bet tells a consistent story
4. **Against tight opponents**: More bluffs against players who fold a lot
5. **In position**: Bluff more when acting after the opponent (can see weakness)
6. **With blockers**: When holding cards that reduce the chance the opponent has a strong hand

### Multi-Street Bluff Example (Hard Bot)

```
Pre-flop: Hard bot raises with 9h 8h from the button
Flop: Ks 7d 2c — Bot c-bets (representing the King)
Turn: 5s — Bot bets again (continuing the story; picks up a gutshot)
River: Qc — Bot bets large (representing KQ or better; 6 hit nothing)
```

This is a "triple barrel bluff" — three bets across three streets with no made hand.

---

## 12. Performance & Cost Optimisation

### LLM Call Frequency

Every bot decision requires an LLM API call. In a 4-player game with 3 bots, this means up to **3 LLM calls per action round** and **12+ calls per hand**. Optimisation is critical.

### Cost Reduction Strategies

| Strategy | Description | Savings |
|----------|-------------|---------|
| **Rules-based Easy bots + small model for chat** | Easy bots use a rules engine for decisions; LLM only generates chat (e.g., Haiku, GPT-4o-mini) | 90%+ cost reduction for Easy |
| **Use a medium model for Medium bots** | Medium bots need decent reasoning (e.g., Sonnet) | 50% cost reduction vs full model |
| **Use the full model for Hard bots only** | Hard bots need the best reasoning (e.g., Opus, GPT-4o) | Full price but only for 1 bot |
| **Pre-flop lookup table** | For Easy and Medium bots, use a hard-coded pre-flop decision table instead of the LLM | Eliminates ~30% of LLM calls |
| **Batch similar decisions** | If multiple bots need to decide in the same round, batch the requests | Lower latency |
| **Cache personality prompts** | System prompts are static per bot; cache them | Fewer tokens per request |
| **Short game state context** | Only include relevant information; don't send full hand history for Easy bots | Fewer input tokens |

### Model Selection by Difficulty

| Difficulty | Recommended Model | Reasoning | Approx. Cost per Decision |
|------------|-------------------|-----------|--------------------------|
| **Easy** | Claude Haiku 4.5 / GPT-4o-mini | Chat generation only (decisions are rules-based) | Very low |
| **Medium** | Claude Sonnet 4.5 | Solid reasoning, good personality | Low |
| **Hard** | Claude Opus 4.6 / GPT-4o | Best reasoning, nuanced play | Moderate |

### LLM Temperature Settings

Temperature controls randomness in LLM output. This is a critical tuning lever for bot behaviour.

| Difficulty | Temperature | Rationale |
|------------|-------------|-----------|
| **Easy** | 0.9-1.0 | High temperature for varied, colourful chat messages. (Decisions are rules-based, so temperature only affects chat personality.) |
| **Medium** | 0.4-0.6 | Moderate temperature for consistent, solid decision-making with some natural variation. |
| **Hard** | 0.2-0.4 | Low temperature for precise, calculated decisions. Occasionally bump to 0.6-0.8 for specific bluff-heavy situations to introduce creative unpredictability. |

> **Tuning guidance**: Start with these defaults and adjust during playtesting. If Medium bots feel too predictable, raise temperature slightly. If Hard bots make erratic decisions, lower it. Log temperature alongside decisions for analysis.

### Latency Budget

| Component | Target |
|-----------|--------|
| Game state formatting | < 10ms |
| LLM API call | < 1,500ms (Easy), < 2,500ms (Medium), < 4,000ms (Hard) |
| Response parsing | < 10ms |
| Action validation | < 5ms |
| **Total bot turn** | < 2s (Easy), < 3s (Medium), < 5s (Hard) |

> Add artificial delay (Section 8) on top of actual processing time to simulate human-like thinking.

### Fallback Strategy

If the LLM is unavailable or times out:
1. Use a hard-coded **fallback decision tree** based on hand strength
2. Strong hand (top pair+) → bet/raise
3. Draw → check/call
4. Nothing → check/fold
5. Log the failure for monitoring

---

## 13. Implementation Architecture

### Bot Manager

```typescript
interface BotDecision {
  thinking: string;
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';
  amount?: number;
  chat?: string;
  confidence: number;
}

interface BotConfig {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  personality: PersonalityProfile;
  model: string;          // LLM model ID
  systemPrompt: string;   // Cached system prompt
  emotionalState: EmotionalState;
  opponentNotes: Map<string, OpponentProfile>;
}

interface GameContext {
  handNumber: number;
  position: Position;
  holeCards: [Card, Card];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  stack: number;
  players: PlayerState[];
  bettingHistory: Action[];
  handAnalysis: HandAnalysis;   // Pre-computed
  legalActions: LegalAction[];
}
```

### Opponent Tracking

The bot maintains a simple profile of each opponent, updated after every hand:

```typescript
interface OpponentProfile {
  handsPlayed: number;
  handsWon: number;
  vpip: number;           // % of hands where player voluntarily put chips in pot
  pfr: number;            // % of hands where player raised pre-flop
  aggression: number;     // (bets + raises) / (bets + raises + calls + checks)
  foldToCBet: number;     // % of time player folds to a continuation bet
  showdownWinRate: number; // % of showdowns won
  lastActions: Action[];  // Last N actions for short-term pattern detection
  notes: string;          // LLM-generated summary updated periodically
}
```

**Easy bots** ignore opponent tracking entirely.
**Medium bots** use basic stats (VPIP, PFR, aggression).
**Hard bots** use full opponent profiles and adjust strategy accordingly.

### Pre-Computed Hand Analysis

Always compute and include these in the prompt rather than asking the LLM to calculate:

```typescript
interface HandAnalysis {
  madeHand: string;           // e.g., "Top pair, Ace kicker"
  handRank: number;           // Numeric ranking (1-10 scale)
  relativeStrength: string;   // e.g., "Very strong", "Medium", "Weak"
  draws: string[];            // e.g., ["Flush draw (9 outs)", "Gutshot (4 outs)"]
  outs: number;               // Total outs to improve
  potOdds: number;            // Current pot odds as ratio
  impliedOdds: string;        // Qualitative assessment
  boardTexture: string;       // e.g., "Dry", "Wet", "Monotone"
  possibleThreats: string[];  // e.g., ["Flush possible", "Straight possible"]
}
```

### LLM Request Pipeline

```
1. Game Engine signals bot's turn
2. Bot Manager builds GameContext
3. Hand Analyser computes HandAnalysis
4. Opponent Tracker provides OpponentProfiles
5. Prompt Builder assembles full prompt:
   [System Prompt] + [Game State] + [Hand Analysis] + [Opponent Notes] + [Legal Actions]
6. LLM API call (with timeout and retry)
7. Response Parser extracts BotDecision
8. Action Validator confirms legality
9. If invalid: re-prompt with error OR use fallback
10. Timing Engine adds human-like delay
11. Action executed in Game Engine
12. Chat message sent to TTS for delivery
```

---

## References

- [PokerNews - Poker Range Charts](https://www.pokernews.com/poker-range-charts)
- [Pokerology - Poker Playing Styles](https://www.pokerology.com/lessons/poker-playing-styles/)
- [PokerBench - Training LLMs for Poker](https://arxiv.org/html/2501.08328v1)
- [PokerGPT - End-to-End LLM Poker Solver](https://arxiv.org/abs/2401.06781)
- [Poker.org - AI Poker Battle of the LLMs](https://www.poker.org/poker-strategy/the-ai-poker-battle-of-the-llms-a-detailed-analysis-as5Bg7J3P4g2/)
- [3UP Gaming - Human-Like Poker Bot AI](https://3upgaming.com/exploring-the-human-like-decision-making-poker-bot-ai/)
- [3UP Gaming - AI Opponents in Poker Apps](https://www.3upgaming.com/blog/how-ai-opponents-enhance-the-poker-app-experience/)
- [Nate Silver - ChatGPT is Bad at Poker](https://www.natesilver.net/p/chatgpt-is-shockingly-bad-at-poker)
- [EasyPoker - Poker Playing Styles Guide](https://easy.poker/poker-playing-styles/)
- [Upswing Poker - Starting Hands Guide](https://upswingpoker.com/texas-holdem-starting-hands-guide/)
- [SplitSuit Poker - Range Reading](https://www.splitsuit.com/poker-ranges-reading)

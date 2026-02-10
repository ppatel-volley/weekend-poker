# Voice Command System Design

> Voice interaction design for the poker dealer and player commands.
> Platform: **Smart TV / Fire TV** | **Voice-first with remote fallback**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Player Voice Commands](#2-player-voice-commands)
3. [Natural Language Variations](#3-natural-language-variations)
4. [Dealer TTS Responses](#4-dealer-tts-responses)
5. [Conversational Flow](#5-conversational-flow)
6. [Confirmation Patterns](#6-confirmation-patterns)
7. [Error Handling](#7-error-handling)
8. [Voice Command State Machine](#8-voice-command-state-machine)
9. [Bet Amount Parsing](#9-bet-amount-parsing)
10. [Multi-Player Voice Identification](#10-multi-player-voice-identification)
11. [Accessibility & Fallback](#11-accessibility--fallback)
12. [Dealer Personality & Tone](#12-dealer-personality--tone)
13. [Implementation Notes](#13-implementation-notes)

---

## 1. System Overview

### Architecture

```
Player speaks
    |
    v
[Wake word / Push-to-talk] --> Microphone captures audio
    |
    v
[Speech-to-Text (STT)] --> Raw transcript
    |
    v
[Intent Recognition (NLU)] --> Parsed intent + entities (action, amount, target)
    |
    v
[Game Engine Validation] --> Is the action legal in the current game state?
    |
    v
[Action Execution] --> Update game state
    |
    v
[Dealer Response (TTS)] --> Spoken confirmation + visual update
```

### Input Modes (Priority Order)
1. **Voice command** — primary interaction method
2. **Remote control** — directional pad for action selection, confirm button
3. **Mobile companion app** — touch-based backup (see mobile controller doc)

### Key Design Principles
- **Be forgiving**: Accept a wide range of phrasings for the same intent
- **Be brief**: Dealer responses should be short and snappy, not verbose
- **Be clear**: Always confirm what was understood before executing critical actions
- **Be fast**: Minimise latency between command and response (target < 500ms for local processing)
- **Be contextual**: Only offer actions that are currently legal

---

## 2. Player Voice Commands

### Core Action Commands

| Intent | Canonical Command | Game State Required |
|--------|-------------------|---------------------|
| **Fold** | "Fold" | Player's turn, any betting round |
| **Check** | "Check" | Player's turn, no bet to call |
| **Call** | "Call" | Player's turn, facing a bet |
| **Bet** | "Bet [amount]" | Player's turn, no bet yet in this round |
| **Raise** | "Raise to [amount]" | Player's turn, facing a bet |
| **All-In** | "All in" | Player's turn, any betting round |

### Informational Commands (Available Any Time)

| Intent | Canonical Command | Response |
|--------|-------------------|----------|
| **Check pot** | "What's the pot?" | Dealer announces current pot size |
| **Check stack** | "How many chips do I have?" | Dealer announces player's stack |
| **Check bet** | "What's the bet?" | Dealer announces current bet to call |
| **How much to call** | "How much to call?" | Dealer announces the **additional** chips needed (not the total bet) |
| **Read my cards** | "What do I have?" / "Show my cards" | Dealer re-reads the player's hole cards aloud |
| **Check blinds** | "What are the blinds?" | Dealer announces blind levels |
| **Show hand rankings** | "Show hand rankings" | Visual overlay of hand rankings |
| **Repeat** | "Repeat that" / "Say that again" | Dealer repeats the last announcement |
| **Help** | "Help" / "What can I say?" | Brief list of available commands |

### Table Management Commands

| Intent | Canonical Command | Effect |
|--------|-------------------|--------|
| **Sit out** | "Sit out" / "Take a break" | Player sits out next hand |
| **Come back** | "I'm back" / "Deal me in" | Player returns from sitting out |
| **Rebuy** | "Rebuy" / "Buy more chips" | Opens rebuy dialogue |
| **Leave table** | "Leave" / "Cash out" | Player leaves the table |
| **Pause game** | "Pause" | Pause (single-player/host only) |
| **Settings** | "Settings" / "Options" | Open settings menu |

---

## 3. Natural Language Variations

The intent recognition system must handle a broad range of natural phrasings. Below are the key variations grouped by intent.

### Fold

```
"Fold"
"I fold"
"I'm out"
"Fold my hand"
"Muck it"
"Throw it away"
"I'll pass"          (ambiguous -- could mean check; context-dependent)
"No thanks"
"Drop"
"Get me out"
```

### Check

```
"Check"
"I check"
"Knock"              (traditional poker gesture/word)
"Pass"               (ambiguous -- see fold)
"No bet"
"I'm good"
"Check it"
"Tap"
```

> **Disambiguation**: "Pass" should resolve to **check** if no bet is facing the player, and prompt for clarification if a bet is active ("Did you mean fold?").

### Call

```
"Call"
"I call"
"I'll call"
"Match it"
"Match the bet"
"Call the bet"
"Stay in"
"I'm in"
"Pay"
"See the bet"
```

### Bet

```
"Bet [amount]"
"I bet [amount]"
"Put in [amount]"
"Wager [amount]"
"[amount]"           (bare number when it's your turn and no bet is open)
```

### Raise

```
"Raise"
"Raise to [amount]"
"Raise [amount]"     (ambiguous: raise BY or raise TO -- needs handling)
"Bump it"
"Bump it to [amount]"
"Make it [amount]"
"I raise to [amount]"
"Re-raise"
"Three-bet" / "3-bet"
"Raise it up"
"Pop it to [amount]"
```

> **Critical ambiguity**: "Raise 100" could mean "raise TO 100" or "raise BY 100". Our system should default to "raise TO [amount]" and confirm. If the amount is less than the current bet, interpret as "raise BY".

### All-In

```
"All in"
"I'm all in"
"All-in"
"Shove"
"Ship it"
"Push"
"Go all in"
"Put it all in"
"Everything"
"All my chips"
"Jam"
"Send it"
```

### Pot-Related Bets

```
"Bet the pot"
"Pot"
"Pot-sized bet"
"Half pot"
"Half the pot"
"Two-thirds pot"
"Three-quarters pot"
"Overbet" / "Overbet the pot"
```

### Relative Bets (Big Blind Multiples)

```
"Raise to 3x"
"Three times the blind"
"3x the big blind"
"Min raise" / "Minimum raise"
"Double the bet"
```

---

## 4. Dealer TTS Responses

The dealer is the game's voice — every state change, every action, every announcement flows through them.

### Hand Progression Announcements

| Game Event | Dealer Says |
|------------|-------------|
| New hand starts | "New hand. [Player] is the dealer." |
| Blinds posted | "Blinds are in. [SB player], [amount] small blind. [BB player], [amount] big blind." |
| Hole cards dealt | "Cards are out. [UTG player], you're first to act." |
| Flop dealt | "The flop: [card] [card] [card]." |
| Turn dealt | "The turn: [card]." |
| River dealt | "The river: [card]." |
| Showdown | "Let's see what you've got." |
| Winner | "[Player] wins [amount] with [hand name]." |
| Split pot | "Split pot. [amount] each." |
| All fold to one | "[Player] takes it down." |

### Action Confirmations

| Player Action | Dealer Says |
|---------------|-------------|
| Fold | "[Player] folds." |
| Check | "[Player] checks." / "Check." |
| Call | "[Player] calls [amount]." |
| Bet | "[Player] bets [amount]." |
| Raise | "[Player] raises to [amount]." |
| All-in | "[Player] is all in for [amount]." |
| Call all-in | "[Player] calls. All in." |

### Turn Prompts

| Situation | Dealer Says |
|-----------|-------------|
| Player's turn (no bet) | "[Player], it's on you. You can check or bet." |
| Player's turn (facing bet) | "[Player], [amount] to call." |
| Player's turn (facing raise) | "[Player], it's been raised to [amount]." |
| Time warning | "[Player], ten seconds." |
| Timeout | "[Player] folds on time." / "[Player] checks on time." |

### Informational Responses

| Query | Dealer Says |
|-------|-------------|
| Pot size | "The pot is [amount]." |
| Player stack | "You've got [amount] in chips." |
| Current bet | "[Amount] to call." / "No bet to you." |
| How much to call | "You need [additional amount] more to call." (e.g., if bet is 200 and player already has 60 in, dealer says "You need 140 more to call.") |
| Read my cards | "You've got the [rank] of [suit] and the [rank] of [suit]." |
| Blind level | "Blinds are [SB] / [BB]." |
| Repeat | Dealer repeats the last spoken announcement verbatim. |

---

## 5. Conversational Flow

### Standard Hand Flow (Dealer Narration)

```
Dealer: "New hand. Sarah is the dealer. Blinds are 10 and 20."
        "Cards are out. Mike, you're first to act."

Mike:   "Raise to 60."
Dealer: "Mike raises to 60. Sarah, it's on you."

Sarah:  "Call."
Dealer: "Sarah calls. Alex?"

Alex:   "I'm out."
Dealer: "Alex folds. Jordan, 60 to call."

Jordan: "Call."
Dealer: "Jordan calls. Three to the flop."
        "The flop: King of hearts, seven of diamonds, two of clubs."
        "Jordan, you're first to act."

Jordan: "Check."
Dealer: "Check. Mike?"

Mike:   "Bet 80."
Dealer: "Mike bets 80. Sarah, 80 to call."

Sarah:  "Fold."
Dealer: "Sarah folds. Jordan?"

Jordan: "All in."
Dealer: "Jordan's all in for 340. Mike, 260 to call."

Mike:   "Call."
Dealer: "Mike calls. Let's see 'em."
        [Cards revealed]
        "The turn: Jack of spades."
        "The river: Three of hearts."
        "Jordan wins 860 with a pair of kings."
```

### Rebuy Flow

```
Dealer: "Jordan, you're out of chips. Would you like to rebuy?"
Jordan: "Rebuy."
Dealer: "How much? The minimum is 200, maximum 1000."
Jordan: "500."
Dealer: "Jordan rebuys for 500. Welcome back."
```

### Sitting Out Flow

```
Jordan: "Sit out."
Dealer: "Jordan is sitting out."
        [After 3 hands]
Dealer: "Jordan, you've been away for 3 hands. Returning you to the table."
Jordan: "Deal me in."
Dealer: "Welcome back, Jordan. You'll be dealt in next hand."
```

---

## 6. Confirmation Patterns

### Implicit Confirmation (Default)

For most actions, the dealer **repeats the action** as confirmation. The player can immediately object if the system misheard.

```
Player: "Call."
Dealer: "Mike calls 60."    <-- implicit confirmation
```

If the player says nothing, the action stands. If the player says "No" or "Wait" within a short window (2 seconds), the action is cancelled.

### Explicit Confirmation (Critical Actions)

For high-stakes or irreversible actions, the dealer asks for explicit confirmation.

**Triggers for explicit confirmation:**
- **All-in** — always confirm
- **Large bets** — bets exceeding 50% of the player's stack
- **Raise amounts that seem unusual** — e.g., raising to an amount that's 10x the pot or more
- **Leaving the table** — always confirm

```
Player: "All in."
Dealer: "All in for 1,500. Are you sure?"
Player: "Yes." / "Do it." / "Confirm."
Dealer: "Mike is all in for 1,500."
```

```
Player: "All in."
Dealer: "All in for 1,500. Are you sure?"
Player: "No." / "Wait." / "Cancel."
Dealer: "Cancelled. It's still your action, Mike."
```

### Confirmation Acceptance Phrases

```
"Yes" / "Yeah" / "Yep" / "Aye"
"Confirm" / "Do it" / "Go ahead"
"Sure" / "Absolutely"
"That's right" / "Correct"
```

### Cancellation Phrases

```
"No" / "Nope" / "Nah"
"Cancel" / "Never mind" / "Wait"
"Hold on" / "Stop"
"Go back" / "Undo"
```

### Undo / Correction Rules by Action Type

Within the 2-second implicit confirmation window, a player may say "No", "Wait", "Cancel", or "Actually..." to revoke an action. The rules differ by action type:

| Action | Revocable? | Rule |
|--------|-----------|------|
| **Fold** | **No** — irrevocable | Once confirmed, the hand is dead. Standard poker rule. The dealer says: "Fold stands." |
| **Check** | Yes — within 2s | Revocable if no other player has acted since. Player can then choose a different action. |
| **Call** | Yes — within 2s | Revocable if no other player has acted since. Chips are returned and player can choose again. |
| **Bet** | Yes — within 2s | Revocable if no other player has acted since. Chips are returned. |
| **Raise** | Yes — within 2s | Revocable if no other player has acted since. Chips are returned. |
| **All-in** | Yes — within explicit confirmation only | All-in always uses explicit confirmation ("Are you sure?"), so the player confirms or cancels before it executes. Once confirmed, it is irrevocable. |

> **Key principle**: A fold is always final. All other actions can be taken back within the 2-second window, provided no subsequent player has acted. Once the next player acts, all previous actions are locked.

**Correction flow example**:
```
Player: "Call."
Dealer: "Mike calls 60."
Player: "Wait — actually, raise."     [within 2 seconds]
Dealer: "Call cancelled. How much would you like to raise to?"
Player: "200."
Dealer: "Mike raises to 200."
```

---

## 7. Error Handling

### Misheard Command

```
Player: [unintelligible]
Dealer: "Sorry, I didn't catch that. Could you say that again?"
        [Wait for retry]
```

### Invalid Action

```
Player: "Check."    [but there's a bet to call]
Dealer: "You can't check — there's 60 to call. Would you like to call, raise, or fold?"
```

```
Player: "Raise to 30."    [but minimum raise is 60]
Dealer: "The minimum raise is 60. Would you like to raise to 60?"
Player: "Yes."
Dealer: "Mike raises to 60."
```

### Ambiguous Command

```
Player: "Raise 100."
Dealer: "Raise to 100, or raise by 100?"
Player: "To 100."
Dealer: "Mike raises to 100."
```

```
Player: "Pass."     [could be check or fold]
Dealer: "Check or fold?"
Player: "Check."
Dealer: "Mike checks."
```

### Amount Out of Range

```
Player: "Bet 5."     [minimum is 20]
Dealer: "The minimum bet is 20. Would you like to bet 20?"
```

```
Player: "Raise to 5000."    [player only has 800]
Dealer: "You've only got 800. Did you mean all in?"
Player: "All in."
Dealer: "All in for 800. Are you sure?"
```

### No Response (Timeout)

```
[30 seconds pass]
Dealer: "[Player], ten seconds."
[10 seconds pass]
Dealer: "[Player] checks."     [if check is legal]
   OR
Dealer: "[Player] folds."      [if facing a bet]
```

### Repeated Errors

```
[After 3 failed attempts to understand]
Dealer: "Having trouble hearing you. You can use your remote to select an action."
        [Visual action buttons appear on screen]
```

### Error Escalation Ladder

| Attempt | Response |
|---------|----------|
| 1st failure | "Sorry, could you say that again?" |
| 2nd failure | "I didn't catch that. Try saying 'fold', 'call', or 'raise'." |
| 3rd failure | "Still having trouble. Your options are on screen — use your remote." |
| Timeout | Auto-check or auto-fold depending on game state |

---

## 8. Voice Command State Machine

### Command Processing States

```
IDLE (not player's turn)
    |
    +--> [Player asks informational query] --> RESPOND --> IDLE
    |
    v
AWAITING_ACTION (player's turn)
    |
    +--> [Voice input received]
    |       |
    |       v
    |    PROCESSING (STT + NLU)
    |       |
    |       +--> [Intent clear, action valid]
    |       |       |
    |       |       +--> [Low risk] --> EXECUTE --> CONFIRM_IMPLICIT --> IDLE
    |       |       |
    |       |       +--> [High risk] --> CONFIRM_EXPLICIT
    |       |               |
    |       |               +--> [Confirmed] --> EXECUTE --> IDLE
    |       |               +--> [Cancelled] --> AWAITING_ACTION
    |       |
    |       +--> [Intent unclear] --> CLARIFY --> AWAITING_ACTION
    |       |
    |       +--> [Action invalid] --> REJECT_WITH_OPTIONS --> AWAITING_ACTION
    |       |
    |       +--> [STT failure] --> RETRY_PROMPT --> AWAITING_ACTION
    |
    +--> [Timeout] --> AUTO_ACTION --> IDLE
```

### Legal Action Matrix

The system must only accept commands that are legal given the current game state.

| Game State | Fold | Check | Call | Bet | Raise | All-In |
|------------|------|-------|------|-----|-------|--------|
| No bet to player | Yes | Yes | No | Yes | No | Yes |
| Facing a bet | Yes | No | Yes | No | Yes | Yes |
| Player is all-in | No | No | No | No | No | No |
| Not player's turn | No | No | No | No | No | No |

---

## 9. Bet Amount Parsing

### Supported Formats

| Input Format | Example | Parsed Amount |
|-------------|---------|---------------|
| Exact number | "200" / "two hundred" | 200 |
| BB multiple | "3x" / "three times" | 3 x BB |
| Pot fraction | "half pot" | pot / 2 |
| Pot multiple | "pot" / "pot sized" | current pot |
| Relative | "double the bet" | 2 x current bet |
| Keyword | "min" / "minimum" | minimum legal bet/raise |
| Keyword | "max" / "all in" | player's full stack |

### Number Recognition

The STT engine must handle:
- Digits: "100", "250", "1000"
- Words: "one hundred", "two fifty", "a thousand"
- Mixed: "1 thousand", "5 hundred"

> **v1 scope**: Support exact numbers (digits and words) and big blind multiples only. Do **not** support poker chip slang (e.g., "a buck", "a nickel", "a dime") in v1 — these terms are deeply context-dependent and vary between poker communities, creating a serious risk of bet-amount misinterpretation. Chip slang may be considered for v2 with extensive testing.

### Raise Amount Disambiguation

"Raise [amount]" is inherently ambiguous. Resolution strategy:

1. If the amount is **greater than** the current bet: interpret as "raise TO [amount]"
2. If the amount is **less than or equal to** the current bet: interpret as "raise BY [amount]" (resulting in current bet + amount)
3. If still ambiguous, **ask for clarification**
4. "Raise to [amount]" and "Make it [amount]" are always interpreted as the total bet amount

---

## 10. Multi-Player Voice Identification

### The Challenge
With up to 4 players in the same room, the system needs to know **who** is speaking. Only the player whose turn it is should have their commands executed.

### Approach 1: Turn-Based Gating (Recommended)
- Only process action commands from the player whose turn it is
- The system doesn't need to identify the speaker — it simply accepts the next valid voice input during a player's turn
- **Risk**: Another player could speak out of turn; mitigated by the confirmation system
- **Advantage**: Simple, no voice enrolment required

### Approach 2: Voice Profiles (Optional Enhancement)
- During setup, each player records a short voice sample for speaker identification
- The system uses speaker diarisation to identify who is speaking
- Reject commands from players who are not the active player
- **Advantage**: Prevents out-of-turn commands
- **Disadvantage**: More complex; requires voice enrolment; accuracy varies

### Approach 3: Directional Microphone / Position-Based
- On devices with multiple microphones, use spatial audio to determine speaker position
- Map seat positions to microphone directions
- **Advantage**: No enrolment needed
- **Disadvantage**: Requires specific hardware; may not work on all Fire TV devices

### Recommended Implementation
Start with **Approach 1** (turn-based gating). The dealer always announces whose turn it is, and only processes the next voice input as that player's command. If a command is received out of turn, the dealer says: "It's not your turn, [active player]'s still thinking."

For future versions, add **Approach 2** as an optional feature.

---

## 11. Accessibility & Fallback

### Remote Control Fallback
When voice is unavailable or unreliable, players can use the TV remote:

| Remote Button | Action |
|---------------|--------|
| Up | Cycle through actions (Fold / Check / Call / Raise / All-in) |
| Down | Cycle through actions (reverse) |
| Left / Right | Adjust bet amount (decrease / increase) |
| Select / OK | Confirm action |
| Back | Cancel / go back |

### On-Screen Action Bar
Always display the current legal actions as a visual bar at the bottom of the screen:

```
[Fold]  [Check]  [Bet: 20 ▲▼]  [All-in]
```

The voice system and the remote system target the same action bar — voice just selects and confirms faster.

### Audio Descriptions
- All community cards are announced by the dealer when dealt
- Player stacks and pot are announced regularly
- Hand results are always announced verbally
- This ensures visually impaired players can follow the game entirely by ear

### Subtitles / Closed Captions
- All dealer speech should have optional subtitles
- Player voice commands can be shown as text confirmations on screen

---

## 12. Dealer Personality & Tone

### Voice Characteristics
- **Gender**: Configurable (male/female/neutral)
- **Accent**: Configurable (e.g., British, American, Australian) — default to a warm, neutral accent
- **Pace**: Moderate speed; slightly faster during routine announcements, slower for important moments
- **Tone**: Professional but friendly; like a real casino dealer who enjoys the game

### Personality Traits
- **Efficient**: Doesn't waffle; keeps the game moving
- **Witty**: Occasional light remarks during big moments ("Bold move." / "That's a spicy raise.")
- **Encouraging**: Supportive of new players ("Nice hand." / "Good call.")
- **Neutral**: Never reveals information about hidden cards or strategy
- **Contextual**: Adjusts energy to match the moment (calm during routine play, excited during big pots)

### Dealer Commentary Examples (Optional Flavour)

| Situation | Example Commentary |
|-----------|--------------------|
| Big all-in called | "Here we go. All the chips in the middle." |
| Player wins a big pot | "What a hand! [amount] to [player]." |
| Quick fold | "[Player] wants nothing to do with that one." |
| Heads-up showdown | "Heads up. Let's see who's got it." |
| Royal flush | "Royal flush! That doesn't happen every day." |
| Player on a winning streak | "[Player]'s running hot." |
| Player rebuys | "Back in the game." |

> **Implementation**: Use an LLM to generate contextual dealer commentary. Feed it the game state, the action, and a personality prompt. Keep commentary **optional** and **infrequent** — too much chatter slows the game.

### TTS Engine Requirements
- Low latency (< 200ms for short phrases)
- Natural prosody (not robotic)
- Support for SSML (Speech Synthesis Markup Language) for controlling emphasis, pauses, and pacing
- Ability to pronounce card names naturally ("Ace of spades", "King of hearts")

---

## 13. Implementation Notes

### STT Engine Options
| Engine | Pros | Cons |
|--------|------|------|
| **Amazon Transcribe** | Native Fire TV integration | Cloud-dependent, latency |
| **Google Speech-to-Text** | High accuracy, streaming | Requires API key, latency |
| **OpenAI Whisper (local)** | Offline capable, good accuracy | CPU/GPU intensive |
| **Vosk (local)** | Lightweight, offline, fast | Lower accuracy for complex phrases |
| **On-device Alexa ASR** | Fire TV native, low latency | Limited customisation |

### NLU / Intent Recognition
- Use a small, focused intent classifier (not a full LLM) for command parsing
- Intents: `fold`, `check`, `call`, `bet`, `raise`, `all_in`, `query_pot`, `query_stack`, `query_bet`, `query_call_amount`, `query_my_cards`, `query_blinds`, `repeat_last`, `sit_out`, `rejoin`, `rebuy`, `help`, `confirm`, `cancel`
- Entities: `amount` (number), `multiplier` (e.g., "3x"), `pot_fraction` (e.g., "half pot")
- Train on poker-specific vocabulary and variations listed in Section 3

### TTS Engine Options
| Engine | Pros | Cons |
|--------|------|------|
| **Amazon Polly** | Native AWS, SSML support, Neural voices | Cloud-dependent |
| **ElevenLabs** | Most natural voices, emotion control | Expensive, cloud-dependent |
| **Google Cloud TTS** | High quality, WaveNet voices | Cloud-dependent |
| **Coqui TTS (local)** | Open source, offline capable | Quality varies |
| **On-device Fire TV TTS** | No latency, free | Limited voice quality |

### Latency Budget

| Component | Target | Maximum |
|-----------|--------|---------|
| Wake word detection | 100ms | 200ms |
| STT processing | 200ms | 500ms |
| Intent parsing | 50ms | 100ms |
| Game validation | 10ms | 50ms |
| TTS generation | 200ms | 500ms |
| **Total round-trip** | **560ms** | **1,350ms** |

### Wake Word vs Push-to-Talk

| Mode | How it Works | Best For |
|------|-------------|----------|
| **Always listening** | System listens continuously; processes speech when it detects a poker command | Hands-free immersion |
| **Wake word** | "Hey dealer" activates listening | Reduces false positives |
| **Push-to-talk** | Player holds a button on the remote to speak | Most reliable; least immersive |
| **Hybrid** | Always listening during player's turn; wake word otherwise | Best balance |

**Recommendation**: Use **hybrid mode** — always listen during the active player's turn, and use a wake word ("Hey dealer") for informational queries outside of turn. Provide push-to-talk as a fallback.

---

## References

- [PokerListings - Voice-Controlled Online Poker](https://www.pokerlistings.com/blog/voice-controlled-poker)
- [Vocal Media - Voice-Enabled AI Assistants in Poker Apps](https://vocal.media/gamers/voice-enabled-ai-assistants-in-poker-apps-next-gen-ux)
- [Designlab - VUI Design Best Practices](https://designlab.com/blog/voice-user-interface-design-best-practices)
- [Parallel HQ - VUI Design Principles](https://www.parallelhq.com/blog/voice-user-interface-vui-design-principles)
- [Amazon - Voice-enabling Apps on Fire TV](https://developer.amazon.com/docs/fire-tv/voice-enable-your-app-and-content.html)
- [ElevenLabs - AI Voice for Games](https://elevenlabs.io/use-cases/gaming)
- [Inworld AI - TTS for Video Game Characters](https://inworld.ai/landing/tts-gaming-ai-text-to-speech-for-video-game-characters)
- [PokerNews - Bet, Check, Raise, Fold Explained](https://www.pokernews.com/strategy/bet-check-raise-fold-what-it-means-36305.htm)

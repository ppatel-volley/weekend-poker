# Game Design Document Review

> **Reviewer**: Game Design Lead (20+ years, poker & casino games)
> **Date**: 2026-02-09
> **Scope**: poker-rules.md, voice-commands.md, ai-bots.md
> **Target Confidence**: 95%

---

## Executive Summary

These are solid research documents. Whoever put them together clearly knows poker and has thought carefully about how to translate a card game into a voice-first video game experience. That said, I've got some bones to pick -- a few factual issues, some gaps in edge-case coverage, and a handful of design decisions that need a rethink before anyone writes a line of code.

**Overall Rating: 91% confidence** -- close to the 95% target but not quite there. The issues below need addressing before I'd sign off.

---

## 1. Poker Rules (poker-rules.md)

### Rating: 93% -- Strong

This is a well-structured, comprehensive rules document. The fundamentals are correct and well-explained. The implementation notes are genuinely useful -- the state machine, validation rules, and Fisher-Yates recommendation are all spot-on.

### Correct and Well Done

- Hand rankings are **100% correct** and properly ordered
- Tiebreaker/kicker rules are accurate
- Ace duality (high and low in straights, no wrap-around) is correctly stated
- Burn-card procedure is correct (burn before flop, turn, and river)
- Dealing order (clockwise from SB, one card at a time) is correct
- Heads-up blind rules are correct (button = SB, acts first pre-flop, last post-flop)
- Side pot algorithm is mathematically sound -- I verified the examples
- The 4-player side pot example (Section 8) is correctly calculated: Main 100, Side 1 = 75, Side 2 = 50, D gets 25 back. That checks out
- No-limit minimum raise rules are correctly stated (increment-based, not double-the-bet)
- Showdown order (last aggressor first) is correct per Robert's Rules of Poker
- Odd chip rule (closest to left of dealer) matches standard casino procedure

### Issues Found

#### Issue 1: Pre-Flop Action Order Omission (Minor)

The document correctly states that pre-flop action starts with the player left of the BB (UTG), but it does not explicitly state that the **dealing** of hole cards starts with the player to the left of the **dealer button** (i.e., the SB). Line 57 says "starting with the player to the left of the dealer button" for dealing, which is correct, but this distinction between dealing order and betting order should be made more prominent given this is an implementation reference.

**Severity**: Minor. The information is present but could be clearer.

#### Issue 2: Minimum Bet vs Minimum Raise Terminology (Minor)

Section 7, line 237: "Minimum bet: Always equal to one big blind" -- this is correct for an opening bet. However, the document could be clearer that the minimum **raise** is the previous bet/raise increment, not one big blind. Lines 239-240 do cover this separately, but the juxtaposition could confuse an implementer.

**Severity**: Minor. Technically correct but could mislead a junior developer.

#### Issue 3: Missing Rule -- Bet vs Raise Distinction for Implementation (Medium)

The document doesn't explicitly state that a player who faces no bet can only **bet** (not raise), and a player who faces an existing bet can only **raise** (not bet). This is implied in Section 7's table, but for a game engine implementation, this distinction is critical for action validation. The legal action matrix should be explicitly spelled out as it is in the voice-commands document (Section 8).

**Severity**: Medium. Could lead to an implementation where "bet" and "raise" are interchangeable, which violates poker rules.

#### Issue 4: No Mention of "Minimum Bring-In" for All-In Under Big Blind (Minor)

Line 315 states "All-in for less than the big blind: The player is all-in; they can only win a main pot proportional to their bet." This is correct, but it doesn't mention that this incomplete bet does not constitute a legal "open" -- subsequent players still need to call or raise the full big blind amount, not the all-in amount. This is a subtle but important point for correct implementation.

**Severity**: Minor-Medium. Edge case, but one that will absolutely come up in testing.

#### Issue 5: Pot Distribution Order (Minor Discrepancy)

Line 357 says side pots are evaluated "starting from the last side pot (highest) and working down to the main pot." This is a common description but slightly misleading. In practice, pots are evaluated from the **main pot first** (all eligible players), then each side pot. The result is the same, but the order of evaluation matters if you're displaying results to the player in real-time. Many implementations go main-to-side for clarity.

**Severity**: Minor. Either order produces the same mathematical result, but main-to-side is clearer for display purposes.

#### Issue 6: Dead Blinds Rule Needs More Detail (Minor)

Line 162 mentions dead blinds but the explanation is sparse. For a cash game, the standard rule is: a returning player posts a "dead" small blind (goes into the pot, not a live bet) AND a "live" big blind. The document just says "post both blinds." For implementation, you need to know which is live and which is dead.

However, given the house rules in Section 13 recommend simplicity, an acceptable approach is: returning players simply wait for the big blind. This should be stated more explicitly as the recommended approach.

**Severity**: Minor. The house rules section partly addresses this, but it should be cross-referenced.

#### Issue 7: No Mention of Table Minimum Players (Trivial)

The document doesn't state the minimum number of players to start a hand. For a 4-player game, you need at least 2 players. Worth mentioning explicitly for the implementation.

**Severity**: Trivial.

### Verdict on Poker Rules

The rules are **accurate**. I cross-checked against Robert's Rules of Poker and standard WSOP tournament rules. The hand rankings, betting mechanics, side pot calculations, and showdown procedures are all correct. The issues above are mostly about clarity and edge cases rather than factual errors. A developer following this document would build a fundamentally correct poker engine.

---

## 2. Voice Commands (voice-commands.md)

### Rating: 90% -- Good, with Some Gaps

The voice system is well-designed. The natural language variations are comprehensive, the error handling is thoughtful, and the confirmation patterns for high-stakes actions are well thought through. The dealer personality section is excellent -- that kind of design detail is what separates a good game from a great one.

### Correct and Well Done

- All core poker actions are covered as voice commands
- Natural language variations are extensive and cover real poker slang
- The "Pass" disambiguation (check if no bet, prompt if bet) is spot-on
- "Raise to" vs "raise by" ambiguity handling is correctly identified and addressed
- Confirmation flow for all-in and large bets is well-designed
- Error escalation ladder (3 attempts then fall back to remote) is sensible
- Legal action matrix in Section 8 is correct
- Bet amount parsing handles all the formats I'd expect
- Turn-based gating for multi-player voice is the right call for v1
- The latency budget is realistic for a cloud-based STT pipeline

### Issues Found

#### Issue 1: Missing Voice Command -- "How Much to Call?" (Medium)

The informational commands (Section 2) include "What's the bet?" but this doesn't clearly cover the scenario where a player wants to know **how much more** they need to add. If the current bet is 200 and they've already put in 60 from the blind, they need to add 140. A dedicated "How much to call?" command would be valuable. The dealer response should state the additional amount, not just the total bet.

**Severity**: Medium. Players will ask this constantly. Every poker player does.

#### Issue 2: Missing Voice Command -- "Show My Cards" / "What Do I Have?" (Medium)

There is no command for a player to ask the dealer to re-read their hole cards. On a TV screen, the player can look, but with the mobile controller design (where cards are on the phone), a player might still want verbal confirmation. More importantly, if this is truly voice-first and accessible, a visually impaired player needs a way to hear their cards.

**Severity**: Medium. The accessibility section mentions cards are announced when dealt, but there's no repeat mechanism.

#### Issue 3: No Handling of "Undo" / "I Changed My Mind" for Non-Critical Actions (Medium)

The implicit confirmation system (Section 6) allows a 2-second window to say "No" or "Wait" to cancel an action. But what happens if a player says "Call" and then immediately says "Actually, raise"? The 2-second window is mentioned but the interaction flow isn't detailed. Can a player undo a check? A fold? A fold should be irrevocable (standard poker rule), but a check could potentially be taken back before the next player acts.

**Severity**: Medium. Needs clear rules per action type.

**Recommendation**:
- Fold: Irrevocable once confirmed. No undo.
- Check: Revocable within the 2-second window if no other player has acted.
- Call: Revocable within the 2-second window.
- Bet/Raise: Revocable within the 2-second window (or during explicit confirmation for large amounts).

#### Issue 4: "I'll Pass" Listed as Fold Variant, Also as Check Variant (Minor -- Already Handled)

Line 116 lists "I'll pass" under Fold, and line 128 lists "Pass" under Check. The disambiguation note on line 135 handles this correctly, but "I'll pass" and "Pass" should be treated identically -- both should trigger the same disambiguation logic. Currently, "I'll pass" is only listed under Fold, which could lead to it being hard-coded as a fold intent.

**Severity**: Minor. The disambiguation note covers it, but the categorisation is inconsistent.

#### Issue 5: Poker Chip Slang is Dangerous (Medium)

Line 548 includes slang like "a buck" (100), "a nickel" (500), "a dime" (1000). These are **deeply context-dependent** and vary enormously between poker communities. "A nickel" means 5 in many contexts, not 500. "A dime" means 10 to most people, not 1000. Implementing these without extreme care will cause serious bet-amount misinterpretation.

**Severity**: Medium. I'd strongly recommend **not** supporting chip slang in v1. Exact numbers and BB multiples are sufficient and far less error-prone.

#### Issue 6: No "Repeat That" Command (Minor)

There's no command for the player to ask the dealer to repeat the last announcement. If a player missed the flop cards being read, they should be able to say "Repeat that" or "What was the flop?" or "Say that again."

**Severity**: Minor. Easy to add, but it's a gap.

#### Issue 7: Wake Word "Hey Dealer" Conflicts with Player Names (Trivial)

If a player's name or a bot's name contains "dealer" or sounds similar, the wake word could false-trigger. Unlikely but worth noting. The hybrid approach (always listening during turn) mitigates this well.

**Severity**: Trivial.

#### Issue 8: No Mention of Noise Handling (Minor)

In a living room with 4 people, background noise, laughter, cross-talk, and TV audio will be constant. The document mentions multi-player voice identification but doesn't address noise suppression, echo cancellation (the TV speakers will be playing dealer TTS while microphones are listening), or acoustic echo cancellation (AEC).

**Severity**: Minor for the design document. This is more of an implementation concern, but it should be flagged as a known challenge.

### Verdict on Voice Commands

The design is **solid and well-considered**. The gaps are real but addressable. The biggest concern is the missing "How much to call?" and "What do I have?" commands, which are table-stakes (pun intended) for a voice-first poker game. The chip slang parsing is a potential minefield that I'd defer to v2. Overall, this document gives an implementer a strong foundation.

---

## 3. AI Bots (ai-bots.md)

### Rating: 89% -- Good, with Strategic Concerns

This is the most ambitious of the three documents, and it's largely well-designed. The three difficulty tiers are distinct, the LLM prompt architecture is sound, and the "making bots feel human" section (timing, tells, emotional state) is genuinely impressive design work. However, I have some strategic concerns about the LLM approach and a few poker-specific issues.

### Correct and Well Done

- The four-quadrant playing style framework (TAG, LAG, NIT, FISH) is correctly described and correctly mapped to difficulty levels
- Hand categories (Premium, Strong, Playable, Speculative, Marginal, Trash) are standard and correct
- Opening ranges for all three difficulty levels are reasonable and realistic
  - Easy bots playing 60-70% is appropriately loose
  - Medium bots at 25-35% is a solid TAG range
  - Hard bots at 40-50% is a credible LAG range
- The pre-computed hand analysis approach is **critically important** and correctly identified. LLMs cannot reliably evaluate poker hands or calculate pot odds. The decision to pre-compute this in code and feed it as facts is the single most important design decision in this document
- The bot personality profiles are varied and characterful
- The emotional state system (tilt, confidence, boredom) is a clever design
- Bluff frequencies by difficulty (5%, 20%, 35%) are reasonable
- The multi-street bluff example (Section 11) is strategically sound -- c-betting a K-high board with 98 suited is a textbook play
- The fallback decision tree for LLM failures is essential and well-designed
- Cost optimisation strategy (cheaper models for easier bots) is sensible

### Issues Found

#### Issue 1: Hard Bot Range from UTG is Too Wide (Medium)

Section 9, Hard Bot UTG range includes hands like T8s+, 98s, ATo, KJo, QJo from **Under the Gun** at a 4-player table. At a 4-player table, UTG is essentially the "middle position" of a full ring table, so wider ranges are acceptable compared to 9-handed. However, opening T8s and 98s from UTG even at a 4-player table is on the aggressive side. A 40-50% range from UTG at 4-handed is actually closer to 30-35% in full-ring terms.

This is borderline acceptable for a "shark" bot, but it risks the hard bot playing too many bad hands from early position and losing money in spots where even good players fold. The Hard bot should still be **winning money**, not just playing a lot of hands.

**Severity**: Medium. The range is aggressive but not egregiously wrong for short-handed play. However, the implementation should track the Hard bot's actual win rate and tighten the range if it's losing.

#### Issue 2: Continuation-Bet Frequency for Medium Bot May Be Too Rigid (Minor)

Line 93 states the Medium bot c-bets "~65% of the time." This is a reasonable default, but in a 4-player game where there could be 2 callers on the flop, c-betting into multiple opponents 65% of the time is too aggressive. C-bet frequency should decrease as the number of opponents increases:
- Heads-up: 65-75% is fine
- 2 opponents: 40-50% is more appropriate
- 3 opponents: 25-35% at most

**Severity**: Minor. The Hard bot section mentions adjusting to opponents, but the Medium bot should also have this basic multi-way pot adjustment.

#### Issue 3: LLM Reliability Concern -- Will It Actually Follow the Difficulty Constraints? (Major)

This is my biggest concern with the entire AI bot design. The prompts tell the Easy bot to "sometimes make mistakes" like "checking strong hands" or "calling with weak draws." But LLMs are fundamentally trained to be helpful and correct. Telling an LLM to play **badly on purpose** is fighting against its training. In my experience, LLMs will:

1. Sometimes ignore the "make mistakes" instructions and play well anyway (inconsistent difficulty)
2. Make different kinds of mistakes than intended (weird, non-human errors)
3. Oscillate unpredictably between competent and incompetent play

The document acknowledges this implicitly by pre-computing hand analysis, but it doesn't address the fundamental tension between "play badly" and "be a good LLM."

**Severity**: Major design risk. Not a factual error, but a serious implementation concern.

**Recommendation**: For Easy bots, consider a **hybrid approach**:
- Use a rules-based decision engine with controlled randomness for most decisions
- Only use the LLM for generating chat/personality responses
- This gives consistent difficulty with human-like banter

For Medium bots, the LLM approach is more viable because the instructions are "play solidly" -- which aligns with the LLM's training.

For Hard bots, the full LLM approach is best because you want sophisticated reasoning.

#### Issue 4: No Bankroll/Session Management for Bots (Medium)

The document doesn't address how bots handle rebuys. Questions that need answering:
- Does an Easy bot always rebuy when busted? To what amount?
- Does a Hard bot strategically choose rebuy amounts?
- Do bots ever choose to leave the table?
- If a bot is on a massive losing streak, does it keep feeding chips to the human player indefinitely?

In a casual game, unlimited bot rebuys are probably fine, but this needs to be explicitly stated. A bot that runs out of chips and just keeps rebuying feels like an ATM, not an opponent.

**Severity**: Medium. Needs a clear policy.

#### Issue 5: Opponent Notes Generation is Under-Specified (Minor)

The OpponentProfile interface (Section 13) includes a `notes` field described as "LLM-generated summary updated periodically." But when? After every hand? Every 5 hands? This requires an additional LLM call just for note-taking, which adds cost and latency. The document should specify:
- How often notes are updated
- Whether this uses the same model or a cheaper one
- What triggers a note update (e.g., a significant hand, every N hands)

**Severity**: Minor. Implementation detail, but it affects the cost model.

#### Issue 6: Missing -- How Do Bots Handle Being Bluffed? (Minor)

The document covers when bots bluff, but it's less clear on how bots **react to being bluffed**. If a human player makes a large river bet (potential bluff), how does each difficulty level respond?

- Easy bot: Should mostly fold (as stated -- folds to large bets)
- Medium bot: Should evaluate hand strength vs pot odds
- Hard bot: Should consider the player's bluffing frequency from opponent notes

This is implicitly covered by the post-flop strategy, but an explicit "facing a potential bluff" scenario for each difficulty level would strengthen the document.

**Severity**: Minor.

#### Issue 7: Nate Silver Reference is a Red Flag, Not a Reassurance (Informational)

The references include Nate Silver's article "ChatGPT is Shockingly Bad at Poker." This article highlights precisely the concern I raised in Issue 3 -- LLMs struggle with poker decisions. Including it as a reference is honest, but the document should more directly address the findings and explain how the pre-computed hand analysis mitigates the problems Silver identified.

**Severity**: Informational. Not a document error, but the counter-argument should be explicit.

#### Issue 8: Bot Timing -- Easy Bots Are Too Slow (Minor)

Section 8 timing table shows Easy bots taking 1-2s for an obvious fold and 5-10s for a big decision. A 10-second wait for an Easy bot decision will feel **glacial** in a 4-player game. Remember, in a single hand with 4 betting rounds, there could be 12+ bot decisions. If each takes 3-5 seconds on average, that's nearly a minute of waiting per hand just for bot turns.

**Recommendation**: Reduce Easy bot timing across the board:
- Obvious fold: 0.5-1.5s
- Standard call: 1-2s
- Standard raise: 1.5-3s
- Big decision: 3-6s

The thinking time should also include the LLM API latency, so the artificial delay should be calculated as `target_time - actual_processing_time` (the document doesn't clarify this).

**Severity**: Minor but affects the game feel significantly.

#### Issue 9: No Discussion of LLM Temperature Settings (Minor)

The prompt architecture doesn't mention temperature settings for the LLM calls. This matters enormously:
- Easy bots: Higher temperature (0.8-1.0) for more random, "bad" decisions
- Medium bots: Moderate temperature (0.4-0.6) for consistent, solid play
- Hard bots: Lower temperature (0.2-0.4) for precise, calculated decisions -- but occasionally higher for creative bluffs

**Severity**: Minor. Easy to add but important for tuning bot behaviour.

### Verdict on AI Bots

The design is **ambitious and largely sound**. The pre-computed hand analysis is the right call and addresses the biggest known weakness of LLM-based poker (inability to evaluate hands reliably). The personality system and human-like timing are strong differentiators. The biggest risk is whether LLMs can reliably play badly on purpose (Issue 3), which I'd address with a hybrid approach for Easy bots. The opening ranges and strategy descriptions are poker-accurate.

---

## Cross-Document Consistency

### Checked and Consistent

- Hand rankings in poker-rules.md match the references in voice-commands.md ("Show hand rankings")
- Betting actions in poker-rules.md match the voice command intents
- Side pot mechanics in poker-rules.md align with the all-in voice command flow
- Blind structure in poker-rules.md matches the references in ai-bots.md (25/50 example)
- Cash game rebuy rules in poker-rules.md match the bot architecture's session model
- Legal action matrix in voice-commands.md correctly reflects the betting rules in poker-rules.md

### Inconsistency Found

#### Cross-Doc Issue 1: Pot Evaluation Order

Poker-rules.md Section 10 says evaluate from "last side pot (highest) working down to main pot." AI-bots.md doesn't specify pot evaluation but the side pot algorithm in poker-rules.md Section 8 says "evaluate pots from side pots down to main pot." As noted above, main-to-side is clearer for display. Both documents should agree, and both should match the implementation.

**Severity**: Minor. Mathematical result is identical either way.

#### Cross-Doc Issue 2: Missing Link Between Voice Commands and Bot Chat

The voice-commands document describes the dealer TTS system. The ai-bots document describes bot chat ("chat" field in BotDecision). But there's no document that specifies how bot chat integrates with the dealer voice pipeline. Does the bot's chat play through the same TTS engine? A different voice? Does it interrupt the dealer? Queue after the dealer's action confirmation?

**Severity**: Medium. This is an integration gap that needs a brief design note.

---

## Summary of Issues by Severity

### Major (Must Fix Before Implementation)

| # | Document | Issue | Impact |
|---|----------|-------|--------|
| 1 | ai-bots.md | LLM difficulty reliability -- Easy bots may not play badly consistently | Core gameplay experience at risk |

### Medium (Should Fix Before Implementation)

| # | Document | Issue | Impact |
|---|----------|-------|--------|
| 2 | poker-rules.md | Bet vs Raise action distinction not explicit enough | Implementation correctness |
| 3 | poker-rules.md | All-in under BB -- subsequent players' obligations unclear | Edge case correctness |
| 4 | voice-commands.md | Missing "How much to call?" command | Player experience |
| 5 | voice-commands.md | Missing "What do I have?" card re-read command | Accessibility |
| 6 | voice-commands.md | "Undo" / correction flow not detailed per action type | Player experience |
| 7 | voice-commands.md | Chip slang parsing is error-prone | Bet accuracy |
| 8 | ai-bots.md | Hard bot UTG range too wide | Bot profitability |
| 9 | ai-bots.md | No bot rebuy/bankroll policy | Gameplay loop |
| 10 | Cross-doc | Bot chat integration with dealer TTS not specified | System integration |

### Minor (Nice to Fix)

| # | Document | Issue |
|---|----------|-------|
| 11 | poker-rules.md | Pre-flop dealing vs betting order distinction could be clearer |
| 12 | poker-rules.md | Min bet vs min raise terminology adjacent |
| 13 | poker-rules.md | Pot distribution order (cosmetic) |
| 14 | poker-rules.md | Dead blinds rule sparse |
| 15 | poker-rules.md | No explicit minimum-players rule |
| 16 | voice-commands.md | "I'll pass" categorisation inconsistency |
| 17 | voice-commands.md | No "Repeat that" command |
| 18 | voice-commands.md | No noise/echo handling discussion |
| 19 | ai-bots.md | C-bet frequency not adjusted for multi-way pots |
| 20 | ai-bots.md | Opponent notes update frequency unspecified |
| 21 | ai-bots.md | Facing-a-bluff scenarios not explicit per difficulty |
| 22 | ai-bots.md | Easy bot timing too slow |
| 23 | ai-bots.md | No LLM temperature guidance |

---

## Final Ratings

| Document | Rating | Confidence | Notes |
|----------|--------|------------|-------|
| **poker-rules.md** | 93% | High | Rules are factually correct. Issues are clarity and edge cases |
| **voice-commands.md** | 90% | High | Well-designed system with a few missing commands |
| **ai-bots.md** | 89% | Medium-High | Strong design with one major strategic risk (LLM difficulty control) |
| **Overall** | **91%** | **Medium-High** | Below the 95% target. Fix the Major and Medium issues to reach it |

---

## Recommendations to Reach 95%

1. **Address the LLM difficulty control risk** -- either commit to the hybrid approach for Easy bots or document a testing/tuning plan that validates consistent difficulty levels
2. **Add the missing voice commands** -- "How much to call?", "What do I have?", and "Repeat that" are essential for a voice-first game
3. **Specify bot rebuy policy** -- simple rules, but they need to exist
4. **Clarify bet vs raise action validation** in poker-rules.md -- add an explicit legal action matrix like the one in voice-commands.md
5. **Remove chip slang** from v1 voice parsing -- the risk of misinterpretation outweighs the convenience
6. **Add a brief integration note** on how bot chat feeds into the dealer TTS pipeline

These are all addressable in a day's work. The foundations are strong. Get these sorted and I'd stamp it.

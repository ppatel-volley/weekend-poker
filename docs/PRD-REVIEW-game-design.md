# PRD Game Design Review

> **Reviewer:** Lead Game Designer (25 years, poker & casino games)
> **Date:** 2026-02-09
> **Document:** `docs/PRD.md` v1.0
> **Source Research:** `poker-rules.md`, `voice-commands.md`, `ai-bots.md`, `art-direction.md`

---

## Overall Confidence: 93%

A strong, thoroughly researched PRD that captures the vast majority of what's needed to build this game. The poker rules are accurate, the voice system is well-specified, and the hybrid bot architecture is the right call. I'm docking points for a handful of gaps and ambiguities noted below -- none are showstoppers, but they'd cause questions during implementation.

---

## 1. Texas Hold'em Rules -- Accuracy & Completeness

**Verdict: Excellent. Rules are correct and complete for v1.**

### What's Right

- **Hand rankings** (Section 5.2) are accurate, in correct order, with proper tiebreaker rules including kicker logic. The ace-high/low rule for straights and the explicit "no wrap" note are both present and correct.
- **Betting actions** (Section 5.5) correctly distinguish bet vs raise as separate legal actions. The critical implementation note about this distinction is spot-on -- this is the single most common rules bug in poker games. Well done.
- **No-limit betting rules** (Section 5.6) are correct: minimum raise equal to the previous increment, all-in exception for short stacks not reopening action, no cap on raises. All standard.
- **Side pot algorithm** (Section 5.7) is correctly described with the ascending-sort method. The 4-player example is accurate.
- **Showdown order** (Section 5.8) is correct: last aggressor first, then clockwise from button. The house rule to show all hands is a good choice for casual play.
- **Heads-up rules** (Section 5.3) correctly state the button is the small blind in 2-player.
- **Odd chip rule** correctly goes to the player closest to the left of the dealer button.
- **BB option** is covered in Section 6.2 (pre-flop betting: "BB has option to check or raise if no raise").

### Minor Issues

1. **All-in under big blind** (Section 5.6, Rule 5): The wording "does not constitute a legal opening bet" is correct in intent but could be clearer. The research doc (poker-rules.md, Section 8) phrases it more precisely: the short all-in is a "partial bet into the pot, not a standard opening bet". Consider aligning the language for implementers.

2. **Showdown evaluation order**: Section 5.7 says "evaluate from the main pot first", but the research doc (poker-rules.md, Section 10) says to evaluate "starting from the last side pot (highest) and working down to the main pot". In practice both orders produce the same result when correctly implemented, but the descending order is the standard convention in live poker. The PRD should pick one and be explicit.

3. **Dead blinds**: The research doc (poker-rules.md, Section 5) discusses dead-blind mechanics and recommends the simpler "wait for the big blind" approach. The PRD adopts this (Section 5.9, "Sitting out return: Wait for the big blind to reach naturally"), which is the right call. No issue here -- just confirming alignment.

4. **Burn cards**: Correctly specified in Section 5.1 ("burn one card before each stage") but not explicitly mentioned in the phase diagram (Section 6.1). The dealing phases should conceptually include the burn. Not a blocker -- implementers will follow Section 5.1 -- but worth a note.

### Missing (Non-Critical for v1)

- **Rabbit hunting**: Mentioned as OFF in the house rules summary but the research doc notes it as an "optional fun feature for later". Not needed for v1 but would be a nice v2 addition.
- **Dealing order specificity**: Section 5.1 says "starting from the player to the left of the dealer button" which is correct. No issue.

**Rules Rating: 9.5/10** -- Accurate, complete, and well-structured. The minor wording tweaks above are polish, not corrections.

---

## 2. Voice Command System

**Verdict: Comprehensive and well-designed. A few gaps identified.**

### What's Right

- **Core action commands** (Section 7.2) correctly map to the legal action matrix. All six betting actions are covered.
- **Informational commands** (Section 7.3) are thorough. The inclusion of "How much to call?" (additional chips, not total) is a crucial detail that was added from a previous review and is correct.
- **Natural language variations** (Section 7.4) cover the key phrasings. The disambiguation rules for "pass" and "raise [amount]" are well-thought-out.
- **Bet amount parsing** (Section 7.5) supports the right formats: exact numbers, BB multiples, pot fractions. The decision to defer chip slang to v2 is absolutely correct.
- **Confirmation patterns** (Section 7.6) with implicit/explicit modes are well-designed. The explicit triggers (all-in, >50% stack, >10x pot, leaving table) are sensible thresholds.
- **Undo/correction rules** (Section 7.7) per action type are excellent. Fold being irrevocable is correct poker etiquette. The 2-second window with "no subsequent action" condition is reasonable.
- **Error escalation ladder** (Section 7.8) with 3 attempts before fallback to visual controls is good UX.
- **Turn-based gating** (Section 7.9) for multi-player voice identification is the right v1 approach.

### Issues Found

1. **Missing table management voice commands**: The research doc (voice-commands.md, Section 2) lists table management commands: "Sit out", "Deal me in", "Rebuy", "Leave/Cash out", "Pause", "Settings". The PRD's Section 7 does not include these as voice commands. They appear in the session flow (Section 13) as concepts but are never specified as voice intents with dealer responses. **Recommendation**: Add a "Table Management Commands" subsection to Section 7 with canonical forms and dealer responses, mirroring the research doc.

2. **"Repeat" command scope is ambiguous**: Section 7.3 says "Dealer repeats last announcement" but doesn't define what counts as the "last announcement". Is it the last action confirmation? The last community card announcement? The last informational response? The research doc (voice-commands.md, Section 4) says "repeats the last spoken announcement verbatim" -- the PRD should be equally explicit.

3. **Out-of-turn informational queries**: Section 7.9 says out-of-turn input is rejected, but Section 7.3 says informational commands are available "any time". These aren't contradictory -- informational queries should always work, action commands are gated -- but the PRD should explicitly clarify that the turn-based gating applies only to action commands, not informational queries.

4. **Hybrid vs push-to-talk listening mode**: The research doc (voice-commands.md, Section 13) recommends a hybrid mode: always listen during the active player's turn, wake word for informational queries. The PRD (Section 7.1) shows "Push-to-talk / Hybrid listening" in the architecture diagram but doesn't clearly specify which mode is the v1 implementation. Section 11.1 mentions "Push-to-talk button" on the phone. **Recommendation**: Be explicit that v1 uses push-to-talk on the phone controller, with hybrid mode as a v2 enhancement.

5. **Confirmation acceptance/cancellation phrases**: The research doc (voice-commands.md, Section 6) lists explicit confirmation and cancellation phrase sets ("Yes", "Yeah", "Yep", "Aye", "Confirm", "Do it", etc. and "No", "Nope", "Cancel", "Wait", etc.). The PRD's Section 7.6 gives examples but doesn't list the full phrase sets. For implementation completeness, these should be in the PRD.

### Missing from Research

- **On-screen action bar**: The research doc (voice-commands.md, Section 11) describes an on-screen action bar for remote control fallback. The PRD doesn't mention this -- the TV remote fallback described in Section 4 ("TV remote (fallback)") isn't detailed anywhere. If the TV remote is a supported input method, the visual UI for it needs specification.

**Voice Rating: 8.5/10** -- Strong foundation but needs the gaps above filled before implementation begins.

---

## 3. AI Bot System

**Verdict: Excellent. The hybrid architecture is the right design decision.**

### What's Right

- **Hybrid architecture** (Section 8.2): The decision to use rules-based decisions for Easy bots and LLM for Medium/Hard is exactly right. The rationale about LLMs being unable to reliably play badly is well-articulated and matches current research (Nate Silver's findings are correctly referenced in the source doc).
- **Difficulty levels** (Section 8.1) are well-differentiated: Loose-Passive (Easy), TAG (Medium), LAG (Hard). These are the correct poker archetypes for each difficulty tier.
- **Target win rates** are reasonable: 60-70% for Easy, 45-55% for Medium, 35-45% for Hard. These will need tuning in playtesting but are sensible starting points.
- **Easy bot behaviour** (Section 8.3) correctly describes a calling station: plays too many hands, calls too often, rarely raises, no position awareness. The "checking the nuts" occasional mistake is a nice touch.
- **Medium bot c-bet frequency** (Section 8.4) adjusted by opponent count (65-75% heads-up, 40-50% vs 2, 25-35% vs 3) is strategically correct and was missing from an earlier iteration. Good catch from a previous review.
- **Hard bot behaviour** (Section 8.5) with 35% bluff frequency, multi-street bluffs, and opponent exploitation is appropriate for a LAG archetype.
- **Bot personalities** (Section 8.6) are distinct and well-characterised. The three tiers (Easy: friendly/bumbling, Medium: competent/measured, Hard: intimidating/calculated) provide clear flavour.
- **Timing variation** (Section 8.7) is sensible. The confidence-modulated timing is a good design.
- **Behavioural tells** are well-differentiated: obvious for Easy, subtle for Medium, deliberately misleading for Hard.
- **Emotional state simulation** (Section 8.7) with tilt, confidence, and boredom is a nice touch for realism. Easy bots tilting heavily while Hard bots barely tilt is correct.
- **Bot rebuy policy** (Section 8.8) is fully specified. Bots always rebuy and never leave -- correct for maintaining a consistent 4-player experience.
- **LLM integration** (Section 8.9): Pre-computed hand analysis is called out as "the single most important decision for bot quality". Absolutely correct. LLMs cannot calculate hand rankings or pot odds reliably.
- **Model selection** (Section 8.10) is appropriate: Haiku for Easy chat, Sonnet for Medium decisions, Opus for Hard decisions.
- **Temperature settings** (Section 8.9) are well-tuned: 0.9-1.0 for Easy chat, 0.4-0.6 for Medium, 0.2-0.4 for Hard with occasional bumps for creative bluffs.

### Issues Found

1. **Pre-flop strategy tables missing from PRD**: The research doc (ai-bots.md, Sections 9 & 10) contains detailed pre-flop opening ranges by position and difficulty, plus post-flop strategy tables. The PRD (Section 8) describes behaviour qualitatively but doesn't include these tables. For the Easy bot rules engine, implementers need the exact hand ranges and decision rules. **Recommendation**: Either include the strategy tables in the PRD or explicitly reference ai-bots.md Sections 9-10 as the implementation spec for the Easy bot rules engine.

2. **Post-flop strategy specifics**: Similarly, the research doc's Section 10 has detailed post-flop decision rules per difficulty (e.g., Easy bot: "Has a pair or better: calls any bet up to pot size; Has nothing: checks and folds 60% / calls 40%"). These rules are the actual implementation spec for the Easy bot engine. The PRD should reference them directly.

3. **Bluff frequency by difficulty**: The research doc (ai-bots.md, Section 11) gives specific bluff frequencies: Easy ~5%, Medium ~20%, Hard ~35%. The PRD mentions these figures in Section 8.5 (35% for Hard) but doesn't give the Easy (5%) or Medium (20%) figures explicitly. Add them for completeness.

4. **Opponent tracking detail**: The research doc (ai-bots.md, Section 13) provides the full `OpponentProfile` interface with VPIP, PFR, aggression, foldToCBet, etc. The PRD mentions "basic opponent tracking (VPIP, PFR, aggression)" for Medium bots (Section 8.4) but doesn't specify what the Hard bot tracks. **Recommendation**: Reference the full interface from the research doc.

5. **Chat frequency table**: The research doc (ai-bots.md, Section 8) has a detailed chat frequency table by situation and difficulty. The PRD doesn't include this. For TTS scheduling and pacing, the implementer needs to know how often bots chat. **Recommendation**: Include the chat frequency matrix.

### Missing from Research

- **Old School Ozzy** personality from the research doc (Medium tier) is not in the PRD's Section 8.6. This is a minor omission -- two Medium personalities is fine for v1, three gives more variety.

**Bot Rating: 9/10** -- Excellent architecture and design. The missing strategy tables are the main gap -- they exist in the research but need to be surfaced for implementers.

---

## 4. Player Experience Flow

**Verdict: Complete and well-structured.**

### What's Right

- **Session lifecycle** (Section 13.1) covers the full flow from TV launch through QR scan, game play, to session end with summary screen.
- **Mid-session events** (Section 13.2) handle joins, disconnects, reconnects, leaves, sit-outs, and the "all humans leave" edge case.
- **Lobby flow** (Sections 10.5, 11.3) covers both TV and phone perspectives: QR scan, name entry, avatar selection, ready up, host configuration.
- **Onboarding** (Section 12) includes optional tutorial, first-time guidance from the dealer, and progressive voice command hints.
- **Phase diagram** (Section 6.1) cleanly shows the game loop with all phase transitions.

### Issues Found

1. **Session summary screen**: Section 13.1 step 14 mentions "Session summary displayed (total chips won/lost, hands played, best hand)" but this screen isn't detailed anywhere in the UI sections. What does it look like? Is it on the TV, the phone, or both? **Recommendation**: Add a brief specification for the session summary view.

2. **Bot configuration in lobby**: Section 10.5 mentions "Bot difficulty selection (Easy/Medium/Hard) with personality preview" but doesn't specify whether the host picks individual bot personalities or just difficulty levels. Can the host say "I want two Easy bots and one Hard bot"? Can they choose specific personalities (e.g., "The Viper" instead of "Lucky Luke")? **Recommendation**: Specify the bot selection UX.

3. **Player joining mid-game on phone**: Section 13.2 says "Waits for next big blind position" but the phone lobby flow (Section 11.3) only describes the initial join. What does the phone show while the new player is waiting to be dealt in? Do they see the game in progress? **Recommendation**: Add a "waiting to join" phone UI state.

**Flow Rating: 8.5/10** -- Solid coverage with a few UX details to fill in.

---

## 5. Game Loop & Betting Round Mechanics

**Verdict: Well-defined and correct.**

### What's Right

- **Phase diagram** (Section 6.1) correctly models all phases from lobby through hand completion.
- **Phase descriptions** (Section 6.2) have appropriate durations and key logic.
- **Phase transitions** (Section 6.3) using VGF's `endIf` conditions are sensible.
- **Betting round state machine** (Section 6.4) correctly models the action flow: validate, execute, confirm via TTS, update state, check end conditions.
- **Pre-flop action order**: Correctly starts with UTG (Section 6.2).
- **Post-flop action order**: Correctly starts with first active player left of button (Section 6.2).

### Issues Found

1. **All-in showdown phase**: When all remaining players are all-in before all community cards are dealt, the remaining cards should be dealt without betting rounds. The phase diagram (Section 6.1) doesn't explicitly show this shortcut path. It's implied by the betting phase transitions ("all fold but one" leads to HAND_COMPLETE, and "all players all-in" should skip remaining betting phases and go straight to dealing remaining cards then SHOWDOWN). **Recommendation**: Add an explicit transition for the all-in runout scenario to the phase diagram.

2. **Hand Complete to next hand delay**: Section 6.2 mentions "configurable delay for pacing" but doesn't specify a default. For casual play, 2-3 seconds between hands feels right. Too fast and players can't process the result; too slow and the game drags. **Recommendation**: Specify a default (e.g., 3 seconds) with a configurable range (1-5 seconds).

**Game Loop Rating: 9/10** -- Clean and correct. The all-in runout path is the one structural gap.

---

## 6. Session Management

**Verdict: Well-covered.**

### What's Right

- **Rebuy rules** (Section 5.9) are clear: between hands only, 20-100 BB range, optional auto-rebuy.
- **Sitting out** (Section 5.9) is specified: max 3 hands, not dealt cards, removed after timeout.
- **Disconnection handling** (Section 13.2) with 30s auto-fold and 3-hand seat hold is reasonable.
- **Bot fill** (Section 13.2) when seats empty is specified.
- **Player join mid-game** (Section 13.2) correctly waits for big blind position.

### Issues Found

1. **Bot fill trigger**: Section 13.2 says "bot fills if below minimum" but doesn't specify the minimum for bot fill. Is it 2 players? Is bot fill automatic or does the host configure it? The research doc doesn't clarify this either. **Recommendation**: Specify that bot fill is automatic when the table drops below the configured player count (default: 4), and the host can toggle auto-fill on/off.

2. **Reconnection during a hand**: Section 13.2 says the player "resumes their seat with their current hand and chips intact" but what happens if the player was mid-action when they disconnected? Does the 30s timer pause on reconnect? Do they get a fresh timer? **Recommendation**: Specify that reconnecting resets the action timer for the current player if it's their turn.

**Session Rating: 8.5/10** -- Good coverage, needs the bot fill and reconnection edge cases clarified.

---

## 7. User Stories & Acceptance Criteria

**Verdict: Good starting set, but light for a full implementation.**

### What's Right

- **US-001 through US-010** (Appendix C) cover the core user flows: joining, private cards, voice commands, informational queries, bot personality, host configuration, tutorial, reconnection, card reading, colour-blind accessibility.
- **AC-001 through AC-005** (Appendix D) cover the critical paths: complete hand, side pot, voice command, bot decision, reconnection.

### Issues Found

1. **Acceptance criteria lack specificity**: AC-002 (Side Pot) gives a specific numeric example but doesn't specify how many side pot scenarios should pass. The implementation needs to handle 2-player all-in, 3-player all-in with different stacks, 4-player all-in with different stacks, and mixed all-in/active player combinations. **Recommendation**: Expand AC-002 to list 3-4 distinct side pot test scenarios.

2. **Missing user stories**:
   - No story for the host ending a game session
   - No story for a player sitting out and returning
   - No story for bot chat / personality experience ("As a player, I want bots to chat and react with distinct personalities")
   - No story for the session summary screen
   - No story for the dealer's TTS narration experience

3. **Missing acceptance criteria**:
   - No AC for the voice error escalation flow (3 failed attempts -> visual fallback)
   - No AC for bot timing (decisions within latency budgets)
   - No AC for heads-up rule transition (2-player button = SB)
   - No AC for the tutorial flow

**Stories Rating: 7/10** -- The existing stories and ACs are good but the set is incomplete. For a production PRD, I'd expect 20-30 user stories and 10-15 acceptance criteria covering all major flows.

---

## 8. What's Missing from the PRD (vs Research)

These are items present in the research documents that didn't make it into the PRD:

| Item | Source Doc | Severity | Notes |
|------|-----------|----------|-------|
| Table management voice commands (sit out, rebuy, cash out, pause) | voice-commands.md Section 2 | Medium | Commands exist conceptually but aren't specified as voice intents |
| Confirmation/cancellation phrase lists | voice-commands.md Section 6 | Low | PRD gives examples but not the full NLU training list |
| On-screen action bar for remote fallback | voice-commands.md Section 11 | Medium | TV remote is listed as an input method but the visual UI isn't specified |
| Detailed pre-flop/post-flop strategy tables | ai-bots.md Sections 9-10 | Medium | Essential for Easy bot rules engine implementation |
| Old School Ozzy personality (Medium tier) | ai-bots.md Section 7 | Low | Third Medium personality provides more variety |
| Bluff frequency per difficulty (5%, 20%, 35%) | ai-bots.md Section 11 | Low | Hard bot's 35% is mentioned; Easy and Medium are missing |
| Chat frequency matrix | ai-bots.md Section 8 | Low | When and how often bots speak |
| Multi-street bluff example | ai-bots.md Section 11 | Low | Would help implementers understand Hard bot bluffing |
| Wake word / hybrid listening mode specification | voice-commands.md Section 13 | Low | v2 feature; v1 push-to-talk is adequate |
| Remote control button mapping | voice-commands.md Section 11 | Medium | If TV remote is a supported input, the mapping needs specification |
| Stack-based behaviour adjustments | ai-bots.md Section 8 | Low | Short-stack / deep-stack strategy shifts for bots |

---

## 9. Summary of Recommendations

### Must Fix (Before Implementation)

1. **Add table management voice commands** to Section 7 (sit out, deal me in, rebuy, cash out, pause) with dealer responses.
2. **Reference or include pre-flop/post-flop strategy tables** from `ai-bots.md` for the Easy bot rules engine.
3. **Add all-in runout path** to the phase diagram (Section 6.1) for when all players are all-in before all community cards are dealt.
4. **Specify bot fill behaviour**: when it triggers, whether it's automatic, and host controls.

### Should Fix (Before Beta)

5. **Clarify the listening mode for v1**: push-to-talk on phone controller; note hybrid/wake word as v2.
6. **Align showdown evaluation order** (ascending vs descending pots) between Sections 5.7 and 5.8 -- pick one convention.
7. **Add session summary screen** specification (TV and phone views).
8. **Specify bot selection UX** in the lobby: difficulty only, or personality choice too?
9. **Specify remote control UI** if TV remote remains a supported fallback input.
10. **Expand user stories and acceptance criteria** to cover all major flows.

### Nice to Have (Polish)

11. Add bluff frequency per difficulty (5%, 20%, 35%) explicitly in Section 8.
12. Include chat frequency matrix from the research.
13. Add the "Old School Ozzy" Medium personality for variety.
14. Specify reconnection timer behaviour (reset on reconnect).
15. Add default inter-hand delay (recommend 3 seconds, configurable 1-5).

---

## 10. Final Assessment

This is a strong PRD. The poker rules are correct, the voice system is thoughtfully designed, and the hybrid bot architecture demonstrates genuine understanding of both the LLM capability landscape and poker game design. The document reads as though written by someone who both plays poker and has shipped voice-driven products, which is exactly what you want.

The gaps identified above are real but manageable. The "Must Fix" items are about making implementation unambiguous, not about correcting design errors. The core design decisions -- voice-first interaction, phone-as-controller, hybrid bot architecture, pre-computed hand analysis for LLMs, show-all-hands house rule, unlimited rebuys -- are all correct choices for the target audience.

Ship it with the must-fix items addressed, and you'll have a solid foundation for development.

**Overall Confidence: 93%**

# Next Session Tasks

## Priority 1: BJ Win/Loss Result Display
The BJ settlement phases cascade instantly — result text flashes for <100ms.
- **Display**: Add a result overlay to BlackjackScene that shows WON/LOST/PUSH with amount for ~5 seconds
- **Controller**: Add a result phase view to BlackjackController that persists between BJ_SETTLEMENT and BJ_HAND_COMPLETE
- **Server**: Consider adding a brief delay in BJ_HAND_COMPLETE onBegin (or use a client-side timer before the phase auto-advances)
- Same treatment needed for BJC, TCP, Draw

## Priority 2: Controller 3D Card Rendering
Replace the flat HTML card displays in all controller game components with 3D R3F card models:
- Load the 52-card_deck.glb in the controller app (add CardDeckProvider)
- Fan-out animation: cards dealt from a deck, spread in an arc
- Glow/highlight effects: selected card glows, winning hand pulses
- Post-processing: bloom on highlighted cards, subtle vignette
- Needs R3F Canvas in the controller app (currently HTML-only)
- Files: BlackjackController, CompetitiveBlackjackController, FiveCardDrawController, ThreeCardPokerController, HoldemController (ControllerGameplay)

## Priority 3: E2E Test Hardening
Current flaky areas:
- **Game Night + BJ**: Insurance timing within GN causes occasional failures
- **BJ 3-round**: Intermittent timeout when insurance + instant cascade race
- **Draw 3-round**: Occasional timing issue with phase cascade

Improvements needed:
- Add retry logic for known flaky patterns (insurance, cascade timing)
- Add visual regression tests: screenshot comparison for card rendering
- Add wallet arithmetic assertions to ALL gameplay tests (not just "round completed")
- Add edge-case E2E tests: player goes bust (wallet=0), shoe exhaustion, 4-player game
- Add a dedicated "bot playthrough" test suite that plays 10 rounds of each game and asserts wallet conservation (total chips in = total chips out)

## Priority 4: Display Card Rendering Polish
- Verify card scale/rotation looks correct on all 4 scenes (BJ, BJC, Draw, TCP)
- Add card deal animation (cards slide from shoe to position)
- Add card flip animation (face-down to face-up)
- Add bust/blackjack visual effects (red flash, gold shimmer)
- Dealer hole card reveal animation

## Known Issues
- DispatchTimeoutError on lobby→game transition (VGF 10s ack timeout, non-fatal, suppressed)
- Game Night flaky with BJ insurance timing (tightened error pattern helps but doesn't eliminate)
- EventEmitter MaxListenersExceeded warning in test runtime (pre-existing)

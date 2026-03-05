# E2E Gameplay Bug Fixes — Progress Log

## Branch: fix/e2e-gameplay-bugs

## Final Result: ALL 14 GAMEPLAY TESTS PASSING
- Hold'em (2), Craps (2), Roulette (2), TCP (2), BJ Classic (2), BJC (2), 5-Card Draw (2)
- Unit tests: 1941 passing (109 files)

## Root Causes & Fixes

### 1. BJ/BJC — Sub-Thunk Dispatch Breaks VGF Phase Transitions
- **Symptom**: After player stands, phase stuck at BJ_PLAYER_TURNS (never transitions to dealer turn)
- **Root cause**: VGF 4.8.0's `StateSyncSessionHandler` creates custom dispatch pipelines for client-dispatched thunks. Sub-thunk dispatches (`ctx.dispatchThunk('bjCheckAdvance', ...)`) don't properly trigger `checkEndPhaseAfterStateUpdate`. The phase runner's `endIf` is only evaluated AFTER the outermost thunk, but by that time the sub-thunk's state changes may not be properly reflected.
- **Fix**: Inlined `bjCheckAdvance` / `bjcCheckAdvance` logic into parent thunks using `inlineCheckAdvance(ctx, playerId)` — uses only `ctx.dispatch()` (reducer calls), no sub-thunks.
- **Files**: `bj-thunks.ts`, `bjc-thunks.ts`

### 2. BJ/BJC — Bots Not Auto-Stood After Human Acts
- **Symptom**: endIf says `allStood=false` even after human stands — bot was never stood
- **Root cause**: `BJ_PLAYER_TURNS.onBegin` auto-stand loop starts from `currentTurnIndex`. If human is first in turn order, loop breaks immediately (not a bot). Bot at index 1+ never gets auto-stood. After human stands and turn advances to bot, nobody auto-stands the bot.
- **Fix**: Added bot auto-stand loop in `inlineCheckAdvance` — after advancing turn, loop through consecutive bots and auto-stand them.
- **Files**: `bj-thunks.ts`, `bjc-thunks.ts`

### 3. BJ Strategy — Insurance Phase Not Handled
- **Symptom**: When dealer shows Ace, insurance prompt blocks progress
- **Fix**: Updated `playBlackjackRound` strategy to detect and decline insurance (click NO). Also handles instant cascade (natural blackjack).
- **Files**: `strategies.ts`, `game-actions.ts`

### 4. 5-Card Draw — Bots Don't Auto-Act in Betting Phases
- **Symptom**: "Waiting for other players..." forever
- **Root cause**: Draw betting phases (`DRAW_BETTING_1`, `DRAW_BETTING_2`) had no bot auto-play in `onBegin`.
- **Fix**: Added `drawAutoBotPlay()` in `draw-phases.ts`, called in both betting phase `onBegin`. Also added bot auto-confirm discards in `DRAW_DRAW_PHASE`.
- **Files**: `draw-phases.ts`

### 5. 5-Card Draw — Bot Not Auto-Played After Human Acts
- **Symptom**: After human checks/calls, bot becomes active but never acts
- **Root cause**: `drawAdvanceToNextPlayer` advanced to next player but didn't auto-play bots.
- **Fix**: Added bot auto-play loop in `drawAdvanceToNextPlayer` — after advancing, loop through consecutive bots and auto-check/call.
- **Files**: `draw-thunks.ts`

### 6. Draw Strategy — Wrong Locator ("Your turn!" doesn't exist)
- **Symptom**: Strategy waits for "Your turn!" text that doesn't exist in FiveCardDrawController
- **Root cause**: Draw controller shows action buttons directly, no "Your turn!" text indicator.
- **Fix**: Rewrote `playDrawRound` to look for `check-btn`, `call-btn`, `keep-all-btn` directly.
- **Files**: `strategies.ts`

## Key Learning (extends Learning 009)
**VGF 4.8.0 Sub-Thunk Dispatch and Phase Transitions**: `ctx.dispatchThunk()` within thunks may not properly trigger phase transition checks in the `StateSyncSessionHandler` pipeline. Always prefer `ctx.dispatch()` (direct reducer calls) over sub-thunk dispatches. If multi-step logic is needed, inline it as a helper function using only `ctx.dispatch()`.

## Files Changed
- `apps/server/src/ruleset/bj-thunks.ts` — `inlineCheckAdvance()` with bot auto-stand
- `apps/server/src/ruleset/bjc-thunks.ts` — `bjcInlineCheckAdvance()` with bot auto-stand
- `apps/server/src/ruleset/bj-phases.ts` — Removed debug logging
- `apps/server/src/ruleset/draw-phases.ts` — `drawAutoBotPlay()`, bot auto-confirm discards
- `apps/server/src/ruleset/draw-thunks.ts` — Bot auto-play in `drawAdvanceToNextPlayer()`
- `e2e/helpers/strategies.ts` — Rewrote BJ, BJC, Draw strategies
- `e2e/helpers/game-actions.ts` — Added `bjDeclineInsurance()`

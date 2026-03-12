# 021 — VGF PhaseRunner2 checks endIf BEFORE running onBegin on phase re-entry

**Severity:** Critical
**Category:** VGF, Phase Lifecycle, OOM, Infinite Loop

## Problem

The Blackjack server OOM'd at 3.9GB every time a game started. The root cause was an infinite
phase cascade when rounds looped back to `BJ_PLACE_BETS` after `BJ_HAND_COMPLETE`.

## Root Cause

VGF's `PhaseRunner2.performSingleTransitionCheck()` has this loop:

1. Check `endIf` — if true, set phase to `next`, loop again
2. Check if phase changed — if so, run `onEnd`/`onBegin`, loop again

When a round completes and loops from `BJ_HAND_COMPLETE` back to `BJ_PLACE_BETS`, the per-round
completion flags (`allBetsPlaced`, `dealComplete`, `insuranceComplete`, `playerTurnsComplete`,
`dealerTurnComplete`, `settlementComplete`) are all still `true` from the previous round.

Step 1 sees `endIf` returning true and immediately transitions to the next phase **without ever
running `onBegin`** (which calls `bjInitRound` to reset the flags). This creates an infinite
cascade through all phases, allocating new immutable state objects on each pass until OOM.

## The Fix

Add a `resetPhaseFlags` reducer that clears ALL per-phase completion flags. Call it in the
"round complete" phase's `onBegin` **BEFORE** setting the round-complete flag:

```typescript
// In bjHandCompletePhase.onBegin:
ctx.reducerDispatcher('bjResetPhaseFlags')  // Clear stale flags first
ctx.reducerDispatcher('bjSetRoundCompleteReady', true)  // Then mark round complete
```

The reset reducer must clear EVERY flag that any `endIf` checks:

```typescript
bjResetPhaseFlags: (state) => updateBj(state, bj => ({
  ...bj,
  allBetsPlaced: false,
  dealComplete: false,
  insuranceComplete: false,
  playerTurnsComplete: false,
  dealerTurnComplete: false,
  settlementComplete: false,
  roundCompleteReady: false,
}))
```

## Red Flags

- Any phase whose `next` loops back to an earlier phase in the flow
- Any `endIf` that checks a flag set in `onBegin` — those flags persist across loops
- Missing flags in the reset reducer (e.g. `allDecisionsMade` in TCP, `newShooterReady` in Craps)

## Affected Games

All five games had the same bug pattern and needed reset reducers:
- Blackjack Classic (`bjResetPhaseFlags`)
- Blackjack Competitive (`bjcResetPhaseFlags`)
- Three Card Poker (`tcpResetPhaseFlags`)
- Roulette (`rouletteResetPhaseFlags`)
- Craps (`crapsResetPhaseFlags`)

5-Card Draw was already safe (used `playablePlayers.length < 2` guard instead of flag checks).

## Prevention

- When adding any round-looping phase, ALWAYS add a `resetPhaseFlags` reducer
- When adding a new `endIf` flag to any game, add it to the reset reducer too
- Test with a "simulate VGF cascade" helper that checks `endIf` before `onBegin`

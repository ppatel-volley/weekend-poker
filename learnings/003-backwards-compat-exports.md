# 003 — Backwards-Compatibility Exports and Superset State

**Severity:** High
**Category:** Architecture, Testing, Refactoring

## Problem

When replacing an old module (`pokerRuleset`) with a new one (`casinoRuleset`), the new module's state factory and reducers must remain a **strict superset** of the old interface. Failing to include legacy fields in the initial state or maintaining the same reducer signatures causes cascading test failures across the entire test suite.

## Root Cause

The `casinoRuleset` was designed as a clean-room implementation referencing the new `CasinoGameState` type, but it omitted Hold'em-specific fields that old tests relied on:

1. **Missing initial state fields**: `createInitialCasinoState` lacked `interHandDelaySec`, `autoFillBots`, `activePlayerIndex`, `communityCards`, `pot`, `sidePots`, `currentBet`, `minRaiseIncrement`, `holeCards`, `handHistory`, `lastAggressor`, `dealingComplete`.

2. **Changed reducer signatures**: `addBotPlayer` was changed from `(seatIndex, difficulty)` to `(botId, botName)`, breaking all call sites.

3. **Stub reducers**: `updateBlindLevel` and `updateSessionHighlights` were left as no-op stubs that returned unchanged state, but tests verified they actually mutated state correctly.

4. **Changed behaviour**: `removeBotPlayer` was changed to remove by ID regardless of player type, but old tests expected it to only remove bots (not human players).

5. **SessionStats shape mismatch**: New `createSessionStats` from the casino shared package produced a different shape than the old `PokerGameState.SessionStats`.

## Fix Pattern

- **Superset state**: The casino state factory must produce ALL old fields with their old defaults, plus new casino fields. Use the spread operator with old defaults first, then new fields.
- **Preserve signatures**: When creating "replacement" reducers, keep the EXACT same argument signature as the original. If the signature needs to change, provide both the old and new versions.
- **Implement, don't stub**: If tests verify behaviour, the reducer must implement that behaviour. A stub is only acceptable if no tests verify it.
- **Backward-compat session stats**: When changing the shape of nested objects (like `sessionStats`), include both old and new fields so both old and new tests pass.

## Rule of Thumb

When writing a replacement module that is aliased back to the old name:

```typescript
// This alias means EVERYTHING old tests expect MUST still work
export const pokerRuleset = casinoRuleset
export const createInitialState = createInitialCasinoState
```

**Every field, every reducer, every thunk, every signature** from the old interface must be preserved in the new one. The new module is a superset, never a subset.

## Related

- D-001: Single GameRuleset with phase namespaces
- D-003: Hold'em phases unprefixed for backward compatibility

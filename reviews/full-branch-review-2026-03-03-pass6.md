# Full Branch Review (Pass 6) - Final Comprehensive Re-review

## Findings (Prioritized)

### High
1. **Weekly challenges can auto-complete immediately from lifetime stats**
   - Files: `apps/server/src/persistence/challenge-store.ts`
   - `assignChallenges()` now calls `backfillChallengeProgress(challenges, playerStats)` on assignment.
   - `backfillChallengeProgress(...)` uses lifetime counters (`totalHandsPlayed`, `totalHandsWon`, `bestWinStreak`, `byGameType`) to set current weekly challenge progress.
   - Because assignment happens on each new week, many weekly challenges can be instantly marked completed for long-time players without any play in the new week.
   - Examples:
     - `bronze_play_5_hands` can complete immediately if lifetime `totalHandsPlayed >= 5`.
     - `silver_win_10_hands` can complete immediately if lifetime `totalHandsWon >= 10`.
     - `gold_win_streak_5` can complete from historical `bestWinStreak` even if streak is not active this week.
   - Impact:
     - Weekly reward economy can be farmed passively.
     - Retention challenge intent (“play this week”) is violated.
   - Recommendation:
     - Track weekly-bucketed counters (or challenge assignment timestamp baselines) and backfill only from events after week start, not lifetime totals.

### Low
2. **Residual warning noise in test output**
   - Runtime warnings still appear during tests:
     - `MaxListenersExceededWarning` from Node EventEmitter.
   - Not currently failing CI, but indicates potential listener cleanup issues in test/runtime harness.

## Verified Fixed Since Earlier Passes
- Retention API requests from controller now include `x-device-token` header (production ownership middleware contract satisfied).
- Session game tracker is session-scoped (`sessionId:persistentId`) and no longer cleared on non-lobby transient disconnect.
- Daily bonus rollback restores original snapshot state.
- Challenge/cosmetic non-OK responses now surface user-visible errors.
- Challenge UI label now matches weekly cadence.

## Verification Run (This Pass)
- `pnpm test:run` -> PASS (`108` files, `1919` tests)
- `pnpm typecheck` -> PASS
- `pnpm build` -> PASS (display chunk-size warnings only; non-fatal)

# Full Branch Review (Principal Engineer) - Pass 10

Scope reviewed:
- Base comparison: `main...HEAD`
- Included latest commits through `8da5c7c`
- Re-validated prior pass findings and reran verification gates

## Findings

### Medium

1. **BJC tie behavior is internally inconsistent (contract drift risk)**
   - **Files:** `apps/server/src/ruleset/bjc-thunks.ts`, `apps/server/src/__tests__/bjc-thunks.test.ts`
   - **Issue:** `determineWinners()` comment says `Ties: pot split equally`, but current logic always resolves to a single winner when non-busted players tie on value by applying card-count and then turn-order tie-breakers. New tests now codify single-winner behavior for exact ties.
   - **Why this matters:** If design/PRD expects equal split for tied hands, this is a payout semantics change. At minimum, the implementation and contract text are out of sync and can cause future regressions or incorrect refactors.
   - **Minimal repro:** Set two players to equal non-busted value and equal card count; settlement awards full pot to one player, not split.

### Low

2. **Game Night E2E still tolerates heading-related failures in-round**
   - **Files:** `e2e/gamenight/game-night.test.ts`
   - **Issue:** The round loop catches errors from `playCurrentGameRound()` and suppresses those matching `Unknown game heading|game-heading`.
   - **Why this matters:** This can still mask certain routing/heading regressions as expected transitions, reducing failure signal quality in CI.
   - **Minimal repro:** Break heading mapping for one game; test may continue by breaking loop rather than failing immediately.

3. **Persistent EventEmitter listener warnings remain**
   - **Files:** test runtime (observed during `pnpm test:run`)
   - **Issue:** `MaxListenersExceededWarning` appears repeatedly in server test execution.
   - **Why this matters:** This indicates probable listener lifecycle leakage or repeated registration in tests/runtime setup; can lead to flakiness and hidden memory pressure over longer runs.
   - **Minimal repro:** Run `pnpm test:run` and observe repeated warning lines.

## Previously reported issues re-validated as fixed

- BJ bot wallet double-debit during phase flow: fixed
- BJC underfunded freeroll participation: fixed
- BJC two-player E2E assertion (`||` vs `&&`): fixed
- Typecheck/build failure from incomplete `CasinoPlayer` fixture fields: fixed
- BJ/BJC double/split debiting before shoe checks: fixed

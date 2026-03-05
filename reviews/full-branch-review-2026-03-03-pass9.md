# Full Branch Review (Principal Engineer) - Pass 9

Scope reviewed:
- Base comparison: `main...HEAD`
- Re-review after latest fix commit `c11aa0d`
- Functional correctness, payout integrity, phase safety, and test reliability

## Findings

### Critical

1. **Branch is not shippable: Typecheck and build are failing**
   - **Files:** `apps/server/src/__tests__/bjc-reducers.test.ts`
   - **Issue:** New test fixtures instantiate players without required `CasinoPlayer` fields (`avatarId`, `isHost`, `isReady`, `currentGameStatus`), causing TypeScript failures.
   - **Why this matters:** CI gate is red for both `pnpm typecheck` and `pnpm build`; this blocks release and hides future regressions behind baseline failure.
   - **Minimal repro:** Run `pnpm typecheck` or `pnpm build` on branch HEAD.

### High

2. **Competitive Blackjack tie-break contract is still not honored in winner selection**
   - **Files:** `apps/server/src/ruleset/bjc-thunks.ts`
   - **Issue:** `determineWinners()` sorts by hand value, fewer cards, then turn order, but winner extraction still keeps all players with the best numeric value only (`sorted.filter(ps => ps.hand.value === bestValue)`).
   - **Why this matters:** Pot can be split where tie-break rules imply a single winner; payout behavior diverges from stated game rules.
   - **Minimal repro:** Two non-busted players with same value (e.g., 20), one with fewer cards; settlement still splits.

### Medium

3. **Blackjack chip debit can occur before shoe-availability validation**
   - **Files:** `apps/server/src/ruleset/bj-thunks.ts`, `apps/server/src/ruleset/bjc-thunks.ts`
   - **Issue:** `bjDoubleDown`, `bjSplit`, and `bjcDoubleDown` debit wallet/pot before checking shoe sufficiency; if shoe is empty/short, function returns early without rollback.
   - **Why this matters:** Players can lose chips without receiving cards or action progression.
   - **Minimal repro:** Force empty shoe server state and dispatch one of these actions.

4. **Game Night E2E still conditionally swallows broad UI errors**
   - **Files:** `e2e/gamenight/game-night.test.ts`
   - **Issue:** `playCurrentGameRound` errors are suppressed if message matches `/heading|not found|not visible/i`; this pattern can catch unrelated actionable failures (e.g., missing action button).
   - **Why this matters:** Real gameplay breakages can be masked as “expected transitions,” reducing test trust.
   - **Minimal repro:** Break an in-round control so Playwright throws `not visible`; loop may continue instead of failing fast.

## Notes on prior findings

- Pass-8 issues for BJ bot double-debit, BJC freeroll exclusion, BJC two-player assertion, and retention-loading acceptance were addressed in current branch changes.

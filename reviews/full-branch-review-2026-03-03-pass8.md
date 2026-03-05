# Full Branch Review (Principal Engineer) - Pass 8

Scope reviewed:
- Base comparison: `main...HEAD`
- Also reviewed unstaged changes in working tree
- Focus: correctness, functionality, architecture risk, and test validity

## Findings

### Critical

1. **Blackjack bot bets are debited twice and bypass balance validation**
   - **Files:** `apps/server/src/ruleset/bj-phases.ts`
   - **Issue:** In `BJ_PLACE_BETS`, bot auto-bets now call both `bjPlaceBet` and `updateWallet(-minBet)`. Then `BJ_DEAL_INITIAL` deducts all posted bets again with `updateWallet(-bet)`.
   - **Why this matters:** Bot bankroll is drained twice per hand. Also, bot auto-bets bypass the wallet sufficiency check in the thunk path, enabling underfunded bets and distorted settlement outcomes.
   - **Minimal repro:** Start a blackjack hand with one bot, inspect bot wallet before/after one hand; wallet drops by ~2x ante path relative to expected single wager deduction.

### High

2. **Competitive Blackjack allows underfunded players to freeroll**
   - **Files:** `apps/server/src/ruleset/bjc-phases.ts`, `apps/server/src/ruleset/bjc-thunks.ts`
   - **Issue:** Players with wallet `< ante` are skipped during ante posting, but `allAntesPlaced` is still forced `true`; round proceeds with those players still in `playerStates` and winner calculation.
   - **Why this matters:** A player can participate in dealing/settlement without contributing ante, violating game fairness and payout integrity.
   - **Minimal repro:** Set one player wallet below ante and another above; run one BJC hand and observe underfunded player still receives cards and can win/split pot.

3. **BJC two-player E2E test has a false-positive assertion**
   - **Files:** `e2e/multi-player/two-player-bjc.test.ts`
   - **Issue:** Test comment says "Both players should have stood", but assertion is `expect(p1Acted || p2Acted).toBeTruthy()`.
   - **Why this matters:** Test passes when only one player acted; it does not validate two-player turn progression.
   - **Minimal repro:** Break turn routing for player 2; test can still pass when only player 1 acts.

4. **Game Night E2E swallows gameplay failures and can pass after broken rounds**
   - **Files:** `e2e/gamenight/game-night.test.ts`
   - **Issue:** `playCurrentGameRound` errors are caught and ignored (`catch { break }`), then flow continues to leaderboard/champion checks.
   - **Why this matters:** Broken per-game strategy/action selectors can be silently masked by later phase progression.
   - **Minimal repro:** Break one action selector used by `playCurrentGameRound`; test may still pass if lobby/leaderboard/champion transitions occur.

### Medium

5. **Challenge retention E2E accepts loading state as success**
   - **Files:** `e2e/retention/challenges.test.ts`
   - **Issue:** Passing assertion allows `'Loading challenges...'` as a terminal success condition.
   - **Why this matters:** Infinite loading, API failures, or contract regressions can still pass.
   - **Minimal repro:** Make challenges API stall; test still passes by matching loading text.

6. **BJC round strategy can return success without proving a full round**
   - **Files:** `e2e/helpers/strategies.ts`
   - **Issue:** `playBjcRound` returns early if ante display is visible, without strict invariant that current hand completed.
   - **Why this matters:** Round-completion tests can become no-op passes under UI stalls/cascade timing.
   - **Minimal repro:** Keep controller on ante display (without proper settlement transition); helper returns as if round completed.

7. **Two-player Hold'em E2E has weak completion proof**
   - **Files:** `e2e/multi-player/two-player-holdem.test.ts`
   - **Issue:** Test computes starting stacks but never asserts stack delta; final pass criteria reduce to action count + heading visibility.
   - **Why this matters:** It can pass without proving hand settlement/new-hand progression for both players.
   - **Minimal repro:** Break second player turn prompts while first player performs enough actions to satisfy threshold.

## Unstaged change review

- `progress/e2e-gameplay-fixes.md` contains status text updates only; no functional code risk identified.

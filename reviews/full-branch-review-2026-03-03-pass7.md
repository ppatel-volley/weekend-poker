# Full Branch Review (Pass 7)

## Findings (Current State)

### High
1. **Challenge progress before first challenge fetch is still dropped**
   - Files: `apps/server/src/persistence/challenge-store.ts`, `apps/server/src/persistence/challenge-utils.ts`, `apps/server/src/persistence/routes.ts`
   - `checkAndUpdateProgress()` is a no-op when no active challenges exist.
   - `assignChallenges()` is still only called in `GET /api/challenges/:deviceToken` (lazy assignment).
   - If players complete hands before opening Challenges/profile flows that call the route, those early events are not credited.
   - Note: previous lifetime-backfill regression was removed, but this original gap remains unresolved.

### Low
2. **Persistent test warning noise remains**
   - Full test runs still emit `MaxListenersExceededWarning` warnings.
   - Tests pass, but warning noise suggests listener lifecycle cleanup should be examined.

## Confirmed Fixed Since Prior Pass
- Removed lifetime backfill behavior that auto-completed weekly challenges on assignment.
- Retention API client requests include ownership header (`x-device-token`).
- Weekly challenge UI wording and session tracker behavior remain aligned with prior fixes.

## Verification (This Pass)
- `pnpm test:run` -> PASS (`108` files, `1919` tests)
- `pnpm typecheck` -> PASS
- `pnpm build` -> PASS

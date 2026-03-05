# Full Branch Review (Pass 5) - Comprehensive

## Findings (Ordered by Severity)

### High
1. **Retention progress can be silently lost before first challenge fetch**
   - Files: `apps/server/src/persistence/challenge-utils.ts`, `apps/server/src/persistence/challenge-store.ts`, `apps/server/src/persistence/routes.ts`
   - `updateChallengeProgressIfPersistent()` emits progress events every hand, but `checkAndUpdateProgress()` returns immediately if no active challenges exist.
   - Active challenges are only created lazily in `GET /api/challenges/:deviceToken` via `assignChallenges(...)`.
   - Result: if a player plays hands before opening the Challenges view/API, early progress is dropped with no replay/backfill.
   - Why it matters: this is a behavioral regression against user expectation ("I already played those hands").

2. **Production ownership middleware contract is not met by controller requests**
   - Files: `apps/server/src/persistence/routes.ts`, `apps/controller/src/hooks/useProfile.ts`, `apps/controller/src/components/ChallengesView.tsx`, `apps/controller/src/components/CosmeticsView.tsx`
   - Server middleware requires ownership proof in production (`x-device-token` header or query mirror), otherwise returns `401`.
   - Controller fetches currently call `/api/.../:deviceToken` but do not attach `x-device-token` header/query.
   - Result: retention endpoints can fail in production while working in dev.
   - Why it matters: profile/challenges/cosmetics can appear broken only after deploy.

### Medium
3. **Stringly-typed retention contracts still allow silent key drift**
   - Files: `packages/shared/src/types/retention.ts`, `packages/shared/src/constants/challenges.ts`, `packages/shared/src/constants/cosmetics.ts`, `apps/server/src/persistence/routes.ts`
   - Examples:
     - `requiredGame: string | null`
     - `byGameType: Partial<Record<string, GameTypeStats>>`
     - `CHALLENGE_XP_REWARDS: Record<string, number>`
     - helper signatures accepting `string` rather than constrained unions.
   - Result: typos or key drift can degrade behavior without compile-time failure (server already falls back to default XP for unknown tier).

## Confirmed Fixed From Earlier Reviews
- Session tracker now includes `sessionId` in keying and has explicit cleanup helpers.
- Disconnect handling in active game phases no longer clears tracker state.
- Controller now uses `useDeviceToken` in `App`.
- Daily bonus rollback restores original snapshot state.
- UI now surfaces non-OK claim/equip responses.
- Challenge heading now matches backend cadence ("Weekly Challenges").

## Remaining Test Gaps
- No integration test for: **player plays hands before first `/api/challenges` call**, then opens challenges (define expected behavior explicitly).
- No production-mode API contract test asserting controller includes ownership proof accepted by `validateOwnership`.
- No strict contract tests enforcing tier/game/category key unions across shared constants and server consumers.

## Verification Performed
- `pnpm test:run` -> PASS (`108` files, `1919` tests)
- `pnpm typecheck` -> PASS
- `pnpm build` -> PASS (display chunk-size warnings only; non-fatal)

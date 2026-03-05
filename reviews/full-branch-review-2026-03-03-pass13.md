# Full Branch Review (Principal Engineer) - Pass 13

Scope reviewed:
- Latest branch state at `56ca200` plus current unstaged controller/platform changes
- Re-validation of pass-12 findings and full verification gate rerun

## Findings

### High

1. **Platform device ID fallback can churn identity when storage is unavailable**
   - **File:** `apps/controller/src/hooks/usePlatformDeviceId.ts`
   - **Issue:** `getLocalStorageFallback()` does not maintain an in-memory fallback token when `localStorage` is unavailable. In that path, each recomputation generates a new UUID. Because the hook memo depends on `deviceInfo` object identity, any rerender with a new `deviceInfo` reference can produce a different ID.
   - **Why this matters:** A single client can present multiple identities during one app session, causing websocket identity, retention API identity, and server-side persistence mapping to fragment.
   - **Minimal repro:** Simulate `useDeviceInfo().getDeviceId()` returning empty and `localStorage` throwing; rerender hook with changed `deviceInfo` reference and observe ID changes.

### Low

2. **Listener leak warning still present in test runtime**
   - **File(s):** test runtime output (`pnpm test:run`)
   - **Issue:** Repeated `MaxListenersExceededWarning` appears during server tests.
   - **Why this matters:** Indicates probable listener lifecycle leakage and can hide real test noise/flakiness over time.
   - **Minimal repro:** Run `pnpm test:run` and inspect warnings.

## Re-validated as fixed from pass 12

- Retention views/hooks now use `usePlatformDeviceId` consistently (`useProfile`, `ChallengesView`, `CosmeticsView`), eliminating prior identity split-brain path.
- Platform stage URL handling now supports non-dev endpoints and no longer hardcodes dev-only targets.
- URL mutation moved out of render path (now module bootstrap-time).

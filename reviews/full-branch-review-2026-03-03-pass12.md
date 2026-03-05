# Full Branch Review (Principal Engineer) - Pass 12

Scope reviewed:
- Latest commit `56ca200` and current unstaged controller/platform changes
- Correctness and functionality focus, with verification gates rerun

## Findings

### High

1. **Identity split-brain risk between gameplay socket identity and retention API identity**
   - **Files:** `apps/controller/src/App.tsx`, `apps/controller/src/hooks/usePlatformDeviceId.ts`, `apps/controller/src/hooks/useProfile.ts`, `apps/controller/src/components/ChallengesView.tsx`, `apps/controller/src/components/CosmeticsView.tsx`
   - **Issue:** WebSocket connection identity now uses `usePlatformDeviceId()` (`getDeviceId()` when available), but retention endpoints still use `useDeviceToken()` (localStorage UUID). These can diverge for the same user/session.
   - **Why this matters:** Gameplay events and persistence APIs can resolve to different player identities, causing profile/challenge/cosmetic data to appear missing or belong to a different logical player.
   - **Minimal repro:** Use a platform-resolved device ID different from prior local token; connect to game and then open Profile/Challenges/Cosmetics—API calls target a different token namespace.

2. **Platform endpoints are hardcoded to dev in all stages**
   - **File:** `apps/controller/src/App.tsx`
   - **Issue:** `platformApiUrl` and `platformAuthApiUrl` are always set to dev domains and always passed to `PlatformProvider`, regardless of `VITE_PLATFORM_SDK_STAGE`.
   - **Why this matters:** Staging/production clients may authenticate and resolve session/device state against the wrong environment, causing login/session failures or cross-environment data contamination.
   - **Minimal repro:** Run with `VITE_PLATFORM_SDK_STAGE=production`; observe requests still going to dev platform/auth hosts.

### Medium

3. **Render-time URL mutation remains in `App()`**
   - **File:** `apps/controller/src/App.tsx`
   - **Issue:** `ensureLocalHubSessionId()` performs `window.history.replaceState(...)` during render.
   - **Why this matters:** Side effects in render are fragile under React strict mode and can create re-render ordering issues.
   - **Minimal repro:** Run local stage with strict mode enabled; render path mutates URL before effect lifecycle.

### Low

4. **Controller bundle size regression is now significant**
   - **File:** build output from `apps/controller`
   - **Issue:** Controller main asset now builds to ~1.87 MB minified (`index-XMUX9vCy.js`), triggering chunk-size warnings.
   - **Why this matters:** Mobile controller startup latency and runtime responsiveness can degrade on weaker networks/devices.
   - **Minimal repro:** `pnpm build` and inspect controller chunk report.

# Full Branch Review (Principal Engineer) - Pass 11

Scope reviewed:
- Latest branch state at `02d7719` plus current unstaged changes
- Focused on newest controller/display platform integration and 3D card rendering updates

## Findings

### High

1. **Platform API endpoints are hardcoded to dev for all stages**
   - **File:** `apps/controller/src/App.tsx`
   - **Issue:** `PLATFORM_API_URL` and `PLATFORM_AUTH_API_URL` are always set to dev endpoints and always passed into `PlatformProvider`, regardless of `VITE_PLATFORM_SDK_STAGE`.
   - **Why this matters:** Non-dev deployments (staging/production) can incorrectly authenticate and resolve device/session state against dev infrastructure, causing cross-environment data mix-ups or outright login/session failures.
   - **Minimal repro:** Run controller with `VITE_PLATFORM_SDK_STAGE=production`; inspect platform/auth requests and verify they still target dev domains.

### Medium

2. **URL mutation is performed during render path**
   - **File:** `apps/controller/src/App.tsx`
   - **Issue:** `ensureLocalHubSessionId()` mutates browser history (`replaceState`) and is invoked directly in `App()` render.
   - **Why this matters:** Render-time side effects are brittle under React strict-mode/double-invoke semantics and can cause hard-to-debug re-render behavior; this should be moved into an effect or bootstrap path.
   - **Minimal repro:** Run in local stage with strict mode; observe render path mutating URL before effects.

### Low

3. **Display deck provider ships debug globals/instrumentation**
   - **File:** `apps/display/src/components/CardDeck.tsx`
   - **Issue:** `globalThis.__cardDeckDiag` is written on every deck load with node/traversal internals.
   - **Why this matters:** Debug-only runtime state leaks into production bundles and can create noisy global namespace coupling with tests/tooling.
   - **Minimal repro:** Open display app and inspect `window.__cardDeckDiag`.

4. **Blackjack scene still contains debug fallback rendering colors**
   - **File:** `apps/display/src/components/scenes/BlackjackScene.tsx`
   - **Issue:** Missing-card fallback renders yellow/red/green debug boxes tied to internal load/map state.
   - **Why this matters:** Useful during bring-up, but this is developer diagnostic output in a player-facing path.
   - **Minimal repro:** Force card clone failure; scene shows color-coded debug blocks.

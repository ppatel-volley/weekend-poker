# Learning 015: VGF 4.8.0 Migration — Findings from emoji-multiplatform

**Date:** 2026-03-06
**Category:** VGF / Phase Management / WGFServer / PlatformProvider
**Severity:** Critical
**Source:** Discovered during emoji-multiplatform production readiness migration. See `emoji-multiplatform/learnings/038-vgf-480-phase-transitions.md` for full details.

## Summary

Upgrading from VGF 4.3.1 to 4.8.0 has three breaking changes that aren't documented in the VGF upgrade guide:

### 1. PhaseModificationError — Reducers Cannot Modify state.phase

VGF 4.8.0's `GameRunner.validatePhaseNotModified()` throws `PhaseModificationError` if any non-internal reducer modifies `state.phase` or `state.previousPhase`.

**Fix — WoF `nextPhase` pattern:**
1. Add `nextPhase: GamePhase | null` to game state
2. `SET_NEXT_PHASE` reducer sets the target (never touches `state.phase`)
3. `TRANSITION_TO_PHASE` thunk dispatches `SET_NEXT_PHASE`
4. All callers use `await ctx.dispatchThunk("TRANSITION_TO_PHASE", targetPhase)`
5. Phase `endIf`: `state.nextPhase !== null && state.nextPhase !== state.phase`
6. Phase `next`: returns `state.nextPhase`
7. No clearing needed — once phase runner updates `state.phase` to match `nextPhase`, `endIf` returns false naturally

### 2. WGFServer Does NOT Call onConnect/onDisconnect

`WGFServer` uses `WebSocketServer` which handles connections directly — creates SessionMembers and broadcasts state, but **never calls game lifecycle hooks** (`onConnect`/`onDisconnect`). Those hooks are `StateSyncSessionHandlers`-only (old `VGFServer` pattern). WoF confirmed — they don't use `onConnect` at all.

**Impact:**
- Any session setup in `onConnect` (server-side state init, timer scheduling, controller tracking) never runs
- `controllerConnected` is never set server-side
- Disconnect timeouts are never scheduled

**Fix:** Move all session setup to client-initiated thunks. The controller dispatches a setup thunk after VGF state syncs. The thunk initialises server state and transitions phases.

### 3. PlatformProvider Auth Requires VPN for Local Dev

All reference implementations (Jeopardy, Hub, Song Quiz, WoF) use unconditional `PlatformProvider` with `ensureLocalHubSessionId()` to inject a fake `volley_hub_session_id` for local/dev/staging. The auth server (`auth-dev.volley.tv`) CORS-blocks localhost unless you're on the Volley VPN.

**Pattern:**
```typescript
ensureLocalHubSessionId(stage)  // injects fake hub session ID for local/dev/staging

<PlatformProvider options={{
    gameId: GAME_ID,
    appVersion: __APP_VERSION__,
    stage,
    platformApiUrl: `https://${getPlatformApiUrl(stage)}`,
    platformAuthApiUrl: stage === "local" || stage === "dev"
        ? "https://auth-dev.volley.tv/" : undefined,
}}>
```

## Red Flags

- `PhaseModificationError` in server logs — reducer is modifying `state.phase`
- "Waiting for game to start" / stuck in lobby — `onConnect` setup isn't running (WGFServer)
- CORS errors from `auth-dev.volley.tv` — connect to Volley VPN
- Game works in unit tests but not live — unit tests mock dispatch, don't run through GameRunner

## Applicability to Weekend Casino

If Weekend Casino upgrades to VGF 4.8.0 or switches from `VGFServer` to `WGFServer`:
- All `SET_PHASE` dispatches in thunks must migrate to `TRANSITION_TO_PHASE` pattern
- `onConnect`/`onDisconnect` lifecycle hooks will stop working — move logic to client-initiated thunks
- `DevScheduler.setDispatchThunk()` must be wired from a thunk context, not `onConnect`
- PlatformProvider should use `ensureLocalHubSessionId()` pattern

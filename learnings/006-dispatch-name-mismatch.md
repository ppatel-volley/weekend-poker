# 006 — Controller dispatch names must match server reducer registration

**Severity:** Critical
**Category:** VGF, State Management, Client-Server

## Problem

The controller dispatches actions by string name (e.g., `dispatch('selectGame', game)`),
but VGF looks up these names in the ruleset's `reducers` and `thunks` objects. If the
name doesn't match, the dispatch silently times out with a `DispatchTimeoutError` — no
helpful error message indicating the reducer doesn't exist.

## Root Cause

The controller (LobbyController.tsx) was dispatching:
- `'selectGame'` — server registered it as `'setSelectedGame'`
- `'checkLobbyReady'` — server had no reducer/thunk with this name at all

The server's casino-state.ts exports reducers with `set*` prefix naming convention,
but the controller uses shorter action-style names. VGF requires exact string matches.

## Symptoms

- Button clicks appear to do nothing (no visual feedback, no state change)
- `DispatchTimeoutError` in browser console
- No server-side error (the server simply never receives a matching handler)

## Fix

Added aliases in the casino-ruleset reducers object:
```ts
selectGame: casinoReducers.setSelectedGame,
checkLobbyReady: (state) => ({ ...state, lobbyReady: true }),
```

## Prevention

- When adding controller dispatch calls, ALWAYS verify the exact string name exists
  in the server's `reducers` or `thunks` object
- Consider a shared constants file mapping action names to avoid drift
- When debugging "button does nothing" issues, check the browser console for
  `DispatchTimeoutError` — it always means the server has no handler for that action name
- VGF does NOT throw a "reducer not found" error — it just times out, which is misleading

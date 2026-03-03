# 008 — Security fixes must close ALL paths, not just add new ones

**Severity:** Critical
**Category:** Security, Multi-Agent, Code Review
**Date:** 2026-03-03

## The Mistake

Three security fixes from a principal engineering review were found incomplete on rerun:

1. **Host-only game selection:** A secure thunk (`selectGameAsHost`) was created to restrict
   game selection to the session host. However, the LobbyController still dispatched the old
   unprotected `selectGame` reducer directly. The old reducer remained in phase configs,
   fully accessible to any connected client.

2. **Hole card privacy:** A `requestMyHoleCards` thunk was added for per-player card access,
   ensuring each player only sees their own cards. However, the dealing phase still broadcast
   all cards via `setHoleCards` into public state — every client could read every player's
   cards from the shared game state.

3. **Voice pipeline bypass:** Voice commands dispatched `setPlayerLastAction` directly without
   amount validation or authentication checks, bypassing the validated `processPlayerAction`
   pipeline. A player could use voice to perform actions that would be rejected through the
   normal UI path.

## Why This Is Wrong

A security fix that leaves the insecure path open is not a fix. It is adding a locked front
door while leaving the back door unlocked. An attacker (or buggy code) can still use the old
path.

The pattern is "additive-only" security: the agent built the correct new secure path but did
not demolish or gate the old insecure one. Each fix individually looked correct in isolation
— the new thunks had proper validation, proper tests, proper types. But the old paths remained
live and reachable.

## The Correct Process

1. **Before fixing:** grep/search for EVERY path to the vulnerable behaviour. Every dispatch,
   every call site, every exposed reducer. Map the full attack surface.

2. **Add the secure replacement path** with proper validation, authentication, and tests.

3. **REMOVE or GATE every old path.** Do not leave them "for backwards compatibility." If
   a reducer should only be called internally by a thunk, remove it from phase config
   `reducers` so clients cannot dispatch it directly.

4. **Write NEGATIVE tests:** attempt the old insecure path and verify it is rejected. E.g.,
   dispatch the old `selectGame` as a non-host player and assert it throws or is ignored.

5. **Search for escape hatches:** reducers still listed in phase configs, direct dispatches
   from controllers, voice/bot code paths that bypass the validated pipeline.

## Red Flags to Watch For

- New security thunks exist but old reducer dispatches are still present in controllers
- Security tests only test the new path, never test that the old path is blocked
- Phase configs still list reducers that should be internal-only (called only by thunks)
- Voice/bot code paths not updated to use the new validated pipeline
- The word "backwards compatibility" used to justify keeping an insecure path alive
- A security PR that only adds files, never modifies or removes existing dispatches

## Prevention

- **Attack surface checklist:** For every security fix, enumerate ALL paths to the vulnerable
  behaviour before writing any code. Track them in the PR description.
- **Grep every old name:** For every new secure thunk, grep for the old reducer name in ALL
  consumer code — controllers, voice handlers, bot engine, E2E tests. Every hit is a path
  that needs updating.
- **Mandatory negative tests:** For every security fix, write at least one test that attempts
  the old insecure path and asserts it fails. "Can I still reach the vulnerable state via
  the old path?" If yes, the fix is incomplete.
- **Phase config audit:** After adding a security thunk that wraps a reducer, remove the
  raw reducer from the phase config's `reducers` object so clients cannot bypass the thunk.
- **Voice/bot path parity:** Any time the UI dispatch path changes, the voice and bot paths
  must be updated to match. They share the same server-side validation requirements.

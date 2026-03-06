# 017 — VGF Broadcast Message Format Must Match Client Schema

**Severity:** Critical
**Category:** VGF, State Management
**Date:** 2026-03-05

## The Mistake

VGF clients validate incoming messages via Zod schemas. When the server manually broadcasts state
updates (outside the normal VGF `GameRunner` pipeline), the message format must exactly match what
the client expects. Two common mistakes:

1. **Lowercase message type** — sending `{ type: 'state_update', ... }` instead of
   `{ type: 'STATE_UPDATE', ... }`. The client schema expects uppercase.
2. **Bare state payload** — sending `{ type: 'STATE_UPDATE', state: {...} }` instead of the full
   session object `{ type: 'STATE_UPDATE', session: { sessionId, members, state } }`.

Both cause the client to silently reject the message (Zod parse failure), leaving the UI showing
stale state while the server has moved on.

## Why This Is Wrong

VGF's `GameRunner` handles message formatting automatically — it wraps state in the correct session
envelope, increments state versions, runs `endIf` checks, and freezes state before broadcast. When
you bypass the `GameRunner` by calling `storage.updateSessionState()` directly and broadcasting
manually, you lose ALL of this:

- **No state freezing** — mutable state can be corrupted by later operations
- **No `endIf` checks** — phase transitions that should fire won't
- **No state version increment** — clients may ignore the update as stale
- **Wrong message format** — clients reject the update entirely

## The Correct Process

1. **Prefer VGF dispatch** — use `ctx.dispatch()` or `ctx.dispatchThunk()` whenever possible.
   The `GameRunner` handles formatting, versioning, and broadcasting correctly.

2. **If you MUST bypass VGF** (e.g., in a Socket.IO disconnect handler where you have no dispatch
   context), format the broadcast exactly:

```typescript
// WRONG
broadcastToSession(sessionId, {
  type: 'state_update',
  state: updatedState,
});

// RIGHT
const session = await storage.getSession(sessionId);
broadcastToSession(sessionId, {
  type: 'STATE_UPDATE',
  session: {
    sessionId: session.sessionId,
    members: session.members,
    state: updatedState,
  },
});
```

3. **Use `storage.updateSessionState()` only as a last resort** — document why VGF dispatch isn't
   available and add a comment explaining the manual broadcast format requirement.

## Red Flags

- Lowercase message types (`state_update`, `action_result`) in `broadcastToSession` calls
- Bare `state` property instead of full `session` object in broadcast payload
- Clients showing stale state after a server-side operation (disconnect cleanup, timer expiry)
- Direct `storage.updateSessionState()` calls without a corresponding properly-formatted broadcast
- No Zod parse errors logged on the client (silent rejection — the message just disappears)

## Prevention

- **Grep for `broadcastToSession`** — every call site must use uppercase `TYPE` and full session envelope
- **Add a helper function** that wraps manual broadcasts in the correct format, reducing copy-paste errors
- **Integration tests** should verify client state after manual broadcasts, not just server state
- **Prefer thunk-based cleanup** — even disconnect handlers can queue a thunk for the next connection
  to process, keeping state mutations within VGF's pipeline

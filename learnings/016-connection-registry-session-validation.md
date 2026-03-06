# 016 — Connection Registry Must Validate Session Membership

**Severity:** Critical
**Category:** Security, VGF, Private Data
**Date:** 2026-03-05

## The Mistake

Socket.IO handshake query params (`userId`, `sessionId`, `clientType`) are entirely client-controlled.
A malicious client can connect with a spoofed `userId` matching another player's ID, overwriting their
connection registry entry. When the server then emits private data (hole cards) to that player, the
data goes to the attacker's socket instead of the legitimate player's.

This is identity spoofing at the transport layer — the game logic is irrelevant because the attack
happens before any game action is dispatched.

## Why This Is Wrong

The connection registry is effectively a lookup table: "player X is on socket Y." If any client can
claim to be player X, they hijack all private communications intended for that player. Hole cards,
wallet balances, personal notifications — everything routed by `userId` goes to the wrong socket.

The server trusted client-supplied identity for a security-critical operation (private data routing)
without any verification against the authoritative session membership list.

## The Correct Process

1. **On Socket.IO connect**, extract `userId` and `sessionId` from the handshake query.
2. **Before registering the connection**, call `storage.getSessionMemberById(sessionId, userId)` to
   verify the claimed `userId` is actually a member of that session.
3. **If verification fails**, reject the connection immediately — do not register, do not emit state.
4. **Only after verification passes**, register the socket in the connection registry.

```typescript
// WRONG — trusts client identity
io.on('connection', (socket) => {
  const { userId, sessionId } = socket.handshake.query;
  connectionRegistry.set(userId, socket.id); // attacker overwrites real player
});

// RIGHT — validates membership first
io.on('connection', async (socket) => {
  const { userId, sessionId } = socket.handshake.query;
  const member = await storage.getSessionMemberById(sessionId, userId);
  if (!member) {
    socket.disconnect(true);
    return;
  }
  connectionRegistry.set(userId, socket.id);
});
```

## Red Flags

- Connection handlers that read `userId` from handshake and register it without validation
- Private data emission (hole cards, personal wallet) routed solely by a client-claimed `userId`
- No `getSessionMemberById` or equivalent membership check in the connection flow
- Tests that only verify happy-path connections, never test spoofed identity rejection

## Relationship to Other Learnings

This is the same principle as Learning 008 (close all paths) applied to Socket.IO connections.
The "path" here is the connection handshake itself — if you don't validate identity at connection
time, no amount of reducer-level validation will protect private data routing.

## Prevention

- **Always validate `userId` against VGF session membership** before registering connections
- **Never trust client-supplied identity** for security-critical operations (private data routing,
  host-only actions, wallet mutations)
- **Write negative tests** that attempt connection with a spoofed `userId` and assert rejection
- **Audit all `connectionRegistry.set()` call sites** — each one must be preceded by membership validation

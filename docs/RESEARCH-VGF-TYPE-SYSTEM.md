# VGF Framework Research — Type System & Architecture Reference

> **Status:** Complete
> **Date:** 2026-02-28
> **Author:** shared-engineer (Senior SWE)
> **Purpose:** Reference doc for all engineers on the Weekend Casino team. Covers VGF v4.8.0 type system, constraints, and multi-game architecture patterns.

---

## 1. BaseGameState Shape & Constraints

- `BaseGameState extends SessionState extends SerializableObject`
- **Required fields:**
  - `phase: PhaseName` (current phase, mandatory)
  - `previousPhase?: PhaseName` (set by GameRunner on transitions)
  - `__vgfStateVersion?: number` (internal version counter, auto-incremented)
- **Index signature:** `[key: string]: unknown` (must be JSON-serialisable — no class instances, functions, circular refs, Maps, Sets)
- **State is immutable:** VGF calls `Object.freeze()` before passing to reducers/thunks. Mutation throws `TypeError`.
- **Phase fields are framework-owned:** Reducers/thunks cannot modify `phase` or `previousPhase` directly — throws `PhaseModificationError`.

---

## 2. Phase System

**Lifecycle (in order):**
1. `onBegin()` fires → initialises phase state
2. Phase is ACTIVE → its reducers/thunks available
3. After EVERY non-internal reducer dispatch → `endIf()` checked
4. If `endIf()` returns `true` → `next()` evaluated → `SET_PHASE` dispatched
5. `onEnd()` fires for outgoing → `onBegin()` for incoming
6. Cascading transitions supported (new phase's `endIf()` can be immediately true)

**Phase Name Constraints:**
- Cannot be `root` (reserved for root-level reducers/thunks)
- Cannot be `internal` (reserved for framework)
- Cannot contain colons (`:` is namespace delimiter)

---

## 3. Reducers & Thunks

**Reducers:**
- Pure synchronous: `(state, ...args) => newState`
- NO side effects, NO `Date.now()`, NO `Math.random()`, NO mutation
- Deterministic: same input → same output
- Validation belongs in THUNKS, not reducers

**Thunks:**
- Async: `(ctx: IThunkContext<GameState>, ...args) => Promise<void>`
- Context: `getState()`, `getMembers()`, `dispatch()`, `dispatchThunk()`, `scheduler`, `logger`
- **Key:** `ctx.dispatch()` is SYNCHRONOUS — state mutations visible immediately after
- Use for: validation, async operations, orchestrating multiple reducers, scheduling timers

**Dispatch Name Resolution:**
- Direct match → `phase:name` → `root:name` → error

---

## 4. Storage & Persistence

- **MemoryStorage** (NodeCache): hot path, synchronous, in-process
- **RedisPersistence**: fire-and-forget, async background durability
- Dispatch → reducer → broadcast never blocks on I/O
- Sessions loaded from Redis on reconnection

---

## 5. Scheduler

- Use `ctx.scheduler.upsertTimeout()` (not raw `setTimeout`)
- Survives server failover — timeouts persist across pod restarts
- Syntax: `await ctx.scheduler.upsertTimeout({ name, delayMs, mode: "hold", dispatch: { kind: "thunk", name } })`

---

## 6. Key Gotchas

1. **State immutability** — VGF freezes state. Always spread + create new objects.
2. **Phase modification** — Reducers/thunks cannot directly set `state.phase`.
3. **Determinism** — Timestamps, random numbers come as arguments to reducers.
4. **Name collisions** — Build-time verification needed for phase-scoped reducer names.
5. **Backwards compatibility** — Hold'em phases remain unprefixed (D-003).
6. **No inheritance** — CasinoGameState is flat with optional sub-objects (D-002).

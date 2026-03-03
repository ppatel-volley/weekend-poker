# 009 — VGF 4.8.0 phase callbacks have different context objects than thunks

**Severity:** Critical
**Category:** VGF, Phase Lifecycle, Server Crash

## Problem

Every game phase file in the casino project crashes on phase transitions because they call
`ctx.dispatch()` and `ctx.dispatchThunk()` in `onBegin`/`onEnd` callbacks. These methods don't
exist on the context objects VGF provides to phase lifecycle callbacks.

VGF provides DIFFERENT context objects to each phase callback:

| Callback | Context Type | dispatch()? | getState()? | thunkDispatcher()? | scheduler? |
|----------|-------------|-------------|-------------|-------------------|------------|
| `onBegin` | IOnBeginContext | NO — use `reducerDispatcher()` | YES | YES | NO |
| `onEnd` | IOnEndContext | NO — use `reducerDispatcher()` | YES | YES | NO |
| `endIf` | IGameActionContext | NO | NO — use `ctx.session.state` | NO | NO |
| `next` | IGameActionContext | NO | NO — use `ctx.session.state` | NO | NO |
| Thunks | IThunkContext | YES (`ctx.dispatch()`) | YES | YES (`ctx.dispatchThunk()`) | YES |

Additionally, `onBegin` and `onEnd` MUST return `GameState` (not void/undefined).

## Root Cause

All game phase files use an `adaptPhaseCtx()` wrapper that tries:
```typescript
get dispatch() { return vgfCtx.reducerDispatcher ?? vgfCtx.dispatch }
```

This fallback was supposed to handle both contexts, but:
- In onBegin: `vgfCtx.reducerDispatcher` exists, so it works IF the adapter is used
- In onEnd: same
- BUT some phases bypass the adapter and call `ctx.dispatch()` directly
- AND casino-phases.ts never uses the adapter at all

## The Correct Patterns

### Pattern 1: Reducers in onBegin
```typescript
onBegin: async (ctx) => {
  ctx.reducerDispatcher('myReducer', arg1)
  return ctx.getState()  // MUST return state
}
```

### Pattern 2: Thunks in onBegin (for complex init)
```typescript
onBegin: async (ctx) => {
  await ctx.thunkDispatcher('initPhase', arg1)
  return ctx.getState()
}
// Phase thunks have full IThunkContext with ctx.dispatch(), ctx.scheduler, etc.
```

### Pattern 3: onEnd (minimal side effects, return state)
```typescript
onEnd: async (ctx) => {
  // Use reducerDispatcher for state changes
  ctx.reducerDispatcher('cleanupPhase')
  return ctx.getState()
}
```

### Pattern 4: endIf and next (read-only)
```typescript
endIf: (ctx) => ctx.session.state.someCondition === true,
next: (ctx) => ctx.session.state.selectedGame === 'holdem' ? 'DEALING' : 'OTHER',
```

## Red Flags

- `ctx.dispatch()` called anywhere except inside a thunk function
- `ctx.dispatchThunk()` called anywhere (correct name is `ctx.thunkDispatcher()` in onBegin)
- Phase `onBegin` or `onEnd` that doesn't return a value
- `ctx.getState()` called in `endIf` or `next` (use `ctx.session.state`)
- `ctx.getSessionId()` called in `onBegin`/`onEnd` (use `ctx.session.sessionId`)

## Additional VGF Insights (from emoji-multiplatform project)

1. `endIf` only fires after CLIENT-originated dispatches — NOT after onConnect, onDisconnect,
   or scheduler triggers. Use explicit SET_PHASE reducer for complex transitions.
2. Reducers must be PURE — no Date.now(), Math.random(). Compute in thunks, pass via payload.
3. Dev mode scheduler is NoOp — use `services.scheduler ?? ctx.scheduler` pattern with DevScheduler.
4. Socket.IO "message" handler lost after disconnect — use onAny workaround on all clients.
5. Sessions must pre-exist — VGF never auto-creates sessions.

## Prevention

- ALWAYS check the VGF template at `node_modules/@volley/vgf/__template/` for correct patterns
- Use typed context params instead of `any` — import IOnBeginContext, IOnEndContext, IGameActionContext
- Add a build-time test that greps for `ctx.dispatch(` in phase files and flags violations
- Every onBegin/onEnd must have an explicit `return` statement

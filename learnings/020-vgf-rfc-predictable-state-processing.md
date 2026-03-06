# Learning 020: VGF RFC — Predictable Game State Processing

**Date:** 2026-03-06
**Category:** VGF / State Management / Phase Transitions / Thunks
**Severity:** Critical
**Source:** `docs/d3956e65-ed95-4527-86fc-cf7a9c6fa309_RFC_Predictable_Game_State_Processing.pdf`

## Summary

The VGF Platform Services team published an RFC defining the behavioral contract for how dispatches, phase transitions, and lifecycle hooks interact. This contract eliminates race conditions that silently corrupt game state.

## Key Guarantees (Framework-Enforced)

1. **Consistency** — Reducers run one at a time against latest state. No lost updates.
2. **Concurrency** — Thunks run concurrently. Only serialised at reducer dispatch.
3. **Lifecycle Protection** — onBegin/onEnd are protected regions. External dispatches buffer.
4. **Immediate Broadcast** — Each reducer dispatch broadcasts immediately. 3 dispatches = 3 broadcasts.
5. **onEnd is a Finaliser** — Cannot trigger phase transitions. endIf NOT checked after onEnd.
6. **External Sources Buffer** — Player, scheduler, onConnect dispatches buffer during transitions.
7. **Fresh State** — After `await ctx.dispatch(...)`, getState() is guaranteed fresh.
8. **Phase Boundary Enforcement** — Dispatches targeting old phases are discarded with warning.

## Consumer Rules (MUST Follow)

| Context | DO | DON'T | Why |
|---------|-----|-------|-----|
| Thunks | `await ctx.dispatch(...)` | Call dispatch without await | Ensures fresh state after resolve |
| Thunks | `ctx.getState()` after async yields | Assume state unchanged after await | Other dispatches may have run |
| onBegin | Dispatch reducers for state changes | Return a state object (deprecated) | Returning state overwrites inline dispatches |
| onEnd | Use for cleanup only | Call endPhase()/setPhase() | onEnd cannot trigger transitions |
| Reducers | Keep pure: (state, ...args) => state | Dispatch from within a reducer | Reducers have no dispatch access |
| Lifecycle | Minimise async work | Do heavy I/O in onBegin/onEnd | Holds protected region open, buffering ALL external dispatches |

## Impact on Weekend Casino

### joinSession thunk MUST await dispatches
```typescript
// WRONG (current) — un-awaited dispatches lose fresh-state guarantee
ctx.dispatch('addPlayer', newPlayer)
ctx.dispatch('updateWallet', clientId, amount)

// CORRECT — await each dispatch
await ctx.dispatch('addPlayer', newPlayer)
await ctx.dispatch('updateWallet', clientId, amount)
```
Without await, each dispatch triggers independent endIf checks, and the thunk may continue dispatching into a phase it didn't start in.

### Immediate Broadcast explains Hold'em E2E timing
The RFC confirms: "A thunk that dispatches three reducers produces three broadcasts, not one." This means clients see intermediate states between dispatches. The Hold'em PostingBlinds phase doing 6 rapid dispatches in onBegin causes 6 broadcasts — clients may render between them.

### Direct storage manipulation bypasses Lifecycle Protection
Our disconnect cleanup timer calls `storage.updateSessionState()` directly. This bypasses VGF's protected regions — if it fires during onBegin/onEnd, it can corrupt state that the lifecycle hook is in the process of establishing. The RFC's buffering system exists precisely to prevent this.

### onBegin return value is deprecated
The RFC says onBegin should dispatch reducers, NOT return state. Our Learning 009 says onBegin MUST return GameState — this was correct for VGF 4.8.0's current implementation but is being deprecated per the RFC. Future VGF versions will not use the return value.

## Red Flags

- `ctx.dispatch(...)` without `await` in any thunk
- Assuming state is unchanged after async yield in a thunk
- Direct storage mutation (bypasses buffering and state versioning)
- Heavy async work in onBegin/onEnd (blocks all external dispatches)
- Returning state from onBegin instead of dispatching reducers
- endPhase()/setPhase() called from onEnd

## Prevention

- Grep for non-awaited `ctx.dispatch` calls in thunks: `grep -n 'ctx\.dispatch(' --include='*.ts' | grep -v 'await'`
- Add ESLint rule to require await on ctx.dispatch in thunk functions
- Never call storage.updateSessionState() from application code — always go through VGF dispatch
- Keep onBegin/onEnd async work minimal — offload to thunks dispatched from onBegin

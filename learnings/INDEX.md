# Learnings Index

## Quick Reference by Task Type

| Task Type | Relevant Learnings |
|---|---|
| Three.js / R3F components | 001, 002, 005 |
| React context / state | 001 |
| TDD compliance | 002 |
| Refactoring / Module replacement | 003 |
| Test failures from interface changes | 003 |
| Wallet / stack / chip mutations | 004 |
| New game implementation | 004 |
| Dependencies / pnpm install | 005 |
| React 19 compatibility | 005 |
| VGF dispatch / reducers | 006 |
| Controller-server integration | 006 |

## Summaries

### 001 — useRef + useMemo closure capture bug
**Severity:** Critical
**Category:** React, Three.js
When `useMemo` closures capture `ref.current` at memo-time, they hold a stale reference if the ref is later reassigned in a `useEffect`. Closures must read `ref.current` at call-time instead.

### 002 — TDD spec drift in shadow map type
**Severity:** Medium
**Category:** Three.js, Performance
Agent used `PCFSoftShadowMap` instead of TDD-specified `PCFShadowMap`. Soft shadows are more expensive. Always cross-check rendered config against TDD performance specs.

### 003 — Backwards-compatibility exports and superset state
**Severity:** High
**Category:** Architecture, Testing, Refactoring
When replacing a module with a new version aliased to the old name, the new state factory must be a strict superset of the old interface. Missing fields, changed reducer signatures, and stub reducers cause cascading test failures.

### 004 — Wallet and stack floor-of-zero guards
**Severity:** Critical
**Category:** Game Logic, Wallet Integrity
Every reducer/thunk that modifies wallet balances or player stacks must enforce `Math.max(0, ...)`. Every chip division must use `Math.floor()`. Every deduction must validate sufficient balance first. Failure to do so allows negative balances and fractional chips.

### 005 — React Three Fiber + React 19 reconciler incompatibility
**Severity:** Critical
**Category:** React, Three.js, Dependencies
R3F v8 uses `react-reconciler@0.27.0` which is incompatible with React 19.2+ (missing `ReactCurrentOwner` internal). Fatal runtime error at module import time. Fix: upgrade R3F to v9+, drei to v10+. Never use R3F v8 with React 19.

### 006 — Controller dispatch names must match server reducer registration
**Severity:** Critical
**Category:** VGF, State Management, Client-Server
Controller dispatches actions by string name; VGF looks them up in the ruleset's `reducers`/`thunks` objects. Mismatched names cause silent `DispatchTimeoutError` (no "reducer not found" error). Always verify dispatch names match server registration exactly.

## Cross-Reference

| Topic | Learnings |
|---|---|
| useRef + useMemo | 001 |
| Closure capture | 001 |
| Shadow maps | 002 |
| Performance budget | 002 |
| TDD compliance | 002 |
| Backward compatibility | 003 |
| Module replacement | 003 |
| Reducer signatures | 003 |
| Wallet integrity | 004 |
| Chip floor-of-zero | 004 |
| Fractional chips | 004 |
| Balance validation | 004 |
| R3F + React 19 | 005 |
| react-reconciler | 005 |
| pnpm lockfile changes | 005 |
| Dispatch name mismatch | 006 |
| DispatchTimeoutError | 006 |
| Button does nothing | 006 |

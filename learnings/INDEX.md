# Learnings Index

## Quick Reference by Task Type

| Task Type | Relevant Learnings |
|---|---|
| Three.js / R3F components | 001, 002 |
| React context / state | 001 |
| TDD compliance | 002 |
| Refactoring / Module replacement | 003 |
| Test failures from interface changes | 003 |

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

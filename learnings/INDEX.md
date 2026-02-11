# Learnings Index

## Quick Reference by Task Type

| Task Type | Relevant Learnings |
|---|---|
| Three.js / R3F components | 001, 002 |
| React context / state | 001 |
| TDD compliance | 002 |

## Summaries

### 001 — useRef + useMemo closure capture bug
**Severity:** Critical
**Category:** React, Three.js
When `useMemo` closures capture `ref.current` at memo-time, they hold a stale reference if the ref is later reassigned in a `useEffect`. Closures must read `ref.current` at call-time instead.

### 002 — TDD spec drift in shadow map type
**Severity:** Medium
**Category:** Three.js, Performance
Agent used `PCFSoftShadowMap` instead of TDD-specified `PCFShadowMap`. Soft shadows are more expensive. Always cross-check rendered config against TDD performance specs.

## Cross-Reference

| Topic | Learnings |
|---|---|
| useRef + useMemo | 001 |
| Closure capture | 001 |
| Shadow maps | 002 |
| Performance budget | 002 |
| TDD compliance | 002 |

# Learning 001: useRef + useMemo Closure Capture Bug

**Date:** February 2026
**Category:** React, Three.js
**Severity:** Critical

## The Mistake

In `CardDeck.tsx`, a `useMemo` with `[]` dependencies captured `meshMapRef.current` into a local variable at memo-time:

```typescript
const value = useMemo(() => {
  const meshMap = meshMapRef.current  // Captures initial empty Map
  const getCardClone = (card) => {
    const source = meshMap.get(name)  // Always reads from the empty Map
    // ...
  }
  return { meshMap, setCardVisibility, getCardClone }
}, [])
```

A subsequent `useEffect` replaced `meshMapRef.current = newPopulatedMap`, but the closures still referenced the original empty Map. Result: cards never rendered.

## Why This Is Wrong

`useMemo` with `[]` runs exactly once on mount, before effects. The captured `meshMapRef.current` is the initial value. When the effect later reassigns `meshMapRef.current`, the memoised closures are oblivious — they hold a stale reference to the old object.

## The Correct Process

1. Never capture `ref.current` into a local variable inside `useMemo` if the ref will be reassigned later.
2. Instead, have closures read `ref.current` at call-time:

```typescript
const value = useMemo(() => {
  const getCardClone = (card) => {
    const source = meshMapRef.current.get(name)  // Reads ref at call-time
    // ...
  }
  return { get meshMap() { return meshMapRef.current }, getCardClone }
}, [])
```

3. Alternatively, use state instead of a ref so React re-renders and the memo recalculates.

## Red Flags to Watch For

- `useMemo` or `useCallback` with `[]` deps that reads from a `useRef`
- A `useRef` that gets reassigned (not mutated) in a `useEffect`
- Context providers that memoise values containing ref-derived data

## Prevention

- When reviewing any `useMemo`/`useCallback` that references a ref, verify whether closures capture `.current` at memo-time vs call-time.
- If the ref is reassigned (not its properties mutated), closures MUST read `.current` at call-time.

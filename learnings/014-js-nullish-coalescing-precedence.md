# Learning 014: JS `??` has lower precedence than comparison operators

**Date**: 2026-03-03
**Context**: Challenge win streak evaluation in backfill logic
**Severity**: Medium

## What Happened

```typescript
// BUG: operator precedence
return event.value ?? 0 >= def.targetValue ? def.targetValue : 0
```

Due to JavaScript operator precedence, `>=` binds tighter than `??`. This evaluates as:

```typescript
return event.value ?? (0 >= def.targetValue ? def.targetValue : 0)
```

So `0 >= 5` is `false`, ternary gives `0`, then `event.value ?? 0`. If `event.value` is any truthy number (e.g., streak of 1), it returns `event.value` — but the intent was to check if the streak meets the target.

## The Fix

Always parenthesise the `??` expression:

```typescript
return (event.value ?? 0) >= def.targetValue ? def.targetValue : 0
```

## Rule

> **Always wrap `??` in parentheses when combining with other operators.** Nullish coalescing (`??`) has very low precedence in JavaScript — lower than `>=`, `===`, `+`, etc. Without parentheses, the right side of `??` swallows subsequent operators. This creates subtle bugs that are hard to spot because the code looks correct at a glance.
>
> ```typescript
> // BAD:  a ?? b >= c   → a ?? (b >= c)
> // GOOD: (a ?? b) >= c → (a ?? b) >= c
> ```

# Learning 013: Playwright `.or()` only works with locators from the same Page

**Date**: 2026-03-03
**Context**: Writing multiplayer E2E tests with two controller pages
**Severity**: Critical

## What Happened

Two-player E2E tests used `.or()` to combine locators from different Playwright Page objects:

```typescript
// WRONG — cross-page .or()
await expect(
  controllerPage.getByText(/WON/)
    .or(controllerPage2.getByText(/WON/))
).toBeVisible()
```

This silently fails or produces unpredictable results because Playwright's `.or()` combinator only works with locators bound to the **same** Page instance.

## The Fix

Use separate assertions for each page:

```typescript
// CORRECT — separate assertions per page
const result1 = controllerPage.getByText(/WON \$|LOST \$/i)
const result2 = controllerPage2.getByText(/WON \$|LOST \$/i)
await expect(result1).toBeVisible({ timeout: 30_000 })
await expect(result2).toBeVisible({ timeout: 30_000 })
```

## Rule

> **Never use `.or()` across different Page objects.** Each locator is bound to a specific page's DOM. Cross-page `.or()` doesn't throw an error — it silently produces incorrect results. For multi-player tests, always assert on each page separately.

# 005 — React Three Fiber + React 19 reconciler incompatibility

**Severity:** Critical
**Category:** React, Three.js, Dependencies

## Problem

`@react-three/fiber` v8.x uses `react-reconciler@0.27.0`, which was built for React 18.
React 19.2+ removed `ReactCurrentOwner` from `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`,
causing a fatal runtime error:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'ReactCurrentOwner')
  at $$$reconciler (react-reconciler.development.js:498:46)
  at createRenderer (events-*.esm.js:223:22)
```

This happens at module import time (not render time) because R3F creates its reconciler
when the events module is first loaded. The error is fatal — the entire app fails to start.

## Root Cause

- `react-reconciler@0.27.0` expects `React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner`
- React 19.2+ returns an empty object for `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`
- R3F v8 bundled its own react-reconciler; R3F v9 uses React's built-in reconciler

## Trigger

Running `pnpm install` to add new dependencies can regenerate the lockfile, which
may subtly change module resolution even when version numbers stay the same.
This can "unbreak" a previously working but fragile dependency combination.

## Fix

Upgrade the entire R3F ecosystem together:
- `@react-three/fiber` v8 → v9+ (removes react-reconciler dependency entirely)
- `@react-three/drei` v9 → v10+ (requires fiber v9)
- `@react-three/postprocessing` stays at v3 but resolves to fiber v9 peer

## Prevention

- When using React 19, pin R3F to v9+ and drei to v10+
- Never use `@react-three/fiber` v8 with React 19 — the reconciler is incompatible
- After any `pnpm install` that changes the lockfile, verify the app still starts in the browser
- Add a CI smoke test that loads the display app (not just unit tests)

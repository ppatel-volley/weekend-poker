# Full Branch Review (Principal Engineer) - Pass 14

Scope reviewed:
- Latest branch state at `56ca200` plus current unstaged changes in controller/server config and tests
- Full verification gate rerun (`pnpm test:run`, `pnpm typecheck`, `pnpm build`)

## Findings

### Low

1. **Controller production bundle remains materially oversized**
   - **File(s):** `apps/controller/vite.config.ts`, build output
   - **Issue:** Despite manual chunking, controller still emits a main JS chunk around `1.87 MB` minified (`dist/assets/index-*.js`), well above the Vite warning threshold.
   - **Why this matters:** Mobile controller startup and interaction responsiveness can degrade on lower-end devices and poor networks.

2. **Test warning mitigation increases listener cap instead of proving root-cause cleanup**
   - **File:** `apps/server/vitest.setup.ts`
   - **Issue:** `EventEmitter.defaultMaxListeners` is globally raised to 20. This suppresses warnings but can mask real listener leaks if future tests regress.
   - **Why this matters:** Signal quality of test diagnostics drops; leaks may accumulate unnoticed until they surface in runtime behavior.

## Re-validated as fixed from pass 13

- `usePlatformDeviceId` fallback identity churn fixed via in-memory fallback token cache.
- `MaxListenersExceededWarning` no longer appears in `pnpm test:run` output after latest test setup changes.

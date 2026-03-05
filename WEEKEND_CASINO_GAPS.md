# Weekend Casino — Gap Analysis & Migration Plan

> Extracted from `BUILDING_TV_GAMES.md`. This file contains project-specific comparisons between Weekend Casino and production Volley apps (Wheel of Fortune, CoComelon Mobile).

---

## Controller Package Comparison

This table shows what each Volley project actually uses in production. **Gaps in the Weekend Casino column are things that need fixing.**

| Package / Feature | Weekend Casino | Wheel of Fortune | CoComelon Mobile |
|---|---|---|---|
| **@volley/platform-sdk** | **MISSING** | `7.42.0` | `^7.41.2` |
| **@volley/tracking** | **MISSING** | via platform-sdk Segment | `^7.40.0` |
| **@volley/vgf** | `^4.8.0` | `^4.8.0` | N/A (non-VGF) |
| **@datadog/browser-rum** | **MISSING** | N/A (not at controller) | `^6.10.1` |
| **react-router-dom** | **MISSING** | `^7.8.1` | `^7.4.0` |
| **Vite React plugin** | `plugin-react` | `plugin-react-swc` (faster) | `plugin-react` |
| **Styling** | Inline CSS-in-JS | SCSS modules | CSS modules |
| **Storybook** | No | Yes | No |
| **Code splitting** | None | React/vendor/shared chunks | Default |
| **StrictMode** | Disabled (VGF compat) | Disabled (VGF compat) | N/A |
| **Device identity** | Custom localStorage UUID | Platform SDK `useDeviceInfo()` | Platform SDK `useAccount()` |
| **PlatformProvider** | **MISSING** | Yes (wraps entire app) | Yes (wraps entire app) |
| **Voice/STT** | Deepgram SDK direct | N/A | Platform SDK mic + custom DSP |

---

## Controller Gap Analysis and Migration Plan

### Phase 1 — Platform SDK Integration (Critical)

1. Install `@volley/platform-sdk@^7.42.0`
2. Wrap `App.tsx` in `PlatformProvider` with `gameId`, `stage`, and tracking config
3. Replace custom `useDeviceToken` (localStorage UUID) with Platform SDK's `useDeviceInfo()`
4. Wire up `useAppLifecycleState()` for pause/resume handling
5. Wire up `useCloseEvent()` for graceful app shutdown
6. Add env variables: `VITE_GAME_ID`, `VITE_PLATFORM_SDK_STAGE`, `VITE_SEGMENT_WRITE_KEY`

### Phase 2 — Analytics and Monitoring

1. Confirm whether `@volley/tracking` is bundled in platform-sdk or needs separate install
2. Add key event tracking: game start, game end, bet placed, voice command used
3. Consider adding `@datadog/browser-rum` for crash monitoring

### Phase 3 — Build Improvements

1. Switch from `@vitejs/plugin-react` to `@vitejs/plugin-react-swc` (faster dev rebuilds)
2. Add Vite `manualChunks` for code splitting (React, vendor, shared-core)
3. Add proper `base` path for production deployment

### Phase 4 — Optional Improvements

1. Add `react-router-dom` if URL-based routing is needed for non-game screens
2. Consider a shared `web-common` package for VGF hooks used by both display and controller
3. Add Storybook for component development (if the team wants it)

---

## Server Cross-Project Comparison

| Aspect | Weekend Casino | Wheel of Fortune |
|--------|----------------|------------------|
| **VGF class** | `VGFServer` (old) | `WGFServer` (new) |
| **Logger** | pino (direct) | `@volley/logger` + request IDs |
| **Redis** | Optional (mock fallback) | Required + exponential backoff + jitter |
| **Scheduler** | Noop (in-memory) | `RedisRuntimeSchedulerStore` (persistent) |
| **Health endpoints** | `/health` (basic) | `/health` + `/health/ready` (with Redis check) |
| **Session middleware** | None | Pre-creation validation + audit logging |
| **Error handlers** | None (VGF implicit) | Explicit 404 + error handlers with context |
| **Graceful shutdown** | None | SIGTERM/SIGINT with 25s timeout |
| **Docker** | None | Multi-stage Dockerfile + docker-compose |
| **Socket.IO** | Created internally by VGF | Explicit server injection |
| **Build system** | tsc | esbuild (faster) |
| **CORS** | Regex localhost/LAN detection | Env var driven (`CORS_ORIGIN`) |

---

## Display Cross-Project Comparison

| Aspect | Weekend Casino | Wheel of Fortune |
|--------|----------------|------------------|
| **Platform SDK** | Optional peer dep | **Pinned hard dep** (`7.42.0`) |
| **PlatformProvider** | MaybePlatformProvider (detection only) | Full PlatformProvider with stage-aware URLs |
| **Electron IPC** | Static preload (`platform`, `isElectron`) | **Dynamic IPC handlers** (session, backend, stage) |
| **Config source** | Vite env vars only | Electron IPC + CLI args + env vars |
| **Mock transport** | None | `createMockTransport()` for headless debug |
| **Build plugin** | `@vitejs/plugin-react` + `plugin-legacy` | `@vitejs/plugin-react-swc` |
| **Code splitting** | Library-based (three, r3f, drei) | Function-based (shared-core, three-vendor, react, vendor) |
| **Sourcemaps** | None | Inline (dev), true (prod) |
| **Console stripping** | None | Production builds drop `console.*` and `debugger` |
| **R3F libraries** | drei, postprocessing | Minimal R3F (no drei, no postprocessing) |
| **Spatial nav** | norigin-spatial-navigation | Custom `useKeyPress` hooks |
| **QR codes** | `qrcode.react` | `qrcode` (native, no React wrapper) |
| **Storybook** | None | Full setup (`@storybook/react-vite`) |

---

## Monorepo Cross-Project Comparison

| Aspect | Weekend Casino | Wheel of Fortune |
|--------|----------------|------------------|
| **Package manager** | pnpm 9.15.4 | pnpm 10.6.5 |
| **Task orchestration** | Direct pnpm scripts | Turborepo |
| **CI caching** | None | Turbo remote cache |
| **Delta CI** | None (runs everything) | `--filter='...[origin/main]'` |
| **CI parallelisation** | Sequential single job | Parallel jobs (typecheck, test, build) |
| **Formatting** | None | Prettier + lint-staged + git hooks |
| **Shared config** | 1 package (`shared`) | 5 packages (shared-types, eslint-config, tsconfig, web-common, art-assets) |
| **Docker** | None | Multi-stage Dockerfile + docker-compose |
| **.npmrc** | None | `inject-workspace-packages=true` |
| **Setup automation** | None | `setup.sh`, `dev-all.sh` |
| **E2E testing** | Playwright (7 project profiles) | Per-app (less comprehensive) |
| **PR templates** | None | GitHub PR template + CODEOWNERS |
| **Dependency updates** | Manual | Dependabot |

---

## Server Production Readiness — Priority Order

**Phase 1 — Server production readiness** (blocks deployment):
1. Switch `VGFServer` to `WGFServer`
2. Resilient Redis client (backoff + jitter)
3. `RedisRuntimeSchedulerStore` (persistent scheduler)
4. `@volley/logger` with request IDs
5. `/health/ready` endpoint with Redis check
6. Graceful shutdown handler
7. Error handlers (404 + error middleware)
8. Session validation middleware
9. Dockerfile + docker-compose

**Phase 2 — Display production readiness**:
1. `@volley/platform-sdk` as hard dependency
2. Stage-aware platform URL resolution
3. Electron IPC config handlers
4. Mock transport for headless debug

**Phase 3 — Monorepo infrastructure**:
1. `.npmrc`
2. Turborepo
3. Prettier + lint-staged
4. Shared config packages
5. CI pipeline parallelisation

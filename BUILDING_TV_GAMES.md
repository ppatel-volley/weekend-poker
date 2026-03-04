# Building Smart TV Games with VGF + Platform SDK

A comprehensive guide for developers and AI agents building TV games on the Volley platform. Covers Fire TV, Samsung Tizen, and LG webOS with D-pad remote navigation.

**Target audience**: Anyone starting a new TV game project from scratch.
**Reference implementation**: `emoji-multiplatform` and `jeopardy-fire-web`.

---

## For AI Agents

**Read this section first.** These are the most common failure modes when an AI agent builds a TV game:

1. **NPM authentication required.** The `@volley/vgf` and `@volley/platform-sdk` packages are published to npmjs.com under the `@volley` scope. If `pnpm add @volley/vgf` fails with 404 or 403, **stop and ask the user to run `npm login`** to authenticate with their Volley org npm account.
2. **Never render `PlatformProvider` unconditionally.** It crashes without `volley_hub_session_id` (only present on real TVs). Always use the `MaybePlatformProvider` pattern (Section 3).
3. **Always use thunks for phase transitions.** Never use a reducer dispatch to trigger a phase change — `endIf` cascade will crash `onBegin` with a wrong context shape. Use a thunk with explicit `dispatch("SET_PHASE", ...)` (Section 4, endIf Rules).
4. **Never put `query` inside `socketOptions`.** It clobbers VGF's internal `sessionId`, `userId`, and `clientType` (Section 4, Transport Configuration).
5. **VGF state starts as `{}`.** Always guard with `"phase" in state` before rendering (Section 4).
6. **Always override Socket.IO transports.** Default is websocket-only; set `transports: ["polling", "websocket"]` (Section 4).
7. **Reference implementation is at `emoji-multiplatform`** (same parent directory). When unsure about a pattern, check the reference code.

---

## Table of Contents

0. [Prerequisites & Setup](#0-prerequisites--setup)
1. [Project Scaffolding](#1-project-scaffolding)
2. [Architecture Overview](#2-architecture-overview)
3. [Platform SDK Setup](#3-platform-sdk-setup)
   - 3.1. [Server-Side Account Integration (v2.2)](#31-server-side-account-integration-v22)
4. [VGF Setup](#4-vgf-setup)
5. [TV Remote Input Handling](#5-tv-remote-input-handling)
6. [D-pad Navigation Patterns](#6-d-pad-navigation-patterns)
7. [Voice Input on TV](#7-voice-input-on-tv)
8. [On-Screen Keyboard](#8-on-screen-keyboard)
9. [Remote Mode vs Controller Mode](#9-remote-mode-vs-controller-mode)
10. [Dev Mode Testing](#10-dev-mode-testing)
11. [Vite Build Configuration for TV](#11-vite-build-configuration-for-tv)
12. [TV Deployment](#12-tv-deployment)
13. [Common Pitfalls](#13-common-pitfalls)
14. [Complete Code Examples](#14-complete-code-examples)

---

## 0. Prerequisites & Setup

### Required Tools

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | >= 22.0.0 (LTS) | [nodejs.org](https://nodejs.org) or `nvm install 22` |
| **pnpm** | >= 10.0.0 | `npm install -g pnpm@latest` |
| **Git** | Any recent | [git-scm.com](https://git-scm.com) |

### NPM Authentication

The `@volley` packages (`@volley/vgf`, `@volley/platform-sdk`, `@volley/waterfall`, `@volley/logger`) are published to the public npm registry under the Volley organisation. You must be logged in with an account that has access to the `@volley` scope.

```bash
# 1. Log in to npm (opens browser for authentication)
npm login

# 2. Verify you're logged in
npm whoami
# Should print your npm username

# 3. Verify you can access Volley packages
npm view @volley/vgf version
# Should print a version number (e.g., 4.3.1)
```

> **For AI agents:** If `pnpm add @volley/vgf` fails with a 404 or 403 error, ask the user to run `npm login` and authenticate with their Volley org npm account. Do not attempt to configure a custom registry — the packages are on the public npm registry.

### Verify Setup

```bash
node --version   # >= 22.0.0
pnpm --version   # >= 10.0.0
npm whoami       # your npm username
```

---

## 1. Project Scaffolding

### Monorepo Structure

```
your-game/
  apps/
    display/       # TV screen app (React + Vite)
    server/        # VGF game server (Node.js)
    controller/    # Phone controller app (React + Vite, optional)
  packages/
    shared/        # Shared types, constants, state factory
  pnpm-workspace.yaml
  tsconfig.base.json
  package.json
  .env             # Deepgram API key, etc.
```

### Step-by-Step Setup

**1. Create the monorepo root:**

```bash
mkdir your-game && cd your-game
git init
```

**2. Create `pnpm-workspace.yaml`:**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

**3. Create root `package.json`:**

```json
{
  "name": "your-game",
  "private": true,
  "packageManager": "pnpm@10.27.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "test:run": "pnpm -r test -- --run",
    "typecheck": "pnpm -r typecheck",
    "dev": "pnpm -r --parallel dev",
    "clean": "pnpm -r clean"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  },
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=10.0.0"
  }
}
```

**4. Create `tsconfig.base.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true
  }
}
```

**5. Create `packages/shared/`:**

```bash
mkdir -p packages/shared/src
```

`packages/shared/package.json`:
```json
{
  "name": "@your-game/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc -b",
    "test": "vitest",
    "test:run": "vitest --run",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "peerDependencies": {
    "react": ">=18"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "react": "^19.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

**6. Create `apps/display/`:**

```bash
mkdir -p apps/display/src
```

`apps/display/package.json`:
```json
{
  "name": "@your-game/display",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@your-game/shared": "workspace:*",
    "@volley/platform-sdk": "7.40.0",
    "@volley/vgf": "4.3.1",
    "focus-trap-react": "^12.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

`apps/display/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "references": [
    { "path": "../../packages/shared" }
  ]
}
```

**7. Create `apps/server/`:**

```bash
mkdir -p apps/server/src
```

`apps/server/package.json`:
```json
{
  "name": "@your-game/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc -b",
    "dev": "tsx watch src/dev.ts",
    "start": "node dist/index.js",
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@your-game/shared": "workspace:*",
    "@volley/logger": "^1.4.1",
    "@volley/vgf": "4.3.1",
    "@volley/waterfall": "2.5.3",
    "express": "^5.2.1"
  },
  "devDependencies": {
    "@types/express": "^5.0.6",
    "@types/node": "^22.0.0",
    "@types/ws": "^8.18.1",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "ws": "^8.19.0"
  }
}
```

`apps/server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "references": [
    { "path": "../../packages/shared" }
  ]
}
```

**8. Install dependencies:**

```bash
pnpm install
```

> **For AI agents:** If `pnpm install` fails with 404/403 on `@volley/*` packages, ask the user to run `npm login` first (see Section 0).

---

## 2. Architecture Overview

### System Diagram

```
+-------------------+     Socket.IO      +------------------+
|   Display App     | <=================> |   VGF Server     |
|   (TV Screen)     |    state sync       |   (Node.js)      |
+-------------------+                     +------------------+
        |                                         ^
        | Platform SDK                            |
        | (TV shell integration)                  | Socket.IO
        v                                         |
+-------------------+                     +------------------+
|   TV Shell        |                     |  Controller App  |
|   (Fire TV /      |                     |  (Phone browser) |
|    Tizen / webOS) |                     +------------------+
+-------------------+
```

### Three Layers

| Layer | Package | Purpose |
|-------|---------|---------|
| **Platform SDK** | `@volley/platform-sdk` | TV shell integration: input handling, microphone, screensaver prevention, session tracking, payments |
| **VGF (Volley Game Framework)** | `@volley/vgf` | Game state management: sessions, phases, reducers, thunks, real-time sync via Socket.IO |
| **React App** | Your code | UI rendering, scene routing, D-pad navigation, voice input |

### Client Types

VGF defines two primary client types:

| Client Type | Role | Example |
|-------------|------|---------|
| `ClientType.Display` | The TV screen. Renders game UI. Read-heavy, dispatch-light. | Fire TV app, Samsung Tizen webapp |
| `ClientType.Controller` | The phone. Sends voice input, button presses. | Mobile browser via QR code pairing |

In **remote mode** (TV remote only, no phone), the Display acts as both display AND input device.

### Session / Phase / Reducer / Thunk Model

```
Session (one per game instance)
  |
  +-- State (shared, synced to all clients)
  |     |-- phase: "lobby" | "categorySelect" | "playing" | "gameOver"
  |     |-- score, timer, currentEmojis, etc.
  |
  +-- Phases (state machine)
  |     |-- endIf: (ctx) => boolean    // when to leave this phase
  |     |-- next: string | (ctx) => string  // where to go
  |     |-- onBegin: (ctx) => GameState | Promise<GameState>  // setup when entering (returns state)
  |     |-- onEnd: async (ctx) => {}    // cleanup when leaving
  |
  +-- Reducers (pure, synchronous state transforms)
  |     |-- SET_CATEGORY, SET_SCORE, RESET_GAME, etc.
  |
  +-- Thunks (async operations that dispatch reducers)
        |-- PROCESS_TRANSCRIPTION, HANDLE_TIMEOUT, etc.
```

**Key rule**: Reducers are pure. Thunks are async. Phases define the game flow. The server owns the state; clients get synced copies.

---

## 3. Platform SDK Setup

### Package Exports

```typescript
// React hooks and providers (for UI code)
import { PlatformProvider, useKeyDown, useKeyUp, useMicrophone } from "@volley/platform-sdk/react"

// Utility functions (for non-React code)
import { getPlatform, Platform } from "@volley/platform-sdk/lib"
```

The SDK package.json exports:
```json
{
  "exports": {
    "./react": "./src/react/index.ts",
    "./lib": "./src/lib/index.ts"
  }
}
```

### Available React Hooks

| Hook | Purpose |
|------|---------|
| `useKeyDown(key, callback)` | Register key press handler (requires PlatformContext) |
| `useKeyUp(key, callback)` | Register key release handler (requires PlatformContext) |
| `useMicrophone()` | Access TV microphone hardware |
| `useInputHandler()` | Low-level input handler access |
| `useAccount()` | Get user account info |
| `useSessionId()` | Get Platform session ID |
| `useHubSessionId()` | Get TV shell hub session ID |
| `useDeviceInfo()` | Get device hardware info |
| `useTracking()` | Analytics tracking |
| `useAppLifecycle()` | App foreground/background events |
| `useCloseEvent()` | App close handling |
| `useGameOrchestration()` | Game orchestration control |
| `usePayments()` | In-app purchases |
| `useSpeechRecognition()` | Platform speech-to-text |
| `useAudioRecorder()` | Raw audio recording |
| `useAppVersion()` | App version info |
| `useHapticFeedback()` | Controller haptics |
| `usePlatformStatus()` | SDK ready state |
| `useAccountManagement()` | Account management operations |
| `useEventBroker()` | Platform event broker |
| `useGameId()` | Get the current game ID |

### PlatformProvider Configuration

```typescript
<PlatformProvider
    options={{
        gameId: "your-game-id",          // Registered game identifier
        appVersion: "1.0.0",             // Semantic version
        stage: "staging",                // "local" | "test" | "dev" | "staging" | "production"
        screensaverPrevention: {
            autoStart: true,             // Prevent TV screensaver during gameplay
        },
        // Only needed for stage: "local" or "test"
        // platformApiUrl: "http://localhost:...",
    }}
>
    {children}
</PlatformProvider>
```

> **Note:** `screensaverPrevention` is not part of the Zod schema validation but is consumed by the SDK internally after init. It's safe to pass -- unknown fields are stripped by Zod but the SDK reads the raw options.

### Stage Configuration

The Stage type is: `"local" | "test" | "dev" | "staging" | "production"`.

| Stage | Behaviour |
|-------|----------|
| `"staging"` | Auto-resolves API URLs to staging environment. No local config needed. **Use this for development on real devices.** |
| `"production"` | Auto-resolves to production URLs. |
| `"dev"` | Development stage. Auto-resolves API URLs to dev environment. |
| `"test"` | Test stage. Requires `platformApiUrl`. |
| `"local"` | Requires `platformApiUrl`. Missing it causes silent failures. |

### **CRITICAL: volley_hub_session_id Requirement**

The `useHubSessionId()` hook throws at render time if `volley_hub_session_id` is missing from URL params. Additionally, `PlatformProvider` may fail during init for other reasons (iframe session ID, network errors). The `MaybePlatformProvider` pattern prevents both failure modes by only loading the SDK on real TV platforms.

This param is injected by the TV shell when launching your app. It is **never** present in dev/web mode. If you render `PlatformProvider` unconditionally and use `useHubSessionId()`, your app will crash with:

```
Uncaught Error: Hub session ID not found in query parameters
```

### The MaybePlatformProvider Pattern

**Always** wrap `PlatformProvider` conditionally:

```typescript
import type { ReactNode } from "react"
import { detectPlatform, isTV } from "./utils/detectPlatform"

function MaybePlatformProvider({ children }: { children: ReactNode }) {
    // Skip the SDK entirely on web/dev -- useHubSessionId() will throw at render time
    // without volley_hub_session_id, and PlatformProvider may fail during init
    // for other reasons (iframe session ID, network errors)
    if (!isTV(detectPlatform())) return <>{children}</>

    // NOTE: require() is used intentionally here, not import().
    // This is a synchronous conditional load that avoids bundling the SDK
    // in web builds. Vite handles this correctly in production builds.
    // Do NOT refactor to dynamic import() — it changes the rendering semantics.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PlatformProvider } = require("@volley/platform-sdk/react")

    return (
        <PlatformProvider
            options={{
                gameId: "your-game-id",
                appVersion: "1.0.0",
                stage: "staging",
                screensaverPrevention: { autoStart: true },
            }}
        >
            {children}
        </PlatformProvider>
    )
}
```

### Platform Detection

The SDK uses mobile detection first, then the `volley_platform` query param (set by the TV shell) with user-agent fallback:

```typescript
// SDK's getPlatform() logic:
// 1. Check getMobileType() for mobile/Capacitor bridge
// 2. Check volley_platform query param
// 3. Check user agent for "Tizen" + "SMART-TV" (Samsung)
// 4. Check user agent for "Web0S" + "SmartTV" (LG)
// 5. Default to Platform.Web
```

**Lightweight local detection** (no SDK dependency):

```typescript
export type TVPlatform = "WEB" | "FIRE_TV" | "SAMSUNG_TV" | "LG_TV" | "MOBILE"

export function detectPlatform(): TVPlatform {
    const params = new URLSearchParams(window.location.search)
    const override = params.get("volley_platform")
    if (override === "FIRE_TV") return "FIRE_TV"
    if (override === "SAMSUNG_TV") return "SAMSUNG_TV"
    if (override === "LG_TV") return "LG_TV"

    const ua = navigator.userAgent
    if (ua.includes("Tizen") && ua.includes("SMART-TV")) return "SAMSUNG_TV"
    if (ua.includes("Web0S") && ua.includes("SmartTV")) return "LG_TV"

    return "WEB"
}

export function isTV(platform: TVPlatform): boolean {
    return platform === "FIRE_TV" || platform === "SAMSUNG_TV" || platform === "LG_TV"
}
```

### URL Query Parameters

| Param | Source | Purpose |
|-------|--------|---------|
| `volley_hub_session_id` | TV shell | Required by `useHubSessionId()` hook at render time (not constructor) |
| `volley_platform` | TV shell | Platform detection override (FIRE_TV, SAMSUNG_TV, LG_TV) |
| `volley_account` | TV shell | User account ID for tracking |
| `sessionId` | VGF | Game session identifier |

### 3.1. Server-Side Account Integration (v2.2)

The Hub passes user identity to games via URL query params → Socket.IO query → VGF server `onConnect`. The server resolves identity for persistence (profiles, achievements, cosmetics).

**Three identity tiers** (strongest to weakest):

| Tier | Source | Field | Context |
|------|--------|-------|---------|
| Authenticated | `useAccount()` from Platform SDK | `accountId` / `volley_account` | User completed QR code device auth |
| Anonymous | `useAnonymousId()` from Platform SDK | `anonymousId` | Device-level, no auth needed |
| Dev Token | `localStorage` UUID | `deviceToken` / `userId` | Dev-mode fallback |

**Server-side identity resolution pattern:**

```typescript
// apps/server/src/persistence/identity-resolver.ts
export function resolveIdentity(metadata: Record<string, unknown>): ResolvedIdentity {
  // Priority 1: Platform SDK authenticated account
  const accountId = metadata['accountId'] ?? metadata['volley_account']
  if (typeof accountId === 'string' && accountId.length > 0) {
    return { token: accountId, source: 'platform_account' }
  }

  // Priority 2: Platform SDK anonymous device identity
  const anonymousId = metadata['anonymousId']
  if (typeof anonymousId === 'string' && anonymousId.length > 0) {
    return { token: anonymousId, source: 'platform_anonymous' }
  }

  // Priority 3: Dev-mode device token
  const deviceToken = metadata['deviceToken'] ?? metadata['userId']
  if (typeof deviceToken === 'string' && deviceToken.length > 0) {
    return { token: deviceToken, source: 'device_token' }
  }

  return { token: `anon_${Date.now()}`, source: 'device_token' }
}
```

**Key points:**
- The game server does NOT manage auth — it receives identity from the client
- Client gets identity from Platform SDK (`useAccount()`, `useAnonymousId()`) or generates a dev token
- The resolved `persistentId` is used as the Redis key for all persistence (profiles, achievements, challenges, cosmetics)
- Hub auth flow: QR code device authorisation → Volley Identity API (auth.volley.tv) → `account.id` returned via `useAccount()`
- Identity API endpoints: `https://auth.volley.tv` (prod), staging/dev variants available

---

## 4. VGF Setup

### Package Exports

```json
{
  "exports": {
    "./client": { "types": "./dist/client.d.ts", "import": "./dist/client.js" },
    "./server": { "types": "./dist/server.d.ts", "import": "./dist/server.js" },
    "./types":  { "types": "./dist/types.d.ts",  "import": "./dist/types.js"  },
    "./util":   { "types": "./dist/util.d.ts",   "import": "./dist/util.js"   }
  }
}
```

### Game State Type

Define your game state in `packages/shared`. This is the single source of truth for the state shape.

```typescript
// packages/shared/src/types.ts
export interface YourGameState {
    phase: string
    category: string | null
    difficulty: number | null
    totalQuestions: number
    questionIndex: number
    currentEmojis: string[]
    currentHint: string
    showHints: boolean
    quizSubState: string            // "QUESTION" | "SOLUTION" | "TIMEOUT" | "QUIZ_OVER"
    timerStartedAt: number
    timerDuration: number
    timerPausedAt: number | null
    score: number
    lastAnswerScore: number | null
    lastAnswerText: string | null
    isNewHighScore: boolean
    controllerConnected: boolean
    pairingCode: string | null
    controllerUrl: string | null
    remoteMode: boolean
    isFtue: boolean
    // Add your game-specific fields here
}
```

### Initial State Factory

VGF calls `setup()` to create the initial state for each session. This function must return a complete state object:

```typescript
// packages/shared/src/state.ts
import type { YourGameState } from "./types"
import { GAME_CONSTANTS } from "./constants"

export function createInitialGameState(): YourGameState {
    return {
        phase: "lobby",
        category: null,
        difficulty: null,
        totalQuestions: GAME_CONSTANTS.QUESTIONS_PER_ROUND,
        questionIndex: 1,
        currentEmojis: [],
        currentHint: "",
        showHints: false,
        quizSubState: "QUESTION",
        timerStartedAt: 0,
        timerDuration: GAME_CONSTANTS.TIMER_DURATION_MS,
        timerPausedAt: null,
        score: 0,
        lastAnswerScore: null,
        lastAnswerText: null,
        isNewHighScore: false,
        controllerConnected: false,
        pairingCode: null,
        controllerUrl: null,
        remoteMode: false,
        isFtue: false,
    }
}
```

### GameServices Type (Server-Side Dependency Injection)

Server thunks and lifecycle hooks receive services via closure capture. Define a services interface for your game:

```typescript
// apps/server/src/services.ts
export interface WaterfallMatchResult {
    foundMatch: boolean
    confidence?: number
    matchedAnswer?: string
}

export interface GameServices {
    deepgram: {
        createTemporaryToken: (opts: { expiresIn: number }) => Promise<{ key: string }>
    }
    database: {
        query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
    }
    amplitude: {
        track: (userId: string, event: string, properties: Record<string, unknown>) => void
        identify: (userId: string, properties: Record<string, unknown>) => void
    }
    datadog: {
        captureError: (err: unknown, context?: Record<string, unknown>) => void
    }
    waterfall: {
        match: (text: string, targets: string[], cutoff: number) => WaterfallMatchResult
    }
    endSession: (sessionId: string) => void
    serverState: Map<string, ServerOnlyState>
    scheduler?: Scheduler | null
    devMode?: boolean
}
```

In dev mode, most services are stubbed (see Section 10, Dev Server Example).

### Client-Side Setup

```typescript
import {
    VGFProvider,
    createSocketIOClientTransport,
    ClientType,
    getVGFHooks,
} from "@volley/vgf/client"
```

#### Transport Configuration

```typescript
const transport = createSocketIOClientTransport({
    url: "http://localhost:8080",  // VGF server URL
    query: {
        sessionId: "dev-test",
        userId: "display-dev",
        clientType: ClientType.Display,
    },
    socketOptions: {
        transports: ["polling", "websocket"],  // MUST override -- default is websocket-only
        upgrade: true,
    },
})
```

**CRITICAL: Never use `socketOptions.query`**

```typescript
// WRONG - socketOptions.query REPLACES the main query object
createSocketIOClientTransport({
    url,
    query: { sessionId, userId, clientType: ClientType.Display },
    socketOptions: {
        query: { inputMode: "remote" },  // THIS CLOBBERS sessionId, userId, clientType!
    },
})

// RIGHT - pass extra data via thunks after connection
createSocketIOClientTransport({
    url,
    query: { sessionId, userId, clientType: ClientType.Display },
    socketOptions: {
        transports: ["polling", "websocket"],
    },
})
// Then after connected: dispatchThunk("ACTIVATE_REMOTE_MODE", {})
```

Socket.IO's client merges `socketOptions.query` at the transport level, completely replacing VGF's internal query that contains `sessionId`, `userId`, and `clientType`. The connection will appear to work but VGF's server middleware won't find the session.

#### Provider Setup

```typescript
export function VGFDisplayProvider({ children }: { children: ReactNode }) {
    const transport = useMemo(() => {
        const url = import.meta.env.DEV
            ? "http://localhost:8080"
            : window.location.origin

        return createSocketIOClientTransport({
            url,
            query: {
                sessionId: getQueryParam("sessionId", ""),
                userId: getQueryParam("userId", ""),
                clientType: ClientType.Display,
            },
            socketOptions: {
                transports: ["polling", "websocket"],
                upgrade: true,
            },
        })
    }, [])

    return <VGFProvider transport={transport}>{children}</VGFProvider>
}
```

### State Management Hooks

Create typed hooks for your game state:

```typescript
import { getVGFHooks } from "@volley/vgf/client"
import type { YourGameState } from "@your-game/shared"

const {
    useStateSync,         // Returns full game state
    useStateSyncSelector, // Returns selected slice of state
    useDispatch,          // Dispatch reducers: dispatch("SET_SCORE", { score: 100 })
    useDispatchThunk,     // Dispatch thunks: dispatchThunk("PROCESS_TRANSCRIPTION", { text })
    useDispatchAction,    // Dispatch actions
    usePhase,             // Returns current phase name
    useSessionMembers,    // Returns connected clients
    useEvents,            // Subscribe to VGF events
    useConnectionStatus,  // Connection state (connected, disconnected, reconnecting)
} = getVGFHooks<any, YourGameState, string>()
```

**CRITICAL: VGF state initialises as `{}`**

`useStateSync()` returns `{}` (empty object) before the first state sync. Always guard:

```typescript
const state = useStateSync()
if (!("phase" in state)) {
    return <LoadingScreen />
}
```

### Server-Side Setup

#### Game Ruleset

The ruleset is the top-level interface VGF expects:

```typescript
import type { GameRuleset } from "@volley/vgf/server"

export function createGameRuleset(services: GameServices): GameRuleset<YourGameState> {
    return {
        setup: createInitialGameState,    // Factory for initial state
        actions: {},                       // Required field -- pass empty object for games that don't use actions
        reducers: globalReducers,          // Pure state transforms
        thunks: {                          // Async operations
            PROCESS_TRANSCRIPTION: createProcessTranscriptionThunk(services),
            HANDLE_TIMEOUT: createHandleTimeoutThunk(services),
        },
        phases: createPhases(services),    // State machine
        onConnect: createOnConnect(services),
        onDisconnect: createOnDisconnect(services),
    }
}
```

> **Note on `actions`:** The `actions` field is required by VGF's `GameRuleset` type. Pass `actions: {}` (empty object) — this is valid and type-safe. You do not need any type cast.

#### Phase Definitions

```typescript
interface Phase {
    actions: Record<string, unknown>
    reducers: Record<string, unknown>
    thunks: Record<string, unknown>
    onBegin?: (ctx: PhaseLifecycleContext) => GameState | Promise<GameState>
    onEnd?: (ctx: PhaseLifecycleContext) => Promise<void>
    endIf: ((ctx: GameActionContext) => boolean) | undefined
    next: string | ((ctx: GameActionContext) => string)
}
// Note: VGF expects `onBegin` to return the game state. The emoji codebase returns void
// and uses type casting (`ctx: unknown`), which works but doesn't match the official type.
```

> **WARNING**: VGF's `IOnBeginContext` provides: `session`, `logger`, `reducerDispatcher`, `thunkDispatcher`, `getState`. It does NOT have `getSessionId()` or `scheduler`. The emoji codebase casts to a custom `PhaseLifecycleContext` type, which is why `endIf` cascade can crash `onBegin` with a wrong context shape (see endIf Rules below).

```typescript
export function createPhases(): Record<string, Phase> {
    return {
        lobby: {
            actions: {}, reducers: {}, thunks: {},
            endIf: (ctx) => ctx.session.state.controllerConnected,
            next: (ctx) => ctx.session.state.isFtue ? "playing" : "categorySelect",
        },
        categorySelect: {
            actions: {}, reducers: {}, thunks: {},
            endIf: (ctx) => ctx.session.state.category !== null,
            next: "difficultySelect",
        },
        playing: {
            actions: {}, reducers: {}, thunks: {},
            onBegin: async (ctx) => {
                // Load questions, set timer, etc.
            },
            endIf: (ctx) => ctx.session.state.quizSubState === "QUIZ_OVER",
            next: "gameOver",
        },
        gameOver: {
            actions: {}, reducers: {}, thunks: {},
            endIf: undefined,  // Terminal phase (or use autoplay restart)
            next: "playing",
        },
    }
}
```

### **CRITICAL: endIf Behaviour (Three Rules)**

These three rules will save you hours of debugging:

| Dispatch Context | endIf Re-evaluated? | onBegin Context Shape | Recommendation |
|------------------|---------------------|-----------------------|----------------|
| `onConnect` / `onDisconnect` lifecycle hooks | **NO** | N/A | Use `dispatch("SET_PHASE", ...)` explicitly |
| Client reducer dispatch | **YES** | **Different** from ThunkContext (may lack `getSessionId()`) | Avoid for complex transitions |
| Thunk dispatch with `SET_PHASE` | N/A (manual) | Full ThunkContext | **Always use this for complex transitions** |

**Rule 1**: endIf is NOT re-evaluated after dispatches in `onConnect`/`onDisconnect`. You must force phase transitions manually.

```typescript
// In onConnect handler:
ctx.dispatch("SET_CONTROLLER_CONNECTED", { connected: true })
// lobby.endIf checks controllerConnected, but it WON'T fire here!
// You MUST also do:
ctx.dispatch("SET_PHASE", { phase: "categorySelect" })
```

**Rule 2**: When endIf DOES cascade (from client dispatches), the `onBegin` context has a different shape. `ctx.getSessionId()` may not exist, causing `TypeError: c.getSessionId is not a function`.

**Rule 3**: The safe path is always a thunk with explicit `SET_PHASE`:

```typescript
// WRONG: Client dispatches reducer -> endIf cascades -> onBegin may crash
dispatch("SET_REMOTE_MODE", {})

// RIGHT: Client dispatches thunk -> thunk explicitly sets phase
dispatchThunk("ACTIVATE_REMOTE_MODE", {})

// The thunk implementation:
export function createActivateRemoteModeThunk(services: GameServices) {
    return async (ctx: ThunkContext) => {
        ctx.dispatch("SET_REMOTE_MODE", {})
        const state = ctx.getState()
        ctx.dispatch("SET_PHASE", { phase: state.isFtue ? "playing" : "categorySelect" })
    }
}
```

### Thunk Context

Thunks receive a rich context from VGF:

```typescript
interface ThunkContext {
    getState: () => YourGameState
    getSessionId: () => string
    getClientId: () => string
    dispatch: (reducerName: string, ...args: unknown[]) => void
    dispatchThunk: (thunkName: string, ...args: unknown[]) => Promise<void>
    getMembers: () => Record<string, { clientType: string; connectionState: string }>
    scheduler: {
        upsertTimeout: (config: TimeoutConfig) => Promise<void>
        cancel: (name: string) => Promise<void>
        pause: (name: string) => Promise<void>
        resume: (name: string) => Promise<void>
    }
    sessionManager: { kickClient: (clientId: string) => void }
    logger: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void }
}
```

### Lifecycle Hooks

```typescript
interface LifecycleContext {
    connection: {
        metadata: {
            connectionId: string
            sessionId: string
            userId: string
            clientType: "CONTROLLER" | "DISPLAY" | "ORCHESTRATOR"
        }
        emit: (event: string, ...args: unknown[]) => void
        dispose: (reason: string) => void
    }
    getSessionId: () => string
    getState: () => YourGameState
    dispatch: (reducerName: string, ...args: unknown[]) => void
    dispatchThunk: (thunkName: string, ...args: unknown[]) => Promise<void>
    scheduler: Scheduler
    sessionManager: { kickClient: (clientId: string) => void }
}
```

> **Note:** `inputMode` and `deviceId` are NOT part of VGF's official `ConnectionMetadata` type. They may be present at runtime through Socket.IO handshake query params but are not typed by VGF.

---

## 5. TV Remote Input Handling

### Key Mapping Table

| TV Remote Button | SDK Key Name | DOM `event.key` (keyboard fallback) | Fire TV keyCode |
|------------------|-------------|--------------------------------------|-----------------|
| D-pad Up | `ArrowUp` | `ArrowUp` | 38 |
| D-pad Down | `ArrowDown` | `ArrowDown` | 40 |
| D-pad Left | `ArrowLeft` | `ArrowLeft` | 37 |
| D-pad Right | `ArrowRight` | `ArrowRight` | 39 |
| OK / Select | `Enter` | `Enter` | 13 |
| Back | `Back` | `Backspace` or `Escape` | 4 |
| Mic / Voice | `Mic` | `m` (web fallback) | 322 (FOS6: 84, FOS7: 319) |
| Channel Down | `ChannelDown` | N/A | 174 |
| Channel Up | `ChannelUp` | N/A | 175 |
| Media Fast Forward | `MediaFastForward` | N/A | 228 |
| Media Play/Pause | `MediaPlayPause` | N/A | 179 |
| Media Rewind | `MediaRewind` | N/A | 227 |
| Menu | `Menu` | N/A | 82 |

> **Note:** `ChannelDown`, `ChannelUp`, `MediaFastForward`, `MediaPlayPause`, `MediaRewind`, and `Menu` are rarely needed for games.

### SDK Hooks vs Local DOM Hooks

| Approach | When to Use | Dependency |
|----------|-------------|------------|
| `useKeyDown` from `@volley/platform-sdk/react` | Production TV apps with `PlatformProvider` | Requires PlatformContext |
| Local `useKeyDown` via DOM events | Dev mode, web, or when Platform SDK is conditionally loaded | No dependency |

**On real TV hardware**, the SDK's input handler maps remote buttons to standard DOM key names. DOM events work identically. This is why local hooks are a valid replacement.

### Local Key Handler Hook (Recommended)

This hook works everywhere: dev browser, Fire TV, Samsung, LG.

```typescript
// hooks/useKeyHandler.ts
import { useEffect, useCallback, useRef } from "react"

const KEY_MAP: Record<string, string[]> = {
    ArrowUp: ["ArrowUp"],
    ArrowDown: ["ArrowDown"],
    ArrowLeft: ["ArrowLeft"],
    ArrowRight: ["ArrowRight"],
    Enter: ["Enter"],
    Back: ["Backspace", "Escape"],
    Mic: ["m"],
}

export function useKeyDown(key: string, callback: () => void): void {
    const callbackRef = useRef(callback)
    callbackRef.current = callback

    const handler = useCallback(
        (event: KeyboardEvent) => {
            const mappedKeys = KEY_MAP[key] ?? [key]
            if (mappedKeys.includes(event.key)) {
                callbackRef.current()
            }
        },
        [key],
    )

    useEffect(() => {
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [handler])
}

export function useKeyUp(key: string, callback: () => void): void {
    const callbackRef = useRef(callback)
    callbackRef.current = callback

    const handler = useCallback(
        (event: KeyboardEvent) => {
            const mappedKeys = KEY_MAP[key] ?? [key]
            if (mappedKeys.includes(event.key)) {
                callbackRef.current()
            }
        },
        [key],
    )

    useEffect(() => {
        window.addEventListener("keyup", handler)
        return () => window.removeEventListener("keyup", handler)
    }, [handler])
}
```

### Back Button Handling

Jeopardy's pattern: a global hook that handles Back contextually.

```typescript
// Using Platform SDK's useKeyDown (production Fire TV)
import { useKeyDown } from "@volley/platform-sdk/react"

export const useBackButtonListener = () => {
    const currentScene = useCurrentScene()
    const { showExitModal, hideModal } = useModalController("EXIT")

    useKeyDown("Back", () => {
        if (hasActiveModal()) {
            hideModal()
        } else if (currentScene === "MAIN_MENU") {
            exitApp()  // On main menu, back = exit
        } else {
            showExitModal()  // Everywhere else, confirm exit
        }
    })
}
```

Using the local hook instead (for MaybePlatformProvider pattern):

```typescript
import { useKeyDown } from "./hooks/useKeyHandler"

// Same logic, different import -- works without PlatformProvider
useKeyDown("Back", handleBack)
```

---

## 6. D-pad Navigation Patterns

### Focus Management Strategy

**Use DOM `.focus()` + state tracking. Do NOT use spatial navigation libraries.**

The pattern:
1. Track `focusIndex` in React state
2. Keep an array of `ref`s to focusable elements
3. On D-pad press, update `focusIndex`
4. On `focusIndex` change, call `element.focus()`
5. Style focused elements with a visible border

### The useDPadNavigation Hook

```typescript
// hooks/useDPadNavigation.ts
import { useState, useRef, useCallback, useEffect } from "react"
import { useKeyDown } from "./useKeyHandler"

interface UseDPadNavigationOptions {
    itemCount: number
    gridColumns: number     // 1 for vertical list, N for grid
    enabled: boolean        // false when this component shouldn't capture keys
    onSelect: (index: number) => void
}

interface UseDPadNavigationResult {
    focusIndex: number
    setFocusIndex: (index: number) => void
    itemRefs: React.MutableRefObject<(HTMLElement | null)[]>
}

export function useDPadNavigation({
    itemCount, gridColumns, enabled, onSelect,
}: UseDPadNavigationOptions): UseDPadNavigationResult {
    const [focusIndex, setFocusIndex] = useState(0)
    const itemRefs = useRef<(HTMLElement | null)[]>([])

    // Keep refs array in sync
    useEffect(() => {
        itemRefs.current = itemRefs.current.slice(0, itemCount)
    }, [itemCount])

    // Focus the DOM element when focusIndex changes
    useEffect(() => {
        if (enabled) {
            itemRefs.current[focusIndex]?.focus()
        }
    }, [focusIndex, enabled])

    const handleUp = useCallback(() => {
        if (!enabled) return
        setFocusIndex((prev) => {
            const next = prev - gridColumns
            return next >= 0 ? next : prev  // Don't wrap
        })
    }, [enabled, gridColumns])

    const handleDown = useCallback(() => {
        if (!enabled) return
        setFocusIndex((prev) => {
            const next = prev + gridColumns
            return next < itemCount ? next : prev
        })
    }, [enabled, gridColumns, itemCount])

    const handleLeft = useCallback(() => {
        if (!enabled) return
        setFocusIndex((prev) => (prev > 0 ? prev - 1 : prev))
    }, [enabled])

    const handleRight = useCallback(() => {
        if (!enabled) return
        setFocusIndex((prev) => (prev < itemCount - 1 ? prev + 1 : prev))
    }, [enabled, itemCount])

    const handleEnter = useCallback(() => {
        if (!enabled) return
        onSelect(focusIndex)
    }, [enabled, onSelect, focusIndex])

    useKeyDown("ArrowUp", handleUp)
    useKeyDown("ArrowDown", handleDown)
    useKeyDown("ArrowLeft", handleLeft)
    useKeyDown("ArrowRight", handleRight)
    useKeyDown("Enter", handleEnter)

    return { focusIndex, setFocusIndex, itemRefs }
}
```

### Grid Layout (5x2 Category Grid)

```typescript
export function CategorySelect({ onSelect }: { onSelect: (category: string) => void }) {
    const { isRemoteMode } = useInputMode()
    const categories = ["Animals", "Food", "Sports", "Movies", "Music",
                        "Nature", "Science", "History", "Travel", "Games"]

    const { focusIndex, itemRefs } = useDPadNavigation({
        itemCount: categories.length,
        gridColumns: 5,          // 5 columns, 2 rows
        enabled: isRemoteMode,   // Only capture keys in remote mode
        onSelect: (index) => onSelect(categories[index]),
    })

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 16,
        }}>
            {categories.map((category, index) => {
                const isFocused = isRemoteMode && focusIndex === index
                return (
                    <button
                        key={category}
                        ref={(el) => { itemRefs.current[index] = el }}
                        tabIndex={isFocused ? 0 : -1}
                        onClick={() => onSelect(category)}
                        style={{
                            border: isFocused ? "3px solid #fbbf24" : "none",
                            borderRadius: 12,
                            background: isFocused
                                ? "rgba(251,191,36,0.2)"
                                : "rgba(255,255,255,0.05)",
                            color: "white",
                            outline: "none",
                        }}
                    >
                        {category}
                    </button>
                )
            })}
        </div>
    )
}
```

### Horizontal Button Row (2-button layout)

```typescript
// DifficultySelect or GameOver with 2 buttons
const { focusIndex, itemRefs } = useDPadNavigation({
    itemCount: 2,
    gridColumns: 2,      // Horizontal: left/right navigation
    enabled: isRemoteMode,
    onSelect: (index) => {
        if (index === 0) handlePlayAgain()
        if (index === 1) handleChangeCategory()
    },
})
```

### Focus Indicator Styling

```typescript
const focusStyle = (isFocused: boolean) => ({
    border: isFocused ? "3px solid #fbbf24" : "2px solid rgba(255,255,255,0.3)",
    borderRadius: 8,
    background: isFocused ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.1)",
    outline: "none",
    transition: "all 0.2s",
})
```

---

## 7. Voice Input on TV

### Push-to-Talk with Mic Key

TV remotes have a dedicated mic button. Hold it to record, release to stop.

### Two Approaches

| Approach | When to Use | How |
|----------|-------------|-----|
| Platform SDK `useMicrophone()` | Production on real TV | Uses TV hardware mic, platform-managed |
| Browser AudioContext + Deepgram | Dev mode, web testing | getUserMedia + WebSocket to Deepgram |

### Deepgram API Key

Voice input requires a [Deepgram](https://deepgram.com/) API key for speech-to-text. Set it in your `.env` file at the monorepo root:

```bash
# .env (monorepo root -- do NOT commit this file)
DEEPGRAM_API_KEY=your-deepgram-api-key-here
```

The dev server reads this key and:
1. Runs a WebSocket proxy on port 8081 that forwards audio to Deepgram with auth headers
2. Exposes a `/api/deepgram-token` endpoint for temporary token generation

> **For AI agents:** If voice input isn't working in dev mode, check that `DEEPGRAM_API_KEY` is set in `.env` and the server logs show "Deepgram API key found". The proxy on port 8081 must also be running (check for EADDRINUSE errors).

### useRemoteVoiceInput Hook (Dev/Web)

> **Note:** This hook uses `createScriptProcessor()` which is deprecated by the Web Audio API in favour of `AudioWorklet`. It still works in all current browsers and TV WebViews, but may need migration in the future. For now, it's the simplest approach and is what the reference implementation uses.

```typescript
// hooks/useRemoteVoiceInput.ts
import { useCallback, useRef } from "react"
import { useKeyDown, useKeyUp } from "./useKeyHandler"
import { useDispatchThunk } from "./useVGFState"
import { useInputMode } from "../providers/InputModeProvider"

export function useRemoteVoiceInput() {
    const { isRemoteMode } = useInputMode()
    const dispatchThunk = useDispatchThunk()
    const isRecordingRef = useRef(false)

    const cleanup = useCallback(() => {
        // Disconnect audio nodes, close streams, close WebSocket
        // Dispatch STOP_RECORDING thunk
        isRecordingRef.current = false
    }, [dispatchThunk])

    const handleMicDown = useCallback(async () => {
        if (!isRemoteMode || isRecordingRef.current) return
        isRecordingRef.current = true

        // 1. Create AudioContext
        const audioCtx = new AudioContext()
        await audioCtx.resume()

        // 2. Get microphone stream
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
        })

        // 3. Connect to Deepgram via dev proxy (port 8081)
        //    The proxy handles auth headers -- you cannot set headers on WebSocket connections
        const wsUrl = import.meta.env.DEV
            ? "ws://localhost:8081"  // Dev proxy (handles Deepgram auth)
            : `wss://api.deepgram.com/v1/listen?model=nova-2&encoding=linear16&sample_rate=${audioCtx.sampleRate}&channels=1&interim_results=true&endpointing=300&smart_format=false`

        const ws = new WebSocket(wsUrl)

        // 4. On messages, dispatch transcriptions
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            const transcript = data.channel?.alternatives?.[0]?.transcript
            if (transcript) {
                dispatchThunk("PROCESS_TRANSCRIPTION", {
                    text: transcript,
                    confidence: data.channel.alternatives[0].confidence,
                    isFinal: data.is_final,
                })
            }
        }

        // 5. Stream PCM audio via ScriptProcessor (deprecated but functional)
        const source = audioCtx.createMediaStreamSource(stream)
        const processor = audioCtx.createScriptProcessor(4096, 1, 1)
        processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return
            const float32 = e.inputBuffer.getChannelData(0)
            const int16 = new Int16Array(float32.length)
            for (let i = 0; i < float32.length; i++) {
                const s = Math.max(-1, Math.min(1, float32[i]))
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
            }
            ws.send(int16.buffer)
        }

        source.connect(processor)
        processor.connect(audioCtx.destination)

        dispatchThunk("START_RECORDING", {})
    }, [isRemoteMode, dispatchThunk, cleanup])

    const handleMicUp = useCallback(() => {
        if (!isRemoteMode || !isRecordingRef.current) return
        cleanup()
    }, [isRemoteMode, cleanup])

    // Mic key = "m" on keyboard, dedicated button on TV remote
    useKeyDown("Mic", handleMicDown)
    useKeyUp("Mic", handleMicUp)
}
```

### Audio Format Requirements

- **Encoding**: linear16 (PCM 16-bit signed integers)
- **Sample rate**: Match AudioContext.sampleRate (usually 44100 or 48000)
- **Channels**: 1 (mono)
- Always specify `encoding` and `sample_rate` in the Deepgram URL -- auto-detect does not work for WebSocket streams

---

## 8. On-Screen Keyboard

For text input on TV (no phone controller), display a QWERTY keyboard navigable with D-pad.

### Key Features

- QWERTY layout in rows (10-9-9 grid)
- `useDPadNavigation` for key selection
- `focus-trap-react` to contain focus within the keyboard modal
- Timer pause on open, resume on close
- Back key closes without submitting

### Implementation

```typescript
import FocusTrap from "focus-trap-react"
import { useDPadNavigation } from "../../hooks/useDPadNavigation"
import { useKeyDown } from "../../hooks/useKeyHandler"
import { useDispatch, useDispatchThunk } from "../../hooks/useVGFState"

const QWERTY_ROWS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M", "\u232B", "\u2713"],  // Backspace, Check
]
const ALL_KEYS = QWERTY_ROWS.flat()
const GRID_COLUMNS = QWERTY_ROWS[0].length  // 10

export function OnScreenKeyboard({ onClose }: { onClose: () => void }) {
    const [input, setInput] = useState("")
    const dispatch = useDispatch()
    const dispatchThunk = useDispatchThunk()

    // Pause game timer while keyboard is open
    useEffect(() => {
        dispatch("PAUSE_TIMER", {})
        return () => { dispatch("RESUME_TIMER", {}) }
    }, [dispatch])

    const handleSelect = useCallback((index: number) => {
        const key = ALL_KEYS[index]
        if (key === "\u232B") {
            setInput((prev) => prev.slice(0, -1))
        } else if (key === "\u2713") {
            if (input.trim()) {
                dispatchThunk("PROCESS_TRANSCRIPTION", {
                    text: input.trim(), confidence: 1, isFinal: true,
                })
            }
            onClose()
        } else {
            setInput((prev) => prev + key)
        }
    }, [input, dispatchThunk, onClose])

    const { focusIndex, itemRefs } = useDPadNavigation({
        itemCount: ALL_KEYS.length,
        gridColumns: GRID_COLUMNS,
        enabled: true,
        onSelect: handleSelect,
    })

    // Back key closes keyboard
    useKeyDown("Back", onClose)

    return (
        <FocusTrap>
            <div style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.85)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "flex-end",
                padding: 40, zIndex: 1000,
            }}>
                {/* Input display */}
                <div style={{ fontSize: 48, color: "white", marginBottom: 32 }}>
                    {input || "\u00A0"}
                </div>

                {/* Keyboard rows */}
                {QWERTY_ROWS.map((row, rowIndex) => (
                    <div key={rowIndex} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        {row.map((key, colIndex) => {
                            const flatIndex = QWERTY_ROWS.slice(0, rowIndex)
                                .reduce((sum, r) => sum + r.length, 0) + colIndex
                            const isFocused = focusIndex === flatIndex
                            return (
                                <button
                                    key={key}
                                    ref={(el) => { itemRefs.current[flatIndex] = el }}
                                    tabIndex={isFocused ? 0 : -1}
                                    style={{
                                        width: 64, height: 64, fontSize: 24,
                                        border: isFocused
                                            ? "3px solid #fbbf24"
                                            : "2px solid rgba(255,255,255,0.3)",
                                        borderRadius: 8,
                                        background: isFocused
                                            ? "rgba(251,191,36,0.2)"
                                            : "rgba(255,255,255,0.1)",
                                        color: "white", outline: "none",
                                    }}
                                >
                                    {key}
                                </button>
                            )
                        })}
                    </div>
                ))}
            </div>
        </FocusTrap>
    )
}
```

### Dependencies

```bash
pnpm add focus-trap-react
```

---

## 9. Remote Mode vs Controller Mode

### Two Input Modes

| Mode | Input Source | How Player Joins |
|------|-------------|------------------|
| **Controller Mode** | Phone (separate device) | Scan QR code, open URL in mobile browser |
| **Remote Mode** | TV remote (D-pad + mic button) | Press remote button on TV, no phone needed |

### InputModeProvider Pattern

Detect the input mode early (before VGF connects) and provide it to all children:

```typescript
// providers/InputModeProvider.tsx
import { createContext, useContext, useMemo, type ReactNode } from "react"
import { detectPlatform, isTV as isTVPlatform, type TVPlatform } from "../utils/detectPlatform"

interface InputModeContextValue {
    isRemoteMode: boolean
    isTV: boolean
    platform: TVPlatform
}

const InputModeContext = createContext<InputModeContextValue>({
    isRemoteMode: false, isTV: false, platform: "WEB",
})

export function useInputMode() {
    return useContext(InputModeContext)
}

function getInputModeOverride(): boolean | null {
    const params = new URLSearchParams(window.location.search)
    const override = params.get("inputMode")
    if (override === "remote") return true
    if (override === "controller") return false
    return null
}

export function InputModeProvider({ children }: { children: ReactNode }) {
    const value = useMemo(() => {
        const platform = detectPlatform()
        const tvDetected = isTVPlatform(platform)
        const override = getInputModeOverride()
        const isRemoteMode = override ?? tvDetected
        return { isRemoteMode, isTV: tvDetected, platform }
    }, [])

    return (
        <InputModeContext.Provider value={value}>
            {children}
        </InputModeContext.Provider>
    )
}
```

### Provider Order (Critical)

```typescript
export function App() {
    return (
        <MaybePlatformProvider>
            <GameErrorBoundary>
                <InputModeProvider>          {/* Must be ABOVE VGFProvider */}
                    <VGFDisplayProvider>      {/* Reads isRemoteMode */}
                        <SceneRouter />
                    </VGFDisplayProvider>
                </InputModeProvider>
            </GameErrorBoundary>
        </MaybePlatformProvider>
    )
}
```

`InputModeProvider` must be above `VGFDisplayProvider` so the input mode is known before the Socket.IO connection is established. `GameErrorBoundary` must be above both to catch crashes from either provider.

### ACTIVATE_REMOTE_MODE Thunk Pattern

**Remote mode activation MUST be a thunk, not a reducer.**

Why: If you dispatch a reducer that sets `remoteMode = true`, VGF's `endIf` cascade may trigger with an incomplete context, crashing `onBegin` (see Section 4, endIf rules).

```typescript
// Server-side thunk
export function createActivateRemoteModeThunk(services: GameServices) {
    return async (ctx: ThunkContext) => {
        const state = ctx.getState()
        if (state.remoteMode) return  // Already active

        // Initialise server-side state if needed
        const sessionId = ctx.getSessionId()
        if (!services.serverState.get(sessionId)) {
            await initializeGameSession(ctx, services, `display-${sessionId}`)
        }

        ctx.dispatch("SET_REMOTE_MODE", {})

        // Force phase transition explicitly (endIf won't cascade reliably)
        const updatedState = ctx.getState()
        const targetPhase = updatedState.isFtue ? "playing" : "categorySelect"
        ctx.dispatch("SET_PHASE", { phase: targetPhase })
    }
}
```

### Server-Side Session Initialisation

When a display connects in remote mode, server-side state must be initialised (normally the controller connection triggers this):

```typescript
export async function initializeGameSession(
    ctx: SessionInitContext,
    services: GameServices,
    userId: string,
): Promise<void> {
    let userRound = 0
    try {
        const result = await services.database.query(
            "SELECT round_count FROM user_progress WHERE user_id = $1",
            [userId],
        )
        userRound = result.rows[0]?.round_count ?? 0
    } catch (err) {
        services.datadog.captureError(err)
    }

    services.serverState.set(ctx.getSessionId(), {
        questions: [],
        currentAnswer: "",
        currentHomophones: [],
        questionHistory: [],
        scoredCurrentQuestion: false,
        userRound,
        allTranscriptions: [],
        userId,
        deepgramTokenExpiry: 0,
    })

    const isFtue = userRound < GAME_CONSTANTS.FTUE_DEFAULT_ROUNDS
    ctx.dispatch("SET_FTUE", { isFtue })
}
```

### PairingOverlay Condition

When showing the QR code pairing overlay (controller mode), make sure to check `!state.remoteMode`:

```typescript
// Show pairing only when NOT in remote mode and no controller connected
if (!state.remoteMode && !state.controllerConnected) {
    return <PairingOverlay />
}
```

---

## 10. Dev Mode Testing

### URL Parameters for Testing

| Parameter | Values | Effect |
|-----------|--------|--------|
| `?inputMode=remote` | `remote`, `controller` | Override input mode detection |
| `?volley_platform=FIRE_TV` | `FIRE_TV`, `SAMSUNG_TV`, `LG_TV` | Simulate TV platform detection |
| `?sessionId=dev-test` | Any string | VGF session to connect to |
| `?userId=display-dev` | Any string | Client user ID |

### Dev URLs

```
Display:    http://localhost:3000/?sessionId=dev-test&userId=display-dev
Controller: http://localhost:5173/?sessionId=dev-test&volley_account=controller-dev

# Remote mode testing (no phone needed):
Display:    http://localhost:3000/?sessionId=dev-test&userId=display-dev&inputMode=remote

# Simulating Fire TV in browser:
Display:    http://localhost:3000/?sessionId=dev-test&userId=display-dev&inputMode=remote&volley_platform=FIRE_TV
```

### Dev Server Example

The dev server (`apps/server/src/dev.ts`) is critical — it boots a VGF server with in-memory storage and stub services. Here's the essential structure:

```typescript
// apps/server/src/dev.ts
import express from "express"
import { createServer } from "node:http"
import { WebSocketServer, WebSocket as ServerWebSocket } from "ws"
import {
    VGFServer,
    SocketIOTransport,
    MemoryStorage,
} from "@volley/vgf/server"
import { createGameRuleset } from "./ruleset"
import type { GameServices } from "./services"

const app = express()
app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*")
    next()
})
const httpServer = createServer(app)

// --- Deepgram WebSocket Proxy (port 8081) ---
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
const DG_PROXY_PORT = 8081

if (DEEPGRAM_API_KEY) {
    const dgProxy = new WebSocketServer({ port: DG_PROXY_PORT })
    dgProxy.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
            console.warn(`Deepgram proxy port ${DG_PROXY_PORT} in use (tsx watch restart)`)
        }
    })
    dgProxy.on("connection", (clientWs) => {
        // Wait for config message, then connect to Deepgram with auth headers
        clientWs.once("message", (data) => {
            let encoding = "opus"
            let sampleRate = 48000
            try {
                const config = JSON.parse(data.toString())
                if (config.type === "config") {
                    encoding = config.encoding ?? encoding
                    sampleRate = config.sampleRate ?? sampleRate
                }
            } catch { /* not JSON */ }

            const dgUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&encoding=${encoding}&sample_rate=${sampleRate}&channels=1&interim_results=true&endpointing=300&smart_format=false`
            const dgWs = new ServerWebSocket(dgUrl, {
                headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
            })

            dgWs.on("open", () => {
                clientWs.send(JSON.stringify({ type: "proxy_ready" }))
            })
            dgWs.on("message", (msg) => {
                if (clientWs.readyState === ServerWebSocket.OPEN) {
                    clientWs.send(msg.toString())
                }
            })

            // Forward audio data from client to Deepgram
            clientWs.on("message", (audioData) => {
                if (dgWs.readyState === ServerWebSocket.OPEN) {
                    dgWs.send(audioData)
                }
            })

            clientWs.on("close", () => {
                if (dgWs.readyState === ServerWebSocket.OPEN) {
                    dgWs.send(JSON.stringify({ type: "CloseStream" }))
                    dgWs.close()
                }
            })
        })
    })
}

// --- VGF Server ---
const storage = new MemoryStorage()
const transport = new SocketIOTransport({
    httpServer,
    storage,
    logger: console,
    socketOptions: {
        cors: { origin: true, methods: ["GET", "POST"], credentials: true },
    },
})

const services: GameServices = {
    deepgram: { createTemporaryToken: async () => ({ key: "dev-stub-token" }) },
    database: { query: async () => ({ rows: [] }) },
    amplitude: { track: () => {}, identify: () => {} },
    datadog: { captureError: (err) => console.error("[datadog-dev]", err) },
    waterfall: { match: () => ({ foundMatch: false }) },
    endSession: () => {},
    serverState: new Map(),
    devMode: true,
}

const game = createGameRuleset(services)
const PORT = 8080

const server = new VGFServer({
    port: PORT,
    app,
    httpServer,
    transport,
    storage,
    logger: console,
    game,
})

server.start()

// Pre-create a dev session so clients can connect with ?sessionId=dev-test
const DEV_SESSION_ID = "dev-test"
if (!storage.doesSessionExist(DEV_SESSION_ID)) {
    storage.createSession({
        sessionId: DEV_SESSION_ID,
        members: {},
        state: game.setup(),
    })
    console.log(`Dev session "${DEV_SESSION_ID}" pre-created`)
}

console.log(`VGF server: http://localhost:${PORT}`)
if (DEEPGRAM_API_KEY) console.log(`Deepgram proxy: ws://localhost:${DG_PROXY_PORT}`)
```

### Dev Session Lifecycle

1. `dev.ts` pre-creates a `dev-test` session on startup using `storage.createSession()`
2. VGF requires sessions to exist before clients can connect
3. When `tsx watch` restarts, MemoryStorage is wiped but the session is re-created automatically
4. **Gotcha**: Closing a browser tab triggers a disconnect timeout (15-30s) that calls `endSession()`, deleting the session. If you open a new tab before the timeout fires, VGF rejects the connection. Restart the server between test rounds.

### Port Configuration

| Port | App | Config |
|------|-----|--------|
| 3000 | Display | `apps/display/vite.config.ts` |
| 5173 | Controller | `apps/controller/vite.config.ts` |
| 8080 | VGF Server | `apps/server/src/dev.ts` |
| 8081 | Deepgram Proxy | `apps/server/src/dev.ts` |

**Both Vite configs use `strictPort: true`** -- if a port is in use, the app errors instead of silently picking another port. This prevents URL mismatches.

### tsx watch Restart Behaviour

- `tsx watch` restarts the server on file changes
- Port 8081 (Deepgram proxy) may not release fast enough, causing `EADDRINUSE`
- The Deepgram proxy dies silently while VGF keeps running on 8080
- **This is the #1 cause of "transcription not working" in dev** -- always check server logs

---

## 11. Vite Build Configuration for TV

### Build Target

Fire TV's Silk browser is based on Chromium 68+. Samsung Tizen and LG webOS use similarly old Chromium versions.

> **Note:** The polyfill configuration below comes from the Jeopardy reference implementation. The emoji-multiplatform display app does NOT currently use the legacy plugin -- apply this config when deploying to Fire TV.

```typescript
// vite.config.ts
import legacy from "@vitejs/plugin-legacy"

export default defineConfig({
    build: {
        target: "chrome68",
        sourcemap: true,
        commonjsOptions: {
            transformMixedEsModules: true,
        },
    },
    optimizeDeps: {
        esbuildOptions: {
            target: "chrome68",
        },
    },
    plugins: [
        legacy({
            targets: ["chrome >= 68"],
            renderLegacyChunks: false,  // Don't generate SystemJS chunks
            modernPolyfills: [
                "es.global-this",
                "es.array.flat",
                "es.array.flat-map",
                "es.object.from-entries",
                "es.promise.all-settled",
                "es.string.match-all",
                "es.string.replace-all",
                "es.array.at",
                "web.queue-microtask",
            ],
        }),
    ],
})
```

### Multiple Entry Points

If your app has both a display and controller in the same build:

```typescript
build: {
    rollupOptions: {
        input: {
            main: path.resolve(__dirname, "index.html"),
            controller: path.resolve(__dirname, "controller.html"),
        },
    },
},
```

### Key Vite Config Options

```typescript
export default defineConfig({
    base: "./",  // Relative paths for TV deployment
    server: {
        port: 3000,
        strictPort: true,  // Fail if port in use
    },
})
```

---

## 12. TV Deployment

### Overview

| Platform | Package Format | CLI Tool | Connection |
|----------|---------------|----------|------------|
| **Fire TV** | `.apk` (Android) | `adb` | Network (ADB over TCP) |
| **Samsung Tizen** | `.wgt` (Web App) | `tizen` / `sdb` | Network (SDB protocol) |
| **LG webOS** | `.ipk` (Web App) | `ares-*` | Network (ares-based) |

All three platforms support network-based deployment (no USB tethering required) and Chrome DevTools debugging.

### Fire TV Deployment

Fire TV apps are deployed via ADB (Android Debug Bridge).

**Prerequisites:**
- ADB installed (`brew install android-platform-tools` or from [Android SDK](https://developer.android.com/tools/releases/platform-tools))
- Fire TV Developer Mode enabled (Settings > My Fire TV > Developer Options > ADB Debugging)
- Fire TV IP address (Settings > My Fire TV > About > Network)

**Steps:**
```bash
# 1. Connect to Fire TV
adb connect <fire-tv-ip>:5555

# 2. Build your app
pnpm build

# 3. Install the APK (if using Capacitor/native wrapper)
adb install dist/app-debug.apk

# 4. Grant microphone permission
adb shell pm grant com.yourpackage android.permission.RECORD_AUDIO

# 5. Launch
adb shell am start -n com.yourpackage/.MainActivity
```

**For web-based Fire TV apps** (loaded via the TV shell):
```bash
# Build the display app
cd apps/display && pnpm build

# The built files in dist/ are served by the VGF server in production
# or deployed to a CDN that the TV shell loads
```

**Debugging:**
- Chrome DevTools: `chrome://inspect/#devices` in your desktop Chrome
- ADB port forwarding: `adb forward tcp:9222 localabstract:webview_devtools_remote`

### Samsung Tizen Deployment

Samsung Tizen apps are packaged as `.wgt` files using the Tizen CLI.

**Prerequisites:**
- [Tizen Studio 6.x](https://developer.tizen.org/development/tizen-studio/download) with Tizen CLI
- Samsung TV in Developer Mode (Apps > press 1-2-3-4-5 on remote > toggle Developer Mode > set IP to your PC)
- Signing certificate created in Tizen Certificate Manager

**Steps:**
```bash
# 1. Connect to TV via SDB
sdb connect <tv-ip>:26101

# 2. Build your web app
cd apps/display && pnpm build

# 3. Package as .wgt
tizen package -t wgt -s <certificate-profile> -- ./dist

# 4. Install on TV
tizen install -t <device-name> --name YourGame.wgt -- ./dist/.buildResult

# 5. Launch
tizen run -t <device-name> -p <package-id>
```

**Debugging:**
- SDB port forwarding: `sdb forward tcp:9229 tcp:<debug-port>`
- Open `chrome://inspect` in desktop Chrome

### LG webOS Deployment

LG webOS apps are packaged as `.ipk` files using LG's ares CLI tools.

**Prerequisites:**
- [webOS SDK](https://webostv.developer.lge.com/develop/tools/cli-installation) with `ares-*` CLI tools
- LG TV with Developer Mode app installed (from LG Content Store)
- Device registered via `ares-setup-device`

**Steps:**
```bash
# 1. Set up device connection
ares-setup-device

# 2. Build your web app
cd apps/display && pnpm build

# 3. Package as .ipk
ares-package ./dist -o ./output

# 4. Install on TV
ares-install --device <device-name> ./output/com.yourpackage_1.0.0_all.ipk

# 5. Launch
ares-launch --device <device-name> com.yourpackage
```

**Debugging:**
- `ares-inspect --device <device-name> --app com.yourpackage` (opens Chrome inspector automatically)

> **For AI agents:** The TV shell (Fire TV, Tizen, webOS) is a separate application maintained by the platform team. Your game's display app is loaded inside the shell as a web view. The shell provides `volley_hub_session_id`, `volley_platform`, and other query params. You don't build the shell -- you build the web app that runs inside it.

---

## 13. Common Pitfalls

A consolidated list of every gotcha documented in the learnings system.

| # | Pitfall | One-Line Summary |
|---|---------|------------------|
| 1 | **socketOptions.query clobbers VGF query** | Never pass `query` inside `socketOptions` -- it replaces `sessionId`, `userId`, `clientType`. |
| 2 | **PlatformProvider crashes without hub session ID** | `useHubSessionId()` throws at render time if `volley_hub_session_id` is missing. `PlatformProvider` may also fail during init (iframe, network). Use `MaybePlatformProvider`. |
| 3 | **endIf doesn't cascade from onConnect** | Phase transitions in lifecycle hooks must be explicit via `dispatch("SET_PHASE", ...)`. |
| 4 | **endIf cascade crashes onBegin** | Cascaded `onBegin` gets a different context shape -- `getSessionId()` may not exist. Use thunks. |
| 5 | **VGF transport defaults to websocket-only** | Always override with `socketOptions.transports: ["polling", "websocket"]`. |
| 6 | **VGF state initialises as `{}`** | `useStateSync()` returns empty object before first sync. Guard with `"phase" in state`. |
| 7 | **VGF sessions must exist before connection** | Create via `POST /api/session` or `storage.createSession()` before clients connect. |
| 8 | **VGF scheduler is no-op in dev mode** | `MemoryStorage` produces `NoOpScheduler`. Use `DevScheduler` with `setTimeout` fallback. |
| 9 | **Reducers must be pure** | No `Date.now()` in reducers. Pass timestamps from thunks via action payloads. |
| 10 | **Port 8081 EADDRINUSE on tsx restart** | Deepgram proxy port doesn't release fast enough. Kill the process manually. |
| 11 | **Dev session deleted by disconnect timeout** | Closing tabs triggers session cleanup. Restart server between test rounds. |
| 12 | **Error boundaries must be above providers** | Place `GameErrorBoundary` above `VGFProvider` and `PlatformProvider`. |
| 13 | **Stage "local" needs `platformApiUrl`** | Requires `platformApiUrl` for local development. `platformAuthApiUrl` does not exist in the Zod schema -- only `platformApiUrl` is validated. |
| 14 | **Deepgram auto-detect doesn't work** | Always specify `encoding=linear16&sample_rate=...` in the WebSocket URL. |
| 15 | **onBegin must return game state** | VGF's `PhaseRunner` does `newState = await phase.onBegin(ctx)`. Return type is `GameState | Promise<GameState>`. The emoji codebase returns void via type casting (`ctx: unknown`), which works but doesn't match the official type. |
| 16 | **`require()` in MaybePlatformProvider** | Do NOT refactor the `require("@volley/platform-sdk/react")` to `import()`. The synchronous conditional load is intentional and Vite handles it correctly. |
| 17 | **NPM auth required for @volley packages** | If `pnpm add @volley/vgf` fails with 404/403, run `npm login` first. Packages are on the public npm registry under the Volley org scope. |
| 18 | **Deepgram API key not set** | If voice input doesn't work in dev, check `.env` for `DEEPGRAM_API_KEY` and check server logs for the Deepgram proxy startup message. |

---

## 14. Complete Code Examples

### Full App.tsx (Display)

```typescript
// apps/display/src/App.tsx
import type { ReactNode } from "react"
import { GameErrorBoundary } from "./components/ErrorBoundary"
import { SceneRouter } from "./components/SceneRouter"
import { InputModeProvider } from "./providers/InputModeProvider"
import { VGFDisplayProvider } from "./providers/VGFDisplayProvider"
import { detectPlatform, isTV } from "./utils/detectPlatform"

/**
 * Wraps children with PlatformProvider only on real TV platforms.
 * The Platform SDK requires volley_hub_session_id in URL params (provided
 * by the TV shell). In dev/web mode this param is absent and the SDK
 * throws during construction. Skip it on web.
 */
function MaybePlatformProvider({ children }: { children: ReactNode }) {
    if (!isTV(detectPlatform())) return <>{children}</>

    // NOTE: require() is intentional -- see Pitfall #16
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PlatformProvider } = require("@volley/platform-sdk/react")
    return (
        <PlatformProvider
            options={{
                gameId: "your-game-id",
                appVersion: "1.0.0",
                stage: "staging",
                screensaverPrevention: { autoStart: true },
            }}
        >
            {children}
        </PlatformProvider>
    )
}

/**
 * DISPLAY app root.
 * Provider order matters:
 *   MaybePlatformProvider -> GameErrorBoundary -> InputModeProvider -> VGFDisplayProvider
 * GameErrorBoundary must wrap providers to catch init crashes.
 * InputModeProvider must be above VGFDisplayProvider so input mode
 * is known before the Socket.IO connection is established.
 */
export function App() {
    return (
        <MaybePlatformProvider>
            <GameErrorBoundary>
                <InputModeProvider>
                    <VGFDisplayProvider>
                        <SceneRouter />
                    </VGFDisplayProvider>
                </InputModeProvider>
            </GameErrorBoundary>
        </MaybePlatformProvider>
    )
}
```

### GameErrorBoundary

```typescript
// components/ErrorBoundary.tsx
import { Component, type ReactNode } from "react"

interface Props { children: ReactNode }
interface State { hasError: boolean }

/**
 * Catches render errors and shows a recovery screen.
 * Prevents white-screen crashes on the TV.
 */
export class GameErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false }

    static getDerivedStateFromError(): State {
        return { hasError: true }
    }

    componentDidCatch(error: Error) {
        console.error("GameErrorBoundary caught:", error)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    width: "100%", height: "100%",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: "#0f172a", color: "white",
                    fontFamily: "sans-serif",
                }}>
                    <h1>Something went wrong</h1>
                    <p>Restarting...</p>
                </div>
            )
        }
        return this.props.children
    }
}
```

### SceneRouter

Routes to the correct scene based on VGF phase:

```typescript
// components/SceneRouter.tsx
import type { ReactElement } from "react"
import { useGameState, useDispatch, useDispatchThunk } from "../hooks/useVGFState"
import { useInputMode } from "../providers/InputModeProvider"

export function SceneRouter() {
    const state = useGameState()
    const dispatch = useDispatch()
    const dispatchThunk = useDispatchThunk()
    const { isRemoteMode } = useInputMode()

    // Guard: VGF state initialises as {}
    if (!("phase" in state)) {
        return <LoadingScreen />
    }

    const { phase, quizSubState } = state

    // Show pairing overlay when waiting for controller (not in remote mode)
    const showPairing = !state.remoteMode
        && !state.controllerConnected
        && phase !== "lobby"
        && phase !== "gameOver"

    // Route to the correct scene based on phase
    let scene: ReactElement | null = null

    switch (phase) {
        case "lobby":
            scene = <Welcome pairingCode={state.pairingCode} />
            break
        case "categorySelect":
            scene = (
                <CategorySelect
                    onSelect={(category) => dispatch("SET_CATEGORY", { category })}
                    remoteMode={state.remoteMode}
                />
            )
            break
        case "difficultySelect":
            scene = (
                <DifficultySelect
                    onSelect={(difficulty) => dispatch("SET_DIFFICULTY", { difficulty })}
                    remoteMode={state.remoteMode}
                />
            )
            break
        case "playing":
            switch (quizSubState) {
                case "SOLUTION":
                    scene = <Solution answerText={state.lastAnswerText} />
                    break
                case "TIMEOUT":
                    scene = <Timeout answerText={state.lastAnswerText} />
                    break
                case "QUIZ_OVER":
                    scene = (
                        <GameOver
                            score={state.score}
                            onPlayAgain={() => dispatchThunk("RESTART_SAME", {})}
                            onChangeCategory={() => dispatchThunk("CHANGE_CATEGORY", {})}
                            remoteMode={state.remoteMode}
                        />
                    )
                    break
                default:
                    scene = (
                        <Quiz
                            emojis={state.currentEmojis}
                            score={state.score}
                            questionIndex={state.questionIndex}
                            totalQuestions={state.totalQuestions}
                            remoteMode={state.remoteMode}
                        />
                    )
            }
            break
        case "gameOver":
            scene = (
                <GameOver
                    score={state.score}
                    onPlayAgain={() => dispatchThunk("RESTART_SAME", {})}
                    onChangeCategory={() => dispatchThunk("CHANGE_CATEGORY", {})}
                    remoteMode={state.remoteMode}
                />
            )
            break
    }

    return (
        <>
            {scene}
            {showPairing && <PairingOverlay pairingCode={state.pairingCode} />}
        </>
    )
}
```

### Full VGFDisplayProvider

```typescript
// providers/VGFDisplayProvider.tsx
import { useMemo, type ReactNode } from "react"
import {
    VGFProvider,
    createSocketIOClientTransport,
    ClientType,
} from "@volley/vgf/client"

function getQueryParam(name: string, fallback: string): string {
    return new URLSearchParams(window.location.search).get(name) ?? fallback
}

export function VGFDisplayProvider({ children }: { children: ReactNode }) {
    const transport = useMemo(() => {
        const url = import.meta.env.DEV
            ? "http://localhost:8080"
            : window.location.origin

        return createSocketIOClientTransport({
            url,
            query: {
                sessionId: getQueryParam("sessionId", ""),
                userId: getQueryParam("userId", import.meta.env.DEV ? "display-dev" : ""),
                clientType: ClientType.Display,
            },
            socketOptions: {
                transports: ["polling", "websocket"],
                upgrade: true,
                // NEVER add query here -- it clobbers the VGF transport query
            },
        })
    }, [])

    return <VGFProvider transport={transport}>{children}</VGFProvider>
}
```

### Full Game Ruleset (Server)

```typescript
// apps/server/src/ruleset.ts
import type { GameRuleset } from "@volley/vgf/server"
import type { YourGameState } from "@your-game/shared"
import { createInitialGameState } from "@your-game/shared"

export function createGameRuleset(services: GameServices): GameRuleset<YourGameState> {
    return {
        setup: createInitialGameState,
        actions: {},                       // Required field, pass empty object
        reducers: {
            SET_CATEGORY: (state, { category }) => ({ ...state, category }),
            SET_DIFFICULTY: (state, { difficulty }) => ({ ...state, difficulty }),
            SET_PHASE: (state, { phase }) => ({ ...state, phase }),
            SET_REMOTE_MODE: (state) => ({ ...state, remoteMode: true }),
            SET_CONTROLLER_CONNECTED: (state, { connected }) => ({
                ...state, controllerConnected: connected,
            }),
            RESET_GAME: (state) => ({
                ...createInitialGameState(),
                remoteMode: state.remoteMode,
            }),
            // ... more reducers
        },
        thunks: {
            ACTIVATE_REMOTE_MODE: async (ctx) => {
                ctx.dispatch("SET_REMOTE_MODE", {})
                const state = ctx.getState()
                ctx.dispatch("SET_PHASE", {
                    phase: state.isFtue ? "playing" : "categorySelect",
                })
            },
            PROCESS_TRANSCRIPTION: async (ctx, payload) => {
                // Match answer, update score, advance question
            },
            // ... more thunks
        },
        phases: {
            lobby: {
                actions: {}, reducers: {}, thunks: {},
                endIf: (ctx) => ctx.session.state.controllerConnected,
                next: "categorySelect",
            },
            // ... more phases
        },
        onConnect: async (ctx) => {
            const { clientType } = ctx.connection.metadata
            if (clientType === "CONTROLLER") {
                ctx.dispatch("SET_CONTROLLER_CONNECTED", { connected: true })
                // Remember: endIf WON'T cascade from here
                // Force phase transition if needed
            }
            if (clientType === "DISPLAY") {
                // Remote mode activation happens via thunk after connection
            }
        },
        onDisconnect: async (ctx) => {
            // Handle reconnection grace period, timer pause, etc.
        },
    }
}
```

### Full detectPlatform Utility

```typescript
// utils/detectPlatform.ts
export type TVPlatform = "WEB" | "FIRE_TV" | "SAMSUNG_TV" | "LG_TV" | "MOBILE"

export function detectPlatform(): TVPlatform {
    const params = new URLSearchParams(window.location.search)
    const override = params.get("volley_platform")
    if (override === "FIRE_TV") return "FIRE_TV"
    if (override === "SAMSUNG_TV") return "SAMSUNG_TV"
    if (override === "LG_TV") return "LG_TV"

    const ua = navigator.userAgent
    if (ua.includes("Tizen") && ua.includes("SMART-TV")) return "SAMSUNG_TV"
    if (ua.includes("Web0S") && ua.includes("SmartTV")) return "LG_TV"

    return "WEB"
}

export function isTV(platform: TVPlatform): boolean {
    return platform === "FIRE_TV" || platform === "SAMSUNG_TV" || platform === "LG_TV"
}
```

### Full useVGFState Hooks

```typescript
// hooks/useVGFState.ts
import { getVGFHooks, useConnectionStatus } from "@volley/vgf/client"
import type { YourGameState } from "@your-game/shared"
import { createInitialGameState } from "@your-game/shared"

const {
    useStateSync,
    useStateSyncSelector,
    useDispatch,
    useDispatchThunk,
    usePhase,
    useSessionMembers,
} = getVGFHooks<any, YourGameState, string>()

export {
    useStateSync,
    useStateSyncSelector,
    useDispatch,
    useDispatchThunk,
    usePhase,
    useSessionMembers,
    useConnectionStatus,
}

/**
 * Returns game state with a safe fallback for the initial empty state.
 * useStateSync() returns {} before the first state sync.
 */
export function useGameState(): YourGameState {
    let syncState: any
    try { syncState = useStateSync() } catch { syncState = null }

    if (syncState && "phase" in syncState) return syncState
    return createInitialGameState()
}
```

---

## Quick Start Checklist

For a new TV game project:

- [ ] Install Node.js >= 22, pnpm >= 10
- [ ] Run `npm login` and verify access to `@volley` packages
- [ ] Set up monorepo (Section 1): `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`
- [ ] Create `packages/shared` with game state type and `createInitialGameState()`
- [ ] Create `apps/display` with `@volley/vgf@4.3.1`, `@volley/platform-sdk@7.40.0`, `focus-trap-react`
- [ ] Create `apps/server` with `@volley/vgf@4.3.1`, `@volley/waterfall`, `@volley/logger`
- [ ] Run `pnpm install`
- [ ] Create `detectPlatform.ts` utility
- [ ] Create `MaybePlatformProvider` (conditional Platform SDK)
- [ ] Create `GameErrorBoundary` (error boundary)
- [ ] Create `InputModeProvider` (remote vs controller detection)
- [ ] Create `VGFDisplayProvider` (transport + VGFProvider)
- [ ] Create typed VGF hooks via `getVGFHooks()`
- [ ] Create `useKeyHandler.ts` (local DOM-based key hooks)
- [ ] Create `useDPadNavigation.ts` hook
- [ ] Define server: `GameServices`, phases, reducers, thunks, lifecycle hooks
- [ ] Set up `dev.ts` with pre-created `dev-test` session and Deepgram proxy
- [ ] Add `DEEPGRAM_API_KEY` to `.env`
- [ ] Configure Vite with `strictPort: true`
- [ ] Add `@vitejs/plugin-legacy` with `target: "chrome68"` for Fire TV builds
- [ ] Test with `?inputMode=remote` and `?volley_platform=FIRE_TV`
- [ ] Deploy to target TV platform (Section 12)

# Weekend Casino

A multi-game casino platform built on the Volley Games Framework (VGF). Three-app architecture: a Node.js game server, a 3D TV display (React Three Fiber), and a mobile phone controller (React).

## Architecture

```
weekend-poker/
├── apps/
│   ├── server/        # Express + VGF game server (port 3000)
│   ├── display/       # React + Three.js TV display (port 5173)
│   └── controller/    # React mobile controller (port 5174)
├── packages/
│   └── shared/        # Shared types, constants, poker engine
├── docs/              # PRD, TDD, research notes
└── e2e/               # Playwright smoke tests
```

### How it works

1. **Display** (shown on a TV) creates a game session on the server and shows a 3D poker table
2. **Controller** (on each player's phone) joins the session via `?sessionId=...` in the URL
3. **Server** runs all game logic server-authoritatively via VGF reducers/thunks, syncing state to all clients over Socket.IO

Card security: hole cards are stored server-side only. Each controller receives only its own cards.

## Prerequisites

- Node.js 18+ (tested with 22)
- pnpm 9.15.4 (`corepack enable && corepack prepare pnpm@9.15.4`)

## Quick Start

```bash
# Install dependencies
pnpm install

# Run all three apps in parallel
pnpm dev
```

This starts:
- **Server** at `http://localhost:3000`
- **Display** at `http://localhost:5173`
- **Controller** at `http://localhost:5174`

Open the display in a browser, then open the controller on a phone (or second tab) with the sessionId from the display.

### Run apps individually

```bash
pnpm dev:server       # Server only
pnpm dev:display      # Display only
pnpm dev:controller   # Controller only
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps (parallel) |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests (vitest, watch mode) |
| `pnpm test:run` | Run tests once |
| `pnpm typecheck` | TypeScript check all packages |
| `pnpm lint` | Lint all packages |
| `pnpm clean` | Remove all dist directories |

## Health Check

```bash
curl http://localhost:3000/health
```

## E2E Tests

```bash
# Requires Playwright browsers installed
npx playwright install
npx playwright test
```

Playwright auto-starts all three servers. Tests cover basic smoke: display loads, controller shows error without session, server health responds.

## Environment Variables

No `.env` files required for development. Defaults work out of the box.

| Variable | Default | App | Description |
|----------|---------|-----|-------------|
| `PORT` | `3000` | server | HTTP server port |
| `LOG_LEVEL` | `info` | server | Pino log level |

## Key Files

| File | What it does |
|------|-------------|
| `apps/server/src/index.ts` | Server entry point (Express + VGF setup) |
| `apps/server/src/ruleset/index.ts` | All game rules — reducers, thunks, phase lifecycle |
| `apps/server/src/poker-engine/` | Core poker logic (hand eval, betting, deck, pots, positions) |
| `apps/server/src/voice/parseVoiceIntent.ts` | Voice command parsing |
| `apps/display/src/App.tsx` | Display session creation and VGF connection |
| `apps/display/src/components/GameView.tsx` | 3D table rendering |
| `apps/controller/src/App.tsx` | Controller session join via URL param |
| `packages/shared/src/types/game-state.ts` | `PokerGameState` type definition |
| `packages/shared/src/constants/poker.ts` | Game constants (blinds, stack sizes, timeouts) |
| `52-card_deck.glb` | 3D card meshes (loaded by display) |

## Game Constants (from shared)

- Max players: 4
- Min to start: 2
- Starting stack: 1000
- Action timeout: 30s
- Blind levels: 5/10 up to 100/200 (5 levels)

## Tech Stack

- **Server**: Express, VGF (`@volley/vgf`), Pino, Zod
- **Display**: React 19, Vite, Three.js, React Three Fiber, R3F Drei
- **Controller**: React 19, Vite, Volley Recognition Client SDK
- **Shared**: TypeScript (strict), Vitest
- **Monorepo**: pnpm workspaces
- **E2E**: Playwright

## Production Notes

The dev setup uses in-memory storage. For production:
- Replace `MemoryStorage` with Redis (`ioredis` is already installed)
- Replace no-op scheduler with `RedisRuntimeSchedulerStore`
- Update CORS origins in `apps/server/src/index.ts`
- Set `NODE_ENV=production`

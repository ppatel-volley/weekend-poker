# Weekend Casino

A multi-game casino platform built on the Volley Games Framework (VGF). Server-authoritative architecture with a 3D TV display (React Three Fiber), mobile phone controller (React), and AI-powered dealer bots.

## Games

| Game | Status | Description |
|------|--------|-------------|
| **Texas Hold'em** | Complete | Classic community-card poker (2-4 players) |
| **5-Card Draw** | Complete | Draw poker with 0-3 card discard/replace |
| **Three Card Poker** | Complete | Player vs dealer, 3-card hands (straight > flush) |
| **Blackjack Classic** | Complete | Player vs dealer, 6-deck shoe, splits/doubles/insurance |
| **Blackjack Competitive** | Complete | Player vs player blackjack, sequential turns (D-007) |
| **Roulette** | Complete | European single-zero wheel, two-tab controller (D-007/D-008) |

### v2.0 Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Speed Variants** | Complete | Config-driven speed modes for Hold'em, Draw, and Blackjack |
| **Quick-Play Mode** | Complete | Random game rotation every 10 hands |
| **Casino Crawl** | Complete | Sequential rotation through all games (scoring in v2.1) |
| **Reactions/Emotes** | Complete | 6 reactions with server-side rate limiting |
| **Game Night Prep** | Complete | `wrapWithGameNightCheck` on all round-complete phases (activates in v2.1) |

## Architecture

```
weekend-casino/
├── apps/
│   ├── server/           # WGFServer game server (port 3000)
│   │   ├── src/
│   │   │   ├── ruleset/          # Casino ruleset: phases, reducers, thunks per game
│   │   │   │   ├── session-thunks.ts    # joinSession/leaveSession (replaces onConnect/onDisconnect)
│   │   │   │   └── connection-registry.ts # Private messaging (hole card delivery)
│   │   │   ├── scheduler/        # InMemoryRuntimeSchedulerStore (dev) / RedisRuntimeSchedulerStore (prod)
│   │   │   ├── services/         # Resilient Redis client factory
│   │   │   ├── persistence/      # Player identity, profiles, challenges, daily bonus (Redis/DynamoDB)
│   │   │   ├── poker-engine/     # Hold'em: hand eval, betting, positions, pots
│   │   │   ├── draw-engine/      # 5-Card Draw: hand eval, discard mechanics
│   │   │   ├── tcp-engine/       # Three Card Poker: 3-card eval, payouts
│   │   │   ├── blackjack-engine/ # Blackjack: shoe, dealer strategy, payouts
│   │   │   ├── roulette-engine/  # Roulette: wheel, bet types, payouts, near-miss
│   │   │   ├── craps-engine/     # Craps: dice, bet types, come/don't come, point
│   │   │   ├── bot-engine/       # AI bots: rules engine, Claude LLM, personalities
│   │   │   ├── voice/            # Voice intent parsing (Deepgram STT)
│   │   │   └── health.ts         # /health (liveness) + /health/ready (readiness)
│   ├── display/          # React + R3F TV display (port 5173)
│   │   ├── electron/             # Electron IPC handlers (GameLift Streams)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── scenes/       # Per-game 3D scenes (Lobby, Hold'em, Draw, TCP, BJ, Roulette, Craps)
│   │   │   │   └── hud/          # Casino HUD overlay (wallet, game info, timer)
│   │   │   ├── platform/         # MaybePlatformProvider, platform detection
│   │   │   ├── utils/            # getPlatformApiUrl, ensureLocalHubSessionId, configLoader
│   │   │   └── hooks/            # VGF state hooks (useCurrentGame, useWallet)
│   └── controller/       # React mobile controller (port 5174)
│       ├── src/
│       │   ├── components/
│       │   │   ├── games/        # Per-game controller layouts
│       │   │   └── shared/       # Cross-game: WalletDisplay, VoiceButton, PlayerInfo
│       │   └── hooks/            # Voice recognition, Platform SDK device identity
├── packages/
│   └── shared/           # Shared types, constants, phase enums
├── docs/                 # PRD, TDD, canonical decisions, game design
├── e2e/                  # Playwright E2E tests (27 files, 7 projects)
├── learnings/            # Documented mistakes and prevention patterns (15 entries)
├── Dockerfile            # Multi-stage production build
├── docker-compose.yml    # Server + Redis
└── turbo.json            # Turborepo task orchestration
```

### How It Works

1. **Display** (shown on a TV) creates a VGF session and renders a 3D casino scene
2. **Controller** (on each player's phone) joins the session via `?sessionId=...`
3. **Server** runs all game logic server-authoritatively via VGF reducers/thunks
4. State syncs to all clients over Socket.IO
5. Players interact via **voice** (Deepgram STT → intent parsing → game action) or **touch** (controller buttons)
6. **AI bots** fill empty seats with rules-based play + Claude-powered personality dialogue

Card security: hole cards and deck state are stored server-side only. Each controller receives only its own cards.

## Prerequisites

- Node.js 22+ (LTS)
- pnpm 9.15.4 (`corepack enable && corepack prepare pnpm@9.15.4`)
- Redis 7+ (optional for dev; [Memurai](https://www.memurai.com/) on Windows, `redis-server` on Linux/macOS)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env
# Edit .env — at minimum set DEEPGRAM_API_KEY for voice input

# 3. Run all three apps in parallel
pnpm dev
```

This starts:
- **Server** at `http://localhost:3000` (WGFServer with Socket.IO)
- **Display** at `http://localhost:5173` (TV screen, React Three Fiber)
- **Controller** at `http://localhost:5174` (phone, React)

Open the display in a browser. It shows a QR code and a controller URL with a `?sessionId=...` parameter. Open that URL on a phone or second browser tab to join.

### Run Apps Individually

```bash
pnpm dev:server       # Server only (port 3000)
pnpm dev:display      # Display only (port 5173)
pnpm dev:controller   # Controller only (port 5174)
```

### With Redis (optional, enables persistent scheduling)

If you have Redis/Memurai running locally:

```bash
REDIS_URL=redis://localhost:6379 pnpm dev:server
```

Without `REDIS_URL`, the server uses in-memory storage and scheduling (fine for development).

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### Server Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEEPGRAM_API_KEY` | Yes (for voice) | — | Deepgram STT API key |
| `ANTHROPIC_API_KEY` | No | — | Claude API for bot dialogue (falls back to canned responses) |
| `PORT` | No | `3000` | HTTP server port |
| `REDIS_URL` | No | — | Redis connection string (e.g. `redis://localhost:6379`). Enables persistent scheduling and durable storage. |
| `LOG_LEVEL` | No | `info` | Log level (debug, info, warn, error) |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins (comma-separated) |
| `SHUTDOWN_TIMEOUT` | No | `25000` | Graceful shutdown timeout (ms) |

### Controller Variables (in `apps/controller/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SERVER_URL` | No | `http://localhost:3000` | VGF game server URL |
| `VITE_GAME_ID` | No | `weekend-casino` | Platform SDK game identifier |
| `VITE_PLATFORM_SDK_STAGE` | No | `local` | Platform SDK stage (local/test/dev/staging/production) |
| `VITE_SEGMENT_WRITE_KEY` | No | — | Segment analytics write key |

## Testing

### Unit Tests (Vitest)

```bash
# Run all unit tests once
pnpm test -- --run

# Watch mode
pnpm test

# Run specific package
pnpm --filter @weekend-casino/server test
pnpm --filter @weekend-casino/shared test
pnpm --filter @weekend-casino/display test
pnpm --filter @weekend-casino/controller test
```

**Current coverage: 2,022 tests across 120 test files.**

| Package | Test Files | Tests | Covers |
|---------|-----------|-------|--------|
| `@weekend-casino/shared` | 10+ | ~130 | Types, phases, wallet, player, session stats, reactions |
| `@weekend-casino/server` | 70+ | ~1,500 | All game engines, reducers, thunks, phases, voice, bots, session lifecycle, scheduler, health endpoints, Redis client |
| `@weekend-casino/display` | 10+ | ~50 | Scene router, hooks, platform detection, config loader, Platform SDK utils |
| `@weekend-casino/controller` | 16 | ~155 | Game router, wallet display, voice hook, craps/game-night controllers |

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install

# Run all E2E tests (auto-starts dev servers)
pnpm test:e2e

# Run specific project
npx playwright test --project=smoke
npx playwright test --project=gameplay
npx playwright test --project=gamenight

# Run with UI
npx playwright test --ui
```

**27 E2E test files across 7 projects** covering: smoke tests, lobby flow, all 7 games (Hold'em, Draw, Blackjack, BJC, Roulette, TCP, Craps), game switching, wallet persistence, voice button, TV platform detection, Game Night mode, retention (profile, challenges, daily bonus), and multiplayer.

Playwright is configured with:
- **Controller project**: Chromium mobile viewport (390x844, iPhone 14)
- **Display project**: Chromium desktop viewport (1920x1080)
- **Gameplay project**: Per-game tests with 120s timeout
- **Game Night project**: Full Game Night flow with 300s timeout
- Retries: 2 (CI), screenshots on failure, video on first retry

### Type Checking and Build

```bash
pnpm typecheck   # TypeScript strict checking (all 4 packages)
pnpm build        # Production build (all 3 apps)
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps via Turborepo (parallel) |
| `pnpm dev:server` | Start server only |
| `pnpm dev:display` | Start display only |
| `pnpm dev:controller` | Start controller only |
| `pnpm build` | Build all packages via Turborepo |
| `pnpm test -- --run` | Run unit tests once |
| `pnpm test` | Run unit tests (watch mode) |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm typecheck` | TypeScript check all packages via Turborepo |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format all files with Prettier |
| `pnpm format:check` | Check formatting without writing |
| `pnpm clean` | Remove all dist directories |

## Game Architecture

### Single Ruleset (D-001)

All games share a single `CasinoRuleset` with phase namespaces. No separate rulesets per game:

```
CasinoRuleset
├── Shared phases: LOBBY, GAME_SELECT
├── Hold'em: POSTING_BLINDS, DEALING_HOLE_CARDS, ... (unprefixed)
├── 5-Card Draw: DRAW_POSTING_BLINDS, DRAW_DEALING, ...
├── Three Card Poker: TCP_PLACE_BETS, TCP_DEAL_CARDS, ...
├── Blackjack Classic: BJ_PLACE_BETS, BJ_DEAL_INITIAL, ...
├── Blackjack Competitive: BJC_PLACE_BETS, BJC_DEAL, ...
└── Roulette: ROULETTE_PLACE_BETS, ROULETTE_SPIN, ROULETTE_RESULT, ...
```

### State Shape (D-002)

Flat `CasinoGameState` with optional game-specific sub-objects:

```typescript
interface CasinoGameState {
  phase: CasinoPhase
  players: CasinoPlayer[]
  wallet: Record<string, number>    // Shared cross-game wallet
  selectedGame: CasinoGame | null
  reactions: ReactionEvent[]        // Recent emote reactions (max 10)
  // ... shared fields, speed/quickPlay/casinoCrawl configs
  holdem?: HoldemGameState          // Populated when playing Hold'em
  draw?: FiveCardDrawGameState      // Populated when playing Draw
  tcp?: ThreeCardPokerGameState     // Populated when playing TCP
  blackjack?: BlackjackGameState    // Populated when playing BJ
  blackjackCompetitive?: BlackjackCompetitiveGameState
  roulette?: RouletteGameState      // Populated when playing Roulette
  gameNight?: GameNightGameState    // Active during Game Night mode (v2.1)
}
```

### AI Bot System

Hybrid rules + LLM architecture:
- **Rules engine**: Difficulty-scaled (easy/medium/hard) with per-game strategies
- **Claude engine**: Personality dialogue generation with rate limiting and fallback
- **4 personalities**: Vincent (cautious), Maya (aggressive), Remy (balanced), Jade (unpredictable)

### Voice Pipeline

```
Player speaks → Deepgram STT → text → parseVoiceIntent() → VGF thunk dispatch → game action
```

Supported commands vary per game (fold, check, call, raise, hit, stand, draw, ante, red, black, number 17, etc.)

## Key Constants

| Constant | Value | Source |
|----------|-------|--------|
| Max players | 4 | PRD |
| Min to start | 2 | PRD |
| Starting wallet | 10,000 chips | D-005 |
| BJ max bet | 500 chips | D-006 |
| TCP min ante | 10 chips | V2 PRD |
| TCP max ante | 500 chips | V2 PRD |
| Draw max discard | 3 cards | Game Design |
| Roulette max total bet | 500 chips | v2 PRD |
| Roulette wheel | European (single zero, 37 pockets) | D-007 |
| Action timeout | 30s | PRD |
| Blind levels | 5/10 up to 100/200 | Constants |

## Tech Stack

- **Server**: Node.js 22, WGFServer (VGF v4.8.0), Express, `@volley/logger`, Socket.IO, ioredis
- **Display**: React 19, Vite, Three.js, React Three Fiber, Drei, `@volley/platform-sdk`
- **Controller**: React 19, Vite, `@volley/platform-sdk`, Deepgram SDK, react-router-dom
- **Shared**: TypeScript (strict), Vitest
- **Bots**: Anthropic SDK (Claude), rules-based engine
- **Monorepo**: pnpm workspaces, Turborepo, Prettier + lint-staged
- **E2E**: Playwright (7 test projects, 27 test files)
- **Voice**: Deepgram Nova-2 (STT)
- **Infrastructure**: Docker (multi-stage), Redis 7, health checks (/health, /health/ready)

## Documentation

| Document | Purpose |
|----------|---------|
| `docs/CANONICAL-DECISIONS.md` | Binding decisions (D-001 to D-019) — overrides everything |
| `docs/CASINO-PRD.md` | v1 product requirements |
| `docs/CASINO-V2-PRD.md` | v2 product requirements |
| `docs/CASINO-GAME-DESIGN.md` | Detailed game rules and mechanics |
| `docs/CASINO-TDD-architecture.md` | System architecture TDD |
| `docs/CASINO-TDD-backend.md` | Backend implementation TDD |
| `docs/CASINO-TDD-frontend.md` | Frontend implementation TDD |
| `docs/CASINO-V2-ROADMAP-FINAL.md` | v2.x release plan (v2.0/v2.1/v2.2 scope and timing) |
| `docs/CASINO-V2-NEW-GAMES.md` | Roulette, Three Card Poker, Craps specs |
| `docs/CASINO-V2-EXISTING-GAME-CHANGES.md` | Speed variants, Quick-Play, Casino Crawl |
| `docs/CASINO-V2-RETENTION.md` | Retention systems (Game Night, challenges, cosmetics) |
| `docs/RESEARCH-VGF-TYPE-SYSTEM.md` | VGF framework reference |
| `AGENTS.md` | AI agent guidelines |
| `AGENTS-PROJECT.md` | Project-specific agent config |

## Production Deployment

### Docker

```bash
# Build production image
docker compose build

# Run with Redis
docker compose up
```

The `docker-compose.yml` starts the VGF server and Redis. When `REDIS_URL` is set, the server enables:
- **RedisPersistence** — `MemoryStorage` with Redis-backed persistence (sessions survive restarts)
- **RedisRuntimeSchedulerStore** — persistent scheduled actions (survives restarts)
- **Resilient Redis client** — exponential backoff with jitter, unlimited retries
- **30s disconnect grace period** — orphaned players cleaned from game state after abrupt disconnects

Without `REDIS_URL` (local dev), `MemoryStorage` and `InMemoryRuntimeSchedulerStore` are used (sessions lost on restart, which is fine for development).

### Health Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /health` | Liveness probe | Always 200 (process is alive) |
| `GET /health/ready` | Readiness probe | 200 if Redis healthy, 503 if unhealthy |

### Graceful Shutdown

The server handles `SIGTERM` and `SIGINT` with a 25-second timeout:
1. Stop WGFServer (drain connections)
2. Close Redis clients
3. Close HTTP server
4. Exit 0

### Production Checklist

- [ ] Set `REDIS_URL` (required for durable scheduling and persistence)
- [ ] Set `CORS_ORIGIN` to allowed origins (not `*`)
- [ ] Set `NODE_ENV=production`
- [ ] Configure GameLift Streams for cloud GPU rendering (Display)
- [ ] Set `VITE_PLATFORM_SDK_STAGE=production` for controller
- [ ] Verify `/health/ready` returns 200 before routing traffic

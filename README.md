# Weekend Casino

A multi-game casino platform built on the Volley Games Framework (VGF). Server-authoritative architecture with a 3D TV display (React Three Fiber), mobile phone controller (React), and AI-powered dealer bots.

## Games

| Game | Status | Description |
|------|--------|-------------|
| **Texas Hold'em** | Complete | Classic community-card poker (2-4 players) |
| **5-Card Draw** | Complete | Draw poker with 0-3 card discard/replace |
| **Three Card Poker** | Complete | Player vs dealer, 3-card hands (straight > flush) |
| **Blackjack Classic** | In Progress | Player vs dealer, 6-deck shoe, splits/doubles/insurance |
| **Blackjack Competitive** | Planned | Player vs player blackjack variant |

## Architecture

```
weekend-poker/
├── apps/
│   ├── server/           # VGF game server (port 3000)
│   │   ├── src/
│   │   │   ├── ruleset/          # Casino ruleset: phases, reducers, thunks per game
│   │   │   ├── poker-engine/     # Hold'em: hand eval, betting, positions, pots
│   │   │   ├── draw-engine/      # 5-Card Draw: hand eval, discard mechanics
│   │   │   ├── tcp-engine/       # Three Card Poker: 3-card eval, payouts
│   │   │   ├── blackjack-engine/ # Blackjack: shoe, dealer strategy, payouts
│   │   │   ├── bot-engine/       # AI bots: rules engine, Claude LLM, personalities
│   │   │   └── voice/            # Voice intent parsing (Deepgram STT)
│   ├── display/          # React + R3F TV display (port 5173)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── scenes/       # Per-game 3D scenes (Lobby, Hold'em, Draw, TCP, BJ)
│   │   │   │   └── hud/          # Casino HUD overlay (wallet, game info, timer)
│   │   │   └── hooks/            # VGF state hooks (useCurrentGame, useWallet)
│   └── controller/       # React mobile controller (port 5174)
│       ├── src/
│       │   ├── components/
│       │   │   ├── games/        # Per-game controller layouts
│       │   │   └── shared/       # Cross-game: WalletDisplay, VoiceButton, PlayerInfo
│       │   └── hooks/            # Voice recognition (useVoice with Deepgram)
├── packages/
│   └── shared/           # Shared types, constants, phase enums
│       ├── src/
│       │   ├── types/            # CasinoGameState, CasinoPhase, per-game state types
│       │   └── constants/        # Bet limits, blind levels, game config
├── docs/                 # PRD, TDD, canonical decisions, game design
├── e2e/                  # Playwright E2E tests
└── learnings/            # Documented mistakes and prevention patterns
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

### Run Apps Individually

```bash
pnpm dev:server       # Server only
pnpm dev:display      # Display only
pnpm dev:controller   # Controller only
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | App | Description |
|----------|----------|-----|-------------|
| `DEEPGRAM_API_KEY` | Yes (for voice) | controller | Deepgram STT API key |
| `MESHY_API_KEY` | No | — | Meshy AI 3D model generation |
| `ANTHROPIC_API_KEY` | No | server | Claude API for bot dialogue (falls back to canned responses) |
| `PORT` | No (default: 3000) | server | HTTP server port |
| `LOG_LEVEL` | No (default: info) | server | Pino log level |

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

**Current coverage: 787+ tests across 44 test files.**

| Package | Test Files | Tests | Covers |
|---------|-----------|-------|--------|
| `@weekend-casino/shared` | 10 | ~124 | Types, phases, wallet, player, session stats |
| `@weekend-casino/server` | 25+ | ~550 | All game engines, reducers, thunks, phases, voice, bots |
| `@weekend-casino/display` | 4 | ~25 | Scene router, hooks, App exports |
| `@weekend-casino/controller` | 5 | ~33 | Game router, wallet display, voice hook |

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests (auto-starts dev servers)
pnpm test:e2e

# Run with UI
npx playwright test --ui

# Run specific test file
npx playwright test e2e/lobby.test.ts
```

**28 E2E tests** covering: lobby flow, Hold'em hand lifecycle, game switching, wallet persistence, voice button.

Playwright is configured with:
- **Controller project**: Chromium mobile viewport (390x844, iPhone 14)
- **Display project**: Chromium desktop viewport (1920x1080)
- Retries: 2 (CI), screenshots on failure, video on first retry

### Type Checking

```bash
pnpm typecheck
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps (parallel) |
| `pnpm dev:server` | Start server only |
| `pnpm dev:display` | Start display only |
| `pnpm dev:controller` | Start controller only |
| `pnpm build` | Build all packages |
| `pnpm test -- --run` | Run unit tests once |
| `pnpm test` | Run unit tests (watch mode) |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm typecheck` | TypeScript check all packages |
| `pnpm lint` | Lint all packages |
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
└── Blackjack Competitive: BJC_PLACE_BETS, BJC_DEAL, ... (planned)
```

### State Shape (D-002)

Flat `CasinoGameState` with optional game-specific sub-objects:

```typescript
interface CasinoGameState {
  phase: CasinoPhase
  players: CasinoPlayer[]
  wallet: Record<string, number>    // Shared cross-game wallet
  selectedGame: CasinoGame | null
  // ... shared fields
  holdem?: HoldemGameState          // Populated when playing Hold'em
  draw?: FiveCardDrawGameState      // Populated when playing Draw
  tcp?: ThreeCardPokerGameState     // Populated when playing TCP
  blackjack?: BlackjackGameState    // Populated when playing BJ
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

Supported commands vary per game (fold, check, call, raise, hit, stand, draw, ante, etc.)

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
| Action timeout | 30s | PRD |
| Blind levels | 5/10 up to 100/200 | Constants |

## Tech Stack

- **Server**: Node.js 22, VGF v4.8.0 (`@volley/vgf`), Express, Pino
- **Display**: React 19, Vite, Three.js, React Three Fiber, Drei
- **Controller**: React 19, Vite, Deepgram SDK
- **Shared**: TypeScript (strict), Vitest
- **Bots**: Anthropic SDK (Claude), rules-based engine
- **Monorepo**: pnpm workspaces
- **E2E**: Playwright
- **Voice**: Deepgram Nova-2 (STT)

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
| `docs/RESEARCH-VGF-TYPE-SYSTEM.md` | VGF framework reference |
| `AGENTS.md` | AI agent guidelines |
| `AGENTS-PROJECT.md` | Project-specific agent config |

## Production Notes

The dev setup uses in-memory storage. For production:
- Replace `MemoryStorage` with Redis (`ioredis`)
- Replace no-op scheduler with `RedisRuntimeSchedulerStore`
- Update CORS origins in `apps/server/src/index.ts`
- Set `NODE_ENV=production`
- Configure GameLift Streams for cloud GPU rendering (Display)

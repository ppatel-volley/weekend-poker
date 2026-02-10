# VGF (Volley Games Framework) Documentation

> Comprehensive technical documentation of `@volley/vgf` for the Weekend Poker project.
> Source repo: `/Users/pratik/dev/vgf` | Package: `@volley/vgf` v4.3.1

---

## 1. Overview

VGF is an opinionated, server-authoritative framework for building multiplayer real-time games with synchronised state and seamless client-server communication. It uses a **Redux-like** pattern (reducers, thunks, actions) combined with a **phase-based game loop** to manage game flow.

**Key characteristics:**
- Server-authoritative state -- all game state lives on the server, clients dispatch operations and receive state broadcasts
- Phase-based game flow -- games are structured as a series of phases with lifecycle hooks and automatic transitions
- Socket.IO transport -- real-time bidirectional communication between server and clients
- React client SDK -- hooks-based API for React 19+
- Redis persistence -- optional durable state for production deployments
- Multi-client architecture -- supports Display (TV), Controller (Phone), and Orchestrator client types

**Tech stack:** Node.js 22+, TypeScript, React 19+, Socket.IO, Redis (ioredis), Express, Zod, Vitest

---

## 2. Monorepo Structure

```
vgf/
  packages/
    vgf/              # Core framework library (@volley/vgf)
    eslint-config/    # Shared ESLint config
    tsconfig/         # Shared TypeScript config
  apps/
    server/           # Example game server (@volley/vgf-example-server)
    client/           # Example game client (@volley/vgf-example-client)
    k8s/              # Kubernetes deployment configs
  docs/               # VitePress documentation site
  scripts/            # Development scripts (tmux, CI)
```

### Core Package Exports

The `@volley/vgf` package exposes four entry points:

| Export Path | Purpose |
|---|---|
| `@volley/vgf/client` | React hooks, providers, transport, client utilities |
| `@volley/vgf/server` | VGFServer, storage, transport, persistence, session handlers |
| `@volley/vgf/types` | Shared type definitions (events, session, state) |
| `@volley/vgf/util` | Utility functions (e.g. `combineStyles`) |

---

## 3. Core Architecture

### 3.1 Game Ruleset

The `GameRuleset<GameState>` interface is the central configuration object for any VGF game:

```typescript
interface GameRuleset<GameState extends BaseGameState> {
  setup: (state?: Partial<GameState>) => GameState  // Initial state factory
  actions: ActionRecord<GameState>                    // DEPRECATED: use reducers/thunks
  reducers: ReducerRecord<GameState>                  // Global pure state transformers
  thunks: ThunkRecord<GameState>                      // Global async operations
  phases: Record<string, Phase<GameState>>            // Phase definitions
  onConnect?: OnConnect<GameState>                    // Client connection hook
  onDisconnect?: OnDisconnect<GameState>              // Client disconnection hook
}
```

### 3.2 BaseGameState

Every game state must extend `BaseGameState`:

```typescript
interface BaseGameState extends SessionState {
  previousPhase?: PhaseName | undefined
  phase: PhaseName
  __vgfStateVersion?: number
}
```

### 3.3 Reducers

Pure, synchronous functions that transform state. They receive the current state and arguments, and return new state. **No side effects allowed.**

```typescript
type GameReducer<
  GameState extends BaseGameState,
  TArgs extends Array<unknown> = never[],
> = (state: GameState, ...args: TArgs) => GameState
```

Reducers are dispatched from clients via `useDispatch()` or from thunks via `ctx.dispatch()`.

### 3.4 Thunks

Asynchronous functions for complex logic, validation, API calls, and orchestrating multiple state changes. They receive a rich context object:

```typescript
interface IThunkContext<GameState> {
  logger: ILogger
  getState: () => GameState              // Get current frozen state
  getMembers: () => SessionMemberRecord  // Get all session members
  getSessionId: () => SessionId
  getClientId: () => ClientId
  dispatch: (reducerName, ...args) => void       // Dispatch reducers
  dispatchThunk: (thunkName, ...args) => Promise<void>  // Dispatch other thunks
  scheduler: Scheduler                    // Failover-safe timers/intervals
  sessionManager: SessionManager          // Kick clients, manage sessions
}
```

### 3.5 Phases

Phases organise game flow into distinct stages. Each phase has its own reducers, thunks, and lifecycle hooks:

```typescript
interface Phase<GameState> {
  actions: ActionRecord     // DEPRECATED
  reducers: ReducerRecord   // Phase-specific reducers (only available in this phase)
  thunks: ThunkRecord       // Phase-specific thunks
  onBegin?: OnBegin         // Runs when entering this phase
  onEnd?: OnEnd             // Runs when leaving this phase
  endIf?: EndIf             // Condition check after every state update
  next: string | ((ctx) => string)  // Next phase name or dynamic resolver
}
```

**Phase lifecycle:**
1. State update occurs (reducer dispatched)
2. `endIf` is evaluated -- if `true`, transition begins
3. `onEnd` of current phase runs (cleanup)
4. `onBegin` of next phase runs (initialisation)
5. Phase is set in state
6. Repeat from step 2 (recursive check for chained transitions)

**Phase naming constraints:** Cannot use `root`, `internal`, or names containing colons (`:`)

### 3.6 State Synchronisation Flow

1. Client dispatches thunk/reducer via WebSocket
2. Server `StateSyncManager` processes the operation
3. `Store` applies the reducer to state (or executes the thunk)
4. `GameRunner` validates no illegal phase modifications occurred
5. `PhaseRunner` checks `endIf` conditions and handles transitions
6. Server broadcasts `StateUpdateMessage` to all connected clients
7. Client `VGFProvider` updates React context, triggering re-renders

---

## 4. Server Architecture

### 4.1 VGFServer

The main server class that wires everything together:

```typescript
const server = new VGFServer<GameState>({
  game: gameRuleset,
  httpServer,
  port: 3000,
  logger,
  storage,
  transport,
  app,        // Optional Express app
  history,    // Optional event history for debugging
})
```

There is also a `FailoverVGFServer` and `FailoverVGFServiceFactory` for production deployments with Redis-backed scheduler recovery.

### 4.2 Storage Layer

- **MemoryStorage** -- In-memory session store with NodeCache (configurable TTL)
- **RedisPersistence** -- Optional persistence backend for session durability
- **IStorage** interface -- Abstraction for custom storage implementations

### 4.3 Transport Layer

- **SocketIOTransport** -- Socket.IO server managing WebSocket connections
- **ConnectionRegistry** -- Tracks active connections per session
- Supports middleware registration (auth, Datadog, rate limiting)
- Client types: `Display`, `Controller`, `Orchestrator`

### 4.4 Session Management

- Sessions created via `POST /session/create`
- Each session has: `sessionId`, `state` (game state), `members` (connected clients)
- Members have: `sessionMemberId`, `connectionId`, `connectionState`, `isReady`, `state` (member-specific), `clientType`
- Built-in reducers: `__CLIENT_TOGGLE_READY`, `__CLIENT_UPDATE_STATE`

### 4.5 Scheduler System

Failover-safe replacement for `setTimeout`/`setInterval`:

```typescript
await ctx.scheduler.upsertTimeout({
  name: "round:timeout",
  delayMs: 30_000,
  mode: "hold",
  dispatch: { kind: "thunk", name: "END_ROUND" }
})

await ctx.scheduler.upsertInterval({
  name: "tick",
  everyMs: 1000,
  mode: "hold",
  dispatch: { kind: "reducer", name: "TICK" }
})

await ctx.scheduler.cancel("round:timeout")
```

Backed by `RedisRuntimeSchedulerStore` for persistence across server restarts.

---

## 5. Client Architecture

### 5.1 VGFProvider

React context provider that wraps the game:

```tsx
<VGFProvider transport={transport} logger={logger}>
  <Game />
</VGFProvider>
```

Internally composes: `LoggerProvider` > `TransportProvider` > `PartyTimeClientProvider` > `SessionProvider` > `DispatcherProvider` > `EventsProvider`

### 5.2 Core Hooks

| Hook | Purpose |
|---|---|
| `useStateSync<T>()` | Get full game state (re-renders on any change) |
| `useStateSyncSelector<T, S>(selector)` | Get derived state (re-renders only when selected value changes) |
| `useDispatch()` | Dispatch reducers: `dispatch("REDUCER_NAME", ...args)` |
| `useDispatchThunk()` | Dispatch thunks: `dispatchThunk("THUNK_NAME", ...args)` |
| `usePhase<T>()` | Get current phase name |
| `useSessionMembers()` | Get all session members |
| `useSessionMember()` | Get current client's member info |
| `useClientId()` | Get current client's ID |
| `useClientActions()` | Lobby actions: `toggleReady()`, `updateState()` |
| `useConnectionStatus()` | Get connection status |
| `useSessionId()` | Get/create session ID |
| `useEvents()` | Subscribe to phase change events |

### 5.3 Transport

```typescript
const transport = createSocketIOClientTransport({
  url: "http://localhost:3000",
  sessionId: "...",
  userId: "...",
  clientType: ClientType.Controller,  // or Display, Orchestrator
})
```

Default config: infinite reconnection attempts, 50ms initial delay, 500ms max delay, WebSocket-only.

### 5.4 Typed Hooks Factory

For full type safety across your game:

```typescript
const { useStateSync, useDispatch, usePhase } = getVGFHooks<
  typeof gameRuleset,
  GameState,
  PhaseName
>()
```

---

## 6. How Games Are Built

### Step 1: Define Game State

```typescript
interface PokerGameState extends BaseGameState {
  phase: PokerPhase
  players: PokerPlayer[]
  communityCards: Card[]
  pot: number
  currentBet: number
  dealerIndex: number
}
```

### Step 2: Define Phases

```typescript
enum PokerPhase {
  Lobby = "LOBBY",
  PreFlop = "PRE_FLOP",
  Flop = "FLOP",
  Turn = "TURN",
  River = "RIVER",
  Showdown = "SHOWDOWN",
}
```

### Step 3: Create GameRuleset

```typescript
const pokerRuleset: GameRuleset<PokerGameState> = {
  setup: () => ({ phase: PokerPhase.Lobby, players: [], ... }),
  reducers: { /* global reducers */ },
  thunks: { /* global thunks */ },
  phases: {
    [PokerPhase.Lobby]: lobbyPhase,
    [PokerPhase.PreFlop]: preFlopPhase,
    // ...
  },
  onConnect: async (ctx) => { /* handle new player */ },
  onDisconnect: async (ctx) => { /* handle player leaving */ },
}
```

### Step 4: Create Server

```typescript
const server = FailoverVGFServiceFactory.create<PokerGameState>({
  game: pokerRuleset,
  port: 3000,
  logger,
  app,
  httpServer,
  transport,
  storage,
  runtimeStore,
})
server.start()
```

### Step 5: Create Client

```tsx
function App() {
  return (
    <VGFProvider transport={transport}>
      <PhaseRouter />
    </VGFProvider>
  )
}

function PhaseRouter() {
  const phase = usePhase<PokerPhase>()
  switch (phase) {
    case PokerPhase.Lobby: return <Lobby />
    case PokerPhase.PreFlop: return <GameTable />
    // ...
  }
}
```

---

## 7. Display / Controller Architecture

VGF has first-class support for the TV + Phone model used at Volley:

- **Display** (`ClientType.Display`) -- The TV/Smart TV showing the main game visuals. There is typically one Display per session.
- **Controller** (`ClientType.Controller`) -- A phone/mobile device used by each player for input. Connected via QR code scanning.
- **Orchestrator** (`ClientType.Orchestrator`) -- A non-player client used for session management.

Both Display and Controller clients:
- Connect to the same session via the same VGF server
- Receive the same state broadcasts
- Can dispatch reducers and thunks
- Have their own `SessionMember` with individual `state`, `isReady`, etc.

The client type is specified when creating the transport:

```typescript
const transport = createSocketIOClientTransport({
  url: serverUrl,
  sessionId: sessionId,
  userId: uniqueUserId,
  clientType: ClientType.Controller,  // Phone
})
```

---

## 8. Integration Plan for Weekend Poker

### Game State Design
The poker game state will extend `BaseGameState` with poker-specific fields: players, hands, community cards, pot, blinds, current bet, dealer position, etc.

### Phase Structure
Map poker rounds to VGF phases: `Lobby` > `Dealing` > `PreFlop` > `Flop` > `Turn` > `River` > `Showdown` > `Settlement`. Use `endIf` for automatic transitions (e.g. all players have acted) and `next` for the phase sequence.

### Reducers for State Changes
Pure reducers for: `placeBet`, `fold`, `check`, `call`, `raise`, `dealCards`, `revealCommunityCards`, `updatePot`, `rotateBlinds`.

### Thunks for Game Logic
Async thunks for: `startHand` (shuffle, deal, set blinds), `processPlayerAction` (validate bet, check turn order), `evaluateHands` (determine winner), `distributePot`, `advancePhase`.

### Scheduler for Timers
Use `ctx.scheduler.upsertTimeout` for player action timers (auto-fold on timeout).

### Client Types
- **Display** (TV): Shows 3D poker table via React Three Fiber, community cards, pot, player positions
- **Controller** (Phone): Shows player's private hand, betting controls, voice command button

### Voice Integration
Voice commands dispatched as thunks from the Controller client after recognition processing.

### AI Bots
LLM-powered bots can be implemented as server-side thunks that dispatch actions on behalf of bot players, using the `scheduler` for timing delays to simulate human-like play.

---

## 9. CLI and Development Tools

```bash
vgf create my-game     # Scaffold a new VGF game project
vgf multi-client        # Launch multi-client tester (http://localhost:9001)
pnpm dev                # Start dev servers via Docker Compose
pnpm test:unit          # Run unit tests (Vitest)
pnpm typecheck          # TypeScript type checking
pnpm build              # Production build
```

---

## 10. Dependencies

| Dependency | Purpose |
|---|---|
| `socket.io` / `socket.io-client` | Real-time WebSocket transport |
| `ioredis` | Redis client for persistence and scheduler |
| `express` | HTTP server for session API and custom routes |
| `zod` | Runtime schema validation |
| `lodash-es` | Utility functions |
| `node-cache` | In-memory session cache with TTL |
| `uuid` | Session and member ID generation |
| `@volley/logger` | Structured logging (Pino-based) |

---

## 11. Key Patterns and Best Practices

1. **Validate in thunks, update in reducers** -- Reducers stay pure; thunks handle validation and orchestration
2. **Phase-specific operations** -- Only expose reducers/thunks relevant to the current phase
3. **Immutable state** -- Always return new objects from reducers, never mutate
4. **Scheduler over setTimeout** -- Use `ctx.scheduler` for all timing needs (failover-safe)
5. **Server-authoritative** -- Never trust client state; validate everything on the server
6. **State selectors** -- Use `useStateSyncSelector` for performance-critical components
7. **Separate UI and game state** -- Use React local state for UI concerns, VGF state for game logic

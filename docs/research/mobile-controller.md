# Mobile Controller System Documentation

> Documentation of the VGF mobile controller architecture for the Weekend Poker project.
> Based on VGF framework source code analysis and the Display/Controller client model.

---

## 1. Overview

The mobile controller system is built into the VGF framework as a first-class concept. Games built with VGF use a **Display + Controller** architecture where:

- **Display** (Smart TV / Fire TV) -- Renders the shared game visuals visible to all players
- **Controller** (Mobile phone) -- Provides individual player input and shows private information

Players connect their phones to the TV game session by scanning a QR code, which opens a web-based controller in the phone's browser. Both Display and Controller are React applications connected to the same VGF server session via Socket.IO WebSockets.

> **GameLift Streams Note:** The Display client runs on an AWS cloud GPU instance via Amazon GameLift Streams, not directly on the TV. The TV receives a WebRTC video stream of the rendered game. This does **not** affect the Controller (phone) architecture — controllers connect directly to the VGF server via Socket.IO as described below. The QR code URL points to the controller web app and VGF server endpoint, which are independent of the GameLift Streams delivery layer.

---

## 2. QR Code Connection Flow

```
1. Display client creates a VGF session via POST /session/create
2. Server returns sessionId
3. Display generates a QR code containing a URL:
     https://controller.example.com?sessionId={sessionId}
4. Display renders the QR code on TV screen
5. Player scans QR code with phone camera
6. Phone browser opens the controller URL
7. Controller app extracts sessionId from URL query params
8. Controller creates a SocketIOClientTransport with:
     - sessionId (from URL)
     - userId (generated or from account)
     - clientType: ClientType.Controller
9. Controller connects to VGF server via WebSocket
10. Server adds the controller as a SessionMember
11. Server broadcasts updated member list to all clients (Display + all Controllers)
12. Display shows the new player in the lobby
13. Controller shows the lobby UI on the phone
```

### Transport Configuration

```typescript
// Display client (TV)
const displayTransport = createSocketIOClientTransport({
  url: 'http://game-server:3000',
  sessionId: createdSessionId,
  userId: 'display-1',
  clientType: ClientType.Display,
})

// Controller client (Phone)
const controllerTransport = createSocketIOClientTransport({
  url: 'http://game-server:3000',
  sessionId: sessionIdFromQRCode,
  userId: generateUniqueUserId(),
  clientType: ClientType.Controller,
})
```

---

## 3. Communication Protocol

### 3.1 State Synchronisation

VGF uses a **server-authoritative** model. All state lives on the server and is broadcast to every connected client:

```
Controller dispatches: dispatchThunk("placeBet", 100)
         |
         v
    VGF Server processes thunk
    Server validates bet, updates game state
    Server broadcasts StateUpdateMessage to ALL clients
         |
    +----+----+
    |         |
    v         v
  Display   All Controllers
  (re-renders table)  (re-render hand/controls)
```

### 3.2 Socket.IO Events

**Client to Server:**
- `reducer` -- Dispatch a reducer with args
- `thunk` -- Dispatch a thunk with args
- `__CLIENT_TOGGLE_READY` -- Toggle ready state (built-in)
- `__CLIENT_UPDATE_STATE` -- Update member state (built-in)

**Server to Client:**
- `stateUpdate` -- Full game state broadcast
- `phaseChange` -- Phase transition notification
- `memberUpdate` -- Session member changes (connect/disconnect/state change)

### 3.3 Connection Resilience

Default Socket.IO config for controllers:
- Infinite reconnection attempts
- 50ms initial reconnection delay
- 500ms max reconnection delay
- WebSocket-only transport (no HTTP polling fallback)
- Connection ID may change on reconnection, but `sessionMemberId` stays stable

---

## 4. Session Members

Each connected client (Display or Controller) is tracked as a `SessionMember`:

```typescript
interface SessionMember {
  sessionMemberId: string     // Stable player ID (persists across reconnections)
  connectionId: string        // Current Socket.IO connection ID (may change)
  connectionState: ConnectionState  // CONNECTED | DISCONNECTED | TERMINATED | etc.
  isReady: boolean           // Lobby ready state
  clientType: ClientType     // DISPLAY | CONTROLLER | ORCHESTRATOR
  state: SessionMemberState  // Arbitrary custom data per member
}
```

### Connection States

| State | Meaning |
|---|---|
| `CONNECTED` | Client is actively connected |
| `DISCONNECTED` | Client has disconnected (may reconnect) |
| `NOT_YET_CONNECTED` | Client has never connected |
| `TERMINATED` | Client was forcefully disconnected (kicked) |
| `UNKNOWN` | Connection state is unknown |

---

## 5. UI Capabilities

### 5.1 What the Display (TV) Shows

The Display client renders the shared game view that all players can see:
- The poker table
- Community cards
- Pot size and current bets
- Player positions, names, and chip counts
- General game status and phase information
- QR code for joining (during lobby)

The Display does NOT show any player's private hand.

### 5.2 What the Controller (Phone) Shows

Each Controller client renders a private view for that specific player:
- **Player's private hand** (hole cards) -- only this player can see their cards
- **Betting controls** -- Check, Call, Raise (slider/input), Fold, All In buttons
- **Voice command button** -- Push-to-talk for voice-controlled actions
- **Player status** -- Current chip count, position, turn indicator
- **Lobby controls** -- Name entry, avatar selection, ready toggle

### 5.3 Private vs. Public State

VGF broadcasts the **full game state** to all clients. To handle private information (like a player's hole cards), the game must use a pattern where:

**Option A: Client-side filtering** -- Include all hands in state but only display the current player's hand on their controller. Other players' cards are in state but the controller UI simply does not render them.

**Option B: Server-side per-client state** -- Store private data in `SessionMember.state` (per-member state) rather than the shared game state. Each player's cards would be in their member state, visible to all clients but only rendered by the owning controller.

**Option C: Encrypted/hidden fields** -- Store encrypted card data in state; only the owning controller has the key.

For the poker game, **Option A or B** is recommended. VGF's `SessionMember.state` is the natural place for per-player private data.

> **Security Note:** Both Options A and B have a known limitation: VGF broadcasts state to **all** connected clients. In Option A, all players' cards exist in the shared game state — a technically savvy player could inspect the WebSocket messages to see other players' hands. In Option B, `SessionMember.state` is likewise visible to all clients (it's just only _rendered_ by the owning controller). For a **casual poker game** this is an acceptable trade-off — players would need to use browser developer tools to extract the data, which is impractical during normal play. For a competitive or real-money poker game, Option C (encryption) or a server-side redaction layer would be required. VGF does not currently support per-client state filtering at the framework level.

---

## 6. Game State Sync Patterns

### 6.1 Lobby Flow

```typescript
// Controller: Player sets name and readies up
const { toggleReady, updateState } = useClientActions()

updateState({ name: 'Alice', avatarUrl: '/avatars/alice.png' })
toggleReady()

// Display: Shows all players
const members = useSessionMembers()
const controllers = Object.values(members)
  .filter(m => m.clientType === 'CONTROLLER' && m.connectionState === 'CONNECTED')
```

### 6.2 Game Play Flow

```typescript
// Controller: Player places a bet
const dispatchThunk = useDispatchThunk()
dispatchThunk('placeBet', 100)

// Display: Reacts to state changes
const state = useStateSync<PokerGameState>()
// Renders updated pot, player bets, etc.
```

### 6.3 Phase-Based UI

Both Display and Controller react to phase changes:

```typescript
const phase = usePhase<PokerPhase>()

// Display renders different scenes per phase
// Controller renders different controls per phase
```

---

## 7. Player Management

### 7.1 Max Players

The poker game will enforce a 4-player maximum via server-side thunk validation:

```typescript
const onConnect = async (ctx) => {
  const members = ctx.getMembers()
  const controllers = Object.values(members)
    .filter(m => m.clientType === ClientType.Controller)

  if (controllers.length > 4) {
    ctx.sessionManager.kickClient(ctx.getClientId())
  }
}
```

### 7.2 Kicking Players

Display (host) can kick players from the lobby:

```typescript
// Server thunk
const kickPlayer: GameThunk<GameState, [string]> = async (ctx, memberIdToKick) => {
  const callerId = ctx.getClientId()
  const caller = ctx.getMembers()[callerId]

  if (caller.clientType !== ClientType.Display) {
    throw new UnauthorizedError()
  }

  ctx.sessionManager.kickClient(memberIdToKick)
}
```

### 7.3 Handling Disconnections

```typescript
const onDisconnect = async (ctx) => {
  const clientId = ctx.getClientId()
  ctx.dispatch('markPlayerDisconnected', clientId)

  // If mid-hand, auto-fold disconnected player after timeout
  await ctx.scheduler.upsertTimeout({
    name: `disconnect-fold:${clientId}`,
    delayMs: 30_000,
    mode: 'hold',
    dispatch: { kind: 'thunk', name: 'autoFoldPlayer', args: [clientId] },
  })
}
```

---

## 8. Integration Patterns for Weekend Poker

### 8.1 Session Creation

1. TV app starts, creates VGF session
2. Server runs `setup()` returning initial poker state (Lobby phase)
3. TV displays QR code containing session URL
4. Players scan QR code, phone controllers connect
5. Each controller runs `updateState({ name: 'Alice' })` and `toggleReady()`
6. When all players ready (min 2, max 4), Display dispatches `startGame` thunk
7. Server transitions to `Dealing` phase

### 8.2 Card Distribution

During the Dealing phase `onBegin` lifecycle hook:

```typescript
onBegin: async (ctx) => {
  const state = ctx.getState()
  const members = ctx.getMembers()

  // Shuffle deck, deal 2 cards to each player
  const deck = shuffleDeck()
  const playerHands = dealCards(deck, connectedPlayers)

  // Store each player's hand in their member state (private)
  for (const [playerId, hand] of Object.entries(playerHands)) {
    // OR store in game state with a per-player map
  }

  return { ...state, deck: remainingDeck, communityCards: [] }
}
```

### 8.3 Voice Command via Controller

```
Phone mic -> RecognitionSDK -> final transcript -> parse command
  -> dispatchThunk('processVoiceCommand', { action: 'raise', amount: 100 })
  -> Server validates and applies
  -> State broadcast to all clients
```

### 8.4 AI Bot as Virtual Controller

AI bots do not need a physical controller. They are implemented as server-side logic:

```typescript
const aiPlayerTurn: GameThunk<GameState> = async (ctx) => {
  const state = ctx.getState()
  const botId = state.currentPlayerId

  // LLM decides action based on game state
  const decision = await llmDecidePokerAction(state, botId)

  // Simulate thinking delay
  await ctx.scheduler.upsertTimeout({
    name: `bot-action:${botId}`,
    delayMs: 2000 + Math.random() * 3000,
    mode: 'hold',
    dispatch: { kind: 'thunk', name: 'executePlayerAction', args: [botId, decision] },
  })
}
```

---

## 9. Smart TV Considerations

With Amazon GameLift Streams, the Display client runs on a cloud GPU instance, not on the TV. The TV is a thin client receiving a WebRTC video stream. This changes several considerations:

- **@noriginmedia/norigin-spatial-navigation** -- Runs on the cloud GPU instance (not the TV); handles focus management for the Display React app; TV remote input is forwarded from the thin client via GameLift Streams
- **WebSocket-only transport** -- VGF's Socket.IO connection is between the cloud instance and the VGF server (internal AWS networking), not between the TV and the server
- **CORS** -- Server must allow the cloud instance's origin (not the TV's)
- **QR code library** -- `qrcode.react` renders on the cloud instance; the resulting image is streamed to the TV; must be readable from 2-3 metres on the TV screen
- **Performance** -- TV performance is not a concern (thin client only); Display client performance is bounded by the cloud GPU

**Controller (phone) is unaffected** -- the mobile controller connects directly to the VGF server via Socket.IO, independent of the GameLift Streams layer.

# Playwright E2E Testing for VGF-Powered Games

> A practical guide for AI agents and developers building E2E tests for games using the Volley Games Framework (VGF).

## Architecture Overview

VGF games use a **two-device model**:
- **Display** (TV/desktop): React Three Fiber 3D rendering, cloud-streamed via GameLift Streams
- **Controller** (phone/mobile): React web app for player input

Communication flows: **Controller UI → Socket.IO → VGF Server → State Broadcast → Display**

E2E tests simulate a player using the controller to play through real game rounds, verifying the full stack works end-to-end.

## Setup

### Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  workers: 1,              // Sequential — VGF sessions are stateful
  timeout: 120_000,        // Games take time
  use: {
    actionTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: [
    { command: 'pnpm dev:server',     port: 3000 },
    { command: 'pnpm dev:display',    port: 5173 },
    { command: 'pnpm dev:controller', port: 5174 },
  ],
})
```

### Fixture Pattern

Create a reusable fixture that sets up a fresh VGF session per test:

```typescript
// e2e/fixtures/casino-fixture.ts
export const test = base.extend({
  sessionId: async ({ browser }, use) => {
    // Display creates the session
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
    const page = await ctx.newPage()
    await page.goto(DISPLAY_URL)
    // Extract sessionId from QR code link
    const href = await page.locator('a[href*="sessionId"]').getAttribute('href')
    const sessionId = new URL(href, DISPLAY_URL).searchParams.get('sessionId')
    await use(sessionId)
    await ctx.close()
  },
  controllerPage: async ({ browser, sessionId }, use) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    await page.goto(`${CONTROLLER_URL}?sessionId=${sessionId}`)
    await use(page)
    await ctx.close()
  },
})
```

## Key Lessons Learned

### 1. Socket.IO `socketOptions.query` Overrides Top-Level `query`

**Problem**: Controller's `createSocketIOClientTransport` had `socketOptions.query: { deviceToken }` which REPLACED the top-level `query: { sessionId, userId, clientType }`. The server never received the sessionId and couldn't join the session.

**Fix**: Include ALL required params in `socketOptions.query`:
```typescript
socketOptions: {
  transports: ['polling', 'websocket'],
  query: { sessionId, userId, clientType, deviceToken },
}
```

### 2. `dispatchThunk` Does NOT Work Reliably in VGF `onBegin`

**Problem**: Phase `onBegin` callbacks that use `ctx.thunkDispatcher()` or `adapted.dispatchThunk()` may fail silently. The VGF phase context for `onBegin` is different from runtime thunk context.

**Fix**: Use `ctx.reducerDispatcher()` or `adapted.dispatch()` (reducers) directly. If the logic is complex, replicate the thunk's reducer dispatches inline:

```typescript
// BAD — may fail silently in onBegin
onBegin: async (ctx) => {
  await ctx.thunkDispatcher('myComplexThunk', args)
  return ctx.getState()
}

// GOOD — reducers work reliably
onBegin: (ctx) => {
  ctx.reducerDispatcher('step1Reducer', args)
  ctx.reducerDispatcher('step2Reducer', moreArgs)
  ctx.reducerDispatcher('setPhaseComplete', true)
  return ctx.getState()
}
```

### 3. Bots Must Auto-Act in Phase `onBegin`

**Problem**: Auto-filled bots have no controller UI. Any phase that waits for ALL players to act (bet, confirm, decide) hangs indefinitely when bots are present.

**Fix**: In each phase's `onBegin`, after initializing the round, loop through bot players and dispatch their actions:

```typescript
onBegin: (ctx) => {
  ctx.reducerDispatcher('initRound', players)

  // Auto-act for bots
  const state = ctx.getState()
  const bots = state.players.filter(p => p.isBot)
  for (const bot of bots) {
    ctx.reducerDispatcher('placeBet', bot.id, minBet)
    ctx.reducerDispatcher('updateWallet', bot.id, -minBet)
  }

  // Check if all players done after bot actions
  if (allPlayersActed(ctx.getState())) {
    ctx.reducerDispatcher('setAllBetsPlaced', true)
  }

  return ctx.getState()
}
```

### 4. Bot Wallet Must Be Initialized

**Problem**: `addBotPlayer` reducer set `player.stack` but NOT `state.wallet[botId]`, leaving bots with $0 wallet. Wallet-validated thunks silently rejected bot bets.

**Fix**: Always initialize wallet alongside player:
```typescript
addBotPlayer: (state, seatIndex) => ({
  ...state,
  players: [...state.players, { id: `bot-${seatIndex}`, isBot: true, ... }],
  wallet: { ...state.wallet, [`bot-${seatIndex}`]: STARTING_BALANCE },
})
```

### 5. Phase Cascades Are Instant — Don't Wait for Brief UI

**Problem**: When bots auto-act in `onBegin`, the entire round (bet → deal → play → settle → complete) cascades server-side in one tick. Result text flashes for milliseconds on the controller then the next round's UI appears.

**Fix**: Instead of waiting for result text (`WON $X`, `LOST $X`), detect round completion by watching for the NEXT round's UI element to reappear:

```typescript
// BAD — result text flashes too fast
await waitForHandResult(page) // times out

// GOOD — detect round completion by next round's betting UI
await placeBet(page)
await page.waitForTimeout(1_000) // brief wait for cascade
await expect(page.getByTestId('place-bet-btn')).toBeVisible({ timeout: 30_000 })
```

### 6. Playwright `.or()` and Strict Mode

**Problem 1**: `.or()` fails with strict mode when BOTH alternatives are visible simultaneously:
```typescript
// BAD — both visible on craps betting screen
await expect(passLineBtn.or(confirmBtn)).toBeVisible() // strict mode error
```

**Problem 2**: `.or()` does NOT work across different Page objects:
```typescript
// BAD — cross-page .or() silently fails
controllerPage.getByText('WON').or(controllerPage2.getByText('WON'))
```

**Fix**: Use single locators when the element is specific, and separate assertions per page for multiplayer tests.

### 7. Game Button Selection: Use Exact Text Match

**Problem**: `getByRole('button', { name: 'Blackjack' })` matches both "Blackjack" and "Competitive Blackjack" in the lobby grid.

**Fix**: Use `getByText(label, { exact: true })` for game selection:
```typescript
const gameLabel = page.getByText('Blackjack', { exact: true })
await gameLabel.click()
```

### 8. `setTimeout` Callbacks Lose VGF Context

**Problem**: VGF phase `onBegin` context is valid only during the callback. `setTimeout` closures that capture `ctx.dispatch` fail silently when the timer fires because the context is stale.

**Fix**: Set completion flags directly in `onBegin`, not in delayed callbacks:
```typescript
// BAD — ctx.dispatch is stale in setTimeout
setTimeout(() => ctx.dispatch('setComplete', true), 8000) // silently fails

// GOOD — set immediately in onBegin
ctx.reducerDispatcher('setComplete', true)
```

## Test Strategy Patterns

### Lobby Flow Helper
```typescript
export async function startGame(page, displayPage, gameKey, playerName) {
  await page.locator('#player-name').fill(playerName)
  await page.getByText(GAME_LABELS[gameKey], { exact: true }).click()
  await page.getByRole('button', { name: /^READY$/i }).click()
  const startBtn = page.getByRole('button', { name: /^START/i })
  await expect(startBtn).toBeVisible({ timeout: 10_000 })
  await startBtn.click()
  await expect(page.getByTestId('game-heading')).toBeVisible({ timeout: 30_000 })
}
```

### Deterministic Play Strategies
- **Always call/check** for poker (no AI randomness)
- **Always stand** for blackjack (simplest complete strategy)
- **Bet red** for roulette (50% chance, always resolves)
- **Pass line + confirm** for craps (simplest craps bet)
- **Always play** for Three Card Poker (never fold)

### Assert Flow Completion, Not Outcomes
Games are random — never assert win/lose. Assert that the round COMPLETED:
```typescript
// GOOD — proves round completed
await expect(page.getByText(/Round 2/)).toBeVisible()
await expect(page.getByTestId('place-bet-btn')).toBeVisible()

// BAD — game outcome is random
await expect(page.getByText('WON')).toBeVisible()
```

## Multiplayer Testing

Each test controller needs its own browser context (separate `localStorage` = separate `deviceToken`):
```typescript
controllerPage2: async ({ browser, sessionId }, use) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.goto(`${CONTROLLER_URL}?sessionId=${sessionId}`)
  await use(page)
  await ctx.close()
}
```

Two browser tabs on the SAME context share localStorage and appear as the same player.

## Checklist for New Games

When adding E2E tests for a new VGF game:

- [ ] Add `data-testid` to all interactive controller buttons
- [ ] Add `data-testid="game-heading"` to the controller heading
- [ ] Verify bots auto-act in every phase that waits for all players
- [ ] Verify bot wallet is initialized in `addBotPlayer`
- [ ] Phase `onBegin` uses `reducerDispatcher` not `thunkDispatcher` for bot actions
- [ ] Test strategy handles instant phase cascade (don't rely on brief result text)
- [ ] Lobby flow uses exact text match for game selection
- [ ] No `.or()` for co-visible elements (strict mode)
- [ ] Timeouts appropriate: 30s per action, 120s per test

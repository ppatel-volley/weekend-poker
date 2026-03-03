/**
 * Security tests for Critical #1 (hole card leakage), Critical #3 (player ID auth),
 * High #4 (bet validation), and High #5 (host-only game selection).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CasinoGameState, CasinoPlayer, Card } from '@weekend-casino/shared'
import { CasinoPhase, STARTING_WALLET_BALANCE, DEFAULT_BLIND_LEVEL } from '@weekend-casino/shared'
import { createInitialCasinoState } from '../ruleset/casino-state.js'
import { casinoRuleset } from '../ruleset/casino-ruleset.js'
import { _resetAllServerState as resetPokerServerState, setServerHandState } from '../poker-engine/index.js'
import { _resetAllServerState as resetCasinoServerState } from '../server-game-state.js'
import {
  getAuthorizedPlayerId,
  validatePlayerIdOrBot,
  isCallerHost,
  validateBetAmount,
} from '../ruleset/security.js'

// ── Test helpers ─────────────────────────────────────────────────

function makePlayer(overrides: Partial<CasinoPlayer> = {}): CasinoPlayer {
  return {
    id: 'player-1',
    name: 'Alice',
    avatarId: 'default',
    seatIndex: 0,
    stack: STARTING_WALLET_BALANCE,
    bet: 0,
    status: 'active',
    lastAction: null,
    isBot: false,
    isHost: false,
    isReady: true,
    currentGameStatus: 'active',
    isConnected: true,
    sittingOutHandCount: 0,
    ...overrides,
  }
}

function makeState(overrides: Partial<CasinoGameState> = {}): CasinoGameState {
  return createInitialCasinoState(overrides)
}

function createMockCtx(
  initialState: CasinoGameState,
  clientId = 'player-1',
  sessionId = 'test-session',
) {
  let state = { ...initialState }
  const dispatched: Array<{ name: string; args: unknown[] }> = []
  const thunkDispatched: Array<{ name: string; args: unknown[] }> = []

  const allReducers = casinoRuleset.reducers as Record<string, (...args: any[]) => any>

  const ctx = {
    getState: () => state,
    getClientId: () => clientId,
    getSessionId: () => sessionId,
    dispatch: (name: string, ...args: unknown[]) => {
      dispatched.push({ name, args })
      const reducer = allReducers[name]
      if (reducer) {
        state = reducer(state, ...args)
      }
    },
    dispatchThunk: vi.fn(async (name: string, ...args: unknown[]) => {
      thunkDispatched.push({ name, args })
    }),
    getMembers: () => ({}),
    scheduler: {
      upsertTimeout: vi.fn(),
      cancel: vi.fn(),
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    sessionManager: {
      kickClient: vi.fn(),
    },
  } as any

  return { ctx, dispatched, thunkDispatched, getState: () => state }
}

function getThunk(name: string) {
  const t = (casinoRuleset.thunks as Record<string, any>)[name]
  if (!t) throw new Error(`Thunk "${name}" not found in casinoRuleset`)
  return t
}

// ── Reset server state between tests ─────────────────────────────

beforeEach(() => {
  resetPokerServerState()
  resetCasinoServerState()
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CRITICAL #1: Hole Card Leakage
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('CRITICAL #1: Hole Card Leakage Prevention', () => {
  it('should NOT broadcast other players hole cards in state', () => {
    // Verify that initial state has empty holeCards
    const state = makeState()
    expect(state.holeCards).toEqual({})
  })

  it('setHoleCards reducer with empty object keeps holeCards empty', () => {
    const state = makeState()
    const reducer = casinoRuleset.reducers.setHoleCards as any
    const newState = reducer(state, {})
    expect(newState.holeCards).toEqual({})
  })

  it('requestMyHoleCards only returns the callers own cards', async () => {
    const p1 = makePlayer({ id: 'p1', seatIndex: 0 })
    const p2 = makePlayer({ id: 'p2', seatIndex: 1 })
    const state = makeState({
      players: [p1, p2],
      phase: CasinoPhase.PreFlopBetting,
      handNumber: 1,
    })

    // Set up server-side state with both players' cards
    const card1: Card = { rank: 'A', suit: 'spades' }
    const card2: Card = { rank: 'K', suit: 'hearts' }
    const card3: Card = { rank: 'Q', suit: 'diamonds' }
    const card4: Card = { rank: 'J', suit: 'clubs' }

    setServerHandState('test-session', {
      deck: [],
      holeCards: new Map([
        ['p1', [card1, card2]],
        ['p2', [card3, card4]],
      ]),
    })

    // Player 1 requests their cards
    const { ctx: ctx1, getState: getState1 } = createMockCtx(state, 'p1', 'test-session')
    const requestMyHoleCards = getThunk('requestMyHoleCards')
    await requestMyHoleCards(ctx1)

    // Player 1 should see their own cards
    const stateAfterP1 = getState1()
    expect(stateAfterP1.holeCards['p1']).toEqual([card1, card2])

    // Player 2's cards should NOT be in the broadcast state
    expect(stateAfterP1.holeCards['p2']).toBeUndefined()
  })

  it('requestMyHoleCards does nothing if no server state exists', async () => {
    const state = makeState({ handNumber: 1 })
    const { ctx, getState } = createMockCtx(state, 'p1', 'nonexistent-session')

    const requestMyHoleCards = getThunk('requestMyHoleCards')
    await requestMyHoleCards(ctx)

    expect(getState().holeCards).toEqual({})
  })

  it('requestMyHoleCards does nothing if player has no cards dealt', async () => {
    const state = makeState({ handNumber: 1 })
    setServerHandState('test-session', {
      deck: [],
      holeCards: new Map([
        ['other-player', [{ rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'hearts' }]],
      ]),
    })

    const { ctx, getState } = createMockCtx(state, 'p1', 'test-session')
    const requestMyHoleCards = getThunk('requestMyHoleCards')
    await requestMyHoleCards(ctx)

    // Should not have added any cards
    expect(getState().holeCards).toEqual({})
  })

  it('broadcast state never contains all players cards simultaneously after deal', async () => {
    const p1 = makePlayer({ id: 'p1', seatIndex: 0 })
    const p2 = makePlayer({ id: 'p2', seatIndex: 1 })
    const p3 = makePlayer({ id: 'p3', seatIndex: 2 })

    const state = makeState({
      players: [p1, p2, p3],
      phase: CasinoPhase.PreFlopBetting,
      handNumber: 1,
    })

    setServerHandState('test-session', {
      deck: [],
      holeCards: new Map([
        ['p1', [{ rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'hearts' }]],
        ['p2', [{ rank: 'Q', suit: 'diamonds' }, { rank: 'J', suit: 'clubs' }]],
        ['p3', [{ rank: '10', suit: 'spades' }, { rank: '9', suit: 'hearts' }]],
      ]),
    })

    // Each player requests their cards independently
    const { ctx: ctx1, getState: getState1 } = createMockCtx(state, 'p1', 'test-session')
    await getThunk('requestMyHoleCards')(ctx1)
    const afterP1 = getState1()

    // After p1 requests: only p1's cards visible
    expect(Object.keys(afterP1.holeCards)).toEqual(['p1'])

    // p2 requests from a state that already has p1's cards (simulates sequential)
    const { ctx: ctx2, getState: getState2 } = createMockCtx(afterP1, 'p2', 'test-session')
    await getThunk('requestMyHoleCards')(ctx2)
    const afterP2 = getState2()

    // After p2 requests: p1 and p2's cards visible, but NOT p3
    expect(afterP2.holeCards['p1']).toBeDefined()
    expect(afterP2.holeCards['p2']).toBeDefined()
    expect(afterP2.holeCards['p3']).toBeUndefined()
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CRITICAL #3: Server-Side Player ID Authorization
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('CRITICAL #3: Server-Side Player ID Authorization', () => {
  describe('getAuthorizedPlayerId', () => {
    it('returns the client ID from context', () => {
      const state = makeState()
      const { ctx } = createMockCtx(state, 'real-player-id')
      expect(getAuthorizedPlayerId(ctx)).toBe('real-player-id')
    })
  })

  describe('validatePlayerIdOrBot', () => {
    it('allows matching player ID', () => {
      const p1 = makePlayer({ id: 'p1' })
      const state = makeState({ players: [p1] })
      const { ctx } = createMockCtx(state, 'p1')

      expect(validatePlayerIdOrBot(ctx, 'p1', state)).toBe('p1')
    })

    it('rejects mismatched player ID', () => {
      const p1 = makePlayer({ id: 'p1' })
      const p2 = makePlayer({ id: 'p2', seatIndex: 1 })
      const state = makeState({ players: [p1, p2] })
      const { ctx } = createMockCtx(state, 'p1')

      // p1 tries to act as p2
      expect(validatePlayerIdOrBot(ctx, 'p2', state)).toBeNull()
    })

    it('allows bot actions with explicit bot ID', () => {
      const bot = makePlayer({ id: 'bot-1', isBot: true, seatIndex: 1 })
      const state = makeState({ players: [bot] })
      const { ctx } = createMockCtx(state, 'server-internal')

      // Server dispatches action for a bot
      expect(validatePlayerIdOrBot(ctx, 'bot-1', state)).toBe('bot-1')
    })

    it('rejects impersonation of human player', () => {
      const p1 = makePlayer({ id: 'attacker' })
      const p2 = makePlayer({ id: 'victim', seatIndex: 1 })
      const state = makeState({ players: [p1, p2] })
      const { ctx } = createMockCtx(state, 'attacker')

      expect(validatePlayerIdOrBot(ctx, 'victim', state)).toBeNull()
    })
  })

  describe('processPlayerAction authorization', () => {
    it('rejects action when client impersonates another player', async () => {
      const p1 = makePlayer({ id: 'p1', seatIndex: 0 })
      const p2 = makePlayer({ id: 'p2', seatIndex: 1 })

      const state = makeState({
        players: [p1, p2],
        phase: CasinoPhase.PreFlopBetting,
        activePlayerIndex: 1, // p2's turn
        currentBet: DEFAULT_BLIND_LEVEL.bigBlind,
      })

      // p1 tries to fold as p2
      const { ctx, dispatched } = createMockCtx(state, 'p1')
      const processPlayerAction = getThunk('processPlayerAction')
      await processPlayerAction(ctx, 'p2', 'fold')

      // No fold should have been dispatched
      const foldDispatches = dispatched.filter(d => d.name === 'foldPlayer')
      expect(foldDispatches.length).toBe(0)
    })

    it('allows action when client ID matches claimed player ID', async () => {
      const p1 = makePlayer({ id: 'p1', seatIndex: 0 })
      const p2 = makePlayer({ id: 'p2', seatIndex: 1 })

      const state = makeState({
        players: [p1, p2],
        phase: CasinoPhase.PreFlopBetting,
        activePlayerIndex: 0, // p1's turn
        currentBet: 0,
      })

      const { ctx, dispatched } = createMockCtx(state, 'p1')
      const processPlayerAction = getThunk('processPlayerAction')
      await processPlayerAction(ctx, 'p1', 'check')

      // Check should have been processed (setPlayerLastAction dispatched)
      const lastActionDispatches = dispatched.filter(d => d.name === 'setPlayerLastAction')
      expect(lastActionDispatches.length).toBeGreaterThan(0)
    })
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HIGH #4: Betting Amount Validation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('HIGH #4: Betting Amount Validation', () => {
  describe('validateBetAmount helper', () => {
    const STACK = 1000
    const CURRENT_BET = 0
    const PLAYER_BET = 0
    const MIN_RAISE = 20

    it('rejects negative bet amount', () => {
      const error = validateBetAmount(-100, STACK, PLAYER_BET, CURRENT_BET, MIN_RAISE, 'bet')
      expect(error).toBe('Invalid bet amount')
    })

    it('rejects zero bet amount for bet action', () => {
      const error = validateBetAmount(0, STACK, PLAYER_BET, CURRENT_BET, MIN_RAISE, 'bet')
      expect(error).toBe('Bet amount must be greater than zero')
    })

    it('rejects zero raise amount', () => {
      const error = validateBetAmount(0, STACK, PLAYER_BET, 20, MIN_RAISE, 'raise')
      expect(error).toBe('Bet amount must be greater than zero')
    })

    it('rejects bet exceeding player stack', () => {
      const error = validateBetAmount(1500, STACK, PLAYER_BET, CURRENT_BET, MIN_RAISE, 'bet')
      expect(error).toBe(`Bet exceeds available stack (${STACK})`)
    })

    it('rejects bet below minimum', () => {
      const error = validateBetAmount(5, STACK, PLAYER_BET, CURRENT_BET, MIN_RAISE, 'bet')
      expect(error).toBe(`Minimum bet is ${MIN_RAISE}`)
    })

    it('rejects raise below minimum raise', () => {
      // Current bet is 20, min raise increment is 20, so minimum raise is 40
      const error = validateBetAmount(30, STACK, PLAYER_BET, 20, MIN_RAISE, 'raise')
      expect(error).toBe('Minimum raise is 40')
    })

    it('accepts valid bet at minimum', () => {
      const error = validateBetAmount(MIN_RAISE, STACK, PLAYER_BET, CURRENT_BET, MIN_RAISE, 'bet')
      expect(error).toBeNull()
    })

    it('accepts valid raise at minimum', () => {
      // Current bet 20, min raise 20 → minimum raise total is 40
      const error = validateBetAmount(40, STACK, PLAYER_BET, 20, MIN_RAISE, 'raise')
      expect(error).toBeNull()
    })

    it('accepts bet equal to stack (all-in equivalent)', () => {
      const error = validateBetAmount(STACK, STACK, PLAYER_BET, CURRENT_BET, MIN_RAISE, 'bet')
      expect(error).toBeNull()
    })

    it('rejects NaN amount', () => {
      const error = validateBetAmount(NaN, STACK, PLAYER_BET, CURRENT_BET, MIN_RAISE, 'bet')
      expect(error).toBe('Invalid bet amount')
    })

    it('rejects Infinity amount', () => {
      const error = validateBetAmount(Infinity, STACK, PLAYER_BET, CURRENT_BET, MIN_RAISE, 'bet')
      expect(error).toBe('Invalid bet amount')
    })

    it('accounts for players existing bet in stack calculation', () => {
      // Player has 500 stack and 200 already bet, effective stack = 700
      const error = validateBetAmount(700, 500, 200, 0, MIN_RAISE, 'bet')
      expect(error).toBeNull()

      const error2 = validateBetAmount(701, 500, 200, 0, MIN_RAISE, 'bet')
      expect(error2).toBe('Bet exceeds available stack (700)')
    })
  })

  describe('processPlayerAction bet validation', () => {
    it('rejects negative bet amount via processPlayerAction', async () => {
      const p1 = makePlayer({ id: 'p1', seatIndex: 0, stack: 1000 })
      const p2 = makePlayer({ id: 'p2', seatIndex: 1, stack: 1000 })

      const state = makeState({
        players: [p1, p2],
        phase: CasinoPhase.PreFlopBetting,
        activePlayerIndex: 0,
        currentBet: 0,
      })

      const { ctx, dispatched } = createMockCtx(state, 'p1')
      await getThunk('processPlayerAction')(ctx, 'p1', 'bet', -50)

      // Should dispatch setBetError, not updatePlayerBet
      const betErrors = dispatched.filter(d => d.name === 'setBetError')
      const betUpdates = dispatched.filter(d => d.name === 'updatePlayerBet')
      expect(betErrors.length).toBe(1)
      expect(betUpdates.length).toBe(0)
    })

    it('rejects over-stack bet via processPlayerAction', async () => {
      const p1 = makePlayer({ id: 'p1', seatIndex: 0, stack: 500 })
      const p2 = makePlayer({ id: 'p2', seatIndex: 1, stack: 1000 })

      const state = makeState({
        players: [p1, p2],
        phase: CasinoPhase.PreFlopBetting,
        activePlayerIndex: 0,
        currentBet: 0,
      })

      const { ctx, dispatched } = createMockCtx(state, 'p1')
      await getThunk('processPlayerAction')(ctx, 'p1', 'bet', 1000)

      const betErrors = dispatched.filter(d => d.name === 'setBetError')
      expect(betErrors.length).toBe(1)
    })

    it('rejects under-minimum bet via processPlayerAction', async () => {
      const p1 = makePlayer({ id: 'p1', seatIndex: 0, stack: 1000 })
      const p2 = makePlayer({ id: 'p2', seatIndex: 1, stack: 1000 })

      const state = makeState({
        players: [p1, p2],
        phase: CasinoPhase.PreFlopBetting,
        activePlayerIndex: 0,
        currentBet: 0,
        minRaiseIncrement: 20,
      })

      const { ctx, dispatched } = createMockCtx(state, 'p1')
      await getThunk('processPlayerAction')(ctx, 'p1', 'bet', 5)

      const betErrors = dispatched.filter(d => d.name === 'setBetError')
      expect(betErrors.length).toBe(1)
    })
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HIGH #5: Host-Only Game Selection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('HIGH #5: Host-Only Game Selection', () => {
  describe('isCallerHost helper', () => {
    it('returns true for host player', () => {
      const host = makePlayer({ id: 'host-id', isHost: true })
      const state = makeState({ players: [host] })
      const { ctx } = createMockCtx(state, 'host-id')

      expect(isCallerHost(ctx, state)).toBe(true)
    })

    it('returns false for non-host player', () => {
      const host = makePlayer({ id: 'host-id', isHost: true })
      const other = makePlayer({ id: 'other-id', seatIndex: 1, isHost: false })
      const state = makeState({ players: [host, other] })
      const { ctx } = createMockCtx(state, 'other-id')

      expect(isCallerHost(ctx, state)).toBe(false)
    })

    it('returns false for unknown player', () => {
      const state = makeState({ players: [] })
      const { ctx } = createMockCtx(state, 'unknown-id')

      expect(isCallerHost(ctx, state)).toBe(false)
    })
  })

  describe('selectGameAsHost thunk', () => {
    it('host can select a game', async () => {
      const host = makePlayer({ id: 'host-id', isHost: true })
      const state = makeState({
        players: [host],
        phase: CasinoPhase.GameSelect,
      })

      const { ctx, getState } = createMockCtx(state, 'host-id')
      await getThunk('selectGameAsHost')(ctx, 'holdem')

      expect(getState().selectedGame).toBe('holdem')
    })

    it('non-host cannot select a game', async () => {
      const host = makePlayer({ id: 'host-id', isHost: true })
      const nonHost = makePlayer({ id: 'non-host', seatIndex: 1, isHost: false })
      const state = makeState({
        players: [host, nonHost],
        phase: CasinoPhase.GameSelect,
      })

      const { ctx, getState } = createMockCtx(state, 'non-host')
      await getThunk('selectGameAsHost')(ctx, 'holdem')

      // Game should NOT have been selected
      expect(getState().selectedGame).toBeNull()
    })
  })

  describe('confirmGameSelectAsHost thunk', () => {
    it('host can confirm game selection', async () => {
      const host = makePlayer({ id: 'host-id', isHost: true })
      const state = makeState({
        players: [host],
        phase: CasinoPhase.GameSelect,
        selectedGame: 'holdem',
      })

      const { ctx, getState } = createMockCtx(state, 'host-id')
      await getThunk('confirmGameSelectAsHost')(ctx)

      expect(getState().gameSelectConfirmed).toBe(true)
    })

    it('non-host cannot confirm game selection', async () => {
      const host = makePlayer({ id: 'host-id', isHost: true })
      const nonHost = makePlayer({ id: 'non-host', seatIndex: 1, isHost: false })
      const state = makeState({
        players: [host, nonHost],
        phase: CasinoPhase.GameSelect,
        selectedGame: 'holdem',
      })

      const { ctx, getState } = createMockCtx(state, 'non-host')
      await getThunk('confirmGameSelectAsHost')(ctx)

      // Should NOT be confirmed
      expect(getState().gameSelectConfirmed).toBe(false)
    })
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Integration: New thunks are registered in the ruleset
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Thunk registration', () => {
  it('requestMyHoleCards is registered', () => {
    expect(casinoRuleset.thunks).toHaveProperty('requestMyHoleCards')
  })

  it('selectGameAsHost is registered', () => {
    expect(casinoRuleset.thunks).toHaveProperty('selectGameAsHost')
  })

  it('confirmGameSelectAsHost is registered', () => {
    expect(casinoRuleset.thunks).toHaveProperty('confirmGameSelectAsHost')
  })
})

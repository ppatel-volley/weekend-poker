/**
 * 5-Card Draw integration test — verifies the full phase flow.
 *
 * Tests the actual phase callbacks (onBegin, endIf, onEnd, next) with
 * mock VGF contexts to confirm phase transitions work correctly.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import type { CasinoGameState, CasinoPlayer } from '@weekend-casino/shared'
import { CasinoPhase, DEFAULT_BLIND_LEVEL, STARTING_WALLET_BALANCE } from '@weekend-casino/shared'
import {
  drawPostingBlindsPhase,
  drawDealingPhase,
  drawBetting1Phase,
} from '../ruleset/draw-phases.js'
import { createInitialCasinoState } from '../ruleset/casino-state.js'

// ── Test helpers ──────────────────────────────────────────────

function createPlayer(id: string, overrides: Partial<CasinoPlayer> = {}): CasinoPlayer {
  return {
    id,
    name: `Player ${id}`,
    avatarId: 'default',
    seatIndex: 0,
    isHost: false,
    isReady: true,
    currentGameStatus: 'active',
    stack: STARTING_WALLET_BALANCE,
    bet: 0,
    status: 'active',
    lastAction: null,
    isBot: false,
    isConnected: true,
    sittingOutHandCount: 0,
    ...overrides,
  }
}

function createGameState(overrides: Partial<CasinoGameState> = {}): CasinoGameState {
  return createInitialCasinoState({
    selectedGame: 'five_card_draw',
    players: [
      createPlayer('p1', { seatIndex: 0, isHost: true }),
      createPlayer('p2', { seatIndex: 1 }),
    ],
    ...overrides,
  })
}

/**
 * Create a mock VGF onBegin/onEnd context.
 *
 * VGF 4.8.0 onBegin/onEnd contexts provide:
 *   - reducerDispatcher(name, ...args) — dispatches a reducer
 *   - thunkDispatcher(name, ...args) — dispatches a thunk
 *   - getState() — returns current state
 *   - session.state — current state (mutated by dispatches)
 */
function createMockPhaseContext(
  state: CasinoGameState,
  reducers: Record<string, (...args: any[]) => CasinoGameState>,
  thunks: Record<string, (...args: any[]) => Promise<void>> = {},
) {
  const session = { state, sessionId: 'test-session', members: {} }

  const reducerDispatcher = (name: string, ...args: unknown[]) => {
    const reducer = reducers[name]
    if (!reducer) {
      throw new Error(`Reducer not found: ${name} (available: ${Object.keys(reducers).join(', ')})`)
    }
    session.state = reducer(session.state, ...args)
  }

  const thunkDispatcher = async (name: string, ...args: unknown[]) => {
    const thunk = thunks[name]
    if (!thunk) {
      throw new Error(`Thunk not found: ${name}`)
    }
    await thunk(...args)
  }

  return {
    session,
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    reducerDispatcher,
    thunkDispatcher,
    getState: () => session.state,
    getSessionId: () => session.sessionId,
    getMembers: () => session.members,
    getClientId: () => 'test-client',
  }
}

/** Create a mock endIf/next context (read-only, session.state only). */
function createMockEndIfContext(state: CasinoGameState) {
  return { session: { state, sessionId: 'test-session', members: {} } }
}

// Import the reducers used by Draw phases
import {
  drawResetHand,
  drawSetHands,
  drawUpdatePlayerBet,
  drawSetActivePlayer,
  drawSetCurrentBet,
  drawSetMinRaiseIncrement,
  drawUpdatePot,
  drawMarkComplete,
} from '../ruleset/draw-reducers.js'

// Import shared reducers used by Draw
const sharedReducers: Record<string, (...args: any[]) => CasinoGameState> = {
  drawResetHand: (state: CasinoGameState) => drawResetHand(state),
  setHandNumber: (state: CasinoGameState, n: number) => ({ ...state, handNumber: n }),
  rotateDealerButton: (state: CasinoGameState) => {
    const activePlayers = state.players.filter(p => p.status !== 'busted' && p.status !== 'sitting_out')
    if (activePlayers.length === 0) return state
    const newIndex = (state.dealerIndex + 1) % activePlayers.length
    return { ...state, dealerIndex: newIndex }
  },
  drawUpdatePlayerBet: (state: CasinoGameState, playerId: string, amount: number) =>
    drawUpdatePlayerBet(state, playerId, amount),
  setPlayerLastAction: (state: CasinoGameState, playerId: string, action: any) => ({
    ...state,
    players: state.players.map(p => p.id === playerId ? { ...p, lastAction: action } : p),
  }),
  drawSetHands: (state: CasinoGameState, hands: Record<string, any>) =>
    drawSetHands(state, hands),
  markDealingComplete: (state: CasinoGameState, complete?: boolean) => ({
    ...state,
    dealingComplete: complete ?? true,
  }),
  drawSetActivePlayer: (state: CasinoGameState, index: number) =>
    drawSetActivePlayer(state, index),
  drawSetCurrentBet: (state: CasinoGameState, amount: number) =>
    drawSetCurrentBet(state, amount),
  drawSetMinRaiseIncrement: (state: CasinoGameState, amount: number) =>
    drawSetMinRaiseIncrement(state, amount),
  drawUpdatePot: (state: CasinoGameState) => drawUpdatePot(state),
  drawMarkComplete: (state: CasinoGameState) => drawMarkComplete(state),
  markPlayerBusted: (state: CasinoGameState, playerId: string) => ({
    ...state,
    players: state.players.map(p => p.id === playerId ? { ...p, status: 'busted' as const } : p),
  }),
}

// ── Tests ─────────────────────────────────────────────────────

describe('5-Card Draw integration — phase flow', () => {
  let state: CasinoGameState

  beforeEach(() => {
    state = createGameState()
  })

  describe('DrawPostingBlinds', () => {
    it('onBegin posts blinds and endIf returns true', () => {
      const ctx = createMockPhaseContext(state, sharedReducers)
      const resultState = drawPostingBlindsPhase.onBegin(ctx) as CasinoGameState

      // Verify blinds are posted
      const sbPlayer = resultState.players.find(p => p.lastAction === 'post_small_blind')
      const bbPlayer = resultState.players.find(p => p.lastAction === 'post_big_blind')

      expect(sbPlayer).toBeDefined()
      expect(sbPlayer!.bet).toBeGreaterThan(0)
      expect(bbPlayer).toBeDefined()
      expect(bbPlayer!.bet).toBeGreaterThan(0)

      // Verify fiveCardDraw state is initialised
      expect(resultState.fiveCardDraw).toBeDefined()

      // Verify endIf returns true (phase should advance immediately)
      const endIfCtx = createMockEndIfContext(resultState)
      expect(drawPostingBlindsPhase.endIf(endIfCtx)).toBe(true)

      // Verify next phase
      expect(drawPostingBlindsPhase.next).toBe(CasinoPhase.DrawDealing)
    })

    it('endIf returns false before blinds are posted', () => {
      // State with no blinds posted
      const ctx = createMockEndIfContext(state)
      expect(drawPostingBlindsPhase.endIf(ctx)).toBe(false)
    })

    it('handles 2-player game correctly', () => {
      const ctx = createMockPhaseContext(state, sharedReducers)
      const result = drawPostingBlindsPhase.onBegin(ctx) as CasinoGameState

      // Both players should have different actions
      const actions = result.players.map(p => p.lastAction)
      expect(actions).toContain('post_small_blind')
      expect(actions).toContain('post_big_blind')

      // Stack should be reduced
      const totalStacks = result.players.reduce((s, p) => s + p.stack + p.bet, 0)
      expect(totalStacks).toBe(STARTING_WALLET_BALANCE * 2)
    })
  })

  describe('DrawDealing', () => {
    it('onBegin deals 5 cards to each player and endIf returns true', () => {
      // First post blinds
      const blindsCtx = createMockPhaseContext(state, sharedReducers)
      const afterBlinds = drawPostingBlindsPhase.onBegin(blindsCtx) as CasinoGameState

      // Then deal
      const dealCtx = createMockPhaseContext(afterBlinds, sharedReducers)
      const afterDeal = drawDealingPhase.onBegin(dealCtx) as CasinoGameState

      // Verify hands dealt
      expect(afterDeal.fiveCardDraw).toBeDefined()
      const hands = afterDeal.fiveCardDraw!.hands
      expect(Object.keys(hands)).toHaveLength(2)
      expect(hands['p1']).toHaveLength(5)
      expect(hands['p2']).toHaveLength(5)

      // Verify dealing complete
      expect(afterDeal.dealingComplete).toBe(true)

      // Verify endIf
      const endIfCtx = createMockEndIfContext(afterDeal)
      expect(drawDealingPhase.endIf(endIfCtx)).toBe(true)

      // Verify next phase
      expect(drawDealingPhase.next).toBe(CasinoPhase.DrawBetting1)
    })
  })

  describe('DrawBetting1', () => {
    it('onBegin sets active player and current bet', () => {
      // Set up state after dealing
      const blindsCtx = createMockPhaseContext(state, sharedReducers)
      const afterBlinds = drawPostingBlindsPhase.onBegin(blindsCtx) as CasinoGameState
      const dealCtx = createMockPhaseContext(afterBlinds, sharedReducers)
      const afterDeal = drawDealingPhase.onBegin(dealCtx) as CasinoGameState
      // Clear dealing flag as onEnd would
      const readyForBetting = { ...afterDeal, dealingComplete: false }

      const ctx = createMockPhaseContext(readyForBetting, sharedReducers)
      const result = drawBetting1Phase.onBegin(ctx) as CasinoGameState

      expect(result.fiveCardDraw!.activePlayerIndex).toBeGreaterThanOrEqual(0)
      expect(result.fiveCardDraw!.currentBet).toBe(DEFAULT_BLIND_LEVEL.bigBlind)
    })
  })

  describe('Full phase cascade', () => {
    it('phases cascade: PostingBlinds → Dealing → Betting1 (stops)', () => {
      // Simulate VGF phase cascade
      let currentState = state

      // 1. PostingBlinds
      const blindsCtx = createMockPhaseContext(currentState, sharedReducers)
      currentState = drawPostingBlindsPhase.onBegin(blindsCtx) as CasinoGameState
      expect(drawPostingBlindsPhase.endIf(createMockEndIfContext(currentState))).toBe(true)

      // 2. Dealing
      const dealCtx = createMockPhaseContext(currentState, sharedReducers)
      currentState = drawDealingPhase.onBegin(dealCtx) as CasinoGameState
      expect(drawDealingPhase.endIf(createMockEndIfContext(currentState))).toBe(true)
      // onEnd clears dealingComplete
      const dealEndCtx = createMockPhaseContext(currentState, sharedReducers)
      currentState = drawDealingPhase.onEnd!(dealEndCtx) as CasinoGameState

      // 3. Betting1
      const bet1Ctx = createMockPhaseContext(currentState, sharedReducers)
      currentState = drawBetting1Phase.onBegin(bet1Ctx) as CasinoGameState

      // Betting1 should NOT end immediately — needs player actions
      expect(drawBetting1Phase.endIf(createMockEndIfContext(currentState))).toBe(false)

      // Verify final state has all the right data
      expect(currentState.fiveCardDraw).toBeDefined()
      expect(currentState.fiveCardDraw!.hands['p1']).toHaveLength(5)
      expect(currentState.fiveCardDraw!.hands['p2']).toHaveLength(5)
      expect(currentState.fiveCardDraw!.activePlayerIndex).toBeGreaterThanOrEqual(0)
      expect(currentState.handNumber).toBe(1)
    })
  })
})

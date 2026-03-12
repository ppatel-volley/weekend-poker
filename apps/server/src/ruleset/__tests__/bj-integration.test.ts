/**
 * Blackjack Classic integration tests.
 *
 * Tests the full game flow through phases + thunks, validating:
 *   - Phase transitions fire correctly
 *   - Bot auto-stand works without freeze (the "stand freeze" bug fix)
 *   - Wallet deductions/payouts are correct
 *   - endIf conditions are precise
 *   - Edge cases: all-bot table, single player, splits, surrenders, insurance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CasinoGameState, Card, BlackjackGameState } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'
import { bjReducers } from '../bj-reducers.js'

// ── Mocks ────────────────────────────────────────────────────

let mockShoe: Card[] = []

vi.mock('../../server-game-state.js', () => ({
  getServerGameState: () => ({
    blackjack: {
      get shoe() { return mockShoe },
      set shoe(v: Card[]) { mockShoe = v },
      dealerHoleCard: null,
    },
  }),
  setServerGameState: vi.fn(),
}))

vi.mock('../game-night-utils.js', () => ({
  wrapWithGameNightCheck: (fn: any) => fn,
  incrementGameNightRoundIfActive: vi.fn(),
}))

// ── Helpers ──────────────────────────────────────────────────

function card(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { rank, suit }
}

function createDeterministicShoe(cards: Card[]): Card[] {
  return [...cards]
}

function createTestState(opts: {
  humanCount?: number
  botCount?: number
  walletAmount?: number
} = {}): CasinoGameState {
  const humanCount = opts.humanCount ?? 1
  const botCount = opts.botCount ?? 1
  const walletAmount = opts.walletAmount ?? 1000

  const players: any[] = []
  const wallet: Record<string, number> = {}

  for (let i = 0; i < humanCount; i++) {
    const id = `human${i + 1}`
    players.push({
      id, name: `Human ${i + 1}`, seatIndex: i, stack: walletAmount, bet: 0,
      status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0,
    })
    wallet[id] = walletAmount
  }
  for (let i = 0; i < botCount; i++) {
    const id = `bot${i + 1}`
    players.push({
      id, name: `Bot ${i + 1}`, seatIndex: humanCount + i, stack: walletAmount, bet: 0,
      status: 'active', lastAction: null, isBot: true, isConnected: true, sittingOutHandCount: 0,
    })
    wallet[id] = walletAmount
  }

  return {
    phase: CasinoPhase.BjPlaceBets,
    selectedGame: 'blackjack_classic',
    gameSelectConfirmed: true,
    gameChangeRequested: false,
    gameChangeVotes: {},
    wallet,
    players,
    dealerCharacterId: 'ace_malone',
    blindLevel: { level: 1, smallBlind: 5, bigBlind: 10, minBuyIn: 200, maxBuyIn: 1000 },
    handNumber: 0,
    dealerIndex: 0,
    lobbyReady: false,
    dealerMessage: null,
    ttsQueue: [],
    sessionStats: { gamesPlayed: 0, totalHandsPlayed: 0, playerStats: {} },
  } as any as CasinoGameState
}

/** Wallet update reducer (mirrors casino-state.ts). */
function updateWallet(state: CasinoGameState, playerId: string, delta: number): CasinoGameState {
  return {
    ...state,
    wallet: {
      ...state.wallet,
      [playerId]: Math.max(0, (state.wallet[playerId] ?? 0) + delta),
    },
  }
}

/** Mark a player as busted. */
function markPlayerBusted(state: CasinoGameState, playerId: string): CasinoGameState {
  return {
    ...state,
    players: state.players.map((p: any) =>
      p.id === playerId ? { ...p, status: 'busted' } : p,
    ),
  }
}

/**
 * Full reducer map for phase context simulation.
 * Applies actual BJ reducers so state transitions are realistic.
 */
function createReducerMap(): Record<string, (...args: any[]) => CasinoGameState> {
  return {
    bjInitRound: (s, ids, rn) => bjReducers.bjInitRound(s, ids, rn),
    bjPlaceBet: (s, pid, amt) => bjReducers.bjPlaceBet(s, pid, amt),
    bjSetAllBetsPlaced: (s, v) => bjReducers.bjSetAllBetsPlaced(s, v),
    bjSetPlayerCards: (s, pid, cards, val, soft, bj) => bjReducers.bjSetPlayerCards(s, pid, cards, val, soft, bj),
    bjSetDealerCards: (s, cards, val, soft, bj) => bjReducers.bjSetDealerCards(s, cards, val, soft, bj),
    bjSetShoePenetration: (s, p) => bjReducers.bjSetShoePenetration(s, p),
    bjSetDealComplete: (s, v) => bjReducers.bjSetDealComplete(s, v),
    bjDeclineInsurance: (s, pid) => bjReducers.bjDeclineInsurance(s, pid),
    bjSetInsuranceBet: (s, pid, amt) => bjReducers.bjSetInsuranceBet(s, pid, amt),
    bjSetInsuranceComplete: (s, v) => bjReducers.bjSetInsuranceComplete(s, v),
    bjStandHand: (s, pid) => bjReducers.bjStandHand(s, pid),
    bjAdvanceTurn: (s) => bjReducers.bjAdvanceTurn(s),
    bjAdvanceHand: (s, pid) => bjReducers.bjAdvanceHand(s, pid),
    bjSetPlayerTurnsComplete: (s, v) => bjReducers.bjSetPlayerTurnsComplete(s, v),
    bjAddCardToHand: (s, pid, c, val, soft, bust) => bjReducers.bjAddCardToHand(s, pid, c, val, soft, bust),
    bjDoubleDown: (s, pid, c, val, soft, bust) => bjReducers.bjDoubleDown(s, pid, c, val, soft, bust),
    bjSurrender: (s, pid) => bjReducers.bjSurrender(s, pid),
    bjSplitHand: (s, pid, c1, c2, v1, s1, v2, s2) => bjReducers.bjSplitHand(s, pid, c1, c2, v1, s1, v2, s2),
    bjSetDealerFinalHand: (s, cards, val, soft, bust) => bjReducers.bjSetDealerFinalHand(s, cards, val, soft, bust),
    bjSetDealerTurnComplete: (s, v) => bjReducers.bjSetDealerTurnComplete(s, v),
    bjSetPlayerPayout: (s, pid, pay, net) => bjReducers.bjSetPlayerPayout(s, pid, pay, net),
    bjSetSettlementComplete: (s, v) => bjReducers.bjSetSettlementComplete(s, v),
    bjSetRoundCompleteReady: (s, v) => bjReducers.bjSetRoundCompleteReady(s, v),
    updateWallet: (s, pid, delta) => updateWallet(s, pid, delta),
    markPlayerBusted: (s, pid) => markPlayerBusted(s, pid),
    setDealerMessage: (s) => s,
    setBetError: (s) => s,
  }
}

/** Create a mock VGF phase context (onBegin/onEnd style). */
function createPhaseCtx(initialState: CasinoGameState) {
  const reducerMap = createReducerMap()
  let state = initialState

  const ctx = {
    getState: () => state,
    session: { sessionId: 'test-session', state },
    reducerDispatcher: (name: string, ...args: any[]) => {
      const fn = reducerMap[name]
      if (fn) {
        state = fn(state, ...args)
        ctx.session.state = state
      }
    },
  }

  return ctx
}

/** Create a mock VGF thunk context (dispatch style). */
function createThunkCtx(initialState: CasinoGameState) {
  const reducerMap = createReducerMap()
  let state = initialState

  const ctx: any = {
    getState: () => state,
    getSessionId: () => 'test-session',
    getMembers: () => [],
    getClientId: () => 'human1',
    dispatch: (name: string, ...args: unknown[]) => {
      const fn = reducerMap[name]
      if (fn) {
        state = fn(state, ...args as any[])
      }
    },
    dispatchThunk: async () => {},
    scheduler: null,
    logger: null,
  }

  return ctx
}

// ── Import phases & thunks (after mocks) ─────────────────────

let phases: any
let thunks: any

beforeEach(async () => {
  phases = await import('../bj-phases.js')
  thunks = (await import('../bj-thunks.js')).bjThunks
  // Reset shoe
  mockShoe = createDeterministicShoe([
    // Enough cards for dealing + hits
    card('5', 'hearts'), card('6', 'diamonds'), card('7', 'clubs'), card('8', 'spades'),
    card('9', 'hearts'), card('10', 'diamonds'), card('J', 'clubs'), card('Q', 'spades'),
    card('K', 'hearts'), card('A', 'diamonds'), card('2', 'clubs'), card('3', 'spades'),
    card('4', 'hearts'), card('5', 'diamonds'), card('6', 'clubs'), card('7', 'spades'),
    card('8', 'hearts'), card('9', 'diamonds'), card('10', 'clubs'), card('J', 'spades'),
    card('Q', 'hearts'), card('K', 'diamonds'), card('A', 'clubs'), card('2', 'spades'),
    card('3', 'hearts'), card('4', 'diamonds'), card('5', 'clubs'), card('6', 'spades'),
    card('7', 'hearts'), card('8', 'diamonds'), card('9', 'clubs'), card('10', 'spades'),
  ])
})

// ═══════════════════════════════════════════════════════════════
//  1. endIf precision — the "stand freeze" fix
// ═══════════════════════════════════════════════════════════════

describe('BJ_PLAYER_TURNS endIf', () => {
  it('does NOT fire when all hands are stood but playerTurnsComplete is false', () => {
    // This is the exact scenario that caused the stand-freeze bug.
    // All hands are stood (bots auto-stood), but the thunk hasn't set
    // playerTurnsComplete yet.
    const state = createTestState({ humanCount: 1, botCount: 1 })
    const ctx = createPhaseCtx(state)

    // Init round and set up dealt hands
    ctx.reducerDispatcher('bjInitRound', ['human1', 'bot1'], 1)
    ctx.reducerDispatcher('bjSetPlayerCards', 'human1', [card('10'), card('7')], 17, false, false)
    ctx.reducerDispatcher('bjSetPlayerCards', 'bot1', [card('9'), card('8')], 17, false, false)

    // Stand both hands but DON'T set playerTurnsComplete
    ctx.reducerDispatcher('bjStandHand', 'human1')
    ctx.reducerDispatcher('bjStandHand', 'bot1')

    const endIfCtx = { session: { state: ctx.getState() } }
    const result = phases.bjPlayerTurnsPhase.endIf(endIfCtx)

    // endIf should NOT fire — playerTurnsComplete is still false
    expect(result).toBe(false)
  })

  it('fires when playerTurnsComplete is explicitly set', () => {
    const state = createTestState({ humanCount: 1, botCount: 1 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['human1', 'bot1'], 1)
    ctx.reducerDispatcher('bjSetPlayerTurnsComplete', true)

    const endIfCtx = { session: { state: ctx.getState() } }
    expect(phases.bjPlayerTurnsPhase.endIf(endIfCtx)).toBe(true)
  })

  it('does not fire when blackjack state is missing', () => {
    const state = createTestState()
    const endIfCtx = { session: { state } }
    expect(phases.bjPlayerTurnsPhase.endIf(endIfCtx)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
//  2. Phase onBegin: bot auto-stand + playerTurnsComplete
// ═══════════════════════════════════════════════════════════════

describe('BJ_PLAYER_TURNS onBegin', () => {
  it('auto-stands all bots and sets playerTurnsComplete when only bots present', () => {
    const state = createTestState({ humanCount: 0, botCount: 3, walletAmount: 500 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['bot1', 'bot2', 'bot3'], 1)
    ctx.reducerDispatcher('bjSetPlayerCards', 'bot1', [card('10'), card('7')], 17, false, false)
    ctx.reducerDispatcher('bjSetPlayerCards', 'bot2', [card('9'), card('8')], 17, false, false)
    ctx.reducerDispatcher('bjSetPlayerCards', 'bot3', [card('J'), card('6')], 16, false, false)

    phases.bjPlayerTurnsPhase.onBegin(ctx)

    const finalState = ctx.getState()
    const bj = finalState.blackjack!

    // All bots should be stood
    for (const ps of bj.playerStates) {
      expect(ps.hands[0]!.stood).toBe(true)
    }
    // Turn index should be past all players
    expect(bj.currentTurnIndex).toBe(3)
    // playerTurnsComplete should be set
    expect(bj.playerTurnsComplete).toBe(true)
  })

  it('stops at first human player and does NOT set playerTurnsComplete', () => {
    const state = createTestState({ humanCount: 1, botCount: 1 })
    const ctx = createPhaseCtx(state)

    // Turn order: human1, bot1
    ctx.reducerDispatcher('bjInitRound', ['human1', 'bot1'], 1)
    ctx.reducerDispatcher('bjSetPlayerCards', 'human1', [card('10'), card('7')], 17, false, false)
    ctx.reducerDispatcher('bjSetPlayerCards', 'bot1', [card('9'), card('8')], 17, false, false)

    phases.bjPlayerTurnsPhase.onBegin(ctx)

    const finalState = ctx.getState()
    const bj = finalState.blackjack!

    // Human not stood (waiting for input)
    expect(bj.playerStates[0]!.hands[0]!.stood).toBe(false)
    // Bot not stood yet (comes after human)
    expect(bj.playerStates[1]!.hands[0]!.stood).toBe(false)
    // Still at turn 0 (human's turn)
    expect(bj.currentTurnIndex).toBe(0)
    expect(bj.playerTurnsComplete).toBe(false)
  })

  it('auto-stands leading bots, stops at human', () => {
    const state = createTestState({ humanCount: 1, botCount: 2 })
    const ctx = createPhaseCtx(state)

    // Turn order: bot1, bot2, human1
    ctx.reducerDispatcher('bjInitRound', ['bot1', 'bot2', 'human1'], 1)
    ctx.reducerDispatcher('bjSetPlayerCards', 'bot1', [card('10'), card('7')], 17, false, false)
    ctx.reducerDispatcher('bjSetPlayerCards', 'bot2', [card('9'), card('8')], 17, false, false)
    ctx.reducerDispatcher('bjSetPlayerCards', 'human1', [card('J'), card('6')], 16, false, false)

    phases.bjPlayerTurnsPhase.onBegin(ctx)

    const finalState = ctx.getState()
    const bj = finalState.blackjack!

    // Both bots stood
    expect(bj.playerStates[0]!.hands[0]!.stood).toBe(true)
    expect(bj.playerStates[1]!.hands[0]!.stood).toBe(true)
    // Human NOT stood
    expect(bj.playerStates[2]!.hands[0]!.stood).toBe(false)
    // Turn index at human (index 2)
    expect(bj.currentTurnIndex).toBe(2)
    expect(bj.playerTurnsComplete).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
//  3. Thunk: inlineCheckAdvance — bot handling after human stand
// ═══════════════════════════════════════════════════════════════

describe('bjStand thunk + inlineCheckAdvance', () => {
  it('human stands, bots auto-stood, playerTurnsComplete set (no freeze)', async () => {
    const state = createTestState({ humanCount: 1, botCount: 2 })
    const ctx = createThunkCtx(state)

    // Init round with turn order: human1, bot1, bot2
    ctx.dispatch('bjInitRound', ['human1', 'bot1', 'bot2'], 1)
    ctx.dispatch('bjSetPlayerCards', 'human1', [card('10'), card('7')], 17, false, false)
    ctx.dispatch('bjSetPlayerCards', 'bot1', [card('9'), card('8')], 17, false, false)
    ctx.dispatch('bjSetPlayerCards', 'bot2', [card('J'), card('6')], 16, false, false)

    // Human stands — this should auto-stand both bots and complete
    await thunks.bjStand(ctx, 'human1')

    const finalState = ctx.getState()
    const bj = finalState.blackjack!

    // Human hand stood
    expect(bj.playerStates[0]!.hands[0]!.stood).toBe(true)
    // Both bots stood
    expect(bj.playerStates[1]!.hands[0]!.stood).toBe(true)
    expect(bj.playerStates[2]!.hands[0]!.stood).toBe(true)
    // playerTurnsComplete flag set
    expect(bj.playerTurnsComplete).toBe(true)
    // Turn index past all players
    expect(bj.currentTurnIndex).toBe(3)
  })

  it('human stands as last player, sets playerTurnsComplete', async () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1'], 1)
    ctx.dispatch('bjSetPlayerCards', 'human1', [card('10'), card('7')], 17, false, false)

    await thunks.bjStand(ctx, 'human1')

    const bj = ctx.getState().blackjack!
    expect(bj.playerStates[0]!.hands[0]!.stood).toBe(true)
    expect(bj.playerTurnsComplete).toBe(true)
  })

  it('human stands with human after — does NOT set playerTurnsComplete', async () => {
    const state = createTestState({ humanCount: 2, botCount: 0 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1', 'human2'], 1)
    ctx.dispatch('bjSetPlayerCards', 'human1', [card('10'), card('7')], 17, false, false)
    ctx.dispatch('bjSetPlayerCards', 'human2', [card('9'), card('8')], 17, false, false)

    await thunks.bjStand(ctx, 'human1')

    const bj = ctx.getState().blackjack!
    expect(bj.playerStates[0]!.hands[0]!.stood).toBe(true)
    expect(bj.playerStates[1]!.hands[0]!.stood).toBe(false) // human2 not yet acted
    expect(bj.playerTurnsComplete).toBe(false)
    expect(bj.currentTurnIndex).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════
//  4. bjHit thunk — hitting and busting
// ═══════════════════════════════════════════════════════════════

describe('bjHit thunk', () => {
  it('adds a card to the player hand', async () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1'], 1)
    ctx.dispatch('bjSetPlayerCards', 'human1', [card('5'), card('6')], 11, false, false)

    // Shoe has a 5 at position 0
    mockShoe = [card('5', 'hearts'), card('10', 'diamonds')]

    await thunks.bjHit(ctx, 'human1')

    const bj = ctx.getState().blackjack!
    const hand = bj.playerStates[0]!.hands[0]!
    expect(hand.cards.length).toBe(3)
    expect(hand.busted).toBe(false)
    // Player should still be able to act (not auto-advanced)
    expect(bj.playerTurnsComplete).toBe(false)
  })

  it('auto-advances when hitting to 21', async () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1'], 1)
    ctx.dispatch('bjSetPlayerCards', 'human1', [card('5'), card('6')], 11, false, false)

    mockShoe = [card('10', 'hearts')]

    await thunks.bjHit(ctx, 'human1')

    const bj = ctx.getState().blackjack!
    // Should auto-advance since value = 21
    expect(bj.playerTurnsComplete).toBe(true)
  })

  it('auto-advances on bust', async () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1'], 1)
    ctx.dispatch('bjSetPlayerCards', 'human1', [card('10'), card('7')], 17, false, false)

    mockShoe = [card('K', 'hearts')]

    await thunks.bjHit(ctx, 'human1')

    const bj = ctx.getState().blackjack!
    const hand = bj.playerStates[0]!.hands[0]!
    expect(hand.busted).toBe(true)
    expect(hand.stood).toBe(true) // auto-stood on bust
    expect(bj.playerTurnsComplete).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
//  5. Full phase flow: PLACE_BETS → DEAL → INSURANCE → PLAYER_TURNS
// ═══════════════════════════════════════════════════════════════

describe('Full BJ phase flow', () => {
  it('PLACE_BETS → endIf fires after all bets placed', () => {
    const state = createTestState({ humanCount: 1, botCount: 1 })
    const ctx = createPhaseCtx(state)

    phases.bjPlaceBetsPhase.onBegin(ctx)

    // Bot bet placed, human hasn't bet yet
    let endIfCtx = { session: { state: ctx.getState() } }
    expect(phases.bjPlaceBetsPhase.endIf(endIfCtx)).toBe(false)

    // Human places bet
    ctx.reducerDispatcher('bjPlaceBet', 'human1', 50)
    ctx.reducerDispatcher('bjSetAllBetsPlaced', true)

    endIfCtx = { session: { state: ctx.getState() } }
    expect(phases.bjPlaceBetsPhase.endIf(endIfCtx)).toBe(true)
    expect(phases.bjPlaceBetsPhase.next).toBe(CasinoPhase.BjDealInitial)
  })

  it('DEAL_INITIAL → deals cards and deducts wallets', () => {
    const state = createTestState({ humanCount: 1, botCount: 1 })
    const ctx = createPhaseCtx(state)

    // Set up bets
    ctx.reducerDispatcher('bjInitRound', ['human1', 'bot1'], 1)
    ctx.reducerDispatcher('bjPlaceBet', 'human1', 50)
    ctx.reducerDispatcher('bjPlaceBet', 'bot1', 10)

    phases.bjDealInitialPhase.onBegin(ctx)

    const afterDeal = ctx.getState()
    expect(afterDeal.wallet['human1']).toBe(950) // 1000 - 50
    expect(afterDeal.wallet['bot1']).toBe(990) // 1000 - 10
    expect(afterDeal.blackjack!.dealComplete).toBe(true)

    // Each player should have 2 cards
    for (const ps of afterDeal.blackjack!.playerStates) {
      expect(ps.hands[0]!.cards.length).toBe(2)
    }
    // Dealer should have 2 cards
    expect(afterDeal.blackjack!.dealerHand.cards.length).toBe(2)

    const endIfCtx = { session: { state: afterDeal } }
    expect(phases.bjDealInitialPhase.endIf(endIfCtx)).toBe(true)
    expect(phases.bjDealInitialPhase.next).toBe(CasinoPhase.BjInsurance)
  })

  it('INSURANCE → skips when dealer does not show Ace', () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['human1'], 1)
    // Dealer's first card is a 10, not Ace
    ctx.reducerDispatcher('bjSetDealerCards', [card('10'), card('7')], 17, false, false)

    phases.bjInsurancePhase.onBegin(ctx)

    const afterIns = ctx.getState()
    expect(afterIns.blackjack!.insuranceComplete).toBe(true)
    expect(afterIns.blackjack!.playerStates[0]!.insuranceResolved).toBe(true)
  })

  it('INSURANCE → offers when dealer shows Ace', () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['human1'], 1)
    // Dealer's first card is Ace
    ctx.reducerDispatcher('bjSetDealerCards', [card('A'), card('7')], 18, true, false)

    phases.bjInsurancePhase.onBegin(ctx)

    const afterIns = ctx.getState()
    // Insurance NOT yet complete — waiting for player input
    expect(afterIns.blackjack!.insuranceComplete).toBe(false)
    expect(afterIns.blackjack!.playerStates[0]!.insuranceResolved).toBe(false)
  })

  it('INSURANCE → next goes to DEALER_TURN when dealer has blackjack', () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['human1'], 1)
    ctx.reducerDispatcher('bjSetDealerCards', [card('A'), card('K')], 21, true, true) // BJ

    const nextCtx = { session: { state: ctx.getState() } }
    expect(phases.bjInsurancePhase.next(nextCtx)).toBe(CasinoPhase.BjDealerTurn)
  })

  it('INSURANCE → next goes to PLAYER_TURNS normally', () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['human1'], 1)
    ctx.reducerDispatcher('bjSetPlayerCards', 'human1', [card('10'), card('7')], 17, false, false)
    ctx.reducerDispatcher('bjSetDealerCards', [card('10'), card('7')], 17, false, false) // No BJ

    const nextCtx = { session: { state: ctx.getState() } }
    expect(phases.bjInsurancePhase.next(nextCtx)).toBe(CasinoPhase.BjPlayerTurns)
  })
})

// ═══════════════════════════════════════════════════════════════
//  6. DEALER_TURN + SETTLEMENT + HAND_COMPLETE
// ═══════════════════════════════════════════════════════════════

describe('Dealer turn and settlement phases', () => {
  it('DEALER_TURN → dealer plays out hand', () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['human1'], 1)
    ctx.reducerDispatcher('bjSetPlayerCards', 'human1', [card('10'), card('8')], 18, false, false)
    ctx.reducerDispatcher('bjSetDealerCards', [card('10'), card('6')], 16, false, false)

    // Shoe for dealer to draw from
    mockShoe = [card('3', 'hearts'), card('10', 'diamonds')]

    phases.bjDealerTurnPhase.onBegin(ctx)

    const afterDealer = ctx.getState()
    expect(afterDealer.blackjack!.dealerTurnComplete).toBe(true)
    expect(afterDealer.blackjack!.dealerHand.holeCardRevealed).toBe(true)
    // Dealer had 16, drew 3 → 19, stands
    expect(afterDealer.blackjack!.dealerHand.value).toBe(19)
  })

  it('DEALER_TURN → skips dealing when all players busted', () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['human1'], 1)
    // Player busted
    ctx.reducerDispatcher('bjSetPlayerCards', 'human1', [card('10'), card('7')], 17, false, false)
    ctx.reducerDispatcher('bjAddCardToHand', 'human1', card('K'), 27, false, true)
    // Dealer has 16 but shouldn't draw
    ctx.reducerDispatcher('bjSetDealerCards', [card('10'), card('6')], 16, false, false)

    mockShoe = [card('5', 'hearts')]

    phases.bjDealerTurnPhase.onBegin(ctx)

    const afterDealer = ctx.getState()
    // Dealer should still have just 2 cards (didn't draw)
    expect(afterDealer.blackjack!.dealerHand.cards.length).toBe(2)
    expect(afterDealer.blackjack!.dealerTurnComplete).toBe(true)
  })

  it('SETTLEMENT → calculates payouts correctly for win', () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['human1'], 1)
    ctx.reducerDispatcher('bjPlaceBet', 'human1', 100)
    // Player has 20, dealer has 18 → player wins
    ctx.reducerDispatcher('bjSetPlayerCards', 'human1', [card('10'), card('Q')], 20, false, false)
    ctx.reducerDispatcher('bjSetDealerCards', [card('10'), card('8')], 18, false, false)
    ctx.reducerDispatcher('bjSetDealerFinalHand', [card('10'), card('8')], 18, false, false)

    // Start with wallet 1000, bet was 100 (not deducted in this phase)
    phases.bjSettlementPhase.onBegin(ctx)

    const afterSettle = ctx.getState()
    const ps = afterSettle.blackjack!.playerStates[0]!
    // Win: returns bet + payout (100 + 100 = 200)
    expect(ps.totalPayout).toBe(200)
    expect(ps.roundResult).toBeGreaterThan(0)
    expect(afterSettle.blackjack!.settlementComplete).toBe(true)
  })

  it('SETTLEMENT → push returns bet', () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['human1'], 1)
    ctx.reducerDispatcher('bjPlaceBet', 'human1', 100)
    ctx.reducerDispatcher('bjSetPlayerCards', 'human1', [card('10'), card('8')], 18, false, false)
    ctx.reducerDispatcher('bjSetDealerCards', [card('10'), card('8')], 18, false, false)
    ctx.reducerDispatcher('bjSetDealerFinalHand', [card('10'), card('8')], 18, false, false)

    phases.bjSettlementPhase.onBegin(ctx)

    const ps = ctx.getState().blackjack!.playerStates[0]!
    // Push: bet returned (100)
    expect(ps.totalPayout).toBe(100)
    expect(ps.roundResult).toBe(0) // net zero
  })

  it('SETTLEMENT → loss returns nothing', () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['human1'], 1)
    ctx.reducerDispatcher('bjPlaceBet', 'human1', 100)
    ctx.reducerDispatcher('bjSetPlayerCards', 'human1', [card('10'), card('7')], 17, false, false)
    ctx.reducerDispatcher('bjSetDealerCards', [card('10'), card('9')], 19, false, false)
    ctx.reducerDispatcher('bjSetDealerFinalHand', [card('10'), card('9')], 19, false, false)

    phases.bjSettlementPhase.onBegin(ctx)

    const ps = ctx.getState().blackjack!.playerStates[0]!
    expect(ps.totalPayout).toBe(0)
    expect(ps.roundResult).toBe(-100)
  })

  it('SETTLEMENT → blackjack pays 3:2', () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['human1'], 1)
    ctx.reducerDispatcher('bjPlaceBet', 'human1', 100)
    ctx.reducerDispatcher('bjSetPlayerCards', 'human1', [card('A'), card('K')], 21, true, true)
    ctx.reducerDispatcher('bjSetDealerCards', [card('10'), card('8')], 18, false, false)
    ctx.reducerDispatcher('bjSetDealerFinalHand', [card('10'), card('8')], 18, false, false)

    phases.bjSettlementPhase.onBegin(ctx)

    const ps = ctx.getState().blackjack!.playerStates[0]!
    // BJ: bet (100) + payout (150) = 250
    expect(ps.totalPayout).toBe(250)
  })

  it('HAND_COMPLETE → waits for human to tap Next Round', () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['human1'], 1)

    phases.bjHandCompletePhase.onBegin(ctx)

    // With humans present, roundCompleteReady should NOT be auto-set
    expect(ctx.getState().blackjack!.roundCompleteReady).toBe(false)

    // Simulate human tapping "Next Round" button
    ctx.reducerDispatcher('bjSetRoundCompleteReady', true)
    expect(ctx.getState().blackjack!.roundCompleteReady).toBe(true)

    const nextCtx = { session: { state: ctx.getState() } }
    expect(phases.bjHandCompletePhase.next(nextCtx)).toBe(CasinoPhase.BjPlaceBets)
  })
})

// ═══════════════════════════════════════════════════════════════
//  7. Thunk validation guards
// ═══════════════════════════════════════════════════════════════

describe('BJ thunk validation', () => {
  it('bjPlaceBet rejects invalid amounts', async () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1'], 1)

    // Negative amount
    await thunks.bjPlaceBet(ctx, 'human1', -10)
    expect(ctx.getState().blackjack!.playerStates[0]!.hands[0]!.bet).toBe(0)

    // Zero
    await thunks.bjPlaceBet(ctx, 'human1', 0)
    expect(ctx.getState().blackjack!.playerStates[0]!.hands[0]!.bet).toBe(0)

    // Below min (minBet = 10)
    await thunks.bjPlaceBet(ctx, 'human1', 5)
    expect(ctx.getState().blackjack!.playerStates[0]!.hands[0]!.bet).toBe(0)

    // Above max (maxBet = 500)
    await thunks.bjPlaceBet(ctx, 'human1', 600)
    expect(ctx.getState().blackjack!.playerStates[0]!.hands[0]!.bet).toBe(0)
  })

  it('bjPlaceBet rejects when wallet insufficient', async () => {
    const state = createTestState({ humanCount: 1, botCount: 0, walletAmount: 20 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1'], 1)

    await thunks.bjPlaceBet(ctx, 'human1', 100)
    expect(ctx.getState().blackjack!.playerStates[0]!.hands[0]!.bet).toBe(0)
  })

  it('bjPlaceBet accepts valid amount', async () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1'], 1)

    await thunks.bjPlaceBet(ctx, 'human1', 50)
    expect(ctx.getState().blackjack!.playerStates[0]!.hands[0]!.bet).toBe(50)
  })

  it('bjHit does nothing when hand is already stood', async () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1'], 1)
    ctx.dispatch('bjSetPlayerCards', 'human1', [card('10'), card('7')], 17, false, false)
    ctx.dispatch('bjStandHand', 'human1')

    mockShoe = [card('3')]

    await thunks.bjHit(ctx, 'human1')

    // Should still have 2 cards (hit rejected)
    expect(ctx.getState().blackjack!.playerStates[0]!.hands[0]!.cards.length).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════
//  8. Double down thunk
// ═══════════════════════════════════════════════════════════════

describe('bjDoubleDown thunk', () => {
  it('doubles bet, adds one card, and auto-advances', async () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1'], 1)
    ctx.dispatch('bjPlaceBet', 'human1', 100)
    ctx.dispatch('bjSetPlayerCards', 'human1', [card('5'), card('6')], 11, false, false)

    mockShoe = [card('10')]

    await thunks.bjDoubleDown(ctx, 'human1')

    const bj = ctx.getState().blackjack!
    const hand = bj.playerStates[0]!.hands[0]!
    expect(hand.cards.length).toBe(3)
    expect(hand.doubled).toBe(true)
    expect(hand.stood).toBe(true)
    // Wallet deducted additional bet: 1000 - 100 (extra bet for double)
    expect(ctx.getState().wallet['human1']).toBe(900)
    // Should complete since only player
    expect(bj.playerTurnsComplete).toBe(true)
  })

  it('rejects when wallet insufficient for double', async () => {
    const state = createTestState({ humanCount: 1, botCount: 0, walletAmount: 100 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1'], 1)
    ctx.dispatch('bjPlaceBet', 'human1', 100)
    ctx.dispatch('bjSetPlayerCards', 'human1', [card('5'), card('6')], 11, false, false)
    // Wallet is now 100, bet is 100, need another 100 but only have 100
    // Actually the wallet check is: activeHand.bet > walletBalance
    // bet = 100, wallet = 100 → NOT insufficient (100 > 100 is false)
    // Let's set wallet lower
    ctx.dispatch('updateWallet', 'human1', -50) // wallet now 50

    mockShoe = [card('10')]

    await thunks.bjDoubleDown(ctx, 'human1')

    // Hand should NOT be doubled (rejected)
    const hand = ctx.getState().blackjack!.playerStates[0]!.hands[0]!
    expect(hand.doubled).toBe(false)
    expect(hand.cards.length).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════
//  9. Surrender thunk
// ═══════════════════════════════════════════════════════════════

describe('bjSurrender thunk', () => {
  it('marks player as surrendered and auto-advances', async () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1'], 1)
    ctx.dispatch('bjSetPlayerCards', 'human1', [card('10'), card('6')], 16, false, false)

    await thunks.bjSurrender(ctx, 'human1')

    const bj = ctx.getState().blackjack!
    expect(bj.playerStates[0]!.surrendered).toBe(true)
    expect(bj.playerStates[0]!.hands[0]!.stood).toBe(true)
    expect(bj.playerTurnsComplete).toBe(true)
  })

  it('rejects surrender after hit (3+ cards)', async () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1'], 1)
    ctx.dispatch('bjSetPlayerCards', 'human1', [card('5'), card('6')], 11, false, false)
    ctx.dispatch('bjAddCardToHand', 'human1', card('3'), 14, false, false)

    await thunks.bjSurrender(ctx, 'human1')

    // Should NOT be surrendered (3 cards)
    expect(ctx.getState().blackjack!.playerStates[0]!.surrendered).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
//  10. Insurance thunk
// ═══════════════════════════════════════════════════════════════

describe('bjProcessInsurance thunk', () => {
  it('takes insurance when wallet sufficient', async () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1'], 1)
    ctx.dispatch('bjPlaceBet', 'human1', 100)
    ctx.dispatch('bjSetPlayerCards', 'human1', [card('10'), card('8')], 18, false, false)

    await thunks.bjProcessInsurance(ctx, 'human1', true)

    const bj = ctx.getState().blackjack!
    expect(bj.playerStates[0]!.insuranceBet).toBe(50) // half of 100
    expect(bj.playerStates[0]!.insuranceResolved).toBe(true)
    // Wallet deducted
    expect(ctx.getState().wallet['human1']).toBe(950)
  })

  it('declines insurance', async () => {
    const state = createTestState({ humanCount: 1, botCount: 0 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1'], 1)
    ctx.dispatch('bjPlaceBet', 'human1', 100)

    await thunks.bjProcessInsurance(ctx, 'human1', false)

    const bj = ctx.getState().blackjack!
    expect(bj.playerStates[0]!.insuranceBet).toBe(0)
    expect(bj.playerStates[0]!.insuranceResolved).toBe(true)
  })

  it('sets insuranceComplete when all players resolved', async () => {
    const state = createTestState({ humanCount: 2, botCount: 0 })
    const ctx = createThunkCtx(state)

    ctx.dispatch('bjInitRound', ['human1', 'human2'], 1)
    ctx.dispatch('bjPlaceBet', 'human1', 100)
    ctx.dispatch('bjPlaceBet', 'human2', 100)

    await thunks.bjProcessInsurance(ctx, 'human1', false)
    expect(ctx.getState().blackjack!.insuranceComplete).toBe(false)

    // Switch client identity for second player's action
    ctx.getClientId = () => 'human2'
    await thunks.bjProcessInsurance(ctx, 'human2', false)
    expect(ctx.getState().blackjack!.insuranceComplete).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
//  11. All endIf conditions
// ═══════════════════════════════════════════════════════════════

describe('All BJ endIf conditions', () => {
  function makeEndIfCtx(bj: Partial<BlackjackGameState>): any {
    return {
      session: {
        state: { blackjack: { ...createDefaultBj(), ...bj } } as any,
      },
    }
  }

  function createDefaultBj(): BlackjackGameState {
    return {
      playerStates: [],
      dealerHand: { cards: [], holeCardRevealed: false, value: 0, isSoft: false, busted: false, isBlackjack: false },
      turnOrder: [],
      currentTurnIndex: 0,
      allBetsPlaced: false,
      dealComplete: false,
      insuranceComplete: false,
      playerTurnsComplete: false,
      dealerTurnComplete: false,
      settlementComplete: false,
      roundCompleteReady: false,
      roundNumber: 1,
      shoePenetration: 0,
      config: {
        minBet: 10, maxBet: 500, dealerHitsSoft17: false, numberOfDecks: 6,
        reshuffleThreshold: 0.75, blackjackPaysRatio: 1.5, insuranceEnabled: true,
        surrenderEnabled: true, splitEnabled: true, maxSplits: 3,
      },
    }
  }

  it('BJ_PLACE_BETS endIf: checks allBetsPlaced', () => {
    expect(phases.bjPlaceBetsPhase.endIf(makeEndIfCtx({ allBetsPlaced: false }))).toBe(false)
    expect(phases.bjPlaceBetsPhase.endIf(makeEndIfCtx({ allBetsPlaced: true }))).toBe(true)
  })

  it('BJ_DEAL_INITIAL endIf: checks dealComplete', () => {
    expect(phases.bjDealInitialPhase.endIf(makeEndIfCtx({ dealComplete: false }))).toBe(false)
    expect(phases.bjDealInitialPhase.endIf(makeEndIfCtx({ dealComplete: true }))).toBe(true)
  })

  it('BJ_INSURANCE endIf: checks insuranceComplete', () => {
    expect(phases.bjInsurancePhase.endIf(makeEndIfCtx({ insuranceComplete: false }))).toBe(false)
    expect(phases.bjInsurancePhase.endIf(makeEndIfCtx({ insuranceComplete: true }))).toBe(true)
  })

  it('BJ_PLAYER_TURNS endIf: ONLY checks playerTurnsComplete', () => {
    expect(phases.bjPlayerTurnsPhase.endIf(makeEndIfCtx({ playerTurnsComplete: false }))).toBe(false)
    expect(phases.bjPlayerTurnsPhase.endIf(makeEndIfCtx({ playerTurnsComplete: true }))).toBe(true)
  })

  it('BJ_DEALER_TURN endIf: checks dealerTurnComplete', () => {
    expect(phases.bjDealerTurnPhase.endIf(makeEndIfCtx({ dealerTurnComplete: false }))).toBe(false)
    expect(phases.bjDealerTurnPhase.endIf(makeEndIfCtx({ dealerTurnComplete: true }))).toBe(true)
  })

  it('BJ_SETTLEMENT endIf: checks settlementComplete', () => {
    expect(phases.bjSettlementPhase.endIf(makeEndIfCtx({ settlementComplete: false }))).toBe(false)
    expect(phases.bjSettlementPhase.endIf(makeEndIfCtx({ settlementComplete: true }))).toBe(true)
  })

  it('BJ_HAND_COMPLETE endIf: checks roundCompleteReady', () => {
    expect(phases.bjHandCompletePhase.endIf(makeEndIfCtx({ roundCompleteReady: false }))).toBe(false)
    expect(phases.bjHandCompletePhase.endIf(makeEndIfCtx({ roundCompleteReady: true }))).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
//  12. OOM prevention — infinite phase cascade when only bots remain
// ═══════════════════════════════════════════════════════════════

describe('BJ infinite cascade prevention (OOM fix)', () => {
  it('HAND_COMPLETE → routes to GAME_SELECT when all humans are busted', () => {
    const state = createTestState({ humanCount: 1, botCount: 2 })
    const ctx = createPhaseCtx(state)

    // Mark the human as busted (wallet depleted)
    ctx.reducerDispatcher('markPlayerBusted', 'human1')

    ctx.reducerDispatcher('bjInitRound', ['bot1', 'bot2'], 1)
    phases.bjHandCompletePhase.onBegin(ctx)

    const nextCtx = { session: { state: ctx.getState() } }
    const nextPhase = phases.bjHandCompletePhase.next(nextCtx)

    // Should go to GAME_SELECT, NOT loop back to BjPlaceBets
    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })

  it('HAND_COMPLETE → routes to GAME_SELECT when all players are bots (no humans)', () => {
    const state = createTestState({ humanCount: 0, botCount: 3 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['bot1', 'bot2', 'bot3'], 1)
    phases.bjHandCompletePhase.onBegin(ctx)

    const nextCtx = { session: { state: ctx.getState() } }
    const nextPhase = phases.bjHandCompletePhase.next(nextCtx)

    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })

  it('HAND_COMPLETE → still loops to PLACE_BETS when active humans remain', () => {
    const state = createTestState({ humanCount: 2, botCount: 1 })
    const ctx = createPhaseCtx(state)

    // Mark one human busted, but human2 is still active
    ctx.reducerDispatcher('markPlayerBusted', 'human1')

    ctx.reducerDispatcher('bjInitRound', ['human2', 'bot1'], 1)
    phases.bjHandCompletePhase.onBegin(ctx)

    const nextCtx = { session: { state: ctx.getState() } }
    const nextPhase = phases.bjHandCompletePhase.next(nextCtx)

    // Should still loop — human2 is still active
    expect(nextPhase).toBe(CasinoPhase.BjPlaceBets)
  })

  it('full phase cascade does NOT loop infinitely when only bots remain', () => {
    // Simulate the full cascade: PlaceBets → Deal → Insurance → PlayerTurns
    //   → DealerTurn → Settlement → HandComplete
    // With all humans busted, HandComplete.next must NOT return BjPlaceBets.
    const state = createTestState({ humanCount: 1, botCount: 1 })
    const ctx = createPhaseCtx(state)

    // Human goes busted (wallet = 0)
    ctx.reducerDispatcher('markPlayerBusted', 'human1')

    let cascadeCount = 0
    const MAX_CASCADES = 5

    // Simulate what VGF does: run phase cascade
    while (cascadeCount < MAX_CASCADES) {
      cascadeCount++

      // PlaceBets — only bots remain
      phases.bjPlaceBetsPhase.onBegin(ctx)

      // DealInitial
      mockShoe = createDeterministicShoe([
        card('5', 'hearts'), card('6', 'diamonds'), card('7', 'clubs'), card('8', 'spades'),
        card('9', 'hearts'), card('10', 'diamonds'), card('J', 'clubs'), card('Q', 'spades'),
        card('K', 'hearts'), card('A', 'diamonds'), card('2', 'clubs'), card('3', 'spades'),
        card('4', 'hearts'), card('5', 'diamonds'), card('6', 'clubs'), card('7', 'spades'),
      ])
      phases.bjDealInitialPhase.onBegin(ctx)

      // Insurance — skip (no ace shown)
      phases.bjInsurancePhase.onBegin(ctx)

      // PlayerTurns — bots auto-stand
      phases.bjPlayerTurnsPhase.onBegin(ctx)

      // DealerTurn
      mockShoe = [card('3', 'hearts'), card('10', 'diamonds'), card('5', 'clubs')]
      phases.bjDealerTurnPhase.onBegin(ctx)

      // Settlement
      phases.bjSettlementPhase.onBegin(ctx)

      // HandComplete
      phases.bjHandCompletePhase.onBegin(ctx)

      // Check next phase — should be GAME_SELECT, breaking the loop
      const nextCtx = { session: { state: ctx.getState() } }
      const nextPhase = phases.bjHandCompletePhase.next(nextCtx)

      if (nextPhase !== CasinoPhase.BjPlaceBets) {
        // Good — the cascade stopped
        expect(nextPhase).toBe(CasinoPhase.GameSelect)
        break
      }
    }

    // If we got here via the break, cascadeCount should be 1
    // If the loop ran MAX_CASCADES times, the fix is not working
    expect(cascadeCount).toBeLessThan(MAX_CASCADES)
  })
})

// ═══════════════════════════════════════════════════════════════
//  13. BJ multi-round game loop
// ═══════════════════════════════════════════════════════════════

describe('BJ multi-round game loop', () => {
  /**
   * Standard shoe for dealing: gives everyone mundane non-blackjack hands.
   * Deal order for 2 players: p1-card1, p2-card1, dealer-card1, p1-card2, p2-card2, dealer-card2
   */
  function standardDealShoe(): Card[] {
    return [
      card('9', 'hearts'), card('8', 'diamonds'),   // p1 card1, p2/bot card1
      card('10', 'clubs'),                            // dealer card1
      card('7', 'spades'), card('6', 'hearts'),      // p1 card2, p2/bot card2
      card('10', 'diamonds'),                         // dealer card2
      // Extra cards for hits
      card('3', 'clubs'), card('4', 'spades'), card('5', 'hearts'),
      card('6', 'diamonds'), card('7', 'clubs'), card('8', 'spades'),
    ]
  }

  it('completes a full round — human busts, bot stands', async () => {
    const state = createTestState({ humanCount: 1, botCount: 1, walletAmount: 500 })
    const ctx = createPhaseCtx(state)

    // Deal shoe: human gets 9+7=16, bot gets 8+6=14, dealer gets 10+10=20
    const dealShoe = [
      card('9', 'hearts'), card('8', 'diamonds'),  // human card1, bot card1
      card('10', 'clubs'),                           // dealer card1
      card('7', 'spades'), card('6', 'hearts'),     // human card2, bot card2
      card('10', 'diamonds'),                        // dealer card2
    ]

    // ── PLACE_BETS ──
    phases.bjPlaceBetsPhase.onBegin(ctx)
    ctx.reducerDispatcher('bjPlaceBet', 'human1', 50)
    ctx.reducerDispatcher('bjSetAllBetsPlaced', true)

    // ── DEAL_INITIAL ──
    mockShoe = [...dealShoe]
    phases.bjDealInitialPhase.onBegin(ctx)

    const afterDeal = ctx.getState()
    expect(afterDeal.blackjack!.dealComplete).toBe(true)
    expect(afterDeal.wallet['human1']).toBe(450) // 500 - 50

    // ── INSURANCE ──
    phases.bjInsurancePhase.onBegin(ctx)
    expect(ctx.getState().blackjack!.insuranceComplete).toBe(true)

    // ── PLAYER_TURNS: human hits and busts ──
    phases.bjPlayerTurnsPhase.onBegin(ctx)

    // Human has 9+7=16. Hit with K → 26 (bust)
    mockShoe = [card('K', 'hearts')]
    const thunkCtxState = ctx.getState()
    const tCtx = createThunkCtx(thunkCtxState)
    await thunks.bjHit(tCtx, 'human1')

    // Copy thunk state back to phase ctx
    const afterHit = tCtx.getState()
    const afterHitBj = afterHit.blackjack!
    expect(afterHitBj.playerStates[0]!.hands[0]!.busted).toBe(true)
    expect(afterHitBj.playerTurnsComplete).toBe(true)

    // Apply state to phase context by re-creating it
    const ctx2 = createPhaseCtx(afterHit)

    // ── DEALER_TURN ──
    mockShoe = [card('3', 'clubs')]
    phases.bjDealerTurnPhase.onBegin(ctx2)
    expect(ctx2.getState().blackjack!.dealerTurnComplete).toBe(true)

    // ── SETTLEMENT ──
    phases.bjSettlementPhase.onBegin(ctx2)
    expect(ctx2.getState().blackjack!.settlementComplete).toBe(true)

    // ── HAND_COMPLETE ──
    phases.bjHandCompletePhase.onBegin(ctx2)
    // Human present — waits for "Next Round" tap
    expect(ctx2.getState().blackjack!.roundCompleteReady).toBe(false)
    ctx2.reducerDispatcher('bjSetRoundCompleteReady', true)
    expect(ctx2.getState().blackjack!.roundCompleteReady).toBe(true)

    // Next phase should loop back to BJ_PLACE_BETS (human still has money)
    const nextCtx = { session: { state: ctx2.getState() } }
    const nextPhase = phases.bjHandCompletePhase.next(nextCtx)
    expect(nextPhase).toBe(CasinoPhase.BjPlaceBets)
  })

  it('completes a full round — human stands', async () => {
    const state = createTestState({ humanCount: 1, botCount: 1, walletAmount: 500 })
    const ctx = createPhaseCtx(state)

    // Deal: human gets 10+8=18, bot gets 9+7=16, dealer gets 6+10=16
    const dealShoe = [
      card('10', 'hearts'), card('9', 'diamonds'),
      card('6', 'clubs'),
      card('8', 'spades'), card('7', 'hearts'),
      card('10', 'diamonds'),
    ]

    // ── PLACE_BETS ──
    phases.bjPlaceBetsPhase.onBegin(ctx)
    ctx.reducerDispatcher('bjPlaceBet', 'human1', 100)
    ctx.reducerDispatcher('bjSetAllBetsPlaced', true)

    // ── DEAL_INITIAL ──
    mockShoe = [...dealShoe]
    phases.bjDealInitialPhase.onBegin(ctx)

    // ── INSURANCE ──
    phases.bjInsurancePhase.onBegin(ctx)

    // ── PLAYER_TURNS: human stands ──
    phases.bjPlayerTurnsPhase.onBegin(ctx)

    const tCtx = createThunkCtx(ctx.getState())
    await thunks.bjStand(tCtx, 'human1')

    const afterStand = tCtx.getState()
    expect(afterStand.blackjack!.playerTurnsComplete).toBe(true)

    const ctx2 = createPhaseCtx(afterStand)

    // ── DEALER_TURN (dealer has 16, draws to 17+) ──
    mockShoe = [card('3', 'clubs'), card('10', 'diamonds')]
    phases.bjDealerTurnPhase.onBegin(ctx2)
    expect(ctx2.getState().blackjack!.dealerTurnComplete).toBe(true)

    // ── SETTLEMENT ──
    phases.bjSettlementPhase.onBegin(ctx2)
    expect(ctx2.getState().blackjack!.settlementComplete).toBe(true)

    // ── HAND_COMPLETE ──
    phases.bjHandCompletePhase.onBegin(ctx2)
    // Human present — waits for "Next Round" tap
    expect(ctx2.getState().blackjack!.roundCompleteReady).toBe(false)
    ctx2.reducerDispatcher('bjSetRoundCompleteReady', true)

    const nextCtx = { session: { state: ctx2.getState() } }
    expect(phases.bjHandCompletePhase.next(nextCtx)).toBe(CasinoPhase.BjPlaceBets)
  })

  it('plays 5 consecutive rounds without crashing', () => {
    const state = createTestState({ humanCount: 1, botCount: 1, walletAmount: 5000 })
    let ctx = createPhaseCtx(state)

    for (let round = 0; round < 5; round++) {
      // ── PLACE_BETS ──
      phases.bjPlaceBetsPhase.onBegin(ctx)
      ctx.reducerDispatcher('bjPlaceBet', 'human1', 10)
      ctx.reducerDispatcher('bjSetAllBetsPlaced', true)

      // ── DEAL_INITIAL ──
      mockShoe = standardDealShoe()
      phases.bjDealInitialPhase.onBegin(ctx)

      // ── INSURANCE ──
      phases.bjInsurancePhase.onBegin(ctx)

      // ── PLAYER_TURNS (human stands immediately; bot auto-stood in onBegin) ──
      phases.bjPlayerTurnsPhase.onBegin(ctx)

      // Human stands via thunk
      const tCtx = createThunkCtx(ctx.getState())
      // Need to stand synchronously through reducer since we're simulating
      tCtx.dispatch('bjStandHand', 'human1')
      tCtx.dispatch('bjAdvanceTurn')
      // Bot should already be stood by onBegin, but advance past it
      const bjAfter = tCtx.getState().blackjack!
      if (bjAfter.currentTurnIndex < bjAfter.turnOrder.length) {
        const nextId = bjAfter.turnOrder[bjAfter.currentTurnIndex]
        const nextP = tCtx.getState().players.find((p: any) => p.id === nextId)
        if (nextP?.isBot) {
          tCtx.dispatch('bjStandHand', nextId)
          tCtx.dispatch('bjAdvanceTurn')
        }
      }
      tCtx.dispatch('bjSetPlayerTurnsComplete', true)

      ctx = createPhaseCtx(tCtx.getState())

      // ── DEALER_TURN ──
      mockShoe = [card('3', 'clubs'), card('10', 'diamonds'), card('5', 'spades')]
      phases.bjDealerTurnPhase.onBegin(ctx)

      // ── SETTLEMENT ──
      phases.bjSettlementPhase.onBegin(ctx)

      // ── HAND_COMPLETE ──
      phases.bjHandCompletePhase.onBegin(ctx)
      // Simulate human tapping "Next Round"
      ctx.reducerDispatcher('bjSetRoundCompleteReady', true)

      const nextCtx = { session: { state: ctx.getState() } }
      const nextPhase = phases.bjHandCompletePhase.next(nextCtx)

      // Should loop back to PLACE_BETS (human still has money)
      expect(nextPhase).toBe(CasinoPhase.BjPlaceBets)
      expect(ctx.getState().blackjack!.roundCompleteReady).toBe(true)

      // Verify round number incremented
      expect(ctx.getState().blackjack!.roundNumber).toBe(round + 1)
    }

    // After 5 rounds, human should still have chips (started with 5000, bet 10/round)
    const finalWallet = ctx.getState().wallet['human1']
    expect(finalWallet).toBeGreaterThan(0)
    expect(finalWallet).toBeLessThanOrEqual(5000)
  }, 10000) // 10s timeout

  it('second round state is clean — no leftover flags from first round', () => {
    const state = createTestState({ humanCount: 1, botCount: 1, walletAmount: 1000 })
    let ctx = createPhaseCtx(state)

    // ── Round 1 ──
    phases.bjPlaceBetsPhase.onBegin(ctx)
    ctx.reducerDispatcher('bjPlaceBet', 'human1', 50)
    ctx.reducerDispatcher('bjSetAllBetsPlaced', true)

    mockShoe = standardDealShoe()
    phases.bjDealInitialPhase.onBegin(ctx)
    phases.bjInsurancePhase.onBegin(ctx)
    phases.bjPlayerTurnsPhase.onBegin(ctx)

    // Human stands
    const tCtx = createThunkCtx(ctx.getState())
    tCtx.dispatch('bjStandHand', 'human1')
    tCtx.dispatch('bjAdvanceTurn')
    // Advance past bot
    const bjR1 = tCtx.getState().blackjack!
    if (bjR1.currentTurnIndex < bjR1.turnOrder.length) {
      const nextId = bjR1.turnOrder[bjR1.currentTurnIndex]
      tCtx.dispatch('bjStandHand', nextId)
      tCtx.dispatch('bjAdvanceTurn')
    }
    tCtx.dispatch('bjSetPlayerTurnsComplete', true)
    ctx = createPhaseCtx(tCtx.getState())

    mockShoe = [card('3', 'clubs'), card('10', 'diamonds')]
    phases.bjDealerTurnPhase.onBegin(ctx)
    phases.bjSettlementPhase.onBegin(ctx)
    phases.bjHandCompletePhase.onBegin(ctx)
    // Simulate human tapping "Next Round"
    ctx.reducerDispatcher('bjSetRoundCompleteReady', true)

    // Verify round 1 completed
    expect(ctx.getState().blackjack!.roundCompleteReady).toBe(true)

    // ── Round 2: start fresh ──
    phases.bjPlaceBetsPhase.onBegin(ctx)

    const round2State = ctx.getState().blackjack!
    // ALL phase flags must be reset
    expect(round2State.allBetsPlaced).toBe(false)
    expect(round2State.dealComplete).toBe(false)
    expect(round2State.insuranceComplete).toBe(false)
    expect(round2State.playerTurnsComplete).toBe(false)
    expect(round2State.dealerTurnComplete).toBe(false)
    expect(round2State.settlementComplete).toBe(false)
    expect(round2State.roundCompleteReady).toBe(false)
    // Round number should increment
    expect(round2State.roundNumber).toBe(2)
    // Player states should be fresh
    expect(round2State.currentTurnIndex).toBe(0)
    expect(round2State.playerStates.length).toBeGreaterThan(0)
    for (const ps of round2State.playerStates) {
      expect(ps.hands[0]!.stood).toBe(false)
      expect(ps.hands[0]!.busted).toBe(false)
      expect(ps.totalPayout).toBe(0)
      expect(ps.roundResult).toBe(0)
    }
  })

  it('bot plays until broke — excluded from subsequent rounds', () => {
    // Bot starts with 50 chips, min bet is 10. After 5 losing rounds, bot is broke.
    const state = createTestState({ humanCount: 1, botCount: 1, walletAmount: 1000 })
    // Override bot wallet to 50
    state.wallet['bot1'] = 50
    let ctx = createPhaseCtx(state)

    let botBusted = false
    let roundCount = 0

    while (!botBusted && roundCount < 20) {
      roundCount++

      phases.bjPlaceBetsPhase.onBegin(ctx)

      // Human places bet
      ctx.reducerDispatcher('bjPlaceBet', 'human1', 10)
      ctx.reducerDispatcher('bjSetAllBetsPlaced', true)

      // Deal: human gets 10+8=18, bot gets 5+6=11, dealer gets 10+K=20
      // Bot will lose every round (11 < 20)
      mockShoe = [
        card('10', 'hearts'), card('5', 'diamonds'),
        card('10', 'clubs'),
        card('8', 'spades'), card('6', 'hearts'),
        card('K', 'diamonds'),
      ]
      phases.bjDealInitialPhase.onBegin(ctx)
      phases.bjInsurancePhase.onBegin(ctx)
      phases.bjPlayerTurnsPhase.onBegin(ctx)

      // Human stands
      const tCtx = createThunkCtx(ctx.getState())
      tCtx.dispatch('bjStandHand', 'human1')
      tCtx.dispatch('bjAdvanceTurn')
      const bjMid = tCtx.getState().blackjack!
      if (bjMid.currentTurnIndex < bjMid.turnOrder.length) {
        const nextId = bjMid.turnOrder[bjMid.currentTurnIndex]
        tCtx.dispatch('bjStandHand', nextId)
        tCtx.dispatch('bjAdvanceTurn')
      }
      tCtx.dispatch('bjSetPlayerTurnsComplete', true)
      ctx = createPhaseCtx(tCtx.getState())

      // Dealer stands on 20
      mockShoe = []
      phases.bjDealerTurnPhase.onBegin(ctx)
      phases.bjSettlementPhase.onBegin(ctx)
      phases.bjHandCompletePhase.onBegin(ctx)

      // Check if bot is now busted
      const endState = ctx.getState()
      const botPlayer = endState.players.find((p: any) => p.id === 'bot1')
      if (botPlayer?.status === 'busted') {
        botBusted = true
      }

      const nextCtx = { session: { state: endState } }
      const nextPhase = phases.bjHandCompletePhase.next(nextCtx)

      // Should keep looping — human still has money
      expect(nextPhase).toBe(CasinoPhase.BjPlaceBets)
    }

    expect(botBusted).toBe(true)
    expect(roundCount).toBeLessThanOrEqual(10) // Bot had 50 chips, betting 10/round = 5 rounds max

    // Verify bot wallet is 0
    expect(ctx.getState().wallet['bot1']).toBe(0)
    // Verify human still has money
    expect(ctx.getState().wallet['human1']).toBeGreaterThan(0)
  })

  it('human busts then inlineCheckAdvance correctly completes the round', async () => {
    // This is the specific bug scenario: human busts (9+7+K=26),
    // inlineCheckAdvance should advance past bot and set playerTurnsComplete.
    const state = createTestState({ humanCount: 1, botCount: 1, walletAmount: 500 })
    const ctx = createPhaseCtx(state)

    // Set up round
    ctx.reducerDispatcher('bjInitRound', ['human1', 'bot1'], 1)
    ctx.reducerDispatcher('bjPlaceBet', 'human1', 50)
    ctx.reducerDispatcher('bjPlaceBet', 'bot1', 10)
    ctx.reducerDispatcher('bjSetAllBetsPlaced', true)

    // Deal: human gets 9+7=16, bot gets 8+6=14
    ctx.reducerDispatcher('bjSetPlayerCards', 'human1', [card('9'), card('7')], 16, false, false)
    ctx.reducerDispatcher('bjSetPlayerCards', 'bot1', [card('8'), card('6')], 14, false, false)
    ctx.reducerDispatcher('bjSetDealerCards', [card('10'), card('6')], 16, false, false)
    ctx.reducerDispatcher('bjSetDealComplete', true)
    ctx.reducerDispatcher('bjSetInsuranceComplete', true)

    // Human hits with K → 26 (bust)
    mockShoe = [card('K', 'hearts')]
    const tCtx = createThunkCtx(ctx.getState())
    await thunks.bjHit(tCtx, 'human1')

    const afterBust = tCtx.getState().blackjack!

    // Human should be busted
    expect(afterBust.playerStates[0]!.hands[0]!.busted).toBe(true)
    expect(afterBust.playerStates[0]!.hands[0]!.stood).toBe(true)

    // Bot should have been auto-stood by inlineCheckAdvance
    expect(afterBust.playerStates[1]!.hands[0]!.stood).toBe(true)

    // Turn index should be past all players
    expect(afterBust.currentTurnIndex).toBe(2)

    // playerTurnsComplete MUST be true
    expect(afterBust.playerTurnsComplete).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
//  13. Bot auto-stand loop safety counter
// ═══════════════════════════════════════════════════════════════

describe('BJ_PLAYER_TURNS bot loop safety counter', () => {
  it('bot auto-stand loop terminates even with corrupted state', () => {
    const state = createTestState({ humanCount: 0, botCount: 2 })
    const ctx = createPhaseCtx(state)

    ctx.reducerDispatcher('bjInitRound', ['bot1', 'bot2'], 1)
    ctx.reducerDispatcher('bjSetPlayerCards', 'bot1', [card('10'), card('7')], 17, false, false)
    ctx.reducerDispatcher('bjSetPlayerCards', 'bot2', [card('9'), card('8')], 17, false, false)

    // Monkey-patch reducerDispatcher to simulate bjAdvanceTurn being a no-op
    // (corrupted state where turn index never advances — would cause infinite loop)
    const originalDispatcher = ctx.reducerDispatcher.bind(ctx)
    let advanceCallCount = 0
    ctx.reducerDispatcher = (name: string, ...args: any[]) => {
      if (name === 'bjAdvanceTurn') {
        advanceCallCount++
        // Don't actually advance — simulates corrupt state
        return
      }
      originalDispatcher(name, ...args)
    }

    // This should NOT hang — safety counter should break the loop
    phases.bjPlayerTurnsPhase.onBegin(ctx)

    // The loop should have been bounded by safety counter
    // With 2 bots, max iterations should be playerStates.length (or a fixed cap)
    expect(advanceCallCount).toBeLessThanOrEqual(10)
  })
})

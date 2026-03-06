import { describe, it, expect, vi } from 'vitest'
import type { CasinoGameState, RouletteBet } from '@weekend-casino/shared'
import { createInitialCasinoState } from '../ruleset/casino-state.js'
import { casinoRuleset } from '../ruleset/casino-ruleset.js'
import { crapsThunks } from '../ruleset/craps-thunks.js'
import { rouletteThunks } from '../ruleset/roulette-thunks.js'
import { bjThunks } from '../ruleset/bj-thunks.js'
import { tcpThunks } from '../ruleset/tcp-thunks.js'

// ── Helpers ─────────────────────────────────────────────────────────

function makeCasinoState(overrides: Partial<CasinoGameState> = {}): CasinoGameState {
  const base = createInitialCasinoState({
    players: [
      { id: 'p1', name: 'Alice', avatarId: 'a', seatIndex: 0, isHost: true, isReady: true, currentGameStatus: 'active', stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
      { id: 'p2', name: 'Bob', avatarId: 'b', seatIndex: 1, isHost: false, isReady: true, currentGameStatus: 'active', stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
    ],
    wallet: { p1: 1000, p2: 1000 },
  })
  return { ...base, ...overrides }
}

function withCraps(state: CasinoGameState): CasinoGameState {
  return {
    ...state,
    craps: {
      shooterPlayerId: 'p1',
      shooterIndex: 0,
      point: null,
      puckOn: false,
      lastRollDie1: 0,
      lastRollDie2: 0,
      lastRollTotal: 0,
      rollHistory: [],
      bets: [],
      comeBets: [],
      players: [
        { playerId: 'p1', totalAtRisk: 0, betsConfirmed: false, roundResult: 0 },
        { playerId: 'p2', totalAtRisk: 0, betsConfirmed: false, roundResult: 0 },
      ],
      sevenOut: false,
      pointHit: false,
      newShooterReady: false,
      allComeOutBetsPlaced: false,
      rollComplete: false,
      comeOutResolutionComplete: false,
      allPointBetsPlaced: false,
      pointResolutionComplete: false,
      roundCompleteReady: false,
      roundNumber: 1,
      config: {
        minBet: 10,
        maxBet: 500,
        maxOddsMultiplier: 3,
        placeBetsWorkOnComeOut: false,
        simpleMode: true,
      },
    },
  }
}

function withRoulette(state: CasinoGameState): CasinoGameState {
  return {
    ...state,
    roulette: {
      roundNumber: 1,
      winningNumber: null,
      winningColour: null,
      bets: [],
      players: [
        { playerId: 'p1', totalBet: 0, betsConfirmed: false, payout: 0, netResult: 0 },
        { playerId: 'p2', totalBet: 0, betsConfirmed: false, payout: 0, netResult: 0 },
      ],
      history: [],
      spinState: 'idle',
      spinComplete: false,
      allBetsPlaced: false,
      resultAnnounced: false,
      payoutComplete: false,
      roundCompleteReady: false,
      nearMisses: [],
      config: {
        minBet: 10,
        maxInsideBet: 500,
        maxOutsideBet: 1000,
        maxTotalBet: 5000,
        bettingTimeSec: 30,
        spinDurationMs: 5000,
      },
    } as any,
  }
}

const reducers = casinoRuleset.reducers as Record<string, (...args: any[]) => any>

function createMockCtx(initialState: CasinoGameState, clientId = 'p1') {
  let state = { ...initialState }
  const dispatched: Array<{ name: string; args: unknown[] }> = []

  const ctx = {
    getState: () => state,
    getClientId: () => clientId,
    getSessionId: () => 'test-session',
    dispatch: (name: string, ...args: unknown[]) => {
      dispatched.push({ name, args })
      const reducer = reducers[name]
      if (reducer) {
        state = reducer(state, ...args)
      }
    },
    dispatchThunk: vi.fn(),
    getMembers: () => ({}),
    scheduler: { upsertTimeout: vi.fn(), cancel: vi.fn() },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  } as any

  return { ctx, dispatched, getState: () => state }
}

// ── Task #12: Craps wallet deduction ────────────────────────────────

describe('Craps wallet deduction', () => {
  it('deducts wallet when placing a pass_line bet', async () => {
    const state = withCraps(makeCasinoState())
    const { ctx, getState } = createMockCtx(state)

    await crapsThunks.crapsValidateAndPlaceBet(ctx, 'p1', 'pass_line', 100)

    expect(getState().wallet.p1).toBe(900)
    expect(getState().craps!.bets).toHaveLength(1)
    expect(getState().craps!.bets[0]!.type).toBe('pass_line')
  })

  it('deducts wallet when placing a dont_pass bet', async () => {
    const state = withCraps(makeCasinoState())
    const { ctx, getState } = createMockCtx(state)

    await crapsThunks.crapsValidateAndPlaceBet(ctx, 'p1', 'dont_pass', 50)

    expect(getState().wallet.p1).toBe(950)
  })

  it('deducts wallet when placing a place bet', async () => {
    const state = withCraps(makeCasinoState())
    const { ctx, getState } = createMockCtx(state)

    await crapsThunks.crapsValidateAndPlaceBet(ctx, 'p1', 'place', 100, 6)

    expect(getState().wallet.p1).toBe(900)
  })

  it('deducts wallet when placing a field bet', async () => {
    const state = withCraps(makeCasinoState())
    const { ctx, getState } = createMockCtx(state)

    await crapsThunks.crapsValidateAndPlaceBet(ctx, 'p1', 'field', 100)

    expect(getState().wallet.p1).toBe(900)
  })

  it('deducts wallet when placing a come bet', async () => {
    const state = withCraps(makeCasinoState())
    // Come bets need puck ON for come-out roll to have passed
    state.craps!.puckOn = true
    state.craps!.point = 6
    const { ctx, getState } = createMockCtx(state)

    await crapsThunks.crapsValidateAndPlaceBet(ctx, 'p1', 'come', 100)

    expect(getState().wallet.p1).toBe(900)
    expect(getState().craps!.comeBets).toHaveLength(1)
  })

  it('prevents betting more than wallet balance', async () => {
    const state = withCraps(makeCasinoState({ wallet: { p1: 50, p2: 1000 } } as any))
    const { ctx, dispatched, getState } = createMockCtx(state)

    await crapsThunks.crapsValidateAndPlaceBet(ctx, 'p1', 'pass_line', 100)

    // Should have set bet error, NOT placed the bet
    expect(dispatched.some(d => d.name === 'setBetError')).toBe(true)
    expect(getState().craps!.bets).toHaveLength(0)
    expect(getState().wallet.p1).toBe(50)
  })
})

// ── Task #13: Roulette repeat-bet bypass ────────────────────────────

describe('Roulette repeat-bet wallet bypass', () => {
  it('accounts for current bets when checking wallet for repeat', async () => {
    const state = withRoulette(makeCasinoState({ wallet: { p1: 200, p2: 1000 } } as any))
    // Player already has 150 in bets this round
    state.roulette!.players[0]!.totalBet = 150
    const { ctx, dispatched } = createMockCtx(state)

    const previousBets: RouletteBet[] = [
      { id: 'old-1', playerId: 'p1', type: 'red', amount: 100, numbers: [], status: 'active', payout: 0 },
    ]

    // 150 (current) + 100 (repeat) = 250 > 200 (wallet) — should be rejected
    await rouletteThunks.rouletteRepeatLastBets(ctx, 'p1', previousBets)

    expect(dispatched.some(d => d.name === 'setBetError')).toBe(true)
  })
})

// ── Task #13: NaN validation ────────────────────────────────────────

describe('NaN bet amount rejection', () => {
  it('rejects NaN amount in craps', async () => {
    const state = withCraps(makeCasinoState())
    const { ctx, getState } = createMockCtx(state)

    await crapsThunks.crapsValidateAndPlaceBet(ctx, 'p1', 'pass_line', NaN)

    expect(getState().wallet.p1).toBe(1000)
    expect(getState().craps!.bets).toHaveLength(0)
  })

  it('rejects Infinity amount in craps', async () => {
    const state = withCraps(makeCasinoState())
    const { ctx, getState } = createMockCtx(state)

    await crapsThunks.crapsValidateAndPlaceBet(ctx, 'p1', 'pass_line', Infinity)

    expect(getState().wallet.p1).toBe(1000)
  })

  it('rejects negative amount in craps', async () => {
    const state = withCraps(makeCasinoState())
    const { ctx, getState } = createMockCtx(state)

    await crapsThunks.crapsValidateAndPlaceBet(ctx, 'p1', 'pass_line', -50)

    expect(getState().wallet.p1).toBe(1000)
  })

  it('rejects zero amount in craps', async () => {
    const state = withCraps(makeCasinoState())
    const { ctx, getState } = createMockCtx(state)

    await crapsThunks.crapsValidateAndPlaceBet(ctx, 'p1', 'pass_line', 0)

    expect(getState().wallet.p1).toBe(1000)
  })

  it('rejects NaN amount in roulette', async () => {
    const state = withRoulette(makeCasinoState())
    const { ctx, getState } = createMockCtx(state)

    await rouletteThunks.roulettePlaceBet(ctx, 'p1', 'red', NaN, [])

    expect(getState().wallet.p1).toBe(1000)
  })

  it('rejects NaN amount in blackjack', async () => {
    const state = makeCasinoState()
    state.blackjack = {
      playerStates: [{ playerId: 'p1', hands: [{ bet: 0, cards: [], status: 'active', result: null, payout: 0, isInsured: false }] }],
      dealerHand: { cards: [], total: 0, softTotal: 0, isBusted: false, isBlackjack: false },
      activePlayerIndex: 0,
      activeHandIndex: 0,
      allBetsPlaced: false,
      dealComplete: false,
      insuranceOffered: false,
      allActionsComplete: false,
      dealerActionsComplete: false,
      settlementComplete: false,
      roundCompleteReady: false,
      roundNumber: 1,
      deckPenetration: 0,
      config: { minBet: 10, maxBet: 500, numDecks: 6, dealerHitsSoft17: true, doubleAfterSplit: true, surrenderAllowed: true, maxSplits: 3, blackjackPays: 1.5, insurancePays: 2 },
    } as any
    const { ctx, getState } = createMockCtx(state)

    await bjThunks.bjPlaceBet(ctx, 'p1', NaN)

    expect(getState().wallet.p1).toBe(1000)
  })

  it('rejects NaN amount in three card poker', async () => {
    const state = makeCasinoState()
    state.threeCardPoker = {
      playerHands: [{ playerId: 'p1', anteBet: 0, playBet: 0, pairPlusBet: 0, cards: [], handRank: null, status: 'active', result: null, payout: 0 }],
      dealerHand: { cards: [], handRank: null, qualifies: false },
      allAntesPlaced: false,
      dealComplete: false,
      allDecisionsMade: false,
      dealerRevealed: false,
      settlementComplete: false,
      roundCompleteReady: false,
      roundNumber: 1,
      config: { minAnte: 10, maxAnte: 500, maxPairPlus: 100 },
    } as any
    const { ctx, getState } = createMockCtx(state)

    await tcpThunks.tcpPlaceAnteBet(ctx, 'p1', NaN)

    expect(getState().wallet.p1).toBe(1000)
  })
})

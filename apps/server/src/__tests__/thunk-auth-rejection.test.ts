/**
 * Auth rejection tests for all game thunks.
 *
 * Per learning 008: every security fix needs negative tests proving the old
 * insecure path is blocked. These tests verify that player-facing thunks
 * reject actions when the client-supplied playerId does not match the
 * authorized client connection (ctx.getClientId()).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CasinoGameState } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'
import { tcpThunks } from '../ruleset/tcp-thunks.js'
import { bjThunks } from '../ruleset/bj-thunks.js'
import { bjcThunks } from '../ruleset/bjc-thunks.js'
import { drawProcessAction, drawProcessDiscard } from '../ruleset/draw-thunks.js'
import { rouletteThunks } from '../ruleset/roulette-thunks.js'
import { _resetAllServerState } from '../server-game-state.js'

// ── Helpers ─────────────────────────────────────────────────────────

/** Creates a mock thunk context where getClientId() returns `actualClientId`. */
function createAuthTestCtx(state: CasinoGameState, actualClientId: string) {
  const dispatches: Array<{ name: string; args: unknown[] }> = []

  const ctx = {
    getState: () => state,
    getClientId: () => actualClientId,
    getSessionId: () => 'test-session',
    getMembers: () => ({}),
    dispatch: vi.fn((name: string, ...args: unknown[]) => {
      dispatches.push({ name, args })
    }),
    dispatchThunk: vi.fn(async () => {}),
    scheduler: { upsertTimeout: vi.fn(), cancel: vi.fn() },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  } as any

  return { ctx, dispatches }
}

function baseState(overrides: Partial<CasinoGameState> = {}): CasinoGameState {
  return {
    phase: CasinoPhase.Lobby,
    selectedGame: null,
    gameSelectConfirmed: false,
    gameChangeRequested: false,
    gameChangeVotes: {},
    wallet: { p1: 10000, attacker: 10000 },
    players: [
      { id: 'p1', name: 'Player 1', seatIndex: 0, stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0, avatarId: 'default', isHost: false, isReady: true, currentGameStatus: 'active' },
    ] as any,
    dealerCharacterId: 'ace_malone',
    blindLevel: { level: 1, smallBlind: 5, bigBlind: 10, minBuyIn: 200, maxBuyIn: 2000 },
    handNumber: 1,
    dealerIndex: 0,
    lobbyReady: true,
    dealerMessage: null,
    ttsQueue: [],
    reactions: [],
    sessionStats: { handsPlayed: 0, gamesPlayed: {}, largestPot: null, playerStats: {} } as any,
    interHandDelaySec: 3,
    autoFillBots: true,
    activePlayerIndex: 0,
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentBet: 0,
    minRaiseIncrement: 10,
    holeCards: {},
    handHistory: [],
    lastAggressor: null,
    dealingComplete: false,
    ...overrides,
  } as unknown as CasinoGameState
}

beforeEach(() => {
  _resetAllServerState()
})

// ── TCP thunks ────────────────────────────────────────────────────

describe('TCP thunks auth rejection', () => {
  const tcpState = () => baseState({
    phase: CasinoPhase.TcpPlaceBets as any,
    selectedGame: 'three_card_poker' as any,
    threeCardPoker: {
      config: { minAnte: 5, maxAnte: 500, maxPairPlus: 100 },
      playerHands: [{ playerId: 'p1', anteBet: 0, pairPlusBet: 0, playBet: 0, decision: 'undecided', cards: [], handRank: null, handStrength: 0, anteBonus: 0, pairPlusPayout: 0, totalReturn: 0, netResult: 0 }],
      dealerHand: { cards: [], handRank: null, handStrength: 0, qualifies: false },
      allAntesPlaced: false,
      allDecisionsMade: false,
      dealComplete: false,
      payoutComplete: false,
      roundCompleteReady: false,
    },
  } as any)

  it('rejects tcpPlaceAnteBet when clientId does not match playerId', async () => {
    const { ctx, dispatches } = createAuthTestCtx(tcpState(), 'attacker')
    await tcpThunks.tcpPlaceAnteBet(ctx, 'p1', 50)
    expect(dispatches).toHaveLength(0)
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects tcpMakeDecision when clientId does not match playerId', async () => {
    const { ctx, dispatches } = createAuthTestCtx(tcpState(), 'attacker')
    await tcpThunks.tcpMakeDecision(ctx, 'p1', 'play')
    expect(dispatches).toHaveLength(0)
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })
})

// ── Blackjack Classic thunks ──────────────────────────────────────

describe('Blackjack Classic thunks auth rejection', () => {
  const bjState = () => baseState({
    phase: CasinoPhase.BjPlaceBets as any,
    selectedGame: 'blackjack_classic' as any,
    blackjack: {
      config: { minBet: 5, maxBet: 500, numberOfDecks: 6, splitEnabled: true, surrenderEnabled: true, maxSplits: 3, dealerHitsSoft17: true, blackjackPaysRatio: 1.5, reshuffleThreshold: 0.25 },
      playerStates: [{ playerId: 'p1', hands: [{ cards: [], bet: 50, value: 0, isSoft: false, busted: false, stood: false, doubled: false, isBlackjack: false }], activeHandIndex: 0, insuranceBet: 0, insuranceResolved: false, surrendered: false }],
      dealerHand: { cards: [], value: 0, isSoft: false, isBlackjack: false, isBusted: false },
      turnOrder: ['p1'],
      currentTurnIndex: 0,
      allBetsPlaced: false,
      dealComplete: false,
      insuranceComplete: false,
      playerTurnsComplete: false,
      dealerTurnComplete: false,
      settlementComplete: false,
      roundCompleteReady: false,
      shoePenetration: 0,
    },
  } as any)

  it('rejects bjPlaceBet when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(bjState(), 'attacker')
    await bjThunks.bjPlaceBet(ctx, 'p1', 50)
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects bjHit when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(bjState(), 'attacker')
    await bjThunks.bjHit(ctx, 'p1')
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects bjStand when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(bjState(), 'attacker')
    await bjThunks.bjStand(ctx, 'p1')
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects bjDoubleDown when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(bjState(), 'attacker')
    await bjThunks.bjDoubleDown(ctx, 'p1')
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects bjSplit when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(bjState(), 'attacker')
    await bjThunks.bjSplit(ctx, 'p1')
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects bjSurrender when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(bjState(), 'attacker')
    await bjThunks.bjSurrender(ctx, 'p1')
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects bjProcessInsurance when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(bjState(), 'attacker')
    await bjThunks.bjProcessInsurance(ctx, 'p1', true)
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })
})

// ── Blackjack Competitive thunks ──────────────────────────────────

describe('Blackjack Competitive thunks auth rejection', () => {
  const bjcState = () => baseState({
    phase: CasinoPhase.BjcPlayerTurns as any,
    selectedGame: 'blackjack_competitive' as any,
    blackjackCompetitive: {
      config: {},
      playerStates: [{ playerId: 'p1', hand: { cards: [], bet: 10, value: 12, isSoft: false, busted: false, stood: false, doubled: false, isBlackjack: false }, surrendered: false }],
      turnOrder: ['p1'],
      currentTurnIndex: 0,
      anteAmount: 10,
      pot: 20,
      dealComplete: false,
      allAntesPlaced: true,
      playerTurnsComplete: false,
      showdownComplete: false,
      settlementComplete: false,
      roundCompleteReady: false,
      shoePenetration: 0,
    },
  } as any)

  it('rejects bjcHit when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(bjcState(), 'attacker')
    await bjcThunks.bjcHit(ctx, 'p1')
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects bjcStand when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(bjcState(), 'attacker')
    await bjcThunks.bjcStand(ctx, 'p1')
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects bjcDoubleDown when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(bjcState(), 'attacker')
    await bjcThunks.bjcDoubleDown(ctx, 'p1')
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })
})

// ── 5-Card Draw thunks ────────────────────────────────────────────

describe('Draw thunks auth rejection', () => {
  const drawState = () => baseState({
    phase: CasinoPhase.DrawBetting1 as any,
    selectedGame: 'five_card_draw' as any,
    fiveCardDraw: {
      hands: { p1: [] },
      discardSelections: {},
      discardConfirmed: {},
      pot: 0,
      sidePots: [],
      currentBet: 0,
      minRaiseIncrement: 10,
      activePlayerIndex: 0,
      drawComplete: false,
    },
  } as any)

  it('rejects drawProcessAction when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(drawState(), 'attacker')
    await drawProcessAction(ctx, 'p1', 'fold')
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects drawProcessDiscard when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(drawState(), 'attacker')
    await drawProcessDiscard(ctx, 'p1', [0, 1])
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })
})

// ── Roulette thunks ───────────────────────────────────────────────

describe('Roulette thunks auth rejection', () => {
  const rouletteState = () => baseState({
    phase: CasinoPhase.RoulettePlaceBets as any,
    selectedGame: 'roulette' as any,
    roulette: {
      config: { minBet: 1, maxInsideBet: 100, maxOutsideBet: 500, maxTotalBet: 1000, bettingTimeSec: 30 },
      players: [{ playerId: 'p1', totalBet: 0, betsConfirmed: false, payout: 0, netResult: 0 }],
      bets: [],
      winningNumber: null,
      winningColour: null,
      spinComplete: false,
      spinState: 'idle',
      nearMisses: [],
      resultAnnounced: false,
      payoutComplete: false,
      roundCompleteReady: false,
      roundNumber: 1,
      history: [],
      allBetsPlaced: false,
    },
  } as any)

  it('rejects roulettePlaceBet when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(rouletteState(), 'attacker')
    await rouletteThunks.roulettePlaceBet(ctx, 'p1', 'straight_up' as any, 10, [17])
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects rouletteRemoveBet when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(rouletteState(), 'attacker')
    await rouletteThunks.rouletteRemoveBet(ctx, 'p1', 'rbet-1')
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects rouletteClearBets when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(rouletteState(), 'attacker')
    await rouletteThunks.rouletteClearBets(ctx, 'p1')
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects rouletteConfirmBets when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(rouletteState(), 'attacker')
    await rouletteThunks.rouletteConfirmBets(ctx, 'p1')
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects rouletteNoBet when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(rouletteState(), 'attacker')
    await rouletteThunks.rouletteNoBet(ctx, 'p1')
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('rejects rouletteRepeatLastBets when clientId does not match playerId', async () => {
    const { ctx } = createAuthTestCtx(rouletteState(), 'attacker')
    await rouletteThunks.rouletteRepeatLastBets(ctx, 'p1', [])
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CasinoGameState, Card } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'
import { bjReducers } from '../bj-reducers.js'
import { casinoUpdateWallet } from '../casino-state.js'

// Mock server-game-state (shoe management)
vi.mock('../../server-game-state.js', () => ({
  getServerGameState: () => ({
    blackjack: {
      shoe: createMockShoe(104),
      dealerHoleCard: null,
    },
  }),
  setServerGameState: vi.fn(),
}))

// Mock game-night-utils
vi.mock('../game-night-utils.js', () => ({
  wrapWithGameNightCheck: (fn: any) => fn,
  incrementGameNightRoundIfActive: vi.fn(),
}))

function createMockShoe(count: number): Card[] {
  const ranks: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  const suits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs']
  const cards: Card[] = []
  for (let i = 0; i < count; i++) {
    cards.push({ rank: ranks[i % ranks.length]!, suit: suits[i % suits.length]! })
  }
  return cards
}

function createTestState(opts: { botWallet?: number } = {}): CasinoGameState {
  const botWallet = opts.botWallet ?? 1000
  return {
    phase: CasinoPhase.BjPlaceBets,
    selectedGame: 'blackjack_classic',
    gameSelectConfirmed: true,
    gameChangeRequested: false,
    gameChangeVotes: {},
    wallet: { human1: 1000, bot1: botWallet },
    players: [
      { id: 'human1', name: 'Human', seatIndex: 0, stack: 1000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
      { id: 'bot1', name: 'Bot', seatIndex: 1, stack: botWallet, bet: 0, status: 'active', lastAction: null, isBot: true, isConnected: true, sittingOutHandCount: 0 },
    ],
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

/**
 * Build a mock VGF phase context that applies known reducers to state.
 * This lets us track wallet changes across phase onBegin calls.
 */
function createMockPhaseCtx(initialState: CasinoGameState) {
  let state = initialState

  const reducerMap: Record<string, (...args: any[]) => CasinoGameState> = {
    bjInitRound: (s: CasinoGameState, playerIds: string[], roundNumber: number) =>
      bjReducers.bjInitRound(s, playerIds, roundNumber),
    bjPlaceBet: (s: CasinoGameState, playerId: string, amount: number) =>
      bjReducers.bjPlaceBet(s, playerId, amount),
    bjSetAllBetsPlaced: (s: CasinoGameState, placed: boolean) =>
      bjReducers.bjSetAllBetsPlaced(s, placed),
    updateWallet: (s: CasinoGameState, playerId: string, delta: number) =>
      casinoUpdateWallet(s, playerId, delta),
    setDealerMessage: (s: CasinoGameState, _msg: string) => s,
    bjSetPlayerCards: (s: CasinoGameState, playerId: string, cards: Card[], value: number, isSoft: boolean, isBj: boolean) =>
      bjReducers.bjSetPlayerCards(s, playerId, cards, value, isSoft, isBj),
    bjSetDealerCards: (s: CasinoGameState, cards: Card[], value: number, isSoft: boolean, isBj: boolean) =>
      bjReducers.bjSetDealerCards(s, cards, value, isSoft, isBj),
    bjSetShoePenetration: (s: CasinoGameState, p: number) =>
      bjReducers.bjSetShoePenetration(s, p),
    bjSetDealComplete: (s: CasinoGameState, c: boolean) =>
      bjReducers.bjSetDealComplete(s, c),
  }

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

// We need to import after mocks are set up
let bjPlaceBetsPhase: any
let bjDealInitialPhase: any

beforeEach(async () => {
  const mod = await import('../bj-phases.js')
  bjPlaceBetsPhase = mod.bjPlaceBetsPhase
  bjDealInitialPhase = mod.bjDealInitialPhase
})

describe('BJ bot wallet deduction', () => {
  it('deducts bot wallet exactly once across PLACE_BETS + DEAL_INITIAL', () => {
    const initialState = createTestState({ botWallet: 1000 })
    const ctx = createMockPhaseCtx(initialState)

    // Run PLACE_BETS onBegin — bots auto-bet but should NOT deduct wallet
    bjPlaceBetsPhase.onBegin(ctx)

    const afterBets = ctx.getState()
    expect(afterBets.wallet['bot1']).toBe(1000) // wallet untouched
    expect(afterBets.blackjack!.playerStates.find((ps: any) => ps.playerId === 'bot1')!.hands[0]!.bet).toBe(10) // bet placed

    // Simulate human also placing a bet (via thunk path, which sets bet but doesn't deduct)
    ctx.reducerDispatcher('bjPlaceBet', 'human1', 10)
    ctx.reducerDispatcher('bjSetAllBetsPlaced', true)

    // Run DEAL_INITIAL onBegin — should deduct ALL players' bets once
    bjDealInitialPhase.onBegin(ctx)

    const afterDeal = ctx.getState()
    expect(afterDeal.wallet['bot1']).toBe(990) // deducted exactly once: 1000 - 10
    expect(afterDeal.wallet['human1']).toBe(990) // human also deducted once
  })

  it('skips bot bet when wallet is insufficient', () => {
    const initialState = createTestState({ botWallet: 5 }) // less than minBet of 10
    const ctx = createMockPhaseCtx(initialState)

    bjPlaceBetsPhase.onBegin(ctx)

    const afterBets = ctx.getState()
    // Bot should NOT have placed a bet
    const botPs = afterBets.blackjack!.playerStates.find((ps: any) => ps.playerId === 'bot1')
    expect(botPs!.hands[0]!.bet).toBe(0)
    expect(afterBets.wallet['bot1']).toBe(5) // unchanged
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import type { CasinoGameState, Card } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'
import { bjcReducers } from '../ruleset/bjc-reducers.js'
import { bjcThunks } from '../ruleset/bjc-thunks.js'
import { _resetAllServerState, setServerGameState } from '../server-game-state.js'
import { createShoe, shuffleShoe } from '../blackjack-engine/index.js'

function card(rank: string, suit: string = 'spades'): Card {
  return { rank: rank as Card['rank'], suit: suit as Card['suit'] }
}

function createTestState(): CasinoGameState {
  return {
    phase: CasinoPhase.BjcPlaceBets,
    selectedGame: 'blackjack_competitive',
    gameSelectConfirmed: true,
    gameChangeRequested: false,
    gameChangeVotes: {},
    wallet: { p1: 10000, p2: 10000, p3: 10000 },
    players: [
      { id: 'p1', name: 'Player 1', seatIndex: 0, stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0, avatarId: 'default', isHost: false, isReady: true, currentGameStatus: 'active' },
      { id: 'p2', name: 'Player 2', seatIndex: 1, stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0, avatarId: 'default', isHost: false, isReady: true, currentGameStatus: 'active' },
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
    activePlayerIndex: -1,
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentBet: 0,
    minRaiseIncrement: 10,
    holeCards: {},
    handHistory: [],
    lastAggressor: null,
    dealingComplete: false,
    blackjackCompetitive: undefined,
  } as unknown as CasinoGameState
}

function createMockCtx(initialState: CasinoGameState) {
  let state = initialState
  const dispatches: Array<{ name: string; args: unknown[] }> = []

  // Build reducer map from bjcReducers + casinoReducers
  const reducerMap: Record<string, (...args: any[]) => CasinoGameState> = {
    ...bjcReducers,
    updateWallet: (s: CasinoGameState, playerId: string, amount: number) => ({
      ...s,
      wallet: { ...s.wallet, [playerId]: (s.wallet[playerId] ?? 0) + amount },
    }),
    setDealerMessage: (s: CasinoGameState, msg: string) => ({
      ...s,
      dealerMessage: msg,
    }),
    setBetError: (s: CasinoGameState, _pid: string, _msg: string, _clearedAt: number) => s,
  }

  const ctx = {
    getState: () => state,
    getSessionId: () => 'test-session',
    getMembers: () => ({}),
    getClientId: () => 'p1',
    dispatch: (name: string, ...args: unknown[]) => {
      dispatches.push({ name, args })
      const reducer = reducerMap[name]
      if (reducer) {
        state = reducer(state, ...args)
      }
    },
    dispatchThunk: async (name: string, ...args: unknown[]) => {
      const thunk = (bjcThunks as any)[name]
      if (thunk) {
        await thunk(ctx, ...args)
      }
    },
  }

  return { ctx, getState: () => state, getDispatches: () => dispatches }
}

describe('bjcThunks', () => {
  beforeEach(() => {
    _resetAllServerState()
  })

  describe('bjcPostAntes', () => {
    it('posts antes for all players and adds to pot', async () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      const { ctx, getState } = createMockCtx(state)

      await bjcThunks.bjcPostAntes(ctx)

      const result = getState()
      expect(result.blackjackCompetitive!.allAntesPlaced).toBe(true)
      expect(result.blackjackCompetitive!.pot).toBe(20)
      expect(result.wallet.p1).toBe(9990) // 10000 - 10
      expect(result.wallet.p2).toBe(9990)
    })

    it('skips players with insufficient balance', async () => {
      let state = createTestState()
      state = { ...state, wallet: { p1: 5, p2: 10000 } } as CasinoGameState
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      const { ctx, getState } = createMockCtx(state)

      await bjcThunks.bjcPostAntes(ctx)

      const result = getState()
      // p1 should be skipped (only 5 chips), p2 should ante
      expect(result.blackjackCompetitive!.pot).toBe(10)
      expect(result.wallet.p1).toBe(5) // unchanged
      expect(result.wallet.p2).toBe(9990)
    })
  })

  describe('bjcDealInitial', () => {
    it('deals 2 cards to each player', async () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      const { ctx, getState } = createMockCtx(state)

      // Ensure shoe exists in server state
      const shoe = shuffleShoe(createShoe(6))
      setServerGameState('test-session', {
        activeGame: 'blackjack_competitive',
        blackjackCompetitive: { shoe, playerHoleCards: new Map() },
      })

      await bjcThunks.bjcDealInitial(ctx)

      const result = getState()
      expect(result.blackjackCompetitive!.dealComplete).toBe(true)

      for (const ps of result.blackjackCompetitive!.playerStates) {
        expect(ps.hand.cards).toHaveLength(2)
        expect(ps.hand.value).toBeGreaterThan(0)
      }
    })
  })

  describe('bjcHit', () => {
    it('deals one card to the player', async () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1'], 1, 10)
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('5'), card('6')], 11, false, false)
      const { ctx, getState } = createMockCtx(state)

      const shoe = [card('3'), card('K'), card('J')]
      setServerGameState('test-session', {
        activeGame: 'blackjack_competitive',
        blackjackCompetitive: { shoe, playerHoleCards: new Map() },
      })

      await bjcThunks.bjcHit(ctx, 'p1')

      const result = getState()
      const p1 = result.blackjackCompetitive!.playerStates[0]!
      expect(p1.hand.cards).toHaveLength(3)
      expect(p1.hand.value).toBe(14) // 5 + 6 + 3
    })

    it('auto-advances when player busts', async () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('K'), card('Q')], 20, false, false)
      const { ctx, getState } = createMockCtx(state)

      const shoe = [card('J'), card('2')]
      setServerGameState('test-session', {
        activeGame: 'blackjack_competitive',
        blackjackCompetitive: { shoe, playerHoleCards: new Map() },
      })

      await bjcThunks.bjcHit(ctx, 'p1')

      const result = getState()
      const p1 = result.blackjackCompetitive!.playerStates[0]!
      expect(p1.hand.busted).toBe(true)
      expect(result.blackjackCompetitive!.currentTurnIndex).toBe(1) // advanced to p2
    })

    it('ignores hit if player already stood', async () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1'], 1, 10)
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('K'), card('8')], 18, false, false)
      state = bjcReducers.bjcStandHand(state, 'p1')
      const { ctx, getDispatches } = createMockCtx(state)

      const shoe = [card('2')]
      setServerGameState('test-session', {
        activeGame: 'blackjack_competitive',
        blackjackCompetitive: { shoe, playerHoleCards: new Map() },
      })

      await bjcThunks.bjcHit(ctx, 'p1')

      // No bjcAddCardToHand dispatch should have happened
      const dispatches = getDispatches()
      expect(dispatches.some(d => d.name === 'bjcAddCardToHand')).toBe(false)
    })
  })

  describe('bjcStand', () => {
    it('marks player as stood and advances turn', async () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('K'), card('8')], 18, false, false)
      const { ctx, getState } = createMockCtx(state)

      await bjcThunks.bjcStand(ctx, 'p1')

      const result = getState()
      const p1 = result.blackjackCompetitive!.playerStates[0]!
      expect(p1.hand.stood).toBe(true)
      expect(result.blackjackCompetitive!.currentTurnIndex).toBe(1)
    })

    it('marks all turns complete when last player stands', async () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1'], 1, 10)
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('K'), card('8')], 18, false, false)
      const { ctx, getState } = createMockCtx(state)

      await bjcThunks.bjcStand(ctx, 'p1')

      const result = getState()
      expect(result.blackjackCompetitive!.playerTurnsComplete).toBe(true)
    })
  })

  describe('bjcDoubleDown', () => {
    it('doubles bet, deals one card, and auto-stands', async () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1'], 1, 10)
      state = bjcReducers.bjcPlaceAnte(state, 'p1', 10)
      const { ctx, getState } = createMockCtx(state)

      const shoe = [card('K')]
      setServerGameState('test-session', {
        activeGame: 'blackjack_competitive',
        blackjackCompetitive: { shoe, playerHoleCards: new Map() },
      })

      // Need to set cards for canDoubleDown check (exactly 2 cards)
      ctx.dispatch('bjcSetPlayerCards', 'p1', [card('5'), card('6')], 11, false, false)

      await bjcThunks.bjcDoubleDown(ctx, 'p1')

      const result = getState()
      const p1 = result.blackjackCompetitive!.playerStates[0]!
      expect(p1.hand.doubled).toBe(true)
      expect(p1.hand.stood).toBe(true)
      expect(p1.hand.cards).toHaveLength(3)
      expect(result.blackjackCompetitive!.pot).toBe(10) // ante added to pot
      expect(result.wallet.p1).toBe(9990) // additional bet deducted
    })

    it('rejects double when insufficient funds', async () => {
      let state = createTestState()
      state = { ...state, wallet: { p1: 5 } } as CasinoGameState
      state = bjcReducers.bjcInitRound(state, ['p1'], 1, 10)
      state = bjcReducers.bjcPlaceAnte(state, 'p1', 10)
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('5'), card('6')], 11, false, false)
      const { ctx, getDispatches } = createMockCtx(state)

      await bjcThunks.bjcDoubleDown(ctx, 'p1')

      const dispatches = getDispatches()
      expect(dispatches.some(d => d.name === 'setBetError')).toBe(true)
    })
  })

  describe('bjcShowdown', () => {
    it('sets showdown complete and dealer message', async () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      const { ctx, getState } = createMockCtx(state)

      await bjcThunks.bjcShowdown(ctx)

      const result = getState()
      expect(result.blackjackCompetitive!.showdownComplete).toBe(true)
      expect(result.dealerMessage).toBe('Showdown!')
    })
  })

  describe('bjcSettleBets', () => {
    it('awards pot to highest non-busted hand', async () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      state = bjcReducers.bjcPlaceAnte(state, 'p1', 10)
      state = bjcReducers.bjcPlaceAnte(state, 'p2', 10)
      state = bjcReducers.bjcAddToPot(state, 20)
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('K'), card('J')], 20, false, false)
      state = bjcReducers.bjcSetPlayerCards(state, 'p2', [card('5'), card('6')], 11, false, false)
      state = bjcReducers.bjcStandHand(state, 'p1')
      state = bjcReducers.bjcStandHand(state, 'p2')
      const { ctx, getState } = createMockCtx(state)

      await bjcThunks.bjcSettleBets(ctx)

      const result = getState()
      expect(result.blackjackCompetitive!.winnerIds).toEqual(['p1'])
      expect(result.blackjackCompetitive!.settlementComplete).toBe(true)
      // p1 wins 20 chip pot
      expect(result.wallet.p1).toBe(10020)
    })

    it('splits pot on tie', async () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      state = bjcReducers.bjcPlaceAnte(state, 'p1', 10)
      state = bjcReducers.bjcPlaceAnte(state, 'p2', 10)
      state = bjcReducers.bjcAddToPot(state, 20)
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('K'), card('J')], 20, false, false)
      state = bjcReducers.bjcSetPlayerCards(state, 'p2', [card('Q'), card('K')], 20, false, false)
      state = bjcReducers.bjcStandHand(state, 'p1')
      state = bjcReducers.bjcStandHand(state, 'p2')
      const { ctx, getState } = createMockCtx(state)

      await bjcThunks.bjcSettleBets(ctx)

      const result = getState()
      expect(result.blackjackCompetitive!.winnerIds).toContain('p1')
      expect(result.blackjackCompetitive!.winnerIds).toContain('p2')
      expect(result.wallet.p1).toBe(10010) // half of 20
      expect(result.wallet.p2).toBe(10010)
    })

    it('awards to single survivor when others bust', async () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      state = bjcReducers.bjcPlaceAnte(state, 'p1', 10)
      state = bjcReducers.bjcPlaceAnte(state, 'p2', 10)
      state = bjcReducers.bjcAddToPot(state, 20)
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('K'), card('J')], 20, false, false)
      state = bjcReducers.bjcSetPlayerCards(state, 'p2', [card('K'), card('6'), card('J')], 26, false, false)
      state = bjcReducers.bjcStandHand(state, 'p1')
      // p2 busted
      state = bjcReducers.bjcAddCardToHand(state, 'p2', card('J'), 26, false, true)

      // Fix: p2's hand already set with 3 cards, so simulate the bust properly
      // Let's redo this more cleanly
      let state2 = createTestState()
      state2 = bjcReducers.bjcInitRound(state2, ['p1', 'p2'], 1, 10)
      state2 = bjcReducers.bjcAddToPot(state2, 20)
      state2 = bjcReducers.bjcSetPlayerCards(state2, 'p1', [card('K'), card('J')], 20, false, false)
      state2 = bjcReducers.bjcStandHand(state2, 'p1')
      // p2 has busted hand
      state2 = bjcReducers.bjcSetPlayerCards(state2, 'p2', [card('K'), card('6')], 16, false, false)
      state2 = bjcReducers.bjcAddCardToHand(state2, 'p2', card('J'), 26, false, true)

      const ctx2 = createMockCtx(state2)
      await bjcThunks.bjcSettleBets(ctx2.ctx)

      const result2 = ctx2.getState()
      expect(result2.blackjackCompetitive!.winnerIds).toEqual(['p1'])
    })

    it('awards to lowest bust value when all bust (PRD 19.5)', async () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2', 'p3'], 1, 10)
      state = bjcReducers.bjcAddToPot(state, 30)
      // p1 busts with 24
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('K'), card('6')], 16, false, false)
      state = bjcReducers.bjcAddCardToHand(state, 'p1', card('8'), 24, false, true)
      // p2 busts with 27
      state = bjcReducers.bjcSetPlayerCards(state, 'p2', [card('K'), card('7')], 17, false, false)
      state = bjcReducers.bjcAddCardToHand(state, 'p2', card('K'), 27, false, true)
      // p3 busts with 22 — closest to 21, should win
      state = bjcReducers.bjcSetPlayerCards(state, 'p3', [card('K'), card('6')], 16, false, false)
      state = bjcReducers.bjcAddCardToHand(state, 'p3', card('6'), 22, false, true)

      const { ctx, getState } = createMockCtx(state)
      await bjcThunks.bjcSettleBets(ctx)

      const result = getState()
      expect(result.blackjackCompetitive!.winnerIds).toEqual(['p3'])
      expect(result.wallet.p3).toBe(10030)
    })
  })

  describe('bjcCompleteRound', () => {
    it('marks round complete', async () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      const { ctx, getState } = createMockCtx(state)

      // Set up server state with enough cards
      const shoe = shuffleShoe(createShoe(6))
      setServerGameState('test-session', {
        activeGame: 'blackjack_competitive',
        blackjackCompetitive: { shoe, playerHoleCards: new Map() },
      })

      await bjcThunks.bjcCompleteRound(ctx)

      const result = getState()
      expect(result.blackjackCompetitive!.roundCompleteReady).toBe(true)
    })
  })
})

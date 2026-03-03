import { describe, it, expect } from 'vitest'
import type { CasinoGameState, Card } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'
import { bjcReducers } from '../ruleset/bjc-reducers.js'

function card(rank: string, suit: string = 'spades'): Card {
  return { rank: rank as Card['rank'], suit: suit as Card['suit'] }
}

function createTestState(overrides: Partial<CasinoGameState> = {}): CasinoGameState {
  return {
    phase: CasinoPhase.BjcPlaceBets,
    selectedGame: 'blackjack_competitive',
    gameSelectConfirmed: true,
    gameChangeRequested: false,
    gameChangeVotes: {},
    wallet: { p1: 10000, p2: 10000, p3: 10000 },
    players: [
      { id: 'p1', name: 'Player 1', seatIndex: 0, stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
      { id: 'p2', name: 'Player 2', seatIndex: 1, stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
    ],
    dealerCharacterId: 'ace_malone',
    blindLevel: { level: 1, smallBlind: 5, bigBlind: 10, minBuyIn: 200, maxBuyIn: 2000 },
    handNumber: 1,
    dealerIndex: 0,
    lobbyReady: true,
    dealerMessage: null,
    ttsQueue: [],
    reactions: [],
    sessionStats: { handsPlayed: 0, gamesPlayed: {}, largestPot: null, playerStats: {} },
    blackjackCompetitive: undefined,
    ...overrides,
  } as CasinoGameState
}

describe('bjcReducers', () => {
  describe('bjcInitRound', () => {
    it('creates initial BJC state for given players', () => {
      const state = createTestState()
      const result = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)

      expect(result.blackjackCompetitive).toBeDefined()
      const bjc = result.blackjackCompetitive!
      expect(bjc.playerStates).toHaveLength(2)
      expect(bjc.playerStates[0]!.playerId).toBe('p1')
      expect(bjc.playerStates[1]!.playerId).toBe('p2')
      expect(bjc.pot).toBe(0)
      expect(bjc.turnOrder).toEqual(['p1', 'p2'])
      expect(bjc.currentTurnIndex).toBe(0)
      expect(bjc.roundNumber).toBe(1)
      expect(bjc.anteAmount).toBe(10)
      expect(bjc.allAntesPlaced).toBe(false)
      expect(bjc.dealComplete).toBe(false)
      expect(bjc.playerTurnsComplete).toBe(false)
      expect(bjc.showdownComplete).toBe(false)
      expect(bjc.settlementComplete).toBe(false)
      expect(bjc.roundCompleteReady).toBe(false)
      expect(bjc.winnerIds).toEqual([])
      expect(bjc.resultMessage).toBe('')
    })

    it('creates empty hands with zero bet', () => {
      const state = createTestState()
      const result = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      const bjc = result.blackjackCompetitive!

      for (const ps of bjc.playerStates) {
        expect(ps.hand.cards).toEqual([])
        expect(ps.hand.bet).toBe(0)
        expect(ps.hand.stood).toBe(false)
        expect(ps.hand.busted).toBe(false)
        expect(ps.turnComplete).toBe(false)
      }
    })
  })

  describe('bjcPlaceAnte', () => {
    it('sets bet amount on player hand', () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      state = bjcReducers.bjcPlaceAnte(state, 'p1', 10)

      const p1 = state.blackjackCompetitive!.playerStates.find(p => p.playerId === 'p1')!
      expect(p1.hand.bet).toBe(10)
    })
  })

  describe('bjcAddToPot', () => {
    it('increments pot by amount', () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      state = bjcReducers.bjcAddToPot(state, 10)
      state = bjcReducers.bjcAddToPot(state, 10)

      expect(state.blackjackCompetitive!.pot).toBe(20)
    })
  })

  describe('bjcSetPlayerCards', () => {
    it('sets cards and hand evaluation on a player', () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)

      const cards = [card('A'), card('K')]
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', cards, 21, false, true)

      const p1 = state.blackjackCompetitive!.playerStates.find(p => p.playerId === 'p1')!
      expect(p1.hand.cards).toEqual(cards)
      expect(p1.hand.value).toBe(21)
      expect(p1.hand.isBlackjack).toBe(true)
    })
  })

  describe('bjcAddCardToHand', () => {
    it('adds a card to player hand and updates values', () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1'], 1, 10)
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('5'), card('6')], 11, false, false)
      state = bjcReducers.bjcAddCardToHand(state, 'p1', card('3'), 14, false, false)

      const p1 = state.blackjackCompetitive!.playerStates.find(p => p.playerId === 'p1')!
      expect(p1.hand.cards).toHaveLength(3)
      expect(p1.hand.value).toBe(14)
      expect(p1.hand.busted).toBe(false)
      expect(p1.turnComplete).toBe(false)
    })

    it('auto-stands on bust and marks turn complete', () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1'], 1, 10)
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('K'), card('8')], 18, false, false)
      state = bjcReducers.bjcAddCardToHand(state, 'p1', card('J'), 28, false, true)

      const p1 = state.blackjackCompetitive!.playerStates.find(p => p.playerId === 'p1')!
      expect(p1.hand.busted).toBe(true)
      expect(p1.hand.stood).toBe(true)
      expect(p1.turnComplete).toBe(true)
    })
  })

  describe('bjcStandHand', () => {
    it('marks hand as stood and turn complete', () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1'], 1, 10)
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('K'), card('8')], 18, false, false)
      state = bjcReducers.bjcStandHand(state, 'p1')

      const p1 = state.blackjackCompetitive!.playerStates.find(p => p.playerId === 'p1')!
      expect(p1.hand.stood).toBe(true)
      expect(p1.turnComplete).toBe(true)
    })
  })

  describe('bjcDoubleDown', () => {
    it('adds card, marks doubled, and auto-stands', () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1'], 1, 10)
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('5'), card('6')], 11, false, false)
      state = bjcReducers.bjcDoubleDown(state, 'p1', card('K'), 21, false, false)

      const p1 = state.blackjackCompetitive!.playerStates.find(p => p.playerId === 'p1')!
      expect(p1.hand.cards).toHaveLength(3)
      expect(p1.hand.doubled).toBe(true)
      expect(p1.hand.stood).toBe(true)
      expect(p1.hand.value).toBe(21)
      expect(p1.turnComplete).toBe(true)
    })

    it('handles bust on double down', () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1'], 1, 10)
      state = bjcReducers.bjcSetPlayerCards(state, 'p1', [card('K'), card('6')], 16, false, false)
      state = bjcReducers.bjcDoubleDown(state, 'p1', card('8'), 24, false, true)

      const p1 = state.blackjackCompetitive!.playerStates.find(p => p.playerId === 'p1')!
      expect(p1.hand.busted).toBe(true)
      expect(p1.hand.doubled).toBe(true)
      expect(p1.hand.stood).toBe(true)
    })
  })

  describe('bjcAdvanceTurn', () => {
    it('increments currentTurnIndex', () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      expect(state.blackjackCompetitive!.currentTurnIndex).toBe(0)

      state = bjcReducers.bjcAdvanceTurn(state)
      expect(state.blackjackCompetitive!.currentTurnIndex).toBe(1)

      state = bjcReducers.bjcAdvanceTurn(state)
      expect(state.blackjackCompetitive!.currentTurnIndex).toBe(2)
    })
  })

  describe('bjcSetPlayerTurnsComplete', () => {
    it('sets flag to true', () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1'], 1, 10)
      state = bjcReducers.bjcSetPlayerTurnsComplete(state, true)
      expect(state.blackjackCompetitive!.playerTurnsComplete).toBe(true)
    })
  })

  describe('bjcSetShowdownComplete', () => {
    it('sets flag to true', () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1'], 1, 10)
      state = bjcReducers.bjcSetShowdownComplete(state, true)
      expect(state.blackjackCompetitive!.showdownComplete).toBe(true)
    })
  })

  describe('bjcSetSettlementResult', () => {
    it('sets winner IDs, message, and marks settlement complete', () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      state = bjcReducers.bjcSetSettlementResult(state, ['p1'], 'p1 wins!')

      const bjc = state.blackjackCompetitive!
      expect(bjc.winnerIds).toEqual(['p1'])
      expect(bjc.resultMessage).toBe('p1 wins!')
      expect(bjc.settlementComplete).toBe(true)
    })
  })

  describe('bjcSetRoundCompleteReady', () => {
    it('sets flag to true', () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1'], 1, 10)
      state = bjcReducers.bjcSetRoundCompleteReady(state, true)
      expect(state.blackjackCompetitive!.roundCompleteReady).toBe(true)
    })
  })

  describe('bjcSetShoePenetration', () => {
    it('updates shoe penetration', () => {
      let state = createTestState()
      state = bjcReducers.bjcInitRound(state, ['p1'], 1, 10)
      state = bjcReducers.bjcSetShoePenetration(state, 42.5)
      expect(state.blackjackCompetitive!.shoePenetration).toBe(42.5)
    })
  })

  describe('immutability', () => {
    it('does not mutate the original state', () => {
      const state = createTestState()
      const result = bjcReducers.bjcInitRound(state, ['p1', 'p2'], 1, 10)
      expect(state.blackjackCompetitive).toBeUndefined()
      expect(result.blackjackCompetitive).toBeDefined()
    })
  })

  describe('no-op when bjc is undefined', () => {
    it('returns state unchanged if blackjackCompetitive is not set', () => {
      const state = createTestState({ blackjackCompetitive: undefined })
      const result = bjcReducers.bjcPlaceAnte(state, 'p1', 10)
      expect(result).toBe(state)
    })
  })
})

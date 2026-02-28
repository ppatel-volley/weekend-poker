import { describe, it, expect, beforeEach } from 'vitest'
import type { CasinoGameState, Card } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'
import { bjReducers } from '../bj-reducers.js'

function card(rank: string, suit: string = 'spades'): Card {
  return { rank: rank as Card['rank'], suit: suit as Card['suit'] }
}

function createTestState(): CasinoGameState {
  return {
    phase: CasinoPhase.BjPlaceBets,
    selectedGame: 'blackjack_classic',
    gameSelectConfirmed: true,
    gameChangeRequested: false,
    gameChangeVotes: {},
    wallet: { player1: 10000, player2: 10000 },
    players: [
      { id: 'player1', name: 'Alice', seatIndex: 0, stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
      { id: 'player2', name: 'Bob', seatIndex: 1, stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
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

describe('bjReducers', () => {
  let state: CasinoGameState

  beforeEach(() => {
    state = createTestState()
  })

  describe('bjInitRound', () => {
    it('creates initial blackjack state', () => {
      const result = bjReducers.bjInitRound(state, ['player1', 'player2'], 1)
      expect(result.blackjack).toBeDefined()
      expect(result.blackjack!.playerStates.length).toBe(2)
      expect(result.blackjack!.roundNumber).toBe(1)
      expect(result.blackjack!.allBetsPlaced).toBe(false)
    })

    it('creates one empty hand per player', () => {
      const result = bjReducers.bjInitRound(state, ['player1'], 1)
      expect(result.blackjack!.playerStates[0]!.hands.length).toBe(1)
      expect(result.blackjack!.playerStates[0]!.hands[0]!.bet).toBe(0)
    })
  })

  describe('bjPlaceBet', () => {
    it('sets bet amount on a player hand', () => {
      state = bjReducers.bjInitRound(state, ['player1', 'player2'], 1)
      const result = bjReducers.bjPlaceBet(state, 'player1', 100)
      expect(result.blackjack!.playerStates[0]!.hands[0]!.bet).toBe(100)
    })

    it('does not affect other players', () => {
      state = bjReducers.bjInitRound(state, ['player1', 'player2'], 1)
      const result = bjReducers.bjPlaceBet(state, 'player1', 100)
      expect(result.blackjack!.playerStates[1]!.hands[0]!.bet).toBe(0)
    })
  })

  describe('bjSetAllBetsPlaced', () => {
    it('sets the flag', () => {
      state = bjReducers.bjInitRound(state, ['player1'], 1)
      const result = bjReducers.bjSetAllBetsPlaced(state, true)
      expect(result.blackjack!.allBetsPlaced).toBe(true)
    })
  })

  describe('bjSetPlayerCards', () => {
    it('sets player cards with evaluation', () => {
      state = bjReducers.bjInitRound(state, ['player1'], 1)
      const cards = [card('A'), card('K')]
      const result = bjReducers.bjSetPlayerCards(state, 'player1', cards, 21, true, true)
      const ps = result.blackjack!.playerStates[0]!
      expect(ps.hands[0]!.cards).toEqual(cards)
      expect(ps.hands[0]!.value).toBe(21)
      expect(ps.hands[0]!.isSoft).toBe(true)
      expect(ps.hands[0]!.isBlackjack).toBe(true)
    })
  })

  describe('bjAddCardToHand', () => {
    it('adds a card to the active hand', () => {
      state = bjReducers.bjInitRound(state, ['player1'], 1)
      state = bjReducers.bjSetPlayerCards(state, 'player1', [card('5'), card('7')], 12, false, false)
      const result = bjReducers.bjAddCardToHand(state, 'player1', card('3'), 15, false, false)
      expect(result.blackjack!.playerStates[0]!.hands[0]!.cards.length).toBe(3)
      expect(result.blackjack!.playerStates[0]!.hands[0]!.value).toBe(15)
    })

    it('marks hand as busted on bust', () => {
      state = bjReducers.bjInitRound(state, ['player1'], 1)
      state = bjReducers.bjSetPlayerCards(state, 'player1', [card('10'), card('7')], 17, false, false)
      const result = bjReducers.bjAddCardToHand(state, 'player1', card('K'), 27, false, true)
      expect(result.blackjack!.playerStates[0]!.hands[0]!.busted).toBe(true)
      expect(result.blackjack!.playerStates[0]!.hands[0]!.stood).toBe(true)
    })
  })

  describe('bjStandHand', () => {
    it('marks the active hand as stood', () => {
      state = bjReducers.bjInitRound(state, ['player1'], 1)
      const result = bjReducers.bjStandHand(state, 'player1')
      expect(result.blackjack!.playerStates[0]!.hands[0]!.stood).toBe(true)
    })
  })

  describe('bjDoubleDown', () => {
    it('adds a card and marks hand as doubled and stood', () => {
      state = bjReducers.bjInitRound(state, ['player1'], 1)
      state = bjReducers.bjSetPlayerCards(state, 'player1', [card('5'), card('6')], 11, false, false)
      const result = bjReducers.bjDoubleDown(state, 'player1', card('10'), 21, false, false)
      const hand = result.blackjack!.playerStates[0]!.hands[0]!
      expect(hand.cards.length).toBe(3)
      expect(hand.doubled).toBe(true)
      expect(hand.stood).toBe(true)
      expect(hand.value).toBe(21)
    })
  })

  describe('bjSurrender', () => {
    it('marks player as surrendered', () => {
      state = bjReducers.bjInitRound(state, ['player1'], 1)
      const result = bjReducers.bjSurrender(state, 'player1')
      expect(result.blackjack!.playerStates[0]!.surrendered).toBe(true)
      expect(result.blackjack!.playerStates[0]!.hands[0]!.stood).toBe(true)
    })
  })

  describe('bjSplitHand', () => {
    it('splits a hand into two', () => {
      state = bjReducers.bjInitRound(state, ['player1'], 1)
      state = bjReducers.bjPlaceBet(state, 'player1', 100)
      state = bjReducers.bjSetPlayerCards(state, 'player1', [card('8', 'spades'), card('8', 'hearts')], 16, false, false)

      const result = bjReducers.bjSplitHand(
        state, 'player1',
        card('3'), card('K'),
        11, false, 18, false,
      )

      const ps = result.blackjack!.playerStates[0]!
      expect(ps.hands.length).toBe(2)
      expect(ps.hands[0]!.cards.length).toBe(2)
      expect(ps.hands[1]!.cards.length).toBe(2)
      expect(ps.hands[0]!.bet).toBe(100)
      expect(ps.hands[1]!.bet).toBe(100)
    })
  })

  describe('bjAdvanceTurn', () => {
    it('increments the turn index', () => {
      state = bjReducers.bjInitRound(state, ['player1', 'player2'], 1)
      const result = bjReducers.bjAdvanceTurn(state)
      expect(result.blackjack!.currentTurnIndex).toBe(1)
    })
  })

  describe('bjSetDealerFinalHand', () => {
    it('sets dealer final hand with revealed hole card', () => {
      state = bjReducers.bjInitRound(state, ['player1'], 1)
      const cards = [card('10'), card('7')]
      const result = bjReducers.bjSetDealerFinalHand(state, cards, 17, false, false)
      expect(result.blackjack!.dealerHand.cards).toEqual(cards)
      expect(result.blackjack!.dealerHand.holeCardRevealed).toBe(true)
      expect(result.blackjack!.dealerHand.value).toBe(17)
      expect(result.blackjack!.dealerHand.busted).toBe(false)
    })
  })

  describe('bjSetInsuranceBet', () => {
    it('sets insurance bet and marks as resolved', () => {
      state = bjReducers.bjInitRound(state, ['player1'], 1)
      const result = bjReducers.bjSetInsuranceBet(state, 'player1', 50)
      expect(result.blackjack!.playerStates[0]!.insuranceBet).toBe(50)
      expect(result.blackjack!.playerStates[0]!.insuranceResolved).toBe(true)
    })
  })

  describe('bjDeclineInsurance', () => {
    it('marks insurance as resolved without bet', () => {
      state = bjReducers.bjInitRound(state, ['player1'], 1)
      const result = bjReducers.bjDeclineInsurance(state, 'player1')
      expect(result.blackjack!.playerStates[0]!.insuranceBet).toBe(0)
      expect(result.blackjack!.playerStates[0]!.insuranceResolved).toBe(true)
    })
  })

  describe('phase transition flags', () => {
    it('sets all flags correctly', () => {
      state = bjReducers.bjInitRound(state, ['player1'], 1)

      let result = bjReducers.bjSetDealComplete(state, true)
      expect(result.blackjack!.dealComplete).toBe(true)

      result = bjReducers.bjSetInsuranceComplete(state, true)
      expect(result.blackjack!.insuranceComplete).toBe(true)

      result = bjReducers.bjSetPlayerTurnsComplete(state, true)
      expect(result.blackjack!.playerTurnsComplete).toBe(true)

      result = bjReducers.bjSetDealerTurnComplete(state, true)
      expect(result.blackjack!.dealerTurnComplete).toBe(true)

      result = bjReducers.bjSetSettlementComplete(state, true)
      expect(result.blackjack!.settlementComplete).toBe(true)

      result = bjReducers.bjSetRoundCompleteReady(state, true)
      expect(result.blackjack!.roundCompleteReady).toBe(true)
    })
  })

  describe('returns state unchanged when no blackjack sub-state', () => {
    it('bjPlaceBet does nothing', () => {
      const plain = createTestState()
      const result = bjReducers.bjPlaceBet(plain, 'player1', 100)
      expect(result.blackjack).toBeUndefined()
    })
  })
})

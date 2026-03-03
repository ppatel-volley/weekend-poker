import { describe, it, expect, beforeEach } from 'vitest'
import { tcpReducers } from '../ruleset/tcp-reducers.js'
import { createInitialCasinoState } from '../ruleset/casino-state.js'
import type { CasinoGameState } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'

describe('TCP Reducers', () => {
  let state: CasinoGameState

  beforeEach(() => {
    state = createInitialCasinoState({
      phase: CasinoPhase.TcpPlaceBets,
      selectedGame: 'three_card_poker',
      players: [
        { id: 'p1', name: 'Alice', seatIndex: 0, stack: 1000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
        { id: 'p2', name: 'Bob', seatIndex: 1, stack: 1000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
      ] as any,
      wallet: { p1: 1000, p2: 1000 },
    })
  })

  describe('tcpInitRound', () => {
    it('creates TCP sub-state with player hands', () => {
      const result = tcpReducers.tcpInitRound(state, ['p1', 'p2'], 1)
      expect(result.threeCardPoker).toBeDefined()
      expect(result.threeCardPoker!.playerHands).toHaveLength(2)
      expect(result.threeCardPoker!.playerHands[0]!.playerId).toBe('p1')
      expect(result.threeCardPoker!.playerHands[1]!.playerId).toBe('p2')
      expect(result.threeCardPoker!.roundNumber).toBe(1)
      expect(result.threeCardPoker!.allAntesPlaced).toBe(false)
    })

    it('initialises all transition flags to false', () => {
      const result = tcpReducers.tcpInitRound(state, ['p1'], 1)
      const tcp = result.threeCardPoker!
      expect(tcp.allAntesPlaced).toBe(false)
      expect(tcp.dealComplete).toBe(false)
      expect(tcp.allDecisionsMade).toBe(false)
      expect(tcp.dealerRevealed).toBe(false)
      expect(tcp.payoutComplete).toBe(false)
      expect(tcp.roundCompleteReady).toBe(false)
    })

    it('initialises player hands with zero bets and undecided decision', () => {
      const result = tcpReducers.tcpInitRound(state, ['p1'], 1)
      const hand = result.threeCardPoker!.playerHands[0]!
      expect(hand.anteBet).toBe(0)
      expect(hand.playBet).toBe(0)
      expect(hand.pairPlusBet).toBe(0)
      expect(hand.decision).toBe('undecided')
      expect(hand.handRank).toBeNull()
    })
  })

  describe('tcpPlaceAnte', () => {
    it('sets ante bet for the correct player', () => {
      state = tcpReducers.tcpInitRound(state, ['p1', 'p2'], 1)
      const result = tcpReducers.tcpPlaceAnte(state, 'p1', 50)
      expect(result.threeCardPoker!.playerHands[0]!.anteBet).toBe(50)
      expect(result.threeCardPoker!.playerHands[1]!.anteBet).toBe(0)
    })

    it('returns state unchanged if no TCP sub-state', () => {
      const result = tcpReducers.tcpPlaceAnte(state, 'p1', 50)
      expect(result).toBe(state)
    })
  })

  describe('tcpPlacePairPlus', () => {
    it('sets Pair Plus bet for the correct player', () => {
      state = tcpReducers.tcpInitRound(state, ['p1', 'p2'], 1)
      const result = tcpReducers.tcpPlacePairPlus(state, 'p2', 25)
      expect(result.threeCardPoker!.playerHands[1]!.pairPlusBet).toBe(25)
      expect(result.threeCardPoker!.playerHands[0]!.pairPlusBet).toBe(0)
    })
  })

  describe('tcpSetPlayerDecision', () => {
    it('sets decision to play and play bet to ante amount', () => {
      state = tcpReducers.tcpInitRound(state, ['p1'], 1)
      state = tcpReducers.tcpPlaceAnte(state, 'p1', 50)
      const result = tcpReducers.tcpSetPlayerDecision(state, 'p1', 'play')
      expect(result.threeCardPoker!.playerHands[0]!.decision).toBe('play')
      expect(result.threeCardPoker!.playerHands[0]!.playBet).toBe(50)
    })

    it('sets decision to fold and play bet to 0', () => {
      state = tcpReducers.tcpInitRound(state, ['p1'], 1)
      state = tcpReducers.tcpPlaceAnte(state, 'p1', 50)
      const result = tcpReducers.tcpSetPlayerDecision(state, 'p1', 'fold')
      expect(result.threeCardPoker!.playerHands[0]!.decision).toBe('fold')
      expect(result.threeCardPoker!.playerHands[0]!.playBet).toBe(0)
    })
  })

  describe('tcpSetPlayerCards', () => {
    it('assigns cards to the correct player', () => {
      state = tcpReducers.tcpInitRound(state, ['p1'], 1)
      const cards = [
        { rank: 'A' as const, suit: 'spades' as const },
        { rank: 'K' as const, suit: 'hearts' as const },
        { rank: 'Q' as const, suit: 'diamonds' as const },
      ]
      const result = tcpReducers.tcpSetPlayerCards(state, 'p1', cards)
      expect(result.threeCardPoker!.playerHands[0]!.cards).toEqual(cards)
    })
  })

  describe('tcpSetDealerCards', () => {
    it('assigns cards to the dealer', () => {
      state = tcpReducers.tcpInitRound(state, ['p1'], 1)
      const cards = [
        { rank: 'J' as const, suit: 'spades' as const },
        { rank: '5' as const, suit: 'hearts' as const },
        { rank: '2' as const, suit: 'diamonds' as const },
      ]
      const result = tcpReducers.tcpSetDealerCards(state, cards)
      expect(result.threeCardPoker!.dealerHand.cards).toEqual(cards)
    })
  })

  describe('tcpRevealDealer', () => {
    it('sets dealer hand rank, strength, qualification, and revealed flag', () => {
      state = tcpReducers.tcpInitRound(state, ['p1'], 1)
      const result = tcpReducers.tcpRevealDealer(state, 'pair', 2210, true)
      const tcp = result.threeCardPoker!
      expect(tcp.dealerHand.revealed).toBe(true)
      expect(tcp.dealerHand.handRank).toBe('pair')
      expect(tcp.dealerHand.handStrength).toBe(2210)
      expect(tcp.dealerQualifies).toBe(true)
      expect(tcp.dealerRevealed).toBe(true)
    })
  })

  describe('phase transition flags', () => {
    it('tcpSetAllAntesPlaced', () => {
      state = tcpReducers.tcpInitRound(state, ['p1'], 1)
      const result = tcpReducers.tcpSetAllAntesPlaced(state, true)
      expect(result.threeCardPoker!.allAntesPlaced).toBe(true)
    })

    it('tcpSetDealComplete', () => {
      state = tcpReducers.tcpInitRound(state, ['p1'], 1)
      const result = tcpReducers.tcpSetDealComplete(state, true)
      expect(result.threeCardPoker!.dealComplete).toBe(true)
    })

    it('tcpSetAllDecisionsMade', () => {
      state = tcpReducers.tcpInitRound(state, ['p1'], 1)
      const result = tcpReducers.tcpSetAllDecisionsMade(state, true)
      expect(result.threeCardPoker!.allDecisionsMade).toBe(true)
    })

    it('tcpSetPayoutComplete', () => {
      state = tcpReducers.tcpInitRound(state, ['p1'], 1)
      const result = tcpReducers.tcpSetPayoutComplete(state, true)
      expect(result.threeCardPoker!.payoutComplete).toBe(true)
    })

    it('tcpSetRoundCompleteReady', () => {
      state = tcpReducers.tcpInitRound(state, ['p1'], 1)
      const result = tcpReducers.tcpSetRoundCompleteReady(state, true)
      expect(result.threeCardPoker!.roundCompleteReady).toBe(true)
    })
  })

  describe('tcpSetPlayerPayout', () => {
    it('sets payout results for the correct player', () => {
      state = tcpReducers.tcpInitRound(state, ['p1', 'p2'], 1)
      const result = tcpReducers.tcpSetPlayerPayout(state, 'p1', 50, 100, 300, 150)
      const hand = result.threeCardPoker!.playerHands[0]!
      expect(hand.anteBonus).toBe(50)
      expect(hand.pairPlusPayout).toBe(100)
      expect(hand.totalPayout).toBe(300)
      expect(hand.roundResult).toBe(150)
    })
  })
})

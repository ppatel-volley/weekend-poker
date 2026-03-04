import { describe, it, expect } from 'vitest'
import type { CasinoGameState, BlackjackPlayerState, BjcPlayerState, TcpPlayerHand, RouletteBet } from '@weekend-casino/shared'
import { createInitialCasinoState } from '../ruleset/casino-state.js'
import { detectAchievements } from '../game-night-engine/achievements.js'

function makeState(overrides: Partial<CasinoGameState> = {}): CasinoGameState {
  return createInitialCasinoState({
    players: [
      { id: 'p1', name: 'Alice', avatarId: 'default', seatIndex: 0, isHost: true, isReady: true, currentGameStatus: 'active', stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
    ],
    ...overrides,
  })
}

describe('detectAchievements', () => {
  it('should return empty array when no game selected', () => {
    const state = makeState({ selectedGame: null })
    expect(detectAchievements(state)).toEqual([])
  })

  it('should return empty array when no special hands', () => {
    const state = makeState({ selectedGame: 'holdem', communityCards: [] })
    expect(detectAchievements(state)).toEqual([])
  })

  describe('Blackjack Classic — NATURAL_BLACKJACK', () => {
    it('should detect natural blackjack', () => {
      const ps: BlackjackPlayerState = {
        playerId: 'p1',
        hands: [{
          cards: [
            { rank: 'A', suit: 'spades' },
            { rank: 'K', suit: 'hearts' },
          ],
          stood: false,
          busted: false,
          isBlackjack: true,
          doubled: false,
          bet: 100,
          value: 21,
          isSoft: true,
        }],
        activeHandIndex: 0,
        insuranceBet: 0,
        insuranceResolved: false,
        surrendered: false,
        totalPayout: 250,
        roundResult: 150,
      }

      const state = makeState({
        selectedGame: 'blackjack_classic',
        blackjack: {
          playerStates: [ps],
          dealerHand: { cards: [], holeCardRevealed: false, value: 0, isSoft: false, busted: false, isBlackjack: false },
          turnOrder: ['p1'],
          currentTurnIndex: 0,
          allBetsPlaced: true,
          dealComplete: true,
          insuranceComplete: true,
          playerTurnsComplete: true,
          dealerTurnComplete: true,
          settlementComplete: true,
          roundCompleteReady: true,
          roundNumber: 1,
          shoePenetration: 10,
          config: { minBet: 10, maxBet: 500, dealerHitsSoft17: false, numberOfDecks: 6, reshuffleThreshold: 0.75, blackjackPaysRatio: 1.5, insuranceEnabled: true, surrenderEnabled: true, splitEnabled: true, maxSplits: 3 },
        },
      })

      const achievements = detectAchievements(state)
      expect(achievements).toHaveLength(1)
      expect(achievements[0]).toEqual({ playerId: 'p1', type: 'NATURAL_BLACKJACK' })
    })

    it('should not detect when no natural blackjack', () => {
      const ps: BlackjackPlayerState = {
        playerId: 'p1',
        hands: [{
          cards: [{ rank: '10', suit: 'spades' }, { rank: '5', suit: 'hearts' }],
          stood: true,
          busted: false,
          isBlackjack: false,
          doubled: false,
          bet: 100,
          value: 15,
          isSoft: false,
        }],
        activeHandIndex: 0,
        insuranceBet: 0,
        insuranceResolved: false,
        surrendered: false,
        totalPayout: 0,
        roundResult: -100,
      }

      const state = makeState({
        selectedGame: 'blackjack_classic',
        blackjack: {
          playerStates: [ps],
          dealerHand: { cards: [], holeCardRevealed: false, value: 0, isSoft: false, busted: false, isBlackjack: false },
          turnOrder: ['p1'],
          currentTurnIndex: 0,
          allBetsPlaced: true,
          dealComplete: true,
          insuranceComplete: true,
          playerTurnsComplete: true,
          dealerTurnComplete: true,
          settlementComplete: true,
          roundCompleteReady: true,
          roundNumber: 1,
          shoePenetration: 10,
          config: { minBet: 10, maxBet: 500, dealerHitsSoft17: false, numberOfDecks: 6, reshuffleThreshold: 0.75, blackjackPaysRatio: 1.5, insuranceEnabled: true, surrenderEnabled: true, splitEnabled: true, maxSplits: 3 },
        },
      })

      expect(detectAchievements(state)).toEqual([])
    })
  })

  describe('Blackjack Competitive — NATURAL_BLACKJACK', () => {
    it('should detect natural blackjack in competitive mode', () => {
      const ps: BjcPlayerState = {
        playerId: 'p1',
        hand: {
          cards: [{ rank: 'A', suit: 'hearts' }, { rank: 'Q', suit: 'spades' }],
          stood: false,
          busted: false,
          isBlackjack: true,
          doubled: false,
          bet: 100,
          value: 21,
          isSoft: true,
        },
        turnComplete: true,
      }

      const state = makeState({
        selectedGame: 'blackjack_competitive',
        blackjackCompetitive: {
          playerStates: [ps],
          pot: 200,
          turnOrder: ['p1'],
          currentTurnIndex: 0,
          allAntesPlaced: true,
          dealComplete: true,
          playerTurnsComplete: true,
          showdownComplete: true,
          settlementComplete: true,
          roundCompleteReady: true,
          roundNumber: 1,
          shoePenetration: 10,
          anteAmount: 100,
          winnerIds: ['p1'],
          resultMessage: 'Player 1 wins!',
        },
      })

      const achievements = detectAchievements(state)
      expect(achievements).toHaveLength(1)
      expect(achievements[0]).toEqual({ playerId: 'p1', type: 'NATURAL_BLACKJACK' })
    })
  })

  describe('Three Card Poker — TCP_STRAIGHT_FLUSH and TCP_MINI_ROYAL', () => {
    it('should detect TCP straight flush', () => {
      const ph: TcpPlayerHand = {
        playerId: 'p1',
        cards: [
          { rank: '5', suit: 'hearts' },
          { rank: '6', suit: 'hearts' },
          { rank: '7', suit: 'hearts' },
        ],
        anteBet: 50,
        playBet: 50,
        pairPlusBet: 0,
        decision: 'play',
        handRank: 'straight_flush',
        handStrength: 900,
        anteBonus: 200,
        pairPlusPayout: 0,
        totalPayout: 500,
        roundResult: 400,
      }

      const state = makeState({
        selectedGame: 'three_card_poker',
        threeCardPoker: {
          playerHands: [ph],
          dealerHand: { cards: [], revealed: true, handRank: 'high_card', handStrength: 100 },
          dealerQualifies: true,
          allAntesPlaced: true,
          dealComplete: true,
          allDecisionsMade: true,
          dealerRevealed: true,
          payoutComplete: true,
          roundCompleteReady: true,
          roundNumber: 1,
          config: { minAnte: 10, maxAnte: 500, maxPairPlus: 100 },
        },
      })

      const achievements = detectAchievements(state)
      expect(achievements).toHaveLength(1)
      expect(achievements[0]).toEqual({ playerId: 'p1', type: 'TCP_STRAIGHT_FLUSH' })
    })

    it('should detect TCP mini royal (AKQ suited)', () => {
      const ph: TcpPlayerHand = {
        playerId: 'p1',
        cards: [
          { rank: 'A', suit: 'spades' },
          { rank: 'K', suit: 'spades' },
          { rank: 'Q', suit: 'spades' },
        ],
        anteBet: 50,
        playBet: 50,
        pairPlusBet: 25,
        decision: 'play',
        handRank: 'straight_flush',
        handStrength: 999,
        anteBonus: 500,
        pairPlusPayout: 1000,
        totalPayout: 2000,
        roundResult: 1875,
      }

      const state = makeState({
        selectedGame: 'three_card_poker',
        threeCardPoker: {
          playerHands: [ph],
          dealerHand: { cards: [], revealed: true, handRank: 'high_card', handStrength: 100 },
          dealerQualifies: true,
          allAntesPlaced: true,
          dealComplete: true,
          allDecisionsMade: true,
          dealerRevealed: true,
          payoutComplete: true,
          roundCompleteReady: true,
          roundNumber: 1,
          config: { minAnte: 10, maxAnte: 500, maxPairPlus: 100 },
        },
      })

      const achievements = detectAchievements(state)
      expect(achievements).toHaveLength(1)
      expect(achievements[0]).toEqual({ playerId: 'p1', type: 'TCP_MINI_ROYAL' })
    })
  })

  describe('Roulette — STRAIGHT_UP_HIT', () => {
    it('should detect straight-up hit', () => {
      const bet: RouletteBet = {
        id: 'bet-1',
        playerId: 'p1',
        type: 'straight_up',
        amount: 10,
        numbers: [17],
        status: 'won',
        payout: 350,
      }

      const state = makeState({
        selectedGame: 'roulette',
        roulette: {
          winningNumber: 17,
          winningColour: 'black',
          bets: [bet],
          players: [],
          history: [],
          spinState: 'stopped',
          nearMisses: [],
          allBetsPlaced: true,
          bettingClosed: true,
          spinComplete: true,
          resultAnnounced: true,
          payoutComplete: true,
          roundCompleteReady: true,
          roundNumber: 1,
          config: { minBet: 5, maxInsideBet: 100, maxOutsideBet: 500, maxTotalBet: 1000, laPartage: false },
        },
      })

      const achievements = detectAchievements(state)
      expect(achievements).toHaveLength(1)
      expect(achievements[0]).toEqual({ playerId: 'p1', type: 'STRAIGHT_UP_HIT' })
    })

    it('should not detect when no straight-up bet won', () => {
      const bet: RouletteBet = {
        id: 'bet-1',
        playerId: 'p1',
        type: 'red',
        amount: 50,
        numbers: [],
        status: 'won',
        payout: 100,
      }

      const state = makeState({
        selectedGame: 'roulette',
        roulette: {
          winningNumber: 17,
          winningColour: 'black',
          bets: [bet],
          players: [],
          history: [],
          spinState: 'stopped',
          nearMisses: [],
          allBetsPlaced: true,
          bettingClosed: true,
          spinComplete: true,
          resultAnnounced: true,
          payoutComplete: true,
          roundCompleteReady: true,
          roundNumber: 1,
          config: { minBet: 5, maxInsideBet: 100, maxOutsideBet: 500, maxTotalBet: 1000, laPartage: false },
        },
      })

      expect(detectAchievements(state)).toEqual([])
    })
  })

  it('should return empty when game state sub-object is missing', () => {
    expect(detectAchievements(makeState({ selectedGame: 'blackjack_classic' }))).toEqual([])
    expect(detectAchievements(makeState({ selectedGame: 'three_card_poker' }))).toEqual([])
    expect(detectAchievements(makeState({ selectedGame: 'roulette' }))).toEqual([])
  })
})

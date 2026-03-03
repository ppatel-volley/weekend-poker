import { describe, it, expect, beforeEach } from 'vitest'
import { rouletteReducers } from '../ruleset/roulette-reducers.js'
import { createInitialCasinoState } from '../ruleset/casino-state.js'
import type { CasinoGameState, RouletteBet, RouletteHistoryEntry } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'

describe('Roulette Reducers', () => {
  let state: CasinoGameState

  beforeEach(() => {
    state = createInitialCasinoState({
      phase: CasinoPhase.RoulettePlaceBets,
      selectedGame: 'roulette',
      players: [
        { id: 'p1', name: 'Alice', seatIndex: 0, stack: 1000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
        { id: 'p2', name: 'Bob', seatIndex: 1, stack: 1000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
      ] as any,
      wallet: { p1: 1000, p2: 1000 },
    })
  })

  describe('rouletteInitRound', () => {
    it('creates roulette sub-state with players', () => {
      const result = rouletteReducers.rouletteInitRound(state, ['p1', 'p2'], 1)
      expect(result.roulette).toBeDefined()
      expect(result.roulette!.players).toHaveLength(2)
      expect(result.roulette!.players[0]!.playerId).toBe('p1')
      expect(result.roulette!.players[1]!.playerId).toBe('p2')
      expect(result.roulette!.roundNumber).toBe(1)
    })

    it('initialises all phase flags to false', () => {
      const result = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      const r = result.roulette!
      expect(r.allBetsPlaced).toBe(false)
      expect(r.bettingClosed).toBe(false)
      expect(r.spinComplete).toBe(false)
      expect(r.resultAnnounced).toBe(false)
      expect(r.payoutComplete).toBe(false)
      expect(r.roundCompleteReady).toBe(false)
    })

    it('initialises player state correctly', () => {
      const result = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      const player = result.roulette!.players[0]!
      expect(player.totalBet).toBe(0)
      expect(player.totalPayout).toBe(0)
      expect(player.roundResult).toBe(0)
      expect(player.betsConfirmed).toBe(false)
      expect(player.favouriteNumbers).toEqual([])
    })

    it('starts with no bets, null winning number, idle spin', () => {
      const result = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      const r = result.roulette!
      expect(r.bets).toEqual([])
      expect(r.winningNumber).toBeNull()
      expect(r.winningColour).toBeNull()
      expect(r.spinState).toBe('idle')
    })

    it('preserves history from previous round', () => {
      // Set up previous round
      state = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      const entry: RouletteHistoryEntry = { roundNumber: 1, number: 17, colour: 'red' }
      state = rouletteReducers.rouletteAddHistory(state, entry)

      // Init new round
      const result = rouletteReducers.rouletteInitRound(state, ['p1'], 2)
      expect(result.roulette!.history).toHaveLength(1)
      expect(result.roulette!.history[0]!.number).toBe(17)
    })

    it('preserves favourite numbers from previous round', () => {
      state = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      state = rouletteReducers.rouletteSetFavouriteNumbers(state, 'p1', [7, 17, 23])

      const result = rouletteReducers.rouletteInitRound(state, ['p1'], 2)
      expect(result.roulette!.players[0]!.favouriteNumbers).toEqual([7, 17, 23])
    })
  })

  describe('roulettePlaceBet', () => {
    beforeEach(() => {
      state = rouletteReducers.rouletteInitRound(state, ['p1', 'p2'], 1)
    })

    it('adds a bet to the bets array', () => {
      const bet: RouletteBet = {
        id: 'b1',
        playerId: 'p1',
        type: 'red',
        amount: 10,
        numbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
        status: 'active',
        payout: 0,
      }
      const result = rouletteReducers.roulettePlaceBet(state, bet)
      expect(result.roulette!.bets).toHaveLength(1)
      expect(result.roulette!.bets[0]!.id).toBe('b1')
    })

    it('updates player totalBet', () => {
      const bet: RouletteBet = {
        id: 'b1',
        playerId: 'p1',
        type: 'red',
        amount: 25,
        numbers: [],
        status: 'active',
        payout: 0,
      }
      const result = rouletteReducers.roulettePlaceBet(state, bet)
      expect(result.roulette!.players[0]!.totalBet).toBe(25)
      expect(result.roulette!.players[1]!.totalBet).toBe(0) // other player unaffected
    })

    it('returns state unchanged if no roulette sub-state', () => {
      const bare = createInitialCasinoState()
      const bet: RouletteBet = {
        id: 'b1', playerId: 'p1', type: 'red', amount: 10, numbers: [], status: 'active', payout: 0,
      }
      const result = rouletteReducers.roulettePlaceBet(bare, bet)
      expect(result).toBe(bare)
    })
  })

  describe('rouletteRemoveBet', () => {
    beforeEach(() => {
      state = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      const bet: RouletteBet = {
        id: 'b1', playerId: 'p1', type: 'red', amount: 20, numbers: [], status: 'active', payout: 0,
      }
      state = rouletteReducers.roulettePlaceBet(state, bet)
    })

    it('removes a bet by ID', () => {
      const result = rouletteReducers.rouletteRemoveBet(state, 'b1')
      expect(result.roulette!.bets).toHaveLength(0)
    })

    it('decreases player totalBet', () => {
      const result = rouletteReducers.rouletteRemoveBet(state, 'b1')
      expect(result.roulette!.players[0]!.totalBet).toBe(0)
    })

    it('does nothing for non-existent bet', () => {
      const result = rouletteReducers.rouletteRemoveBet(state, 'nonexistent')
      expect(result.roulette!.bets).toHaveLength(1)
    })
  })

  describe('rouletteClearPlayerBets', () => {
    it('removes all bets for a player', () => {
      state = rouletteReducers.rouletteInitRound(state, ['p1', 'p2'], 1)
      state = rouletteReducers.roulettePlaceBet(state, {
        id: 'b1', playerId: 'p1', type: 'red', amount: 10, numbers: [], status: 'active', payout: 0,
      })
      state = rouletteReducers.roulettePlaceBet(state, {
        id: 'b2', playerId: 'p1', type: 'black', amount: 10, numbers: [], status: 'active', payout: 0,
      })
      state = rouletteReducers.roulettePlaceBet(state, {
        id: 'b3', playerId: 'p2', type: 'odd', amount: 10, numbers: [], status: 'active', payout: 0,
      })

      const result = rouletteReducers.rouletteClearPlayerBets(state, 'p1')
      expect(result.roulette!.bets).toHaveLength(1)
      expect(result.roulette!.bets[0]!.playerId).toBe('p2')
      expect(result.roulette!.players.find(p => p.playerId === 'p1')!.totalBet).toBe(0)
    })
  })

  describe('rouletteConfirmBets', () => {
    it('marks player bets as confirmed', () => {
      state = rouletteReducers.rouletteInitRound(state, ['p1', 'p2'], 1)
      const result = rouletteReducers.rouletteConfirmBets(state, 'p1')
      expect(result.roulette!.players[0]!.betsConfirmed).toBe(true)
      expect(result.roulette!.players[1]!.betsConfirmed).toBe(false)
    })
  })

  describe('rouletteSetWinningNumber', () => {
    it('sets winning number and colour', () => {
      state = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      const result = rouletteReducers.rouletteSetWinningNumber(state, 17, 'red')
      expect(result.roulette!.winningNumber).toBe(17)
      expect(result.roulette!.winningColour).toBe('red')
      expect(result.roulette!.spinState).toBe('spinning')
    })
  })

  describe('rouletteSetSpinState', () => {
    it('updates spin state', () => {
      state = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      const result = rouletteReducers.rouletteSetSpinState(state, 'stopped')
      expect(result.roulette!.spinState).toBe('stopped')
    })
  })

  describe('rouletteResolveBets', () => {
    it('marks bets as won/lost with payout', () => {
      state = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      state = rouletteReducers.roulettePlaceBet(state, {
        id: 'b1', playerId: 'p1', type: 'red', amount: 10, numbers: [], status: 'active', payout: 0,
      })
      state = rouletteReducers.roulettePlaceBet(state, {
        id: 'b2', playerId: 'p1', type: 'black', amount: 10, numbers: [], status: 'active', payout: 0,
      })

      const resolved = [
        { betId: 'b1', status: 'won' as const, payout: 10 },
        { betId: 'b2', status: 'lost' as const, payout: 0 },
      ]

      const result = rouletteReducers.rouletteResolveBets(state, resolved)
      expect(result.roulette!.bets[0]!.status).toBe('won')
      expect(result.roulette!.bets[0]!.payout).toBe(10)
      expect(result.roulette!.bets[1]!.status).toBe('lost')
      expect(result.roulette!.bets[1]!.payout).toBe(0)
    })
  })

  describe('rouletteSetPlayerPayout', () => {
    it('sets player payout and round result', () => {
      state = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      const result = rouletteReducers.rouletteSetPlayerPayout(state, 'p1', 100, 75)
      const player = result.roulette!.players[0]!
      expect(player.totalPayout).toBe(100)
      expect(player.roundResult).toBe(75)
    })
  })

  describe('rouletteSetNearMisses', () => {
    it('sets near-miss data', () => {
      state = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      const nearMisses = [{ playerId: 'p1', betNumber: 15 }]
      const result = rouletteReducers.rouletteSetNearMisses(state, nearMisses)
      expect(result.roulette!.nearMisses).toEqual(nearMisses)
    })
  })

  describe('rouletteAddHistory', () => {
    it('adds an entry to history', () => {
      state = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      const entry: RouletteHistoryEntry = { roundNumber: 1, number: 17, colour: 'red' }
      const result = rouletteReducers.rouletteAddHistory(state, entry)
      expect(result.roulette!.history).toHaveLength(1)
      expect(result.roulette!.history[0]).toEqual(entry)
    })

    it('keeps only the last 20 entries', () => {
      state = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      for (let i = 1; i <= 25; i++) {
        state = rouletteReducers.rouletteAddHistory(state, {
          roundNumber: i,
          number: i % 37,
          colour: 'red',
        })
      }
      expect(state.roulette!.history).toHaveLength(20)
      expect(state.roulette!.history[0]!.roundNumber).toBe(6)
      expect(state.roulette!.history[19]!.roundNumber).toBe(25)
    })
  })

  describe('rouletteSetFavouriteNumbers', () => {
    it('sets favourite numbers for a player', () => {
      state = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      const result = rouletteReducers.rouletteSetFavouriteNumbers(state, 'p1', [7, 17, 23])
      expect(result.roulette!.players[0]!.favouriteNumbers).toEqual([7, 17, 23])
    })

    it('limits to 5 favourite numbers', () => {
      state = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
      const result = rouletteReducers.rouletteSetFavouriteNumbers(state, 'p1', [1, 2, 3, 4, 5, 6, 7])
      expect(result.roulette!.players[0]!.favouriteNumbers).toHaveLength(5)
    })
  })

  describe('phase transition flag setters', () => {
    beforeEach(() => {
      state = rouletteReducers.rouletteInitRound(state, ['p1'], 1)
    })

    it('rouletteSetAllBetsPlaced', () => {
      const result = rouletteReducers.rouletteSetAllBetsPlaced(state, true)
      expect(result.roulette!.allBetsPlaced).toBe(true)
    })

    it('rouletteSetBettingClosed', () => {
      const result = rouletteReducers.rouletteSetBettingClosed(state, true)
      expect(result.roulette!.bettingClosed).toBe(true)
    })

    it('rouletteSetSpinComplete', () => {
      const result = rouletteReducers.rouletteSetSpinComplete(state, true)
      expect(result.roulette!.spinComplete).toBe(true)
    })

    it('rouletteSetResultAnnounced', () => {
      const result = rouletteReducers.rouletteSetResultAnnounced(state, true)
      expect(result.roulette!.resultAnnounced).toBe(true)
    })

    it('rouletteSetPayoutComplete', () => {
      const result = rouletteReducers.rouletteSetPayoutComplete(state, true)
      expect(result.roulette!.payoutComplete).toBe(true)
    })

    it('rouletteSetRoundCompleteReady', () => {
      const result = rouletteReducers.rouletteSetRoundCompleteReady(state, true)
      expect(result.roulette!.roundCompleteReady).toBe(true)
    })

    it('all flag setters return state unchanged when no roulette sub-state', () => {
      const bare = createInitialCasinoState()
      expect(rouletteReducers.rouletteSetAllBetsPlaced(bare, true)).toBe(bare)
      expect(rouletteReducers.rouletteSetBettingClosed(bare, true)).toBe(bare)
      expect(rouletteReducers.rouletteSetSpinComplete(bare, true)).toBe(bare)
      expect(rouletteReducers.rouletteSetResultAnnounced(bare, true)).toBe(bare)
      expect(rouletteReducers.rouletteSetPayoutComplete(bare, true)).toBe(bare)
      expect(rouletteReducers.rouletteSetRoundCompleteReady(bare, true)).toBe(bare)
    })
  })
})

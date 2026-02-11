import { describe, it, expect } from 'vitest'
import type { PokerGameState, PokerPlayer } from '@weekend-poker/shared'
import { PokerPhase, DEFAULT_BLIND_LEVEL, STARTING_STACK } from '@weekend-poker/shared'
import { createInitialState } from '../../ruleset/index.js'
import {
  getLegalActions,
  getBetLimits,
  isBettingRoundComplete,
  isOnlyOnePlayerRemaining,
  areAllRemainingPlayersAllIn,
} from '../betting.js'

/** Helper to create a test player. */
function makePlayer(overrides: Partial<PokerPlayer> = {}): PokerPlayer {
  return {
    id: 'player-1',
    name: 'Alice',
    seatIndex: 0,
    stack: STARTING_STACK,
    bet: 0,
    status: 'active',
    lastAction: null,
    isBot: false,
    isConnected: true,
    sittingOutHandCount: 0,
    ...overrides,
  }
}

/** Helper to create a game state with players in a betting phase. */
function bettingState(overrides: Partial<PokerGameState> = {}): PokerGameState {
  return createInitialState({
    phase: PokerPhase.FlopBetting,
    currentBet: 0,
    minRaiseIncrement: DEFAULT_BLIND_LEVEL.bigBlind,
    ...overrides,
  })
}

// ── getLegalActions ──────────────────────────────────────────

describe('getLegalActions', () => {
  describe('no bet this round (unopened)', () => {
    it('should allow fold, check, bet, all-in', () => {
      const state = bettingState({
        players: [
          makePlayer({ id: 'p0', seatIndex: 0, stack: 500 }),
          makePlayer({ id: 'p1', seatIndex: 1, stack: 500 }),
        ],
        currentBet: 0,
        activePlayerIndex: 0,
      })

      const actions = getLegalActions(state, 'p0')

      expect(actions).toContain('fold')
      expect(actions).toContain('check')
      expect(actions).toContain('bet')
      expect(actions).toContain('all_in')
      expect(actions).not.toContain('call')
      expect(actions).not.toContain('raise')
    })
  })

  describe('facing a bet or raise', () => {
    it('should allow fold, call, raise, all-in', () => {
      const state = bettingState({
        players: [
          makePlayer({ id: 'p0', seatIndex: 0, stack: 500 }),
          makePlayer({ id: 'p1', seatIndex: 1, stack: 500, bet: 50 }),
        ],
        currentBet: 50,
        activePlayerIndex: 0,
      })

      const actions = getLegalActions(state, 'p0')

      expect(actions).toContain('fold')
      expect(actions).toContain('call')
      expect(actions).toContain('raise')
      expect(actions).toContain('all_in')
      expect(actions).not.toContain('check')
      expect(actions).not.toContain('bet')
    })
  })

  describe('player already all-in', () => {
    it('should return an empty array', () => {
      const state = bettingState({
        players: [
          makePlayer({ id: 'p0', seatIndex: 0, stack: 0, status: 'all_in', bet: 500 }),
          makePlayer({ id: 'p1', seatIndex: 1, stack: 500 }),
        ],
        currentBet: 500,
        activePlayerIndex: 0,
      })

      const actions = getLegalActions(state, 'p0')

      expect(actions).toHaveLength(0)
    })
  })

  describe('folded player', () => {
    it('should return an empty array', () => {
      const state = bettingState({
        players: [
          makePlayer({ id: 'p0', seatIndex: 0, status: 'folded' }),
          makePlayer({ id: 'p1', seatIndex: 1, stack: 500 }),
        ],
        activePlayerIndex: 0,
      })

      const actions = getLegalActions(state, 'p0')

      expect(actions).toHaveLength(0)
    })
  })

  describe('player cannot afford minimum raise', () => {
    it('should not include raise but should include all-in', () => {
      const state = bettingState({
        players: [
          makePlayer({ id: 'p0', seatIndex: 0, stack: 15, bet: 0 }),
          makePlayer({ id: 'p1', seatIndex: 1, stack: 500, bet: 50 }),
        ],
        currentBet: 50,
        minRaiseIncrement: 50,
        activePlayerIndex: 0,
      })

      const actions = getLegalActions(state, 'p0')

      expect(actions).toContain('fold')
      expect(actions).toContain('all_in')
      // Cannot afford to call 50 (only 15 chips), so call should still be available
      // (going all-in to call is handled as all-in)
      expect(actions).not.toContain('raise')
    })
  })

  describe('player can exactly call but not raise', () => {
    it('should allow fold, call, all-in but not raise', () => {
      const state = bettingState({
        players: [
          makePlayer({ id: 'p0', seatIndex: 0, stack: 50, bet: 0 }),
          makePlayer({ id: 'p1', seatIndex: 1, stack: 500, bet: 50 }),
        ],
        currentBet: 50,
        minRaiseIncrement: 50,
        activePlayerIndex: 0,
      })

      const actions = getLegalActions(state, 'p0')

      expect(actions).toContain('fold')
      expect(actions).toContain('call')
      expect(actions).toContain('all_in')
      expect(actions).not.toContain('raise')
    })
  })

  describe('pre-flop with blinds posted', () => {
    it('should treat the big blind as a bet (actions: fold, call, raise, all-in)', () => {
      const state = bettingState({
        phase: PokerPhase.PreFlopBetting,
        players: [
          makePlayer({ id: 'p0', seatIndex: 0, stack: 990, bet: 10 }), // BB
          makePlayer({ id: 'p1', seatIndex: 1, stack: 995, bet: 5 }), // SB
          makePlayer({ id: 'p2', seatIndex: 2, stack: 1000 }), // UTG (active)
        ],
        currentBet: 10,
        minRaiseIncrement: 10,
        activePlayerIndex: 2,
      })

      const actions = getLegalActions(state, 'p2')

      expect(actions).toContain('fold')
      expect(actions).toContain('call')
      expect(actions).toContain('raise')
      expect(actions).toContain('all_in')
      expect(actions).not.toContain('check')
      expect(actions).not.toContain('bet')
    })
  })

  describe('no bet possible (stack is 0 but not all-in)', () => {
    it('should only allow fold and check if no bet facing', () => {
      const state = bettingState({
        players: [
          makePlayer({ id: 'p0', seatIndex: 0, stack: 0, bet: 0 }),
          makePlayer({ id: 'p1', seatIndex: 1, stack: 500 }),
        ],
        currentBet: 0,
        activePlayerIndex: 0,
      })

      const actions = getLegalActions(state, 'p0')

      // With 0 stack and no bet facing, check is effectively going all-in for 0
      // In practice this edge case means the player can only check or fold
      expect(actions).toContain('fold')
      expect(actions).toContain('check')
    })
  })
})

// ── getBetLimits ────────────────────────────────────────────

describe('getBetLimits', () => {
  describe('opening bet', () => {
    it('should have min = big blind, max = stack', () => {
      const state = bettingState({
        players: [
          makePlayer({ id: 'p0', seatIndex: 0, stack: 500 }),
          makePlayer({ id: 'p1', seatIndex: 1, stack: 500 }),
        ],
        currentBet: 0,
        activePlayerIndex: 0,
      })

      const limits = getBetLimits(state, 'p0', 'bet')

      expect(limits.min).toBe(10) // 1 big blind
      expect(limits.max).toBe(500) // full stack
    })
  })

  describe('raise limits', () => {
    it('should compute min raise = currentBet + previous raise increment', () => {
      // BB = 10, Player A raises to 30 (increment of 20)
      // Next min raise should be 30 + 20 = 50
      const state = bettingState({
        players: [
          makePlayer({ id: 'p0', seatIndex: 0, stack: 500, bet: 0 }),
          makePlayer({ id: 'p1', seatIndex: 1, stack: 470, bet: 30 }),
        ],
        currentBet: 30,
        minRaiseIncrement: 20,
        activePlayerIndex: 0,
      })

      const limits = getBetLimits(state, 'p0', 'raise')

      // Min raise total = 30 (current bet) + 20 (min raise increment) = 50
      // But p0 has bet 0, so they need to put in 50 total
      expect(limits.min).toBe(50)
      expect(limits.max).toBe(500) // full stack
    })

    it('should follow the rules doc example: BB=10, raise to 30, next min raise = 50', () => {
      const state = bettingState({
        phase: PokerPhase.PreFlopBetting,
        players: [
          makePlayer({ id: 'p0', seatIndex: 0, stack: 990, bet: 10 }), // BB
          makePlayer({ id: 'p1', seatIndex: 1, stack: 970, bet: 30 }), // raised to 30
          makePlayer({ id: 'p2', seatIndex: 2, stack: 1000, bet: 0 }), // UTG to act
        ],
        currentBet: 30,
        minRaiseIncrement: 20, // 30 - 10 = 20
        activePlayerIndex: 2,
      })

      const limits = getBetLimits(state, 'p2', 'raise')

      expect(limits.min).toBe(50) // 30 + 20
      expect(limits.max).toBe(1000) // full stack
    })

    it('should follow the rules doc example: BB=10, raise to 25, next min raise = 40', () => {
      const state = bettingState({
        phase: PokerPhase.PreFlopBetting,
        players: [
          makePlayer({ id: 'p0', seatIndex: 0, stack: 990, bet: 10 }), // BB
          makePlayer({ id: 'p1', seatIndex: 1, stack: 975, bet: 25 }), // raised to 25
          makePlayer({ id: 'p2', seatIndex: 2, stack: 1000, bet: 0 }), // UTG to act
        ],
        currentBet: 25,
        minRaiseIncrement: 15, // 25 - 10 = 15
        activePlayerIndex: 2,
      })

      const limits = getBetLimits(state, 'p2', 'raise')

      expect(limits.min).toBe(40) // 25 + 15
      expect(limits.max).toBe(1000)
    })
  })

  describe('all-in exception', () => {
    it('should allow min to be the player stack when it is less than min raise', () => {
      const state = bettingState({
        players: [
          makePlayer({ id: 'p0', seatIndex: 0, stack: 30, bet: 0 }),
          makePlayer({ id: 'p1', seatIndex: 1, stack: 470, bet: 30 }),
        ],
        currentBet: 30,
        minRaiseIncrement: 20,
        activePlayerIndex: 0,
      })

      // Player can't meet min raise of 50, but can go all-in for 30
      // getBetLimits for raise should reflect that min is capped at stack
      const limits = getBetLimits(state, 'p0', 'raise')

      expect(limits.min).toBe(30) // all-in for their stack
      expect(limits.max).toBe(30)
    })
  })
})

// ── isBettingRoundComplete ──────────────────────────────────

describe('isBettingRoundComplete', () => {
  it('should return true when all active players have acted and bets are equal', () => {
    const state = bettingState({
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, stack: 450, bet: 50, lastAction: 'call' }),
        makePlayer({ id: 'p1', seatIndex: 1, stack: 450, bet: 50, lastAction: 'bet' }),
        makePlayer({ id: 'p2', seatIndex: 2, status: 'folded', lastAction: 'fold' }),
      ],
      currentBet: 50,
    })

    expect(isBettingRoundComplete(state)).toBe(true)
  })

  it('should return false when an active player has not acted', () => {
    const state = bettingState({
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, stack: 500, lastAction: null }),
        makePlayer({ id: 'p1', seatIndex: 1, stack: 450, bet: 50, lastAction: 'bet' }),
      ],
      currentBet: 50,
    })

    expect(isBettingRoundComplete(state)).toBe(false)
  })

  it('should return false when bets are not equal', () => {
    const state = bettingState({
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, stack: 480, bet: 20, lastAction: 'bet' }),
        makePlayer({ id: 'p1', seatIndex: 1, stack: 450, bet: 50, lastAction: 'raise' }),
      ],
      currentBet: 50,
    })

    expect(isBettingRoundComplete(state)).toBe(false)
  })

  it('should consider all-in players as having acted (regardless of bet amount)', () => {
    const state = bettingState({
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, stack: 0, bet: 30, status: 'all_in', lastAction: 'all_in' }),
        makePlayer({ id: 'p1', seatIndex: 1, stack: 450, bet: 50, lastAction: 'bet' }),
        makePlayer({ id: 'p2', seatIndex: 2, stack: 450, bet: 50, lastAction: 'call' }),
      ],
      currentBet: 50,
    })

    expect(isBettingRoundComplete(state)).toBe(true)
  })

  it('should return true when all players have checked', () => {
    const state = bettingState({
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, stack: 500, bet: 0, lastAction: 'check' }),
        makePlayer({ id: 'p1', seatIndex: 1, stack: 500, bet: 0, lastAction: 'check' }),
        makePlayer({ id: 'p2', seatIndex: 2, stack: 500, bet: 0, lastAction: 'check' }),
      ],
      currentBet: 0,
    })

    expect(isBettingRoundComplete(state)).toBe(true)
  })

  it('should handle the big blind option: BB has not acted pre-flop', () => {
    const state = bettingState({
      phase: PokerPhase.PreFlopBetting,
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, stack: 990, bet: 10, lastAction: 'post_big_blind' }), // BB
        makePlayer({ id: 'p1', seatIndex: 1, stack: 995, bet: 5, lastAction: 'post_small_blind' }), // SB
        makePlayer({ id: 'p2', seatIndex: 2, stack: 990, bet: 10, lastAction: 'call' }), // UTG called
        makePlayer({ id: 'p3', seatIndex: 3, stack: 990, bet: 10, lastAction: 'call' }), // another caller
      ],
      currentBet: 10,
      dealerIndex: 3, // just need a valid index
    })

    // BB has only posted the blind (lastAction = post_big_blind), hasn't had their "option"
    // The round is NOT complete because BB still gets to act
    expect(isBettingRoundComplete(state)).toBe(false)
  })

  it('should be complete when BB has checked (exercised option)', () => {
    const state = bettingState({
      phase: PokerPhase.PreFlopBetting,
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, stack: 990, bet: 10, lastAction: 'check' }), // BB checked
        makePlayer({ id: 'p1', seatIndex: 1, stack: 990, bet: 10, lastAction: 'call' }), // SB called
        makePlayer({ id: 'p2', seatIndex: 2, stack: 990, bet: 10, lastAction: 'call' }), // UTG called
      ],
      currentBet: 10,
    })

    expect(isBettingRoundComplete(state)).toBe(true)
  })

  it('should be complete when BB has raised (exercised option)', () => {
    const state = bettingState({
      phase: PokerPhase.PreFlopBetting,
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, stack: 970, bet: 30, lastAction: 'raise' }), // BB raised
        makePlayer({ id: 'p1', seatIndex: 1, stack: 970, bet: 30, lastAction: 'call' }), // SB called raise
        makePlayer({ id: 'p2', seatIndex: 2, stack: 970, bet: 30, lastAction: 'call' }), // UTG called raise
      ],
      currentBet: 30,
    })

    expect(isBettingRoundComplete(state)).toBe(true)
  })

  it('should return true when only one active player remains (others folded/all-in)', () => {
    const state = bettingState({
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, stack: 500, bet: 50, lastAction: 'bet' }),
        makePlayer({ id: 'p1', seatIndex: 1, status: 'folded', lastAction: 'fold' }),
        makePlayer({ id: 'p2', seatIndex: 2, status: 'folded', lastAction: 'fold' }),
      ],
      currentBet: 50,
    })

    expect(isBettingRoundComplete(state)).toBe(true)
  })
})

// ── isOnlyOnePlayerRemaining ────────────────────────────────

describe('isOnlyOnePlayerRemaining', () => {
  it('should return true when only one non-folded player remains', () => {
    const state = bettingState({
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, status: 'active' }),
        makePlayer({ id: 'p1', seatIndex: 1, status: 'folded' }),
        makePlayer({ id: 'p2', seatIndex: 2, status: 'folded' }),
      ],
    })

    expect(isOnlyOnePlayerRemaining(state)).toBe(true)
  })

  it('should return false when multiple non-folded players remain', () => {
    const state = bettingState({
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, status: 'active' }),
        makePlayer({ id: 'p1', seatIndex: 1, status: 'active' }),
        makePlayer({ id: 'p2', seatIndex: 2, status: 'folded' }),
      ],
    })

    expect(isOnlyOnePlayerRemaining(state)).toBe(false)
  })

  it('should count all-in players as remaining', () => {
    const state = bettingState({
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, status: 'active' }),
        makePlayer({ id: 'p1', seatIndex: 1, status: 'all_in' }),
        makePlayer({ id: 'p2', seatIndex: 2, status: 'folded' }),
      ],
    })

    expect(isOnlyOnePlayerRemaining(state)).toBe(false)
  })
})

// ── areAllRemainingPlayersAllIn ──────────────────────────────

describe('areAllRemainingPlayersAllIn', () => {
  it('should return true when all non-folded players are all-in', () => {
    const state = bettingState({
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, status: 'all_in' }),
        makePlayer({ id: 'p1', seatIndex: 1, status: 'all_in' }),
        makePlayer({ id: 'p2', seatIndex: 2, status: 'folded' }),
      ],
    })

    expect(areAllRemainingPlayersAllIn(state)).toBe(true)
  })

  it('should return false when some non-folded players are still active', () => {
    const state = bettingState({
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, status: 'active' }),
        makePlayer({ id: 'p1', seatIndex: 1, status: 'all_in' }),
        makePlayer({ id: 'p2', seatIndex: 2, status: 'folded' }),
      ],
    })

    expect(areAllRemainingPlayersAllIn(state)).toBe(false)
  })

  it('should return true when all-in except exactly one active player', () => {
    // This is the edge case: one player has chips, rest are all-in
    // This should return false because there's an active player
    const state = bettingState({
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, status: 'active' }),
        makePlayer({ id: 'p1', seatIndex: 1, status: 'all_in' }),
        makePlayer({ id: 'p2', seatIndex: 2, status: 'all_in' }),
      ],
    })

    expect(areAllRemainingPlayersAllIn(state)).toBe(false)
  })

  it('should handle the case where everyone folded except one all-in', () => {
    const state = bettingState({
      players: [
        makePlayer({ id: 'p0', seatIndex: 0, status: 'all_in' }),
        makePlayer({ id: 'p1', seatIndex: 1, status: 'folded' }),
        makePlayer({ id: 'p2', seatIndex: 2, status: 'folded' }),
      ],
    })

    // Only one remaining player who is all-in — technically yes, all remaining are all-in
    expect(areAllRemainingPlayersAllIn(state)).toBe(true)
  })
})

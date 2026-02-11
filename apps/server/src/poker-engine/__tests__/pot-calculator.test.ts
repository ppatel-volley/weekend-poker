import { describe, it, expect } from 'vitest'
import type { PokerPlayer } from '@weekend-poker/shared'
import { STARTING_STACK } from '@weekend-poker/shared'
import { calculateSidePots } from '../pot-calculator.js'

/** Helper to create a test player with a given bet. */
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

describe('calculateSidePots', () => {
  it('should return a single pot when all players bet equally', () => {
    const players = [
      makePlayer({ id: 'pA', bet: 100, status: 'active' }),
      makePlayer({ id: 'pB', bet: 100, seatIndex: 1, status: 'active' }),
      makePlayer({ id: 'pC', bet: 100, seatIndex: 2, status: 'active' }),
    ]

    const pots = calculateSidePots(players)

    expect(pots).toHaveLength(1)
    expect(pots[0]!.amount).toBe(300)
    expect(pots[0]!.eligiblePlayerIds).toEqual(
      expect.arrayContaining(['pA', 'pB', 'pC']),
    )
  })

  it('should handle 2-player pot', () => {
    const players = [
      makePlayer({ id: 'pA', bet: 50, status: 'active' }),
      makePlayer({ id: 'pB', bet: 50, seatIndex: 1, status: 'active' }),
    ]

    const pots = calculateSidePots(players)

    expect(pots).toHaveLength(1)
    expect(pots[0]!.amount).toBe(100)
    expect(pots[0]!.eligiblePlayerIds).toHaveLength(2)
  })

  it('should exclude folded players from eligibility but include their bets', () => {
    const players = [
      makePlayer({ id: 'pA', bet: 50, status: 'folded' }),
      makePlayer({ id: 'pB', bet: 100, seatIndex: 1, status: 'active' }),
      makePlayer({ id: 'pC', bet: 100, seatIndex: 2, status: 'active' }),
    ]

    const pots = calculateSidePots(players)

    // Main pot: 50 x 3 = 150, eligible: pB, pC (pA folded)
    // Side pot: 50 x 2 = 100, eligible: pB, pC
    expect(pots).toHaveLength(2)
    expect(pots[0]!.amount).toBe(150)
    expect(pots[0]!.eligiblePlayerIds).toEqual(
      expect.arrayContaining(['pB', 'pC']),
    )
    expect(pots[0]!.eligiblePlayerIds).not.toContain('pA')

    expect(pots[1]!.amount).toBe(100)
    expect(pots[1]!.eligiblePlayerIds).toEqual(
      expect.arrayContaining(['pB', 'pC']),
    )
  })

  it('should handle the 3-player example from rules doc (Section 8)', () => {
    // Player A: 50 (all-in), Player B: 150 (calls 50 + bets 100), Player C: 150 (calls 150)
    const players = [
      makePlayer({ id: 'pA', bet: 50, seatIndex: 0, status: 'all_in', stack: 0 }),
      makePlayer({ id: 'pB', bet: 150, seatIndex: 1, status: 'active' }),
      makePlayer({ id: 'pC', bet: 150, seatIndex: 2, status: 'active' }),
    ]

    const pots = calculateSidePots(players)

    // Main pot: 50 x 3 = 150 (A, B, C eligible)
    // Side pot: 100 x 2 = 200 (B, C eligible)
    expect(pots).toHaveLength(2)

    expect(pots[0]!.amount).toBe(150)
    expect(pots[0]!.eligiblePlayerIds).toEqual(
      expect.arrayContaining(['pA', 'pB', 'pC']),
    )

    expect(pots[1]!.amount).toBe(200)
    expect(pots[1]!.eligiblePlayerIds).toEqual(
      expect.arrayContaining(['pB', 'pC']),
    )
    expect(pots[1]!.eligiblePlayerIds).not.toContain('pA')
  })

  it('should handle the 4-player all-in example from rules doc (Section 8)', () => {
    // Player A: 25, Player B: 50, Player C: 75, Player D: 75 (calls 75)
    const players = [
      makePlayer({ id: 'pA', bet: 25, seatIndex: 0, status: 'all_in', stack: 0 }),
      makePlayer({ id: 'pB', bet: 50, seatIndex: 1, status: 'all_in', stack: 0 }),
      makePlayer({ id: 'pC', bet: 75, seatIndex: 2, status: 'all_in', stack: 0 }),
      makePlayer({ id: 'pD', bet: 75, seatIndex: 3, status: 'active', stack: 25 }),
    ]

    const pots = calculateSidePots(players)

    // Main pot: 25 x 4 = 100 (A, B, C, D eligible)
    // Side pot 1: 25 x 3 = 75 (B, C, D eligible)
    // Side pot 2: 25 x 2 = 50 (C, D eligible)
    expect(pots).toHaveLength(3)

    expect(pots[0]!.amount).toBe(100)
    expect(pots[0]!.eligiblePlayerIds).toEqual(
      expect.arrayContaining(['pA', 'pB', 'pC', 'pD']),
    )

    expect(pots[1]!.amount).toBe(75)
    expect(pots[1]!.eligiblePlayerIds).toEqual(
      expect.arrayContaining(['pB', 'pC', 'pD']),
    )
    expect(pots[1]!.eligiblePlayerIds).not.toContain('pA')

    expect(pots[2]!.amount).toBe(50)
    expect(pots[2]!.eligiblePlayerIds).toEqual(
      expect.arrayContaining(['pC', 'pD']),
    )
    expect(pots[2]!.eligiblePlayerIds).not.toContain('pA')
    expect(pots[2]!.eligiblePlayerIds).not.toContain('pB')
  })

  it('should return unmatched chips as a single-player pot', () => {
    // Player A: 25 (all-in), Player B: 100 (no one to match the extra 75)
    const players = [
      makePlayer({ id: 'pA', bet: 25, seatIndex: 0, status: 'all_in', stack: 0 }),
      makePlayer({ id: 'pB', bet: 100, seatIndex: 1, status: 'active' }),
    ]

    const pots = calculateSidePots(players)

    // Main pot: 25 x 2 = 50 (A, B)
    // Unmatched: 75 returned to B (pot with only B eligible)
    expect(pots).toHaveLength(2)
    expect(pots[0]!.amount).toBe(50)
    expect(pots[0]!.eligiblePlayerIds).toEqual(
      expect.arrayContaining(['pA', 'pB']),
    )
    expect(pots[1]!.amount).toBe(75)
    expect(pots[1]!.eligiblePlayerIds).toEqual(['pB'])
  })

  it('should handle all players betting zero (no action)', () => {
    const players = [
      makePlayer({ id: 'pA', bet: 0, status: 'active' }),
      makePlayer({ id: 'pB', bet: 0, seatIndex: 1, status: 'active' }),
    ]

    const pots = calculateSidePots(players)

    expect(pots).toHaveLength(0)
  })

  it('should handle a single player with a bet (everyone else folded)', () => {
    const players = [
      makePlayer({ id: 'pA', bet: 50, status: 'active' }),
      makePlayer({ id: 'pB', bet: 10, seatIndex: 1, status: 'folded' }),
    ]

    const pots = calculateSidePots(players)

    // Main pot: 10 x 2 = 20, only pA eligible (pB folded)
    // Remainder: 40 returned to pA
    expect(pots).toHaveLength(2)
    expect(pots[0]!.amount).toBe(20)
    expect(pots[0]!.eligiblePlayerIds).toEqual(['pA'])
    expect(pots[1]!.amount).toBe(40)
    expect(pots[1]!.eligiblePlayerIds).toEqual(['pA'])
  })

  it('should handle multiple all-ins with same bet amount', () => {
    const players = [
      makePlayer({ id: 'pA', bet: 100, seatIndex: 0, status: 'all_in', stack: 0 }),
      makePlayer({ id: 'pB', bet: 100, seatIndex: 1, status: 'all_in', stack: 0 }),
      makePlayer({ id: 'pC', bet: 100, seatIndex: 2, status: 'active' }),
    ]

    const pots = calculateSidePots(players)

    expect(pots).toHaveLength(1)
    expect(pots[0]!.amount).toBe(300)
    expect(pots[0]!.eligiblePlayerIds).toEqual(
      expect.arrayContaining(['pA', 'pB', 'pC']),
    )
  })

  it('should correctly exclude folded player from all pots they contributed to', () => {
    // Player A folds after betting 30, Player B all-in 50, Player C calls 50
    const players = [
      makePlayer({ id: 'pA', bet: 30, seatIndex: 0, status: 'folded' }),
      makePlayer({ id: 'pB', bet: 50, seatIndex: 1, status: 'all_in', stack: 0 }),
      makePlayer({ id: 'pC', bet: 50, seatIndex: 2, status: 'active' }),
    ]

    const pots = calculateSidePots(players)

    // Level 30: 30 x 3 = 90, eligible: pB, pC (pA folded)
    // Level 50: 20 x 2 = 40, eligible: pB, pC
    expect(pots).toHaveLength(2)
    expect(pots[0]!.amount).toBe(90)
    expect(pots[0]!.eligiblePlayerIds).toEqual(
      expect.arrayContaining(['pB', 'pC']),
    )
    expect(pots[0]!.eligiblePlayerIds).not.toContain('pA')

    expect(pots[1]!.amount).toBe(40)
    expect(pots[1]!.eligiblePlayerIds).toEqual(
      expect.arrayContaining(['pB', 'pC']),
    )
  })
})

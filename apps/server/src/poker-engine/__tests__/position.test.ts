import { describe, it, expect } from 'vitest'
import type { PokerPlayer } from '@weekend-poker/shared'
import { STARTING_STACK } from '@weekend-poker/shared'
import {
  nextActivePlayer,
  findFirstActivePlayerLeftOfButton,
  findFirstActivePlayerLeftOfBB,
  rotateDealerButton,
  getSmallBlindIndex,
  getBigBlindIndex,
} from '../position.js'

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

describe('nextActivePlayer', () => {
  it('should return the next active player in clockwise order', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1 }),
      makePlayer({ id: 'p2', seatIndex: 2 }),
    ]
    expect(nextActivePlayer(players, 0)).toBe(1)
    expect(nextActivePlayer(players, 1)).toBe(2)
    expect(nextActivePlayer(players, 2)).toBe(0)
  })

  it('should skip folded players', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1, status: 'folded' }),
      makePlayer({ id: 'p2', seatIndex: 2 }),
    ]
    expect(nextActivePlayer(players, 0)).toBe(2)
  })

  it('should skip all-in players', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1, status: 'all_in' }),
      makePlayer({ id: 'p2', seatIndex: 2 }),
    ]
    expect(nextActivePlayer(players, 0)).toBe(2)
  })

  it('should skip sitting-out players', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1, status: 'sitting_out' }),
      makePlayer({ id: 'p2', seatIndex: 2 }),
    ]
    expect(nextActivePlayer(players, 0)).toBe(2)
  })

  it('should wrap around the array', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0, status: 'folded' }),
      makePlayer({ id: 'p1', seatIndex: 1 }),
      makePlayer({ id: 'p2', seatIndex: 2 }),
    ]
    expect(nextActivePlayer(players, 2)).toBe(1)
  })

  it('should return -1 when no active player is found', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0, status: 'folded' }),
      makePlayer({ id: 'p1', seatIndex: 1, status: 'all_in' }),
    ]
    expect(nextActivePlayer(players, 0)).toBe(-1)
  })

  it('should skip busted players', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1, status: 'busted' }),
      makePlayer({ id: 'p2', seatIndex: 2 }),
    ]
    expect(nextActivePlayer(players, 0)).toBe(2)
  })
})

describe('findFirstActivePlayerLeftOfButton', () => {
  it('should return the first active player after the dealer', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1 }),
      makePlayer({ id: 'p2', seatIndex: 2 }),
      makePlayer({ id: 'p3', seatIndex: 3 }),
    ]
    // Dealer at index 0, first active left of button is index 1
    expect(findFirstActivePlayerLeftOfButton(players, 0)).toBe(1)
  })

  it('should skip folded and all-in players', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }), // dealer
      makePlayer({ id: 'p1', seatIndex: 1, status: 'folded' }),
      makePlayer({ id: 'p2', seatIndex: 2, status: 'all_in' }),
      makePlayer({ id: 'p3', seatIndex: 3 }),
    ]
    expect(findFirstActivePlayerLeftOfButton(players, 0)).toBe(3)
  })

  it('should wrap around the table', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1, status: 'folded' }),
      makePlayer({ id: 'p2', seatIndex: 2 }), // dealer
      makePlayer({ id: 'p3', seatIndex: 3, status: 'folded' }),
    ]
    expect(findFirstActivePlayerLeftOfButton(players, 2)).toBe(0)
  })
})

describe('findFirstActivePlayerLeftOfBB', () => {
  it('should return the player left of the big blind for pre-flop (3+ players)', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }), // dealer
      makePlayer({ id: 'p1', seatIndex: 1 }), // SB
      makePlayer({ id: 'p2', seatIndex: 2 }), // BB
      makePlayer({ id: 'p3', seatIndex: 3 }), // UTG
    ]
    // Dealer at 0, SB at 1, BB at 2 => UTG at 3
    expect(findFirstActivePlayerLeftOfBB(players, 0)).toBe(3)
  })

  it('should skip non-active players after BB', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }), // dealer
      makePlayer({ id: 'p1', seatIndex: 1 }), // SB
      makePlayer({ id: 'p2', seatIndex: 2 }), // BB
      makePlayer({ id: 'p3', seatIndex: 3, status: 'folded' }),
    ]
    // UTG (p3) is folded, so wraps to dealer (p0)
    expect(findFirstActivePlayerLeftOfBB(players, 0)).toBe(0)
  })

  it('should handle heads-up: button/SB acts first pre-flop', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }), // button = SB in heads-up
      makePlayer({ id: 'p1', seatIndex: 1 }), // BB
    ]
    // In heads-up, button is SB and acts first pre-flop
    // BB is at index 1, player left of BB wraps to index 0 (the button/SB)
    expect(findFirstActivePlayerLeftOfBB(players, 0)).toBe(0)
  })
})

describe('rotateDealerButton', () => {
  it('should move to the next active player', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1 }),
      makePlayer({ id: 'p2', seatIndex: 2 }),
    ]
    expect(rotateDealerButton(players, 0)).toBe(1)
  })

  it('should skip busted players', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1, status: 'busted' }),
      makePlayer({ id: 'p2', seatIndex: 2 }),
    ]
    expect(rotateDealerButton(players, 0)).toBe(2)
  })

  it('should skip sitting-out players', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1, status: 'sitting_out' }),
      makePlayer({ id: 'p2', seatIndex: 2 }),
    ]
    expect(rotateDealerButton(players, 0)).toBe(2)
  })

  it('should wrap around the array', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1 }),
      makePlayer({ id: 'p2', seatIndex: 2 }),
    ]
    expect(rotateDealerButton(players, 2)).toBe(0)
  })

  it('should handle all players busted except one', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1, status: 'busted' }),
      makePlayer({ id: 'p2', seatIndex: 2, status: 'busted' }),
    ]
    // Only p0 is alive, rotation returns p0
    expect(rotateDealerButton(players, 0)).toBe(0)
  })
})

describe('getSmallBlindIndex', () => {
  it('should return the player left of the dealer (3+ players)', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1 }),
      makePlayer({ id: 'p2', seatIndex: 2 }),
    ]
    expect(getSmallBlindIndex(players, 0)).toBe(1)
  })

  it('should return the dealer index in heads-up', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1 }),
    ]
    // In heads-up, the button IS the small blind
    expect(getSmallBlindIndex(players, 0)).toBe(0)
  })

  it('should skip busted/sitting-out players for SB position', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1, status: 'busted' }),
      makePlayer({ id: 'p2', seatIndex: 2 }),
      makePlayer({ id: 'p3', seatIndex: 3 }),
    ]
    expect(getSmallBlindIndex(players, 0)).toBe(2)
  })
})

describe('getBigBlindIndex', () => {
  it('should return the player left of the small blind (3+ players)', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1 }),
      makePlayer({ id: 'p2', seatIndex: 2 }),
    ]
    // Dealer at 0, SB at 1, BB at 2
    expect(getBigBlindIndex(players, 0)).toBe(2)
  })

  it('should return the other player in heads-up', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1 }),
    ]
    // In heads-up, button is SB (index 0), other is BB (index 1)
    expect(getBigBlindIndex(players, 0)).toBe(1)
  })

  it('should skip busted/sitting-out players for BB position', () => {
    const players = [
      makePlayer({ id: 'p0', seatIndex: 0 }),
      makePlayer({ id: 'p1', seatIndex: 1 }),
      makePlayer({ id: 'p2', seatIndex: 2, status: 'busted' }),
      makePlayer({ id: 'p3', seatIndex: 3 }),
    ]
    // Dealer at 0, SB at 1, skip 2 (busted), BB at 3
    expect(getBigBlindIndex(players, 0)).toBe(3)
  })
})

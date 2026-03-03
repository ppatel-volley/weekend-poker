import { describe, it, expect } from 'vitest'
import {
  getPayoutMultiplier,
  resolveBet,
  resolveAllBets,
} from '../payout-calculator.js'
import type { RouletteBet } from '@weekend-casino/shared'

function makeBet(overrides: Partial<RouletteBet> & Pick<RouletteBet, 'type' | 'numbers'>): RouletteBet {
  return {
    id: 'test-1',
    playerId: 'p1',
    amount: 10,
    status: 'active',
    payout: 0,
    ...overrides,
  }
}

describe('getPayoutMultiplier', () => {
  it('returns 35 for straight_up', () => {
    expect(getPayoutMultiplier('straight_up')).toBe(35)
  })

  it('returns 17 for split', () => {
    expect(getPayoutMultiplier('split')).toBe(17)
  })

  it('returns 11 for street', () => {
    expect(getPayoutMultiplier('street')).toBe(11)
  })

  it('returns 8 for corner', () => {
    expect(getPayoutMultiplier('corner')).toBe(8)
  })

  it('returns 5 for six_line', () => {
    expect(getPayoutMultiplier('six_line')).toBe(5)
  })

  it('returns 2 for dozens', () => {
    expect(getPayoutMultiplier('dozen_1')).toBe(2)
    expect(getPayoutMultiplier('dozen_2')).toBe(2)
    expect(getPayoutMultiplier('dozen_3')).toBe(2)
  })

  it('returns 2 for columns', () => {
    expect(getPayoutMultiplier('column_1')).toBe(2)
    expect(getPayoutMultiplier('column_2')).toBe(2)
    expect(getPayoutMultiplier('column_3')).toBe(2)
  })

  it('returns 1 for even-money bets', () => {
    expect(getPayoutMultiplier('red')).toBe(1)
    expect(getPayoutMultiplier('black')).toBe(1)
    expect(getPayoutMultiplier('odd')).toBe(1)
    expect(getPayoutMultiplier('even')).toBe(1)
    expect(getPayoutMultiplier('high')).toBe(1)
    expect(getPayoutMultiplier('low')).toBe(1)
  })
})

describe('resolveBet', () => {
  it('resolves a winning straight_up bet', () => {
    const bet = makeBet({ type: 'straight_up', numbers: [17], amount: 10 })
    const result = resolveBet(bet, 17)
    expect(result.won).toBe(true)
    expect(result.payout).toBe(350) // 10 * 35
  })

  it('resolves a losing straight_up bet', () => {
    const bet = makeBet({ type: 'straight_up', numbers: [17], amount: 10 })
    const result = resolveBet(bet, 5)
    expect(result.won).toBe(false)
    expect(result.payout).toBe(0)
  })

  it('resolves a winning red bet', () => {
    const bet = makeBet({
      type: 'red',
      numbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
      amount: 25,
    })
    const result = resolveBet(bet, 1) // 1 is red
    expect(result.won).toBe(true)
    expect(result.payout).toBe(25) // 25 * 1
  })

  it('resolves a losing red bet (on black)', () => {
    const bet = makeBet({
      type: 'red',
      numbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
      amount: 25,
    })
    const result = resolveBet(bet, 2) // 2 is black
    expect(result.won).toBe(false)
    expect(result.payout).toBe(0)
  })

  it('resolves a losing red bet (on zero)', () => {
    const bet = makeBet({
      type: 'red',
      numbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
      amount: 25,
    })
    const result = resolveBet(bet, 0) // 0 is green
    expect(result.won).toBe(false)
    expect(result.payout).toBe(0)
  })

  it('resolves a winning split bet', () => {
    const bet = makeBet({ type: 'split', numbers: [1, 2], amount: 20 })
    const result = resolveBet(bet, 2)
    expect(result.won).toBe(true)
    expect(result.payout).toBe(340) // 20 * 17
  })

  it('resolves a winning dozen bet', () => {
    const bet = makeBet({
      type: 'dozen_1',
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      amount: 50,
    })
    const result = resolveBet(bet, 7)
    expect(result.won).toBe(true)
    expect(result.payout).toBe(100) // 50 * 2
  })
})

describe('resolveAllBets', () => {
  it('resolves multiple bets for one player', () => {
    const bets: RouletteBet[] = [
      makeBet({ id: 'b1', playerId: 'p1', type: 'straight_up', numbers: [1], amount: 10 }),
      makeBet({ id: 'b2', playerId: 'p1', type: 'red', numbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36], amount: 20 }),
    ]

    // Winning number 1 is red — both bets win
    const results = resolveAllBets(bets, 1)
    const p1 = results.get('p1')!
    expect(p1.totalBet).toBe(30)
    // straight_up 1 wins: 10 + 350 = 360
    // red wins: 20 + 20 = 40
    expect(p1.totalPayout).toBe(400)
    expect(p1.netResult).toBe(370) // 400 - 30
  })

  it('resolves bets for multiple players', () => {
    const bets: RouletteBet[] = [
      makeBet({ id: 'b1', playerId: 'p1', type: 'red', numbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36], amount: 10 }),
      makeBet({ id: 'b2', playerId: 'p2', type: 'black', numbers: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35], amount: 10 }),
    ]

    // Winning number 1 (red)
    const results = resolveAllBets(bets, 1)
    const p1 = results.get('p1')!
    const p2 = results.get('p2')!

    expect(p1.totalPayout).toBe(20) // bet + winnings
    expect(p1.netResult).toBe(10)

    expect(p2.totalPayout).toBe(0)
    expect(p2.netResult).toBe(-10)
  })

  it('handles all bets losing on zero', () => {
    const bets: RouletteBet[] = [
      makeBet({ id: 'b1', playerId: 'p1', type: 'red', numbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36], amount: 50 }),
      makeBet({ id: 'b2', playerId: 'p1', type: 'odd', numbers: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35], amount: 50 }),
    ]

    const results = resolveAllBets(bets, 0)
    const p1 = results.get('p1')!
    expect(p1.totalPayout).toBe(0)
    expect(p1.netResult).toBe(-100)
  })

  it('returns empty map for no bets', () => {
    const results = resolveAllBets([], 17)
    expect(results.size).toBe(0)
  })
})

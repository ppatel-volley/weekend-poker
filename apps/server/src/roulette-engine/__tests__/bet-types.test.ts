import { describe, it, expect } from 'vitest'
import {
  getNumbersForBet,
  isInsideBet,
  isOutsideBet,
  areGridAdjacent,
  isValidStreet,
  isValidCorner,
  isValidSixLine,
  isValidBet,
} from '../bet-types.js'

describe('getNumbersForBet', () => {
  it('returns the single number for straight_up', () => {
    expect(getNumbersForBet('straight_up', [17])).toEqual([17])
  })

  it('returns two numbers for split', () => {
    expect(getNumbersForBet('split', [1, 2])).toEqual([1, 2])
  })

  it('returns three numbers for street', () => {
    expect(getNumbersForBet('street', [1, 2, 3])).toEqual([1, 2, 3])
  })

  it('returns four numbers for corner', () => {
    expect(getNumbersForBet('corner', [1, 2, 4, 5])).toEqual([1, 2, 4, 5])
  })

  it('returns six numbers for six_line', () => {
    expect(getNumbersForBet('six_line', [1, 2, 3, 4, 5, 6])).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('returns 18 red numbers for red bet', () => {
    const reds = getNumbersForBet('red')
    expect(reds).toHaveLength(18)
    expect(reds).toContain(1)
    expect(reds).toContain(36)
    expect(reds).not.toContain(0)
    expect(reds).not.toContain(2) // 2 is black
  })

  it('returns 18 black numbers for black bet', () => {
    const blacks = getNumbersForBet('black')
    expect(blacks).toHaveLength(18)
    expect(blacks).toContain(2)
    expect(blacks).toContain(35)
    expect(blacks).not.toContain(1) // 1 is red
  })

  it('returns 18 odd numbers for odd bet', () => {
    const odds = getNumbersForBet('odd')
    expect(odds).toHaveLength(18)
    for (const n of odds) {
      expect(n % 2).toBe(1)
    }
  })

  it('returns 18 even numbers for even bet', () => {
    const evens = getNumbersForBet('even')
    expect(evens).toHaveLength(18)
    for (const n of evens) {
      expect(n % 2).toBe(0)
      expect(n).toBeGreaterThan(0)
    }
  })

  it('returns 18 numbers for low (1-18)', () => {
    const lows = getNumbersForBet('low')
    expect(lows).toHaveLength(18)
    expect(lows[0]).toBe(1)
    expect(lows[17]).toBe(18)
  })

  it('returns 18 numbers for high (19-36)', () => {
    const highs = getNumbersForBet('high')
    expect(highs).toHaveLength(18)
    expect(highs[0]).toBe(19)
    expect(highs[17]).toBe(36)
  })

  it('returns 12 numbers for each dozen', () => {
    expect(getNumbersForBet('dozen_1')).toHaveLength(12)
    expect(getNumbersForBet('dozen_2')).toHaveLength(12)
    expect(getNumbersForBet('dozen_3')).toHaveLength(12)
  })

  it('returns 12 numbers for each column', () => {
    expect(getNumbersForBet('column_1')).toHaveLength(12)
    expect(getNumbersForBet('column_2')).toHaveLength(12)
    expect(getNumbersForBet('column_3')).toHaveLength(12)
  })

  it('returns empty for no numbers provided on inside bets', () => {
    expect(getNumbersForBet('straight_up')).toEqual([])
  })
})

describe('isInsideBet', () => {
  it('returns true for inside bet types', () => {
    expect(isInsideBet('straight_up')).toBe(true)
    expect(isInsideBet('split')).toBe(true)
    expect(isInsideBet('street')).toBe(true)
    expect(isInsideBet('corner')).toBe(true)
    expect(isInsideBet('six_line')).toBe(true)
  })

  it('returns false for outside bet types', () => {
    expect(isInsideBet('red')).toBe(false)
    expect(isInsideBet('black')).toBe(false)
    expect(isInsideBet('dozen_1')).toBe(false)
    expect(isInsideBet('column_1')).toBe(false)
    expect(isInsideBet('odd')).toBe(false)
    expect(isInsideBet('even')).toBe(false)
    expect(isInsideBet('high')).toBe(false)
    expect(isInsideBet('low')).toBe(false)
  })
})

describe('isOutsideBet', () => {
  it('returns true for outside bet types', () => {
    expect(isOutsideBet('red')).toBe(true)
    expect(isOutsideBet('black')).toBe(true)
    expect(isOutsideBet('dozen_1')).toBe(true)
  })

  it('returns false for inside bet types', () => {
    expect(isOutsideBet('straight_up')).toBe(false)
    expect(isOutsideBet('split')).toBe(false)
  })
})

describe('areGridAdjacent', () => {
  it('same number is not adjacent', () => {
    expect(areGridAdjacent(5, 5)).toBe(false)
  })

  it('zero can split with 1, 2, or 3', () => {
    expect(areGridAdjacent(0, 1)).toBe(true)
    expect(areGridAdjacent(0, 2)).toBe(true)
    expect(areGridAdjacent(0, 3)).toBe(true)
  })

  it('zero cannot split with 4+', () => {
    expect(areGridAdjacent(0, 4)).toBe(false)
  })

  it('horizontal adjacent in same row', () => {
    // Row 1: 1, 2, 3
    expect(areGridAdjacent(1, 2)).toBe(true)
    expect(areGridAdjacent(2, 3)).toBe(true)
    // Not adjacent: 1 and 3 (columns 1 and 3)
    expect(areGridAdjacent(1, 3)).toBe(false)
  })

  it('vertical adjacent in same column', () => {
    // Column 1: 1, 4, 7, 10, ...
    expect(areGridAdjacent(1, 4)).toBe(true)
    expect(areGridAdjacent(4, 7)).toBe(true)
    // Not adjacent: 1 and 7 (two rows apart)
    expect(areGridAdjacent(1, 7)).toBe(false)
  })

  it('diagonal is not adjacent', () => {
    // 1 and 5 are diagonal
    expect(areGridAdjacent(1, 5)).toBe(false)
  })

  it('out of range returns false', () => {
    expect(areGridAdjacent(-1, 1)).toBe(false)
    expect(areGridAdjacent(1, 37)).toBe(false)
  })
})

describe('isValidStreet', () => {
  it('valid streets (first row)', () => {
    expect(isValidStreet([1, 2, 3])).toBe(true)
  })

  it('valid streets (last row)', () => {
    expect(isValidStreet([34, 35, 36])).toBe(true)
  })

  it('valid streets (middle row)', () => {
    expect(isValidStreet([10, 11, 12])).toBe(true)
  })

  it('invalid: not a complete row', () => {
    expect(isValidStreet([2, 3, 4])).toBe(false)
  })

  it('invalid: wrong count', () => {
    expect(isValidStreet([1, 2])).toBe(false)
    expect(isValidStreet([1, 2, 3, 4])).toBe(false)
  })

  it('valid with unsorted input', () => {
    expect(isValidStreet([3, 1, 2])).toBe(true)
  })
})

describe('isValidCorner', () => {
  it('valid corner (top-left of grid)', () => {
    expect(isValidCorner([1, 2, 4, 5])).toBe(true)
  })

  it('valid corner (middle of grid)', () => {
    expect(isValidCorner([2, 3, 5, 6])).toBe(true)
  })

  it('valid corner (bottom right area)', () => {
    expect(isValidCorner([32, 33, 35, 36])).toBe(true)
  })

  it('invalid: starts in column 3', () => {
    // 3, 4, 6, 7 — 3 is column 3, can\'t start corner there
    expect(isValidCorner([3, 4, 6, 7])).toBe(false)
  })

  it('invalid: wrong count', () => {
    expect(isValidCorner([1, 2, 4])).toBe(false)
  })

  it('valid with unsorted input', () => {
    expect(isValidCorner([5, 1, 4, 2])).toBe(true)
  })
})

describe('isValidSixLine', () => {
  it('valid six line (first two rows)', () => {
    expect(isValidSixLine([1, 2, 3, 4, 5, 6])).toBe(true)
  })

  it('valid six line (last two rows)', () => {
    expect(isValidSixLine([31, 32, 33, 34, 35, 36])).toBe(true)
  })

  it('invalid: not two consecutive rows', () => {
    expect(isValidSixLine([1, 2, 3, 7, 8, 9])).toBe(false)
  })

  it('invalid: wrong count', () => {
    expect(isValidSixLine([1, 2, 3, 4, 5])).toBe(false)
  })

  it('valid with unsorted input', () => {
    expect(isValidSixLine([6, 1, 4, 2, 5, 3])).toBe(true)
  })
})

describe('isValidBet', () => {
  it('validates straight_up bets', () => {
    expect(isValidBet('straight_up', [0])).toBe(true)
    expect(isValidBet('straight_up', [36])).toBe(true)
    expect(isValidBet('straight_up', [37])).toBe(false)
    expect(isValidBet('straight_up', [-1])).toBe(false)
    expect(isValidBet('straight_up', [])).toBe(false)
  })

  it('validates split bets', () => {
    expect(isValidBet('split', [1, 2])).toBe(true)
    expect(isValidBet('split', [1, 5])).toBe(false)
  })

  it('validates street bets', () => {
    expect(isValidBet('street', [1, 2, 3])).toBe(true)
    expect(isValidBet('street', [2, 3, 4])).toBe(false)
  })

  it('validates corner bets', () => {
    expect(isValidBet('corner', [1, 2, 4, 5])).toBe(true)
    expect(isValidBet('corner', [1, 2, 3, 4])).toBe(false)
  })

  it('validates six_line bets', () => {
    expect(isValidBet('six_line', [1, 2, 3, 4, 5, 6])).toBe(true)
    expect(isValidBet('six_line', [1, 2, 3, 7, 8, 9])).toBe(false)
  })

  it('always validates outside bets', () => {
    expect(isValidBet('red', [])).toBe(true)
    expect(isValidBet('black', [])).toBe(true)
    expect(isValidBet('odd', [])).toBe(true)
    expect(isValidBet('even', [])).toBe(true)
    expect(isValidBet('high', [])).toBe(true)
    expect(isValidBet('low', [])).toBe(true)
    expect(isValidBet('dozen_1', [])).toBe(true)
    expect(isValidBet('column_1', [])).toBe(true)
  })
})

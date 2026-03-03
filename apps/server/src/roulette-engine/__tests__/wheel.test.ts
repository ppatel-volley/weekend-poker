import { describe, it, expect } from 'vitest'
import {
  EUROPEAN_WHEEL_ORDER,
  RED_NUMBERS,
  BLACK_NUMBERS,
  getNumberColour,
  isOdd,
  isEven,
  isLow,
  isHigh,
  getDozen,
  getColumn,
  getAdjacentNumbers,
  generateWinningNumber,
} from '../wheel.js'

describe('EUROPEAN_WHEEL_ORDER', () => {
  it('contains exactly 37 pockets (0-36)', () => {
    expect(EUROPEAN_WHEEL_ORDER).toHaveLength(37)
  })

  it('contains every number from 0 to 36 exactly once', () => {
    const sorted = [...EUROPEAN_WHEEL_ORDER].sort((a, b) => a - b)
    expect(sorted).toEqual(Array.from({ length: 37 }, (_, i) => i))
  })

  it('starts with 0', () => {
    expect(EUROPEAN_WHEEL_ORDER[0]).toBe(0)
  })
})

describe('RED_NUMBERS / BLACK_NUMBERS', () => {
  it('has 18 red numbers', () => {
    expect(RED_NUMBERS.size).toBe(18)
  })

  it('has 18 black numbers', () => {
    expect(BLACK_NUMBERS.size).toBe(18)
  })

  it('red and black do not overlap', () => {
    for (const n of RED_NUMBERS) {
      expect(BLACK_NUMBERS.has(n)).toBe(false)
    }
  })

  it('red and black together cover all 1-36', () => {
    const all = new Set([...RED_NUMBERS, ...BLACK_NUMBERS])
    expect(all.size).toBe(36)
    for (let i = 1; i <= 36; i++) {
      expect(all.has(i)).toBe(true)
    }
  })

  it('zero is neither red nor black', () => {
    expect(RED_NUMBERS.has(0)).toBe(false)
    expect(BLACK_NUMBERS.has(0)).toBe(false)
  })
})

describe('getNumberColour', () => {
  it('returns green for 0', () => {
    expect(getNumberColour(0)).toBe('green')
  })

  it('returns red for red numbers', () => {
    expect(getNumberColour(1)).toBe('red')
    expect(getNumberColour(3)).toBe('red')
    expect(getNumberColour(32)).toBe('red')
    expect(getNumberColour(36)).toBe('red')
  })

  it('returns black for black numbers', () => {
    expect(getNumberColour(2)).toBe('black')
    expect(getNumberColour(4)).toBe('black')
    expect(getNumberColour(13)).toBe('black')
    expect(getNumberColour(35)).toBe('black')
  })
})

describe('isOdd', () => {
  it('returns true for odd numbers', () => {
    expect(isOdd(1)).toBe(true)
    expect(isOdd(3)).toBe(true)
    expect(isOdd(35)).toBe(true)
  })

  it('returns false for even numbers', () => {
    expect(isOdd(2)).toBe(false)
    expect(isOdd(36)).toBe(false)
  })

  it('returns false for zero', () => {
    expect(isOdd(0)).toBe(false)
  })
})

describe('isEven', () => {
  it('returns true for even numbers', () => {
    expect(isEven(2)).toBe(true)
    expect(isEven(36)).toBe(true)
  })

  it('returns false for odd numbers', () => {
    expect(isEven(1)).toBe(false)
    expect(isEven(35)).toBe(false)
  })

  it('returns false for zero', () => {
    expect(isEven(0)).toBe(false)
  })
})

describe('isLow', () => {
  it('returns true for 1-18', () => {
    expect(isLow(1)).toBe(true)
    expect(isLow(18)).toBe(true)
  })

  it('returns false for 19-36', () => {
    expect(isLow(19)).toBe(false)
    expect(isLow(36)).toBe(false)
  })

  it('returns false for zero', () => {
    expect(isLow(0)).toBe(false)
  })
})

describe('isHigh', () => {
  it('returns true for 19-36', () => {
    expect(isHigh(19)).toBe(true)
    expect(isHigh(36)).toBe(true)
  })

  it('returns false for 1-18', () => {
    expect(isHigh(1)).toBe(false)
    expect(isHigh(18)).toBe(false)
  })

  it('returns false for zero', () => {
    expect(isHigh(0)).toBe(false)
  })
})

describe('getDozen', () => {
  it('returns 1 for 1-12', () => {
    expect(getDozen(1)).toBe(1)
    expect(getDozen(12)).toBe(1)
  })

  it('returns 2 for 13-24', () => {
    expect(getDozen(13)).toBe(2)
    expect(getDozen(24)).toBe(2)
  })

  it('returns 3 for 25-36', () => {
    expect(getDozen(25)).toBe(3)
    expect(getDozen(36)).toBe(3)
  })

  it('returns null for zero', () => {
    expect(getDozen(0)).toBeNull()
  })
})

describe('getColumn', () => {
  it('returns 1 for column 1 numbers (1, 4, 7, ...)', () => {
    expect(getColumn(1)).toBe(1)
    expect(getColumn(4)).toBe(1)
    expect(getColumn(34)).toBe(1)
  })

  it('returns 2 for column 2 numbers (2, 5, 8, ...)', () => {
    expect(getColumn(2)).toBe(2)
    expect(getColumn(5)).toBe(2)
    expect(getColumn(35)).toBe(2)
  })

  it('returns 3 for column 3 numbers (3, 6, 9, ...)', () => {
    expect(getColumn(3)).toBe(3)
    expect(getColumn(6)).toBe(3)
    expect(getColumn(36)).toBe(3)
  })

  it('returns null for zero', () => {
    expect(getColumn(0)).toBeNull()
  })
})

describe('getAdjacentNumbers', () => {
  it('returns neighbours on the European wheel', () => {
    // 0 is at index 0, neighbours are 26 (left) and 32 (right) at depth 1
    const adj = getAdjacentNumbers(0, 1)
    expect(adj).toHaveLength(2)
    expect(adj).toContain(32) // right
    expect(adj).toContain(26) // left
  })

  it('returns 4 neighbours at depth 2 (default)', () => {
    const adj = getAdjacentNumbers(0)
    expect(adj).toHaveLength(4)
  })

  it('returns empty array for out-of-range number', () => {
    expect(getAdjacentNumbers(37)).toEqual([])
    expect(getAdjacentNumbers(-1)).toEqual([])
  })

  it('wraps around the wheel', () => {
    // 0 is at index 0, so left neighbour is index 36 (which is 26)
    const adj = getAdjacentNumbers(0, 1)
    expect(adj).toContain(26)
  })
})

describe('generateWinningNumber', () => {
  it('returns a number between 0 and 36', () => {
    for (let i = 0; i < 100; i++) {
      const n = generateWinningNumber()
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(36)
    }
  })

  it('returns an integer', () => {
    for (let i = 0; i < 50; i++) {
      const n = generateWinningNumber()
      expect(Number.isInteger(n)).toBe(true)
    }
  })
})

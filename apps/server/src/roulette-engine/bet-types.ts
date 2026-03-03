/**
 * Roulette bet type definitions and validation.
 *
 * Inside bets: straight_up, split, street, corner, six_line
 * Outside bets: red, black, odd, even, high, low, dozen_1/2/3, column_1/2/3
 */

import type { RouletteBetType } from '@weekend-casino/shared'

/** Numbers in each column on the roulette grid. */
const COLUMN_NUMBERS: Record<1 | 2 | 3, number[]> = {
  1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
}

/** Numbers in each dozen. */
const DOZEN_NUMBERS: Record<1 | 2 | 3, number[]> = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  2: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  3: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
}

/** Returns all numbers covered by a bet of the given type. */
export function getNumbersForBet(type: RouletteBetType, numbers?: number[]): number[] {
  switch (type) {
    case 'straight_up':
      return numbers?.slice(0, 1) ?? []
    case 'split':
      return numbers?.slice(0, 2) ?? []
    case 'street':
      return numbers?.slice(0, 3) ?? []
    case 'corner':
      return numbers?.slice(0, 4) ?? []
    case 'six_line':
      return numbers?.slice(0, 6) ?? []
    case 'red':
      return [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
    case 'black':
      return [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]
    case 'odd':
      return [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35]
    case 'even':
      return [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36]
    case 'low':
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
    case 'high':
      return [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]
    case 'dozen_1':
      return DOZEN_NUMBERS[1]
    case 'dozen_2':
      return DOZEN_NUMBERS[2]
    case 'dozen_3':
      return DOZEN_NUMBERS[3]
    case 'column_1':
      return COLUMN_NUMBERS[1]
    case 'column_2':
      return COLUMN_NUMBERS[2]
    case 'column_3':
      return COLUMN_NUMBERS[3]
    default:
      return []
  }
}

/** Whether a bet type is an inside bet (placed on specific numbers). */
export function isInsideBet(type: RouletteBetType): boolean {
  return type === 'straight_up' || type === 'split' || type === 'street'
    || type === 'corner' || type === 'six_line'
}

/** Whether a bet type is an outside bet (groups). */
export function isOutsideBet(type: RouletteBetType): boolean {
  return !isInsideBet(type)
}

/**
 * Validates whether two numbers are adjacent on the roulette grid
 * (for split bets). Adjacent means horizontally or vertically adjacent
 * on the 3-column, 12-row layout. Zero can split with 1, 2, or 3.
 */
export function areGridAdjacent(a: number, b: number): boolean {
  if (a === b) return false
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)

  // Zero can split with 1, 2, or 3
  if (lo === 0) return hi >= 1 && hi <= 3

  // Validate both numbers are in range
  if (lo < 1 || hi > 36) return false

  // Horizontal: same row, adjacent columns
  const rowLo = Math.ceil(lo / 3)
  const rowHi = Math.ceil(hi / 3)
  const colLo = ((lo - 1) % 3) + 1
  const colHi = ((hi - 1) % 3) + 1

  // Same row, adjacent columns
  if (rowLo === rowHi && Math.abs(colLo - colHi) === 1) return true

  // Same column, adjacent rows
  if (colLo === colHi && Math.abs(rowLo - rowHi) === 1) return true

  return false
}

/**
 * Validates a street bet — must be a complete row of 3 numbers.
 * Valid streets: [1,2,3], [4,5,6], ... [34,35,36].
 */
export function isValidStreet(numbers: number[]): boolean {
  if (numbers.length !== 3) return false
  const sorted = [...numbers].sort((a, b) => a - b)
  if (sorted[0]! < 1 || sorted[2]! > 36) return false
  // Must start at row boundary: (n-1) must be divisible by 3
  return (sorted[0]! - 1) % 3 === 0
    && sorted[1]! === sorted[0]! + 1
    && sorted[2]! === sorted[0]! + 2
}

/**
 * Validates a corner bet — 4 numbers that share a corner on the grid.
 * E.g. [1,2,4,5], [2,3,5,6], etc.
 */
export function isValidCorner(numbers: number[]): boolean {
  if (numbers.length !== 4) return false
  const sorted = [...numbers].sort((a, b) => a - b)
  if (sorted[0]! < 1 || sorted[3]! > 36) return false

  // Top-left must be in column 1 or 2 (cannot start in column 3)
  const col = ((sorted[0]! - 1) % 3) + 1
  if (col === 3) return false

  // Pattern: n, n+1, n+3, n+4
  return sorted[1]! === sorted[0]! + 1
    && sorted[2]! === sorted[0]! + 3
    && sorted[3]! === sorted[0]! + 4
}

/**
 * Validates a six-line bet — two adjacent streets (6 numbers).
 * E.g. [1,2,3,4,5,6], [4,5,6,7,8,9], etc.
 */
export function isValidSixLine(numbers: number[]): boolean {
  if (numbers.length !== 6) return false
  const sorted = [...numbers].sort((a, b) => a - b)
  if (sorted[0]! < 1 || sorted[5]! > 36) return false

  // Must be two consecutive streets
  return (sorted[0]! - 1) % 3 === 0
    && sorted[1]! === sorted[0]! + 1
    && sorted[2]! === sorted[0]! + 2
    && sorted[3]! === sorted[0]! + 3
    && sorted[4]! === sorted[0]! + 4
    && sorted[5]! === sorted[0]! + 5
}

/**
 * Validates that a bet is structurally valid.
 * Does NOT check amounts — only that the numbers make sense for the bet type.
 */
export function isValidBet(type: RouletteBetType, numbers: number[]): boolean {
  // Outside bets don't need number validation
  if (isOutsideBet(type)) return true

  switch (type) {
    case 'straight_up':
      return numbers.length === 1 && numbers[0]! >= 0 && numbers[0]! <= 36
    case 'split':
      return numbers.length === 2 && areGridAdjacent(numbers[0]!, numbers[1]!)
    case 'street':
      return isValidStreet(numbers)
    case 'corner':
      return isValidCorner(numbers)
    case 'six_line':
      return isValidSixLine(numbers)
    default:
      return false
  }
}

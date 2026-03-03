/**
 * European roulette wheel — single zero, 37 pockets (0-36).
 *
 * Provides number properties (colour, parity, high/low, dozen, column)
 * and adjacency map for near-miss detection on the physical wheel layout.
 */

/** Physical order of pockets on a European roulette wheel (clockwise). */
export const EUROPEAN_WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const

/** Red numbers on the European wheel. */
export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

/** Black numbers on the European wheel. */
export const BLACK_NUMBERS = new Set([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
])

export type RouletteColour = 'red' | 'black' | 'green'

/** Returns the colour of a roulette number. */
export function getNumberColour(n: number): RouletteColour {
  if (n === 0) return 'green'
  if (RED_NUMBERS.has(n)) return 'red'
  return 'black'
}

/** Returns whether a number is odd. Zero is neither. */
export function isOdd(n: number): boolean {
  return n > 0 && n % 2 === 1
}

/** Returns whether a number is even (non-zero). Zero is neither. */
export function isEven(n: number): boolean {
  return n > 0 && n % 2 === 0
}

/** Returns whether a number is low (1-18). */
export function isLow(n: number): boolean {
  return n >= 1 && n <= 18
}

/** Returns whether a number is high (19-36). */
export function isHigh(n: number): boolean {
  return n >= 19 && n <= 36
}

/** Returns the dozen (1, 2, or 3) a number belongs to. 0 returns null. */
export function getDozen(n: number): 1 | 2 | 3 | null {
  if (n === 0) return null
  if (n <= 12) return 1
  if (n <= 24) return 2
  return 3
}

/** Returns the column (1, 2, or 3) a number belongs to. 0 returns null. */
export function getColumn(n: number): 1 | 2 | 3 | null {
  if (n === 0) return null
  const mod = n % 3
  if (mod === 1) return 1
  if (mod === 2) return 2
  return 3 // mod === 0
}

/**
 * Returns numbers physically adjacent to a given number on the European wheel.
 * Used for near-miss detection.
 *
 * @param winningNumber The winning pocket number.
 * @param depth How many neighbours on each side (default 2).
 */
export function getAdjacentNumbers(winningNumber: number, depth: number = 2): number[] {
  const idx = EUROPEAN_WHEEL_ORDER.indexOf(winningNumber as typeof EUROPEAN_WHEEL_ORDER[number])
  if (idx === -1) return []

  const adjacent: number[] = []
  for (let d = 1; d <= depth; d++) {
    adjacent.push(EUROPEAN_WHEEL_ORDER[(idx + d) % 37]!)
    adjacent.push(EUROPEAN_WHEEL_ORDER[(idx - d + 37) % 37]!)
  }
  return adjacent
}

/**
 * Generates a random winning number (0-36) using crypto-safe RNG.
 * Server-side only — called before the spin animation starts.
 */
export function generateWinningNumber(): number {
  const array = new Uint8Array(1)
  // Use crypto.getRandomValues for fairness
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(array)
  } else {
    // Fallback for environments without Web Crypto (tests)
    array[0] = Math.floor(Math.random() * 256)
  }
  return array[0]! % 37
}

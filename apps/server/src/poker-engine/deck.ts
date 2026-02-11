import type { Card } from '@weekend-poker/shared'
import { RANKS, SUITS } from '@weekend-poker/shared'

/**
 * Creates a fresh, unshuffled 52-card deck.
 * Returns a new array on every call — no shared state.
 */
export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

/**
 * Returns a shuffled copy of the given deck using the Fisher-Yates algorithm.
 * Does NOT mutate the input array.
 *
 * @param deck  - The deck to shuffle (not mutated).
 * @param rand  - Optional random function returning [0, 1). Defaults to Math.random.
 *                Useful for deterministic testing.
 */
export function shuffleDeck(
  deck: readonly Card[],
  rand: () => number = Math.random,
): Card[] {
  const shuffled = deck.map(card => ({ ...card }))
  // Fisher-Yates (Knuth) shuffle — iterate from end to start
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const temp = shuffled[i]!
    shuffled[i] = shuffled[j]!
    shuffled[j] = temp
  }
  return shuffled
}

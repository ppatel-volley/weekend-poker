/**
 * 5-Card Draw discard and replacement mechanics.
 *
 * Players can discard 0-5 cards ("stand pat" = 0 discards).
 * Discarded cards are replaced from the deck.
 * All functions are pure — no mutation, no side effects.
 */
import type { Card } from '@weekend-casino/shared'

/**
 * Validates a discard selection.
 * Indices must be 0-4, unique, and between 0 and 5 total.
 */
export function validateDiscardIndices(indices: number[], handSize: number): boolean {
  if (indices.length > handSize) return false
  if (indices.some(i => i < 0 || i >= handSize || !Number.isInteger(i))) return false
  if (new Set(indices).size !== indices.length) return false
  return true
}

/**
 * Applies discard + replacement to a hand.
 * Returns the new 5-card hand with discarded cards replaced.
 *
 * @param hand  - Current 5-card hand.
 * @param discardIndices - Indices of cards to discard (0-based, 0-5 cards).
 * @param replacements - New cards from the deck (must match discardIndices.length).
 * @returns New hand with replacements at the discarded positions.
 */
export function applyDiscard(
  hand: readonly Card[],
  discardIndices: number[],
  replacements: readonly Card[],
): Card[] {
  if (replacements.length !== discardIndices.length) {
    throw new Error(
      `Replacement count (${replacements.length}) must match discard count (${discardIndices.length})`,
    )
  }

  const newHand = hand.map(c => ({ ...c }))
  const sortedIndices = [...discardIndices].sort((a, b) => a - b)

  for (let i = 0; i < sortedIndices.length; i++) {
    newHand[sortedIndices[i]!] = { ...replacements[i]! }
  }

  return newHand
}

/**
 * Draws cards from the deck without mutation.
 * Returns the drawn cards and the remaining deck.
 *
 * @param deck - The current deck.
 * @param count - Number of cards to draw.
 * @returns Tuple of [drawnCards, remainingDeck].
 */
export function drawFromDeck(
  deck: readonly Card[],
  count: number,
): [Card[], Card[]] {
  if (count > deck.length) {
    throw new Error(`Cannot draw ${count} cards from deck of ${deck.length}`)
  }

  const drawn = deck.slice(0, count).map(c => ({ ...c }))
  const remaining = deck.slice(count).map(c => ({ ...c }))
  return [drawn, remaining]
}

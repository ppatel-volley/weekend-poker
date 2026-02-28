/**
 * Blackjack 6-deck shoe management.
 *
 * Creates a multi-deck shoe and tracks penetration for reshuffle.
 */

import type { Card } from '@weekend-casino/shared'
import { RANKS, SUITS } from '@weekend-casino/shared'
import { shuffleDeck } from '../poker-engine/deck.js'

/**
 * Creates an unshuffled multi-deck shoe.
 * Default: 6 decks (312 cards).
 */
export function createShoe(numberOfDecks: number = 6): Card[] {
  const shoe: Card[] = []
  for (let d = 0; d < numberOfDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ rank, suit })
      }
    }
  }
  return shoe
}

/**
 * Returns a shuffled copy of a shoe.
 */
export function shuffleShoe(
  shoe: readonly Card[],
  rand?: () => number,
): Card[] {
  return shuffleDeck(shoe, rand)
}

/**
 * Calculates the current penetration of the shoe.
 * @param cardsRemaining Number of cards left in the shoe
 * @param totalCards Total cards in the shoe (e.g., 312 for 6 decks)
 * @returns Penetration as a fraction 0-1 (0.75 = 75% dealt)
 */
export function calculatePenetration(
  cardsRemaining: number,
  totalCards: number,
): number {
  if (totalCards <= 0) return 0
  return 1 - (cardsRemaining / totalCards)
}

/**
 * Whether the shoe needs reshuffling based on penetration threshold.
 */
export function needsReshuffle(
  cardsRemaining: number,
  totalCards: number,
  threshold: number = 0.75,
): boolean {
  return calculatePenetration(cardsRemaining, totalCards) >= threshold
}

/**
 * Deals one card from the shoe (mutates the array, returns the card).
 * Returns undefined if shoe is empty.
 */
export function dealCard(shoe: Card[]): Card | undefined {
  return shoe.shift()
}

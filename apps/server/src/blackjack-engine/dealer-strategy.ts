/**
 * Blackjack dealer strategy.
 *
 * Per D-009: Dealer stands on soft 17 by default (configurable per difficulty).
 * Hard rule: dealer always stands on hard 17+.
 */

import type { Card } from '@weekend-casino/shared'
import { evaluateBlackjackHand } from './hand-evaluator.js'

/**
 * Determines whether the dealer should hit.
 *
 * @param cards The dealer's current hand
 * @param hitSoft17 If true, dealer hits on soft 17. D-009 default = false.
 * @returns true if the dealer must hit
 */
export function shouldDealerHit(
  cards: Card[],
  hitSoft17: boolean = false,
): boolean {
  const { value, isSoft } = evaluateBlackjackHand(cards)

  // Dealer always hits below 17
  if (value < 17) return true

  // Soft 17 logic — configurable per D-009
  if (value === 17 && isSoft && hitSoft17) return true

  // Stand on 17+ (hard) or 18+
  return false
}

/**
 * Plays out the dealer's full turn, returning the final hand.
 * Mutates the shoe by dealing cards from it.
 *
 * @param initialCards Dealer's starting cards (face-up + hole card)
 * @param shoe The shoe to deal from (mutated)
 * @param hitSoft17 Whether to hit on soft 17
 * @returns The final dealer hand cards
 */
export function playDealerHand(
  initialCards: Card[],
  shoe: Card[],
  hitSoft17: boolean = false,
): Card[] {
  const hand = [...initialCards]

  while (shouldDealerHit(hand, hitSoft17)) {
    const card = shoe.shift()
    if (!card) break // shoe empty — shouldn't happen in practice
    hand.push(card)
  }

  return hand
}

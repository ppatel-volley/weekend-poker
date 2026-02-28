/**
 * Blackjack hand evaluator.
 *
 * Calculates hand values with Ace = 1 or 11.
 * Detects blackjack (natural 21), bust, and soft hands.
 */

import type { Card } from '@weekend-casino/shared'
import { rankToNumeric } from '@weekend-casino/shared'

/** Result of evaluating a blackjack hand. */
export interface BjHandValue {
  /** Best hand value (highest non-bust, or lowest if all bust). */
  value: number
  /** Whether the hand is soft (Ace counted as 11). */
  isSoft: boolean
  /** Whether the hand is busted (value > 21). */
  isBusted: boolean
}

/**
 * Gets the blackjack point value for a card.
 * Face cards (J/Q/K) = 10, Ace = 11 (handled in evaluation), others = face value.
 */
function cardPointValue(card: Card): number {
  const numeric = rankToNumeric(card.rank)
  if (numeric >= 10) return 10  // 10, J, Q, K
  if (numeric === 14) return 11 // Ace (initially 11)
  return numeric
}

/**
 * Evaluates a blackjack hand.
 * Aces are counted as 11 initially, then reduced to 1 as needed to avoid bust.
 */
export function evaluateBlackjackHand(cards: Card[]): BjHandValue {
  if (cards.length === 0) {
    return { value: 0, isSoft: false, isBusted: false }
  }

  let total = 0
  let aceCount = 0

  for (const card of cards) {
    const numeric = rankToNumeric(card.rank)
    if (numeric === 14) {
      total += 11
      aceCount++
    } else {
      total += cardPointValue(card)
    }
  }

  // Reduce Aces from 11 to 1 as needed
  while (total > 21 && aceCount > 0) {
    total -= 10
    aceCount--
  }

  return {
    value: total,
    isSoft: aceCount > 0 && total <= 21,
    isBusted: total > 21,
  }
}

/**
 * Checks if a hand is a natural blackjack (exactly 2 cards totalling 21).
 */
export function isNaturalBlackjack(cards: Card[]): boolean {
  if (cards.length !== 2) return false
  const { value } = evaluateBlackjackHand(cards)
  return value === 21
}

/**
 * Checks if a hand can be split (two cards of equal point value).
 */
export function canSplit(cards: Card[]): boolean {
  if (cards.length !== 2) return false
  return cardPointValue(cards[0]!) === cardPointValue(cards[1]!)
}

/**
 * Checks if a hand can be doubled down (exactly 2 cards, not busted).
 */
export function canDoubleDown(cards: Card[]): boolean {
  if (cards.length !== 2) return false
  const { isBusted } = evaluateBlackjackHand(cards)
  return !isBusted
}

/**
 * Blackjack payout calculator.
 *
 * Payout rules:
 *   - Blackjack (natural 21): 3:2 (bet * 1.5)
 *   - Regular win: 1:1
 *   - Insurance: 2:1
 *   - Push: 0 (bet returned)
 *   - Surrender: -0.5 (half bet lost)
 *   - Bust/loss: -1 (full bet lost)
 */

import type { Card } from '@weekend-casino/shared'
import { evaluateBlackjackHand, isNaturalBlackjack } from './hand-evaluator.js'

/** Result of a single hand's payout calculation. */
export interface BjPayoutResult {
  /** The payout amount (positive = win, 0 = push, negative = loss). */
  payout: number
  /** Whether the player's hand won. */
  isWin: boolean
  /** Whether it was a push. */
  isPush: boolean
  /** Descriptive outcome for display. */
  outcome: 'blackjack' | 'win' | 'push' | 'loss' | 'bust' | 'surrender'
}

/**
 * Calculates the payout for a single player hand vs the dealer hand.
 *
 * @param playerCards The player's cards for this hand
 * @param dealerCards The dealer's full hand
 * @param bet The bet on this hand
 * @param isDoubled Whether the player doubled down
 * @param surrendered Whether the player surrendered
 * @param blackjackPaysRatio Blackjack payout ratio (default 1.5 = 3:2)
 */
export function calculateHandPayout(
  playerCards: Card[],
  dealerCards: Card[],
  bet: number,
  isDoubled: boolean,
  surrendered: boolean,
  blackjackPaysRatio: number = 1.5,
): BjPayoutResult {
  if (surrendered) {
    return {
      payout: -(bet / 2),
      isWin: false,
      isPush: false,
      outcome: 'surrender',
    }
  }

  const effectiveBet = isDoubled ? bet * 2 : bet
  const playerValue = evaluateBlackjackHand(playerCards)
  const dealerValue = evaluateBlackjackHand(dealerCards)
  const playerBj = isNaturalBlackjack(playerCards)
  const dealerBj = isNaturalBlackjack(dealerCards)

  // Player busted
  if (playerValue.isBusted) {
    return {
      payout: -effectiveBet,
      isWin: false,
      isPush: false,
      outcome: 'bust',
    }
  }

  // Both have blackjack — push
  if (playerBj && dealerBj) {
    return {
      payout: 0,
      isWin: false,
      isPush: true,
      outcome: 'push',
    }
  }

  // Player has blackjack, dealer doesn't — pay 3:2
  if (playerBj) {
    return {
      payout: bet * blackjackPaysRatio,
      isWin: true,
      isPush: false,
      outcome: 'blackjack',
    }
  }

  // Dealer blackjack, player doesn't — loss
  if (dealerBj) {
    return {
      payout: -effectiveBet,
      isWin: false,
      isPush: false,
      outcome: 'loss',
    }
  }

  // Dealer busted — player wins
  if (dealerValue.isBusted) {
    return {
      payout: effectiveBet,
      isWin: true,
      isPush: false,
      outcome: 'win',
    }
  }

  // Compare values
  if (playerValue.value > dealerValue.value) {
    return {
      payout: effectiveBet,
      isWin: true,
      isPush: false,
      outcome: 'win',
    }
  }

  if (playerValue.value === dealerValue.value) {
    return {
      payout: 0,
      isWin: false,
      isPush: true,
      outcome: 'push',
    }
  }

  // Dealer wins
  return {
    payout: -effectiveBet,
    isWin: false,
    isPush: false,
    outcome: 'loss',
  }
}

/**
 * Calculates insurance payout.
 * Insurance pays 2:1 if the dealer has blackjack.
 */
export function calculateInsurancePayout(
  insuranceBet: number,
  dealerHasBlackjack: boolean,
): number {
  if (insuranceBet <= 0) return 0
  if (dealerHasBlackjack) return insuranceBet * 2
  return -insuranceBet
}

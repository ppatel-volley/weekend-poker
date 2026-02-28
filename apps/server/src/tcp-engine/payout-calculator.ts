/**
 * Three Card Poker payout calculator.
 *
 * Handles three independent payout streams:
 *   1. Ante bet (vs dealer, with ante bonus)
 *   2. Play bet (vs dealer)
 *   3. Pair Plus side bet (independent of dealer)
 */

import type { TcpHandRank } from '@weekend-casino/shared'
import type { TcpHandResult } from './hand-evaluator.js'
import { compareTcpHands, dealerQualifies } from './hand-evaluator.js'

/** Pair Plus payout multipliers. Pays based solely on player's hand quality. */
const PAIR_PLUS_PAYOUTS: Partial<Record<TcpHandRank, number>> = {
  straight_flush: 40,
  three_of_a_kind: 30,
  straight: 6,
  flush: 3,
  pair: 1,
}

/** Ante Bonus multipliers. Pays if player has strong hand AND plays (not folds). */
const ANTE_BONUS_PAYOUTS: Partial<Record<TcpHandRank, number>> = {
  straight_flush: 5,
  three_of_a_kind: 4,
  straight: 1,
}

/** Result of calculating a single player's TCP payouts. */
export interface TcpPayoutResult {
  /** Ante bet payout (0 = push, positive = win, negative = lose) */
  antePayout: number
  /** Play bet payout */
  playPayout: number
  /** Ante bonus payout (independent of dealer comparison for qualifying hands) */
  anteBonus: number
  /** Pair Plus side bet payout */
  pairPlusPayout: number
  /** Total chips returned to player (sum of all payouts + original bets returned on wins) */
  totalReturn: number
  /** Net result (totalReturn minus total wagered) */
  netResult: number
}

/**
 * Calculates Pair Plus payout for a player's hand.
 * Independent of dealer's hand and play/fold decision.
 *
 * @returns The payout multiplied by the bet, or 0 if lost.
 */
export function calculatePairPlusPayout(
  playerHand: TcpHandResult,
  pairPlusBet: number,
): number {
  if (pairPlusBet <= 0) return 0
  const multiplier = PAIR_PLUS_PAYOUTS[playerHand.rank]
  if (!multiplier) return 0
  return pairPlusBet * multiplier
}

/**
 * Calculates the ante bonus for a player's hand.
 * Pays when the player has a premium hand (straight or better) and chose to play.
 * Per the rules, ante bonus pays even if dealer doesn't qualify.
 */
export function calculateAnteBonus(
  playerHand: TcpHandResult,
  anteBet: number,
): number {
  if (anteBet <= 0) return 0
  const multiplier = ANTE_BONUS_PAYOUTS[playerHand.rank]
  if (!multiplier) return 0
  return anteBet * multiplier
}

/**
 * Calculates complete payout for a single TCP player.
 *
 * @param playerHand - Evaluated player hand
 * @param dealerHand - Evaluated dealer hand
 * @param anteBet - Player's ante wager
 * @param playBet - Player's play wager (0 if folded)
 * @param pairPlusBet - Player's Pair Plus side wager
 * @param folded - Whether the player folded
 */
export function calculateTcpPayout(
  playerHand: TcpHandResult,
  dealerHand: TcpHandResult,
  anteBet: number,
  playBet: number,
  pairPlusBet: number,
  folded: boolean,
): TcpPayoutResult {
  const totalWagered = anteBet + playBet + pairPlusBet

  // Pair Plus always resolves independently
  const pairPlusPayout = calculatePairPlusPayout(playerHand, pairPlusBet)
  // Pair Plus return: original bet back + payout if won, 0 if lost
  const pairPlusReturn = pairPlusPayout > 0 ? pairPlusBet + pairPlusPayout : 0

  // If player folded: lose ante, no play bet, Pair Plus still resolves
  if (folded) {
    return {
      antePayout: -anteBet,
      playPayout: 0,
      anteBonus: 0,
      pairPlusPayout,
      totalReturn: pairPlusReturn,
      netResult: pairPlusReturn - totalWagered,
    }
  }

  const qualifies = dealerQualifies(dealerHand)
  const anteBonus = calculateAnteBonus(playerHand, anteBet)

  // Dealer does not qualify: ante pays 1:1, play bet pushes (returned)
  if (!qualifies) {
    const anteReturn = anteBet + anteBet  // original + 1:1
    const playReturn = playBet  // pushed (returned)
    return {
      antePayout: anteBet, // won 1:1
      playPayout: 0, // push
      anteBonus,
      pairPlusPayout,
      totalReturn: anteReturn + playReturn + anteBonus + pairPlusReturn,
      netResult: anteReturn + playReturn + anteBonus + pairPlusReturn - totalWagered,
    }
  }

  // Dealer qualifies — compare hands
  const comparison = compareTcpHands(playerHand, dealerHand)

  if (comparison > 0) {
    // Player wins: both ante and play pay 1:1
    const anteReturn = anteBet + anteBet
    const playReturn = playBet + playBet
    return {
      antePayout: anteBet,
      playPayout: playBet,
      anteBonus,
      pairPlusPayout,
      totalReturn: anteReturn + playReturn + anteBonus + pairPlusReturn,
      netResult: anteReturn + playReturn + anteBonus + pairPlusReturn - totalWagered,
    }
  }

  if (comparison === 0) {
    // Tie: both ante and play push
    return {
      antePayout: 0,
      playPayout: 0,
      anteBonus,
      pairPlusPayout,
      totalReturn: anteBet + playBet + anteBonus + pairPlusReturn,
      netResult: anteBet + playBet + anteBonus + pairPlusReturn - totalWagered,
    }
  }

  // Player loses: lose both ante and play
  return {
    antePayout: -anteBet,
    playPayout: -playBet,
    anteBonus,
    pairPlusPayout,
    totalReturn: anteBonus + pairPlusReturn,
    netResult: anteBonus + pairPlusReturn - totalWagered,
  }
}

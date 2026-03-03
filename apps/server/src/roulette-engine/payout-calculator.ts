/**
 * Roulette payout calculator.
 *
 * Standard European roulette payouts:
 *   straight_up: 35:1, split: 17:1, street: 11:1,
 *   corner: 8:1, six_line: 5:1,
 *   dozens/columns: 2:1, even-money: 1:1
 *
 * All outside bets lose on 0 (La Partage deferred to v2).
 */

import type { RouletteBet, RouletteBetType } from '@weekend-casino/shared'

/** Payout multipliers per bet type (multiplied by bet amount). */
const PAYOUT_MULTIPLIERS: Record<RouletteBetType, number> = {
  straight_up: 35,
  split: 17,
  street: 11,
  corner: 8,
  six_line: 5,
  dozen_1: 2,
  dozen_2: 2,
  dozen_3: 2,
  column_1: 2,
  column_2: 2,
  column_3: 2,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  high: 1,
  low: 1,
}

/** Returns the payout multiplier for a bet type. */
export function getPayoutMultiplier(type: RouletteBetType): number {
  return PAYOUT_MULTIPLIERS[type]
}

/** Result of resolving a single bet. */
export interface BetResolution {
  betId: string
  won: boolean
  /** Payout amount (winnings only, not including the original bet). */
  payout: number
}

/**
 * Resolves a single bet against a winning number.
 * Returns whether the bet won and the payout amount.
 */
export function resolveBet(bet: RouletteBet, winningNumber: number): BetResolution {
  const won = bet.numbers.includes(winningNumber)
  const payout = won ? bet.amount * PAYOUT_MULTIPLIERS[bet.type] : 0

  return {
    betId: bet.id,
    won,
    payout,
  }
}

/**
 * Resolves all bets for a round.
 * Returns per-player payout summaries.
 */
export function resolveAllBets(
  bets: RouletteBet[],
  winningNumber: number,
): Map<string, { totalPayout: number; totalBet: number; netResult: number }> {
  const playerResults = new Map<string, { totalPayout: number; totalBet: number; netResult: number }>()

  for (const bet of bets) {
    const resolution = resolveBet(bet, winningNumber)
    const existing = playerResults.get(bet.playerId) ?? { totalPayout: 0, totalBet: 0, netResult: 0 }

    existing.totalBet += bet.amount
    if (resolution.won) {
      // Player gets back original bet + winnings
      existing.totalPayout += bet.amount + resolution.payout
    }

    playerResults.set(bet.playerId, existing)
  }

  // Calculate net result for each player
  for (const [, result] of playerResults) {
    result.netResult = result.totalPayout - result.totalBet
  }

  return playerResults
}

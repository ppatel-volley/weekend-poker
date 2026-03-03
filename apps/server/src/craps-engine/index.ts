/**
 * Craps engine — pure game logic.
 *
 * No VGF, no side effects, no Date.now(), no state mutation.
 * Every function is deterministic given its inputs (except rollDice which uses Math.random).
 */

import type { CrapsBet, CrapsComeBet, CrapsBetType } from '@weekend-casino/shared'
import {
  CRAPS_PLACE_PAYOUTS,
  CRAPS_TRUE_ODDS,
  CRAPS_DONT_ODDS,
  CRAPS_FIELD_NUMBERS,
  CRAPS_FIELD_DOUBLE,
  CRAPS_FIELD_TRIPLE,
  CRAPS_PLACE_NUMBERS,
} from '@weekend-casino/shared'

// ── Dice ────────────────────────────────────────────────────────────

/** Roll two six-sided dice. Returns [die1, die2]. */
export function rollDice(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ]
}

// ── Classification ──────────────────────────────────────────────────

/** Natural: 7 or 11 on come-out wins pass line. */
export function isNatural(total: number): boolean {
  return total === 7 || total === 11
}

/** Craps: 2, 3, or 12 on come-out loses pass line. */
export function isCraps(total: number): boolean {
  return total === 2 || total === 3 || total === 12
}

/** Point numbers: 4, 5, 6, 8, 9, 10 — establishes a point. */
export function isPoint(total: number): boolean {
  return total === 4 || total === 5 || total === 6 ||
         total === 8 || total === 9 || total === 10
}

/** Whether both dice are the same (hard way). */
export function isHardway(die1: number, die2: number): boolean {
  return die1 === die2
}

// ── Bet Resolution ──────────────────────────────────────────────────

/**
 * Resolve a Pass Line bet.
 * Come-out: 7/11 wins (1:1), 2/3/12 loses.
 * Point phase: point hit wins (1:1), 7 loses.
 */
export function resolvePassLineBet(
  bet: CrapsBet,
  total: number,
  point: number | null,
  puckOn: boolean,
): CrapsBet {
  if (!puckOn) {
    // Come-out roll
    if (isNatural(total)) {
      return { ...bet, status: 'won', payout: bet.amount * 2 }
    }
    if (isCraps(total)) {
      return { ...bet, status: 'lost', payout: 0 }
    }
    // Point established — bet stays active
    return bet
  }

  // Point phase
  if (total === point) {
    return { ...bet, status: 'won', payout: bet.amount * 2 }
  }
  if (total === 7) {
    return { ...bet, status: 'lost', payout: 0 }
  }
  return bet
}

/**
 * Resolve a Don't Pass bet.
 * Come-out: 2/3 wins (1:1), 12 pushes (bar), 7/11 loses.
 * Point phase: 7 wins (1:1), point hit loses.
 */
export function resolveDontPassBet(
  bet: CrapsBet,
  total: number,
  point: number | null,
  puckOn: boolean,
): CrapsBet {
  if (!puckOn) {
    // Come-out roll
    if (total === 2 || total === 3) {
      return { ...bet, status: 'won', payout: bet.amount * 2 }
    }
    if (total === 12) {
      return { ...bet, status: 'push', payout: bet.amount }
    }
    if (isNatural(total)) {
      return { ...bet, status: 'lost', payout: 0 }
    }
    // Point established — bet stays active
    return bet
  }

  // Point phase
  if (total === 7) {
    return { ...bet, status: 'won', payout: bet.amount * 2 }
  }
  if (total === point) {
    return { ...bet, status: 'lost', payout: 0 }
  }
  return bet
}

/**
 * Resolve a Place bet.
 * Wins when targetNumber rolls before 7.
 * Payouts: 9:5 (4/10), 7:5 (5/9), 7:6 (6/8).
 */
export function resolvePlaceBet(
  bet: CrapsBet,
  total: number,
): CrapsBet {
  if (!bet.working) return bet

  if (total === bet.targetNumber) {
    const odds = CRAPS_PLACE_PAYOUTS[bet.targetNumber!]
    if (!odds) return bet
    const payout = bet.amount + Math.floor(bet.amount * odds[0] / odds[1])
    return { ...bet, status: 'won', payout }
  }
  if (total === 7) {
    return { ...bet, status: 'lost', payout: 0 }
  }
  return bet
}

/**
 * Resolve a Field bet (one-roll).
 * Win on 2,3,4,9,10,11,12. 2 pays 2:1, 12 pays 3:1, others 1:1.
 */
export function resolveFieldBet(
  bet: CrapsBet,
  total: number,
): CrapsBet {
  if (!(CRAPS_FIELD_NUMBERS as readonly number[]).includes(total)) {
    return { ...bet, status: 'lost', payout: 0 }
  }
  if (total === CRAPS_FIELD_DOUBLE) {
    return { ...bet, status: 'won', payout: bet.amount * 3 } // 2:1 + original
  }
  if (total === CRAPS_FIELD_TRIPLE) {
    return { ...bet, status: 'won', payout: bet.amount * 4 } // 3:1 + original
  }
  return { ...bet, status: 'won', payout: bet.amount * 2 } // 1:1 + original
}

/**
 * Resolve an Odds bet (behind pass or don't pass).
 * True odds: no house edge.
 * Pass odds: 2:1(4/10), 3:2(5/9), 6:5(6/8).
 * Don't pass odds: inverse.
 */
export function resolveOddsBet(
  bet: CrapsBet,
  total: number,
  point: number,
  type: 'pass' | 'dont_pass',
): CrapsBet {
  if (type === 'pass') {
    if (total === point) {
      const odds = CRAPS_TRUE_ODDS[point]
      if (!odds) return bet
      const payout = bet.amount + Math.floor(bet.amount * odds[0] / odds[1])
      return { ...bet, status: 'won', payout }
    }
    if (total === 7) {
      return { ...bet, status: 'lost', payout: 0 }
    }
  } else {
    if (total === 7) {
      const odds = CRAPS_DONT_ODDS[point]
      if (!odds) return bet
      const payout = bet.amount + Math.floor(bet.amount * odds[0] / odds[1])
      return { ...bet, status: 'won', payout }
    }
    if (total === point) {
      return { ...bet, status: 'lost', payout: 0 }
    }
  }
  return bet
}

/**
 * Resolve a Come/Don't Come bet.
 * Like personal pass/don't pass on their own point.
 */
export function resolveComeBet(
  comeBet: CrapsComeBet,
  total: number,
): CrapsComeBet {
  if (comeBet.comePoint === null) {
    // Come bet without established point — acts like come-out
    if (comeBet.type === 'come') {
      if (isNatural(total)) {
        return { ...comeBet, status: 'won' }
      }
      if (isCraps(total)) {
        return { ...comeBet, status: 'lost' }
      }
      // Establish the come point
      if (isPoint(total)) {
        return { ...comeBet, comePoint: total }
      }
    } else {
      // dont_come
      if (total === 2 || total === 3) {
        return { ...comeBet, status: 'won' }
      }
      if (total === 12) {
        return { ...comeBet, status: 'push' }
      }
      if (isNatural(total)) {
        return { ...comeBet, status: 'lost' }
      }
      if (isPoint(total)) {
        return { ...comeBet, comePoint: total }
      }
    }
    return comeBet
  }

  // Come bet with established point
  if (comeBet.type === 'come') {
    if (total === comeBet.comePoint) {
      return { ...comeBet, status: 'won' }
    }
    if (total === 7) {
      return { ...comeBet, status: 'lost' }
    }
  } else {
    // dont_come with point
    if (total === 7) {
      return { ...comeBet, status: 'won' }
    }
    if (total === comeBet.comePoint) {
      return { ...comeBet, status: 'lost' }
    }
  }
  return comeBet
}

// ── Payout Calculation ──────────────────────────────────────────────

/**
 * Calculate raw payout for a given bet type and amount.
 * Returns total returned to player (includes original bet).
 */
export function calculatePayout(
  betType: CrapsBetType,
  amount: number,
  targetNumber?: number,
): number {
  switch (betType) {
    case 'pass_line':
    case 'dont_pass':
    case 'come':
    case 'dont_come':
      return amount * 2 // 1:1

    case 'place': {
      if (targetNumber == null) return amount
      const odds = CRAPS_PLACE_PAYOUTS[targetNumber]
      if (!odds) return amount
      return amount + Math.floor(amount * odds[0] / odds[1])
    }

    case 'field':
      // Depends on actual number rolled — return 1:1 as base
      return amount * 2

    case 'pass_odds':
    case 'come_odds': {
      if (targetNumber == null) return amount
      const odds = CRAPS_TRUE_ODDS[targetNumber]
      if (!odds) return amount
      return amount + Math.floor(amount * odds[0] / odds[1])
    }

    case 'dont_pass_odds':
    case 'dont_come_odds': {
      if (targetNumber == null) return amount
      const odds = CRAPS_DONT_ODDS[targetNumber]
      if (!odds) return amount
      return amount + Math.floor(amount * odds[0] / odds[1])
    }

    default:
      return amount
  }
}

/**
 * Check if a number is a valid place bet target.
 */
export function isValidPlaceNumber(num: number): boolean {
  return (CRAPS_PLACE_NUMBERS as readonly number[]).includes(num)
}

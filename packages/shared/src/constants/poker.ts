import type { BlindLevel } from '../types/game-state.js'

export const MAX_PLAYERS = 4
export const MIN_PLAYERS_TO_START = 2
export const STARTING_STACK = 1000
export const ACTION_TIMEOUT_MS = 30_000
export const TIME_WARNING_MS = 20_000
export const DISCONNECT_TIMEOUT_MS = 30_000
export const INTER_HAND_DELAY_MS = 3_000
export const DEALING_ANIMATION_MS = 1_500
export const SIT_OUT_MAX_HANDS = 3

export const BLIND_LEVELS: readonly BlindLevel[] = [
  { level: 1, smallBlind: 5, bigBlind: 10, minBuyIn: 200, maxBuyIn: 1000 },
  { level: 2, smallBlind: 10, bigBlind: 20, minBuyIn: 400, maxBuyIn: 2000 },
  { level: 3, smallBlind: 25, bigBlind: 50, minBuyIn: 1000, maxBuyIn: 5000 },
  { level: 4, smallBlind: 50, bigBlind: 100, minBuyIn: 2000, maxBuyIn: 10000 },
  { level: 5, smallBlind: 100, bigBlind: 200, minBuyIn: 4000, maxBuyIn: 20000 },
]

export const DEFAULT_BLIND_LEVEL = BLIND_LEVELS[0]!

export const DEALER_CHARACTERS = ['vincent', 'maya', 'remy', 'jade'] as const
export type DealerCharacter = typeof DEALER_CHARACTERS[number]

// ── Three Card Poker Constants ──────────────────────────────────────
export const TCP_MIN_ANTE = 10
export const TCP_MAX_ANTE = 500
export const TCP_MAX_PAIR_PLUS = 100
export const TCP_BET_TIMEOUT_MS = 20_000
export const TCP_DECISION_TIMEOUT_MS = 15_000

// ── Blackjack Classic Constants (D-006, D-009) ─────────────────────
export const BJ_MIN_BET = 10
export const BJ_MAX_BET = 500             // D-006
export const BJ_NUMBER_OF_DECKS = 6
export const BJ_RESHUFFLE_THRESHOLD = 0.75  // Reshuffle at 75% penetration
export const BJ_BLACKJACK_PAYS_RATIO = 1.5  // 3:2
export const BJ_INSURANCE_PAYS_RATIO = 2    // 2:1
export const BJ_DEALER_HITS_SOFT_17 = false  // D-009: stands on soft 17 by default
export const BJ_MAX_SPLITS = 3
export const BJ_BET_TIMEOUT_MS = 20_000
export const BJ_ACTION_TIMEOUT_MS = 30_000
export const BJ_INSURANCE_TIMEOUT_MS = 10_000

// ── Roulette Constants ──────────────────────────────────────────────
export const ROULETTE_MIN_BET = 5
export const ROULETTE_MAX_INSIDE_BET = 100
export const ROULETTE_MAX_OUTSIDE_BET = 500
export const ROULETTE_MAX_TOTAL_BET = 1000
export const ROULETTE_BET_TIMEOUT_MS = 45_000
export const ROULETTE_SPIN_ANIMATION_TARGET_MS = 6_000
export const ROULETTE_SPIN_HARD_TIMEOUT_MS = 8_000

// ── Craps Constants (v2.1, D-016) ────────────────────────────────
export const CRAPS_MIN_BET = 10
export const CRAPS_MAX_BET = 500
export const CRAPS_MAX_ODDS_MULTIPLIER = 3
export const CRAPS_BET_TIMEOUT_MS = 30_000
export const CRAPS_ROLL_AUTO_TIMEOUT_MS = 15_000

/** Craps payout odds for Place bets. */
export const CRAPS_PLACE_PAYOUTS: Record<number, [number, number]> = {
  4: [9, 5],   // 9:5
  5: [7, 5],   // 7:5
  6: [7, 6],   // 7:6
  8: [7, 6],   // 7:6
  9: [7, 5],   // 7:5
  10: [9, 5],  // 9:5
}

/** Craps true odds for Pass/Come Odds bets. */
export const CRAPS_TRUE_ODDS: Record<number, [number, number]> = {
  4: [2, 1],   // 2:1
  5: [3, 2],   // 3:2
  6: [6, 5],   // 6:5
  8: [6, 5],   // 6:5
  9: [3, 2],   // 3:2
  10: [2, 1],  // 2:1
}

/** Craps true odds for Don't Pass/Don't Come Odds (inverse). */
export const CRAPS_DONT_ODDS: Record<number, [number, number]> = {
  4: [1, 2],   // 1:2
  5: [2, 3],   // 2:3
  6: [5, 6],   // 5:6
  8: [5, 6],   // 5:6
  9: [2, 3],   // 2:3
  10: [1, 2],  // 1:2
}

/** Field bet payouts (1:1 default, 2x on 2, 3x on 12). */
export const CRAPS_FIELD_NUMBERS = [2, 3, 4, 9, 10, 11, 12] as const
export const CRAPS_FIELD_DOUBLE = 2
export const CRAPS_FIELD_TRIPLE = 12

/** Valid place bet numbers. */
export const CRAPS_PLACE_NUMBERS = [4, 5, 6, 8, 9, 10] as const

/** Default craps configuration. */
export const DEFAULT_CRAPS_CONFIG = {
  minBet: CRAPS_MIN_BET,
  maxBet: CRAPS_MAX_BET,
  maxOddsMultiplier: CRAPS_MAX_ODDS_MULTIPLIER,
  placeBetsWorkOnComeOut: false,
  simpleMode: true,
} as const

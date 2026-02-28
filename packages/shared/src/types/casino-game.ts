/**
 * Casino Game Type — Enum of all playable games (D-004).
 *
 * Uses snake_case values per D-004: 'holdem', 'five_card_draw', etc.
 * Each game has associated phases in the CasinoPhase enum (D-001).
 *
 * v1 (shipped): Hold'em, 5-Card Draw, Blackjack Classic/Competitive
 * v2.0 (v2.0): Roulette, Three Card Poker
 * v2.1 (v2.1): Craps
 */
export type CasinoGame =
  // v1 games
  | 'holdem'
  | 'five_card_draw'
  | 'blackjack_classic'
  | 'blackjack_competitive'
  // v2.0 games
  | 'roulette'
  | 'three_card_poker'
  // v2.1 games
  | 'craps'

/**
 * Casino game labels for UI display.
 * Maps CasinoGame to user-friendly display name.
 */
export const CASINO_GAME_LABELS: Record<CasinoGame, string> = {
  holdem: 'Texas Hold\'em',
  five_card_draw: '5-Card Draw',
  blackjack_classic: 'Blackjack',
  blackjack_competitive: 'Competitive Blackjack',
  roulette: 'Roulette',
  three_card_poker: 'Three Card Poker',
  craps: 'Craps',
}

/**
 * v1 games only (shipped in initial release).
 */
export const V1_GAMES: CasinoGame[] = [
  'holdem',
  'five_card_draw',
  'blackjack_classic',
  'blackjack_competitive',
]

/**
 * v2.0 games (shipped in v2.0 release).
 */
export const V2_0_GAMES: CasinoGame[] = [
  'roulette',
  'three_card_poker',
]

/**
 * v2.1 games (shipped in v2.1 release).
 */
export const V2_1_GAMES: CasinoGame[] = [
  'craps',
]

/**
 * All available games.
 */
export const ALL_GAMES: CasinoGame[] = [
  ...V1_GAMES,
  ...V2_0_GAMES,
  ...V2_1_GAMES,
]

/**
 * Type guard to check if a value is a valid CasinoGame.
 */
export function isCasinoGame(value: unknown): value is CasinoGame {
  return typeof value === 'string' && ALL_GAMES.includes(value as CasinoGame)
}

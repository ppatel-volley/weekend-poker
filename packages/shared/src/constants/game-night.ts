/**
 * Game Night Mode constants (v2.1 — D-014).
 *
 * Scoring: Rank-based. 1st=100, 2nd=70, 3rd=45, 4th=25 + margin bonus (up to 30)
 * + achievement bonuses (royal flush=50, etc.).
 */

import type { GameNightAchievementType, GameNightTheme } from '../types/casino-game-state.js'

// ── Rank Points (D-014) ─────────────────────────────────────────

/** Points awarded by finishing position (1st through 4th). */
export const GN_RANK_POINTS: Record<number, number> = {
  1: 100,
  2: 70,
  3: 45,
  4: 25,
}

// ── Margin Bonus ────────────────────────────────────────────────

/** Maximum margin bonus points a player can earn per game. */
export const GN_MAX_MARGIN_BONUS = 30

// ── Timing ──────────────────────────────────────────────────────

/** How long the leaderboard is displayed before auto-advancing (ms). */
export const GN_LEADERBOARD_DISPLAY_MS = 18_000

/** How long the champion ceremony is displayed before auto-advancing (ms). */
export const GN_CHAMPION_DISPLAY_MS = 30_000

// ── Game Lineup Limits ──────────────────────────────────────────

/** Minimum number of games in a Game Night lineup. */
export const GN_MIN_GAMES = 3

/** Maximum number of games in a Game Night lineup. */
export const GN_MAX_GAMES = 5

/** Default rounds per game. */
export const GN_DEFAULT_ROUNDS_PER_GAME = 5

// ── Achievement Bonuses ─────────────────────────────────────────

/** Bonus points for each achievement type. */
export const GN_ACHIEVEMENT_BONUSES: Record<GameNightAchievementType, number> = {
  ROYAL_FLUSH: 50,
  STRAIGHT_FLUSH: 35,
  FOUR_OF_A_KIND: 25,
  NATURAL_BLACKJACK: 20,
  TCP_STRAIGHT_FLUSH: 35,
  TCP_MINI_ROYAL: 50,
  STRAIGHT_UP_HIT: 30,
}

/** All valid achievement types. */
export const GN_ACHIEVEMENT_TYPES: GameNightAchievementType[] = [
  'ROYAL_FLUSH',
  'STRAIGHT_FLUSH',
  'FOUR_OF_A_KIND',
  'NATURAL_BLACKJACK',
  'TCP_STRAIGHT_FLUSH',
  'TCP_MINI_ROYAL',
  'STRAIGHT_UP_HIT',
]

// ── Themes ──────────────────────────────────────────────────────

/** Available Game Night visual themes. */
export const GN_THEMES: GameNightTheme[] = [
  'classic',
  'neon',
  'high_roller',
  'tropical',
]

/** Default theme. */
export const GN_DEFAULT_THEME: GameNightTheme = 'classic'

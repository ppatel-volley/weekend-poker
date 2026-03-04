/**
 * Daily bonus constants — 7-day cycle with streak multiplier.
 *
 * v2.2: "Come Back Tomorrow" retention feature.
 */

/** Daily bonus amounts by day (1-indexed, day 1 = index 0). */
export const DAILY_BONUS_SCHEDULE = [
  500,    // Day 1
  750,    // Day 2
  1_000,  // Day 3
  1_500,  // Day 4
  2_000,  // Day 5
  3_000,  // Day 6
  5_000,  // Day 7
] as const

/** Streak multiplier applied after day 7 for continued streaks. */
export const DAILY_BONUS_STREAK_MULTIPLIER = 1.5

/** Maximum hours between claims to maintain streak (36 hours — generous buffer). */
export const DAILY_BONUS_STREAK_WINDOW_HOURS = 36

/** XP awarded per daily bonus claim. */
export const DAILY_BONUS_XP_REWARD = 50

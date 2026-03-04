/**
 * Daily bonus store — pure calculation + Redis persistence.
 *
 * 7-day cycle: 500 / 750 / 1,000 / 1,500 / 2,000 / 3,000 / 5,000 chips.
 * Streak multiplier (1.5x) applied after day 7 for continued streaks.
 * Streak maintained if claim within 36 hours of last claim.
 */

import type { DailyBonusState, DailyBonusResult } from '@weekend-casino/shared'
import {
  DAILY_BONUS_SCHEDULE,
  DAILY_BONUS_STREAK_MULTIPLIER,
  DAILY_BONUS_STREAK_WINDOW_HOURS,
} from '@weekend-casino/shared'

/**
 * Get today's date as YYYY-MM-DD in UTC.
 */
export function getUtcDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]!
}

/**
 * Calculate the daily bonus for a player (pure function).
 *
 * @param bonusState - Current bonus state from Redis
 * @param now - Current timestamp (for testing)
 * @returns Bonus result with eligibility, amount, streak info
 */
export function calculateDailyBonus(
  bonusState: DailyBonusState,
  now: Date = new Date(),
): DailyBonusResult {
  const today = getUtcDateString(now)

  // Already claimed today
  if (bonusState.lastClaimDate === today) {
    return {
      eligible: false,
      amount: 0,
      streakDay: bonusState.currentStreak,
      multiplierApplied: false,
      newStreak: bonusState.currentStreak,
    }
  }

  // Check if streak is maintained (claim within window)
  let newStreak = 1
  if (bonusState.lastClaimDate) {
    const lastClaim = new Date(bonusState.lastClaimDate + 'T00:00:00Z')
    const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60)

    if (hoursSinceLastClaim <= DAILY_BONUS_STREAK_WINDOW_HOURS) {
      newStreak = bonusState.currentStreak + 1
    }
    // else: streak broken, reset to 1
  }

  // Calculate bonus amount
  const scheduleIndex = ((newStreak - 1) % DAILY_BONUS_SCHEDULE.length)
  let amount: number = DAILY_BONUS_SCHEDULE[scheduleIndex]!

  // Apply streak multiplier after completing first 7-day cycle
  const multiplierApplied = newStreak > DAILY_BONUS_SCHEDULE.length
  if (multiplierApplied) {
    amount = Math.floor(amount * DAILY_BONUS_STREAK_MULTIPLIER)
  }

  return {
    eligible: true,
    amount,
    streakDay: newStreak,
    multiplierApplied,
    newStreak,
  }
}

/**
 * Apply a daily bonus claim and return the updated state.
 */
export function applyDailyBonusClaim(
  bonusState: DailyBonusState,
  result: DailyBonusResult,
  now: Date = new Date(),
): DailyBonusState {
  if (!result.eligible) return bonusState

  return {
    currentStreak: result.newStreak,
    lastClaimDate: getUtcDateString(now),
    totalClaimed: bonusState.totalClaimed + result.amount,
  }
}

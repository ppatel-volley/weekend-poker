import { describe, it, expect } from 'vitest'
import {
  calculateDailyBonus,
  applyDailyBonusClaim,
  getUtcDateString,
} from '../persistence/daily-bonus-store.js'
import type { DailyBonusState } from '@weekend-casino/shared'

const emptyState: DailyBonusState = {
  currentStreak: 0,
  lastClaimDate: null,
  totalClaimed: 0,
}

describe('getUtcDateString', () => {
  it('formats a date as YYYY-MM-DD', () => {
    const date = new Date('2026-03-03T14:30:00Z')
    expect(getUtcDateString(date)).toBe('2026-03-03')
  })
})

describe('calculateDailyBonus', () => {
  it('awards day 1 bonus (500 chips) for first-time claim', () => {
    const now = new Date('2026-03-03T12:00:00Z')
    const result = calculateDailyBonus(emptyState, now)

    expect(result.eligible).toBe(true)
    expect(result.amount).toBe(500)
    expect(result.streakDay).toBe(1)
    expect(result.multiplierApplied).toBe(false)
    expect(result.newStreak).toBe(1)
  })

  it('returns not eligible when already claimed today', () => {
    const state: DailyBonusState = {
      currentStreak: 3,
      lastClaimDate: '2026-03-03',
      totalClaimed: 2250,
    }
    const now = new Date('2026-03-03T18:00:00Z')
    const result = calculateDailyBonus(state, now)

    expect(result.eligible).toBe(false)
    expect(result.amount).toBe(0)
  })

  it('continues streak for consecutive day claim', () => {
    const state: DailyBonusState = {
      currentStreak: 2,
      lastClaimDate: '2026-03-02',
      totalClaimed: 1250,
    }
    const now = new Date('2026-03-03T12:00:00Z')
    const result = calculateDailyBonus(state, now)

    expect(result.eligible).toBe(true)
    expect(result.amount).toBe(1000) // Day 3 = 1,000
    expect(result.streakDay).toBe(3)
    expect(result.newStreak).toBe(3)
    expect(result.multiplierApplied).toBe(false)
  })

  it('resets streak when gap exceeds 36 hours', () => {
    const state: DailyBonusState = {
      currentStreak: 5,
      lastClaimDate: '2026-03-01', // 2 days ago
      totalClaimed: 5750,
    }
    const now = new Date('2026-03-03T12:00:00Z')
    const result = calculateDailyBonus(state, now)

    expect(result.eligible).toBe(true)
    expect(result.streakDay).toBe(1) // Reset
    expect(result.amount).toBe(500) // Day 1
    expect(result.newStreak).toBe(1)
  })

  it('awards day 7 bonus (5,000 chips)', () => {
    const state: DailyBonusState = {
      currentStreak: 6,
      lastClaimDate: '2026-03-02',
      totalClaimed: 8250,
    }
    const now = new Date('2026-03-03T12:00:00Z')
    const result = calculateDailyBonus(state, now)

    expect(result.eligible).toBe(true)
    expect(result.amount).toBe(5000) // Day 7
    expect(result.streakDay).toBe(7)
    expect(result.multiplierApplied).toBe(false)
  })

  it('applies 1.5x multiplier after day 7', () => {
    const state: DailyBonusState = {
      currentStreak: 7,
      lastClaimDate: '2026-03-02',
      totalClaimed: 13250,
    }
    const now = new Date('2026-03-03T12:00:00Z')
    const result = calculateDailyBonus(state, now)

    expect(result.eligible).toBe(true)
    expect(result.streakDay).toBe(8)
    expect(result.multiplierApplied).toBe(true)
    // Day 8 = schedule index 0 = 500 * 1.5 = 750
    expect(result.amount).toBe(750)
  })

  it('wraps around the 7-day schedule', () => {
    const state: DailyBonusState = {
      currentStreak: 13,
      lastClaimDate: '2026-03-02',
      totalClaimed: 30000,
    }
    const now = new Date('2026-03-03T12:00:00Z')
    const result = calculateDailyBonus(state, now)

    expect(result.eligible).toBe(true)
    expect(result.streakDay).toBe(14)
    // Day 14: schedule index = (14-1) % 7 = 6 → 5000 * 1.5 = 7500
    expect(result.amount).toBe(7500)
    expect(result.multiplierApplied).toBe(true)
  })
})

describe('applyDailyBonusClaim', () => {
  it('updates state on successful claim', () => {
    const now = new Date('2026-03-03T12:00:00Z')
    const result = calculateDailyBonus(emptyState, now)
    const updated = applyDailyBonusClaim(emptyState, result, now)

    expect(updated.currentStreak).toBe(1)
    expect(updated.lastClaimDate).toBe('2026-03-03')
    expect(updated.totalClaimed).toBe(500)
  })

  it('does not modify state when not eligible', () => {
    const state: DailyBonusState = {
      currentStreak: 3,
      lastClaimDate: '2026-03-03',
      totalClaimed: 2250,
    }
    const result = calculateDailyBonus(state, new Date('2026-03-03T18:00:00Z'))
    const updated = applyDailyBonusClaim(state, result)

    expect(updated).toBe(state) // Same reference — unchanged
  })
})

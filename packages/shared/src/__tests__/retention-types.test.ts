import { describe, it, expect } from 'vitest'
import {
  createEmptyPersistentStats,
  calculatePlayerLevel,
  PLAYER_LEVEL_XP_THRESHOLDS,
} from '../types/retention.js'

describe('createEmptyPersistentStats', () => {
  it('should return all numeric fields at zero', () => {
    const stats = createEmptyPersistentStats()
    expect(stats.totalGamesPlayed).toBe(0)
    expect(stats.totalHandsPlayed).toBe(0)
    expect(stats.totalHandsWon).toBe(0)
    expect(stats.totalChipsWon).toBe(0)
    expect(stats.totalChipsLost).toBe(0)
    expect(stats.bestWinStreak).toBe(0)
    expect(stats.currentWinStreak).toBe(0)
    expect(stats.totalSessions).toBe(0)
    expect(stats.gameNightWins).toBe(0)
    expect(stats.challengesCompleted).toBe(0)
  })

  it('should return empty byGameType record', () => {
    const stats = createEmptyPersistentStats()
    expect(stats.byGameType).toEqual({})
  })

  it('should return a new object each call (not shared reference)', () => {
    const a = createEmptyPersistentStats()
    const b = createEmptyPersistentStats()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})

describe('PLAYER_LEVEL_XP_THRESHOLDS', () => {
  it('should have 10 entries (levels 1-10)', () => {
    expect(PLAYER_LEVEL_XP_THRESHOLDS).toHaveLength(10)
  })

  it('should start at 0 XP for level 1', () => {
    expect(PLAYER_LEVEL_XP_THRESHOLDS[0]).toBe(0)
  })

  it('should be monotonically increasing', () => {
    for (let i = 1; i < PLAYER_LEVEL_XP_THRESHOLDS.length; i++) {
      expect(PLAYER_LEVEL_XP_THRESHOLDS[i]).toBeGreaterThan(
        PLAYER_LEVEL_XP_THRESHOLDS[i - 1]!,
      )
    }
  })

  it('should end at 30,000 XP for level 10', () => {
    expect(PLAYER_LEVEL_XP_THRESHOLDS[9]).toBe(30_000)
  })
})

describe('calculatePlayerLevel', () => {
  it('should return level 1 for 0 XP', () => {
    expect(calculatePlayerLevel(0)).toBe(1)
  })

  it('should return level 1 for negative XP', () => {
    expect(calculatePlayerLevel(-100)).toBe(1)
  })

  it('should return level 1 for XP below level 2 threshold', () => {
    expect(calculatePlayerLevel(499)).toBe(1)
  })

  it('should return level 2 at exactly 500 XP', () => {
    expect(calculatePlayerLevel(500)).toBe(2)
  })

  it('should return level 2 for XP between level 2 and 3', () => {
    expect(calculatePlayerLevel(1_000)).toBe(2)
  })

  it('should return correct level at each threshold boundary', () => {
    const thresholds = [0, 500, 1_500, 3_000, 5_000, 8_000, 12_000, 17_000, 23_000, 30_000]
    thresholds.forEach((xp, i) => {
      expect(calculatePlayerLevel(xp)).toBe(i + 1)
    })
  })

  it('should return level 10 for very high XP (max level)', () => {
    expect(calculatePlayerLevel(100_000)).toBe(10)
    expect(calculatePlayerLevel(999_999)).toBe(10)
  })

  it('should return correct level just below each threshold', () => {
    expect(calculatePlayerLevel(499)).toBe(1)
    expect(calculatePlayerLevel(1_499)).toBe(2)
    expect(calculatePlayerLevel(2_999)).toBe(3)
    expect(calculatePlayerLevel(4_999)).toBe(4)
    expect(calculatePlayerLevel(7_999)).toBe(5)
    expect(calculatePlayerLevel(11_999)).toBe(6)
    expect(calculatePlayerLevel(16_999)).toBe(7)
    expect(calculatePlayerLevel(22_999)).toBe(8)
    expect(calculatePlayerLevel(29_999)).toBe(9)
  })
})

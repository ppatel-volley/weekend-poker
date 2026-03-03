import { describe, it, expect } from 'vitest'
import {
  GN_RANK_POINTS,
  GN_MAX_MARGIN_BONUS,
  GN_LEADERBOARD_DISPLAY_MS,
  GN_CHAMPION_DISPLAY_MS,
  GN_MIN_GAMES,
  GN_MAX_GAMES,
  GN_DEFAULT_ROUNDS_PER_GAME,
  GN_ACHIEVEMENT_BONUSES,
  GN_ACHIEVEMENT_TYPES,
  GN_THEMES,
  GN_DEFAULT_THEME,
} from '../constants/game-night.js'

describe('Game Night constants', () => {
  describe('GN_RANK_POINTS', () => {
    it('should award decreasing points by rank', () => {
      expect(GN_RANK_POINTS[1]).toBe(100)
      expect(GN_RANK_POINTS[2]).toBe(70)
      expect(GN_RANK_POINTS[3]).toBe(45)
      expect(GN_RANK_POINTS[4]).toBe(25)
    })

    it('should have 4 rank entries (max 4 players)', () => {
      expect(Object.keys(GN_RANK_POINTS)).toHaveLength(4)
    })

    it('should have strictly decreasing values', () => {
      const values = [GN_RANK_POINTS[1]!, GN_RANK_POINTS[2]!, GN_RANK_POINTS[3]!, GN_RANK_POINTS[4]!]
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeLessThan(values[i - 1]!)
      }
    })
  })

  describe('GN_MAX_MARGIN_BONUS', () => {
    it('should be 30', () => {
      expect(GN_MAX_MARGIN_BONUS).toBe(30)
    })
  })

  describe('timing constants', () => {
    it('leaderboard display time should be 18 seconds', () => {
      expect(GN_LEADERBOARD_DISPLAY_MS).toBe(18_000)
    })

    it('champion display time should be 30 seconds', () => {
      expect(GN_CHAMPION_DISPLAY_MS).toBe(30_000)
    })
  })

  describe('game lineup limits', () => {
    it('minimum games should be 3', () => {
      expect(GN_MIN_GAMES).toBe(3)
    })

    it('maximum games should be 5', () => {
      expect(GN_MAX_GAMES).toBe(5)
    })

    it('min should be less than max', () => {
      expect(GN_MIN_GAMES).toBeLessThan(GN_MAX_GAMES)
    })

    it('default rounds per game should be 5', () => {
      expect(GN_DEFAULT_ROUNDS_PER_GAME).toBe(5)
    })
  })

  describe('GN_ACHIEVEMENT_BONUSES', () => {
    it('should have bonus for all achievement types', () => {
      for (const type of GN_ACHIEVEMENT_TYPES) {
        expect(GN_ACHIEVEMENT_BONUSES[type]).toBeDefined()
        expect(GN_ACHIEVEMENT_BONUSES[type]).toBeGreaterThan(0)
      }
    })

    it('should have 7 MVP achievement types', () => {
      expect(GN_ACHIEVEMENT_TYPES).toHaveLength(7)
    })

    it('ROYAL_FLUSH and TCP_MINI_ROYAL should have highest bonus', () => {
      const maxBonus = Math.max(...Object.values(GN_ACHIEVEMENT_BONUSES))
      expect(GN_ACHIEVEMENT_BONUSES['ROYAL_FLUSH']).toBe(maxBonus)
      expect(GN_ACHIEVEMENT_BONUSES['TCP_MINI_ROYAL']).toBe(maxBonus)
    })
  })

  describe('GN_THEMES', () => {
    it('should have 4 themes', () => {
      expect(GN_THEMES).toHaveLength(4)
    })

    it('should include classic theme', () => {
      expect(GN_THEMES).toContain('classic')
    })

    it('default theme should be classic', () => {
      expect(GN_DEFAULT_THEME).toBe('classic')
    })

    it('default theme should be in themes list', () => {
      expect(GN_THEMES).toContain(GN_DEFAULT_THEME)
    })
  })
})

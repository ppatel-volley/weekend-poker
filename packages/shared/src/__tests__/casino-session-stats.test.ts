import { describe, it, expect } from 'vitest'
import {
  createSessionStats,
  createPlayerSessionStats,
} from '../types/casino-session-stats.js'

describe('createSessionStats factory', () => {
  it('should create session stats with provided timestamp', () => {
    const startTime = 1000000
    const stats = createSessionStats(startTime)
    expect(stats.sessionStartedAt).toBe(startTime)
  })

  it('should initialize all game counts to zero', () => {
    const stats = createSessionStats(Date.now())
    expect(stats.gamesPlayed.holdem).toBe(0)
    expect(stats.gamesPlayed.five_card_draw).toBe(0)
    expect(stats.gamesPlayed.blackjack_classic).toBe(0)
    expect(stats.gamesPlayed.blackjack_competitive).toBe(0)
    expect(stats.gamesPlayed.roulette).toBe(0)
    expect(stats.gamesPlayed.three_card_poker).toBe(0)
    expect(stats.gamesPlayed.craps).toBe(0)
  })

  it('should initialize aggregate stats to zero', () => {
    const stats = createSessionStats(Date.now())
    expect(stats.handsPlayed).toBe(0)
    expect(stats.totalChipsWon).toBe(0)
    expect(stats.totalChipsLost).toBe(0)
    expect(stats.biggestPot).toBe(0)
  })

  it('should initialize highlights to null', () => {
    const stats = createSessionStats(Date.now())
    expect(stats.biggestWin).toBeNull()
    expect(stats.worstBeat).toBeNull()
  })

  it('should initialize empty player stats record', () => {
    const stats = createSessionStats(Date.now())
    expect(stats.playerStats).toEqual({})
  })

  it('should have correct structure for multiple calls', () => {
    const stats1 = createSessionStats(1000)
    const stats2 = createSessionStats(2000)
    expect(stats1.sessionStartedAt).toBe(1000)
    expect(stats2.sessionStartedAt).toBe(2000)
    expect(stats1).not.toBe(stats2)
  })
})

describe('createPlayerSessionStats factory', () => {
  it('should initialize hand stats to zero', () => {
    const stats = createPlayerSessionStats()
    expect(stats.handsPlayed).toBe(0)
    expect(stats.handsWon).toBe(0)
    expect(stats.netChipResult).toBe(0)
  })

  it('should initialize empty games played array', () => {
    const stats = createPlayerSessionStats()
    expect(stats.gamesPlayed).toEqual([])
  })

  it('should initialize all game stats with zero values', () => {
    const stats = createPlayerSessionStats()
    expect(stats.gameStats.holdem).toEqual({
      handsPlayed: 0,
      handsWon: 0,
      netResult: 0,
      winRate: 0,
    })
    expect(stats.gameStats.five_card_draw).toEqual({
      handsPlayed: 0,
      handsWon: 0,
      netResult: 0,
      winRate: 0,
    })
    expect(stats.gameStats.blackjack_classic).toEqual({
      handsPlayed: 0,
      handsWon: 0,
      netResult: 0,
      winRate: 0,
    })
    expect(stats.gameStats.blackjack_competitive).toEqual({
      handsPlayed: 0,
      handsWon: 0,
      netResult: 0,
      winRate: 0,
    })
    expect(stats.gameStats.roulette).toEqual({
      handsPlayed: 0,
      handsWon: 0,
      netResult: 0,
      winRate: 0,
    })
    expect(stats.gameStats.three_card_poker).toEqual({
      handsPlayed: 0,
      handsWon: 0,
      netResult: 0,
      winRate: 0,
    })
    expect(stats.gameStats.craps).toEqual({
      handsPlayed: 0,
      handsWon: 0,
      netResult: 0,
      winRate: 0,
    })
  })

  it('should initialize highlights to zero', () => {
    const stats = createPlayerSessionStats()
    expect(stats.biggestWin).toBe(0)
    expect(stats.biggestLoss).toBe(0)
  })

  it('should create independent instances', () => {
    const stats1 = createPlayerSessionStats()
    const stats2 = createPlayerSessionStats()
    expect(stats1).not.toBe(stats2)
    expect(stats1.gameStats).not.toBe(stats2.gameStats)
  })

  it('should not have side effects between instances', () => {
    const stats1 = createPlayerSessionStats()
    const stats2 = createPlayerSessionStats()
    stats1.handsPlayed = 5
    stats1.gameStats.holdem.handsWon = 3
    expect(stats2.handsPlayed).toBe(0)
    expect(stats2.gameStats.holdem.handsWon).toBe(0)
  })
})

describe('Session stats structure validation', () => {
  it('should have complete game stats for all seven games', () => {
    const playerStats = createPlayerSessionStats()
    const gameKeys = Object.keys(playerStats.gameStats)
    expect(gameKeys.length).toBe(7)
    expect(gameKeys).toContain('holdem')
    expect(gameKeys).toContain('five_card_draw')
    expect(gameKeys).toContain('blackjack_classic')
    expect(gameKeys).toContain('blackjack_competitive')
    expect(gameKeys).toContain('roulette')
    expect(gameKeys).toContain('three_card_poker')
    expect(gameKeys).toContain('craps')
  })

  it('session stats should have proper type for player stats record', () => {
    const stats = createSessionStats(Date.now())
    expect(typeof stats.playerStats).toBe('object')
    expect(Array.isArray(stats.playerStats)).toBe(false)
  })
})

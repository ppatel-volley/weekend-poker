import { describe, it, expect } from 'vitest'
import type {
  CasinoGameState,
  GameNightAchievement,
  GameNightPlayerTotal,
  GameNightGameResult,
} from '@weekend-casino/shared'
import { GN_RANK_POINTS, GN_MAX_MARGIN_BONUS, GN_ACHIEVEMENT_BONUSES } from '@weekend-casino/shared'
import {
  rankPlayersByChipResult,
  calculateMarginBonus,
  calculateGameScores,
  determineChampion,
} from '../game-night-engine/scoring.js'
import {
  createInitialCasinoState,
  gnInitGameNight,
  gnSetLeaderboardReady,
  gnSetChampionReady,
  gnIncrementRoundsPlayed,
  gnUpdateScores,
  gnAddGameResult,
  gnAdvanceGame,
  gnSetChampion,
  gnClearGameNight,
  gnRecordAchievement,
  gnConfirmSetup,
} from '../ruleset/casino-state.js'

// ── Helpers ──────────────────────────────────────────────────────

function makePlayer(id: string, name: string, isHost = false): CasinoGameState['players'][number] {
  return {
    id,
    name,
    avatarId: 'default',
    seatIndex: 0,
    isHost,
    isConnected: true,
    isReady: true,
    currentGameStatus: 'active',
    sittingOutHandCount: 0,
    stack: 10000,
    bet: 0,
    status: 'active',
    lastAction: null,
    isBot: false,
  }
}

function makeState(overrides: Partial<CasinoGameState> = {}): CasinoGameState {
  return createInitialCasinoState({
    players: [
      makePlayer('p1', 'Alice', true),
      makePlayer('p2', 'Bob'),
    ],
    wallet: { p1: 10000, p2: 10000 },
    ...overrides,
  })
}

function makeStateWithGN(overrides: Partial<CasinoGameState> = {}): CasinoGameState {
  const base = makeState(overrides)
  return gnInitGameNight(
    base,
    ['holdem', 'roulette', 'blackjack_classic'],
    5,
    'classic',
    1700000000000,
  )
}

function makePlayers(count: number): { id: string; name: string }[] {
  const names = ['Alice', 'Bob', 'Charlie', 'Diana']
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: names[i] ?? `Player${i + 1}`,
  }))
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Scoring Engine Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('rankPlayersByChipResult', () => {
  it('should rank 2 players by chip result', () => {
    const before = { p1: 10000, p2: 10000 }
    const after = { p1: 12000, p2: 8000 }
    const players = makePlayers(2)

    const result = rankPlayersByChipResult(before, after, players)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ playerId: 'p1', chipResult: 2000, rank: 1 })
    expect(result[1]).toMatchObject({ playerId: 'p2', chipResult: -2000, rank: 2 })
  })

  it('should rank 3 players correctly', () => {
    const before = { p1: 10000, p2: 10000, p3: 10000 }
    const after = { p1: 15000, p2: 8000, p3: 12000 }
    const players = makePlayers(3)

    const result = rankPlayersByChipResult(before, after, players)

    expect(result[0]).toMatchObject({ playerId: 'p1', chipResult: 5000, rank: 1 })
    expect(result[1]).toMatchObject({ playerId: 'p3', chipResult: 2000, rank: 2 })
    expect(result[2]).toMatchObject({ playerId: 'p2', chipResult: -2000, rank: 3 })
  })

  it('should rank 4 players correctly', () => {
    const before = { p1: 10000, p2: 10000, p3: 10000, p4: 10000 }
    const after = { p1: 20000, p2: 5000, p3: 15000, p4: 0 }
    const players = makePlayers(4)

    const result = rankPlayersByChipResult(before, after, players)

    expect(result[0]).toMatchObject({ playerId: 'p1', chipResult: 10000, rank: 1 })
    expect(result[1]).toMatchObject({ playerId: 'p3', chipResult: 5000, rank: 2 })
    expect(result[2]).toMatchObject({ playerId: 'p2', chipResult: -5000, rank: 3 })
    expect(result[3]).toMatchObject({ playerId: 'p4', chipResult: -10000, rank: 4 })
  })

  it('should handle tied chip results (same rank)', () => {
    const before = { p1: 10000, p2: 10000, p3: 10000 }
    const after = { p1: 12000, p2: 12000, p3: 6000 }
    const players = makePlayers(3)

    const result = rankPlayersByChipResult(before, after, players)

    expect(result[0]).toMatchObject({ chipResult: 2000, rank: 1 })
    expect(result[1]).toMatchObject({ chipResult: 2000, rank: 1 })
    expect(result[2]).toMatchObject({ playerId: 'p3', chipResult: -4000, rank: 3 })
  })

  it('should handle all players with zero chip result', () => {
    const before = { p1: 10000, p2: 10000 }
    const after = { p1: 10000, p2: 10000 }
    const players = makePlayers(2)

    const result = rankPlayersByChipResult(before, after, players)

    expect(result[0]).toMatchObject({ chipResult: 0, rank: 1 })
    expect(result[1]).toMatchObject({ chipResult: 0, rank: 1 })
  })

  it('should handle missing wallet entries as 0', () => {
    const before = { p1: 10000 }
    const after = { p2: 5000 }
    const players = makePlayers(2)

    const result = rankPlayersByChipResult(before, after, players)

    expect(result[0]).toMatchObject({ playerId: 'p2', chipResult: 5000, rank: 1 })
    expect(result[1]).toMatchObject({ playerId: 'p1', chipResult: -10000, rank: 2 })
  })
})

describe('calculateMarginBonus', () => {
  it('should calculate normal margin bonus', () => {
    const ranked = [
      { chipResult: 5000, rank: 1 },
      { chipResult: 2000, rank: 2 },
    ]
    // margin = (5000 - 2000) / 5000 = 0.6 => floor(0.6 * 30) = 18
    expect(calculateMarginBonus(ranked)).toBe(18)
  })

  it('should cap margin bonus at GN_MAX_MARGIN_BONUS (30)', () => {
    const ranked = [
      { chipResult: 10000, rank: 1 },
      { chipResult: 0, rank: 2 },
    ]
    // margin = (10000 - 0) / 10000 = 1.0 => floor(1.0 * 30) = 30
    expect(calculateMarginBonus(ranked)).toBe(GN_MAX_MARGIN_BONUS)
  })

  it('should return 0 when winner has 0 chips', () => {
    const ranked = [
      { chipResult: 0, rank: 1 },
      { chipResult: -5000, rank: 2 },
    ]
    expect(calculateMarginBonus(ranked)).toBe(0)
  })

  it('should return 0 when winner has negative chips', () => {
    const ranked = [
      { chipResult: -100, rank: 1 },
      { chipResult: -5000, rank: 2 },
    ]
    expect(calculateMarginBonus(ranked)).toBe(0)
  })

  it('should return 0 for a single player (no second place)', () => {
    const ranked = [{ chipResult: 5000, rank: 1 }]
    expect(calculateMarginBonus(ranked)).toBe(0)
  })

  it('should return 0 for empty input', () => {
    expect(calculateMarginBonus([])).toBe(0)
  })

  it('should return 0 when 1st and 2nd are tied (both rank 1)', () => {
    const ranked = [
      { chipResult: 5000, rank: 1 },
      { chipResult: 5000, rank: 1 },
    ]
    // No rank 2 exists — no margin
    expect(calculateMarginBonus(ranked)).toBe(0)
  })

  it('should calculate small margin correctly', () => {
    const ranked = [
      { chipResult: 1000, rank: 1 },
      { chipResult: 900, rank: 2 },
    ]
    // margin = (1000 - 900) / 1000 = 0.1 => floor(0.1 * 30) = 3
    expect(calculateMarginBonus(ranked)).toBe(3)
  })
})

describe('calculateGameScores', () => {
  it('should calculate scores for all rank positions (4 players)', () => {
    const ranked = [
      { playerId: 'p1', playerName: 'Alice', chipResult: 5000, rank: 1 },
      { playerId: 'p2', playerName: 'Bob', chipResult: 2000, rank: 2 },
      { playerId: 'p3', playerName: 'Charlie', chipResult: -1000, rank: 3 },
      { playerId: 'p4', playerName: 'Diana', chipResult: -6000, rank: 4 },
    ]
    const achievements: GameNightAchievement[] = []

    const scores = calculateGameScores(ranked, achievements, 0)

    expect(scores).toHaveLength(4)

    // 1st: 100 rank + 18 margin (see margin calc above) + 0 ach
    const marginBonus = Math.floor(((5000 - 2000) / 5000) * GN_MAX_MARGIN_BONUS)
    expect(scores[0]).toMatchObject({
      playerId: 'p1',
      rank: 1,
      rankPoints: GN_RANK_POINTS[1]!,
      marginBonus,
      achievementBonus: 0,
      totalGameScore: GN_RANK_POINTS[1]! + marginBonus,
    })

    // 2nd: 70 rank + 0 margin + 0 ach
    expect(scores[1]).toMatchObject({
      playerId: 'p2',
      rank: 2,
      rankPoints: GN_RANK_POINTS[2]!,
      marginBonus: 0,
      totalGameScore: GN_RANK_POINTS[2]!,
    })

    // 3rd: 45 rank
    expect(scores[2]).toMatchObject({
      playerId: 'p3',
      rankPoints: GN_RANK_POINTS[3]!,
      marginBonus: 0,
      totalGameScore: GN_RANK_POINTS[3]!,
    })

    // 4th: 25 rank
    expect(scores[3]).toMatchObject({
      playerId: 'p4',
      rankPoints: GN_RANK_POINTS[4]!,
      marginBonus: 0,
      totalGameScore: GN_RANK_POINTS[4]!,
    })
  })

  it('should include achievement bonuses', () => {
    const ranked = [
      { playerId: 'p1', playerName: 'Alice', chipResult: 5000, rank: 1 },
      { playerId: 'p2', playerName: 'Bob', chipResult: 2000, rank: 2 },
    ]
    const achievements: GameNightAchievement[] = [
      { playerId: 'p1', type: 'ROYAL_FLUSH', gameIndex: 0, timestamp: Date.now() },
      { playerId: 'p2', type: 'NATURAL_BLACKJACK', gameIndex: 0, timestamp: Date.now() },
    ]

    const scores = calculateGameScores(ranked, achievements, 0)

    expect(scores[0]!.achievementBonus).toBe(GN_ACHIEVEMENT_BONUSES.ROYAL_FLUSH)
    expect(scores[0]!.totalGameScore).toBe(
      scores[0]!.rankPoints + scores[0]!.marginBonus + GN_ACHIEVEMENT_BONUSES.ROYAL_FLUSH,
    )
    expect(scores[1]!.achievementBonus).toBe(GN_ACHIEVEMENT_BONUSES.NATURAL_BLACKJACK)
  })

  it('should only count achievements for the correct game index', () => {
    const ranked = [
      { playerId: 'p1', playerName: 'Alice', chipResult: 3000, rank: 1 },
    ]
    const achievements: GameNightAchievement[] = [
      { playerId: 'p1', type: 'ROYAL_FLUSH', gameIndex: 0, timestamp: Date.now() },
      { playerId: 'p1', type: 'FOUR_OF_A_KIND', gameIndex: 1, timestamp: Date.now() },
    ]

    // Only game 0 achievements should count
    const scores0 = calculateGameScores(ranked, achievements, 0)
    expect(scores0[0]!.achievementBonus).toBe(GN_ACHIEVEMENT_BONUSES.ROYAL_FLUSH)

    // Only game 1 achievements should count
    const scores1 = calculateGameScores(ranked, achievements, 1)
    expect(scores1[0]!.achievementBonus).toBe(GN_ACHIEVEMENT_BONUSES.FOUR_OF_A_KIND)
  })

  it('should handle multiple achievements for the same player in one game', () => {
    const ranked = [
      { playerId: 'p1', playerName: 'Alice', chipResult: 5000, rank: 1 },
    ]
    const achievements: GameNightAchievement[] = [
      { playerId: 'p1', type: 'ROYAL_FLUSH', gameIndex: 0, timestamp: Date.now() },
      { playerId: 'p1', type: 'FOUR_OF_A_KIND', gameIndex: 0, timestamp: Date.now() },
    ]

    const scores = calculateGameScores(ranked, achievements, 0)
    expect(scores[0]!.achievementBonus).toBe(
      GN_ACHIEVEMENT_BONUSES.ROYAL_FLUSH + GN_ACHIEVEMENT_BONUSES.FOUR_OF_A_KIND,
    )
  })

  it('should give 0 rank points for ranks beyond 4th', () => {
    const ranked = [
      { playerId: 'p5', playerName: 'Eve', chipResult: -9000, rank: 5 },
    ]

    const scores = calculateGameScores(ranked, [], 0)
    expect(scores[0]!.rankPoints).toBe(0)
    expect(scores[0]!.totalGameScore).toBe(0)
  })
})

describe('determineChampion', () => {
  it('should return the player with highest totalScore', () => {
    const scores: Record<string, GameNightPlayerTotal> = {
      p1: { playerId: 'p1', playerName: 'Alice', totalScore: 250, gamesPlayed: 3, rankPoints: 200, marginBonus: 30, achievementBonus: 20, bestFinish: 1 },
      p2: { playerId: 'p2', playerName: 'Bob', totalScore: 180, gamesPlayed: 3, rankPoints: 150, marginBonus: 10, achievementBonus: 20, bestFinish: 2 },
    }

    expect(determineChampion(scores)).toBe('p1')
  })

  it('should break ties by best finish (lower rank = better)', () => {
    const scores: Record<string, GameNightPlayerTotal> = {
      p1: { playerId: 'p1', playerName: 'Alice', totalScore: 200, gamesPlayed: 3, rankPoints: 200, marginBonus: 0, achievementBonus: 0, bestFinish: 2 },
      p2: { playerId: 'p2', playerName: 'Bob', totalScore: 200, gamesPlayed: 3, rankPoints: 200, marginBonus: 0, achievementBonus: 0, bestFinish: 1 },
    }

    expect(determineChampion(scores)).toBe('p2')
  })

  it('should break ties alphabetically when all else is equal', () => {
    const scores: Record<string, GameNightPlayerTotal> = {
      p2: { playerId: 'p2', playerName: 'Bob', totalScore: 200, gamesPlayed: 3, rankPoints: 200, marginBonus: 0, achievementBonus: 0, bestFinish: 1 },
      p1: { playerId: 'p1', playerName: 'Alice', totalScore: 200, gamesPlayed: 3, rankPoints: 200, marginBonus: 0, achievementBonus: 0, bestFinish: 1 },
    }

    expect(determineChampion(scores)).toBe('p1')
  })

  it('should return null for empty scores', () => {
    expect(determineChampion({})).toBeNull()
  })

  it('should handle a single player', () => {
    const scores: Record<string, GameNightPlayerTotal> = {
      p1: { playerId: 'p1', playerName: 'Alice', totalScore: 100, gamesPlayed: 1, rankPoints: 100, marginBonus: 0, achievementBonus: 0, bestFinish: 1 },
    }

    expect(determineChampion(scores)).toBe('p1')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Reducer Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('gnInitGameNight', () => {
  it('should initialise gameNight with all fields', () => {
    const state = makeState()
    const result = gnInitGameNight(state, ['holdem', 'roulette', 'blackjack_classic'], 5, 'neon', 1700000000000)

    expect(result.gameNight).toBeDefined()
    const gn = result.gameNight!
    expect(gn.active).toBe(true)
    expect(gn.roundLimit).toBe(5)
    expect(gn.roundsPlayed).toBe(0)
    expect(gn.scores).toEqual({})
    expect(gn.gameLineup).toEqual(['holdem', 'roulette', 'blackjack_classic'])
    expect(gn.currentGameIndex).toBe(0)
    expect(gn.roundsPerGame).toBe(5)
    expect(gn.gameResults).toEqual([])
    expect(gn.theme).toBe('neon')
    expect(gn.championId).toBeNull()
    expect(gn.startedAt).toBe(1700000000000)
    expect(gn.leaderboardReady).toBe(false)
    expect(gn.championReady).toBe(false)
    expect(gn.achievements).toEqual([])
    expect(gn.setupConfirmed).toBe(false)
  })

  it('should initialise playerScores for all current players', () => {
    const state = makeState()
    const result = gnInitGameNight(state, ['holdem'], 3, 'classic', 1700000000000)
    const gn = result.gameNight!

    expect(Object.keys(gn.playerScores)).toEqual(['p1', 'p2'])
    expect(gn.playerScores.p1).toMatchObject({
      playerId: 'p1',
      playerName: 'Alice',
      totalScore: 0,
      gamesPlayed: 0,
      bestFinish: 0,
    })
    expect(gn.playerScores.p2).toMatchObject({
      playerId: 'p2',
      playerName: 'Bob',
      totalScore: 0,
    })
  })

  it('should not mutate original state', () => {
    const state = makeState()
    const original = { ...state }
    gnInitGameNight(state, ['holdem'], 3, 'classic', 1700000000000)
    expect(state.gameNight).toEqual(original.gameNight)
  })
})

describe('gnSetLeaderboardReady', () => {
  it('should set leaderboardReady to true', () => {
    const state = makeStateWithGN()
    expect(state.gameNight!.leaderboardReady).toBe(false)

    const result = gnSetLeaderboardReady(state)
    expect(result.gameNight!.leaderboardReady).toBe(true)
  })

  it('should no-op when gameNight is undefined', () => {
    const state = makeState()
    const result = gnSetLeaderboardReady(state)
    expect(result).toBe(state)
  })
})

describe('gnSetChampionReady', () => {
  it('should set championReady to true', () => {
    const state = makeStateWithGN()
    expect(state.gameNight!.championReady).toBe(false)

    const result = gnSetChampionReady(state)
    expect(result.gameNight!.championReady).toBe(true)
  })

  it('should no-op when gameNight is undefined', () => {
    const state = makeState()
    const result = gnSetChampionReady(state)
    expect(result).toBe(state)
  })
})

describe('gnIncrementRoundsPlayed', () => {
  it('should increment roundsPlayed by 1', () => {
    const state = makeStateWithGN()
    expect(state.gameNight!.roundsPlayed).toBe(0)

    const result = gnIncrementRoundsPlayed(state)
    expect(result.gameNight!.roundsPlayed).toBe(1)

    const result2 = gnIncrementRoundsPlayed(result)
    expect(result2.gameNight!.roundsPlayed).toBe(2)
  })

  it('should no-op when gameNight is undefined', () => {
    const state = makeState()
    const result = gnIncrementRoundsPlayed(state)
    expect(result).toBe(state)
  })
})

describe('gnUpdateScores', () => {
  it('should update playerScores and flat scores record', () => {
    const state = makeStateWithGN()
    const newScores: Record<string, GameNightPlayerTotal> = {
      p1: { playerId: 'p1', playerName: 'Alice', totalScore: 118, gamesPlayed: 1, rankPoints: 100, marginBonus: 18, achievementBonus: 0, bestFinish: 1 },
      p2: { playerId: 'p2', playerName: 'Bob', totalScore: 70, gamesPlayed: 1, rankPoints: 70, marginBonus: 0, achievementBonus: 0, bestFinish: 2 },
    }

    const result = gnUpdateScores(state, newScores)

    expect(result.gameNight!.playerScores).toEqual(newScores)
    expect(result.gameNight!.scores).toEqual({ p1: 118, p2: 70 })
  })

  it('should no-op when gameNight is undefined', () => {
    const state = makeState()
    const result = gnUpdateScores(state, {})
    expect(result).toBe(state)
  })
})

describe('gnAddGameResult', () => {
  it('should append a game result', () => {
    const state = makeStateWithGN()
    const gameResult: GameNightGameResult = {
      game: 'holdem',
      gameIndex: 0,
      rankings: [],
      roundsPlayed: 5,
      completedAt: Date.now(),
    }

    const result = gnAddGameResult(state, gameResult)
    expect(result.gameNight!.gameResults).toHaveLength(1)
    expect(result.gameNight!.gameResults[0]).toEqual(gameResult)

    // Add another
    const gameResult2: GameNightGameResult = {
      game: 'roulette',
      gameIndex: 1,
      rankings: [],
      roundsPlayed: 5,
      completedAt: Date.now(),
    }
    const result2 = gnAddGameResult(result, gameResult2)
    expect(result2.gameNight!.gameResults).toHaveLength(2)
  })

  it('should no-op when gameNight is undefined', () => {
    const state = makeState()
    const result = gnAddGameResult(state, {} as GameNightGameResult)
    expect(result).toBe(state)
  })
})

describe('gnAdvanceGame', () => {
  it('should increment currentGameIndex, reset roundsPlayed, clear leaderboardReady', () => {
    let state = makeStateWithGN()
    // Simulate some rounds and leaderboard ready
    state = gnIncrementRoundsPlayed(state)
    state = gnIncrementRoundsPlayed(state)
    state = gnSetLeaderboardReady(state)

    expect(state.gameNight!.currentGameIndex).toBe(0)
    expect(state.gameNight!.roundsPlayed).toBe(2)
    expect(state.gameNight!.leaderboardReady).toBe(true)

    const result = gnAdvanceGame(state)

    expect(result.gameNight!.currentGameIndex).toBe(1)
    expect(result.gameNight!.roundsPlayed).toBe(0)
    expect(result.gameNight!.leaderboardReady).toBe(false)
  })

  it('should no-op when gameNight is undefined', () => {
    const state = makeState()
    const result = gnAdvanceGame(state)
    expect(result).toBe(state)
  })
})

describe('gnSetChampion', () => {
  it('should set the championId', () => {
    const state = makeStateWithGN()
    const result = gnSetChampion(state, 'p2')
    expect(result.gameNight!.championId).toBe('p2')
  })

  it('should no-op when gameNight is undefined', () => {
    const state = makeState()
    const result = gnSetChampion(state, 'p1')
    expect(result).toBe(state)
  })
})

describe('gnClearGameNight', () => {
  it('should set gameNight to undefined', () => {
    const state = makeStateWithGN()
    expect(state.gameNight).toBeDefined()

    const result = gnClearGameNight(state)
    expect(result.gameNight).toBeUndefined()
  })

  it('should work even when gameNight is already undefined', () => {
    const state = makeState()
    const result = gnClearGameNight(state)
    expect(result.gameNight).toBeUndefined()
  })
})

describe('gnRecordAchievement', () => {
  it('should append an achievement', () => {
    const state = makeStateWithGN()
    const achievement: GameNightAchievement = {
      playerId: 'p1',
      type: 'ROYAL_FLUSH',
      gameIndex: 0,
      timestamp: Date.now(),
    }

    const result = gnRecordAchievement(state, achievement)
    expect(result.gameNight!.achievements).toHaveLength(1)
    expect(result.gameNight!.achievements[0]).toEqual(achievement)
  })

  it('should append multiple achievements', () => {
    let state = makeStateWithGN()
    state = gnRecordAchievement(state, {
      playerId: 'p1', type: 'ROYAL_FLUSH', gameIndex: 0, timestamp: Date.now(),
    })
    state = gnRecordAchievement(state, {
      playerId: 'p2', type: 'NATURAL_BLACKJACK', gameIndex: 1, timestamp: Date.now(),
    })

    expect(state.gameNight!.achievements).toHaveLength(2)
  })

  it('should no-op when gameNight is undefined', () => {
    const state = makeState()
    const result = gnRecordAchievement(state, {} as GameNightAchievement)
    expect(result).toBe(state)
  })
})

describe('gnConfirmSetup', () => {
  it('should set setupConfirmed to true', () => {
    const state = makeStateWithGN()
    expect(state.gameNight!.setupConfirmed).toBe(false)

    const result = gnConfirmSetup(state)
    expect(result.gameNight!.setupConfirmed).toBe(true)
  })

  it('should no-op when gameNight is undefined', () => {
    const state = makeState()
    const result = gnConfirmSetup(state)
    expect(result).toBe(state)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Integration: Scoring + Reducers together
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('scoring + reducers integration', () => {
  it('should flow: rank -> score -> updateScores -> addGameResult -> advanceGame', () => {
    const state = makeStateWithGN()
    const walletBefore = { p1: 10000, p2: 10000 }
    const walletAfter = { p1: 14000, p2: 6000 }
    const players = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }]

    // 1. Rank
    const ranked = rankPlayersByChipResult(walletBefore, walletAfter, players)
    expect(ranked[0]!.playerId).toBe('p1')
    expect(ranked[0]!.rank).toBe(1)

    // 2. Score
    const gameScores = calculateGameScores(ranked, [], 0)
    expect(gameScores[0]!.totalGameScore).toBeGreaterThan(0)

    // 3. Build updated playerScores
    const newPlayerScores: Record<string, GameNightPlayerTotal> = {}
    for (const gs of gameScores) {
      newPlayerScores[gs.playerId] = {
        playerId: gs.playerId,
        playerName: gs.playerName,
        totalScore: gs.totalGameScore,
        gamesPlayed: 1,
        rankPoints: gs.rankPoints,
        marginBonus: gs.marginBonus,
        achievementBonus: gs.achievementBonus,
        bestFinish: gs.rank,
      }
    }

    // 4. Update state
    let updated = gnUpdateScores(state, newPlayerScores)
    updated = gnAddGameResult(updated, {
      game: 'holdem',
      gameIndex: 0,
      rankings: gameScores,
      roundsPlayed: 5,
      completedAt: Date.now(),
    })
    updated = gnAdvanceGame(updated)

    expect(updated.gameNight!.currentGameIndex).toBe(1)
    expect(updated.gameNight!.gameResults).toHaveLength(1)
    expect(updated.gameNight!.scores.p1).toBeGreaterThan(0)

    // 5. Determine champion
    const champion = determineChampion(updated.gameNight!.playerScores)
    expect(champion).toBe('p1')
  })
})

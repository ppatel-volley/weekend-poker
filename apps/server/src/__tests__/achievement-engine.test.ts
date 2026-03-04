import { describe, it, expect } from 'vitest'
import { ACHIEVEMENT_DEFINITIONS, getAchievementsByCategory, getAchievementById } from '../achievement-engine/definitions.js'
import { detectGameEventAchievements, detectStatBasedAchievements } from '../achievement-engine/detector.js'
import type { CasinoGameState, PersistentPlayerStats } from '@weekend-casino/shared'
import { createEmptyPersistentStats } from '@weekend-casino/shared'

const mockPlayer = (id: string, isBot = false) => ({
  id,
  name: `Player ${id}`,
  avatarId: 'default',
  seatIndex: 0,
  isHost: false,
  isReady: false,
  currentGameStatus: 'active' as const,
  stack: 10000,
  bet: 0,
  status: 'active' as const,
  lastAction: null,
  isBot,
  isConnected: true,
  sittingOutHandCount: 0,
})

describe('Achievement Definitions', () => {
  it('has 26 definitions', () => {
    expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(26)
  })

  it('has 7 getting_started achievements', () => {
    expect(getAchievementsByCategory('getting_started')).toHaveLength(7)
  })

  it('has 10 mastery achievements', () => {
    expect(getAchievementsByCategory('mastery')).toHaveLength(10)
  })

  it('has 6 milestone achievements', () => {
    expect(getAchievementsByCategory('milestone')).toHaveLength(6)
  })

  it('has 3 rare achievements', () => {
    expect(getAchievementsByCategory('rare')).toHaveLength(3)
  })

  it('all definitions have required fields', () => {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      expect(def.id).toBeTruthy()
      expect(def.title).toBeTruthy()
      expect(def.description).toBeTruthy()
      expect(def.category).toBeTruthy()
      expect(def.icon).toBeTruthy()
    }
  })

  it('all IDs are unique', () => {
    const ids = ACHIEVEMENT_DEFINITIONS.map(d => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('getAchievementById finds existing achievement', () => {
    const def = getAchievementById('royal_flush')
    expect(def).toBeDefined()
    expect(def!.title).toBe('Royal Flush')
  })

  it('getAchievementById returns undefined for unknown ID', () => {
    expect(getAchievementById('nonexistent')).toBeUndefined()
  })
})

describe('detectGameEventAchievements', () => {
  it('detects first_hand_any for all human players', () => {
    const state = {
      selectedGame: 'holdem',
      players: [mockPlayer('p1'), mockPlayer('p2'), mockPlayer('bot1', true)],
    } as unknown as CasinoGameState

    const achievements = detectGameEventAchievements(state)
    const firstHandAny = achievements.filter(a => a.achievementId === 'first_hand_any')
    expect(firstHandAny).toHaveLength(2) // p1, p2 — NOT bot1
    expect(firstHandAny.map(a => a.playerId).sort()).toEqual(['p1', 'p2'])
  })

  it('detects game-specific first hand for holdem', () => {
    const state = {
      selectedGame: 'holdem',
      players: [mockPlayer('p1')],
    } as unknown as CasinoGameState

    const achievements = detectGameEventAchievements(state)
    expect(achievements.some(a => a.achievementId === 'first_hand_holdem')).toBe(true)
  })

  it('detects game-specific first hand for craps', () => {
    const state = {
      selectedGame: 'craps',
      players: [mockPlayer('p1')],
    } as unknown as CasinoGameState

    const achievements = detectGameEventAchievements(state)
    expect(achievements.some(a => a.achievementId === 'first_hand_craps')).toBe(true)
  })

  it('detects natural blackjack (rare)', () => {
    const state = {
      selectedGame: 'blackjack_classic',
      players: [mockPlayer('p1')],
      blackjack: {
        playerStates: [{
          playerId: 'p1',
          hands: [{ isBlackjack: true, cards: [], stood: false, busted: false, doubled: false, bet: 100, value: 21, isSoft: true }],
          activeHandIndex: 0,
          insuranceBet: 0,
          insuranceResolved: false,
          surrendered: false,
          totalPayout: 0,
          roundResult: 0,
        }],
      },
    } as unknown as CasinoGameState

    const achievements = detectGameEventAchievements(state)
    expect(achievements.some(a => a.achievementId === 'natural_blackjack')).toBe(true)
  })

  it('detects straight-up roulette win (rare)', () => {
    const state = {
      selectedGame: 'roulette',
      players: [mockPlayer('p1')],
      roulette: {
        winningNumber: 17,
        bets: [{ playerId: 'p1', type: 'straight_up', status: 'won', numbers: [17], amount: 100, payout: 3600, id: 'b1' }],
      },
    } as unknown as CasinoGameState

    const achievements = detectGameEventAchievements(state)
    expect(achievements.some(a => a.achievementId === 'straight_up_roulette')).toBe(true)
  })

  it('returns empty for null selectedGame', () => {
    const state = { selectedGame: null } as unknown as CasinoGameState
    expect(detectGameEventAchievements(state)).toEqual([])
  })
})

describe('detectStatBasedAchievements', () => {
  it('detects win_25_hands milestone', () => {
    const stats = { ...createEmptyPersistentStats(), totalHandsWon: 25 }
    const result = detectStatBasedAchievements('p1', stats, 1, new Set())
    expect(result.some(a => a.achievementId === 'win_25_hands')).toBe(true)
  })

  it('detects win_50_hands and win_100_hands', () => {
    const stats = { ...createEmptyPersistentStats(), totalHandsWon: 100 }
    const result = detectStatBasedAchievements('p1', stats, 1, new Set())
    expect(result.some(a => a.achievementId === 'win_50_hands')).toBe(true)
    expect(result.some(a => a.achievementId === 'win_100_hands')).toBe(true)
  })

  it('detects win_streak_5 from bestWinStreak', () => {
    const stats = { ...createEmptyPersistentStats(), bestWinStreak: 5 }
    const result = detectStatBasedAchievements('p1', stats, 1, new Set())
    expect(result.some(a => a.achievementId === 'win_streak_5')).toBe(true)
  })

  it('detects play_100_hands milestone', () => {
    const stats = { ...createEmptyPersistentStats(), totalHandsPlayed: 100 }
    const result = detectStatBasedAchievements('p1', stats, 1, new Set())
    expect(result.some(a => a.achievementId === 'play_100_hands')).toBe(true)
  })

  it('detects reach_level_10', () => {
    const stats = createEmptyPersistentStats()
    const result = detectStatBasedAchievements('p1', stats, 10, new Set())
    expect(result.some(a => a.achievementId === 'reach_level_10')).toBe(true)
  })

  it('skips already-earned achievements', () => {
    const stats = { ...createEmptyPersistentStats(), totalHandsWon: 100 }
    const earned = new Set(['win_25_hands', 'win_50_hands', 'win_100_hands'])
    const result = detectStatBasedAchievements('p1', stats, 1, earned)
    expect(result.some(a => a.achievementId === 'win_25_hands')).toBe(false)
    expect(result.some(a => a.achievementId === 'win_50_hands')).toBe(false)
    expect(result.some(a => a.achievementId === 'win_100_hands')).toBe(false)
  })

  it('detects world_tourist when all games played', () => {
    const stats: PersistentPlayerStats = {
      ...createEmptyPersistentStats(),
      byGameType: {
        holdem: { gamesPlayed: 1, handsWon: 0, handsPlayed: 1, totalChipsWon: 0, totalChipsLost: 0, bestStreak: 0, currentStreak: 0 },
        five_card_draw: { gamesPlayed: 1, handsWon: 0, handsPlayed: 1, totalChipsWon: 0, totalChipsLost: 0, bestStreak: 0, currentStreak: 0 },
        blackjack_classic: { gamesPlayed: 1, handsWon: 0, handsPlayed: 1, totalChipsWon: 0, totalChipsLost: 0, bestStreak: 0, currentStreak: 0 },
        blackjack_competitive: { gamesPlayed: 1, handsWon: 0, handsPlayed: 1, totalChipsWon: 0, totalChipsLost: 0, bestStreak: 0, currentStreak: 0 },
        three_card_poker: { gamesPlayed: 1, handsWon: 0, handsPlayed: 1, totalChipsWon: 0, totalChipsLost: 0, bestStreak: 0, currentStreak: 0 },
        roulette: { gamesPlayed: 1, handsWon: 0, handsPlayed: 1, totalChipsWon: 0, totalChipsLost: 0, bestStreak: 0, currentStreak: 0 },
        craps: { gamesPlayed: 1, handsWon: 0, handsPlayed: 1, totalChipsWon: 0, totalChipsLost: 0, bestStreak: 0, currentStreak: 0 },
      },
    }
    const result = detectStatBasedAchievements('p1', stats, 1, new Set())
    expect(result.some(a => a.achievementId === 'world_tourist')).toBe(true)
  })
})

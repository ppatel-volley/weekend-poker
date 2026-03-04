/**
 * Persistent achievement detector.
 *
 * Broader than Game Night detection — checks both in-game events (rare hands,
 * natural BJs) AND cumulative stats (win counts, streaks, milestones).
 *
 * The Game Night detector (game-night-engine/achievements.ts) handles
 * session-scoped achievements for scoring bonuses. This module handles
 * persistent cross-session achievements that unlock cosmetics.
 */

import type { CasinoGameState, PersistentPlayerStats } from '@weekend-casino/shared'

/** A detected achievement candidate (not yet persisted). */
export interface DetectedPersistentAchievement {
  playerId: string
  achievementId: string
  game: string
}

/**
 * Detect persistent achievements from the current game state.
 * Called after each hand completes. Returns achievements to grant.
 *
 * NOTE: This only checks in-game events (rare hands, first plays).
 * Cumulative stat-based achievements (win counts, streaks) are checked
 * separately via detectStatBasedAchievements().
 */
export function detectGameEventAchievements(
  state: CasinoGameState,
): DetectedPersistentAchievement[] {
  const game = state.selectedGame
  if (!game) return []

  const achievements: DetectedPersistentAchievement[] = []

  // First hand of any game (for all human players)
  for (const player of state.players) {
    if (player.isBot) continue
    achievements.push({
      playerId: player.id,
      achievementId: 'first_hand_any',
      game,
    })
  }

  // Game-specific first-hand achievements
  const gameFirstHandMap: Record<string, string> = {
    holdem: 'first_hand_holdem',
    five_card_draw: 'first_hand_draw',
    blackjack_classic: 'first_hand_blackjack',
    blackjack_competitive: 'first_hand_blackjack',
    three_card_poker: 'first_hand_tcp',
    roulette: 'first_hand_roulette',
    craps: 'first_hand_craps',
  }

  const firstHandId = gameFirstHandMap[game]
  if (firstHandId) {
    for (const player of state.players) {
      if (player.isBot) continue
      achievements.push({
        playerId: player.id,
        achievementId: firstHandId,
        game,
      })
    }
  }

  // Rare achievements — game-specific
  switch (game) {
    case 'holdem':
    case 'five_card_draw':
      achievements.push(...detectPokerRareAchievements(state))
      break
    case 'blackjack_classic':
    case 'blackjack_competitive':
      achievements.push(...detectBlackjackRareAchievements(state))
      break
    case 'roulette':
      achievements.push(...detectRouletteRareAchievements(state))
      break
  }

  return achievements
}

/**
 * Detect stat-based achievements from persistent player stats.
 * Called after stats are updated. Returns new achievements to grant.
 */
export function detectStatBasedAchievements(
  playerId: string,
  stats: PersistentPlayerStats,
  currentLevel: number,
  earnedIds: Set<string>,
): DetectedPersistentAchievement[] {
  const achievements: DetectedPersistentAchievement[] = []
  const game = 'stats' // Generic game context for stat-based achievements

  // Win count milestones
  if (stats.totalHandsWon >= 25 && !earnedIds.has('win_25_hands')) {
    achievements.push({ playerId, achievementId: 'win_25_hands', game })
  }
  if (stats.totalHandsWon >= 50 && !earnedIds.has('win_50_hands')) {
    achievements.push({ playerId, achievementId: 'win_50_hands', game })
  }
  if (stats.totalHandsWon >= 100 && !earnedIds.has('win_100_hands')) {
    achievements.push({ playerId, achievementId: 'win_100_hands', game })
  }

  // Play count milestones
  if (stats.totalHandsPlayed >= 100 && !earnedIds.has('play_100_hands')) {
    achievements.push({ playerId, achievementId: 'play_100_hands', game })
  }

  // Win streak
  if (stats.bestWinStreak >= 5 && !earnedIds.has('win_streak_5')) {
    achievements.push({ playerId, achievementId: 'win_streak_5', game })
  }
  if (stats.bestWinStreak >= 10 && !earnedIds.has('win_streak_10')) {
    achievements.push({ playerId, achievementId: 'win_streak_10', game })
  }

  // Per-game mastery (20 wins)
  const gameMasteryMap: Record<string, string> = {
    holdem: 'holdem_master',
    blackjack_classic: 'blackjack_master',
    blackjack_competitive: 'blackjack_master',
    roulette: 'roulette_master',
    three_card_poker: 'tcp_master',
    craps: 'craps_master',
  }

  for (const [gameType, achievementId] of Object.entries(gameMasteryMap)) {
    if (earnedIds.has(achievementId)) continue
    const gameStats = stats.byGameType[gameType]
    if (gameStats && gameStats.handsWon >= 20) {
      achievements.push({ playerId, achievementId, game: gameType })
    }
  }

  // World tourist (played all 7 game types)
  if (!earnedIds.has('world_tourist')) {
    const gameTypes = ['holdem', 'five_card_draw', 'blackjack_classic', 'blackjack_competitive', 'three_card_poker', 'roulette', 'craps']
    const playedAll = gameTypes.every(g => (stats.byGameType[g]?.gamesPlayed ?? 0) > 0)
    if (playedAll) {
      achievements.push({ playerId, achievementId: 'world_tourist', game })
    }
  }

  // Challenge completions
  if (stats.challengesCompleted >= 5 && !earnedIds.has('complete_5_challenges')) {
    achievements.push({ playerId, achievementId: 'complete_5_challenges', game })
  }

  // Game Night champion
  if (stats.gameNightWins >= 1 && !earnedIds.has('game_night_champion')) {
    achievements.push({ playerId, achievementId: 'game_night_champion', game })
  }

  // Level milestone
  if (currentLevel >= 10 && !earnedIds.has('reach_level_10')) {
    achievements.push({ playerId, achievementId: 'reach_level_10', game })
  }

  return achievements
}

// ── Game-specific rare achievement detection ────────────────────

function detectPokerRareAchievements(state: CasinoGameState): DetectedPersistentAchievement[] {
  const achievements: DetectedPersistentAchievement[] = []
  const game = state.selectedGame ?? 'holdem'

  // 5-Card Draw: check hands for royal flush
  if (state.fiveCardDraw?.hands) {
    for (const [playerId, cards] of Object.entries(state.fiveCardDraw.hands)) {
      if (!cards || cards.length < 5) continue
      if (isRoyalFlush(cards)) {
        achievements.push({ playerId, achievementId: 'royal_flush', game })
      }
    }
  }

  return achievements
}

function detectBlackjackRareAchievements(state: CasinoGameState): DetectedPersistentAchievement[] {
  const achievements: DetectedPersistentAchievement[] = []
  const game = state.selectedGame ?? 'blackjack_classic'

  if (state.blackjack) {
    for (const ps of state.blackjack.playerStates) {
      for (const hand of ps.hands) {
        if (hand.isBlackjack) {
          achievements.push({ playerId: ps.playerId, achievementId: 'natural_blackjack', game })
          break
        }
      }
    }
  }

  if (state.blackjackCompetitive) {
    for (const ps of state.blackjackCompetitive.playerStates) {
      if (ps.hand.isBlackjack) {
        achievements.push({ playerId: ps.playerId, achievementId: 'natural_blackjack', game })
      }
    }
  }

  return achievements
}

function detectRouletteRareAchievements(state: CasinoGameState): DetectedPersistentAchievement[] {
  const achievements: DetectedPersistentAchievement[] = []

  if (state.roulette && state.roulette.winningNumber !== null) {
    for (const bet of state.roulette.bets) {
      if (bet.type === 'straight_up' && bet.status === 'won') {
        achievements.push({
          playerId: bet.playerId,
          achievementId: 'straight_up_roulette',
          game: 'roulette',
        })
      }
    }
  }

  return achievements
}

// ── Utility ─────────────────────────────────────────────────────

function isRoyalFlush(cards: { rank: string; suit: string }[]): boolean {
  if (cards.length < 5) return false
  const suits = new Set(cards.map(c => c.suit))
  if (suits.size !== 1) return false // not a flush
  const ranks = new Set(cards.map(c => c.rank))
  return ranks.has('10') && ranks.has('J') && ranks.has('Q') && ranks.has('K') && ranks.has('A')
}

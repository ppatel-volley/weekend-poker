/**
 * Game Night scoring engine — pure functions, no side effects.
 *
 * Per D-014: Rank-based scoring with margin bonus and achievement bonuses.
 */

import type {
  GameNightPlayerRanking,
  GameNightAchievement,
  GameNightPlayerTotal,
} from '@weekend-casino/shared'
import {
  GN_RANK_POINTS,
  GN_MAX_MARGIN_BONUS,
  GN_ACHIEVEMENT_BONUSES,
} from '@weekend-casino/shared'

/**
 * Rank players by chip result (gain/loss during game).
 * chipResult = current wallet balance - balance at game start.
 * Returns sorted array: highest chipResult first.
 * Ties share the same rank (dense ranking).
 */
export function rankPlayersByChipResult(
  walletBefore: Record<string, number>,
  walletAfter: Record<string, number>,
  players: { id: string; name: string }[],
): { playerId: string; playerName: string; chipResult: number; rank: number }[] {
  const results = players.map(p => ({
    playerId: p.id,
    playerName: p.name,
    chipResult: (walletAfter[p.id] ?? 0) - (walletBefore[p.id] ?? 0),
    rank: 0,
  }))

  // Sort descending by chipResult
  results.sort((a, b) => b.chipResult - a.chipResult)

  // Assign ranks (ties share the same rank, next rank skips)
  let currentRank = 1
  for (let i = 0; i < results.length; i++) {
    if (i > 0 && results[i]!.chipResult < results[i - 1]!.chipResult) {
      currentRank = i + 1
    }
    results[i]!.rank = currentRank
  }

  return results
}

/**
 * Calculate margin bonus: how much the winner led by.
 * Formula: Math.floor((chipResult1 - chipResult2) / chipResult1 * GN_MAX_MARGIN_BONUS)
 * Capped at GN_MAX_MARGIN_BONUS (30). Returns 0 for non-1st-place or if chipResult1 <= 0.
 * Only 1st place gets margin bonus.
 */
export function calculateMarginBonus(
  rankedPlayers: { chipResult: number; rank: number }[],
): number {
  if (rankedPlayers.length < 1) return 0

  const first = rankedPlayers.find(p => p.rank === 1)
  if (!first || first.chipResult <= 0) return 0

  // Single player or everyone tied for 1st — no margin
  const second = rankedPlayers.find(p => p.rank === 2)
  if (!second) return 0

  const margin = (first.chipResult - second.chipResult) / first.chipResult
  return Math.min(GN_MAX_MARGIN_BONUS, Math.floor(margin * GN_MAX_MARGIN_BONUS))
}

/**
 * Calculate full game scores for all players after one game.
 * Combines rank points + margin bonus (1st only) + achievement bonuses.
 */
export function calculateGameScores(
  rankedPlayers: { playerId: string; playerName: string; chipResult: number; rank: number }[],
  achievements: GameNightAchievement[],
  gameIndex: number,
): GameNightPlayerRanking[] {
  const marginBonus = calculateMarginBonus(rankedPlayers)

  // Filter achievements for this game
  const gameAchievements = achievements.filter(a => a.gameIndex === gameIndex)

  return rankedPlayers.map(p => {
    const rankPoints = GN_RANK_POINTS[p.rank] ?? 0
    const playerMarginBonus = p.rank === 1 ? marginBonus : 0

    // Sum achievement bonuses for this player in this game
    const achievementBonus = gameAchievements
      .filter(a => a.playerId === p.playerId)
      .reduce((sum, a) => sum + (GN_ACHIEVEMENT_BONUSES[a.type] ?? 0), 0)

    return {
      playerId: p.playerId,
      playerName: p.playerName,
      rank: p.rank,
      chipResult: p.chipResult,
      rankPoints,
      marginBonus: playerMarginBonus,
      achievementBonus,
      totalGameScore: rankPoints + playerMarginBonus + achievementBonus,
    }
  })
}

/**
 * Determine the champion (highest totalScore across all games).
 * Tiebreaker: best finish (lowest rank number), then alphabetical by playerId.
 */
export function determineChampion(
  playerScores: Record<string, GameNightPlayerTotal>,
): string | null {
  const entries = Object.values(playerScores)
  if (entries.length === 0) return null

  // Sort by totalScore desc, then by bestFinish asc (lower = better, 1 = 1st place),
  // then alphabetical by playerId
  entries.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    // Tiebreaker: best finish (1 is best)
    if (a.bestFinish !== b.bestFinish) return a.bestFinish - b.bestFinish
    // Final tiebreaker: alphabetical
    return a.playerId.localeCompare(b.playerId)
  })

  return entries[0]!.playerId
}

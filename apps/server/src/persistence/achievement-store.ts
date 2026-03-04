/**
 * Achievement store — Redis-backed persistent achievement tracking.
 *
 * Redis schema:
 *   Set: `achievements:{persistentId}` — set of earned achievement IDs
 *   Hash: `achievement_meta:{persistentId}:{achievementId}` — { earnedAt, game }
 */

import type { EarnedAchievement } from '@weekend-casino/shared'
import { getRedisClient } from './redis-client.js'

const ACHIEVEMENTS_PREFIX = 'achievements:'
const ACHIEVEMENT_META_PREFIX = 'achievement_meta:'

/**
 * Check if a player has earned a specific achievement.
 */
export async function hasAchievement(
  persistentId: string,
  achievementId: string,
): Promise<boolean> {
  const redis = await getRedisClient()
  return (await redis.sismember(`${ACHIEVEMENTS_PREFIX}${persistentId}`, achievementId)) === 1
}

/**
 * Grant an achievement to a player.
 * Returns false if already earned (idempotent).
 */
export async function grantAchievement(
  persistentId: string,
  achievementId: string,
  game: string,
): Promise<boolean> {
  const redis = await getRedisClient()
  const key = `${ACHIEVEMENTS_PREFIX}${persistentId}`

  // SADD returns 1 if the element was added (new), 0 if already present
  const added = await redis.sadd(key, achievementId)
  if (added === 0) return false

  // Store metadata
  const metaKey = `${ACHIEVEMENT_META_PREFIX}${persistentId}:${achievementId}`
  await redis.hset(metaKey, {
    earnedAt: new Date().toISOString(),
    game,
  })

  // Also update the achievements array in the player hash
  await updatePlayerAchievementsList(persistentId)

  return true
}

/**
 * Get all earned achievements for a player.
 */
export async function getAllAchievements(persistentId: string): Promise<EarnedAchievement[]> {
  const redis = await getRedisClient()
  const key = `${ACHIEVEMENTS_PREFIX}${persistentId}`

  const achievementIds = await redis.smembers(key)
  if (achievementIds.length === 0) return []

  const achievements: EarnedAchievement[] = []
  for (const id of achievementIds) {
    const metaKey = `${ACHIEVEMENT_META_PREFIX}${persistentId}:${id}`
    const meta = await redis.hgetall(metaKey)
    achievements.push({
      achievementId: id,
      earnedAt: meta['earnedAt'] ?? new Date().toISOString(),
      game: meta['game'] ?? 'unknown',
    })
  }

  return achievements
}

/**
 * Get the count of earned achievements.
 */
export async function getAchievementCount(persistentId: string): Promise<number> {
  const redis = await getRedisClient()
  return redis.scard(`${ACHIEVEMENTS_PREFIX}${persistentId}`)
}

/**
 * Update the achievements list in the player profile hash (for REST API).
 */
async function updatePlayerAchievementsList(persistentId: string): Promise<void> {
  const achievements = await getAllAchievements(persistentId)
  const redis = await getRedisClient()
  await redis.hset(`player:${persistentId}`, 'achievements', JSON.stringify(achievements))
}

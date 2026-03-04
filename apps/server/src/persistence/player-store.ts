/**
 * Player store — Redis-backed player profiles.
 *
 * Redis schema:
 *   Hash: `player:{persistentId}` — profile data, stats, identity
 *   String: `device:{deviceToken}` → persistentId (30-day TTL index)
 *
 * Profile data is stored as a JSON string in the hash for simplicity.
 * Individual stat fields are stored separately for atomic increments.
 */

import type {
  PlayerIdentity,
  PersistentPlayerStats,
  PlayerProfile,
  IdentitySource,
  DailyBonusState,
  EquippedLoadout,
  EarnedAchievement,
} from '@weekend-casino/shared'
import { createEmptyPersistentStats, calculatePlayerLevel } from '@weekend-casino/shared'
import { getRedisClient } from './redis-client.js'

const PLAYER_PREFIX = 'player:'
const DEVICE_INDEX_PREFIX = 'device:'
const DEVICE_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

/**
 * Get or create a player profile by device token.
 * Creates a new profile if not found.
 */
export async function getOrCreateByDeviceToken(
  deviceToken: string,
  source: IdentitySource,
  displayName?: string,
): Promise<PlayerProfile> {
  const redis = await getRedisClient()

  // Check device index for existing persistentId
  let persistentId = await redis.get(`${DEVICE_INDEX_PREFIX}${deviceToken}`)

  if (persistentId) {
    // Refresh TTL on device index
    await redis.expire(`${DEVICE_INDEX_PREFIX}${deviceToken}`, DEVICE_TTL_SECONDS)
    const profile = await getProfile(persistentId)
    if (profile) {
      // Update last login
      await updateLastLogin(persistentId)
      return profile
    }
  }

  // Create new profile
  persistentId = deviceToken // In dev, persistentId = deviceToken
  const now = new Date().toISOString()

  const identity: PlayerIdentity = {
    deviceToken,
    persistentId,
    displayName: displayName ?? `Player_${deviceToken.slice(0, 6)}`,
    lastLoginAt: now,
    identitySource: source,
    createdAt: now,
  }

  const stats = createEmptyPersistentStats()
  stats.totalSessions = 1

  const dailyBonus: DailyBonusState = {
    currentStreak: 0,
    lastClaimDate: null,
    totalClaimed: 0,
  }

  const profile: PlayerProfile = {
    identity,
    stats,
    level: 1,
    xp: 0,
    dailyBonus,
    achievements: [],
    cosmetics: {
      ownedIds: [],
      equipped: { cardBack: null, tableFelt: null, avatarFrame: null },
    },
  }

  // Persist to Redis
  const playerKey = `${PLAYER_PREFIX}${persistentId}`
  await redis.hset(playerKey, {
    identity: JSON.stringify(identity),
    stats: JSON.stringify(stats),
    xp: '0',
    dailyBonus: JSON.stringify(dailyBonus),
    achievements: JSON.stringify([]),
    cosmetics: JSON.stringify(profile.cosmetics),
  })

  // Set device index
  await redis.set(
    `${DEVICE_INDEX_PREFIX}${deviceToken}`,
    persistentId,
    'EX',
    DEVICE_TTL_SECONDS,
  )

  return profile
}

/**
 * Get a player profile by persistentId.
 */
export async function getProfile(persistentId: string): Promise<PlayerProfile | null> {
  const redis = await getRedisClient()
  const playerKey = `${PLAYER_PREFIX}${persistentId}`

  const data = await redis.hgetall(playerKey)
  if (!data || !data['identity']) return null

  const identity: PlayerIdentity = JSON.parse(data['identity'])
  const stats: PersistentPlayerStats = JSON.parse(data['stats'] ?? '{}')
  const xp = parseInt(data['xp'] ?? '0', 10)
  const dailyBonus: DailyBonusState = JSON.parse(data['dailyBonus'] ?? '{"currentStreak":0,"lastClaimDate":null,"totalClaimed":0}')
  const achievements: EarnedAchievement[] = JSON.parse(data['achievements'] ?? '[]')
  const cosmetics = JSON.parse(data['cosmetics'] ?? '{"ownedIds":[],"equipped":{"cardBack":null,"tableFelt":null,"avatarFrame":null}}')

  return {
    identity,
    stats,
    level: calculatePlayerLevel(xp),
    xp,
    dailyBonus,
    achievements,
    cosmetics,
  }
}

/**
 * Get a player profile by device token (resolves via index).
 */
export async function getProfileByDeviceToken(deviceToken: string): Promise<PlayerProfile | null> {
  const redis = await getRedisClient()
  const persistentId = await redis.get(`${DEVICE_INDEX_PREFIX}${deviceToken}`)
  if (!persistentId) return null
  return getProfile(persistentId)
}

/**
 * Update last login timestamp and increment session count.
 */
export async function updateLastLogin(persistentId: string): Promise<void> {
  const redis = await getRedisClient()
  const playerKey = `${PLAYER_PREFIX}${persistentId}`

  const identityStr = await redis.hget(playerKey, 'identity')
  if (!identityStr) return

  const identity: PlayerIdentity = JSON.parse(identityStr)
  identity.lastLoginAt = new Date().toISOString()
  await redis.hset(playerKey, 'identity', JSON.stringify(identity))

  const statsStr = await redis.hget(playerKey, 'stats')
  if (statsStr) {
    const stats: PersistentPlayerStats = JSON.parse(statsStr)
    stats.totalSessions += 1
    await redis.hset(playerKey, 'stats', JSON.stringify(stats))
  }
}

/**
 * Update persistent player stats after a game event.
 */
export async function updateStats(
  persistentId: string,
  update: Partial<PersistentPlayerStats>,
): Promise<void> {
  const redis = await getRedisClient()
  const playerKey = `${PLAYER_PREFIX}${persistentId}`

  const statsStr = await redis.hget(playerKey, 'stats')
  if (!statsStr) return

  const stats: PersistentPlayerStats = JSON.parse(statsStr)

  // Merge numeric fields additively
  if (update.totalGamesPlayed) stats.totalGamesPlayed += update.totalGamesPlayed
  if (update.totalHandsPlayed) stats.totalHandsPlayed += update.totalHandsPlayed
  if (update.totalHandsWon) stats.totalHandsWon += update.totalHandsWon
  if (update.totalChipsWon) stats.totalChipsWon += update.totalChipsWon
  if (update.totalChipsLost) stats.totalChipsLost += update.totalChipsLost
  if (update.challengesCompleted) stats.challengesCompleted += update.challengesCompleted
  if (update.gameNightWins) stats.gameNightWins += update.gameNightWins

  // Win streak tracking
  if (update.currentWinStreak !== undefined) {
    stats.currentWinStreak = update.currentWinStreak
    if (stats.currentWinStreak > stats.bestWinStreak) {
      stats.bestWinStreak = stats.currentWinStreak
    }
  }

  await redis.hset(playerKey, 'stats', JSON.stringify(stats))
}

/**
 * Update per-game-type stats for a player.
 * Populates stats.byGameType[game] which is used by achievement detection.
 */
export async function updateGameTypeStats(
  persistentId: string,
  game: string,
  won: boolean,
  chipsWon: number,
  chipsLost: number,
): Promise<void> {
  const redis = await getRedisClient()
  const playerKey = `${PLAYER_PREFIX}${persistentId}`

  const statsStr = await redis.hget(playerKey, 'stats')
  if (!statsStr) return

  const stats: PersistentPlayerStats = JSON.parse(statsStr)

  if (!stats.byGameType[game]) {
    stats.byGameType[game] = {
      gamesPlayed: 0,
      handsWon: 0,
      handsPlayed: 0,
      totalChipsWon: 0,
      totalChipsLost: 0,
      bestStreak: 0,
      currentStreak: 0,
    }
  }

  const gs = stats.byGameType[game]!
  gs.handsPlayed += 1
  gs.gamesPlayed += 1
  if (won) {
    gs.handsWon += 1
    gs.currentStreak += 1
    if (gs.currentStreak > gs.bestStreak) {
      gs.bestStreak = gs.currentStreak
    }
  } else {
    gs.currentStreak = 0
  }
  gs.totalChipsWon += chipsWon
  gs.totalChipsLost += chipsLost

  await redis.hset(playerKey, 'stats', JSON.stringify(stats))
}

/**
 * Add XP to a player and return the new level.
 */
export async function addXp(persistentId: string, amount: number): Promise<number> {
  const redis = await getRedisClient()
  const playerKey = `${PLAYER_PREFIX}${persistentId}`

  const newXp = await redis.hincrby(playerKey, 'xp', amount)
  return calculatePlayerLevel(newXp)
}

/**
 * Update the daily bonus state for a player.
 */
export async function updateDailyBonus(
  persistentId: string,
  bonusState: DailyBonusState,
): Promise<void> {
  const redis = await getRedisClient()
  const playerKey = `${PLAYER_PREFIX}${persistentId}`
  await redis.hset(playerKey, 'dailyBonus', JSON.stringify(bonusState))
}

/**
 * Update the equipped cosmetic loadout for a player.
 */
export async function updateEquippedLoadout(
  persistentId: string,
  loadout: EquippedLoadout,
): Promise<void> {
  const redis = await getRedisClient()
  const playerKey = `${PLAYER_PREFIX}${persistentId}`

  const cosmeticsStr = await redis.hget(playerKey, 'cosmetics')
  if (!cosmeticsStr) return

  const cosmetics = JSON.parse(cosmeticsStr)
  cosmetics.equipped = loadout
  await redis.hset(playerKey, 'cosmetics', JSON.stringify(cosmetics))
}

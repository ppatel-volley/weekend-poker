/**
 * Cosmetic store — Redis-backed cosmetic ownership and loadout.
 *
 * Redis schema:
 *   Stored within the player:{persistentId} hash under 'cosmetics' key.
 *   Format: { ownedIds: string[], equipped: EquippedLoadout }
 */

import type { OwnedCosmetics, EquippedLoadout, CosmeticCategory } from '@weekend-casino/shared'
import { COSMETIC_DEFINITIONS, DEFAULT_EQUIPPED_LOADOUT } from '@weekend-casino/shared'
import { getRedisClient } from './redis-client.js'

const PLAYER_PREFIX = 'player:'

/**
 * Get owned cosmetics for a player.
 */
export async function getOwnedCosmetics(persistentId: string): Promise<OwnedCosmetics> {
  const redis = await getRedisClient()
  const data = await redis.hget(`${PLAYER_PREFIX}${persistentId}`, 'cosmetics')

  if (!data) {
    return { ownedIds: [], equipped: { ...DEFAULT_EQUIPPED_LOADOUT } }
  }

  return JSON.parse(data)
}

/**
 * Unlock a cosmetic for a player (idempotent).
 * Returns true if newly unlocked, false if already owned.
 */
export async function unlockCosmetic(
  persistentId: string,
  cosmeticId: string,
): Promise<boolean> {
  const cosmetics = await getOwnedCosmetics(persistentId)

  if (cosmetics.ownedIds.includes(cosmeticId)) return false

  // Verify the cosmetic exists in definitions
  const def = COSMETIC_DEFINITIONS.find(c => c.id === cosmeticId)
  if (!def) return false

  cosmetics.ownedIds.push(cosmeticId)
  await persistCosmetics(persistentId, cosmetics)
  return true
}

/**
 * Equip a cosmetic item. Must be owned.
 * Returns true if equipped successfully, false if not owned or invalid.
 */
export async function equipCosmetic(
  persistentId: string,
  cosmeticId: string,
  category: CosmeticCategory,
): Promise<boolean> {
  const cosmetics = await getOwnedCosmetics(persistentId)

  if (!cosmetics.ownedIds.includes(cosmeticId)) return false

  // Verify the cosmetic exists and matches category
  const def = COSMETIC_DEFINITIONS.find(c => c.id === cosmeticId && c.category === category)
  if (!def) return false

  switch (category) {
    case 'card_back':
      cosmetics.equipped.cardBack = cosmeticId
      break
    case 'table_felt':
      cosmetics.equipped.tableFelt = cosmeticId
      break
    case 'avatar_frame':
      cosmetics.equipped.avatarFrame = cosmeticId
      break
  }

  await persistCosmetics(persistentId, cosmetics)
  return true
}

/**
 * Unequip a cosmetic category (reset to default).
 */
export async function unequipCosmetic(
  persistentId: string,
  category: CosmeticCategory,
): Promise<void> {
  const cosmetics = await getOwnedCosmetics(persistentId)

  switch (category) {
    case 'card_back':
      cosmetics.equipped.cardBack = null
      break
    case 'table_felt':
      cosmetics.equipped.tableFelt = null
      break
    case 'avatar_frame':
      cosmetics.equipped.avatarFrame = null
      break
  }

  await persistCosmetics(persistentId, cosmetics)
}

/**
 * Get the equipped loadout for a player.
 */
export async function getEquippedLoadout(persistentId: string): Promise<EquippedLoadout> {
  const cosmetics = await getOwnedCosmetics(persistentId)
  return cosmetics.equipped
}

/**
 * Persist cosmetics data to Redis.
 */
async function persistCosmetics(
  persistentId: string,
  cosmetics: OwnedCosmetics,
): Promise<void> {
  const redis = await getRedisClient()
  await redis.hset(
    `${PLAYER_PREFIX}${persistentId}`,
    'cosmetics',
    JSON.stringify(cosmetics),
  )
}

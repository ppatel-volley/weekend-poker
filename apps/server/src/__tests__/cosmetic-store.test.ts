import { describe, it, expect, beforeEach } from 'vitest'
import { resetRedisClient, getRedisClient } from '../persistence/redis-client.js'
import {
  getOwnedCosmetics,
  unlockCosmetic,
  equipCosmetic,
  getEquippedLoadout,
} from '../persistence/cosmetic-store.js'

// We need a player hash to exist in Redis for cosmetic-store to work.
// Seed a minimal player entry.
async function seedPlayer(persistentId: string): Promise<void> {
  const redis = await getRedisClient()
  await redis.hset(`player:${persistentId}`, {
    identity: JSON.stringify({ persistentId, deviceToken: persistentId, displayName: 'Test', lastLoginAt: '', identitySource: 'device_token', createdAt: '' }),
    stats: JSON.stringify({}),
    xp: '0',
    dailyBonus: JSON.stringify({ currentStreak: 0, lastClaimDate: null, totalClaimed: 0 }),
    achievements: JSON.stringify([]),
    cosmetics: JSON.stringify({ ownedIds: [], equipped: { cardBack: null, tableFelt: null, avatarFrame: null } }),
  })
}

beforeEach(() => {
  resetRedisClient()
})

describe('getOwnedCosmetics', () => {
  it('returns defaults for new player (no cosmetics data)', async () => {
    const cosmetics = await getOwnedCosmetics('no-such-player')
    expect(cosmetics.ownedIds).toEqual([])
    expect(cosmetics.equipped.cardBack).toBeNull()
    expect(cosmetics.equipped.tableFelt).toBeNull()
    expect(cosmetics.equipped.avatarFrame).toBeNull()
  })

  it('returns stored cosmetics after seeding', async () => {
    await seedPlayer('p1')
    const cosmetics = await getOwnedCosmetics('p1')
    expect(cosmetics.ownedIds).toEqual([])
    expect(cosmetics.equipped).toEqual({
      cardBack: null,
      tableFelt: null,
      avatarFrame: null,
    })
  })
})

describe('unlockCosmetic', () => {
  it('adds cosmetic to owned list', async () => {
    await seedPlayer('p2')
    const result = await unlockCosmetic('p2', 'cb_classic_red')
    expect(result).toBe(true)

    const cosmetics = await getOwnedCosmetics('p2')
    expect(cosmetics.ownedIds).toContain('cb_classic_red')
  })

  it('returns false if already owned (idempotent)', async () => {
    await seedPlayer('p3')
    await unlockCosmetic('p3', 'cb_classic_red')
    const result = await unlockCosmetic('p3', 'cb_classic_red')
    expect(result).toBe(false)
  })

  it('returns false for invalid cosmetic ID', async () => {
    await seedPlayer('p4')
    const result = await unlockCosmetic('p4', 'nonexistent_cosmetic')
    expect(result).toBe(false)
  })

  it('can unlock multiple different cosmetics', async () => {
    await seedPlayer('p5')
    await unlockCosmetic('p5', 'cb_classic_red')
    await unlockCosmetic('p5', 'tf_emerald')
    await unlockCosmetic('p5', 'af_bronze')

    const cosmetics = await getOwnedCosmetics('p5')
    expect(cosmetics.ownedIds).toHaveLength(3)
    expect(cosmetics.ownedIds).toContain('cb_classic_red')
    expect(cosmetics.ownedIds).toContain('tf_emerald')
    expect(cosmetics.ownedIds).toContain('af_bronze')
  })
})

describe('equipCosmetic', () => {
  it('equips a card back in the correct slot', async () => {
    await seedPlayer('p6')
    await unlockCosmetic('p6', 'cb_classic_red')
    const result = await equipCosmetic('p6', 'cb_classic_red', 'card_back')
    expect(result).toBe(true)

    const loadout = await getEquippedLoadout('p6')
    expect(loadout.cardBack).toBe('cb_classic_red')
  })

  it('equips a table felt in the correct slot', async () => {
    await seedPlayer('p7')
    await unlockCosmetic('p7', 'tf_emerald')
    const result = await equipCosmetic('p7', 'tf_emerald', 'table_felt')
    expect(result).toBe(true)

    const loadout = await getEquippedLoadout('p7')
    expect(loadout.tableFelt).toBe('tf_emerald')
  })

  it('equips an avatar frame in the correct slot', async () => {
    await seedPlayer('p8')
    await unlockCosmetic('p8', 'af_bronze')
    const result = await equipCosmetic('p8', 'af_bronze', 'avatar_frame')
    expect(result).toBe(true)

    const loadout = await getEquippedLoadout('p8')
    expect(loadout.avatarFrame).toBe('af_bronze')
  })

  it('fails for unowned cosmetic', async () => {
    await seedPlayer('p9')
    const result = await equipCosmetic('p9', 'cb_classic_red', 'card_back')
    expect(result).toBe(false)
  })

  it('fails if cosmetic does not match the specified category', async () => {
    await seedPlayer('p10')
    await unlockCosmetic('p10', 'cb_classic_red') // This is a card_back
    const result = await equipCosmetic('p10', 'cb_classic_red', 'table_felt') // Wrong category
    expect(result).toBe(false)
  })
})

describe('getEquippedLoadout', () => {
  it('returns all null loadout for a player with no data', async () => {
    await seedPlayer('p11')
    const loadout = await getEquippedLoadout('p11')
    expect(loadout.cardBack).toBeNull()
    expect(loadout.tableFelt).toBeNull()
    expect(loadout.avatarFrame).toBeNull()
  })

  it('returns current loadout after equipping items', async () => {
    await seedPlayer('p12')
    await unlockCosmetic('p12', 'cb_classic_red')
    await unlockCosmetic('p12', 'tf_emerald')
    await equipCosmetic('p12', 'cb_classic_red', 'card_back')
    await equipCosmetic('p12', 'tf_emerald', 'table_felt')

    const loadout = await getEquippedLoadout('p12')
    expect(loadout.cardBack).toBe('cb_classic_red')
    expect(loadout.tableFelt).toBe('tf_emerald')
    expect(loadout.avatarFrame).toBeNull()
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { resetRedisClient } from '../persistence/redis-client.js'
import {
  getOrCreateByDeviceToken,
  getProfile,
  getProfileByDeviceToken,
  updateStats,
  addXp,
} from '../persistence/player-store.js'

beforeEach(() => {
  resetRedisClient()
})

describe('getOrCreateByDeviceToken', () => {
  it('creates a new profile with correct defaults', async () => {
    const profile = await getOrCreateByDeviceToken('dev-123', 'device_token', 'TestPlayer')

    expect(profile.identity.deviceToken).toBe('dev-123')
    expect(profile.identity.persistentId).toBe('dev-123')
    expect(profile.identity.displayName).toBe('TestPlayer')
    expect(profile.identity.identitySource).toBe('device_token')
    expect(profile.level).toBe(1)
    expect(profile.xp).toBe(0)
    expect(profile.stats.totalGamesPlayed).toBe(0)
    expect(profile.stats.totalSessions).toBe(1)
    expect(profile.achievements).toEqual([])
    expect(profile.cosmetics.ownedIds).toEqual([])
    expect(profile.cosmetics.equipped.cardBack).toBeNull()
    expect(profile.dailyBonus.currentStreak).toBe(0)
    expect(profile.dailyBonus.lastClaimDate).toBeNull()
  })

  it('auto-generates display name when not provided', async () => {
    const profile = await getOrCreateByDeviceToken('abc123def', 'device_token')
    expect(profile.identity.displayName).toBe('Player_abc123')
  })

  it('returns existing profile on second call with same deviceToken', async () => {
    const first = await getOrCreateByDeviceToken('dev-999', 'device_token', 'Alice')
    const second = await getOrCreateByDeviceToken('dev-999', 'device_token', 'Alice')

    expect(first.identity.persistentId).toBe(second.identity.persistentId)
    // getOrCreateByDeviceToken calls getProfile then updateLastLogin,
    // so the returned profile has the pre-update session count.
    // The session increment happens asynchronously after the return.
    expect(second.identity.displayName).toBe('Alice')

    // Verify session was incremented by reading fresh profile
    const fresh = await getProfile('dev-999')
    expect(fresh!.stats.totalSessions).toBeGreaterThanOrEqual(2)
  })
})

describe('getProfile', () => {
  it('returns null for a non-existent persistentId', async () => {
    const profile = await getProfile('nonexistent-id')
    expect(profile).toBeNull()
  })

  it('returns the profile after creation', async () => {
    await getOrCreateByDeviceToken('dev-abc', 'device_token', 'Bob')
    const profile = await getProfile('dev-abc')

    expect(profile).not.toBeNull()
    expect(profile!.identity.displayName).toBe('Bob')
  })
})

describe('getProfileByDeviceToken', () => {
  it('returns null when device token has no index entry', async () => {
    const profile = await getProfileByDeviceToken('unknown-device')
    expect(profile).toBeNull()
  })

  it('resolves profile via device index', async () => {
    await getOrCreateByDeviceToken('dev-xyz', 'device_token', 'Charlie')
    const profile = await getProfileByDeviceToken('dev-xyz')

    expect(profile).not.toBeNull()
    expect(profile!.identity.displayName).toBe('Charlie')
  })
})

describe('updateStats', () => {
  it('increments numeric stats correctly', async () => {
    await getOrCreateByDeviceToken('dev-stats', 'device_token', 'StatsPlayer')

    await updateStats('dev-stats', {
      totalGamesPlayed: 2,
      totalHandsPlayed: 10,
      totalHandsWon: 5,
      totalChipsWon: 5000,
      totalChipsLost: 2000,
    })

    const profile = await getProfile('dev-stats')
    expect(profile!.stats.totalGamesPlayed).toBe(2)
    expect(profile!.stats.totalHandsPlayed).toBe(10)
    expect(profile!.stats.totalHandsWon).toBe(5)
    expect(profile!.stats.totalChipsWon).toBe(5000)
    expect(profile!.stats.totalChipsLost).toBe(2000)
  })

  it('tracks win streak and best streak', async () => {
    await getOrCreateByDeviceToken('dev-streak', 'device_token')

    await updateStats('dev-streak', { currentWinStreak: 3 })
    let profile = await getProfile('dev-streak')
    expect(profile!.stats.currentWinStreak).toBe(3)
    expect(profile!.stats.bestWinStreak).toBe(3)

    await updateStats('dev-streak', { currentWinStreak: 5 })
    profile = await getProfile('dev-streak')
    expect(profile!.stats.currentWinStreak).toBe(5)
    expect(profile!.stats.bestWinStreak).toBe(5)

    // Streak broken, but best should remain
    await updateStats('dev-streak', { currentWinStreak: 0 })
    profile = await getProfile('dev-streak')
    expect(profile!.stats.currentWinStreak).toBe(0)
    expect(profile!.stats.bestWinStreak).toBe(5)
  })

  it('does nothing for non-existent player', async () => {
    // Should not throw
    await expect(updateStats('ghost', { totalGamesPlayed: 1 })).resolves.toBeUndefined()
  })
})

describe('addXp', () => {
  it('increments XP and returns correct level', async () => {
    await getOrCreateByDeviceToken('dev-xp', 'device_token')

    const level1 = await addXp('dev-xp', 100)
    expect(level1).toBe(1) // 100 XP = still level 1

    const level2 = await addXp('dev-xp', 500)
    expect(level2).toBe(2) // 600 XP = level 2

    const level3 = await addXp('dev-xp', 1000)
    expect(level3).toBe(3) // 1600 XP = level 3
  })

  it('returns level 10 at 30,000 XP', async () => {
    await getOrCreateByDeviceToken('dev-max', 'device_token')
    const level = await addXp('dev-max', 30_000)
    expect(level).toBe(10)
  })
})

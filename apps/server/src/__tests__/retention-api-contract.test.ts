/**
 * API contract tests — verify REST response shapes match what clients expect.
 *
 * These tests exercise the actual route handlers with real ioredis-mock storage,
 * verifying the full pipeline: handler → store → Redis → JSON response.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { resetRedisClient } from '../persistence/redis-client.js'
import { createRetentionRouter } from '../persistence/routes.js'
import * as playerStore from '../persistence/player-store.js'

// Build a test Express app with the retention routes
function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(createRetentionRouter())
  return app
}

beforeEach(() => {
  resetRedisClient()
})

describe('Retention API Contract', () => {
  describe('GET /api/profile/:deviceToken', () => {
    it('returns 404 for unknown device token', async () => {
      const app = createTestApp()
      const res = await request(app).get('/api/profile/unknown-token')
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Profile not found')
    })

    it('returns PlayerProfile shape for known player', async () => {
      // Seed a player
      await playerStore.getOrCreateByDeviceToken('test-dev-1', 'device_token', 'TestPlayer')

      const app = createTestApp()
      const res = await request(app).get('/api/profile/test-dev-1')

      expect(res.status).toBe(200)
      const profile = res.body

      // Verify PlayerProfile shape matches what controller expects
      expect(profile.identity).toBeDefined()
      expect(profile.identity.deviceToken).toBe('test-dev-1')
      expect(profile.identity.persistentId).toBe('test-dev-1')
      expect(profile.identity.displayName).toBe('TestPlayer')
      expect(typeof profile.identity.identitySource).toBe('string')

      expect(typeof profile.level).toBe('number')
      expect(typeof profile.xp).toBe('number')

      expect(profile.stats).toBeDefined()
      expect(typeof profile.stats.totalGamesPlayed).toBe('number')
      expect(typeof profile.stats.totalHandsPlayed).toBe('number')

      expect(profile.dailyBonus).toBeDefined()
      expect(typeof profile.dailyBonus.currentStreak).toBe('number')

      expect(Array.isArray(profile.achievements)).toBe(true)
      expect(profile.cosmetics).toBeDefined()
      expect(Array.isArray(profile.cosmetics.ownedIds)).toBe(true)
    })
  })

  describe('GET /api/challenges/:deviceToken', () => {
    it('returns 404 for unknown device token', async () => {
      const app = createTestApp()
      const res = await request(app).get('/api/challenges/unknown-token')
      expect(res.status).toBe(404)
    })

    it('returns ActiveChallenge[] shape (auto-assigns)', async () => {
      await playerStore.getOrCreateByDeviceToken('test-dev-2', 'device_token', 'ChallengePlayer')

      const app = createTestApp()
      const res = await request(app).get('/api/challenges/test-dev-2')

      expect(res.status).toBe(200)
      const challenges = res.body

      // Controller expects ActiveChallenge[] — array of 3 with .definition.*
      expect(Array.isArray(challenges)).toBe(true)
      expect(challenges).toHaveLength(3)

      for (const challenge of challenges) {
        // Verify ActiveChallenge shape (what ChallengesView.tsx reads)
        expect(challenge.definition).toBeDefined()
        expect(typeof challenge.definition.id).toBe('string')
        expect(typeof challenge.definition.title).toBe('string')
        expect(typeof challenge.definition.description).toBe('string')
        expect(['bronze', 'silver', 'gold']).toContain(challenge.definition.tier)
        expect(typeof challenge.definition.targetValue).toBe('number')
        expect(typeof challenge.definition.rewardChips).toBe('number')

        expect(typeof challenge.currentValue).toBe('number')
        expect(typeof challenge.completed).toBe('boolean')
        expect(typeof challenge.claimed).toBe('boolean')
        expect(typeof challenge.assignedAt).toBe('string')
      }

      // Verify tiers are present
      const tiers = challenges.map((c: any) => c.definition.tier).sort()
      expect(tiers).toEqual(['bronze', 'gold', 'silver'])
    })
  })

  describe('GET /api/achievements/:deviceToken', () => {
    it('returns { achievements: [] } for player with none', async () => {
      await playerStore.getOrCreateByDeviceToken('test-dev-3', 'device_token', 'AchPlayer')

      const app = createTestApp()
      const res = await request(app).get('/api/achievements/test-dev-3')

      expect(res.status).toBe(200)
      expect(res.body.achievements).toBeDefined()
      expect(Array.isArray(res.body.achievements)).toBe(true)
    })
  })

  describe('GET /api/cosmetics/:deviceToken', () => {
    it('returns OwnedCosmetics shape', async () => {
      await playerStore.getOrCreateByDeviceToken('test-dev-4', 'device_token', 'CosPlayer')

      const app = createTestApp()
      const res = await request(app).get('/api/cosmetics/test-dev-4')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.ownedIds)).toBe(true)
      expect(res.body.equipped).toBeDefined()
      expect(res.body.equipped.cardBack).toBeNull()
      expect(res.body.equipped.tableFelt).toBeNull()
      expect(res.body.equipped.avatarFrame).toBeNull()
    })
  })

  describe('POST /api/challenges/:deviceToken/claim', () => {
    it('returns 400 when challengeId missing', async () => {
      await playerStore.getOrCreateByDeviceToken('test-dev-5', 'device_token')

      const app = createTestApp()
      const res = await request(app)
        .post('/api/challenges/test-dev-5/claim')
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('challengeId')
    })
  })
})

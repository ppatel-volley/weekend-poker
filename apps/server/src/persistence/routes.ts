/**
 * Retention REST API routes.
 *
 * Side-channel routes served alongside VGF — NOT through the game state.
 * Profile data, challenges, achievements, and cosmetics.
 *
 * Routes:
 *   GET  /api/profile/:deviceToken     — Full player profile
 *   GET  /api/challenges/:deviceToken  — Active weekly challenges
 *   GET  /api/achievements/:deviceToken — Earned achievements
 *   GET  /api/cosmetics/:deviceToken   — Owned cosmetics
 *   POST /api/cosmetics/:deviceToken/equip — Equip a cosmetic
 *   POST /api/challenges/:deviceToken/claim — Claim challenge reward
 */

import type { Request, Response, NextFunction } from 'express'
import { Router } from 'express'
import * as playerStore from './player-store.js'
import * as challengeStore from './challenge-store.js'
import * as achievementStore from './achievement-store.js'
import * as cosmeticStore from './cosmetic-store.js'
import { CHALLENGE_XP_REWARDS } from '@weekend-casino/shared'

/**
 * Ownership validation middleware.
 *
 * Dev mode: validates the `x-device-token` header (or query param) matches
 * the `:deviceToken` route param. This prevents casual enumeration/tampering.
 *
 * Production: will be replaced by Platform SDK auth token validation
 * (see BUILDING_TV_GAMES.md Section 3.1). The server will verify the
 * requesting client's identity via signed JWT from Volley Identity API.
 */
function validateOwnership(req: Request, res: Response, next: NextFunction): void {
  const routeToken = req.params['deviceToken']
  const headerToken = req.headers['x-device-token'] as string | undefined
  const queryToken = req.query['deviceToken'] as string | undefined

  // In dev mode, require the caller to prove ownership via header or query
  const callerToken = headerToken ?? queryToken
  if (callerToken && callerToken !== routeToken) {
    res.status(403).json({ error: 'Forbidden: token mismatch' })
    return
  }

  // If no proof header is sent, allow in dev mode but log a warning
  // Production deployments MUST enforce auth here via Platform SDK JWT
  if (!callerToken && process.env['NODE_ENV'] === 'production') {
    res.status(401).json({ error: 'Unauthorized: x-device-token header required' })
    return
  }

  next()
}

export function createRetentionRouter(): Router {
  const router = Router()

  // Apply ownership validation to all retention routes
  router.use('/api/:collection/:deviceToken', validateOwnership)

  // ── Profile ──────────────────────────────────────────────────────

  router.get('/api/profile/:deviceToken', async (req, res) => {
    try {
      const { deviceToken } = req.params
      const profile = await playerStore.getProfileByDeviceToken(deviceToken!)
      if (!profile) {
        res.status(404).json({ error: 'Profile not found' })
        return
      }
      res.json(profile)
    } catch (err) {
      console.error('[retention] GET /api/profile error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // ── Challenges ───────────────────────────────────────────────────

  router.get('/api/challenges/:deviceToken', async (req, res) => {
    try {
      const { deviceToken } = req.params
      const profile = await playerStore.getProfileByDeviceToken(deviceToken!)
      if (!profile) {
        res.status(404).json({ error: 'Player not found' })
        return
      }

      let challenges = await challengeStore.getActiveChallenges(profile.identity.persistentId)
      if (challenges.length === 0) {
        // Auto-assign if none exist
        challenges = await challengeStore.assignChallenges(
          profile.identity.persistentId,
          profile.stats,
        )
      }

      res.json(challenges)
    } catch (err) {
      console.error('[retention] GET /api/challenges error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/api/challenges/:deviceToken/claim', async (req, res) => {
    try {
      const { deviceToken } = req.params
      const { challengeId } = req.body ?? {}

      if (!challengeId) {
        res.status(400).json({ error: 'challengeId required' })
        return
      }

      const profile = await playerStore.getProfileByDeviceToken(deviceToken!)
      if (!profile) {
        res.status(404).json({ error: 'Player not found' })
        return
      }

      const result = await challengeStore.claimChallenge(
        profile.identity.persistentId,
        challengeId,
      )

      if (!result.success) {
        res.status(400).json({ error: 'Challenge not claimable' })
        return
      }

      // Apply rewards: update stats, award XP, grant linked achievement + cosmetic
      try {
        await playerStore.updateStats(profile.identity.persistentId, {
          challengesCompleted: 1,
        } as any)

        const tier = result.tier ?? 'bronze'
        const xpReward = CHALLENGE_XP_REWARDS[tier] ?? 100
        await playerStore.addXp(profile.identity.persistentId, xpReward)

        // Grant linked achievement (if any) and unlock its cosmetic
        if (result.unlocksAchievement) {
          const granted = await achievementStore.grantAchievement(
            profile.identity.persistentId,
            result.unlocksAchievement,
            'challenge',
          )
          if (granted) {
            // Check if the achievement unlocks a cosmetic
            const { getAchievementById } = await import('../achievement-engine/definitions.js')
            const achDef = getAchievementById(result.unlocksAchievement)
            if (achDef?.unlocksCosmetic) {
              await cosmeticStore.unlockCosmetic(
                profile.identity.persistentId,
                achDef.unlocksCosmetic,
              )
            }
          }
        }
      } catch (rewardErr) {
        // Non-critical: reward application failure should not fail the claim
        console.error('[retention] Challenge reward application failed:', rewardErr)
      }

      res.json({ success: true, rewardChips: result.rewardChips })
    } catch (err) {
      console.error('[retention] POST /api/challenges/claim error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // ── Achievements ─────────────────────────────────────────────────

  router.get('/api/achievements/:deviceToken', async (req, res) => {
    try {
      const { deviceToken } = req.params
      const profile = await playerStore.getProfileByDeviceToken(deviceToken!)
      if (!profile) {
        res.status(404).json({ error: 'Player not found' })
        return
      }

      const achievements = await achievementStore.getAllAchievements(
        profile.identity.persistentId,
      )
      res.json({ achievements })
    } catch (err) {
      console.error('[retention] GET /api/achievements error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // ── Cosmetics ────────────────────────────────────────────────────

  router.get('/api/cosmetics/:deviceToken', async (req, res) => {
    try {
      const { deviceToken } = req.params
      const profile = await playerStore.getProfileByDeviceToken(deviceToken!)
      if (!profile) {
        res.status(404).json({ error: 'Player not found' })
        return
      }

      const cosmetics = await cosmeticStore.getOwnedCosmetics(
        profile.identity.persistentId,
      )
      res.json(cosmetics)
    } catch (err) {
      console.error('[retention] GET /api/cosmetics error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/api/cosmetics/:deviceToken/equip', async (req, res) => {
    try {
      const { deviceToken } = req.params
      const { cosmeticId, category } = req.body ?? {}

      if (!cosmeticId || !category) {
        res.status(400).json({ error: 'cosmeticId and category required' })
        return
      }

      const profile = await playerStore.getProfileByDeviceToken(deviceToken!)
      if (!profile) {
        res.status(404).json({ error: 'Player not found' })
        return
      }

      const success = await cosmeticStore.equipCosmetic(
        profile.identity.persistentId,
        cosmeticId,
        category,
      )

      if (!success) {
        res.status(400).json({ error: 'Cosmetic not owned or invalid category' })
        return
      }

      res.json({ success: true })
    } catch (err) {
      console.error('[retention] POST /api/cosmetics/equip error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}

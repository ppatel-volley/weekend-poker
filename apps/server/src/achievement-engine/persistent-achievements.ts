/**
 * Persistent achievement phase integration.
 *
 * Called from hand-complete onBegin (after Game Night round increment).
 * Detects achievements → grants new ones → unlocks cosmetic rewards.
 *
 * Same pattern as incrementGameNightRoundIfActive: try/catch, non-critical.
 */

import type { CasinoGameState } from '@weekend-casino/shared'
import { detectGameEventAchievements, detectStatBasedAchievements } from './detector.js'
import { getAchievementById } from './definitions.js'
import * as achievementStore from '../persistence/achievement-store.js'
import * as cosmeticStore from '../persistence/cosmetic-store.js'
import * as playerStore from '../persistence/player-store.js'

/**
 * Persist achievements if new ones are detected.
 * Non-critical: failures don't break game flow.
 *
 * Supports both raw VGF context (ctx.reducerDispatcher) and
 * adapted context (ctx.dispatch from adaptPhaseCtx/makePhase).
 */
export async function persistAchievementsIfNew(ctx: any): Promise<void> {
  try {
    const state: CasinoGameState = ctx.getState()

    // Detect game-event achievements
    const gameAchievements = detectGameEventAchievements(state)

    for (const ach of gameAchievements) {
      const player = state.players.find(p => p.id === ach.playerId)
      if (!player?.persistentId || player.isBot) continue

      // Grant achievement (idempotent — returns false if already earned)
      const granted = await achievementStore.grantAchievement(
        player.persistentId,
        ach.achievementId,
        ach.game,
      )

      if (granted) {
        // Check if this achievement unlocks a cosmetic
        const def = getAchievementById(ach.achievementId)
        if (def?.unlocksCosmetic) {
          await cosmeticStore.unlockCosmetic(player.persistentId, def.unlocksCosmetic)
        }
      }
    }

    // Also check stat-based achievements for each persistent player
    for (const player of state.players) {
      if (!player.persistentId || player.isBot) continue

      const profile = await playerStore.getProfile(player.persistentId)
      if (!profile) continue

      const earnedIds = new Set(profile.achievements.map(a => a.achievementId))
      const statAchievements = detectStatBasedAchievements(
        player.id,
        profile.stats,
        profile.level,
        earnedIds,
      )

      for (const ach of statAchievements) {
        const granted = await achievementStore.grantAchievement(
          player.persistentId,
          ach.achievementId,
          ach.game,
        )
        if (granted) {
          const def = getAchievementById(ach.achievementId)
          if (def?.unlocksCosmetic) {
            await cosmeticStore.unlockCosmetic(player.persistentId, def.unlocksCosmetic)
          }
        }
      }
    }
  } catch (err) {
    // Non-critical: achievement detection failure should NOT break game flow
    console.error('[achievements] Persistent achievement detection failed:', err)
  }
}

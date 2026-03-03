/**
 * Game Night utility — wrapWithGameNightCheck
 *
 * v2.0: No-op wrapper (gameNight is null/undefined).
 * v2.1: Active wrapper that routes to GN_LEADERBOARD when round limit is reached.
 *
 * Per roadmap prerequisite: "Build the Game Night guard wrapper into all v2.0
 * round-complete `next` functions from the start (as a no-op when Game Night
 * isn't active). This avoids refactoring every game's completion phase when
 * v2.1 adds Game Night Mode."
 */

import type { CasinoGameState } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'

type NextFunction = (ctx: any) => string

/**
 * Wraps a round-complete phase's `next` function with a Game Night check.
 *
 * When Game Night is active and the round limit has been reached,
 * routes to GN_LEADERBOARD instead of the inner `next` result.
 *
 * When gameNight is null/undefined (v2.0), this is a no-op — the inner
 * `next` function is called directly.
 */
export function wrapWithGameNightCheck(innerNext: NextFunction): NextFunction {
  return (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    if (
      state.gameNight?.active &&
      state.gameNight.roundsPlayed >= state.gameNight.roundLimit
    ) {
      return CasinoPhase.GnLeaderboard
    }
    return innerNext(ctx)
  }
}

/**
 * Increment Game Night round counter and detect achievements if active.
 * Called in all 6 hand-complete phase onBegin callbacks.
 * No-op when gameNight is undefined or inactive (v2.0 safe).
 *
 * Supports both raw VGF context (ctx.reducerDispatcher) and
 * adapted context (ctx.dispatch from adaptPhaseCtx/makePhase).
 */
export function incrementGameNightRoundIfActive(ctx: any): void {
  const state: CasinoGameState = ctx.getState()
  if (state.gameNight?.active) {
    const dispatch = ctx.reducerDispatcher ?? ctx.dispatch
    if (dispatch) {
      dispatch('gnIncrementRoundsPlayed')

      // Detect and record achievements for the completed round
      try {
        // Dynamic import to avoid circular dependencies
        const { detectAchievements } = require('../game-night-engine/achievements.js')
        const achievements = detectAchievements(state)
        for (const ach of achievements) {
          dispatch('gnRecordAchievement', {
            playerId: ach.playerId,
            type: ach.type,
            gameIndex: state.gameNight!.currentGameIndex,
            timestamp: Date.now(),
          })
        }
      } catch (_e) {
        // Achievement detection is non-critical — don't break the game
      }
    }
  }
}

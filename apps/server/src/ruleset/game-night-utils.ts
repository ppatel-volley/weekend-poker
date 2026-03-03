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

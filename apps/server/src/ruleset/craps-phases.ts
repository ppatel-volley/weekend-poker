/**
 * Craps phase definitions.
 *
 * Phase flow:
 *   GAME_SELECT → CRAPS_NEW_SHOOTER → CRAPS_COME_OUT_BETTING
 *     → CRAPS_COME_OUT_ROLL → CRAPS_COME_OUT_RESOLUTION
 *       → (natural/craps) CRAPS_ROUND_COMPLETE
 *       → (point) CRAPS_POINT_BETTING → CRAPS_POINT_ROLL
 *         → CRAPS_POINT_RESOLUTION
 *           → (seven-out/point-hit) CRAPS_ROUND_COMPLETE
 *           → (else) CRAPS_POINT_BETTING (loop)
 *     → CRAPS_ROUND_COMPLETE → (seven-out) CRAPS_NEW_SHOOTER | CRAPS_COME_OUT_BETTING
 *
 * Per D-003: CRAPS_ prefix for all Craps phases.
 */

import type { CasinoGameState } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'
import { wrapWithGameNightCheck, incrementGameNightRoundIfActive } from './game-night-utils.js'

type PhaseCtx = {
  getState: () => CasinoGameState
  getSessionId: () => string
  dispatch: (name: string, ...args: unknown[]) => void
  dispatchThunk: (name: string, ...args: unknown[]) => Promise<void>
}

function adaptPhaseCtx(vgfCtx: any): PhaseCtx {
  return {
    get dispatch() { return vgfCtx.reducerDispatcher ?? vgfCtx.dispatch },
    get dispatchThunk() { return vgfCtx.thunkDispatcher ?? vgfCtx.dispatchThunk },
    getState: () => vgfCtx.getState?.() ?? vgfCtx.session?.state,
    getSessionId: () => vgfCtx.getSessionId?.() ?? vgfCtx.session?.sessionId,
  }
}

/**
 * CRAPS_NEW_SHOOTER: Assign the shooter and initialise the round.
 */
export const crapsNewShooterPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    const state = adapted.getState()

    const activePlayers = state.players
      .filter((p: any) => p.status !== 'busted' && p.status !== 'sitting_out')

    if (activePlayers.length === 0) return adapted.getState()

    // Determine shooter — use existing craps state or pick first player
    const previousShooter = state.craps?.shooterPlayerId
    let shooterIndex = 0
    let shooterPlayerId = activePlayers[0]!.id

    if (previousShooter) {
      const idx = activePlayers.findIndex(p => p.id === previousShooter)
      if (idx >= 0) {
        shooterIndex = idx
        shooterPlayerId = previousShooter
      }
    }

    adapted.dispatch('crapsInitRound', shooterPlayerId, activePlayers[shooterIndex]?.seatIndex ?? shooterIndex)
    adapted.dispatch('setDealerMessage', `New shooter: ${activePlayers[shooterIndex]?.name ?? 'Player'}!`)
    adapted.dispatch('crapsSetNewShooterReady', true)
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.craps?.newShooterReady === true
  },
  next: CasinoPhase.CrapsComeOutBetting,
}

/**
 * CRAPS_COME_OUT_BETTING: Players place come-out bets (Pass/Don't Pass).
 */
export const crapsComeOutBettingPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    adapted.dispatch('setDealerMessage', 'Place your come-out bets!')
    // Reset confirmation flags for new betting round
    const state = adapted.getState()
    if (state.craps) {
      for (const player of state.craps.players) {
        adapted.dispatch('crapsSetPlayerConfirmed', player.playerId, false)
      }
    }
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.craps?.allComeOutBetsPlaced === true
  },
  next: CasinoPhase.CrapsComeOutRoll,
}

/**
 * CRAPS_COME_OUT_ROLL: Shooter rolls the dice on come-out.
 */
export const crapsComeOutRollPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    adapted.dispatch('setDealerMessage', 'Shooter coming out!')
    await adapted.dispatchThunk('crapsRollDice')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.craps?.rollComplete === true
  },
  next: CasinoPhase.CrapsComeOutResolution,
}

/**
 * CRAPS_COME_OUT_RESOLUTION: Resolve pass/don't pass bets from come-out roll.
 * Routes to ROUND_COMPLETE on natural/craps, or POINT_BETTING if point established.
 */
export const crapsComeOutResolutionPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('crapsResolveCrapsRoll')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.craps?.comeOutResolutionComplete === true
  },
  next: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    const craps = state.craps
    if (!craps) return CasinoPhase.CrapsRoundComplete

    // If point was established (puckOn became true), go to point betting
    if (craps.puckOn && craps.point !== null) {
      return CasinoPhase.CrapsPointBetting
    }

    // Natural or craps — round is over
    return CasinoPhase.CrapsRoundComplete
  },
}

/**
 * CRAPS_POINT_BETTING: Players place point-phase bets
 * (Come, Don't Come, Place, Field, Odds).
 */
export const crapsPointBettingPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    const state = adapted.getState()
    adapted.dispatch('setDealerMessage', `Point is ${state.craps?.point}. Place your bets!`)
    // Reset confirmation and roll flags
    adapted.dispatch('crapsSetRollComplete', false)
    adapted.dispatch('crapsSetResolutionComplete', false)
    if (state.craps) {
      for (const player of state.craps.players) {
        adapted.dispatch('crapsSetPlayerConfirmed', player.playerId, false)
      }
    }
    // Reset the allBetsPlaced flags for this new betting round
    const updated = adapted.getState()
    if (updated.craps) {
      // We need to explicitly set these false for the new betting round
      adapted.dispatch('crapsSetAllBetsPlaced', false)
    }
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.craps?.allPointBetsPlaced === true
  },
  next: CasinoPhase.CrapsPointRoll,
}

/**
 * CRAPS_POINT_ROLL: Shooter rolls the dice during point phase.
 */
export const crapsPointRollPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    adapted.dispatch('crapsSetRollComplete', false)
    await adapted.dispatchThunk('crapsRollDice')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.craps?.rollComplete === true
  },
  next: CasinoPhase.CrapsPointResolution,
}

/**
 * CRAPS_POINT_RESOLUTION: Resolve all point-phase bets.
 * Routes based on outcome: seven-out or point-hit → ROUND_COMPLETE,
 * else → back to POINT_BETTING (loop).
 */
export const crapsPointResolutionPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('crapsResolveCrapsRoll')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.craps?.pointResolutionComplete === true
  },
  next: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    const craps = state.craps
    if (!craps) return CasinoPhase.CrapsRoundComplete

    // Seven-out or point hit ends the round
    if (craps.sevenOut || craps.pointHit) {
      return CasinoPhase.CrapsRoundComplete
    }

    // Neither — loop back to point betting
    return CasinoPhase.CrapsPointBetting
  },
}

/**
 * CRAPS_ROUND_COMPLETE: Sync stats, rotate shooter if seven-out.
 * Uses wrapWithGameNightCheck for v2.1 Game Night integration.
 */
export const crapsRoundCompletePhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    incrementGameNightRoundIfActive(ctx)
    const adapted = adaptPhaseCtx(ctx)
    const state = adapted.getState()

    // Rotate shooter on seven-out
    if (state.craps?.sevenOut) {
      adapted.dispatch('crapsRotateShooter')
    }

    await adapted.dispatchThunk('crapsCompleteRound')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.craps?.roundCompleteReady === true
  },
  next: wrapWithGameNightCheck((ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    if (state.gameChangeRequested) return CasinoPhase.GameSelect

    // Seven-out: new shooter needed
    if (state.craps?.sevenOut) {
      return CasinoPhase.CrapsNewShooter
    }

    // Point hit or natural/craps: same shooter, new come-out
    return CasinoPhase.CrapsComeOutBetting
  }),
}

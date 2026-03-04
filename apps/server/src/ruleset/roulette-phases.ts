/**
 * Roulette phase definitions.
 *
 * Phase flow:
 *   GAME_SELECT → ROULETTE_PLACE_BETS → ROULETTE_NO_MORE_BETS
 *     → ROULETTE_SPIN → ROULETTE_RESULT → ROULETTE_PAYOUT
 *     → ROULETTE_ROUND_COMPLETE → loop
 *
 * Per D-003: ROULETTE_ prefix for all Roulette phases.
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
 * ROULETTE_PLACE_BETS: Players place bets on the roulette board.
 */
export const roulettePlaceBetsPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    const state = adapted.getState()
    const activePlayers = state.players
      .filter((p: any) => p.status !== 'busted' && p.status !== 'sitting_out')
      .map(p => p.id)

    const roundNumber = (state.roulette?.roundNumber ?? 0) + 1
    adapted.dispatch('rouletteInitRound', activePlayers, roundNumber)
    adapted.dispatch('setDealerMessage', 'Place your bets!')

    // Auto-confirm bots' bets so the phase can advance when human players confirm.
    // Bots have no controller UI so they'd otherwise hang the betting phase forever.
    const updatedState = adapted.getState()
    const botPlayers = updatedState.players.filter((p: any) => p.isBot)
    for (const bot of botPlayers) {
      adapted.dispatch('rouletteConfirmBets', bot.id)
    }

    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.roulette?.allBetsPlaced === true
  },
  next: CasinoPhase.RouletteNoMoreBets,
}

/**
 * ROULETTE_NO_MORE_BETS: Brief dramatic pause, lock bets.
 */
export const rouletteNoMoreBetsPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    adapted.dispatch('setDealerMessage', 'No more bets!')
    adapted.dispatch('rouletteSetBettingClosed', true)
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.roulette?.bettingClosed === true
  },
  next: CasinoPhase.RouletteSpin,
}

/**
 * ROULETTE_SPIN: Wheel spins, waits for Display animation completion
 * or server hard timeout (8s fallback per RC-6).
 */
export const rouletteSpinPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('rouletteSpinWheel')

    // Auto-complete spin after the thunk runs. The display client can
    // call rouletteCompleteSpinFromClient earlier if animation finishes
    // before this, but in headless/E2E mode there's no display animation.
    // The rouletteSpinWheel thunk schedules an 8s fallback via setTimeout,
    // but VGF phase context is stale by then so ctx.dispatch fails.
    // Setting spinComplete here ensures the phase always advances.
    adapted.dispatch('rouletteSetSpinComplete', true)

    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.roulette?.spinComplete === true
  },
  next: CasinoPhase.RouletteResult,
}

/**
 * ROULETTE_RESULT: Announce the winning number, resolve bets.
 */
export const rouletteResultPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('rouletteResolveBets')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.roulette?.resultAnnounced === true
  },
  next: CasinoPhase.RoulettePayout,
}

/**
 * ROULETTE_PAYOUT: Display payouts, animate chip movements.
 */
export const roulettePayoutPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('rouletteCompletePayout')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.roulette?.payoutComplete === true
  },
  next: CasinoPhase.RouletteRoundComplete,
}

/**
 * ROULETTE_ROUND_COMPLETE: Update history, sync stats, loop or game switch.
 */
export const rouletteRoundCompletePhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    incrementGameNightRoundIfActive(ctx)
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('rouletteCompleteRound')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.roulette?.roundCompleteReady === true
  },
  next: wrapWithGameNightCheck((ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    if (state.gameChangeRequested) return CasinoPhase.GameSelect
    return CasinoPhase.RoulettePlaceBets
  }),
}

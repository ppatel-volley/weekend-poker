/**
 * Three Card Poker phase definitions.
 *
 * Phase flow:
 *   GAME_SELECT → TCP_PLACE_BETS → TCP_DEAL_CARDS → TCP_PLAYER_DECISIONS
 *     → TCP_DEALER_REVEAL → TCP_SETTLEMENT → TCP_ROUND_COMPLETE → loop
 *
 * Per D-003: TCP_ prefix for all Three Card Poker phases.
 */

import type { CasinoGameState } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'
import { wrapWithGameNightCheck } from './game-night-utils.js'

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
 * TCP_PLACE_BETS: Players place ante bets and optional Pair Plus.
 */
export const tcpPlaceBetsPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    const state = adapted.getState()
    const activePlayers = state.players
      .filter(p => p.status !== 'busted' && p.status !== 'sitting_out')
      .map(p => p.id)

    const roundNumber = (state.threeCardPoker?.roundNumber ?? 0) + 1
    adapted.dispatch('tcpInitRound', activePlayers, roundNumber)
    adapted.dispatch('setDealerMessage', 'Ante up!')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.threeCardPoker?.allAntesPlaced === true
  },
  next: CasinoPhase.TcpDealCards,
}

/**
 * TCP_DEAL_CARDS: Deal 3 cards to each player and the dealer.
 */
export const tcpDealCardsPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('tcpDealCards')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.threeCardPoker?.dealComplete === true
  },
  next: CasinoPhase.TcpPlayerDecisions,
}

/**
 * TCP_PLAYER_DECISIONS: All players simultaneously choose Play or Fold.
 */
export const tcpPlayerDecisionsPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    adapted.dispatch('setDealerMessage', 'Play or fold!')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.threeCardPoker?.allDecisionsMade === true
  },
  next: CasinoPhase.TcpDealerReveal,
}

/**
 * TCP_DEALER_REVEAL: Reveal dealer's hand and check qualification.
 */
export const tcpDealerRevealPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('tcpRevealDealerHand')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.threeCardPoker?.dealerRevealed === true
  },
  next: CasinoPhase.TcpSettlement,
}

/**
 * TCP_SETTLEMENT: Calculate and apply payouts for all players.
 */
export const tcpSettlementPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('tcpResolvePayout')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.threeCardPoker?.payoutComplete === true
  },
  next: CasinoPhase.TcpRoundComplete,
}

/**
 * TCP_ROUND_COMPLETE: Sync stats, prepare for next round or game switch.
 */
export const tcpRoundCompletePhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('tcpCompleteRound')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.threeCardPoker?.roundCompleteReady === true
  },
  next: wrapWithGameNightCheck((ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    if (state.gameChangeRequested) return CasinoPhase.GameSelect
    return CasinoPhase.TcpPlaceBets
  }),
}

/**
 * Blackjack Competitive phase definitions.
 *
 * Phase flow:
 *   GAME_SELECT -> BJC_PLACE_BETS -> BJC_DEAL_INITIAL -> BJC_PLAYER_TURNS
 *     -> BJC_SHOWDOWN -> BJC_SETTLEMENT -> BJC_HAND_COMPLETE -> loop or GAME_SELECT
 *
 * Per D-003: BJC_ prefix for all Blackjack Competitive phases.
 * Per D-007: Sequential turns, no splits in v1.
 * Per PRD 19: No dealer hand, no insurance, no surrender.
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
 * BJC_PLACE_BETS: Auto-post antes from all players' wallets.
 * Ante = blind level's big blind (per PRD 19.4).
 */
export const bjcPlaceBetsPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    const state = adapted.getState()
    const activePlayers = state.players
      .filter(p => p.status !== 'busted' && p.status !== 'sitting_out')
      .map(p => p.id)

    const roundNumber = (state.blackjackCompetitive?.roundNumber ?? 0) + 1
    const anteAmount = state.blindLevel.bigBlind

    adapted.dispatch('bjcInitRound', activePlayers, roundNumber, anteAmount)
    adapted.dispatch('setDealerMessage', 'Posting antes...')

    // Auto-post antes
    await adapted.dispatchThunk('bjcPostAntes')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    return state.blackjackCompetitive?.allAntesPlaced === true
  },
  next: CasinoPhase.BjcDealInitial,
}

/**
 * BJC_DEAL_INITIAL: Deal 2 cards to each player (no dealer hand).
 */
export const bjcDealInitialPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('bjcDealInitial')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    return state.blackjackCompetitive?.dealComplete === true
  },
  next: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    const bjc = state.blackjackCompetitive

    // If all players have natural blackjack, skip to showdown
    const allBj = bjc?.playerStates.every(ps => ps.hand.isBlackjack) ?? false
    if (allBj) {
      return CasinoPhase.BjcShowdown
    }

    return CasinoPhase.BjcPlayerTurns
  },
}

/**
 * BJC_PLAYER_TURNS: Sequential player decisions (hit/stand/double only).
 * No splits (D-007), no surrender, no insurance (PRD 19.2).
 */
export const bjcPlayerTurnsPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    const state = adapted.getState()
    const bjc = state.blackjackCompetitive

    if (bjc) {
      // Skip players who already have natural blackjack
      let skipCount = 0
      while (skipCount < bjc.playerStates.length) {
        const currentId = bjc.turnOrder[bjc.currentTurnIndex + skipCount]
        const ps = bjc.playerStates.find(p => p.playerId === currentId)
        if (ps && ps.hand.isBlackjack) {
          adapted.dispatch('bjcStandHand', currentId)
          adapted.dispatch('bjcAdvanceTurn')
          skipCount++
        } else {
          break
        }
      }

      // Check if all turns are done after skipping
      const updated = adapted.getState()
      const bjcUpdated = updated.blackjackCompetitive!
      if (bjcUpdated.currentTurnIndex >= bjcUpdated.turnOrder.length) {
        adapted.dispatch('bjcSetPlayerTurnsComplete', true)
      } else {
        adapted.dispatch('setDealerMessage', 'Your turn!')
      }
    }

    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    return state.blackjackCompetitive?.playerTurnsComplete === true
  },
  next: CasinoPhase.BjcShowdown,
}

/**
 * BJC_SHOWDOWN: Reveal all hands.
 */
export const bjcShowdownPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('bjcShowdown')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    return state.blackjackCompetitive?.showdownComplete === true
  },
  next: CasinoPhase.BjcSettlement,
}

/**
 * BJC_SETTLEMENT: Determine winner(s), distribute pot.
 */
export const bjcSettlementPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('bjcSettleBets')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    return state.blackjackCompetitive?.settlementComplete === true
  },
  next: CasinoPhase.BjcHandComplete,
}

/**
 * BJC_HAND_COMPLETE: Clean up, check shoe, loop.
 */
export const bjcHandCompletePhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('bjcCompleteRound')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    return state.blackjackCompetitive?.roundCompleteReady === true
  },
  next: wrapWithGameNightCheck((ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    if (state.gameChangeRequested) return CasinoPhase.GameSelect
    return CasinoPhase.BjcPlaceBets
  }),
}

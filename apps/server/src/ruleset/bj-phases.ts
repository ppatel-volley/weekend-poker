/**
 * Blackjack Classic phase definitions.
 *
 * Phase flow:
 *   GAME_SELECT → BJ_PLACE_BETS → BJ_DEAL_INITIAL → BJ_INSURANCE
 *     → BJ_PLAYER_TURNS → BJ_DEALER_TURN → BJ_SETTLEMENT
 *     → BJ_HAND_COMPLETE → loop or GAME_SELECT
 *
 * Per D-003: BJ_ prefix for all Blackjack Classic phases.
 */

import type { CasinoGameState } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'
import { rankToNumeric } from '@weekend-casino/shared'

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
 * BJ_PLACE_BETS: Players place bets (min 10, max 500 per D-006).
 */
export const bjPlaceBetsPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    const state = adapted.getState()
    const activePlayers = state.players
      .filter(p => p.status !== 'busted' && p.status !== 'sitting_out')
      .map(p => p.id)

    const roundNumber = (state.blackjack?.roundNumber ?? 0) + 1
    adapted.dispatch('bjInitRound', activePlayers, roundNumber)
    adapted.dispatch('setDealerMessage', 'Place your bets!')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    return state.blackjack?.allBetsPlaced === true
  },
  next: CasinoPhase.BjDealInitial,
}

/**
 * BJ_DEAL_INITIAL: Deal 2 cards to each player and dealer.
 * Dealer gets one face up, one face down.
 */
export const bjDealInitialPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('bjDealInitial')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    return state.blackjack?.dealComplete === true
  },
  next: CasinoPhase.BjInsurance,
}

/**
 * BJ_INSURANCE: If dealer shows Ace, offer insurance. Timeout 10s.
 * If dealer doesn't show Ace, skip immediately.
 */
export const bjInsurancePhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    const state = adapted.getState()
    const bj = state.blackjack

    if (!bj) return adapted.getState()

    // Check if dealer's face-up card is an Ace
    const dealerUpCard = bj.dealerHand.cards[0]
    const isAce = dealerUpCard && rankToNumeric(dealerUpCard.rank) === 14

    if (!isAce || !bj.config.insuranceEnabled) {
      await adapted.dispatchThunk('bjSkipInsurance')
    } else {
      adapted.dispatch('setDealerMessage', 'Insurance?')
    }

    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    return state.blackjack?.insuranceComplete === true
  },
  next: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    const bj = state.blackjack

    // If dealer has blackjack, skip player turns and go straight to settlement
    if (bj?.dealerHand.isBlackjack) {
      return CasinoPhase.BjDealerTurn
    }

    // If all players have blackjack, skip player turns
    const allPlayersBj = bj?.playerStates.every(ps => ps.hands[0]?.isBlackjack) ?? false
    if (allPlayersBj) {
      return CasinoPhase.BjDealerTurn
    }

    return CasinoPhase.BjPlayerTurns
  },
}

/**
 * BJ_PLAYER_TURNS: Sequential player decisions (hit/stand/double/split/surrender).
 */
export const bjPlayerTurnsPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    adapted.dispatch('setDealerMessage', 'Your turn!')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    return state.blackjack?.playerTurnsComplete === true
  },
  next: CasinoPhase.BjDealerTurn,
}

/**
 * BJ_DEALER_TURN: Dealer plays per house rules (soft 17 per D-009).
 */
export const bjDealerTurnPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('bjDealerPlay')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    return state.blackjack?.dealerTurnComplete === true
  },
  next: CasinoPhase.BjSettlement,
}

/**
 * BJ_SETTLEMENT: Compare hands, calculate and distribute payouts.
 */
export const bjSettlementPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)
    await adapted.dispatchThunk('bjSettleBets')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    return state.blackjack?.settlementComplete === true
  },
  next: CasinoPhase.BjHandComplete,
}

/**
 * BJ_HAND_COMPLETE: Clean up, check shoe penetration, loop.
 */
export const bjHandCompletePhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const adapted = adaptPhaseCtx(ctx)

    // Check for busted players (wallet depleted) — matching Hold'em's pattern
    const state = adapted.getState()
    for (const player of state.players) {
      const walletBalance = state.wallet[player.id] ?? 0
      if (walletBalance === 0 && player.status !== 'busted') {
        adapted.dispatch('markPlayerBusted', player.id)
      }
    }

    await adapted.dispatchThunk('bjCompleteRound')
    return adapted.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    return state.blackjack?.roundCompleteReady === true
  },
  next: (ctx: any) => {
    const state: CasinoGameState = ctx.session?.state ?? ctx.getState()
    if (state.gameChangeRequested) return CasinoPhase.GameSelect
    return CasinoPhase.BjPlaceBets
  },
}

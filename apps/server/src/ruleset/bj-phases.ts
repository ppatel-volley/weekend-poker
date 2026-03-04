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
import { wrapWithGameNightCheck, incrementGameNightRoundIfActive } from './game-night-utils.js'

/**
 * BJ_PLACE_BETS: Players place bets (min 10, max 500 per D-006).
 */
export const bjPlaceBetsPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    const activePlayers = state.players
      .filter((p: any) => p.status !== 'busted' && p.status !== 'sitting_out')
      .map((p: any) => p.id)

    const roundNumber = (state.blackjack?.roundNumber ?? 0) + 1
    ctx.reducerDispatcher('bjInitRound', activePlayers, roundNumber)
    ctx.reducerDispatcher('setDealerMessage', 'Place your bets!')

    // Auto-place minimum bet for bots — use reducers directly (dispatchThunk unreliable in onBegin, learning 009)
    const afterInit: CasinoGameState = ctx.getState()
    const minBet = afterInit.blackjack?.config.minBet ?? 10
    const botPlayers = afterInit.players.filter((p: any) => p.isBot && p.status !== 'busted' && p.status !== 'sitting_out')
    for (const bot of botPlayers) {
      ctx.reducerDispatcher('bjPlaceBet', bot.id, minBet)
      ctx.reducerDispatcher('updateWallet', bot.id, -minBet)
    }

    // Check if all bets placed after bot auto-bets
    if (botPlayers.length > 0) {
      const postBotState: CasinoGameState = ctx.getState()
      const bj = postBotState.blackjack
      if (bj && bj.playerStates.every((ps: any) => ps.hands[0]?.bet > 0)) {
        ctx.reducerDispatcher('bjSetAllBetsPlaced', true)
      }
    }

    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
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
    await ctx.thunkDispatcher('bjDealInitial')
    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
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
    const state: CasinoGameState = ctx.getState()
    const bj = state.blackjack

    if (!bj) return ctx.getState()

    // Check if dealer's face-up card is an Ace
    const dealerUpCard = bj.dealerHand.cards[0]
    const isAce = dealerUpCard && rankToNumeric(dealerUpCard.rank) === 14

    if (!isAce || !bj.config.insuranceEnabled) {
      await ctx.thunkDispatcher('bjSkipInsurance')
    } else {
      ctx.reducerDispatcher('setDealerMessage', 'Insurance?')
    }

    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.blackjack?.insuranceComplete === true
  },
  next: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    const bj = state.blackjack

    // If dealer has blackjack, skip player turns and go straight to settlement
    if (bj?.dealerHand.isBlackjack) {
      return CasinoPhase.BjDealerTurn
    }

    // If all players have blackjack, skip player turns
    const allPlayersBj = bj?.playerStates.every((ps: any) => ps.hands[0]?.isBlackjack) ?? false
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
    ctx.reducerDispatcher('setDealerMessage', 'Your turn!')

    // Auto-stand bots — use reducers directly (dispatchThunk unreliable in onBegin, learning 009)
    // Loop: keep auto-standing while the current turn player is a bot
    let state: CasinoGameState = ctx.getState()
    while (state.blackjack) {
      const bj = state.blackjack
      if (bj.currentTurnIndex >= bj.turnOrder.length) break
      const currentPlayerId = bj.turnOrder[bj.currentTurnIndex]
      const currentPlayer = state.players.find((p: any) => p.id === currentPlayerId)
      if (!currentPlayer?.isBot) break
      const ps = bj.playerStates.find((p: any) => p.playerId === currentPlayerId)
      if (ps && !ps.hands[0]?.stood && !ps.hands[0]?.busted) {
        ctx.reducerDispatcher('bjStandHand', currentPlayerId)
        ctx.reducerDispatcher('bjAdvanceTurn')
      } else {
        break
      }
      state = ctx.getState()
    }

    // Check if all turns are now complete after bot auto-stands
    const finalState: CasinoGameState = ctx.getState()
    const bjFinal = finalState.blackjack
    if (bjFinal && bjFinal.currentTurnIndex >= bjFinal.turnOrder.length) {
      ctx.reducerDispatcher('bjSetPlayerTurnsComplete', true)
    }

    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
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
    await ctx.thunkDispatcher('bjDealerPlay')
    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
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
    await ctx.thunkDispatcher('bjSettleBets')
    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
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
    // Check for busted players (wallet depleted) — matching Hold'em's pattern
    const state: CasinoGameState = ctx.getState()
    for (const player of state.players) {
      const walletBalance = state.wallet[player.id] ?? 0
      if (walletBalance === 0 && player.status !== 'busted') {
        ctx.reducerDispatcher('markPlayerBusted', player.id)
      }
    }

    incrementGameNightRoundIfActive(ctx)
    await ctx.thunkDispatcher('bjCompleteRound')
    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.blackjack?.roundCompleteReady === true
  },
  next: wrapWithGameNightCheck((ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    if (state.gameChangeRequested) return CasinoPhase.GameSelect
    return CasinoPhase.BjPlaceBets
  }),
}

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
import { wrapWithGameNightCheck, incrementGameNightRoundIfActive } from './game-night-utils.js'

/**
 * BJC_PLACE_BETS: Auto-post antes from all players' wallets.
 * Ante = blind level's big blind (per PRD 19.4).
 */
export const bjcPlaceBetsPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: async (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    const activePlayers = state.players
      .filter((p: any) => p.status !== 'busted' && p.status !== 'sitting_out')
      .map((p: any) => p.id)

    const roundNumber = (state.blackjackCompetitive?.roundNumber ?? 0) + 1
    const anteAmount = state.blindLevel.bigBlind

    ctx.reducerDispatcher('bjcInitRound', activePlayers, roundNumber, anteAmount)
    ctx.reducerDispatcher('setDealerMessage', 'Posting antes...')

    // Auto-post antes
    await ctx.thunkDispatcher('bjcPostAntes')
    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
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
    await ctx.thunkDispatcher('bjcDealInitial')
    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.blackjackCompetitive?.dealComplete === true
  },
  next: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    const bjc = state.blackjackCompetitive

    // If all players have natural blackjack, skip to showdown
    const allBj = bjc?.playerStates.every((ps: any) => ps.hand.isBlackjack) ?? false
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
  onBegin: async (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    const bjc = state.blackjackCompetitive

    if (bjc) {
      // Skip players who already have natural blackjack
      let skipCount = 0
      while (skipCount < bjc.playerStates.length) {
        const currentId = bjc.turnOrder[bjc.currentTurnIndex + skipCount]
        const ps = bjc.playerStates.find((p: any) => p.playerId === currentId)
        if (ps && ps.hand.isBlackjack) {
          ctx.reducerDispatcher('bjcStandHand', currentId)
          ctx.reducerDispatcher('bjcAdvanceTurn')
          skipCount++
        } else {
          break
        }
      }

      // Check if all turns are done after skipping
      const updated: CasinoGameState = ctx.getState()
      const bjcUpdated = updated.blackjackCompetitive!
      if (bjcUpdated.currentTurnIndex >= bjcUpdated.turnOrder.length) {
        ctx.reducerDispatcher('bjcSetPlayerTurnsComplete', true)
      } else {
        ctx.reducerDispatcher('setDealerMessage', 'Your turn!')

        // Auto-stand bots whose turn it currently is (they have no controller UI)
        // Loop: keep auto-standing while the current turn player is a bot
        let loopState: CasinoGameState = ctx.getState()
        while (loopState.blackjackCompetitive) {
          const bjcLoop = loopState.blackjackCompetitive
          if (bjcLoop.currentTurnIndex >= bjcLoop.turnOrder.length) break
          const currentPlayerId = bjcLoop.turnOrder[bjcLoop.currentTurnIndex]
          const currentPlayer = loopState.players.find((p: any) => p.id === currentPlayerId)
          if (!currentPlayer?.isBot) break
          const ps = bjcLoop.playerStates.find((p: any) => p.playerId === currentPlayerId)
          if (ps && !ps.hand.stood && !ps.hand.busted) {
            await ctx.thunkDispatcher('bjcStand', currentPlayerId)
          } else {
            break
          }
          loopState = ctx.getState()
        }
      }
    }

    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
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
    await ctx.thunkDispatcher('bjcShowdown')
    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
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
    await ctx.thunkDispatcher('bjcSettleBets')
    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
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
    incrementGameNightRoundIfActive(ctx)
    await ctx.thunkDispatcher('bjcCompleteRound')
    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.blackjackCompetitive?.roundCompleteReady === true
  },
  next: wrapWithGameNightCheck((ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    if (state.gameChangeRequested) return CasinoPhase.GameSelect
    return CasinoPhase.BjcPlaceBets
  }),
}

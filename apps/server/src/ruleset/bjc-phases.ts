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
 *
 * IMPORTANT: All onBegin callbacks use ctx.reducerDispatcher() and direct
 * server-state access instead of ctx.thunkDispatcher(). VGF 4.8.0
 * thunkDispatcher fails silently in onBegin context (Learning 009).
 */

import type { CasinoGameState, Card } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'
import {
  evaluateBlackjackHand,
  isNaturalBlackjack,
  createShoe,
  shuffleShoe,
  calculatePenetration,
  needsReshuffle,
} from '../blackjack-engine/index.js'
import { getServerGameState, setServerGameState } from '../server-game-state.js'
import { determineWinners } from './bjc-thunks.js'
import { wrapWithGameNightCheck, incrementGameNightRoundIfActive } from './game-night-utils.js'

/**
 * BJC_PLACE_BETS: Auto-post antes from all players' wallets.
 * Ante = blind level's big blind (per PRD 19.4).
 */
export const bjcPlaceBetsPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},
  onBegin: (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    const activePlayers = state.players
      .filter((p: any) => p.status !== 'busted' && p.status !== 'sitting_out')
      .map((p: any) => p.id)

    const roundNumber = (state.blackjackCompetitive?.roundNumber ?? 0) + 1
    const anteAmount = state.blindLevel.bigBlind

    ctx.reducerDispatcher('bjcInitRound', activePlayers, roundNumber, anteAmount)
    ctx.reducerDispatcher('setDealerMessage', 'Posting antes...')

    // Inlined from bjcPostAntes thunk — thunkDispatcher fails in onBegin (Learning 009)
    const afterInit: CasinoGameState = ctx.getState()
    const bjc = afterInit.blackjackCompetitive
    if (bjc) {
      const ante = bjc.anteAmount
      const underfundedIds: string[] = []
      for (const ps of bjc.playerStates) {
        const walletBalance = afterInit.wallet[ps.playerId] ?? 0
        if (walletBalance < ante) {
          underfundedIds.push(ps.playerId)
          continue
        }
        ctx.reducerDispatcher('bjcPlaceAnte', ps.playerId, ante)
        ctx.reducerDispatcher('updateWallet', ps.playerId, -ante)
        ctx.reducerDispatcher('bjcAddToPot', ante)
      }

      // Sit out underfunded players and remove them from the BJC round
      for (const pid of underfundedIds) {
        ctx.reducerDispatcher('markPlayerBusted', pid)
        ctx.reducerDispatcher('bjcRemovePlayer', pid)
      }

      ctx.reducerDispatcher('bjcSetAllAntesPlaced', true)
    }

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
  onBegin: (ctx: any) => {
    // Inlined from bjcDealInitial thunk — thunkDispatcher fails in onBegin (Learning 009)
    const state: CasinoGameState = ctx.getState()
    const bjc = state.blackjackCompetitive
    if (!bjc) return ctx.getState()

    const sessionId: string = ctx.session.sessionId
    const serverState = getServerGameState(sessionId)

    // Ensure shoe exists
    if (!serverState.blackjackCompetitive?.shoe || serverState.blackjackCompetitive.shoe.length === 0) {
      const shoe = shuffleShoe(createShoe(6))
      serverState.blackjackCompetitive = {
        ...(serverState.blackjackCompetitive ?? { playerHoleCards: new Map() }),
        shoe,
      }
      setServerGameState(sessionId, serverState)
    }
    const shoe = serverState.blackjackCompetitive!.shoe

    // Deal round-robin: one card to each player, repeat
    const playerCards = new Map<string, Card[]>()
    for (const ps of bjc.playerStates) {
      playerCards.set(ps.playerId, [])
    }

    for (let round = 0; round < 2; round++) {
      for (const ps of bjc.playerStates) {
        const card = shoe.shift()!
        playerCards.get(ps.playerId)!.push(card)
      }
    }

    // Persist shoe state
    serverState.blackjackCompetitive = {
      shoe,
      playerHoleCards: new Map(),
    }
    setServerGameState(sessionId, serverState)

    // Dispatch player hands
    for (const ps of bjc.playerStates) {
      const cards = playerCards.get(ps.playerId)!
      const handValue = evaluateBlackjackHand(cards)
      const isBj = isNaturalBlackjack(cards)
      ctx.reducerDispatcher(
        'bjcSetPlayerCards',
        ps.playerId,
        cards,
        handValue.value,
        handValue.isSoft,
        isBj,
      )
    }

    // Update shoe penetration
    const totalCards = 6 * 52
    const penetration = calculatePenetration(shoe.length, totalCards) * 100
    ctx.reducerDispatcher('bjcSetShoePenetration', penetration)

    ctx.reducerDispatcher('bjcSetDealComplete', true)
    ctx.reducerDispatcher('setDealerMessage', 'Cards dealt! Good luck!')

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
  onBegin: (ctx: any) => {
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

        // Auto-stand bots — use reducers directly (dispatchThunk unreliable in onBegin, learning 009)
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
            ctx.reducerDispatcher('bjcStandHand', currentPlayerId)
            ctx.reducerDispatcher('bjcAdvanceTurn')
          } else {
            break
          }
          loopState = ctx.getState()
        }

        // Check if all turns complete after bot auto-stands
        const afterBots: CasinoGameState = ctx.getState()
        const bjcAfterBots = afterBots.blackjackCompetitive
        if (bjcAfterBots && bjcAfterBots.currentTurnIndex >= bjcAfterBots.turnOrder.length) {
          ctx.reducerDispatcher('bjcSetPlayerTurnsComplete', true)
        }
      }
    }

    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    const bjc = state.blackjackCompetitive
    if (!bjc) return false
    return bjc.playerTurnsComplete === true ||
      bjc.playerStates.every((ps: any) => ps.hand.stood || ps.hand.busted)
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
  onBegin: (ctx: any) => {
    // Inlined from bjcShowdown thunk — thunkDispatcher fails in onBegin (Learning 009)
    ctx.reducerDispatcher('bjcSetShowdownComplete', true)
    ctx.reducerDispatcher('setDealerMessage', 'Showdown!')
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
  onBegin: (ctx: any) => {
    // Inlined from bjcSettleBets thunk — thunkDispatcher fails in onBegin (Learning 009)
    const state: CasinoGameState = ctx.getState()
    const bjc = state.blackjackCompetitive
    if (!bjc) return ctx.getState()

    const { winnerIds, message } = determineWinners(
      bjc.playerStates,
      bjc.turnOrder,
    )

    if (winnerIds.length > 0) {
      const share = Math.floor(bjc.pot / winnerIds.length)
      const remainder = bjc.pot - share * winnerIds.length

      for (let i = 0; i < winnerIds.length; i++) {
        const payout = share + (i === 0 ? remainder : 0)
        ctx.reducerDispatcher('updateWallet', winnerIds[i]!, payout)
      }
    }

    ctx.reducerDispatcher('bjcSetSettlementResult', winnerIds, message)
    ctx.reducerDispatcher('setDealerMessage', message)

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
  onBegin: (ctx: any) => {
    incrementGameNightRoundIfActive(ctx)

    // Inlined from bjcCompleteRound thunk — thunkDispatcher fails in onBegin (Learning 009)
    const state: CasinoGameState = ctx.getState()
    const bjc = state.blackjackCompetitive
    if (bjc) {
      const sessionId: string = ctx.session.sessionId
      const serverState = getServerGameState(sessionId)
      const shoe = serverState.blackjackCompetitive?.shoe

      if (shoe) {
        const totalCards = 6 * 52
        if (needsReshuffle(shoe.length, totalCards)) {
          const newShoe = shuffleShoe(createShoe(6))
          serverState.blackjackCompetitive = {
            shoe: newShoe,
            playerHoleCards: new Map(),
          }
          setServerGameState(sessionId, serverState)
          ctx.reducerDispatcher('setDealerMessage', 'Shuffling the shoe...')
        }
      }
    }

    ctx.reducerDispatcher('bjcSetRoundCompleteReady', true)

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

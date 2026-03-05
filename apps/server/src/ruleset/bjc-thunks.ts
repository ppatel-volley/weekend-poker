/**
 * Blackjack Competitive thunks — async orchestration.
 *
 * Per D-007: Sequential turns, NO splits in v1.
 * Per PRD 19: Players compete against each other for pot.
 * No dealer hand, no insurance, no surrender.
 *
 * Reuses blackjack-engine for hand evaluation and shoe management.
 */

import type { CasinoGameState, Card } from '@weekend-casino/shared'
import {
  evaluateBlackjackHand,
  isNaturalBlackjack,
  canDoubleDown,
  createShoe,
  shuffleShoe,
  calculatePenetration,
  needsReshuffle,
} from '../blackjack-engine/index.js'
import { getServerGameState, setServerGameState } from '../server-game-state.js'
import { validatePlayerIdOrBot } from './security.js'

type ThunkCtx = {
  getState: () => CasinoGameState
  getSessionId: () => string
  getMembers: () => any
  getClientId: () => string
  dispatch: (name: string, ...args: unknown[]) => void
  dispatchThunk: (name: string, ...args: unknown[]) => Promise<void>
  scheduler?: any
  logger?: any
}

/**
 * Inline check-advance logic using only ctx.dispatch (no sub-thunks).
 * VGF's StateSyncSessionHandler may not properly evaluate endIf after
 * sub-thunk dispatches, so we inline the logic as direct reducer calls.
 */
function bjcInlineCheckAdvance(ctx: ThunkCtx): void {
  const state = ctx.getState()
  const bjc = state.blackjackCompetitive
  if (!bjc) return

  // Advance turn (BJC has no splits, so no hand advancement needed)
  ctx.dispatch('bjcAdvanceTurn')

  // Auto-stand consecutive bots after the advance
  let updated = ctx.getState()
  while (updated.blackjackCompetitive) {
    const bjcU = updated.blackjackCompetitive
    if (bjcU.currentTurnIndex >= bjcU.turnOrder.length) break
    const nextPlayerId = bjcU.turnOrder[bjcU.currentTurnIndex]
    const nextPlayer = updated.players.find((p: any) => p.id === nextPlayerId)
    if (!nextPlayer?.isBot) break
    const nextPs = bjcU.playerStates.find((p: any) => p.playerId === nextPlayerId)
    if (nextPs && !nextPs.hand.stood && !nextPs.hand.busted) {
      ctx.dispatch('bjcStandHand', nextPlayerId)
      ctx.dispatch('bjcAdvanceTurn')
    } else {
      break
    }
    updated = ctx.getState()
  }

  // Check if all turns complete
  const finalState = ctx.getState()
  const bjcFinal = finalState.blackjackCompetitive!
  if (bjcFinal.currentTurnIndex >= bjcFinal.turnOrder.length) {
    ctx.dispatch('bjcSetPlayerTurnsComplete', true)
  }
}

/** Ensures a shoe exists in server state for competitive mode. */
function ensureBjcShoe(sessionId: string, numberOfDecks: number = 6): Card[] {
  const serverState = getServerGameState(sessionId)
  if (!serverState.blackjackCompetitive?.shoe || serverState.blackjackCompetitive.shoe.length === 0) {
    const shoe = shuffleShoe(createShoe(numberOfDecks))
    serverState.blackjackCompetitive = {
      ...(serverState.blackjackCompetitive ?? { playerHoleCards: new Map() }),
      shoe,
    }
    setServerGameState(sessionId, serverState)
    return shoe
  }
  return serverState.blackjackCompetitive.shoe
}

/**
 * Determines winner(s) per PRD 19.3-19.5:
 * - Highest hand <= 21 wins
 * - If all bust, lowest hand value wins (closest to 21 from above)
 * - Ties: pot split equally
 * - Tie-break: fewer cards, then first to stand (turnOrder position)
 */
export function determineWinners(
  playerStates: CasinoGameState['blackjackCompetitive'] extends infer T
    ? T extends { playerStates: infer P } ? P : never : never,
  turnOrder: string[],
): { winnerIds: string[]; message: string } {
  type PS = { playerId: string; hand: { value: number; busted: boolean; cards: { length: number }[] | any[] } }
  const states = playerStates as PS[]

  const nonBusted = states.filter(ps => !ps.hand.busted)

  if (nonBusted.length === 1) {
    const winner = nonBusted[0]!
    return {
      winnerIds: [winner.playerId],
      message: `${winner.playerId} wins with ${winner.hand.value}!`,
    }
  }

  if (nonBusted.length > 1) {
    // Sort by: highest value, then fewest cards, then earliest in turn order
    const sorted = [...nonBusted].sort((a, b) => {
      if (b.hand.value !== a.hand.value) return b.hand.value - a.hand.value
      if (a.hand.cards.length !== b.hand.cards.length) return a.hand.cards.length - b.hand.cards.length
      return turnOrder.indexOf(a.playerId) - turnOrder.indexOf(b.playerId)
    })

    const bestValue = sorted[0]!.hand.value
    const winners = sorted.filter(ps => ps.hand.value === bestValue)

    if (winners.length === 1) {
      return {
        winnerIds: [winners[0]!.playerId],
        message: `${winners[0]!.playerId} wins with ${bestValue}!`,
      }
    }

    // Multiple players tied on value — split pot
    return {
      winnerIds: winners.map(w => w.playerId),
      message: `Tie at ${bestValue}! Pot split ${winners.length} ways.`,
    }
  }

  // All players busted — lowest bust value wins (PRD 19.5)
  const allBusted = [...states].sort((a, b) => {
    if (a.hand.value !== b.hand.value) return a.hand.value - b.hand.value
    if (a.hand.cards.length !== b.hand.cards.length) return a.hand.cards.length - b.hand.cards.length
    return turnOrder.indexOf(a.playerId) - turnOrder.indexOf(b.playerId)
  })

  const lowestBust = allBusted[0]!.hand.value
  const bustWinners = allBusted.filter(ps => ps.hand.value === lowestBust)

  if (bustWinners.length === 1) {
    return {
      winnerIds: [bustWinners[0]!.playerId],
      message: `Everyone busted! ${bustWinners[0]!.playerId} takes it with ${lowestBust} — closest to 21.`,
    }
  }

  return {
    winnerIds: bustWinners.map(w => w.playerId),
    message: `Everyone busted! Tied at ${lowestBust}. Pot split ${bustWinners.length} ways.`,
  }
}

export const bjcThunks = {
  /**
   * Auto-post antes for all players from their wallets.
   * Ante = blind level's big blind (per PRD 19.4).
   */
  bjcPostAntes: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const bjc = state.blackjackCompetitive
    if (!bjc) return

    const ante = bjc.anteAmount

    for (const ps of bjc.playerStates) {
      const walletBalance = state.wallet[ps.playerId] ?? 0
      if (walletBalance < ante) continue

      ctx.dispatch('bjcPlaceAnte', ps.playerId, ante)
      ctx.dispatch('updateWallet', ps.playerId, -ante)
      ctx.dispatch('bjcAddToPot', ante)
    }

    ctx.dispatch('bjcSetAllAntesPlaced', true)
  },

  /**
   * Deal 2 cards to each player (no dealer hand per PRD 19.2).
   */
  bjcDealInitial: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const bjc = state.blackjackCompetitive
    if (!bjc) return

    const sessionId = ctx.getSessionId()
    const shoe = ensureBjcShoe(sessionId)

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
    const serverState = getServerGameState(sessionId)
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
      ctx.dispatch(
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
    ctx.dispatch('bjcSetShoePenetration', penetration)

    ctx.dispatch('bjcSetDealComplete', true)
    ctx.dispatch('setDealerMessage', 'Cards dealt! Good luck!')
  },

  /**
   * Player hits — deal one card to their hand.
   */
  bjcHit: async (ctx: ThunkCtx, claimedPlayerId: string) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    const bjc = state.blackjackCompetitive
    if (!bjc) return

    const ps = bjc.playerStates.find(p => p.playerId === playerId)
    if (!ps || ps.hand.stood || ps.hand.busted) return

    const sessionId = ctx.getSessionId()
    const serverState = getServerGameState(sessionId)
    const shoe = serverState.blackjackCompetitive?.shoe
    if (!shoe || shoe.length === 0) return

    const card = shoe.shift()!
    setServerGameState(sessionId, serverState)

    const newCards = [...ps.hand.cards, card]
    const handValue = evaluateBlackjackHand(newCards)

    ctx.dispatch(
      'bjcAddCardToHand',
      playerId,
      card,
      handValue.value,
      handValue.isSoft,
      handValue.isBusted,
    )

    // If busted or 21, auto-advance
    if (handValue.isBusted || handValue.value === 21) {
      bjcInlineCheckAdvance(ctx)
    }
  },

  /**
   * Player stands.
   */
  bjcStand: async (ctx: ThunkCtx, claimedPlayerId: string) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    ctx.dispatch('bjcStandHand', playerId)
    bjcInlineCheckAdvance(ctx)
  },

  /**
   * Player doubles down — one more card, bet doubled, then stand.
   */
  bjcDoubleDown: async (ctx: ThunkCtx, claimedPlayerId: string) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    const bjc = state.blackjackCompetitive
    if (!bjc) return

    const ps = bjc.playerStates.find(p => p.playerId === playerId)
    if (!ps) return

    if (!canDoubleDown(ps.hand.cards)) return

    // Check wallet for additional bet
    const walletBalance = state.wallet[playerId] ?? 0
    if (ps.hand.bet > walletBalance) {
      ctx.dispatch('setBetError', playerId, 'Insufficient chips to double', Date.now() + 3000)
      return
    }

    // Deduct additional bet and add to pot
    ctx.dispatch('updateWallet', playerId, -ps.hand.bet)
    ctx.dispatch('bjcAddToPot', ps.hand.bet)

    const sessionId = ctx.getSessionId()
    const serverState = getServerGameState(sessionId)
    const shoe = serverState.blackjackCompetitive?.shoe
    if (!shoe || shoe.length === 0) return

    const card = shoe.shift()!
    setServerGameState(sessionId, serverState)

    const newCards = [...ps.hand.cards, card]
    const handValue = evaluateBlackjackHand(newCards)

    ctx.dispatch(
      'bjcDoubleDown',
      playerId,
      card,
      handValue.value,
      handValue.isSoft,
      handValue.isBusted,
    )

    bjcInlineCheckAdvance(ctx)
  },

  /**
   * Check if we should advance to next player after action.
   * No splits in competitive mode (D-007) — one hand per player.
   */
  bjcCheckAdvance: async (ctx: ThunkCtx, _playerId: string) => {
    const state = ctx.getState()
    const bjc = state.blackjackCompetitive
    if (!bjc) return

    // Advance turn
    ctx.dispatch('bjcAdvanceTurn')

    // Check if all turns complete
    const updated = ctx.getState()
    const bjcUpdated = updated.blackjackCompetitive!
    if (bjcUpdated.currentTurnIndex >= bjcUpdated.turnOrder.length) {
      ctx.dispatch('bjcSetPlayerTurnsComplete', true)
    }
  },

  /**
   * Showdown — reveal all hands (in competitive, all cards are already visible).
   */
  bjcShowdown: async (ctx: ThunkCtx) => {
    ctx.dispatch('bjcSetShowdownComplete', true)
    ctx.dispatch('setDealerMessage', 'Showdown!')
  },

  /**
   * Settle — determine winner(s) and distribute pot.
   * Per PRD 19.3-19.5.
   */
  bjcSettleBets: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const bjc = state.blackjackCompetitive
    if (!bjc) return

    const { winnerIds, message } = determineWinners(
      bjc.playerStates,
      bjc.turnOrder,
    )

    if (winnerIds.length > 0) {
      const share = Math.floor(bjc.pot / winnerIds.length)
      const remainder = bjc.pot - share * winnerIds.length

      for (let i = 0; i < winnerIds.length; i++) {
        const payout = share + (i === 0 ? remainder : 0)
        ctx.dispatch('updateWallet', winnerIds[i]!, payout)
      }
    }

    ctx.dispatch('bjcSetSettlementResult', winnerIds, message)
    ctx.dispatch('setDealerMessage', message)
  },

  /**
   * Complete the round — check shoe, prepare for next.
   */
  bjcCompleteRound: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const bjc = state.blackjackCompetitive
    if (!bjc) return

    const sessionId = ctx.getSessionId()
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
        ctx.dispatch('setDealerMessage', 'Shuffling the shoe...')
      }
    }

    ctx.dispatch('bjcSetRoundCompleteReady', true)
  },
}

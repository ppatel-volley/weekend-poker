/**
 * Three Card Poker thunks — async orchestration.
 *
 * Per VGF: thunks handle validation, side effects, and multi-dispatch sequences.
 * ctx.dispatch() is synchronous — state visible immediately after.
 */

import type { CasinoGameState, Card } from '@weekend-casino/shared'
import { TCP_MIN_ANTE, TCP_MAX_ANTE, TCP_MAX_PAIR_PLUS } from '@weekend-casino/shared'
import { evaluateTcpHand, dealerQualifies, calculateTcpPayout } from '../tcp-engine/index.js'
import { createDeck, shuffleDeck } from '../poker-engine/deck.js'
import { getServerGameState, setServerGameState } from '../server-game-state.js'
import type { ServerTCPState } from '../server-game-state.js'

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

export const tcpThunks = {
  /**
   * Place an ante bet with validation.
   * Called by controller when player confirms their ante.
   */
  tcpPlaceAnteBet: async (ctx: ThunkCtx, playerId: string, amount: number, pairPlusAmount?: number) => {
    const state = ctx.getState()
    const tcp = state.threeCardPoker
    if (!tcp) return

    // Validate ante range
    if (amount < tcp.config.minAnte || amount > tcp.config.maxAnte) {
      ctx.dispatch('setBetError', playerId, `Ante must be between ${tcp.config.minAnte} and ${tcp.config.maxAnte}`, Date.now() + 3000)
      return
    }

    // Validate wallet balance
    const walletBalance = state.wallet[playerId] ?? 0
    const totalBet = amount + (pairPlusAmount ?? 0)
    if (totalBet > walletBalance) {
      ctx.dispatch('setBetError', playerId, 'Insufficient chips', Date.now() + 3000)
      return
    }

    // Validate Pair Plus range
    if (pairPlusAmount !== undefined && pairPlusAmount > 0) {
      if (pairPlusAmount > tcp.config.maxPairPlus) {
        ctx.dispatch('setBetError', playerId, `Pair Plus max is ${tcp.config.maxPairPlus}`, Date.now() + 3000)
        return
      }
      ctx.dispatch('tcpPlacePairPlus', playerId, pairPlusAmount)
    }

    ctx.dispatch('tcpPlaceAnte', playerId, amount)

    // Check if all players have placed antes
    const updated = ctx.getState()
    const tcpUpdated = updated.threeCardPoker!
    const allPlaced = tcpUpdated.playerHands.every(h => h.anteBet > 0)
    if (allPlaced) {
      ctx.dispatch('tcpSetAllAntesPlaced', true)
    }
  },

  /**
   * Deal cards to all players and the dealer.
   * Shuffles deck, deals 3 cards each, stores secrets server-side.
   */
  tcpDealCards: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const tcp = state.threeCardPoker
    if (!tcp) return

    const sessionId = ctx.getSessionId()
    const deck = shuffleDeck(createDeck())
    let deckIndex = 0

    // Deal 3 cards to each player
    const playerCards = new Map<string, [Card, Card, Card]>()
    for (const hand of tcp.playerHands) {
      const cards: [Card, Card, Card] = [deck[deckIndex]!, deck[deckIndex + 1]!, deck[deckIndex + 2]!]
      playerCards.set(hand.playerId, cards)
      ctx.dispatch('tcpSetPlayerCards', hand.playerId, cards)
      deckIndex += 3
    }

    // Deal 3 cards to dealer
    const dealerCards: [Card, Card, Card] = [deck[deckIndex]!, deck[deckIndex + 1]!, deck[deckIndex + 2]!]
    ctx.dispatch('tcpSetDealerCards', dealerCards)
    deckIndex += 3

    // Evaluate player hands immediately (server knows, clients don't see rank yet)
    for (const hand of tcp.playerHands) {
      const cards = playerCards.get(hand.playerId)!
      const result = evaluateTcpHand(cards)
      ctx.dispatch('tcpSetPlayerHandResult', hand.playerId, result.rank, result.strength)
    }

    // Store server-side secrets
    const serverState = getServerGameState(sessionId)
    serverState.threeCardPoker = {
      deck: deck.slice(deckIndex),
      dealerCards,
      playerCards,
    }
    setServerGameState(sessionId, serverState)

    // Deduct bets from wallets
    for (const hand of tcp.playerHands) {
      const totalBet = hand.anteBet + hand.pairPlusBet
      ctx.dispatch('updateWallet', hand.playerId, -totalBet)
    }

    ctx.dispatch('tcpSetDealComplete', true)
    ctx.dispatch('setDealerMessage', 'Cards dealt! Play or fold.')
  },

  /**
   * Process a player's play/fold decision.
   */
  tcpMakeDecision: async (ctx: ThunkCtx, playerId: string, decision: 'play' | 'fold') => {
    const state = ctx.getState()
    const tcp = state.threeCardPoker
    if (!tcp) return

    const hand = tcp.playerHands.find(h => h.playerId === playerId)
    if (!hand || hand.decision !== 'undecided') return

    ctx.dispatch('tcpSetPlayerDecision', playerId, decision)

    // If playing, deduct the play bet from wallet
    if (decision === 'play') {
      ctx.dispatch('updateWallet', playerId, -hand.anteBet)
    }

    // Check if all players have decided
    const updated = ctx.getState()
    const tcpUpdated = updated.threeCardPoker!
    const allDecided = tcpUpdated.playerHands.every(h => h.decision !== 'undecided')
    if (allDecided) {
      ctx.dispatch('tcpSetAllDecisionsMade', true)
    }
  },

  /**
   * Reveal dealer's hand and evaluate qualification.
   */
  tcpRevealDealerHand: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const tcp = state.threeCardPoker
    if (!tcp) return

    const dealerCards = tcp.dealerHand.cards as [Card, Card, Card]
    const dealerResult = evaluateTcpHand(dealerCards)
    const qualifies = dealerQualifies(dealerResult)

    ctx.dispatch('tcpRevealDealer', dealerResult.rank, dealerResult.strength, qualifies)

    const msg = qualifies
      ? `Dealer shows ${dealerResult.description}. Dealer qualifies!`
      : `Dealer shows ${dealerResult.description}. Dealer does not qualify!`
    ctx.dispatch('setDealerMessage', msg)
  },

  /**
   * Calculate and apply payouts for all players.
   */
  tcpResolvePayout: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const tcp = state.threeCardPoker
    if (!tcp || tcp.dealerHand.handRank === null) return

    const dealerCards = tcp.dealerHand.cards as [Card, Card, Card]
    const dealerResult = evaluateTcpHand(dealerCards)

    for (const hand of tcp.playerHands) {
      const playerCards = hand.cards as [Card, Card, Card]
      const playerResult = evaluateTcpHand(playerCards)

      const payout = calculateTcpPayout(
        playerResult,
        dealerResult,
        hand.anteBet,
        hand.playBet,
        hand.pairPlusBet,
        hand.decision === 'fold',
      )

      ctx.dispatch('tcpSetPlayerPayout',
        hand.playerId,
        payout.anteBonus,
        payout.pairPlusPayout,
        payout.totalReturn,
        payout.netResult,
      )

      // Credit winnings back to wallet
      if (payout.totalReturn > 0) {
        ctx.dispatch('updateWallet', hand.playerId, payout.totalReturn)
      }
    }

    ctx.dispatch('tcpSetPayoutComplete', true)
  },

  /**
   * Complete the round — sync stats, prepare for next round.
   */
  tcpCompleteRound: async (ctx: ThunkCtx) => {
    ctx.dispatch('tcpSetRoundCompleteReady', true)
    ctx.dispatch('setDealerMessage', null)
  },
}

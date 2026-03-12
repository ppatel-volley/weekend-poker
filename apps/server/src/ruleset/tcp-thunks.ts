/**
 * Three Card Poker thunks — async orchestration.
 *
 * Per VGF: thunks handle validation, side effects, and multi-dispatch sequences.
 * await ctx.dispatch() is synchronous — state visible immediately after.
 */

import type { CasinoGameState, Card } from '@weekend-casino/shared'
import { evaluateTcpHand, dealerQualifies, calculateTcpPayout } from '../tcp-engine/index.js'
import { createDeck, shuffleDeck } from '../poker-engine/deck.js'
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

export const tcpThunks = {
  /**
   * Place an ante bet with validation.
   * Called by controller when player confirms their ante.
   */
  tcpPlaceAnteBet: async (ctx: ThunkCtx, claimedPlayerId: string, amount: number, pairPlusAmount?: number) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    const tcp = state.threeCardPoker
    if (!tcp) return

    // Reject invalid bet amounts
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return
    }

    // Validate ante range
    if (amount < tcp.config.minAnte || amount > tcp.config.maxAnte) {
      await ctx.dispatch('setBetError', playerId, `Ante must be between ${tcp.config.minAnte} and ${tcp.config.maxAnte}`, Date.now() + 3000)
      return
    }

    // Validate wallet balance
    const walletBalance = state.wallet[playerId] ?? 0
    const totalBet = amount + (pairPlusAmount ?? 0)
    if (totalBet > walletBalance) {
      await ctx.dispatch('setBetError', playerId, 'Insufficient chips', Date.now() + 3000)
      return
    }

    // Validate Pair Plus range
    if (pairPlusAmount !== undefined && pairPlusAmount > 0) {
      if (pairPlusAmount > tcp.config.maxPairPlus) {
        await ctx.dispatch('setBetError', playerId, `Pair Plus max is ${tcp.config.maxPairPlus}`, Date.now() + 3000)
        return
      }
      await ctx.dispatch('tcpPlacePairPlus', playerId, pairPlusAmount)
    }

    await ctx.dispatch('tcpPlaceAnte', playerId, amount)

    // Check if all players have placed antes
    const updated = ctx.getState()
    const tcpUpdated = updated.threeCardPoker!
    const allPlaced = tcpUpdated.playerHands.every(h => h.anteBet > 0)
    if (allPlaced) {
      await ctx.dispatch('tcpSetAllAntesPlaced', true)
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
      await ctx.dispatch('tcpSetPlayerCards', hand.playerId, cards)
      deckIndex += 3
    }

    // Deal 3 cards to dealer
    const dealerCards: [Card, Card, Card] = [deck[deckIndex]!, deck[deckIndex + 1]!, deck[deckIndex + 2]!]
    await ctx.dispatch('tcpSetDealerCards', dealerCards)
    deckIndex += 3

    // Evaluate player hands immediately (server knows, clients don't see rank yet)
    for (const hand of tcp.playerHands) {
      const cards = playerCards.get(hand.playerId)!
      const result = evaluateTcpHand(cards)
      await ctx.dispatch('tcpSetPlayerHandResult', hand.playerId, result.rank, result.strength)
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
      await ctx.dispatch('updateWallet', hand.playerId, -totalBet)
    }

    await ctx.dispatch('tcpSetDealComplete', true)
    await ctx.dispatch('setDealerMessage', 'Cards dealt! Play or fold.')
  },

  /**
   * Process a player's play/fold decision.
   */
  tcpMakeDecision: async (ctx: ThunkCtx, claimedPlayerId: string, decision: 'play' | 'fold') => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    const tcp = state.threeCardPoker
    if (!tcp) return

    const hand = tcp.playerHands.find(h => h.playerId === playerId)
    if (!hand || hand.decision !== 'undecided') return

    // If playing, validate wallet can cover the play bet before committing
    if (decision === 'play') {
      const walletBalance = state.wallet[playerId] ?? 0
      if (walletBalance < hand.anteBet) {
        // Insufficient funds — auto-fold instead
        await ctx.dispatch('tcpSetPlayerDecision', playerId, 'fold')
      } else {
        await ctx.dispatch('tcpSetPlayerDecision', playerId, 'play')
        await ctx.dispatch('updateWallet', playerId, -hand.anteBet)
      }
    } else {
      await ctx.dispatch('tcpSetPlayerDecision', playerId, decision)
    }

    // Check if all players have decided
    const updated = ctx.getState()
    const tcpUpdated = updated.threeCardPoker!
    const allDecided = tcpUpdated.playerHands.every(h => h.decision !== 'undecided')
    if (allDecided) {
      await ctx.dispatch('tcpSetAllDecisionsMade', true)
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

    await ctx.dispatch('tcpRevealDealer', dealerResult.rank, dealerResult.strength, qualifies)

    const msg = qualifies
      ? `Dealer shows ${dealerResult.description}. Dealer qualifies!`
      : `Dealer shows ${dealerResult.description}. Dealer does not qualify!`
    await ctx.dispatch('setDealerMessage', msg)
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

      await ctx.dispatch('tcpSetPlayerPayout',
        hand.playerId,
        payout.anteBonus,
        payout.pairPlusPayout,
        payout.totalReturn,
        payout.netResult,
      )

      // Credit winnings back to wallet
      if (payout.totalReturn > 0) {
        await ctx.dispatch('updateWallet', hand.playerId, payout.totalReturn)
      }
    }

    await ctx.dispatch('tcpSetPayoutComplete', true)
  },

  /**
   * Complete the round — sync stats, prepare for next round.
   */
  tcpCompleteRound: async (ctx: ThunkCtx) => {
    // Reset per-phase completion flags BEFORE marking round complete.
    // VGF's PhaseRunner2 checks endIf BEFORE running onBegin — stale flags
    // cause infinite cascade (OOM). See bj-reducers.ts bjResetPhaseFlags.
    await ctx.dispatch('tcpResetPhaseFlags')
    await ctx.dispatch('tcpSetRoundCompleteReady', true)
    await ctx.dispatch('setDealerMessage', null)
  },
}

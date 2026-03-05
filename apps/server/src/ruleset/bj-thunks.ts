/**
 * Blackjack Classic thunks — async orchestration.
 *
 * Per VGF: thunks handle validation, side effects, and multi-dispatch sequences.
 * ctx.dispatch() is synchronous — state visible immediately after.
 */

import type { CasinoGameState, Card } from '@weekend-casino/shared'
import {
  evaluateBlackjackHand,
  isNaturalBlackjack,
  canSplit,
  canDoubleDown,
  createShoe,
  shuffleShoe,
  calculatePenetration,
  needsReshuffle,
  playDealerHand,
  calculateHandPayout,
  calculateInsurancePayout,
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
function inlineCheckAdvance(ctx: ThunkCtx, playerId: string): void {
  const state = ctx.getState()
  const bj = state.blackjack
  if (!bj) return

  const ps = bj.playerStates.find(p => p.playerId === playerId)
  if (!ps) return

  // Check if current player has more hands to play (splits)
  const nextHandIndex = ps.activeHandIndex + 1
  if (nextHandIndex < ps.hands.length) {
    const nextHand = ps.hands[nextHandIndex]
    if (nextHand && !nextHand.stood && !nextHand.busted) {
      ctx.dispatch('bjAdvanceHand', playerId)
      return
    }
  }

  // All hands for this player done — advance turn
  ctx.dispatch('bjAdvanceTurn')

  // Auto-stand consecutive bots after the advance
  let updated = ctx.getState()
  while (updated.blackjack) {
    const bjU = updated.blackjack
    if (bjU.currentTurnIndex >= bjU.turnOrder.length) break
    const nextPlayerId = bjU.turnOrder[bjU.currentTurnIndex]
    const nextPlayer = updated.players.find((p: any) => p.id === nextPlayerId)
    if (!nextPlayer?.isBot) break
    const nextPs = bjU.playerStates.find((p: any) => p.playerId === nextPlayerId)
    if (nextPs && !nextPs.hands[0]?.stood && !nextPs.hands[0]?.busted) {
      ctx.dispatch('bjStandHand', nextPlayerId)
      ctx.dispatch('bjAdvanceTurn')
    } else {
      break
    }
    updated = ctx.getState()
  }

  // Check if all turns complete
  const finalState = ctx.getState()
  const bjFinal = finalState.blackjack!
  if (bjFinal.currentTurnIndex >= bjFinal.turnOrder.length) {
    ctx.dispatch('bjSetPlayerTurnsComplete', true)
  }
}

/** Ensures a shoe exists in server state, creating one if needed. */
function ensureShoe(sessionId: string, numberOfDecks: number): Card[] {
  const serverState = getServerGameState(sessionId)
  if (!serverState.blackjack?.shoe || serverState.blackjack.shoe.length === 0) {
    const shoe = shuffleShoe(createShoe(numberOfDecks))
    serverState.blackjack = {
      ...(serverState.blackjack ?? { dealerHoleCard: null }),
      shoe,
    }
    setServerGameState(sessionId, serverState)
    return shoe
  }
  return serverState.blackjack.shoe
}

export const bjThunks = {
  /**
   * Place a bet with validation.
   */
  bjPlaceBet: async (ctx: ThunkCtx, claimedPlayerId: string, amount: number) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    const bj = state.blackjack
    if (!bj) return

    const config = bj.config
    if (amount < config.minBet || amount > config.maxBet) {
      ctx.dispatch('setBetError', playerId, `Bet must be between ${config.minBet} and ${config.maxBet}`, Date.now() + 3000)
      return
    }

    const walletBalance = state.wallet[playerId] ?? 0
    if (amount > walletBalance) {
      ctx.dispatch('setBetError', playerId, 'Insufficient chips', Date.now() + 3000)
      return
    }

    ctx.dispatch('bjPlaceBet', playerId, amount)

    // Check if all players have placed bets
    const updated = ctx.getState()
    const bjUpdated = updated.blackjack!
    const allPlaced = bjUpdated.playerStates.every(ps => ps.hands[0]!.bet > 0)
    if (allPlaced) {
      ctx.dispatch('bjSetAllBetsPlaced', true)
    }
  },

  /**
   * Deal initial cards — 2 to each player, 2 to dealer (one face down).
   */
  bjDealInitial: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const bj = state.blackjack
    if (!bj) return

    const sessionId = ctx.getSessionId()
    const shoe = ensureShoe(sessionId, bj.config.numberOfDecks)

    // Deduct bets from wallets
    for (const ps of bj.playerStates) {
      ctx.dispatch('updateWallet', ps.playerId, -ps.hands[0]!.bet)
    }

    // Deal round-robin: one card to each player, then dealer, repeat
    const playerCards = new Map<string, Card[]>()
    for (const ps of bj.playerStates) {
      playerCards.set(ps.playerId, [])
    }
    const dealerCards: Card[] = []

    for (let round = 0; round < 2; round++) {
      for (const ps of bj.playerStates) {
        const card = shoe.shift()!
        playerCards.get(ps.playerId)!.push(card)
      }
      dealerCards.push(shoe.shift()!)
    }

    // Update server state with shoe
    const serverState = getServerGameState(sessionId)
    serverState.blackjack = {
      shoe,
      dealerHoleCard: dealerCards[1]!, // second card is hole card
    }
    setServerGameState(sessionId, serverState)

    // Dispatch player hands
    for (const ps of bj.playerStates) {
      const cards = playerCards.get(ps.playerId)!
      const handValue = evaluateBlackjackHand(cards)
      const isBj = isNaturalBlackjack(cards)
      ctx.dispatch(
        'bjSetPlayerCards',
        ps.playerId,
        cards,
        handValue.value,
        handValue.isSoft,
        isBj,
      )
    }

    // Dispatch dealer hand (only first card visible)
    const dealerEval = evaluateBlackjackHand(dealerCards)
    const dealerBj = isNaturalBlackjack(dealerCards)
    ctx.dispatch(
      'bjSetDealerCards',
      dealerCards,
      dealerEval.value,
      dealerEval.isSoft,
      dealerBj,
    )

    // Update shoe penetration
    const totalCards = bj.config.numberOfDecks * 52
    const penetration = calculatePenetration(shoe.length, totalCards) * 100
    ctx.dispatch('bjSetShoePenetration', penetration)

    ctx.dispatch('bjSetDealComplete', true)
    ctx.dispatch('setDealerMessage', 'Cards dealt!')
  },

  /**
   * Process insurance decision for a player.
   */
  bjProcessInsurance: async (ctx: ThunkCtx, claimedPlayerId: string, takeInsurance: boolean) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    const bj = state.blackjack
    if (!bj) return

    const ps = bj.playerStates.find(p => p.playerId === playerId)
    if (!ps || ps.insuranceResolved) return

    if (takeInsurance) {
      const insuranceAmount = Math.floor(ps.hands[0]!.bet / 2)
      const walletBalance = state.wallet[playerId] ?? 0
      if (insuranceAmount <= walletBalance) {
        ctx.dispatch('bjSetInsuranceBet', playerId, insuranceAmount)
        ctx.dispatch('updateWallet', playerId, -insuranceAmount)
      } else {
        ctx.dispatch('bjDeclineInsurance', playerId)
      }
    } else {
      ctx.dispatch('bjDeclineInsurance', playerId)
    }

    // Check if all players have resolved insurance
    const updated = ctx.getState()
    const bjUpdated = updated.blackjack!
    const allResolved = bjUpdated.playerStates.every(p => p.insuranceResolved)
    if (allResolved) {
      ctx.dispatch('bjSetInsuranceComplete', true)
    }
  },

  /**
   * Skip insurance phase (when dealer doesn't show Ace).
   */
  bjSkipInsurance: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const bj = state.blackjack
    if (!bj) return

    // Mark all players as resolved
    for (const ps of bj.playerStates) {
      ctx.dispatch('bjDeclineInsurance', ps.playerId)
    }
    ctx.dispatch('bjSetInsuranceComplete', true)
  },

  /**
   * Player hits — deal one card to their active hand.
   */
  bjHit: async (ctx: ThunkCtx, claimedPlayerId: string) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    const bj = state.blackjack
    if (!bj) return

    const ps = bj.playerStates.find(p => p.playerId === playerId)
    if (!ps) return

    const activeHand = ps.hands[ps.activeHandIndex]
    if (!activeHand || activeHand.stood || activeHand.busted) return

    const sessionId = ctx.getSessionId()
    const serverState = getServerGameState(sessionId)
    const shoe = serverState.blackjack?.shoe
    if (!shoe || shoe.length === 0) return

    const card = shoe.shift()!
    setServerGameState(sessionId, serverState)

    const newCards = [...activeHand.cards, card]
    const handValue = evaluateBlackjackHand(newCards)

    ctx.dispatch(
      'bjAddCardToHand',
      playerId,
      card,
      handValue.value,
      handValue.isSoft,
      handValue.isBusted,
    )

    // If busted or 21, auto-advance
    if (handValue.isBusted || handValue.value === 21) {
      inlineCheckAdvance(ctx, playerId)
    }
  },

  /**
   * Player stands on current hand.
   */
  bjStand: async (ctx: ThunkCtx, claimedPlayerId: string) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    ctx.dispatch('bjStandHand', playerId)
    inlineCheckAdvance(ctx, playerId)
  },

  /**
   * Player doubles down — one more card, bet doubled, then stand.
   */
  bjDoubleDown: async (ctx: ThunkCtx, claimedPlayerId: string) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    const bj = state.blackjack
    if (!bj) return

    const ps = bj.playerStates.find(p => p.playerId === playerId)
    if (!ps) return

    const activeHand = ps.hands[ps.activeHandIndex]
    if (!activeHand || !canDoubleDown(activeHand.cards)) return

    // Check wallet for additional bet
    const walletBalance = state.wallet[playerId] ?? 0
    if (activeHand.bet > walletBalance) {
      ctx.dispatch('setBetError', playerId, 'Insufficient chips to double', Date.now() + 3000)
      return
    }

    // Check shoe BEFORE deducting wallet — avoid losing chips without receiving a card
    const sessionId = ctx.getSessionId()
    const serverState = getServerGameState(sessionId)
    const shoe = serverState.blackjack?.shoe
    if (!shoe || shoe.length === 0) return

    // Deduct additional bet (shoe confirmed available)
    ctx.dispatch('updateWallet', playerId, -activeHand.bet)

    const card = shoe.shift()!
    setServerGameState(sessionId, serverState)

    const newCards = [...activeHand.cards, card]
    const handValue = evaluateBlackjackHand(newCards)

    ctx.dispatch(
      'bjDoubleDown',
      playerId,
      card,
      handValue.value,
      handValue.isSoft,
      handValue.isBusted,
    )

    inlineCheckAdvance(ctx, playerId)
  },

  /**
   * Player splits their hand.
   */
  bjSplit: async (ctx: ThunkCtx, claimedPlayerId: string) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    const bj = state.blackjack
    if (!bj || !bj.config.splitEnabled) return

    const ps = bj.playerStates.find(p => p.playerId === playerId)
    if (!ps) return

    const activeHand = ps.hands[ps.activeHandIndex]
    if (!activeHand || !canSplit(activeHand.cards)) return

    // Check split limit
    if (ps.hands.length >= bj.config.maxSplits + 1) return

    // Check wallet for additional bet
    const walletBalance = state.wallet[playerId] ?? 0
    if (activeHand.bet > walletBalance) {
      ctx.dispatch('setBetError', playerId, 'Insufficient chips to split', Date.now() + 3000)
      return
    }

    // Check shoe BEFORE deducting wallet — need 2 cards for split
    const sessionId = ctx.getSessionId()
    const serverState = getServerGameState(sessionId)
    const shoe = serverState.blackjack?.shoe
    if (!shoe || shoe.length < 2) return

    // Deduct additional bet (shoe confirmed available)
    ctx.dispatch('updateWallet', playerId, -activeHand.bet)

    const newCard1 = shoe.shift()!
    const newCard2 = shoe.shift()!
    setServerGameState(sessionId, serverState)

    const hand1Cards = [activeHand.cards[0]!, newCard1]
    const hand2Cards = [activeHand.cards[1]!, newCard2]
    const hand1Val = evaluateBlackjackHand(hand1Cards)
    const hand2Val = evaluateBlackjackHand(hand2Cards)

    ctx.dispatch(
      'bjSplitHand',
      playerId,
      newCard1,
      newCard2,
      hand1Val.value,
      hand1Val.isSoft,
      hand2Val.value,
      hand2Val.isSoft,
    )

    // Check if Ace split — one card only per hand, auto-stand
    const isAceSplit = activeHand.cards[0]!.rank === 'A'
    if (isAceSplit) {
      ctx.dispatch('bjStandHand', playerId)
      // Advance to second hand
      ctx.dispatch('bjAdvanceHand', playerId)
      ctx.dispatch('bjStandHand', playerId)
      inlineCheckAdvance(ctx, playerId)
    }
  },

  /**
   * Player surrenders (first two cards only, gets half bet back).
   */
  bjSurrender: async (ctx: ThunkCtx, claimedPlayerId: string) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    const bj = state.blackjack
    if (!bj || !bj.config.surrenderEnabled) return

    const ps = bj.playerStates.find(p => p.playerId === playerId)
    if (!ps) return

    const activeHand = ps.hands[ps.activeHandIndex]
    if (!activeHand || activeHand.cards.length !== 2) return

    ctx.dispatch('bjSurrender', playerId)
    inlineCheckAdvance(ctx, playerId)
  },

  /**
   * Check if we should advance to next hand or next player.
   */
  bjCheckAdvance: async (ctx: ThunkCtx, playerId: string) => {
    const state = ctx.getState()
    const bj = state.blackjack
    if (!bj) return

    const ps = bj.playerStates.find(p => p.playerId === playerId)
    if (!ps) return

    // Check if current player has more hands to play
    const nextHandIndex = ps.activeHandIndex + 1
    if (nextHandIndex < ps.hands.length) {
      const nextHand = ps.hands[nextHandIndex]
      if (nextHand && !nextHand.stood && !nextHand.busted) {
        ctx.dispatch('bjAdvanceHand', playerId)
        return
      }
    }

    // All hands for this player done — advance turn
    ctx.dispatch('bjAdvanceTurn')

    // Check if all turns complete
    const updated = ctx.getState()
    const bjUpdated = updated.blackjack!
    if (bjUpdated.currentTurnIndex >= bjUpdated.turnOrder.length) {
      ctx.dispatch('bjSetPlayerTurnsComplete', true)
    }
  },

  /**
   * Dealer plays out their hand per house rules.
   */
  bjDealerPlay: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const bj = state.blackjack
    if (!bj) return

    const sessionId = ctx.getSessionId()
    const serverState = getServerGameState(sessionId)
    const shoe = serverState.blackjack?.shoe
    if (!shoe) return

    // Check if all players busted or surrendered — dealer doesn't need to play
    const allPlayersDone = bj.playerStates.every(ps =>
      ps.surrendered || ps.hands.every(h => h.busted),
    )

    let finalCards: Card[]
    if (allPlayersDone) {
      finalCards = [...bj.dealerHand.cards]
    } else {
      finalCards = playDealerHand(
        bj.dealerHand.cards,
        shoe,
        bj.config.dealerHitsSoft17,
      )
    }

    setServerGameState(sessionId, serverState)

    const dealerEval = evaluateBlackjackHand(finalCards)
    ctx.dispatch(
      'bjSetDealerFinalHand',
      finalCards,
      dealerEval.value,
      dealerEval.isSoft,
      dealerEval.isBusted,
    )
    ctx.dispatch('bjSetDealerTurnComplete', true)

    const dealerDesc = dealerEval.isBusted
      ? `Dealer busts with ${dealerEval.value}!`
      : `Dealer has ${dealerEval.value}.`
    ctx.dispatch('setDealerMessage', dealerDesc)
  },

  /**
   * Settle all bets — calculate and distribute payouts.
   */
  bjSettleBets: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const bj = state.blackjack
    if (!bj) return

    const dealerCards = bj.dealerHand.cards
    const dealerBj = isNaturalBlackjack(dealerCards as Card[])

    for (const ps of bj.playerStates) {
      let totalPayout = 0

      // Insurance payout
      if (ps.insuranceBet > 0) {
        const insurancePayout = calculateInsurancePayout(ps.insuranceBet, dealerBj)
        totalPayout += insurancePayout
        if (insurancePayout > 0) {
          totalPayout += ps.insuranceBet // return original insurance bet
        }
      }

      // Hand payouts
      for (const hand of ps.hands) {
        if (ps.surrendered) {
          // Surrender: get half bet back (floored to avoid fractional chips)
          totalPayout += Math.floor(hand.bet / 2)
        } else {
          const result = calculateHandPayout(
            hand.cards as Card[],
            dealerCards as Card[],
            hand.bet,
            hand.doubled,
            false, // surrender handled above
            bj.config.blackjackPaysRatio,
          )

          if (result.payout > 0) {
            // Win: return original bet + payout
            const returnBet = hand.doubled ? hand.bet * 2 : hand.bet
            totalPayout += returnBet + result.payout
          } else if (result.isPush) {
            // Push: return original bet
            const returnBet = hand.doubled ? hand.bet * 2 : hand.bet
            totalPayout += returnBet
          }
          // Loss: nothing returned
        }
      }

      const totalWagered = ps.hands.reduce((sum, h) => sum + (h.doubled ? h.bet * 2 : h.bet), 0) + ps.insuranceBet
      const netResult = totalPayout - totalWagered

      ctx.dispatch('bjSetPlayerPayout', ps.playerId, totalPayout, netResult)

      // Credit winnings back to wallet
      if (totalPayout > 0) {
        ctx.dispatch('updateWallet', ps.playerId, totalPayout)
      }
    }

    ctx.dispatch('bjSetSettlementComplete', true)
  },

  /**
   * Complete the round — check shoe penetration, prepare for next round.
   */
  bjCompleteRound: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const bj = state.blackjack
    if (!bj) return

    const sessionId = ctx.getSessionId()
    const serverState = getServerGameState(sessionId)
    const shoe = serverState.blackjack?.shoe

    if (shoe) {
      const totalCards = bj.config.numberOfDecks * 52
      if (needsReshuffle(shoe.length, totalCards, bj.config.reshuffleThreshold)) {
        const newShoe = shuffleShoe(createShoe(bj.config.numberOfDecks))
        serverState.blackjack = { shoe: newShoe, dealerHoleCard: null }
        setServerGameState(sessionId, serverState)
        ctx.dispatch('setDealerMessage', 'Shuffling the shoe...')
      }
    }

    ctx.dispatch('bjSetRoundCompleteReady', true)
  },
}

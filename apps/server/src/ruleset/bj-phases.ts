/**
 * Blackjack Classic phase definitions.
 *
 * Phase flow:
 *   GAME_SELECT → BJ_PLACE_BETS → BJ_DEAL_INITIAL → BJ_INSURANCE
 *     → BJ_PLAYER_TURNS → BJ_DEALER_TURN → BJ_SETTLEMENT
 *     → BJ_HAND_COMPLETE → loop or GAME_SELECT
 *
 * Per D-003: BJ_ prefix for all Blackjack Classic phases.
 *
 * IMPORTANT: All onBegin callbacks use ctx.reducerDispatcher() and direct
 * server-state access instead of ctx.thunkDispatcher(). VGF 4.8.0
 * thunkDispatcher fails silently in onBegin context (Learning 009).
 */

import type { CasinoGameState, Card } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'
import { rankToNumeric } from '@weekend-casino/shared'
import {
  evaluateBlackjackHand,
  isNaturalBlackjack,
  createShoe,
  shuffleShoe,
  calculatePenetration,
  needsReshuffle,
  playDealerHand,
  calculateHandPayout,
  calculateInsurancePayout,
} from '../blackjack-engine/index.js'
import { getServerGameState, setServerGameState } from '../server-game-state.js'
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
    // NOTE: Do NOT deduct wallet here. DEAL_INITIAL deducts all bets uniformly.
    const afterInit: CasinoGameState = ctx.getState()
    const minBet = afterInit.blackjack?.config.minBet ?? 10
    const botPlayers = afterInit.players.filter((p: any) => p.isBot && p.status !== 'busted' && p.status !== 'sitting_out')
    for (const bot of botPlayers) {
      const walletBalance = afterInit.wallet[bot.id] ?? 0
      if (walletBalance < minBet) continue
      ctx.reducerDispatcher('bjPlaceBet', bot.id, minBet)
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
  onBegin: (ctx: any) => {
    // Inlined from bjDealInitial thunk — thunkDispatcher fails in onBegin (Learning 009)
    const state: CasinoGameState = ctx.getState()
    const bj = state.blackjack
    if (!bj) return ctx.getState()

    const sessionId: string = ctx.session.sessionId
    const serverState = getServerGameState(sessionId)

    // Ensure shoe exists
    if (!serverState.blackjack?.shoe || serverState.blackjack.shoe.length === 0) {
      const shoe = shuffleShoe(createShoe(bj.config.numberOfDecks))
      serverState.blackjack = {
        ...(serverState.blackjack ?? { dealerHoleCard: null }),
        shoe,
      }
      setServerGameState(sessionId, serverState)
    }
    const shoe = serverState.blackjack!.shoe

    // Deduct bets from wallets
    for (const ps of bj.playerStates) {
      ctx.reducerDispatcher('updateWallet', ps.playerId, -ps.hands[0]!.bet)
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

    // Update server state with shoe and hole card
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
      ctx.reducerDispatcher(
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
    ctx.reducerDispatcher(
      'bjSetDealerCards',
      dealerCards,
      dealerEval.value,
      dealerEval.isSoft,
      dealerBj,
    )

    // Update shoe penetration
    const totalCards = bj.config.numberOfDecks * 52
    const penetration = calculatePenetration(shoe.length, totalCards) * 100
    ctx.reducerDispatcher('bjSetShoePenetration', penetration)

    ctx.reducerDispatcher('bjSetDealComplete', true)
    ctx.reducerDispatcher('setDealerMessage', 'Cards dealt!')

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
  onBegin: (ctx: any) => {
    // Inlined from bjSkipInsurance thunk — thunkDispatcher fails in onBegin (Learning 009)
    const state: CasinoGameState = ctx.getState()
    const bj = state.blackjack

    if (!bj) return ctx.getState()

    // Check if dealer's face-up card is an Ace
    const dealerUpCard = bj.dealerHand.cards[0]
    const isAce = dealerUpCard && rankToNumeric(dealerUpCard.rank) === 14

    if (!isAce || !bj.config.insuranceEnabled) {
      // Skip insurance — mark all players as declined
      for (const ps of bj.playerStates) {
        ctx.reducerDispatcher('bjDeclineInsurance', ps.playerId)
      }
      ctx.reducerDispatcher('bjSetInsuranceComplete', true)
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
    const bj = state.blackjack
    if (!bj) return false
    return bj.playerTurnsComplete === true ||
      bj.playerStates.every((ps: any) =>
        ps.surrendered || ps.hands.every((h: any) => h.stood || h.busted)
      )
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
  onBegin: (ctx: any) => {
    // Inlined from bjDealerPlay thunk — thunkDispatcher fails in onBegin (Learning 009)
    const state: CasinoGameState = ctx.getState()
    const bj = state.blackjack
    if (!bj) return ctx.getState()

    const sessionId: string = ctx.session.sessionId
    const serverState = getServerGameState(sessionId)
    const shoe = serverState.blackjack?.shoe
    if (!shoe) return ctx.getState()

    // Check if all players busted or surrendered — dealer doesn't need to play
    const allPlayersDone = bj.playerStates.every((ps: any) =>
      ps.surrendered || ps.hands.every((h: any) => h.busted),
    )

    let finalCards: Card[]
    if (allPlayersDone) {
      finalCards = [...bj.dealerHand.cards] as Card[]
    } else {
      finalCards = playDealerHand(
        bj.dealerHand.cards as Card[],
        shoe,
        bj.config.dealerHitsSoft17,
      )
    }

    setServerGameState(sessionId, serverState)

    const dealerEval = evaluateBlackjackHand(finalCards)
    ctx.reducerDispatcher(
      'bjSetDealerFinalHand',
      finalCards,
      dealerEval.value,
      dealerEval.isSoft,
      dealerEval.isBusted,
    )
    ctx.reducerDispatcher('bjSetDealerTurnComplete', true)

    const dealerDesc = dealerEval.isBusted
      ? `Dealer busts with ${dealerEval.value}!`
      : `Dealer has ${dealerEval.value}.`
    ctx.reducerDispatcher('setDealerMessage', dealerDesc)

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
  onBegin: (ctx: any) => {
    // Inlined from bjSettleBets thunk — thunkDispatcher fails in onBegin (Learning 009)
    const state: CasinoGameState = ctx.getState()
    const bj = state.blackjack
    if (!bj) return ctx.getState()

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

      const totalWagered = ps.hands.reduce((sum: number, h: any) => sum + (h.doubled ? h.bet * 2 : h.bet), 0) + ps.insuranceBet
      const netResult = totalPayout - totalWagered

      ctx.reducerDispatcher('bjSetPlayerPayout', ps.playerId, totalPayout, netResult)

      // Credit winnings back to wallet
      if (totalPayout > 0) {
        ctx.reducerDispatcher('updateWallet', ps.playerId, totalPayout)
      }
    }

    ctx.reducerDispatcher('bjSetSettlementComplete', true)

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
  onBegin: (ctx: any) => {
    // Check for busted players (wallet depleted) — matching Hold'em's pattern
    const state: CasinoGameState = ctx.getState()
    for (const player of state.players) {
      const walletBalance = state.wallet[player.id] ?? 0
      if (walletBalance === 0 && player.status !== 'busted') {
        ctx.reducerDispatcher('markPlayerBusted', player.id)
      }
    }

    incrementGameNightRoundIfActive(ctx)

    // Inlined from bjCompleteRound thunk — thunkDispatcher fails in onBegin (Learning 009)
    const bjState: CasinoGameState = ctx.getState()
    const bj = bjState.blackjack
    if (bj) {
      const sessionId: string = ctx.session.sessionId
      const serverState = getServerGameState(sessionId)
      const shoe = serverState.blackjack?.shoe

      if (shoe) {
        const totalCards = bj.config.numberOfDecks * 52
        if (needsReshuffle(shoe.length, totalCards, bj.config.reshuffleThreshold)) {
          const newShoe = shuffleShoe(createShoe(bj.config.numberOfDecks))
          serverState.blackjack = { shoe: newShoe, dealerHoleCard: null }
          setServerGameState(sessionId, serverState)
          ctx.reducerDispatcher('setDealerMessage', 'Shuffling the shoe...')
        }
      }
    }

    ctx.reducerDispatcher('bjSetRoundCompleteReady', true)

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

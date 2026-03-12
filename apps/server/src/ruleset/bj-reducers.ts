/**
 * Blackjack Classic reducers — pure state transitions.
 *
 * Per VGF: reducers are synchronous, pure, and deterministic.
 * No side effects, no Date.now(), no Math.random().
 */

import type {
  CasinoGameState,
  BlackjackGameState,
  BlackjackHand,
  BlackjackDealerHand,
  BlackjackPlayerState,
  BlackjackConfig,
  Card,
} from '@weekend-casino/shared'
import {
  BJ_MIN_BET,
  BJ_MAX_BET,
  BJ_NUMBER_OF_DECKS,
  BJ_RESHUFFLE_THRESHOLD,
  BJ_BLACKJACK_PAYS_RATIO,
  BJ_DEALER_HITS_SOFT_17,
  BJ_MAX_SPLITS,
} from '@weekend-casino/shared'

function createEmptyHand(bet: number): BlackjackHand {
  return {
    cards: [],
    stood: false,
    busted: false,
    isBlackjack: false,
    doubled: false,
    bet,
    value: 0,
    isSoft: false,
  }
}

function createEmptyDealerHand(): BlackjackDealerHand {
  return {
    cards: [],
    holeCardRevealed: false,
    value: 0,
    isSoft: false,
    busted: false,
    isBlackjack: false,
  }
}

function defaultConfig(): BlackjackConfig {
  return {
    minBet: BJ_MIN_BET,
    maxBet: BJ_MAX_BET,
    dealerHitsSoft17: BJ_DEALER_HITS_SOFT_17,
    numberOfDecks: BJ_NUMBER_OF_DECKS,
    reshuffleThreshold: BJ_RESHUFFLE_THRESHOLD,
    blackjackPaysRatio: BJ_BLACKJACK_PAYS_RATIO,
    insuranceEnabled: true,
    surrenderEnabled: true,
    splitEnabled: true,
    maxSplits: BJ_MAX_SPLITS,
  }
}

function createInitialBjState(
  playerIds: string[],
  roundNumber: number,
): BlackjackGameState {
  return {
    playerStates: playerIds.map(playerId => ({
      playerId,
      hands: [createEmptyHand(0)],
      activeHandIndex: 0,
      insuranceBet: 0,
      insuranceResolved: false,
      surrendered: false,
      totalPayout: 0,
      roundResult: 0,
    })),
    dealerHand: createEmptyDealerHand(),
    turnOrder: [...playerIds],
    currentTurnIndex: 0,
    allBetsPlaced: false,
    dealComplete: false,
    insuranceComplete: false,
    playerTurnsComplete: false,
    dealerTurnComplete: false,
    settlementComplete: false,
    roundCompleteReady: false,
    roundNumber,
    shoePenetration: 0,
    config: defaultConfig(),
  }
}

function updateBj(
  state: CasinoGameState,
  updater: (bj: BlackjackGameState) => BlackjackGameState,
): CasinoGameState {
  const bj = state.blackjack
  if (!bj) return state
  return { ...state, blackjack: updater(bj) }
}

function updatePlayerState(
  bj: BlackjackGameState,
  playerId: string,
  updater: (ps: BlackjackPlayerState) => BlackjackPlayerState,
): BlackjackGameState {
  return {
    ...bj,
    playerStates: bj.playerStates.map(ps =>
      ps.playerId === playerId ? updater(ps) : ps,
    ),
  }
}

function updateActiveHand(
  ps: BlackjackPlayerState,
  updater: (hand: BlackjackHand) => BlackjackHand,
): BlackjackPlayerState {
  return {
    ...ps,
    hands: ps.hands.map((h, i) =>
      i === ps.activeHandIndex ? updater(h) : h,
    ),
  }
}

export const bjReducers = {
  /** Initialise or reset BJ sub-state for a new round. */
  bjInitRound: (
    state: CasinoGameState,
    playerIds: string[],
    roundNumber: number,
  ): CasinoGameState => ({
    ...state,
    blackjack: createInitialBjState(playerIds, roundNumber),
  }),

  /** Place a bet for a player. */
  bjPlaceBet: (
    state: CasinoGameState,
    playerId: string,
    amount: number,
  ): CasinoGameState => updateBj(state, bj =>
    updatePlayerState(bj, playerId, ps => ({
      ...ps,
      hands: [createEmptyHand(amount)],
    })),
  ),

  /** Mark all bets as placed. */
  bjSetAllBetsPlaced: (
    state: CasinoGameState,
    placed: boolean,
  ): CasinoGameState => updateBj(state, bj => ({
    ...bj,
    allBetsPlaced: placed,
  })),

  /** Set a player's hand cards. */
  bjSetPlayerCards: (
    state: CasinoGameState,
    playerId: string,
    cards: Card[],
    value: number,
    isSoft: boolean,
    isBlackjack: boolean,
  ): CasinoGameState => updateBj(state, bj =>
    updatePlayerState(bj, playerId, ps => ({
      ...ps,
      hands: ps.hands.map((h, i) =>
        i === 0 ? { ...h, cards, value, isSoft, isBlackjack } : h,
      ),
    })),
  ),

  /** Set dealer's cards. */
  bjSetDealerCards: (
    state: CasinoGameState,
    cards: Card[],
    value: number,
    isSoft: boolean,
    isBlackjack: boolean,
  ): CasinoGameState => updateBj(state, bj => ({
    ...bj,
    dealerHand: { ...bj.dealerHand, cards, value, isSoft, isBlackjack },
  })),

  /** Mark dealing complete. */
  bjSetDealComplete: (
    state: CasinoGameState,
    complete: boolean,
  ): CasinoGameState => updateBj(state, bj => ({
    ...bj,
    dealComplete: complete,
  })),

  /** Set insurance bet for a player. */
  bjSetInsuranceBet: (
    state: CasinoGameState,
    playerId: string,
    amount: number,
  ): CasinoGameState => updateBj(state, bj =>
    updatePlayerState(bj, playerId, ps => ({
      ...ps,
      insuranceBet: amount,
      insuranceResolved: true,
    })),
  ),

  /** Mark a player as having declined insurance. */
  bjDeclineInsurance: (
    state: CasinoGameState,
    playerId: string,
  ): CasinoGameState => updateBj(state, bj =>
    updatePlayerState(bj, playerId, ps => ({
      ...ps,
      insuranceResolved: true,
    })),
  ),

  /** Mark insurance phase complete. */
  bjSetInsuranceComplete: (
    state: CasinoGameState,
    complete: boolean,
  ): CasinoGameState => updateBj(state, bj => ({
    ...bj,
    insuranceComplete: complete,
  })),

  /** Add a card to the current active hand of a player (hit). */
  bjAddCardToHand: (
    state: CasinoGameState,
    playerId: string,
    card: Card,
    newValue: number,
    isSoft: boolean,
    isBusted: boolean,
  ): CasinoGameState => updateBj(state, bj =>
    updatePlayerState(bj, playerId, ps =>
      updateActiveHand(ps, hand => ({
        ...hand,
        cards: [...hand.cards, card],
        value: newValue,
        isSoft,
        busted: isBusted,
        stood: isBusted, // auto-stand on bust
      })),
    ),
  ),

  /** Stand on the current hand. */
  bjStandHand: (
    state: CasinoGameState,
    playerId: string,
  ): CasinoGameState => updateBj(state, bj =>
    updatePlayerState(bj, playerId, ps =>
      updateActiveHand(ps, hand => ({ ...hand, stood: true })),
    ),
  ),

  /** Double down on the current hand. */
  bjDoubleDown: (
    state: CasinoGameState,
    playerId: string,
    card: Card,
    newValue: number,
    isSoft: boolean,
    isBusted: boolean,
  ): CasinoGameState => updateBj(state, bj =>
    updatePlayerState(bj, playerId, ps =>
      updateActiveHand(ps, hand => ({
        ...hand,
        cards: [...hand.cards, card],
        doubled: true,
        value: newValue,
        isSoft,
        busted: isBusted,
        stood: true, // always stand after double
      })),
    ),
  ),

  /** Surrender the hand. */
  bjSurrender: (
    state: CasinoGameState,
    playerId: string,
  ): CasinoGameState => updateBj(state, bj =>
    updatePlayerState(bj, playerId, ps => ({
      ...ps,
      surrendered: true,
      hands: ps.hands.map((h, i) =>
        i === ps.activeHandIndex ? { ...h, stood: true } : h,
      ),
    })),
  ),

  /** Split the current hand into two hands. */
  bjSplitHand: (
    state: CasinoGameState,
    playerId: string,
    newCard1: Card,
    newCard2: Card,
    hand1Value: number,
    hand1Soft: boolean,
    hand2Value: number,
    hand2Soft: boolean,
  ): CasinoGameState => updateBj(state, bj =>
    updatePlayerState(bj, playerId, ps => {
      const currentHand = ps.hands[ps.activeHandIndex]!
      const splitCard = currentHand.cards[0]!
      const originalBet = currentHand.bet

      const hand1: BlackjackHand = {
        cards: [splitCard, newCard1],
        stood: false,
        busted: false,
        isBlackjack: false,
        doubled: false,
        bet: originalBet,
        value: hand1Value,
        isSoft: hand1Soft,
      }

      const hand2: BlackjackHand = {
        cards: [currentHand.cards[1]!, newCard2],
        stood: false,
        busted: false,
        isBlackjack: false,
        doubled: false,
        bet: originalBet,
        value: hand2Value,
        isSoft: hand2Soft,
      }

      const newHands = [...ps.hands]
      newHands.splice(ps.activeHandIndex, 1, hand1, hand2)

      return { ...ps, hands: newHands }
    }),
  ),

  /** Move to the next hand after the current one is resolved. */
  bjAdvanceHand: (
    state: CasinoGameState,
    playerId: string,
  ): CasinoGameState => updateBj(state, bj =>
    updatePlayerState(bj, playerId, ps => ({
      ...ps,
      activeHandIndex: ps.activeHandIndex + 1,
    })),
  ),

  /** Advance to the next player's turn. */
  bjAdvanceTurn: (
    state: CasinoGameState,
  ): CasinoGameState => updateBj(state, bj => ({
    ...bj,
    currentTurnIndex: bj.currentTurnIndex + 1,
  })),

  /** Mark all player turns complete. */
  bjSetPlayerTurnsComplete: (
    state: CasinoGameState,
    complete: boolean,
  ): CasinoGameState => updateBj(state, bj => ({
    ...bj,
    playerTurnsComplete: complete,
  })),

  /** Update dealer hand after dealer plays out. */
  bjSetDealerFinalHand: (
    state: CasinoGameState,
    cards: Card[],
    value: number,
    isSoft: boolean,
    busted: boolean,
  ): CasinoGameState => updateBj(state, bj => ({
    ...bj,
    dealerHand: {
      ...bj.dealerHand,
      cards,
      holeCardRevealed: true,
      value,
      isSoft,
      busted,
    },
  })),

  /** Mark dealer turn complete. */
  bjSetDealerTurnComplete: (
    state: CasinoGameState,
    complete: boolean,
  ): CasinoGameState => updateBj(state, bj => ({
    ...bj,
    dealerTurnComplete: complete,
  })),

  /** Set payout results for a player. */
  bjSetPlayerPayout: (
    state: CasinoGameState,
    playerId: string,
    totalPayout: number,
    roundResult: number,
  ): CasinoGameState => updateBj(state, bj =>
    updatePlayerState(bj, playerId, ps => ({
      ...ps,
      totalPayout,
      roundResult,
    })),
  ),

  /** Mark settlement complete. */
  bjSetSettlementComplete: (
    state: CasinoGameState,
    complete: boolean,
  ): CasinoGameState => updateBj(state, bj => ({
    ...bj,
    settlementComplete: complete,
  })),

  /** Mark round as complete. */
  bjSetRoundCompleteReady: (
    state: CasinoGameState,
    ready: boolean,
  ): CasinoGameState => updateBj(state, bj => ({
    ...bj,
    roundCompleteReady: ready,
  })),

  /** Update shoe penetration percentage. */
  bjSetShoePenetration: (
    state: CasinoGameState,
    penetration: number,
  ): CasinoGameState => updateBj(state, bj => ({
    ...bj,
    shoePenetration: penetration,
  })),

  /**
   * Reset all per-phase completion flags for the next round.
   *
   * VGF's PhaseRunner2 checks endIf BEFORE running onBegin when transitioning
   * phases. If stale flags from a completed round persist (allBetsPlaced=true,
   * dealComplete=true, etc.), endIf returns true immediately — skipping onBegin
   * (which would have reset them via bjInitRound). This creates an infinite
   * phase cascade: BJ_PLACE_BETS → ... → BJ_HAND_COMPLETE → BJ_PLACE_BETS,
   * causing an out-of-memory crash.
   *
   * This reducer MUST be called in bjHandCompletePhase.onBegin BEFORE
   * bjSetRoundCompleteReady to clear stale flags before the phase loops back.
   */
  bjResetPhaseFlags: (
    state: CasinoGameState,
  ): CasinoGameState => updateBj(state, bj => ({
    ...bj,
    allBetsPlaced: false,
    dealComplete: false,
    insuranceComplete: false,
    playerTurnsComplete: false,
    dealerTurnComplete: false,
    settlementComplete: false,
    // NOTE: roundCompleteReady is intentionally NOT reset here —
    // it's the flag that controls THIS phase's endIf.
  })),
}

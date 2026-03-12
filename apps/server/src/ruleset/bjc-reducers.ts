/**
 * Blackjack Competitive reducers — pure state transitions.
 *
 * Per D-007: Sequential turns, NO splits in v1.
 * Per PRD 19: No dealer hand, no insurance, no surrender.
 * Players compete against each other; winner takes pot.
 */

import type {
  CasinoGameState,
  BlackjackCompetitiveGameState,
  BjcPlayerState,
  BlackjackHand,
  Card,
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

function createInitialBjcState(
  playerIds: string[],
  roundNumber: number,
  anteAmount: number,
): BlackjackCompetitiveGameState {
  return {
    playerStates: playerIds.map(playerId => ({
      playerId,
      hand: createEmptyHand(0),
      turnComplete: false,
    })),
    pot: 0,
    turnOrder: [...playerIds],
    currentTurnIndex: 0,
    allAntesPlaced: false,
    dealComplete: false,
    playerTurnsComplete: false,
    showdownComplete: false,
    settlementComplete: false,
    roundCompleteReady: false,
    roundNumber,
    shoePenetration: 0,
    anteAmount,
    winnerIds: [],
    resultMessage: '',
  }
}

function updateBjc(
  state: CasinoGameState,
  updater: (bjc: BlackjackCompetitiveGameState) => BlackjackCompetitiveGameState,
): CasinoGameState {
  const bjc = state.blackjackCompetitive
  if (!bjc) return state
  return { ...state, blackjackCompetitive: updater(bjc) }
}

function updateBjcPlayer(
  bjc: BlackjackCompetitiveGameState,
  playerId: string,
  updater: (ps: BjcPlayerState) => BjcPlayerState,
): BlackjackCompetitiveGameState {
  return {
    ...bjc,
    playerStates: bjc.playerStates.map(ps =>
      ps.playerId === playerId ? updater(ps) : ps,
    ),
  }
}

export const bjcReducers = {
  /** Initialise BJC sub-state for a new round. */
  bjcInitRound: (
    state: CasinoGameState,
    playerIds: string[],
    roundNumber: number,
    anteAmount: number,
  ): CasinoGameState => ({
    ...state,
    blackjackCompetitive: createInitialBjcState(playerIds, roundNumber, anteAmount),
  }),

  /** Set a player's ante bet. */
  bjcPlaceAnte: (
    state: CasinoGameState,
    playerId: string,
    amount: number,
  ): CasinoGameState => updateBjc(state, bjc =>
    updateBjcPlayer(bjc, playerId, ps => ({
      ...ps,
      hand: { ...ps.hand, bet: amount },
    })),
  ),

  /** Add to the pot. */
  bjcAddToPot: (
    state: CasinoGameState,
    amount: number,
  ): CasinoGameState => updateBjc(state, bjc => ({
    ...bjc,
    pot: bjc.pot + amount,
  })),

  /** Mark all antes as placed. */
  bjcSetAllAntesPlaced: (
    state: CasinoGameState,
    placed: boolean,
  ): CasinoGameState => updateBjc(state, bjc => ({
    ...bjc,
    allAntesPlaced: placed,
  })),

  /** Set a player's hand cards after deal. */
  bjcSetPlayerCards: (
    state: CasinoGameState,
    playerId: string,
    cards: Card[],
    value: number,
    isSoft: boolean,
    isBlackjack: boolean,
  ): CasinoGameState => updateBjc(state, bjc =>
    updateBjcPlayer(bjc, playerId, ps => ({
      ...ps,
      hand: { ...ps.hand, cards, value, isSoft, isBlackjack },
    })),
  ),

  /** Mark dealing complete. */
  bjcSetDealComplete: (
    state: CasinoGameState,
    complete: boolean,
  ): CasinoGameState => updateBjc(state, bjc => ({
    ...bjc,
    dealComplete: complete,
  })),

  /** Add a card to a player's hand (hit). */
  bjcAddCardToHand: (
    state: CasinoGameState,
    playerId: string,
    card: Card,
    newValue: number,
    isSoft: boolean,
    isBusted: boolean,
  ): CasinoGameState => updateBjc(state, bjc =>
    updateBjcPlayer(bjc, playerId, ps => ({
      ...ps,
      hand: {
        ...ps.hand,
        cards: [...ps.hand.cards, card],
        value: newValue,
        isSoft,
        busted: isBusted,
        stood: isBusted, // auto-stand on bust
      },
      turnComplete: isBusted,
    })),
  ),

  /** Stand on the current hand. */
  bjcStandHand: (
    state: CasinoGameState,
    playerId: string,
  ): CasinoGameState => updateBjc(state, bjc =>
    updateBjcPlayer(bjc, playerId, ps => ({
      ...ps,
      hand: { ...ps.hand, stood: true },
      turnComplete: true,
    })),
  ),

  /** Double down — one more card, bet doubled, then stand. */
  bjcDoubleDown: (
    state: CasinoGameState,
    playerId: string,
    card: Card,
    newValue: number,
    isSoft: boolean,
    isBusted: boolean,
  ): CasinoGameState => updateBjc(state, bjc =>
    updateBjcPlayer(bjc, playerId, ps => ({
      ...ps,
      hand: {
        ...ps.hand,
        cards: [...ps.hand.cards, card],
        doubled: true,
        value: newValue,
        isSoft,
        busted: isBusted,
        stood: true, // always stand after double
      },
      turnComplete: true,
    })),
  ),

  /** Advance to the next player's turn. */
  bjcAdvanceTurn: (
    state: CasinoGameState,
  ): CasinoGameState => updateBjc(state, bjc => ({
    ...bjc,
    currentTurnIndex: bjc.currentTurnIndex + 1,
  })),

  /** Mark all player turns complete. */
  bjcSetPlayerTurnsComplete: (
    state: CasinoGameState,
    complete: boolean,
  ): CasinoGameState => updateBjc(state, bjc => ({
    ...bjc,
    playerTurnsComplete: complete,
  })),

  /** Mark showdown complete. */
  bjcSetShowdownComplete: (
    state: CasinoGameState,
    complete: boolean,
  ): CasinoGameState => updateBjc(state, bjc => ({
    ...bjc,
    showdownComplete: complete,
  })),

  /** Set settlement results. */
  bjcSetSettlementResult: (
    state: CasinoGameState,
    winnerIds: string[],
    resultMessage: string,
  ): CasinoGameState => updateBjc(state, bjc => ({
    ...bjc,
    winnerIds,
    resultMessage,
    settlementComplete: true,
  })),

  /** Mark round as ready for next hand or game switch. */
  bjcSetRoundCompleteReady: (
    state: CasinoGameState,
    ready: boolean,
  ): CasinoGameState => updateBjc(state, bjc => ({
    ...bjc,
    roundCompleteReady: ready,
  })),

  /** Update shoe penetration percentage. */
  bjcSetShoePenetration: (
    state: CasinoGameState,
    penetration: number,
  ): CasinoGameState => updateBjc(state, bjc => ({
    ...bjc,
    shoePenetration: penetration,
  })),

  /** Remove underfunded players from BJC round (playerStates + turnOrder). */
  bjcRemovePlayer: (
    state: CasinoGameState,
    playerId: string,
  ): CasinoGameState => updateBjc(state, bjc => ({
    ...bjc,
    playerStates: bjc.playerStates.filter(ps => ps.playerId !== playerId),
    turnOrder: bjc.turnOrder.filter(id => id !== playerId),
  })),

  /**
   * Reset all per-phase completion flags for the next round.
   * Same VGF PhaseRunner2 endIf-before-onBegin bug as BJ Classic — see bjResetPhaseFlags.
   */
  bjcResetPhaseFlags: (
    state: CasinoGameState,
  ): CasinoGameState => updateBjc(state, bjc => ({
    ...bjc,
    allAntesPlaced: false,
    dealComplete: false,
    playerTurnsComplete: false,
    showdownComplete: false,
    settlementComplete: false,
  })),
}

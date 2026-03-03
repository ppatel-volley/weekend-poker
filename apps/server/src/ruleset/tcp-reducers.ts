/**
 * Three Card Poker reducers — pure state transitions.
 *
 * Per VGF: reducers are synchronous, pure, and deterministic.
 * No side effects, no Date.now(), no Math.random().
 */

import type { CasinoGameState, Card, TcpHandRank } from '@weekend-casino/shared'
import { TCP_MIN_ANTE, TCP_MAX_ANTE, TCP_MAX_PAIR_PLUS } from '@weekend-casino/shared'

/** Creates a fresh TCP sub-state for a new round. */
function createInitialTcpState(
  playerIds: string[],
  roundNumber: number,
): CasinoGameState['threeCardPoker'] {
  return {
    playerHands: playerIds.map(playerId => ({
      playerId,
      cards: [],
      anteBet: 0,
      playBet: 0,
      pairPlusBet: 0,
      decision: 'undecided' as const,
      handRank: null,
      handStrength: 0,
      anteBonus: 0,
      pairPlusPayout: 0,
      totalPayout: 0,
      roundResult: 0,
    })),
    dealerHand: {
      cards: [],
      revealed: false,
      handRank: null,
      handStrength: 0,
    },
    dealerQualifies: null,
    allAntesPlaced: false,
    dealComplete: false,
    allDecisionsMade: false,
    dealerRevealed: false,
    payoutComplete: false,
    roundCompleteReady: false,
    roundNumber,
    config: {
      minAnte: TCP_MIN_ANTE,
      maxAnte: TCP_MAX_ANTE,
      maxPairPlus: TCP_MAX_PAIR_PLUS,
    },
  }
}

export const tcpReducers = {
  /** Initialise or reset TCP sub-state for a new round. */
  tcpInitRound: (state: CasinoGameState, playerIds: string[], roundNumber: number): CasinoGameState => {
    return {
      ...state,
      threeCardPoker: createInitialTcpState(playerIds, roundNumber),
    }
  },

  /** Place an ante bet for a player. */
  tcpPlaceAnte: (state: CasinoGameState, playerId: string, amount: number): CasinoGameState => {
    const tcp = state.threeCardPoker
    if (!tcp) return state

    return {
      ...state,
      threeCardPoker: {
        ...tcp,
        playerHands: tcp.playerHands.map(h =>
          h.playerId === playerId ? { ...h, anteBet: amount } : h,
        ),
      },
    }
  },

  /** Place a Pair Plus side bet for a player. */
  tcpPlacePairPlus: (state: CasinoGameState, playerId: string, amount: number): CasinoGameState => {
    const tcp = state.threeCardPoker
    if (!tcp) return state

    return {
      ...state,
      threeCardPoker: {
        ...tcp,
        playerHands: tcp.playerHands.map(h =>
          h.playerId === playerId ? { ...h, pairPlusBet: amount } : h,
        ),
      },
    }
  },

  /** Mark all antes as placed (phase transition flag). */
  tcpSetAllAntesPlaced: (state: CasinoGameState, placed: boolean): CasinoGameState => {
    const tcp = state.threeCardPoker
    if (!tcp) return state

    return {
      ...state,
      threeCardPoker: { ...tcp, allAntesPlaced: placed },
    }
  },

  /** Set player cards after dealing. */
  tcpSetPlayerCards: (state: CasinoGameState, playerId: string, cards: Card[]): CasinoGameState => {
    const tcp = state.threeCardPoker
    if (!tcp) return state

    return {
      ...state,
      threeCardPoker: {
        ...tcp,
        playerHands: tcp.playerHands.map(h =>
          h.playerId === playerId ? { ...h, cards } : h,
        ),
      },
    }
  },

  /** Set dealer cards (face-down initially). */
  tcpSetDealerCards: (state: CasinoGameState, cards: Card[]): CasinoGameState => {
    const tcp = state.threeCardPoker
    if (!tcp) return state

    return {
      ...state,
      threeCardPoker: {
        ...tcp,
        dealerHand: { ...tcp.dealerHand, cards },
      },
    }
  },

  /** Mark dealing as complete. */
  tcpSetDealComplete: (state: CasinoGameState, complete: boolean): CasinoGameState => {
    const tcp = state.threeCardPoker
    if (!tcp) return state

    return {
      ...state,
      threeCardPoker: { ...tcp, dealComplete: complete },
    }
  },

  /** Record a player's play/fold decision. */
  tcpSetPlayerDecision: (
    state: CasinoGameState,
    playerId: string,
    decision: 'play' | 'fold',
  ): CasinoGameState => {
    const tcp = state.threeCardPoker
    if (!tcp) return state

    return {
      ...state,
      threeCardPoker: {
        ...tcp,
        playerHands: tcp.playerHands.map(h => {
          if (h.playerId !== playerId) return h
          return {
            ...h,
            decision,
            playBet: decision === 'play' ? h.anteBet : 0,
          }
        }),
      },
    }
  },

  /** Mark all decisions as made (phase transition flag). */
  tcpSetAllDecisionsMade: (state: CasinoGameState, done: boolean): CasinoGameState => {
    const tcp = state.threeCardPoker
    if (!tcp) return state

    return {
      ...state,
      threeCardPoker: { ...tcp, allDecisionsMade: done },
    }
  },

  /** Reveal dealer hand with evaluation results. */
  tcpRevealDealer: (
    state: CasinoGameState,
    handRank: TcpHandRank,
    handStrength: number,
    qualifies: boolean,
  ): CasinoGameState => {
    const tcp = state.threeCardPoker
    if (!tcp) return state

    return {
      ...state,
      threeCardPoker: {
        ...tcp,
        dealerHand: {
          ...tcp.dealerHand,
          revealed: true,
          handRank,
          handStrength,
        },
        dealerQualifies: qualifies,
        dealerRevealed: true,
      },
    }
  },

  /** Set a player's hand evaluation result. */
  tcpSetPlayerHandResult: (
    state: CasinoGameState,
    playerId: string,
    handRank: TcpHandRank,
    handStrength: number,
  ): CasinoGameState => {
    const tcp = state.threeCardPoker
    if (!tcp) return state

    return {
      ...state,
      threeCardPoker: {
        ...tcp,
        playerHands: tcp.playerHands.map(h =>
          h.playerId === playerId ? { ...h, handRank, handStrength } : h,
        ),
      },
    }
  },

  /** Set payout results for a player. */
  tcpSetPlayerPayout: (
    state: CasinoGameState,
    playerId: string,
    anteBonus: number,
    pairPlusPayout: number,
    totalPayout: number,
    roundResult: number,
  ): CasinoGameState => {
    const tcp = state.threeCardPoker
    if (!tcp) return state

    return {
      ...state,
      threeCardPoker: {
        ...tcp,
        playerHands: tcp.playerHands.map(h =>
          h.playerId === playerId
            ? { ...h, anteBonus, pairPlusPayout, totalPayout, roundResult }
            : h,
        ),
      },
    }
  },

  /** Mark payout as complete (phase transition flag). */
  tcpSetPayoutComplete: (state: CasinoGameState, complete: boolean): CasinoGameState => {
    const tcp = state.threeCardPoker
    if (!tcp) return state

    return {
      ...state,
      threeCardPoker: { ...tcp, payoutComplete: complete },
    }
  },

  /** Mark round as complete (phase transition flag). */
  tcpSetRoundCompleteReady: (state: CasinoGameState, ready: boolean): CasinoGameState => {
    const tcp = state.threeCardPoker
    if (!tcp) return state

    return {
      ...state,
      threeCardPoker: { ...tcp, roundCompleteReady: ready },
    }
  },
}

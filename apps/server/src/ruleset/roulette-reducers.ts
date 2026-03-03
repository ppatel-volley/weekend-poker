/**
 * Roulette reducers — pure state transitions.
 *
 * Per VGF: reducers are synchronous, pure, and deterministic.
 * No side effects, no Date.now(), no Math.random().
 */

import type {
  CasinoGameState,
  RouletteBet,
  RouletteHistoryEntry,
  RouletteConfig,
} from '@weekend-casino/shared'
import {
  ROULETTE_MIN_BET,
  ROULETTE_MAX_INSIDE_BET,
  ROULETTE_MAX_OUTSIDE_BET,
  ROULETTE_MAX_TOTAL_BET,
} from '@weekend-casino/shared'

/** Creates a fresh roulette sub-state for a new round. */
function createInitialRouletteState(
  playerIds: string[],
  roundNumber: number,
  previousConfig?: RouletteConfig,
): CasinoGameState['roulette'] {
  return {
    winningNumber: null,
    winningColour: null,
    bets: [],
    players: playerIds.map(playerId => ({
      playerId,
      totalBet: 0,
      totalPayout: 0,
      roundResult: 0,
      betsConfirmed: false,
      favouriteNumbers: [],
    })),
    history: [],
    spinState: 'idle',
    nearMisses: [],
    allBetsPlaced: false,
    bettingClosed: false,
    spinComplete: false,
    resultAnnounced: false,
    payoutComplete: false,
    roundCompleteReady: false,
    roundNumber,
    config: previousConfig ?? {
      minBet: ROULETTE_MIN_BET,
      maxInsideBet: ROULETTE_MAX_INSIDE_BET,
      maxOutsideBet: ROULETTE_MAX_OUTSIDE_BET,
      maxTotalBet: ROULETTE_MAX_TOTAL_BET,
      laPartage: false,
    },
  }
}

export const rouletteReducers = {
  /** Initialise or reset roulette sub-state for a new round. */
  rouletteInitRound: (
    state: CasinoGameState,
    playerIds: string[],
    roundNumber: number,
  ): CasinoGameState => {
    const previousHistory = state.roulette?.history ?? []
    const previousConfig = state.roulette?.config
    // Preserve favourite numbers from previous round
    const previousPlayers = state.roulette?.players ?? []

    const newState = createInitialRouletteState(playerIds, roundNumber, previousConfig)
    newState!.history = previousHistory
    // Carry forward favourite numbers
    for (const player of newState!.players) {
      const prev = previousPlayers.find(p => p.playerId === player.playerId)
      if (prev) {
        player.favouriteNumbers = prev.favouriteNumbers
      }
    }

    return { ...state, roulette: newState }
  },

  /** Place a bet. */
  roulettePlaceBet: (
    state: CasinoGameState,
    bet: RouletteBet,
  ): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state

    return {
      ...state,
      roulette: {
        ...roulette,
        bets: [...roulette.bets, bet],
        players: roulette.players.map(p =>
          p.playerId === bet.playerId
            ? { ...p, totalBet: p.totalBet + bet.amount }
            : p,
        ),
      },
    }
  },

  /** Remove a bet by ID. */
  rouletteRemoveBet: (
    state: CasinoGameState,
    betId: string,
  ): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state

    const bet = roulette.bets.find(b => b.id === betId)
    if (!bet) return state

    return {
      ...state,
      roulette: {
        ...roulette,
        bets: roulette.bets.filter(b => b.id !== betId),
        players: roulette.players.map(p =>
          p.playerId === bet.playerId
            ? { ...p, totalBet: Math.max(0, p.totalBet - bet.amount) }
            : p,
        ),
      },
    }
  },

  /** Clear all bets for a player. */
  rouletteClearPlayerBets: (
    state: CasinoGameState,
    playerId: string,
  ): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state

    return {
      ...state,
      roulette: {
        ...roulette,
        bets: roulette.bets.filter(b => b.playerId !== playerId),
        players: roulette.players.map(p =>
          p.playerId === playerId
            ? { ...p, totalBet: 0 }
            : p,
        ),
      },
    }
  },

  /** Confirm a player's bets. */
  rouletteConfirmBets: (
    state: CasinoGameState,
    playerId: string,
  ): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state

    return {
      ...state,
      roulette: {
        ...roulette,
        players: roulette.players.map(p =>
          p.playerId === playerId
            ? { ...p, betsConfirmed: true }
            : p,
        ),
      },
    }
  },

  /** Set the winning number and colour. */
  rouletteSetWinningNumber: (
    state: CasinoGameState,
    winningNumber: number,
    winningColour: 'red' | 'black' | 'green',
  ): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state

    return {
      ...state,
      roulette: {
        ...roulette,
        winningNumber,
        winningColour,
        spinState: 'spinning',
      },
    }
  },

  /** Set the spin animation state. */
  rouletteSetSpinState: (
    state: CasinoGameState,
    spinState: 'idle' | 'spinning' | 'slowing' | 'stopped',
  ): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state

    return {
      ...state,
      roulette: { ...roulette, spinState },
    }
  },

  /** Mark bet resolution status (won/lost). */
  rouletteResolveBets: (
    state: CasinoGameState,
    resolvedBets: Array<{ betId: string; status: 'won' | 'lost'; payout: number }>,
  ): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state

    return {
      ...state,
      roulette: {
        ...roulette,
        bets: roulette.bets.map(b => {
          const resolution = resolvedBets.find(r => r.betId === b.id)
          if (!resolution) return b
          return { ...b, status: resolution.status, payout: resolution.payout }
        }),
      },
    }
  },

  /** Set player payout results. */
  rouletteSetPlayerPayout: (
    state: CasinoGameState,
    playerId: string,
    totalPayout: number,
    roundResult: number,
  ): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state

    return {
      ...state,
      roulette: {
        ...roulette,
        players: roulette.players.map(p =>
          p.playerId === playerId
            ? { ...p, totalPayout, roundResult }
            : p,
        ),
      },
    }
  },

  /** Set near-miss data. */
  rouletteSetNearMisses: (
    state: CasinoGameState,
    nearMisses: Array<{ playerId: string; betNumber: number }>,
  ): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state

    return {
      ...state,
      roulette: { ...roulette, nearMisses },
    }
  },

  /** Add a history entry. */
  rouletteAddHistory: (
    state: CasinoGameState,
    entry: RouletteHistoryEntry,
  ): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state

    // Keep last 20 entries
    const history = [...roulette.history, entry].slice(-20)

    return {
      ...state,
      roulette: { ...roulette, history },
    }
  },

  /** Set favourite numbers for a player. */
  rouletteSetFavouriteNumbers: (
    state: CasinoGameState,
    playerId: string,
    numbers: number[],
  ): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state

    return {
      ...state,
      roulette: {
        ...roulette,
        players: roulette.players.map(p =>
          p.playerId === playerId
            ? { ...p, favouriteNumbers: numbers.slice(0, 5) }
            : p,
        ),
      },
    }
  },

  // ── Phase transition flags ────────────────────────────────────────

  rouletteSetAllBetsPlaced: (state: CasinoGameState, placed: boolean): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state
    return { ...state, roulette: { ...roulette, allBetsPlaced: placed } }
  },

  rouletteSetBettingClosed: (state: CasinoGameState, closed: boolean): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state
    return { ...state, roulette: { ...roulette, bettingClosed: closed } }
  },

  rouletteSetSpinComplete: (state: CasinoGameState, complete: boolean): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state
    return { ...state, roulette: { ...roulette, spinComplete: complete } }
  },

  rouletteSetResultAnnounced: (state: CasinoGameState, announced: boolean): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state
    return { ...state, roulette: { ...roulette, resultAnnounced: announced } }
  },

  rouletteSetPayoutComplete: (state: CasinoGameState, complete: boolean): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state
    return { ...state, roulette: { ...roulette, payoutComplete: complete } }
  },

  rouletteSetRoundCompleteReady: (state: CasinoGameState, ready: boolean): CasinoGameState => {
    const roulette = state.roulette
    if (!roulette) return state
    return { ...state, roulette: { ...roulette, roundCompleteReady: ready } }
  },
}

/**
 * Craps reducers — pure state transitions.
 *
 * Per VGF: reducers are synchronous, pure, and deterministic.
 * No side effects, no Date.now(), no Math.random().
 */

import type {
  CasinoGameState,
  CrapsBet,
  CrapsComeBet,
  CrapsRollResult,
  CrapsConfig,
} from '@weekend-casino/shared'
import { DEFAULT_CRAPS_CONFIG } from '@weekend-casino/shared'

/** Creates a fresh craps sub-state for a new round. */
function createInitialCrapsState(
  shooterPlayerId: string,
  shooterIndex: number,
  playerIds: string[],
  roundNumber: number,
  previousConfig?: CrapsConfig,
): CasinoGameState['craps'] {
  return {
    shooterPlayerId,
    shooterIndex,
    point: null,
    puckOn: false,
    lastRollDie1: 0,
    lastRollDie2: 0,
    lastRollTotal: 0,
    rollHistory: [],
    bets: [],
    comeBets: [],
    players: playerIds.map(playerId => ({
      playerId,
      totalAtRisk: 0,
      betsConfirmed: false,
      roundResult: 0,
    })),
    sevenOut: false,
    pointHit: false,
    newShooterReady: false,
    allComeOutBetsPlaced: false,
    rollComplete: false,
    comeOutResolutionComplete: false,
    allPointBetsPlaced: false,
    pointResolutionComplete: false,
    roundCompleteReady: false,
    roundNumber,
    config: previousConfig ?? { ...DEFAULT_CRAPS_CONFIG },
  }
}

export const crapsReducers = {
  /** Initialise craps sub-state for a new round with the given shooter. */
  crapsInitRound: (
    state: CasinoGameState,
    shooterPlayerId: string,
    shooterIndex: number,
  ): CasinoGameState => {
    const previousConfig = state.craps?.config
    // Preserve come bets that have established points (they carry over)
    const carryOverComeBets = state.craps?.comeBets.filter(
      cb => cb.comePoint !== null && cb.status === 'active',
    ) ?? []

    const activePlayers = state.players
      .filter(p => p.status !== 'busted' && p.status !== 'sitting_out')
      .map(p => p.id)

    const roundNumber = (state.craps?.roundNumber ?? 0) + 1
    const newCraps = createInitialCrapsState(
      shooterPlayerId,
      shooterIndex,
      activePlayers,
      roundNumber,
      previousConfig,
    )
    // Restore carry-over come bets
    newCraps!.comeBets = carryOverComeBets

    return { ...state, craps: newCraps }
  },

  /** Set the shooter. */
  crapsSetShooter: (
    state: CasinoGameState,
    playerId: string,
    seatIndex: number,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    return {
      ...state,
      craps: { ...craps, shooterPlayerId: playerId, shooterIndex: seatIndex },
    }
  },

  /** Place a standard bet. */
  crapsPlaceBet: (
    state: CasinoGameState,
    bet: CrapsBet,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    return {
      ...state,
      craps: {
        ...craps,
        bets: [...craps.bets, bet],
        players: craps.players.map(p =>
          p.playerId === bet.playerId
            ? { ...p, totalAtRisk: p.totalAtRisk + bet.amount }
            : p,
        ),
      },
    }
  },

  /** Place a Come or Don't Come bet. */
  crapsPlaceComeBet: (
    state: CasinoGameState,
    comeBet: CrapsComeBet,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    return {
      ...state,
      craps: {
        ...craps,
        comeBets: [...craps.comeBets, comeBet],
        players: craps.players.map(p =>
          p.playerId === comeBet.playerId
            ? { ...p, totalAtRisk: p.totalAtRisk + comeBet.amount }
            : p,
        ),
      },
    }
  },

  /** Record the dice roll result. */
  crapsSetRollResult: (
    state: CasinoGameState,
    die1: number,
    die2: number,
    rollNumber: number,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    const total = die1 + die2
    const rollResult: CrapsRollResult = {
      die1,
      die2,
      total,
      rollNumber,
      isHardway: die1 === die2,
    }
    return {
      ...state,
      craps: {
        ...craps,
        lastRollDie1: die1,
        lastRollDie2: die2,
        lastRollTotal: total,
        rollHistory: [...craps.rollHistory, rollResult],
      },
    }
  },

  /** Set the point number (or null to clear). */
  crapsSetPoint: (
    state: CasinoGameState,
    point: number | null,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    return { ...state, craps: { ...craps, point } }
  },

  /** Set the puck ON/OFF status. */
  crapsSetPuckOn: (
    state: CasinoGameState,
    puckOn: boolean,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    return { ...state, craps: { ...craps, puckOn } }
  },

  /** Atomically resolve all bets and come bets (RC-1: single dispatch). */
  crapsResolveBets: (
    state: CasinoGameState,
    resolvedBets: CrapsBet[],
    resolvedComeBets: CrapsComeBet[],
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    return {
      ...state,
      craps: {
        ...craps,
        bets: resolvedBets,
        comeBets: resolvedComeBets,
      },
    }
  },

  /** Set a player's bets-confirmed flag. */
  crapsSetPlayerConfirmed: (
    state: CasinoGameState,
    playerId: string,
    confirmed: boolean,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    return {
      ...state,
      craps: {
        ...craps,
        players: craps.players.map(p =>
          p.playerId === playerId
            ? { ...p, betsConfirmed: confirmed }
            : p,
        ),
      },
    }
  },

  // ── Phase transition flags ────────────────────────────────────────

  crapsSetAllBetsPlaced: (
    state: CasinoGameState,
    placed: boolean,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    // Used for both come-out and point betting phases
    return {
      ...state,
      craps: {
        ...craps,
        allComeOutBetsPlaced: placed,
        allPointBetsPlaced: placed,
      },
    }
  },

  crapsSetRollComplete: (
    state: CasinoGameState,
    complete: boolean,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    return { ...state, craps: { ...craps, rollComplete: complete } }
  },

  crapsSetResolutionComplete: (
    state: CasinoGameState,
    complete: boolean,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    // Used for both come-out and point resolution
    return {
      ...state,
      craps: {
        ...craps,
        comeOutResolutionComplete: complete,
        pointResolutionComplete: complete,
      },
    }
  },

  crapsSetRoundCompleteReady: (
    state: CasinoGameState,
    ready: boolean,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    return { ...state, craps: { ...craps, roundCompleteReady: ready } }
  },

  crapsSetNewShooterReady: (
    state: CasinoGameState,
    ready: boolean,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    return { ...state, craps: { ...craps, newShooterReady: ready } }
  },

  crapsSetSevenOut: (
    state: CasinoGameState,
    sevenOut: boolean,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    return { ...state, craps: { ...craps, sevenOut } }
  },

  crapsSetPointHit: (
    state: CasinoGameState,
    pointHit: boolean,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    return { ...state, craps: { ...craps, pointHit } }
  },

  /** Rotate shooter to the next player clockwise. */
  crapsRotateShooter: (
    state: CasinoGameState,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state

    const activePlayers = state.players
      .filter(p => p.status !== 'busted' && p.status !== 'sitting_out')
    if (activePlayers.length === 0) return state

    const currentIndex = activePlayers.findIndex(p => p.id === craps.shooterPlayerId)
    const nextIndex = (currentIndex + 1) % activePlayers.length
    const nextShooter = activePlayers[nextIndex]!

    return {
      ...state,
      craps: {
        ...craps,
        shooterPlayerId: nextShooter.id,
        shooterIndex: nextShooter.seatIndex ?? nextIndex,
      },
    }
  },

  /** Clear round state for a new round, preserving come bets with established points. */
  crapsClearRound: (
    state: CasinoGameState,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state

    // Come bets with established points carry over
    const carryOverComeBets = craps.comeBets.filter(
      cb => cb.comePoint !== null && cb.status === 'active',
    )

    return {
      ...state,
      craps: {
        ...craps,
        bets: [],
        comeBets: carryOverComeBets,
        sevenOut: false,
        pointHit: false,
        rollComplete: false,
        comeOutResolutionComplete: false,
        pointResolutionComplete: false,
        roundCompleteReady: false,
        newShooterReady: false,
        allComeOutBetsPlaced: false,
        allPointBetsPlaced: false,
        players: craps.players.map(p => ({
          ...p,
          betsConfirmed: false,
          roundResult: 0,
        })),
      },
    }
  },

  /**
   * Reset all per-phase completion flags for the next round.
   * Same VGF PhaseRunner2 endIf-before-onBegin bug as BJ — see bj-reducers.ts bjResetPhaseFlags.
   */
  crapsResetPhaseFlags: (
    state: CasinoGameState,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state
    return {
      ...state,
      craps: {
        ...craps,
        newShooterReady: false,
        allComeOutBetsPlaced: false,
        rollComplete: false,
        comeOutResolutionComplete: false,
        allPointBetsPlaced: false,
        pointResolutionComplete: false,
      },
    }
  },

  /** Return all active come bets at face value (RC-5: game switch). */
  crapsReturnComeBets: (
    state: CasinoGameState,
  ): CasinoGameState => {
    const craps = state.craps
    if (!craps) return state

    return {
      ...state,
      craps: {
        ...craps,
        comeBets: craps.comeBets.map(cb =>
          cb.status === 'active'
            ? { ...cb, status: 'returned' as const }
            : cb,
        ),
      },
    }
  },
}

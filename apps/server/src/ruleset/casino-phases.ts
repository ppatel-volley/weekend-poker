/**
 * Casino shared phases: Lobby and GameSelect.
 *
 * Per TDD-backend Section 11, these phases handle multi-game session setup
 * and game selection before transitioning to game-specific phases.
 */

import type { Phase, IThunkContext } from '@volley/vgf/types'
import type { CasinoGameState, CasinoGame } from '@weekend-casino/shared'
import { CasinoPhase, GAME_FIRST_PHASE } from '@weekend-casino/shared'
import { switchGameServerState } from '../server-game-state.js'

type ThunkCtx = IThunkContext<CasinoGameState>

/**
 * LOBBY phase: Players join, ready up, host confirms start.
 *
 * Transitions to GAME_SELECT when host confirms and minimum players are met.
 */
export const lobbyPhase: Phase<CasinoGameState> = {
  reducers: {
    setLobbyReady: (state, ready: boolean) => ({
      ...state,
      lobbyReady: ready,
    }),
  },

  thunks: {},

  onBegin: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    console.log('[LOBBY] Phase started. Players:', state.players.length)
    ctx.dispatch('setDealerMessage', 'Welcome to Casino Night! Waiting for players...')
  },

  endIf: (ctx: ThunkCtx) => {
    const state = ctx.getState()
    // Transition to GAME_SELECT when:
    // 1. Host (dealer) confirms, AND
    // 2. At least 2 players are ready (minimum for multi-player)
    const readyPlayers = state.players.filter(p => p.isReady).length
    return state.lobbyReady && readyPlayers >= 2
  },

  next: () => CasinoPhase.GameSelect,

  onEnd: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    console.log('[LOBBY] Ending. Transitioning to GAME_SELECT.')
    ctx.dispatch('setDealerMessage', 'Choose your first game!')
  },
}

/**
 * GAME_SELECT phase: Host selects a game, confirms selection.
 *
 * Per D-008 (v1): Host-only game switching. Non-host gets "Only host can select."
 * Per D-001: Single ruleset, game-specific phases routed via GAME_FIRST_PHASE.
 *
 * Transitions to the selected game's first phase when confirmed.
 */
export const gameSelectPhase: Phase<CasinoGameState> = {
  reducers: {
    setSelectedGame: (state, game: CasinoGame) => ({
      ...state,
      selectedGame: game,
      gameSelectConfirmed: false,
    }),

    confirmGameSelection: (state) => ({
      ...state,
      gameSelectConfirmed: true,
    }),
  },

  thunks: {},

  onBegin: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    console.log('[GAME_SELECT] Phase started.')
    ctx.dispatch('setGameChangeRequested', false)
    // Reset game-specific sub-states (server-side)
    switchGameServerState(ctx.getSessionId(), null)
    ctx.dispatch('setDealerMessage', 'Select a game from the menu.')
  },

  endIf: (ctx: ThunkCtx) => {
    const state = ctx.getState()
    // Transition when:
    // 1. A game is selected, AND
    // 2. Selection is confirmed by host
    return state.selectedGame !== null && state.gameSelectConfirmed === true
  },

  next: (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const selectedGame = state.selectedGame!
    const firstPhase = GAME_FIRST_PHASE[selectedGame]
    console.log(`[GAME_SELECT] Transitioning to ${selectedGame}:${firstPhase}`)
    return firstPhase
  },

  onEnd: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const selectedGame = state.selectedGame!
    console.log(`[GAME_SELECT] Initializing server state for ${selectedGame}.`)
    // Initialize server-side game state
    switchGameServerState(ctx.getSessionId(), selectedGame)
    ctx.dispatch('setDealerMessage', null)
  },
}

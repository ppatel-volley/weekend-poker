/**
 * Casino shared phases: Lobby and GameSelect.
 *
 * VGF 4.8.0 phase callback context:
 *   onBegin: ctx.reducerDispatcher(), ctx.thunkDispatcher(), ctx.getState() — NO ctx.dispatch()
 *   onEnd:   ctx.reducerDispatcher(), ctx.thunkDispatcher(), ctx.getState() — NO ctx.dispatch()
 *   endIf:   ctx.session.state — read-only, NO dispatch/getState
 *   next:    ctx.session.state — read-only, NO dispatch/getState
 *
 * onBegin/onEnd MUST return GameState (or Promise<GameState>).
 * NEVER use ctx.dispatch() in any phase callback. Use ctx.reducerDispatcher() or ctx.thunkDispatcher().
 */

import type { CasinoGameState, CasinoGame } from '@weekend-casino/shared'
import { GAME_FIRST_PHASE } from '@weekend-casino/shared'
import { switchGameServerState } from '../server-game-state.js'

/**
 * LOBBY phase: Host joins, selects a game, other players join, host starts.
 *
 * Flow:
 *   1. First player (host) joins, sees game selection + START button
 *   2. Host selects a game and taps START
 *   3. Other players can join before or after — they get added to the game
 *   4. Transitions directly to the selected game's first phase
 *
 * No separate GAME_SELECT phase — lobby handles everything.
 */
export const lobbyPhase = {
  actions: {} as Record<string, never>,
  reducers: {
    setLobbyReady: (state: CasinoGameState, ready: boolean) => ({
      ...state,
      lobbyReady: ready,
    }),
    setSelectedGame: (state: CasinoGameState, game: CasinoGame) => ({
      ...state,
      selectedGame: game,
      gameSelectConfirmed: false,
    }),
    checkLobbyReady: (state: CasinoGameState) => ({
      ...state,
      lobbyReady: true,
    }),
    setPlayerReady: (state: CasinoGameState, playerId: string, ready: boolean) => ({
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, isReady: ready } : p,
      ),
    }),
    _confirmGameSelectionInternal: (state: CasinoGameState) => ({
      ...state,
      gameSelectConfirmed: true,
    }),
  },

  thunks: {},

  onBegin: async (ctx: any) => {
    console.log('[LOBBY] Phase started.')
    // VGF 4.8.0: onBegin has thunkDispatcher but NOT dispatch.
    // Dealer message will be visible from initial state.
    return ctx.getState()
  },

  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    // Game Night mode: transition when GN setup is confirmed
    if (state.gameNight?.active && state.gameNight.setupConfirmed) {
      return true
    }
    // Normal mode: transition when host has selected AND confirmed a game.
    // No minimum player count — host can start solo (bots fill in).
    return state.selectedGame !== null && state.gameSelectConfirmed === true
  },

  next: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    // Game Night mode: route to GN_SETUP
    if (state.gameNight?.active) {
      console.log('[LOBBY] Game Night mode → GN_SETUP')
      return 'GN_SETUP'
    }
    const selectedGame = state.selectedGame!
    const firstPhase = GAME_FIRST_PHASE[selectedGame]
    console.log(`[LOBBY] Starting ${selectedGame} → ${firstPhase}`)
    return firstPhase
  },

  onEnd: async (ctx: any) => {
    const state: CasinoGameState = ctx.getState()

    // Auto-fill empty seats with bots (up to 4 players)
    if (state.autoFillBots) {
      const humanCount = state.players.length
      const botsNeeded = Math.max(0, 2 - humanCount) // At least 2 players total
      for (let i = 0; i < botsNeeded; i++) {
        const seatIndex = humanCount + i
        ctx.reducerDispatcher('addBotPlayer', seatIndex, 'medium')
        console.log(`[LOBBY] Auto-filled bot at seat ${seatIndex}`)
      }
    }

    // Initialize server-side game state before transitioning
    const updatedState: CasinoGameState = ctx.getState()
    if (updatedState?.selectedGame) {
      switchGameServerState(ctx.session.sessionId, updatedState.selectedGame)
      console.log(`[LOBBY] Server state initialized for ${updatedState.selectedGame}`)
    }
    return ctx.getState()
  },
}

/**
 * GAME_SELECT phase: Used for mid-session game switching (between rounds).
 * Initial game selection happens in LOBBY — this phase is for switching games later.
 */
export const gameSelectPhase = {
  actions: {} as Record<string, never>,
  reducers: {
    setSelectedGame: (state: CasinoGameState, game: CasinoGame) => ({
      ...state,
      selectedGame: game,
      gameSelectConfirmed: false,
    }),
    _confirmGameSelectionInternal: (state: CasinoGameState) => ({
      ...state,
      gameSelectConfirmed: true,
    }),
  },

  thunks: {},

  onBegin: async (ctx: any) => {
    console.log('[GAME_SELECT] Phase started.')
    // VGF 4.8.0: NO ctx.dispatch() available in onBegin.
    return ctx.getState()
  },

  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.selectedGame !== null && state.gameSelectConfirmed === true
  },

  next: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    const selectedGame = state.selectedGame!
    const firstPhase = GAME_FIRST_PHASE[selectedGame]
    console.log(`[GAME_SELECT] Transitioning to ${selectedGame}:${firstPhase}`)
    return firstPhase
  },

  onEnd: async (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    if (state?.selectedGame) {
      switchGameServerState(ctx.session.sessionId, state.selectedGame)
    }
    return ctx.getState()
  },
}

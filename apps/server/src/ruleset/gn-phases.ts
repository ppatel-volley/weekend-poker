/**
 * Game Night phase definitions: GN_SETUP, GN_LEADERBOARD, GN_CHAMPION.
 *
 * VGF 4.8.0 phase callback context:
 *   onBegin: ctx.reducerDispatcher(), ctx.thunkDispatcher(), ctx.getState() — NO ctx.dispatch()
 *   onEnd:   ctx.reducerDispatcher(), ctx.thunkDispatcher(), ctx.getState() — NO ctx.dispatch()
 *   endIf:   ctx.session.state — read-only, NO dispatch/getState
 *   next:    ctx.session.state — read-only, NO dispatch/getState
 *
 * onBegin/onEnd MUST return GameState (or Promise<GameState>).
 */

import type { CasinoGameState } from '@weekend-casino/shared'
import { CasinoPhase, GAME_FIRST_PHASE } from '@weekend-casino/shared'
import { switchGameServerState } from '../server-game-state.js'

/**
 * GN_SETUP phase: Host configures Game Night (games, rounds, theme).
 *
 * Flow:
 *   1. Lobby dispatches gnInitGameNight → transitions to GN_SETUP
 *   2. Host configures lineup, rounds per game, theme
 *   3. Host confirms → endIf fires → next routes to first game's first phase
 *   4. onEnd sets selectedGame to first game in lineup and initialises server state
 */
export const gnSetupPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},

  onBegin: async (ctx: any) => {
    console.log('[GN_SETUP] Game Night setup phase started.')
    return ctx.getState()
  },

  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.gameNight?.setupConfirmed === true
  },

  next: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    const lineup = state.gameNight?.gameLineup ?? []
    const firstGame = lineup[0]
    if (!firstGame) {
      console.warn('[GN_SETUP] No games in lineup, returning to lobby.')
      return CasinoPhase.Lobby
    }
    const firstPhase = GAME_FIRST_PHASE[firstGame]
    console.log(`[GN_SETUP] Starting Game Night → ${firstGame} (${firstPhase})`)
    return firstPhase
  },

  onEnd: async (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    const lineup = state.gameNight?.gameLineup ?? []
    const firstGame = lineup[0]

    if (firstGame) {
      // Set selectedGame to the first game in the lineup
      ctx.reducerDispatcher('setSelectedGame', firstGame)
      switchGameServerState(ctx.session.sessionId, firstGame)
      console.log(`[GN_SETUP] Server state initialised for ${firstGame}`)
    }

    return ctx.getState()
  },
}

/**
 * GN_LEADERBOARD phase: Shows scores after each game in Game Night.
 *
 * Flow:
 *   1. wrapWithGameNightCheck routes here when roundLimit is reached
 *   2. onBegin calculates scores for the completed game
 *   3. Auto-advances after GN_LEADERBOARD_DISPLAY_MS (18s) via setTimeout
 *   4. endIf checks leaderboardReady flag
 *   5. next → GN_CHAMPION (if last game) or next game's first phase
 *   6. onEnd advances game index and sets up next game
 */
export const gnLeaderboardPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},

  onBegin: async (ctx: any) => {
    const state: CasinoGameState = ctx.getState()

    if (!state.gameNight?.active) {
      console.warn('[GN_LEADERBOARD] Game Night not active, skipping.')
      return ctx.getState()
    }

    // Calculate scores for the completed game
    // The scoring thunk handles: rank players, calculate scores, update state, add game result
    await ctx.thunkDispatcher('gnCalculateScores')

    // Auto-advance after display timer
    setTimeout(() => {
      try {
        ctx.reducerDispatcher('gnSetLeaderboardReady')
      } catch (_e) {
        // Session may have ended
      }
    }, 18_000)

    return ctx.getState()
  },

  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.gameNight?.leaderboardReady === true
  },

  next: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    const gn = state.gameNight
    if (!gn) return CasinoPhase.Lobby

    const isLastGame = gn.currentGameIndex >= gn.gameLineup.length - 1
    if (isLastGame) {
      console.log('[GN_LEADERBOARD] Last game complete → GN_CHAMPION')
      return CasinoPhase.GnChampion
    }

    // Next game's first phase
    const nextGameIndex = gn.currentGameIndex + 1
    const nextGame = gn.gameLineup[nextGameIndex]
    if (!nextGame) return CasinoPhase.Lobby

    const firstPhase = GAME_FIRST_PHASE[nextGame]
    console.log(`[GN_LEADERBOARD] Advancing to game ${nextGameIndex + 1}/${gn.gameLineup.length} → ${nextGame} (${firstPhase})`)
    return firstPhase
  },

  onEnd: async (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    const gn = state.gameNight
    if (!gn) return ctx.getState()

    const isLastGame = gn.currentGameIndex >= gn.gameLineup.length - 1

    if (!isLastGame) {
      // Advance to next game
      ctx.reducerDispatcher('gnAdvanceGame')

      const updatedState: CasinoGameState = ctx.getState()
      const nextGame = updatedState.gameNight?.gameLineup[updatedState.gameNight.currentGameIndex]
      if (nextGame) {
        ctx.reducerDispatcher('setSelectedGame', nextGame)
        switchGameServerState(ctx.session.sessionId, nextGame)
        console.log(`[GN_LEADERBOARD] Server state initialised for ${nextGame}`)
      }
    }

    return ctx.getState()
  },
}

/**
 * GN_CHAMPION phase: Final ceremony — reveals the winner.
 *
 * Flow:
 *   1. onBegin determines champion (highest total score)
 *   2. Auto-advances after GN_CHAMPION_DISPLAY_MS (30s) via setTimeout
 *   3. endIf checks championReady flag
 *   4. next → LOBBY
 *   5. onEnd clears Game Night state
 */
export const gnChampionPhase = {
  actions: {} as Record<string, never>,
  reducers: {},
  thunks: {},

  onBegin: async (ctx: any) => {
    const state: CasinoGameState = ctx.getState()

    if (!state.gameNight?.active) {
      console.warn('[GN_CHAMPION] Game Night not active, skipping.')
      return ctx.getState()
    }

    // Determine champion
    await ctx.thunkDispatcher('gnDetermineChampion')

    // Auto-advance after champion ceremony timer
    setTimeout(() => {
      try {
        ctx.reducerDispatcher('gnSetChampionReady')
      } catch (_e) {
        // Session may have ended
      }
    }, 30_000)

    return ctx.getState()
  },

  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    return state.gameNight?.championReady === true
  },

  next: (_ctx: any) => {
    console.log('[GN_CHAMPION] Game Night complete → LOBBY')
    return CasinoPhase.Lobby
  },

  onEnd: async (ctx: any) => {
    // Clear Game Night state before returning to lobby
    ctx.reducerDispatcher('gnClearGameNight')
    console.log('[GN_CHAMPION] Game Night state cleared.')
    return ctx.getState()
  },
}

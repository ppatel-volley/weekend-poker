import { describe, it, expect, vi } from 'vitest'
import { CasinoPhase, GAME_FIRST_PHASE } from '@weekend-casino/shared'
import type { CasinoGameState, GameNightGameState } from '@weekend-casino/shared'
import { createInitialCasinoState, gnSetLeaderboardReady, gnSetChampionReady } from '../ruleset/casino-state.js'
import { gnSetupPhase, gnLeaderboardPhase, gnChampionPhase } from '../ruleset/gn-phases.js'
import { incrementGameNightRoundIfActive } from '../ruleset/game-night-utils.js'
import { lobbyPhase } from '../ruleset/casino-phases.js'

// ── Helpers ──────────────────────────────────────────────────────

function makeGN(overrides: Partial<GameNightGameState> = {}): GameNightGameState {
  return {
    active: true,
    roundLimit: 5,
    roundsPlayed: 0,
    scores: {},
    gameLineup: ['holdem', 'roulette', 'blackjack_classic'],
    currentGameIndex: 0,
    roundsPerGame: 5,
    playerScores: {},
    gameResults: [],
    theme: 'classic',
    championId: null,
    startedAt: Date.now(),
    leaderboardReady: false,
    championReady: false,
    achievements: [],
    setupConfirmed: false,
    walletSnapshot: {},
    ...overrides,
  }
}

function makeState(overrides: Partial<CasinoGameState> = {}): CasinoGameState {
  return createInitialCasinoState({
    players: [
      { id: 'p1', name: 'Alice', avatarId: 'default', seatIndex: 0, isHost: true, isReady: true, currentGameStatus: 'active', stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
      { id: 'p2', name: 'Bob', avatarId: 'default', seatIndex: 1, isHost: false, isReady: true, currentGameStatus: 'active', stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
    ],
    wallet: { p1: 10000, p2: 10000 },
    ...overrides,
  })
}

function makeCtx(state: CasinoGameState) {
  let currentState = state
  return {
    session: { state: currentState, sessionId: 'test-session' },
    getState: () => currentState,
    reducerDispatcher: vi.fn((name: string, ...args: unknown[]) => {
      // Simulate some key reducers for testing
      if (name === 'gnSetLeaderboardReady') {
        currentState = gnSetLeaderboardReady(currentState)
      } else if (name === 'gnSetChampionReady') {
        currentState = gnSetChampionReady(currentState)
      } else if (name === 'setSelectedGame') {
        currentState = { ...currentState, selectedGame: args[0] as any }
      }
    }),
    thunkDispatcher: vi.fn(async () => {}),
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GN_SETUP Phase Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('gnSetupPhase', () => {
  it('onBegin should return state', async () => {
    const state = makeState({ gameNight: makeGN() })
    const ctx = makeCtx(state)
    const result = await gnSetupPhase.onBegin(ctx)
    expect(result).toBeDefined()
  })

  it('endIf should return false when setupConfirmed is false', () => {
    const state = makeState({ gameNight: makeGN({ setupConfirmed: false }) })
    const ctx = { session: { state } }
    expect(gnSetupPhase.endIf(ctx)).toBe(false)
  })

  it('endIf should return true when setupConfirmed is true', () => {
    const state = makeState({ gameNight: makeGN({ setupConfirmed: true }) })
    const ctx = { session: { state } }
    expect(gnSetupPhase.endIf(ctx)).toBe(true)
  })

  it('next should route to first game in lineup', () => {
    const state = makeState({
      gameNight: makeGN({ gameLineup: ['roulette', 'holdem', 'blackjack_classic'] }),
    })
    const ctx = { session: { state } }
    expect(gnSetupPhase.next(ctx)).toBe(GAME_FIRST_PHASE['roulette'])
  })

  it('next should return LOBBY if no games in lineup', () => {
    const state = makeState({
      gameNight: makeGN({ gameLineup: [] }),
    })
    const ctx = { session: { state } }
    expect(gnSetupPhase.next(ctx)).toBe(CasinoPhase.Lobby)
  })

  it('onEnd should set selectedGame and call switchGameServerState', async () => {
    const state = makeState({
      gameNight: makeGN({ gameLineup: ['holdem', 'roulette'] }),
    })
    const ctx = makeCtx(state)
    await gnSetupPhase.onEnd(ctx)
    expect(ctx.reducerDispatcher).toHaveBeenCalledWith('setSelectedGame', 'holdem')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GN_LEADERBOARD Phase Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('gnLeaderboardPhase', () => {
  it('onBegin should call gnCalculateScores thunk when GN active', async () => {
    const state = makeState({ gameNight: makeGN() })
    const ctx = makeCtx(state)
    await gnLeaderboardPhase.onBegin(ctx)
    expect(ctx.thunkDispatcher).toHaveBeenCalledWith('gnCalculateScores')
  })

  it('onBegin should skip scoring when GN not active', async () => {
    const state = makeState()
    const ctx = makeCtx(state)
    await gnLeaderboardPhase.onBegin(ctx)
    expect(ctx.thunkDispatcher).not.toHaveBeenCalled()
  })

  it('endIf should return false when leaderboardReady is false', () => {
    const state = makeState({ gameNight: makeGN({ leaderboardReady: false }) })
    const ctx = { session: { state } }
    expect(gnLeaderboardPhase.endIf(ctx)).toBe(false)
  })

  it('endIf should return true when leaderboardReady is true', () => {
    const state = makeState({ gameNight: makeGN({ leaderboardReady: true }) })
    const ctx = { session: { state } }
    expect(gnLeaderboardPhase.endIf(ctx)).toBe(true)
  })

  it('next should route to GN_CHAMPION when on last game', () => {
    const state = makeState({
      gameNight: makeGN({
        gameLineup: ['holdem', 'roulette'],
        currentGameIndex: 1, // last game (index 1 of 2)
      }),
    })
    const ctx = { session: { state } }
    expect(gnLeaderboardPhase.next(ctx)).toBe(CasinoPhase.GnChampion)
  })

  it('next should route to next game first phase when not last game', () => {
    const state = makeState({
      gameNight: makeGN({
        gameLineup: ['holdem', 'roulette', 'blackjack_classic'],
        currentGameIndex: 0,
      }),
    })
    const ctx = { session: { state } }
    expect(gnLeaderboardPhase.next(ctx)).toBe(GAME_FIRST_PHASE['roulette'])
  })

  it('next should return LOBBY if gameNight is null', () => {
    const state = makeState()
    const ctx = { session: { state } }
    expect(gnLeaderboardPhase.next(ctx)).toBe(CasinoPhase.Lobby)
  })

  it('onEnd should advance game and set up next game when not last', async () => {
    const state = makeState({
      gameNight: makeGN({
        gameLineup: ['holdem', 'roulette', 'blackjack_classic'],
        currentGameIndex: 0,
      }),
    })
    const ctx = makeCtx(state)
    await gnLeaderboardPhase.onEnd(ctx)
    expect(ctx.reducerDispatcher).toHaveBeenCalledWith('gnAdvanceGame')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GN_CHAMPION Phase Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('gnChampionPhase', () => {
  it('onBegin should call gnDetermineChampion thunk when GN active', async () => {
    const state = makeState({ gameNight: makeGN() })
    const ctx = makeCtx(state)
    await gnChampionPhase.onBegin(ctx)
    expect(ctx.thunkDispatcher).toHaveBeenCalledWith('gnDetermineChampion')
  })

  it('onBegin should skip when GN not active', async () => {
    const state = makeState()
    const ctx = makeCtx(state)
    await gnChampionPhase.onBegin(ctx)
    expect(ctx.thunkDispatcher).not.toHaveBeenCalled()
  })

  it('endIf should return false when championReady is false', () => {
    const state = makeState({ gameNight: makeGN({ championReady: false }) })
    const ctx = { session: { state } }
    expect(gnChampionPhase.endIf(ctx)).toBe(false)
  })

  it('endIf should return true when championReady is true', () => {
    const state = makeState({ gameNight: makeGN({ championReady: true }) })
    const ctx = { session: { state } }
    expect(gnChampionPhase.endIf(ctx)).toBe(true)
  })

  it('next should return LOBBY', () => {
    const state = makeState()
    const ctx = { session: { state } }
    expect(gnChampionPhase.next(ctx)).toBe(CasinoPhase.Lobby)
  })

  it('onEnd should clear Game Night state', async () => {
    const state = makeState({ gameNight: makeGN() })
    const ctx = makeCtx(state)
    await gnChampionPhase.onEnd(ctx)
    expect(ctx.reducerDispatcher).toHaveBeenCalledWith('gnClearGameNight')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// incrementGameNightRoundIfActive Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('incrementGameNightRoundIfActive', () => {
  it('should dispatch gnIncrementRoundsPlayed when GN active (reducerDispatcher)', () => {
    const state = makeState({ gameNight: makeGN() })
    const ctx = {
      getState: () => state,
      reducerDispatcher: vi.fn(),
    }
    incrementGameNightRoundIfActive(ctx)
    expect(ctx.reducerDispatcher).toHaveBeenCalledWith('gnIncrementRoundsPlayed')
  })

  it('should dispatch gnIncrementRoundsPlayed when GN active (dispatch fallback)', () => {
    const state = makeState({ gameNight: makeGN() })
    const ctx = {
      getState: () => state,
      dispatch: vi.fn(),
    }
    incrementGameNightRoundIfActive(ctx)
    expect(ctx.dispatch).toHaveBeenCalledWith('gnIncrementRoundsPlayed')
  })

  it('should no-op when gameNight is undefined', () => {
    const state = makeState()
    const ctx = {
      getState: () => state,
      reducerDispatcher: vi.fn(),
    }
    incrementGameNightRoundIfActive(ctx)
    expect(ctx.reducerDispatcher).not.toHaveBeenCalled()
  })

  it('should no-op when gameNight.active is false', () => {
    const state = makeState({ gameNight: makeGN({ active: false }) })
    const ctx = {
      getState: () => state,
      reducerDispatcher: vi.fn(),
    }
    incrementGameNightRoundIfActive(ctx)
    expect(ctx.reducerDispatcher).not.toHaveBeenCalled()
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Lobby → GN_SETUP routing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('lobby GN routing', () => {
  it('lobby endIf should return true when GN setupConfirmed', () => {
    const state = makeState({
      gameNight: makeGN({ setupConfirmed: true }),
    })
    const ctx = { session: { state } }
    expect(lobbyPhase.endIf(ctx)).toBe(true)
  })

  it('lobby next should route to GN_SETUP when GN active', () => {
    const state = makeState({
      gameNight: makeGN(),
      selectedGame: 'holdem',
    })
    const ctx = { session: { state } }
    expect(lobbyPhase.next(ctx)).toBe('GN_SETUP')
  })

  it('lobby next should route to game normally when GN not active', () => {
    const state = makeState({ selectedGame: 'holdem' })
    const ctx = { session: { state } }
    expect(lobbyPhase.next(ctx)).toBe(GAME_FIRST_PHASE['holdem'])
  })
})

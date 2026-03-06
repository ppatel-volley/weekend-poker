/**
 * Tests for joinSession and leaveSession thunks.
 *
 * These thunks replace onConnect/onDisconnect lifecycle hooks for WGFServer
 * compatibility (Learning 015).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CasinoGameState, CasinoPlayer } from '@weekend-casino/shared'
import { CasinoPhase, MAX_PLAYERS, STARTING_WALLET_BALANCE } from '@weekend-casino/shared'
import { ClientType } from '@volley/vgf/types'
import { joinSession, leaveSession } from '../ruleset/session-thunks.js'

// ── Mock persistence layer ────────────────────────────────────────
vi.mock('../persistence/index.js', () => ({
  resolveIdentity: vi.fn().mockReturnValue({ token: 'device-abc', source: 'device_token' }),
  playerStore: {
    getOrCreateByDeviceToken: vi.fn().mockResolvedValue({
      identity: { persistentId: 'persistent-123' },
      level: 5,
      stats: { handsPlayed: 100, handsWon: 40 },
      dailyBonus: { currentStreak: 3, lastClaimDate: '2026-01-01', totalClaimed: 1500 },
    }),
    updateDailyBonus: vi.fn().mockResolvedValue(undefined),
  },
  dailyBonusStore: {
    calculateDailyBonus: vi.fn().mockReturnValue({ eligible: false }),
    applyDailyBonusClaim: vi.fn().mockReturnValue({}),
  },
  challengeStore: {
    assignChallenges: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../persistence/challenge-utils.js', () => ({
  clearSessionTracker: vi.fn(),
}))

import { resolveIdentity, playerStore, dailyBonusStore, challengeStore } from '../persistence/index.js'
import { clearSessionTracker } from '../persistence/challenge-utils.js'

// ── Helpers ───────────────────────────────────────────────────────

function makePlayer(overrides: Partial<CasinoPlayer> = {}): CasinoPlayer {
  return {
    id: 'player-1',
    name: 'Test Player',
    avatarId: 'default',
    seatIndex: 0,
    isHost: true,
    isReady: false,
    currentGameStatus: 'active',
    stack: STARTING_WALLET_BALANCE,
    bet: 0,
    status: 'active',
    lastAction: null,
    isBot: false,
    isConnected: true,
    sittingOutHandCount: 0,
    ...overrides,
  }
}

function makeState(overrides: Partial<CasinoGameState> = {}): CasinoGameState {
  return {
    phase: CasinoPhase.Lobby,
    selectedGame: null,
    gameSelectConfirmed: false,
    gameChangeRequested: false,
    gameChangeVotes: {},
    wallet: {},
    players: [],
    dealerCharacterId: 'vincent',
    blindLevel: 0,
    handNumber: 0,
    dealerIndex: 0,
    lobbyReady: false,
    dealerMessage: null,
    ttsQueue: [],
    reactions: [],
    interHandDelaySec: 3,
    autoFillBots: true,
    activePlayerIndex: -1,
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentBet: 0,
    minRaiseIncrement: 0,
    showdownResults: null,
    holeCards: {},
    handComplete: false,
    roundComplete: false,
    ...overrides,
  } as CasinoGameState
}

function makeThunkCtx(state: CasinoGameState, clientId = 'player-1', sessionId = 'session-1') {
  const dispatches: Array<[string, ...unknown[]]> = []
  return {
    ctx: {
      getClientId: () => clientId,
      getSessionId: () => sessionId,
      getState: () => state,
      getMembers: () => ({
        [clientId]: { clientType: ClientType.Controller, state: { displayName: 'Member Name', name: 'Fallback Name' } },
      }),
      dispatch: (reducer: string, ...args: unknown[]) => {
        dispatches.push([reducer, ...args])
      },
      dispatchThunk: vi.fn(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      scheduler: {} as any,
    } as any,
    dispatches,
  }
}

// ── Tests ─────────────────────────────────────────────────────────

describe('joinSession thunk', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds a new player with correct seat and host assignment', async () => {
    const state = makeState()
    const { ctx, dispatches } = makeThunkCtx(state)

    await joinSession(ctx, { displayName: 'Alice' })

    expect(dispatches[0]![0]).toBe('addPlayer')
    const newPlayer = dispatches[0]![1] as CasinoPlayer
    expect(newPlayer.id).toBe('player-1')
    expect(newPlayer.name).toBe('Alice')
    expect(newPlayer.seatIndex).toBe(0)
    expect(newPlayer.isHost).toBe(true)
    expect(newPlayer.isConnected).toBe(true)
    expect(newPlayer.stack).toBe(STARTING_WALLET_BALANCE)
  })

  it('assigns next available seat when others are taken', async () => {
    const state = makeState({
      players: [makePlayer({ id: 'other', seatIndex: 0 })],
    })
    const { ctx, dispatches } = makeThunkCtx(state, 'player-2')

    await joinSession(ctx, { displayName: 'Bob' })

    const newPlayer = dispatches[0]![1] as CasinoPlayer
    expect(newPlayer.seatIndex).toBe(1)
    expect(newPlayer.isHost).toBe(false)
  })

  it('handles reconnection for existing player', async () => {
    const state = makeState({
      players: [makePlayer({ id: 'player-1', isConnected: false })],
    })
    const { ctx, dispatches } = makeThunkCtx(state)

    await joinSession(ctx, {})

    expect(dispatches).toHaveLength(1)
    expect(dispatches[0]!).toEqual(['markPlayerReconnected', 'player-1'])
  })

  it('rejects when max players reached', async () => {
    const players = Array.from({ length: MAX_PLAYERS }, (_, i) =>
      makePlayer({ id: `p${i}`, seatIndex: i }),
    )
    const state = makeState({ players })
    const { ctx, dispatches } = makeThunkCtx(state, 'new-player')

    await joinSession(ctx, { displayName: 'Late Arrival' })

    expect(dispatches).toHaveLength(0)
  })

  it('resolves persistent identity from metadata', async () => {
    const state = makeState()
    const { ctx, dispatches } = makeThunkCtx(state)

    await joinSession(ctx, {
      displayName: 'Alice',
      metadata: { deviceToken: 'device-abc' },
    })

    expect(resolveIdentity).toHaveBeenCalledWith({ deviceToken: 'device-abc' })
    expect(playerStore.getOrCreateByDeviceToken).toHaveBeenCalledWith(
      'device-abc', 'device_token', 'Alice',
    )
    const newPlayer = dispatches[0]![1] as CasinoPlayer
    expect(newPlayer.persistentId).toBe('persistent-123')
    expect(newPlayer.playerLevel).toBe(5)
  })

  it('proactively assigns challenges on join', async () => {
    const state = makeState()
    const { ctx } = makeThunkCtx(state)

    await joinSession(ctx, {
      displayName: 'Alice',
      metadata: { deviceToken: 'device-abc' },
    })

    expect(challengeStore.assignChallenges).toHaveBeenCalledWith(
      'persistent-123',
      { handsPlayed: 100, handsWon: 40 },
    )
  })

  it('does not block on challenge assignment failure', async () => {
    vi.mocked(challengeStore.assignChallenges).mockRejectedValueOnce(new Error('Redis down'))
    const state = makeState()
    const { ctx, dispatches } = makeThunkCtx(state)

    await joinSession(ctx, {
      displayName: 'Alice',
      metadata: { deviceToken: 'device-abc' },
    })

    // Player should still be added despite challenge failure
    expect(dispatches[0]![0]).toBe('addPlayer')
  })

  it('applies daily bonus when eligible', async () => {
    vi.mocked(dailyBonusStore.calculateDailyBonus).mockReturnValueOnce({
      eligible: true,
      amount: 500,
      streakDay: 4,
      multiplierApplied: true,
    } as any)
    vi.mocked(dailyBonusStore.applyDailyBonusClaim).mockReturnValueOnce({
      currentStreak: 4,
      lastClaimDate: '2026-03-05',
      totalClaimed: 2000,
    } as any)

    const state = makeState()
    const { ctx, dispatches } = makeThunkCtx(state)

    await joinSession(ctx, {
      displayName: 'Alice',
      metadata: { deviceToken: 'device-abc' },
    })

    // addPlayer, updateWallet, setDailyBonus
    expect(dispatches).toHaveLength(3)
    expect(dispatches[1]!).toEqual(['updateWallet', 'player-1', 500])
    expect(dispatches[2]![0]).toBe('setDailyBonus')
    expect((dispatches[2]![1] as any).amount).toBe(500)
    expect((dispatches[2]![1] as any).streakDay).toBe(4)
  })

  it('resolves identity via userId fallback when no metadata provided', async () => {
    const state = makeState()
    const { ctx, dispatches } = makeThunkCtx(state)

    await joinSession(ctx, { displayName: 'Guest' })

    // Should resolve identity using { userId: clientId } as fallback
    expect(resolveIdentity).toHaveBeenCalledWith({ userId: 'player-1' })
    const newPlayer = dispatches[0]![1] as CasinoPlayer
    expect(newPlayer.name).toBe('Guest')
  })

  it('uses member displayName when payload displayName not provided', async () => {
    const state = makeState()
    const { ctx, dispatches } = makeThunkCtx(state)

    await joinSession(ctx, {})

    const newPlayer = dispatches[0]![1] as CasinoPlayer
    expect(newPlayer.name).toBe('Member Name')
  })

  it('falls back to "Player N" when no name available', async () => {
    const state = makeState()
    const ctx = {
      getClientId: () => 'unknown-player',
      getSessionId: () => 'session-1',
      getState: () => state,
      getMembers: () => ({
        'unknown-player': { clientType: ClientType.Controller, state: {} },
      }),
      dispatch: vi.fn(),
      dispatchThunk: vi.fn(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      scheduler: {} as any,
    } as any

    await joinSession(ctx, {})

    expect(ctx.dispatch).toHaveBeenCalledWith('addPlayer', expect.objectContaining({
      name: 'Player 1',
    }))
  })

  it('does not break on persistence failure', async () => {
    vi.mocked(resolveIdentity).mockImplementationOnce(() => { throw new Error('boom') })
    const state = makeState()
    const { ctx, dispatches } = makeThunkCtx(state)

    await joinSession(ctx, {
      displayName: 'Alice',
      metadata: { deviceToken: 'bad' },
    })

    // Player should still be added without persistent identity
    expect(dispatches[0]![0]).toBe('addPlayer')
    const newPlayer = dispatches[0]![1] as CasinoPlayer
    expect(newPlayer.persistentId).toBeUndefined()
  })
})

describe('leaveSession thunk', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes player from lobby and clears session tracker', async () => {
    const player = makePlayer({ persistentId: 'persistent-123' })
    const state = makeState({ players: [player], phase: CasinoPhase.Lobby })
    const { ctx, dispatches } = makeThunkCtx(state)

    await leaveSession(ctx)

    expect(clearSessionTracker).toHaveBeenCalledWith('session-1', 'persistent-123')
    expect(dispatches).toEqual([['removePlayer', 'player-1']])
  })

  it('marks player disconnected mid-game instead of removing', async () => {
    const player = makePlayer()
    const state = makeState({ players: [player], phase: CasinoPhase.DealingHoleCards })
    const { ctx, dispatches } = makeThunkCtx(state)

    await leaveSession(ctx)

    expect(dispatches).toEqual([['markPlayerDisconnected', 'player-1']])
    expect(clearSessionTracker).not.toHaveBeenCalled()
  })

  it('no-ops if player not found in state', async () => {
    const state = makeState({ players: [] })
    const { ctx, dispatches } = makeThunkCtx(state)

    await leaveSession(ctx)

    expect(dispatches).toHaveLength(0)
    expect(clearSessionTracker).not.toHaveBeenCalled()
  })

  it('skips session tracker clear when player has no persistentId', async () => {
    const player = makePlayer({ persistentId: undefined })
    const state = makeState({ players: [player], phase: CasinoPhase.Lobby })
    const { ctx, dispatches } = makeThunkCtx(state)

    await leaveSession(ctx)

    expect(clearSessionTracker).not.toHaveBeenCalled()
    expect(dispatches).toEqual([['removePlayer', 'player-1']])
  })

  it('marks disconnected in any non-lobby game phase', async () => {
    const nonLobbyPhases = [
      CasinoPhase.GameSelect,
      CasinoPhase.DealingHoleCards,
      CasinoPhase.PreFlopBetting,
      CasinoPhase.RouletteSpin,
    ]

    for (const phase of nonLobbyPhases) {
      vi.clearAllMocks()
      const player = makePlayer()
      const state = makeState({ players: [player], phase })
      const { ctx, dispatches } = makeThunkCtx(state)

      await leaveSession(ctx)

      expect(dispatches).toEqual([['markPlayerDisconnected', 'player-1']])
    }
  })
})

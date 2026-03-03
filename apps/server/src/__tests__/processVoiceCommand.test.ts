import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pokerRuleset, createInitialState } from '../ruleset/index.js'
import { CasinoPhase } from '@weekend-casino/shared'

// ── Mock ThunkCtx ─────────────────────────────────────────────

function createMockCtx(state: any, clientId = 'player-1') {
  const dispatches: Array<[string, ...unknown[]]> = []
  const thunkDispatches: Array<[string, ...unknown[]]> = []
  return {
    ctx: {
      getState: () => state,
      getClientId: () => clientId,
      dispatch: (action: string, ...args: unknown[]) => {
        dispatches.push([action, ...args])
      },
      dispatchThunk: vi.fn(async (name: string, ...args: unknown[]) => {
        thunkDispatches.push([name, ...args])
      }),
      getMembers: () => ({}),
    },
    dispatches,
    thunkDispatches,
  }
}

const mockPlayer = {
  id: 'player-1',
  name: 'Test',
  seatIndex: 0,
  stack: 1000,
  bet: 0,
  status: 'active' as const,
  lastAction: null,
  isBot: false,
  isConnected: true,
  sittingOutHandCount: 0,
}

describe('processVoiceCommand thunk', () => {
  const processVoiceCommand = (pokerRuleset.thunks as any)['processVoiceCommand']!

  let baseState: any

  beforeEach(() => {
    // Set phase to a betting phase so voice actions are accepted
    baseState = createInitialState({ players: [mockPlayer as any], phase: CasinoPhase.PreFlopBetting as any })
  })

  it('should route fold through processPlayerAction', async () => {
    const { ctx, thunkDispatches } = createMockCtx(baseState)
    await processVoiceCommand(ctx as any, 'I fold')

    expect(thunkDispatches).toHaveLength(1)
    expect(thunkDispatches[0]![0]).toBe('processPlayerAction')
    expect(thunkDispatches[0]![1]).toBe('player-1')
    expect(thunkDispatches[0]![2]).toBe('fold')
  })

  it('should route raise with amount through processPlayerAction', async () => {
    const { ctx, thunkDispatches } = createMockCtx(baseState)
    await processVoiceCommand(ctx as any, 'raise 200')

    expect(thunkDispatches).toHaveLength(1)
    expect(thunkDispatches[0]![0]).toBe('processPlayerAction')
    expect(thunkDispatches[0]![1]).toBe('player-1')
    expect(thunkDispatches[0]![2]).toBe('raise')
    expect(thunkDispatches[0]![3]).toBe(200)
  })

  it('should route check through processPlayerAction', async () => {
    const { ctx, thunkDispatches } = createMockCtx(baseState)
    await processVoiceCommand(ctx as any, 'check')

    expect(thunkDispatches).toHaveLength(1)
    expect(thunkDispatches[0]![0]).toBe('processPlayerAction')
    expect(thunkDispatches[0]![2]).toBe('check')
  })

  it('should NOT dispatch for gibberish', async () => {
    const { ctx, thunkDispatches, dispatches } = createMockCtx(baseState)
    await processVoiceCommand(ctx as any, 'blah blah nonsense')

    expect(thunkDispatches).toHaveLength(0)
    expect(dispatches).toHaveLength(0)
  })

  it('should NOT dispatch for non-action intents like "settings"', async () => {
    const { ctx, thunkDispatches, dispatches } = createMockCtx(baseState)
    await processVoiceCommand(ctx as any, 'settings')

    expect(thunkDispatches).toHaveLength(0)
    expect(dispatches).toHaveLength(0)
  })

  it('should log with [voice] prefix', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { ctx } = createMockCtx(baseState)

    await processVoiceCommand(ctx as any, 'call')

    expect(consoleSpy).toHaveBeenCalledOnce()
    expect(consoleSpy.mock.calls[0]![0]).toBe('[voice]')

    consoleSpy.mockRestore()
  })
})

describe('setPlayerLastAction reducer', () => {
  const setPlayerLastAction = pokerRuleset.reducers['setPlayerLastAction']!

  it('should update the matching player lastAction', () => {
    const state = createInitialState({ players: [mockPlayer as any] })
    const result = setPlayerLastAction(state, 'player-1', 'fold')

    expect((result.players[0] as any).lastAction).toBe('fold')
  })

  it('should not mutate the original state', () => {
    const state = createInitialState({ players: [mockPlayer as any] })
    const result = setPlayerLastAction(state, 'player-1', 'check')

    expect((state.players[0] as any).lastAction).toBeNull()
    expect(result).not.toBe(state)
  })

  it('should not modify other players', () => {
    const otherPlayer = { ...mockPlayer, id: 'player-2', name: 'Other', seatIndex: 1 }
    const state = createInitialState({ players: [mockPlayer as any, otherPlayer as any] })
    const result = setPlayerLastAction(state, 'player-1', 'raise')

    expect((result.players[0] as any).lastAction).toBe('raise')
    expect((result.players[1] as any).lastAction).toBeNull()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pokerRuleset, createInitialState } from '../ruleset/index.js'
import type { PokerGameState } from '@weekend-poker/shared'

// ── Mock ThunkCtx ─────────────────────────────────────────────

function createMockCtx(state: PokerGameState, clientId = 'player-1') {
  const dispatches: Array<[string, ...unknown[]]> = []
  return {
    ctx: {
      getState: () => state,
      getClientId: () => clientId,
      dispatch: (action: string, ...args: unknown[]) => {
        dispatches.push([action, ...args])
      },
      getMembers: () => ({}),
    },
    dispatches,
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
  const processVoiceCommand = pokerRuleset.thunks['processVoiceCommand']!

  let baseState: PokerGameState

  beforeEach(() => {
    baseState = createInitialState({ players: [mockPlayer] })
  })

  it('should dispatch setPlayerLastAction with fold for "I fold"', async () => {
    const { ctx, dispatches } = createMockCtx(baseState)
    await processVoiceCommand(ctx as any, 'I fold')

    expect(dispatches).toHaveLength(1)
    expect(dispatches[0]).toEqual(['setPlayerLastAction', 'player-1', 'fold'])
  })

  it('should dispatch setPlayerLastAction with raise for "raise 200"', async () => {
    const { ctx, dispatches } = createMockCtx(baseState)
    await processVoiceCommand(ctx as any, 'raise 200')

    expect(dispatches).toHaveLength(1)
    expect(dispatches[0]).toEqual(['setPlayerLastAction', 'player-1', 'raise'])
  })

  it('should dispatch setPlayerLastAction with check for "check"', async () => {
    const { ctx, dispatches } = createMockCtx(baseState)
    await processVoiceCommand(ctx as any, 'check')

    expect(dispatches).toHaveLength(1)
    expect(dispatches[0]).toEqual(['setPlayerLastAction', 'player-1', 'check'])
  })

  it('should NOT dispatch for gibberish', async () => {
    const { ctx, dispatches } = createMockCtx(baseState)
    await processVoiceCommand(ctx as any, 'blah blah nonsense')

    expect(dispatches).toHaveLength(0)
  })

  it('should NOT dispatch for non-action intents like "settings"', async () => {
    const { ctx, dispatches } = createMockCtx(baseState)
    await processVoiceCommand(ctx as any, 'settings')

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
    const state = createInitialState({ players: [mockPlayer] })
    const result = setPlayerLastAction(state, 'player-1', 'fold')

    expect(result.players[0]!.lastAction).toBe('fold')
  })

  it('should not mutate the original state', () => {
    const state = createInitialState({ players: [mockPlayer] })
    const result = setPlayerLastAction(state, 'player-1', 'check')

    expect(state.players[0]!.lastAction).toBeNull()
    expect(result).not.toBe(state)
  })

  it('should not modify other players', () => {
    const otherPlayer = { ...mockPlayer, id: 'player-2', name: 'Other', seatIndex: 1 }
    const state = createInitialState({ players: [mockPlayer, otherPlayer] })
    const result = setPlayerLastAction(state, 'player-1', 'raise')

    expect(result.players[0]!.lastAction).toBe('raise')
    expect(result.players[1]!.lastAction).toBeNull()
  })
})

import { describe, it, expect, vi } from 'vitest'
import {
  casinoSetInputMode,
  casinoActivateRemoteMode,
  createInitialCasinoState,
} from '../ruleset/casino-state.js'

describe('setInputMode reducer', () => {
  it('sets inputMode to remote', () => {
    const state = createInitialCasinoState()
    const result = casinoSetInputMode(state, 'remote')
    expect(result.inputMode).toBe('remote')
  })

  it('sets inputMode to touch', () => {
    const state = createInitialCasinoState({ inputMode: 'remote' })
    const result = casinoSetInputMode(state, 'touch')
    expect(result.inputMode).toBe('touch')
  })

  it('sets inputMode to voice', () => {
    const state = createInitialCasinoState()
    const result = casinoSetInputMode(state, 'voice')
    expect(result.inputMode).toBe('voice')
  })

  it('preserves other state fields', () => {
    const state = createInitialCasinoState({ handNumber: 5, dealerMessage: 'hello' })
    const result = casinoSetInputMode(state, 'remote')
    expect(result.handNumber).toBe(5)
    expect(result.dealerMessage).toBe('hello')
    expect(result.inputMode).toBe('remote')
  })
})

describe('activateRemoteMode thunk', () => {
  it('dispatches setInputMode with remote', async () => {
    const dispatch = vi.fn()
    const state = createInitialCasinoState()
    const ctx = {
      getState: () => state,
      dispatch,
      dispatchThunk: vi.fn(),
      getSessionId: () => 'test-session',
      getMembers: () => ({}),
      getClientId: () => 'test-client',
    }

    await casinoActivateRemoteMode(ctx as any)

    expect(dispatch).toHaveBeenCalledWith('setInputMode', 'remote')
  })
})

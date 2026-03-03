import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CasinoGameState } from '@weekend-casino/shared'
import {
  REACTION_TYPES,
  MAX_REACTION_QUEUE_SIZE,
} from '@weekend-casino/shared'
import { createInitialCasinoState, casinoSendReaction } from '../ruleset/casino-state.js'

function makePlayer(overrides: Record<string, any> = {}): any {
  return {
    id: 'player-1',
    name: 'Alice',
    seatIndex: 0,
    stack: 1000,
    bet: 0,
    status: 'active',
    lastAction: null,
    isBot: false,
    isConnected: true,
    sittingOutHandCount: 0,
    avatarId: 'default',
    isHost: false,
    isReady: false,
    currentGameStatus: 'active',
    ...overrides,
  }
}

function stateWithPlayers(...players: any[]): CasinoGameState {
  return createInitialCasinoState({ players })
}

describe('sendReaction reducer', () => {
  let dateSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    dateSpy = vi.spyOn(Date, 'now')
  })

  afterEach(() => {
    dateSpy.mockRestore()
  })

  it('should add a valid reaction to the queue', () => {
    dateSpy.mockReturnValue(1000)
    const state = stateWithPlayers(makePlayer({ id: 'p1' }))
    const result = casinoSendReaction(state, 'p1', 'thumbs_up')
    expect(result.reactions).toHaveLength(1)
    expect(result.reactions[0]).toEqual({
      playerId: 'p1',
      type: 'thumbs_up',
      timestamp: 1000,
    })
  })

  it('should not mutate the original state', () => {
    dateSpy.mockReturnValue(1000)
    const state = stateWithPlayers(makePlayer({ id: 'p1' }))
    const result = casinoSendReaction(state, 'p1', 'fire')
    expect(result).not.toBe(state)
    expect(state.reactions).toHaveLength(0)
  })

  it('should reject reaction from non-existent player', () => {
    dateSpy.mockReturnValue(1000)
    const state = stateWithPlayers(makePlayer({ id: 'p1' }))
    const result = casinoSendReaction(state, 'non-existent', 'fire')
    expect(result).toBe(state)
    expect(result.reactions).toHaveLength(0)
  })

  it('should reject invalid reaction type', () => {
    dateSpy.mockReturnValue(1000)
    const state = stateWithPlayers(makePlayer({ id: 'p1' }))
    const result = casinoSendReaction(state, 'p1', 'invalid_type' as any)
    expect(result).toBe(state)
    expect(result.reactions).toHaveLength(0)
  })

  it('should enforce rate limit (max 3 per 10s)', () => {
    const state = stateWithPlayers(makePlayer({ id: 'p1' }))

    // Send 3 reactions within the window
    dateSpy.mockReturnValue(1000)
    let current = casinoSendReaction(state, 'p1', 'thumbs_up')
    dateSpy.mockReturnValue(2000)
    current = casinoSendReaction(current, 'p1', 'fire')
    dateSpy.mockReturnValue(3000)
    current = casinoSendReaction(current, 'p1', 'laugh')

    expect(current.reactions).toHaveLength(3)

    // 4th reaction within window should be rejected
    dateSpy.mockReturnValue(4000)
    const rejected = casinoSendReaction(current, 'p1', 'clap')
    expect(rejected).toBe(current)
    expect(rejected.reactions).toHaveLength(3)
  })

  it('should allow reactions after rate limit window expires', () => {
    const state = stateWithPlayers(makePlayer({ id: 'p1' }))

    // Fill up the rate limit
    dateSpy.mockReturnValue(1000)
    let current = casinoSendReaction(state, 'p1', 'thumbs_up')
    dateSpy.mockReturnValue(2000)
    current = casinoSendReaction(current, 'p1', 'fire')
    dateSpy.mockReturnValue(3000)
    current = casinoSendReaction(current, 'p1', 'laugh')

    // Wait for window to expire (10s)
    dateSpy.mockReturnValue(12000)
    const result = casinoSendReaction(current, 'p1', 'wow')
    expect(result.reactions).toHaveLength(4)
    expect(result.reactions[3]!.type).toBe('wow')
  })

  it('should enforce rate limit per player independently', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1' }),
      makePlayer({ id: 'p2', seatIndex: 1 }),
    )

    // Fill p1's rate limit
    dateSpy.mockReturnValue(1000)
    let current = casinoSendReaction(state, 'p1', 'thumbs_up')
    dateSpy.mockReturnValue(2000)
    current = casinoSendReaction(current, 'p1', 'fire')
    dateSpy.mockReturnValue(3000)
    current = casinoSendReaction(current, 'p1', 'laugh')

    // p2 should still be able to react
    dateSpy.mockReturnValue(4000)
    const result = casinoSendReaction(current, 'p2', 'clap')
    expect(result.reactions).toHaveLength(4)
    expect(result.reactions[3]!.playerId).toBe('p2')
  })

  it('should cap the queue at MAX_REACTION_QUEUE_SIZE', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1' }),
      makePlayer({ id: 'p2', seatIndex: 1 }),
      makePlayer({ id: 'p3', seatIndex: 2 }),
      makePlayer({ id: 'p4', seatIndex: 3 }),
    )

    let current = state
    // Send 12 reactions from different players to avoid rate limit
    for (let i = 0; i < 12; i++) {
      const playerId = `p${(i % 4) + 1}`
      dateSpy.mockReturnValue(i * 4000) // space them out to avoid rate limit
      current = casinoSendReaction(current, playerId, REACTION_TYPES[i % REACTION_TYPES.length]!)
    }

    expect(current.reactions.length).toBeLessThanOrEqual(MAX_REACTION_QUEUE_SIZE)
    // Oldest reactions should be trimmed
    expect(current.reactions).toHaveLength(MAX_REACTION_QUEUE_SIZE)
  })

  it('should accept all valid reaction types', () => {
    const state = stateWithPlayers(makePlayer({ id: 'p1' }))

    for (const type of REACTION_TYPES) {
      dateSpy.mockReturnValue(Date.now() + 100000) // avoid rate limit
      const result = casinoSendReaction(
        { ...state, reactions: [] },
        'p1',
        type,
      )
      expect(result.reactions).toHaveLength(1)
      expect(result.reactions[0]!.type).toBe(type)
    }
  })

  it('should NOT affect game state fields (purely cosmetic)', () => {
    dateSpy.mockReturnValue(1000)
    const state = stateWithPlayers(makePlayer({ id: 'p1', stack: 5000 }))
    const result = casinoSendReaction(state, 'p1', 'fire')

    // Verify no game state was affected
    expect((result.players[0] as any).stack).toBe(5000)
    expect((result.players[0] as any).status).toBe('active')
    expect(result.wallet).toEqual(state.wallet)
    expect(result.phase).toBe(state.phase)
    expect(result.handNumber).toBe(state.handNumber)
    expect(result.pot).toBe(state.pot)
  })

  it('should include reactions field in initial state', () => {
    const state = createInitialCasinoState()
    expect(state.reactions).toEqual([])
  })
})

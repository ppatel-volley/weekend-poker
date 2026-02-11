import { describe, it, expect } from 'vitest'
import type { PokerGameState, PokerPlayer } from '@weekend-poker/shared'
import { STARTING_STACK } from '@weekend-poker/shared'
import { createInitialState, pokerRuleset } from '../ruleset/index.js'

/** Helper to create a test player. */
function makePlayer(overrides: Partial<PokerPlayer> = {}): PokerPlayer {
  return {
    id: 'player-1',
    name: 'Alice',
    seatIndex: 0,
    stack: STARTING_STACK,
    bet: 0,
    status: 'active',
    lastAction: null,
    isBot: false,
    isConnected: true,
    sittingOutHandCount: 0,
    ...overrides,
  }
}

/** Helper to create a state with players pre-populated. */
function stateWithPlayers(...players: PokerPlayer[]): PokerGameState {
  return createInitialState({ players })
}

describe('updatePlayerName reducer', () => {
  const updatePlayerName = pokerRuleset.reducers['updatePlayerName']!

  it('should update the name of the matching player', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', name: 'Alice' }),
      makePlayer({ id: 'p2', name: 'Bob', seatIndex: 1 }),
    )

    const next = updatePlayerName(state, 'p1', 'Carol')

    expect(next.players[0]!.name).toBe('Carol')
    expect(next.players[1]!.name).toBe('Bob')
  })

  it('should not mutate the original state', () => {
    const state = stateWithPlayers(makePlayer({ id: 'p1', name: 'Alice' }))
    const next = updatePlayerName(state, 'p1', 'Carol')

    expect(next).not.toBe(state)
    expect(state.players[0]!.name).toBe('Alice')
  })

  it('should return unchanged players when the id does not match', () => {
    const state = stateWithPlayers(makePlayer({ id: 'p1', name: 'Alice' }))
    const next = updatePlayerName(state, 'nonexistent', 'Carol')

    expect(next.players[0]!.name).toBe('Alice')
  })
})

describe('markPlayerReconnected reducer', () => {
  const markPlayerReconnected = pokerRuleset.reducers['markPlayerReconnected']!

  it('should set isConnected to true for the matching player', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', isConnected: false }),
      makePlayer({ id: 'p2', isConnected: false, seatIndex: 1 }),
    )

    const next = markPlayerReconnected(state, 'p1')

    expect(next.players[0]!.isConnected).toBe(true)
    expect(next.players[1]!.isConnected).toBe(false)
  })

  it('should not mutate the original state', () => {
    const state = stateWithPlayers(makePlayer({ id: 'p1', isConnected: false }))
    const next = markPlayerReconnected(state, 'p1')

    expect(next).not.toBe(state)
    expect(state.players[0]!.isConnected).toBe(false)
  })

  it('should leave isConnected unchanged if already true', () => {
    const state = stateWithPlayers(makePlayer({ id: 'p1', isConnected: true }))
    const next = markPlayerReconnected(state, 'p1')

    expect(next.players[0]!.isConnected).toBe(true)
  })

  it('should return unchanged players when the id does not match', () => {
    const state = stateWithPlayers(makePlayer({ id: 'p1', isConnected: false }))
    const next = markPlayerReconnected(state, 'nonexistent')

    expect(next.players[0]!.isConnected).toBe(false)
  })
})

describe('markPlayerDisconnected reducer', () => {
  const markPlayerDisconnected = pokerRuleset.reducers['markPlayerDisconnected']!

  it('should set isConnected to false for the matching player', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', isConnected: true }),
      makePlayer({ id: 'p2', isConnected: true, seatIndex: 1 }),
    )

    const next = markPlayerDisconnected(state, 'p1')

    expect(next.players[0]!.isConnected).toBe(false)
    expect(next.players[1]!.isConnected).toBe(true)
  })
})

describe('addPlayer reducer', () => {
  const addPlayer = pokerRuleset.reducers['addPlayer']!

  it('should append a new player to the players array', () => {
    const state = createInitialState()
    const player = makePlayer()

    const next = addPlayer(state, player)

    expect(next.players).toHaveLength(1)
    expect(next.players[0]).toEqual(player)
  })

  it('should not mutate the original state', () => {
    const state = createInitialState()
    const next = addPlayer(state, makePlayer())

    expect(state.players).toHaveLength(0)
    expect(next.players).toHaveLength(1)
  })
})

describe('removePlayer reducer', () => {
  const removePlayer = pokerRuleset.reducers['removePlayer']!

  it('should remove the player with the matching id', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1' }),
      makePlayer({ id: 'p2', seatIndex: 1 }),
    )

    const next = removePlayer(state, 'p1')

    expect(next.players).toHaveLength(1)
    expect(next.players[0]!.id).toBe('p2')
  })
})

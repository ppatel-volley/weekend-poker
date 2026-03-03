/**
 * Tests for the connection registry — targeted client messaging for private data.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  registerConnection,
  unregisterConnection,
  emitToClient,
  _resetAllConnections,
} from '../ruleset/connection-registry.js'

function makeMockConnection(disposed = false) {
  return {
    emit: vi.fn(),
    isDisposed: disposed,
    metadata: {} as any,
    onDisconnect: vi.fn(),
    onMessage: vi.fn(),
    dispose: vi.fn(),
  }
}

beforeEach(() => {
  _resetAllConnections()
})

describe('connection-registry', () => {
  it('emitToClient sends message to registered connection', () => {
    const conn = makeMockConnection()
    registerConnection('session-1', 'player-1', conn as any)

    const sent = emitToClient('session-1', 'player-1', 'privateHoleCards', { cards: ['Ah', 'Kd'] })

    expect(sent).toBe(true)
    expect(conn.emit).toHaveBeenCalledWith('message', {
      type: 'privateHoleCards',
      payload: [{ cards: ['Ah', 'Kd'] }],
    })
  })

  it('emitToClient returns false for unregistered connection', () => {
    const sent = emitToClient('session-1', 'unknown', 'privateHoleCards', {})
    expect(sent).toBe(false)
  })

  it('emitToClient returns false for disposed connection', () => {
    const conn = makeMockConnection(true) // disposed
    registerConnection('session-1', 'player-1', conn as any)

    const sent = emitToClient('session-1', 'player-1', 'privateHoleCards', {})
    expect(sent).toBe(false)
  })

  it('unregisterConnection removes the connection', () => {
    const conn = makeMockConnection()
    registerConnection('session-1', 'player-1', conn as any)

    unregisterConnection('session-1', 'player-1')

    const sent = emitToClient('session-1', 'player-1', 'privateHoleCards', {})
    expect(sent).toBe(false)
  })

  it('connections are isolated by session ID', () => {
    const conn1 = makeMockConnection()
    const conn2 = makeMockConnection()

    registerConnection('session-1', 'player-1', conn1 as any)
    registerConnection('session-2', 'player-1', conn2 as any)

    emitToClient('session-1', 'player-1', 'test', 'data1')
    emitToClient('session-2', 'player-1', 'test', 'data2')

    // Each connection received only its own message
    expect(conn1.emit).toHaveBeenCalledTimes(1)
    expect(conn2.emit).toHaveBeenCalledTimes(1)
    expect(conn1.emit).toHaveBeenCalledWith('message', { type: 'test', payload: ['data1'] })
    expect(conn2.emit).toHaveBeenCalledWith('message', { type: 'test', payload: ['data2'] })
  })

  it('_resetAllConnections clears all connections', () => {
    const conn = makeMockConnection()
    registerConnection('session-1', 'player-1', conn as any)

    _resetAllConnections()

    const sent = emitToClient('session-1', 'player-1', 'test', {})
    expect(sent).toBe(false)
  })
})

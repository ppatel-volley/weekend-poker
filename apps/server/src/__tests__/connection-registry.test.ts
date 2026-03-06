/**
 * Tests for the connection registry — targeted client messaging for private data.
 * Covers both VGF IConnection (legacy) and Socket.IO Socket (WGFServer) paths.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  registerConnection,
  registerSocket,
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

function makeMockSocket(connected = true) {
  return {
    emit: vi.fn(),
    connected,
  }
}

beforeEach(() => {
  _resetAllConnections()
})

describe('connection-registry (VGF path)', () => {
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

describe('connection-registry (Socket.IO path)', () => {
  it('emitToClient sends message to registered socket', () => {
    const socket = makeMockSocket()
    registerSocket('session-1', 'player-1', socket)

    const sent = emitToClient('session-1', 'player-1', 'privateHoleCards', { cards: ['Ah', 'Kd'] })

    expect(sent).toBe(true)
    expect(socket.emit).toHaveBeenCalledWith('private_data', {
      type: 'privateHoleCards',
      payload: [{ cards: ['Ah', 'Kd'] }],
    })
  })

  it('emitToClient returns false for disconnected socket', () => {
    const socket = makeMockSocket(false) // disconnected
    registerSocket('session-1', 'player-1', socket)

    const sent = emitToClient('session-1', 'player-1', 'privateHoleCards', {})
    expect(sent).toBe(false)
  })

  it('unregisterConnection removes a socket registration', () => {
    const socket = makeMockSocket()
    registerSocket('session-1', 'player-1', socket)

    unregisterConnection('session-1', 'player-1')

    const sent = emitToClient('session-1', 'player-1', 'test', {})
    expect(sent).toBe(false)
  })

  it('socket registration overwrites VGF connection for same key', () => {
    const conn = makeMockConnection()
    const socket = makeMockSocket()

    registerConnection('session-1', 'player-1', conn as any)
    registerSocket('session-1', 'player-1', socket)

    emitToClient('session-1', 'player-1', 'test', 'data')

    // Socket should receive the message, not the VGF connection
    expect(socket.emit).toHaveBeenCalledTimes(1)
    expect(conn.emit).not.toHaveBeenCalled()
  })

  it('sockets are isolated by session ID', () => {
    const socket1 = makeMockSocket()
    const socket2 = makeMockSocket()

    registerSocket('session-1', 'player-1', socket1)
    registerSocket('session-2', 'player-1', socket2)

    emitToClient('session-1', 'player-1', 'test', 'data1')
    emitToClient('session-2', 'player-1', 'test', 'data2')

    expect(socket1.emit).toHaveBeenCalledTimes(1)
    expect(socket2.emit).toHaveBeenCalledTimes(1)
    expect(socket1.emit).toHaveBeenCalledWith('private_data', { type: 'test', payload: ['data1'] })
    expect(socket2.emit).toHaveBeenCalledWith('private_data', { type: 'test', payload: ['data2'] })
  })

  it('_resetAllConnections clears socket registrations too', () => {
    const socket = makeMockSocket()
    registerSocket('session-1', 'player-1', socket)

    _resetAllConnections()

    const sent = emitToClient('session-1', 'player-1', 'test', {})
    expect(sent).toBe(false)
  })
})

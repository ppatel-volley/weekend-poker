/**
 * Module-level connection registry for targeted client messaging.
 *
 * VGF broadcasts ALL state to ALL clients. To deliver private data
 * (e.g., hole cards) to a single player without leaking to others,
 * we store connection references during onConnect and emit custom
 * events directly to individual clients.
 *
 * Supports both VGF IConnection objects (VGFServer path) and Socket.IO
 * Socket objects (WGFServer path). The emitToClient function adapts
 * to whichever type is registered.
 *
 * SECURITY: This is the ONLY mechanism for delivering private data.
 * Never write private data to CasinoGameState — it gets broadcast.
 */

import type { IConnectionLifeCycleContext } from '@volley/vgf/types'

/** A Socket.IO-like object with emit and connected/disconnected status. */
export interface SocketLike {
  emit(event: string, ...args: unknown[]): void
  connected: boolean
}

/** Union of VGF connection and Socket.IO socket. */
type ConnectionRef =
  | { kind: 'vgf'; connection: IConnectionLifeCycleContext['connection'] }
  | { kind: 'socket'; socket: SocketLike }

// Connection references keyed by "sessionId:clientId"
const connections = new Map<string, ConnectionRef>()

function key(sessionId: string, clientId: string): string {
  return `${sessionId}:${clientId}`
}

/**
 * Register a VGF connection (legacy VGFServer path).
 */
export function registerConnection(
  sessionId: string,
  clientId: string,
  connection: IConnectionLifeCycleContext['connection'],
): void {
  connections.set(key(sessionId, clientId), { kind: 'vgf', connection })
}

/**
 * Register a Socket.IO socket (WGFServer path).
 */
export function registerSocket(
  sessionId: string,
  clientId: string,
  socket: SocketLike,
): void {
  connections.set(key(sessionId, clientId), { kind: 'socket', socket })
}

/**
 * Remove a connection (works for both VGF and Socket.IO).
 */
export function unregisterConnection(
  sessionId: string,
  clientId: string,
): void {
  connections.delete(key(sessionId, clientId))
}

/**
 * Emit a custom event to a specific client's connection.
 * Returns true if the connection was found and message sent.
 *
 * Adapts to whichever connection type is registered:
 * - VGF: conn.emit('message', { type, payload }) — same as before
 * - Socket.IO: socket.emit('message', { type, payload })
 */
export function emitToClient(
  sessionId: string,
  clientId: string,
  event: string,
  ...args: unknown[]
): boolean {
  const ref = connections.get(key(sessionId, clientId))
  if (!ref) return false

  if (ref.kind === 'vgf') {
    if (ref.connection.isDisposed) return false
    ref.connection.emit('message', { type: event, payload: args })
    return true
  }

  // Socket.IO path — use 'private_data' channel to avoid collision with VGF 'message' channel
  if (!ref.socket.connected) return false
  ref.socket.emit('private_data', { type: event, payload: args })
  return true
}

/**
 * Reset all connections. For tests only.
 */
export function _resetAllConnections(): void {
  if (process.env['NODE_ENV'] !== 'test') {
    throw new Error('_resetAllConnections is test-only')
  }
  connections.clear()
}

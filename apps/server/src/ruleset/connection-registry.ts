/**
 * Module-level connection registry for targeted client messaging.
 *
 * VGF broadcasts ALL state to ALL clients. To deliver private data
 * (e.g., hole cards) to a single player without leaking to others,
 * we store connection references during onConnect and emit custom
 * events directly to individual clients.
 *
 * SECURITY: This is the ONLY mechanism for delivering private data.
 * Never write private data to CasinoGameState — it gets broadcast.
 */

import type { IConnectionLifeCycleContext } from '@volley/vgf/types'

// Connection references keyed by "sessionId:clientId"
const connections = new Map<string, IConnectionLifeCycleContext['connection']>()

function key(sessionId: string, clientId: string): string {
  return `${sessionId}:${clientId}`
}

/**
 * Register a connection during onConnect.
 */
export function registerConnection(
  sessionId: string,
  clientId: string,
  connection: IConnectionLifeCycleContext['connection'],
): void {
  connections.set(key(sessionId, clientId), connection)
}

/**
 * Remove a connection during onDisconnect.
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
 */
export function emitToClient(
  sessionId: string,
  clientId: string,
  event: string,
  ...args: unknown[]
): boolean {
  const conn = connections.get(key(sessionId, clientId))
  if (!conn || conn.isDisposed) return false
  conn.emit('message', { type: event, payload: args })
  return true
}

/**
 * Reset all connections. For tests only.
 */
export function _resetAllConnections(): void {
  connections.clear()
}

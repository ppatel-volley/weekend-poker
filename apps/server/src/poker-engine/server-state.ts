/**
 * Server-side state for private data that must NOT be broadcast to clients.
 *
 * Hole cards and the deck are stored here rather than in PokerGameState
 * (which VGF broadcasts to all connected clients). This prevents players
 * from inspecting WebSocket messages to see other players' cards.
 *
 * Known simplification: This uses an in-memory Map keyed by a session
 * identifier. In production, this would be backed by Redis for persistence
 * across server restarts. For a single-server weekend poker game this is
 * perfectly adequate.
 */
import type { Card } from '@weekend-poker/shared'

export interface ServerHandState {
  deck: Card[]
  holeCards: Map<string, [Card, Card]>
}

/** Module-level storage keyed by session identifier. */
const sessions = new Map<string, ServerHandState>()

/** Retrieves the server hand state for a session, or undefined if none exists. */
export function getServerHandState(sessionId: string): ServerHandState | undefined {
  return sessions.get(sessionId)
}

/** Stores server hand state for a session. */
export function setServerHandState(sessionId: string, state: ServerHandState): void {
  sessions.set(sessionId, state)
}

/** Clears the server hand state for a session. */
export function clearServerHandState(sessionId: string): void {
  sessions.delete(sessionId)
}

/** Retrieves hole cards for a specific player in a session. */
export function getHoleCards(sessionId: string, playerId: string): [Card, Card] | undefined {
  return sessions.get(sessionId)?.holeCards.get(playerId)
}

/**
 * Resets the module-level storage entirely.
 * Only intended for use in tests.
 */
export function _resetAllServerState(): void {
  sessions.clear()
}

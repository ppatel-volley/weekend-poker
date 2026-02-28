/**
 * Server-side state for private/per-game data (D-002, Sec 3.2).
 * Replaces ServerHandState to support multi-game architecture.
 *
 * Hole cards, decks, pre-generated rolls, and dealer cards are stored here
 * rather than in CasinoGameState (which VGF broadcasts to all clients).
 * This prevents players from inspecting WebSocket messages to see secrets.
 *
 * Storage: In-memory Map keyed by session ID. In production, backed by Redis.
 */

import type { Card, CasinoGame } from '@weekend-casino/shared'

// ── Hold'em Server State ──────────────────────────────────────────

export interface ServerHoldemState {
  deck: Card[]
  holeCards: Map<string, [Card, Card]>
}

// ── 5-Card Draw Server State ──────────────────────────────────────

export interface ServerDrawState {
  deck: Card[]
  holeCards: Map<string, Card[]>
  discardPile: Card[]
}

// ── Blackjack Server State ────────────────────────────────────────

export interface ServerBlackjackState {
  shoe: Card[]
  dealerHoleCard: Card | null
}

// ── Blackjack Competitive Server State ────────────────────────────

export interface ServerBlackjackCompetitiveState {
  shoe: Card[]
  playerHoleCards: Map<string, Card[]>
}

// ── Roulette Server State ─────────────────────────────────────────

export interface ServerRouletteState {
  winningNumber: number | null  // generated before spin animation
}

// ── Three Card Poker Server State ─────────────────────────────────

export interface ServerTCPState {
  deck: Card[]
  dealerCards: [Card, Card, Card]
  playerCards: Map<string, [Card, Card, Card]>
}

// ── Craps Server State ────────────────────────────────────────────

export interface ServerCrapsState {
  nextRoll: [number, number] | null  // pre-generated dice result
  rngSeed: Uint8Array                 // CSPRNG seed for replay/audit
}

// ── Root Server Game State ────────────────────────────────────────

export interface ServerGameState {
  activeGame: CasinoGame | null

  holdem?: ServerHoldemState
  draw?: ServerDrawState
  blackjack?: ServerBlackjackState
  blackjackCompetitive?: ServerBlackjackCompetitiveState
  roulette?: ServerRouletteState
  threeCardPoker?: ServerTCPState
  craps?: ServerCrapsState
}

// ── Module-level storage ──────────────────────────────────────────

const sessions = new Map<string, ServerGameState>()

// ── Public API ────────────────────────────────────────────────────

/**
 * Retrieves the server game state for a session, or creates empty if none exists.
 */
export function getServerGameState(sessionId: string): ServerGameState {
  let state = sessions.get(sessionId)
  if (!state) {
    state = { activeGame: null }
    sessions.set(sessionId, state)
  }
  return state
}

/**
 * Stores server game state for a session.
 */
export function setServerGameState(sessionId: string, state: ServerGameState): void {
  sessions.set(sessionId, state)
}

/**
 * Clears the server game state for a session.
 */
export function clearServerGameState(sessionId: string): void {
  sessions.delete(sessionId)
}

/**
 * Switches the active game and clears old game's sub-state (D-002, Sec 3.3).
 */
export function switchGameServerState(sessionId: string, newGame: CasinoGame | null): void {
  const state = getServerGameState(sessionId)
  delete state.holdem
  delete state.draw
  delete state.blackjack
  delete state.blackjackCompetitive
  delete state.roulette
  delete state.threeCardPoker
  delete state.craps
  state.activeGame = newGame
}

/**
 * Retrieves hole cards for a specific player in a Hold'em session.
 */
export function getHoldemHoleCards(sessionId: string, playerId: string): [Card, Card] | undefined {
  return getServerGameState(sessionId).holdem?.holeCards.get(playerId)
}

/**
 * Retrieves hole cards for a specific player in a 5-Card Draw session.
 */
export function getDrawHoleCards(sessionId: string, playerId: string): Card[] | undefined {
  return getServerGameState(sessionId).draw?.holeCards.get(playerId)
}

/**
 * Resets the module-level storage entirely. For tests only.
 */
export function _resetAllServerState(): void {
  sessions.clear()
}

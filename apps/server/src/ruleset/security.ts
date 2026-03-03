/**
 * Server-side security helpers for the casino ruleset.
 *
 * CRITICAL: These helpers enforce server-side authorization for all
 * player-facing thunks. Client-supplied playerId values must NEVER
 * be trusted — the authoritative identity comes from ctx.getClientId().
 */

import type { CasinoGameState } from '@weekend-casino/shared'
import type { IThunkContext } from '@volley/vgf/types'

type ThunkCtx = IThunkContext<CasinoGameState>

/**
 * Returns the authorized player ID for the current client connection.
 *
 * In VGF, ctx.getClientId() returns the session member ID of the socket
 * that dispatched the thunk. This is the ONLY trustworthy identity —
 * any playerId sent by the client in thunk arguments must be ignored
 * for human players.
 *
 * For bot actions (dispatched server-side), the caller passes an explicit
 * botId since bots don't have client connections.
 *
 * @returns The authorized player ID, or null if the player is not in the session.
 */
export function getAuthorizedPlayerId(ctx: ThunkCtx): string {
  return ctx.getClientId()
}

/**
 * Validates that the client-supplied playerId matches the authorized
 * player, or that the action is a bot action. Returns the validated
 * player ID or null if unauthorized.
 *
 * @param ctx - VGF thunk context
 * @param claimedPlayerId - The playerId claimed by the client
 * @param state - Current game state (for bot lookup)
 * @returns The validated player ID, or null if unauthorized
 */
export function validatePlayerIdOrBot(
  ctx: ThunkCtx,
  claimedPlayerId: string,
  state: CasinoGameState,
): string | null {
  // Check if this is a bot action (bots don't have client connections)
  const player = state.players.find(p => p.id === claimedPlayerId)
  if (player?.isBot) {
    // Bot actions are dispatched server-side (e.g., from botDecision thunk).
    // The calling thunk already validated the bot, so allow the claimed ID.
    return claimedPlayerId
  }

  // For human players, the client ID IS the player ID
  const authorizedId = getAuthorizedPlayerId(ctx)

  if (authorizedId !== claimedPlayerId) {
    // Mismatch: client is trying to act as another player
    console.warn(
      `[SECURITY] Player ID mismatch: client=${authorizedId} claimed=${claimedPlayerId}. Rejecting action.`,
    )
    return null
  }

  return authorizedId
}

/**
 * Validates that the acting player is the host.
 * Only the host can perform certain actions (game selection, etc.).
 *
 * @returns true if the caller is the host, false otherwise
 */
export function isCallerHost(ctx: ThunkCtx, state: CasinoGameState): boolean {
  const playerId = getAuthorizedPlayerId(ctx)
  const player = state.players.find(p => p.id === playerId)
  return player?.isHost === true
}

/**
 * Validates a betting amount against game rules.
 *
 * @returns An error message if invalid, or null if valid
 */
export function validateBetAmount(
  amount: number,
  playerStack: number,
  playerCurrentBet: number,
  currentBet: number,
  minRaiseIncrement: number,
  action: string,
): string | null {
  // Basic validation
  if (!Number.isFinite(amount) || amount < 0) {
    return 'Invalid bet amount'
  }

  if (amount === 0 && (action === 'bet' || action === 'raise')) {
    return 'Bet amount must be greater than zero'
  }

  // Total amount player needs to add
  const effectiveStack = playerStack + playerCurrentBet

  if (amount > effectiveStack) {
    return `Bet exceeds available stack (${effectiveStack})`
  }

  if (action === 'bet') {
    // Opening bet must be at least the minimum raise increment (big blind)
    if (amount < minRaiseIncrement) {
      return `Minimum bet is ${minRaiseIncrement}`
    }
  }

  if (action === 'raise') {
    // Raise must be at least: current bet + minimum raise increment
    const minimumRaise = currentBet + minRaiseIncrement
    if (amount < minimumRaise) {
      return `Minimum raise is ${minimumRaise}`
    }
  }

  return null
}

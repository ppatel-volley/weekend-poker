/**
 * Wallet System — Unified player chip balance across all games (D-005).
 *
 * Starting balance: 10,000 chips per session (D-005).
 * Wallet is the SINGLE source of truth between games.
 *
 * Sync Points (M1):
 *   SP1 — Game Start: fund game-local from wallet
 *   SP2 — Hand/Round End: apply delta to wallet
 *   SP3 — Game Switch: settle in-progress game, update wallet, clear sub-state
 *
 * During active gameplay, game sub-state balances (e.g., PokerGameState.players[].stack)
 * are live values; root wallet is updated only at sync points.
 */

/**
 * Starting chip balance for every player at session start (D-005).
 */
export const STARTING_WALLET_BALANCE = 10_000

/**
 * Wallet type — playerId -> current balance in chips.
 * Lives at root of CasinoGameState: wallet: Record<string, number>
 */
export type Wallet = Record<string, number>

/**
 * Wallet transaction for audit/history.
 */
export interface WalletTransaction {
  playerId: string
  delta: number                    // positive = gain, negative = loss
  game: string                     // e.g., 'holdem', 'blackjack_classic'
  reason: 'hand-win' | 'hand-loss' | 'rebuy' | 'adjustment' | 'other'
  timestamp: number
}

/**
 * Rebuy request — player requests additional chips during a session (v1).
 * In v2.2, rebuys are backed by persistent currency (real money or earned chips).
 */
export interface RebuyRequest {
  playerId: string
  requestedAmount: number
  timestamp: number
  approvedBy?: string             // admin or system
  approvedAt?: number
}

/**
 * Type guard to check if a value is a valid Wallet.
 */
export function isWallet(value: unknown): value is Wallet {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const wallet = value as Record<string, unknown>
  return Object.values(wallet).every((v) => typeof v === 'number')
}

/**
 * Type guard to check if a playerId has a valid wallet balance.
 */
export function hasWalletBalance(
  wallet: Wallet,
  playerId: string,
): boolean {
  return playerId in wallet && typeof wallet[playerId] === 'number'
}

/**
 * Get balance for a player, or 0 if not found.
 */
export function getWalletBalance(
  wallet: Wallet,
  playerId: string,
): number {
  return wallet[playerId] ?? 0
}

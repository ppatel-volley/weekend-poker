/**
 * Position logic for poker table seating, blinds, and turn order.
 *
 * All functions are pure — no mutation, no side effects.
 * Handles both standard (3+ player) and heads-up (2 player) rules.
 */
import type { PokerPlayer } from '@weekend-poker/shared'

/** Statuses that prevent a player from acting in a betting round. */
const INACTIVE_STATUSES = new Set(['folded', 'all_in', 'sitting_out', 'busted'])

/** Statuses that prevent a player from being dealt into a hand. */
const UNPLAYABLE_STATUSES = new Set(['busted', 'sitting_out'])

/**
 * Returns the index of the next active player (can still bet) after `fromIndex`,
 * wrapping around. Skips folded, all-in, sitting-out, and busted players.
 *
 * Returns -1 if no active player is found (all are inactive).
 */
export function nextActivePlayer(players: PokerPlayer[], fromIndex: number): number {
  const len = players.length
  for (let i = 1; i <= len; i++) {
    const idx = (fromIndex + i) % len
    const player = players[idx]
    if (player && !INACTIVE_STATUSES.has(player.status)) {
      return idx
    }
  }
  return -1
}

/**
 * Returns the index of the next player eligible for the dealer button
 * (not busted, not sitting out), wrapping clockwise from `fromIndex`.
 *
 * Used for both button rotation and blind assignment.
 */
function nextEligiblePlayer(players: PokerPlayer[], fromIndex: number): number {
  const len = players.length
  for (let i = 1; i <= len; i++) {
    const idx = (fromIndex + i) % len
    const player = players[idx]
    if (player && !UNPLAYABLE_STATUSES.has(player.status)) {
      return idx
    }
  }
  // Fallback: return fromIndex if no other eligible player found
  return fromIndex
}

/**
 * Finds the first active player (can still bet) to the left of the dealer button.
 * Used for post-flop betting order (flop, turn, river).
 */
export function findFirstActivePlayerLeftOfButton(
  players: PokerPlayer[],
  dealerIndex: number,
): number {
  return nextActivePlayer(players, dealerIndex)
}

/**
 * Finds the first active player to the left of the big blind.
 * Used for pre-flop betting order.
 *
 * In heads-up (2 players), the button/SB acts first pre-flop.
 */
export function findFirstActivePlayerLeftOfBB(
  players: PokerPlayer[],
  dealerIndex: number,
): number {
  const bbIndex = getBigBlindIndex(players, dealerIndex)
  return nextActivePlayer(players, bbIndex)
}

/**
 * Rotates the dealer button one position clockwise to the next eligible player.
 * Skips busted and sitting-out players.
 */
export function rotateDealerButton(
  players: PokerPlayer[],
  currentDealerIndex: number,
): number {
  return nextEligiblePlayer(players, currentDealerIndex)
}

/**
 * Returns the index of the small blind player.
 *
 * - Heads-up (2 players): the button IS the small blind.
 * - 3+ players: the first eligible player left of the button.
 */
export function getSmallBlindIndex(
  players: PokerPlayer[],
  dealerIndex: number,
): number {
  const activePlayers = players.filter(p => !UNPLAYABLE_STATUSES.has(p.status))
  if (activePlayers.length === 2) {
    // Heads-up: button is the small blind
    return dealerIndex
  }
  return nextEligiblePlayer(players, dealerIndex)
}

/**
 * Returns the index of the big blind player.
 *
 * - Heads-up (2 players): the non-button player is the big blind.
 * - 3+ players: the first eligible player left of the small blind.
 */
export function getBigBlindIndex(
  players: PokerPlayer[],
  dealerIndex: number,
): number {
  const sbIndex = getSmallBlindIndex(players, dealerIndex)
  return nextEligiblePlayer(players, sbIndex)
}

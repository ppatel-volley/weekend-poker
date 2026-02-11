/**
 * Side pot calculation for Texas Hold'em.
 *
 * Implements the algorithm from the poker rules doc (Section 8):
 * 1. Collect all players' bets, sorted ascending by amount
 * 2. For each unique bet level, calculate the pot from eligible players
 * 3. Folded players contribute chips but are not eligible to win
 * 4. Unmatched chips are returned to the player (single-player pot)
 *
 * All functions are pure — no mutation, no side effects.
 */
import type { PokerPlayer, SidePot } from '@weekend-poker/shared'

/** Statuses that disqualify a player from winning a pot. */
const INELIGIBLE_STATUSES = new Set(['folded', 'sitting_out', 'busted'])

/**
 * Calculates main pot and side pots from current player bets.
 *
 * The algorithm processes bet levels from lowest to highest. At each level,
 * all players who bet at least that amount contribute. Only non-folded players
 * are eligible to win the pot at each level.
 *
 * Returns an array of SidePot objects, ordered from main pot to highest side pot.
 * Empty array if no bets have been placed.
 */
export function calculateSidePots(players: PokerPlayer[]): SidePot[] {
  // Filter players who have placed any bet
  const bettingPlayers = players.filter(p => p.bet > 0)
  if (bettingPlayers.length === 0) return []

  // Get unique sorted bet levels
  const uniqueBets = [...new Set(bettingPlayers.map(p => p.bet))].sort((a, b) => a - b)

  const pots: SidePot[] = []
  let previousLevel = 0

  for (const level of uniqueBets) {
    const increment = level - previousLevel
    if (increment <= 0) continue

    // Players who contributed at this level (bet >= level)
    const contributingPlayers = bettingPlayers.filter(p => p.bet >= level)
    const amount = increment * contributingPlayers.length

    // Only non-folded contributors are eligible to win
    const eligiblePlayerIds = contributingPlayers
      .filter(p => !INELIGIBLE_STATUSES.has(p.status))
      .map(p => p.id)

    pots.push({ amount, eligiblePlayerIds })
    previousLevel = level
  }

  return pots
}

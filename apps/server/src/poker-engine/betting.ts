/**
 * Betting rules for No-Limit Texas Hold'em.
 *
 * Implements the legal action matrix and bet sizing rules
 * from the poker rules doc (Section 7).
 *
 * All functions are pure — no mutation, no side effects.
 */
import type { PokerGameState, PokerPlayer, PlayerAction } from '@weekend-poker/shared'
import { PokerPhase } from '@weekend-poker/shared'

/** Actions that count as a player having voluntarily acted in a betting round. */
const VOLUNTARY_ACTIONS = new Set<PlayerAction>([
  'fold', 'check', 'call', 'bet', 'raise', 'all_in',
])

/** Blind-posting actions — these do NOT count as the player having "acted". */
const BLIND_ACTIONS = new Set<PlayerAction>([
  'post_small_blind', 'post_big_blind',
])

/**
 * Returns the list of legal actions for a given player in the current state.
 *
 * Legal action matrix (from rules doc Section 7):
 * - No bet this round:     fold, check, bet, all-in
 * - Facing bet/raise:      fold, call, raise, all-in
 * - Player is all-in:      (none)
 * - Player has folded:     (none)
 */
export function getLegalActions(state: PokerGameState, playerId: string): PlayerAction[] {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return []

  // Already all-in or folded — no actions available
  if (player.status === 'all_in' || player.status === 'folded') return []

  const amountToCall = state.currentBet - player.bet
  const actions: PlayerAction[] = []

  if (amountToCall <= 0) {
    // No bet facing (unopened pot, or player already matches current bet)
    actions.push('fold', 'check')

    if (player.stack > 0) {
      actions.push('bet')
      actions.push('all_in')
    }
  } else {
    // Facing a bet or raise
    actions.push('fold')

    if (player.stack > 0) {
      // Can the player afford to call?
      if (player.stack >= amountToCall) {
        actions.push('call')
      }

      // Can the player afford to raise (above a call)?
      const minRaiseTotal = state.currentBet + state.minRaiseIncrement
      const amountNeededForMinRaise = minRaiseTotal - player.bet
      if (player.stack > amountToCall && player.stack >= amountNeededForMinRaise) {
        actions.push('raise')
      }

      actions.push('all_in')
    }
  }

  return actions
}

/**
 * Returns the minimum and maximum bet/raise amounts for a player.
 *
 * For 'bet': min = 1 big blind, max = player's stack
 * For 'raise': min = currentBet + minRaiseIncrement, max = player's stack
 *
 * The all-in exception: if the player's stack is less than the min, they
 * can still go all-in — so min is capped at stack.
 *
 * Returns amounts as total bet (not additional chips).
 */
export function getBetLimits(
  state: PokerGameState,
  playerId: string,
  action: 'bet' | 'raise',
): { min: number; max: number } {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return { min: 0, max: 0 }

  const stack = player.stack + player.bet // Total chips available (including what's already bet)

  if (action === 'bet') {
    const minBet = Math.min(state.blindLevel.bigBlind, stack)
    return { min: minBet, max: stack }
  }

  // Raise: minimum raise total = current bet + previous raise increment
  const minRaiseTotal = state.currentBet + state.minRaiseIncrement
  // Cap at stack if player cannot meet the minimum
  const min = Math.min(minRaiseTotal, stack)
  return { min, max: stack }
}

/**
 * Checks whether the current betting round is complete.
 *
 * A betting round is complete when:
 * 1. All active (non-folded, non-all-in) players have voluntarily acted, AND
 * 2. All active players have matched the current bet (or are all-in)
 *
 * Special cases:
 * - Big blind option (pre-flop): if no raise occurred and the BB has only
 *   posted their blind, they still get to act (check or raise).
 * - If only one non-folded player remains, the round is complete.
 * - If all remaining players are all-in, the round is complete.
 */
export function isBettingRoundComplete(state: PokerGameState): boolean {
  const remainingPlayers = state.players.filter(
    p => p.status === 'active' || p.status === 'all_in',
  )

  // If only one player remains, round is over
  if (remainingPlayers.length <= 1) return true

  // If all remaining are all-in, round is over
  const activePlayers = state.players.filter(p => p.status === 'active')
  if (activePlayers.length === 0) return true

  // If only one active (non-all-in) player, round is over
  if (activePlayers.length === 1) {
    const sole = activePlayers[0]!
    // Check the sole active player has acted or their bet matches
    if (hasPlayerVoluntarilyActed(sole) && sole.bet >= state.currentBet) {
      return true
    }
    // Even if not acted, if there's nothing to call, round is over
    // (e.g., everyone else folded or is all-in and bets are matched)
    if (sole.bet >= state.currentBet) {
      // But check BB option
      if (isPreFlop(state) && !hasPlayerVoluntarilyActed(sole)) {
        return false
      }
      return true
    }
  }

  // Check each active player has acted and bets are matched
  for (const player of activePlayers) {
    if (!hasPlayerVoluntarilyActed(player)) return false
    if (player.bet < state.currentBet) return false
  }

  return true
}

/**
 * Returns true if only one non-folded player remains in the hand.
 * All-in players count as remaining.
 */
export function isOnlyOnePlayerRemaining(state: PokerGameState): boolean {
  const remaining = state.players.filter(
    p => p.status === 'active' || p.status === 'all_in',
  )
  return remaining.length === 1
}

/**
 * Returns true if all non-folded players are all-in (no active players with chips).
 */
export function areAllRemainingPlayersAllIn(state: PokerGameState): boolean {
  const remaining = state.players.filter(
    p => p.status === 'active' || p.status === 'all_in',
  )
  if (remaining.length === 0) return false
  return remaining.every(p => p.status === 'all_in')
}

/** Checks whether a player's last action counts as having voluntarily acted. */
function hasPlayerVoluntarilyActed(player: PokerPlayer): boolean {
  if (!player.lastAction) return false
  if (BLIND_ACTIONS.has(player.lastAction)) return false
  return VOLUNTARY_ACTIONS.has(player.lastAction)
}

/** Returns true if the current phase is pre-flop betting. */
function isPreFlop(state: PokerGameState): boolean {
  return state.phase === PokerPhase.PreFlopBetting
}

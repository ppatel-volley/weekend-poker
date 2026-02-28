/**
 * Three Card Poker hand evaluator.
 *
 * CRITICAL: 3-card poker uses DIFFERENT rankings from 5-card poker.
 * With only 3 cards, straights are rarer than flushes:
 *   - 48 straight combos vs 1,096 flush combos
 * So straights rank ABOVE flushes.
 *
 * Rankings (best to worst):
 *   1. Straight Flush (48 combos)
 *   2. Three of a Kind (52 combos)
 *   3. Straight (720 combos) — ABOVE flush!
 *   4. Flush (1,096 combos)
 *   5. Pair (3,744 combos)
 *   6. High Card (16,440 combos)
 *
 * Rank-band bases use 1000-wide gaps (RC-3 fix) to ensure monotonic ordering.
 * All straight flush strengths > all three-of-a-kind strengths, etc.
 */

import type { Card, TcpHandRank } from '@weekend-casino/shared'
import { rankToNumeric } from '@weekend-casino/shared'

/** Evaluated TCP hand result. */
export interface TcpHandResult {
  rank: TcpHandRank
  /** Numeric strength for comparison (higher = better). Monotonically ordered across ALL ranks. */
  strength: number
  /** Human-readable description. */
  description: string
}

/**
 * Rank-band bases. Each band is 1000 wide. Kicker values stay within 0-999.
 * Guarantees: straight_flush > three_of_a_kind > straight > flush > pair > high_card
 * regardless of the specific cards involved.
 */
const TCP_RANK_BASE: Record<TcpHandRank, number> = {
  straight_flush: 6000,
  three_of_a_kind: 5000,
  straight: 4000,
  flush: 3000,
  pair: 2000,
  high_card: 1000,
}

const RANK_NAMES: Record<number, string> = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
  8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace',
}

function rankName(n: number): string {
  return RANK_NAMES[n] ?? String(n)
}

function rankNamePlural(n: number): string {
  const plurals: Record<number, string> = {
    6: 'Sixes', 14: 'Aces',
  }
  return plurals[n] ?? `${rankName(n)}s`
}

/**
 * Evaluates a 3-card poker hand.
 * NOT reusing the 5-card evaluateHand — different ranking system.
 *
 * Kicker encoding (within each 1000-wide band):
 * - straight_flush / straight: top rank (0-14). A-2-3 low straight uses rank 3.
 * - three_of_a_kind: trip rank (0-14).
 * - flush / high_card: ranks[0]*49 + ranks[1]*7 + ranks[2] (max 784).
 * - pair: pairRank*15 + kicker (max 224).
 */
export function evaluateTcpHand(cards: [Card, Card, Card]): TcpHandResult {
  const ranks = cards.map(c => rankToNumeric(c.rank)).sort((a, b) => b - a)
  const suits = cards.map(c => c.suit)
  const allSameSuit = suits[0] === suits[1] && suits[1] === suits[2]
  const allSameRank = ranks[0] === ranks[1] && ranks[1] === ranks[2]

  // Check for sequential: either normal consecutive or A-2-3 wheel
  const isNormalSequential = ranks[0]! - ranks[2]! === 2 && new Set(ranks).size === 3
  const isWheel = ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2
  const isSequential = isNormalSequential || isWheel

  const hasPair = !allSameRank && (ranks[0] === ranks[1] || ranks[1] === ranks[2])

  // For A-2-3 low straight, treat the top rank as 3 (not 14)
  const straightTopRank = isWheel ? 3 : ranks[0]!

  if (isSequential && allSameSuit) {
    return {
      rank: 'straight_flush',
      strength: TCP_RANK_BASE.straight_flush + straightTopRank,
      description: `Straight Flush, ${rankName(straightTopRank)}-high`,
    }
  }

  if (allSameRank) {
    return {
      rank: 'three_of_a_kind',
      strength: TCP_RANK_BASE.three_of_a_kind + ranks[0]!,
      description: `Three of a Kind, ${rankNamePlural(ranks[0]!)}`,
    }
  }

  if (isSequential) {
    return {
      rank: 'straight',
      strength: TCP_RANK_BASE.straight + straightTopRank,
      description: `Straight, ${rankName(straightTopRank)}-high`,
    }
  }

  if (allSameSuit) {
    return {
      rank: 'flush',
      strength: TCP_RANK_BASE.flush + ranks[0]! * 49 + ranks[1]! * 7 + ranks[2]!,
      description: `Flush, ${rankName(ranks[0]!)}-high`,
    }
  }

  if (hasPair) {
    const pairRank = ranks[0] === ranks[1] ? ranks[0]! : ranks[1]!
    const kicker = ranks.find(r => r !== pairRank)!
    return {
      rank: 'pair',
      strength: TCP_RANK_BASE.pair + pairRank * 15 + kicker,
      description: `Pair of ${rankNamePlural(pairRank)}`,
    }
  }

  return {
    rank: 'high_card',
    strength: TCP_RANK_BASE.high_card + ranks[0]! * 49 + ranks[1]! * 7 + ranks[2]!,
    description: `${rankName(ranks[0]!)}-high`,
  }
}

/**
 * Dealer qualifies with Queen-high or better.
 * Any hand ranked pair or above qualifies automatically.
 * For high card hands, the highest card must be Queen (12) or better.
 */
export function dealerQualifies(hand: TcpHandResult): boolean {
  if (hand.rank !== 'high_card') return true
  const kicker = hand.strength - TCP_RANK_BASE.high_card
  const highRank = Math.floor(kicker / 49)
  return highRank >= 12 // Queen = 12, King = 13, Ace = 14
}

/**
 * Compares two TCP hands.
 * @returns Positive if handA wins, negative if handB wins, 0 for tie.
 */
export function compareTcpHands(a: TcpHandResult, b: TcpHandResult): number {
  return a.strength - b.strength
}

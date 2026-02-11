import type { Card } from '@weekend-poker/shared'
import { rankToNumeric } from '@weekend-poker/shared'

// ── Types ────────────────────────────────────────────────────────

/** Hand category ranking — 1 is best (Royal Flush), 10 is worst (High Card). */
export enum HandCategory {
  ROYAL_FLUSH = 1,
  STRAIGHT_FLUSH = 2,
  FOUR_OF_A_KIND = 3,
  FULL_HOUSE = 4,
  FLUSH = 5,
  STRAIGHT = 6,
  THREE_OF_A_KIND = 7,
  TWO_PAIR = 8,
  ONE_PAIR = 9,
  HIGH_CARD = 10,
}

export interface HandRank {
  /** The hand category (e.g. FLUSH, FULL_HOUSE). */
  category: HandCategory
  /** 1 (best) to 10 (worst). Same as the enum value. */
  categoryRank: number
  /** Sorted kicker values for tiebreaking within the same category. */
  ranks: number[]
  /** The 5 cards that form the best hand. */
  cards: Card[]
  /** Human-readable description, e.g. "Full House, Kings over Fours". */
  description: string
}

// ── Rank name lookup ─────────────────────────────────────────────

const RANK_NAMES: Record<number, string> = {
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine',
  10: 'Ten',
  11: 'Jack',
  12: 'Queen',
  13: 'King',
  14: 'Ace',
}

const RANK_NAMES_PLURAL: Record<number, string> = {
  2: 'Twos',
  3: 'Threes',
  4: 'Fours',
  5: 'Fives',
  6: 'Sixes',
  7: 'Sevens',
  8: 'Eights',
  9: 'Nines',
  10: 'Tens',
  11: 'Jacks',
  12: 'Queens',
  13: 'Kings',
  14: 'Aces',
}

function rankName(n: number): string {
  return RANK_NAMES[n] ?? String(n)
}

function rankNamePlural(n: number): string {
  return RANK_NAMES_PLURAL[n] ?? `${n}s`
}

// ── Combination generation ───────────────────────────────────────

/** Generates all C(n,5) 5-card combinations from a 7-card hand. */
function* combinations5(cards: Card[]): Generator<Card[]> {
  const n = cards.length
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let cc = b + 1; cc < n - 2; cc++) {
        for (let d = cc + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            yield [cards[a]!, cards[b]!, cards[cc]!, cards[d]!, cards[e]!]
          }
        }
      }
    }
  }
}

// ── 5-card hand classification ───────────────────────────────────

/** Classifies a single 5-card hand. */
function classify5(cards: Card[]): HandRank {
  const nums = cards.map(c => rankToNumeric(c.rank)).sort((a, b) => b - a)
  const suits = cards.map(c => c.suit)

  const isFlush = suits.every(s => s === suits[0])

  // Check for straight — account for ace-low (wheel)
  const isStraight = checkStraight(nums)
  const isWheel = isWheelStraight(nums)

  // Determine straight high card
  let straightHigh = nums[0]!
  if (isWheel) {
    straightHigh = 5 // Ace plays as 1 in the wheel
  }

  // Count occurrences of each rank
  const countMap = new Map<number, number>()
  for (const n of nums) {
    countMap.set(n, (countMap.get(n) ?? 0) + 1)
  }

  // Sort groups: by count descending, then by rank descending
  const groups = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1] || b[0] - a[0])

  // ── Royal Flush
  if (isFlush && isStraight && nums[0] === 14 && nums[4] === 10) {
    return makeResult(HandCategory.ROYAL_FLUSH, [14], cards, 'Royal Flush')
  }

  // ── Straight Flush
  if (isFlush && isStraight) {
    return makeResult(
      HandCategory.STRAIGHT_FLUSH,
      [straightHigh],
      cards,
      `Straight Flush, ${rankName(straightHigh)}-high`,
    )
  }

  // ── Four of a Kind
  if (groups[0]![1] === 4) {
    const quadRank = groups[0]![0]
    const kicker = groups[1]![0]
    return makeResult(
      HandCategory.FOUR_OF_A_KIND,
      [quadRank, kicker],
      cards,
      `Four of a Kind, ${rankNamePlural(quadRank)}`,
    )
  }

  // ── Full House
  if (groups[0]![1] === 3 && groups[1]![1] === 2) {
    const tripsRank = groups[0]![0]
    const pairRank = groups[1]![0]
    return makeResult(
      HandCategory.FULL_HOUSE,
      [tripsRank, pairRank],
      cards,
      `Full House, ${rankNamePlural(tripsRank)} over ${rankNamePlural(pairRank)}`,
    )
  }

  // ── Flush
  if (isFlush) {
    return makeResult(
      HandCategory.FLUSH,
      nums,
      cards,
      `Flush, ${rankName(nums[0]!)}-high`,
    )
  }

  // ── Straight
  if (isStraight) {
    return makeResult(
      HandCategory.STRAIGHT,
      [straightHigh],
      cards,
      `Straight, ${rankName(straightHigh)}-high`,
    )
  }

  // ── Three of a Kind
  if (groups[0]![1] === 3) {
    const tripsRank = groups[0]![0]
    const kickers = groups.slice(1).map(g => g[0]).sort((a, b) => b - a)
    return makeResult(
      HandCategory.THREE_OF_A_KIND,
      [tripsRank, ...kickers],
      cards,
      `Three of a Kind, ${rankNamePlural(tripsRank)}`,
    )
  }

  // ── Two Pair
  if (groups[0]![1] === 2 && groups[1]![1] === 2) {
    const highPair = Math.max(groups[0]![0], groups[1]![0])
    const lowPair = Math.min(groups[0]![0], groups[1]![0])
    const kicker = groups[2]![0]
    return makeResult(
      HandCategory.TWO_PAIR,
      [highPair, lowPair, kicker],
      cards,
      `Two Pair, ${rankNamePlural(highPair)} and ${rankNamePlural(lowPair)}`,
    )
  }

  // ── One Pair
  if (groups[0]![1] === 2) {
    const pairRank = groups[0]![0]
    const kickers = groups.slice(1).map(g => g[0]).sort((a, b) => b - a)
    return makeResult(
      HandCategory.ONE_PAIR,
      [pairRank, ...kickers],
      cards,
      `Pair of ${rankNamePlural(pairRank)}`,
    )
  }

  // ── High Card
  return makeResult(
    HandCategory.HIGH_CARD,
    nums,
    cards,
    `High Card, ${rankName(nums[0]!)}`,
  )
}

/** Check if sorted descending nums form a straight (including ace-low). */
function checkStraight(nums: number[]): boolean {
  // Standard straight: consecutive descending values
  if (nums[0]! - nums[4]! === 4 && new Set(nums).size === 5) return true
  // Ace-low (wheel): A-5-4-3-2 in sorted desc is [14, 5, 4, 3, 2]
  return isWheelStraight(nums)
}

/** Check specifically for the wheel (A-2-3-4-5). */
function isWheelStraight(nums: number[]): boolean {
  return (
    nums[0] === 14 &&
    nums[1] === 5 &&
    nums[2] === 4 &&
    nums[3] === 3 &&
    nums[4] === 2
  )
}

function makeResult(
  category: HandCategory,
  ranks: number[],
  cards: Card[],
  description: string,
): HandRank {
  return {
    category,
    categoryRank: category as number,
    ranks,
    cards: [...cards],
    description,
  }
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Evaluates the best 5-card hand from a 7-card input
 * (2 hole cards + 5 community cards).
 *
 * Examines all C(7,5) = 21 possible 5-card combinations and
 * returns the highest-ranking one.
 *
 * Pure function — no mutation, no side effects.
 */
export function evaluateHand(sevenCards: Card[]): HandRank {
  let best: HandRank | null = null

  for (const combo of combinations5(sevenCards)) {
    const result = classify5(combo)
    if (best === null || compareHandRanks(result, best) > 0) {
      best = result
    }
  }

  return best!
}

/**
 * Compares two HandRank results.
 *
 * @returns  Positive if handA wins, negative if handB wins, 0 for split pot.
 */
export function compareHands(handA: HandRank, handB: HandRank): number {
  return compareHandRanks(handA, handB)
}

/** Internal comparison — lower categoryRank is better (1 beats 10). */
function compareHandRanks(a: HandRank, b: HandRank): number {
  // Lower category rank is better (Royal Flush = 1, High Card = 10)
  if (a.categoryRank !== b.categoryRank) {
    return b.categoryRank - a.categoryRank
  }

  // Same category — compare kicker arrays element-by-element
  const len = Math.max(a.ranks.length, b.ranks.length)
  for (let i = 0; i < len; i++) {
    const aRank = a.ranks[i] ?? 0
    const bRank = b.ranks[i] ?? 0
    if (aRank !== bRank) return aRank - bRank
  }

  return 0
}

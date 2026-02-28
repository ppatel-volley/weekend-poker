/**
 * 5-Card Draw hand evaluator.
 *
 * Evaluates exactly 5 cards (no community cards, no combination search).
 * Reuses HandCategory/HandRank types and compareHands from poker-engine
 * since the hand rankings are identical.
 */
import type { Card } from '@weekend-casino/shared'
import { rankToNumeric } from '@weekend-casino/shared'
import { HandCategory, compareHands } from '../poker-engine/hand-evaluator.js'
import type { HandRank } from '../poker-engine/hand-evaluator.js'

export { HandCategory, compareHands }
export type { HandRank }

// ── Rank name lookup ─────────────────────────────────────────────

const RANK_NAMES: Record<number, string> = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six',
  7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten',
  11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace',
}

const RANK_NAMES_PLURAL: Record<number, string> = {
  2: 'Twos', 3: 'Threes', 4: 'Fours', 5: 'Fives', 6: 'Sixes',
  7: 'Sevens', 8: 'Eights', 9: 'Nines', 10: 'Tens',
  11: 'Jacks', 12: 'Queens', 13: 'Kings', 14: 'Aces',
}

function rankName(n: number): string {
  return RANK_NAMES[n] ?? String(n)
}

function rankNamePlural(n: number): string {
  return RANK_NAMES_PLURAL[n] ?? `${n}s`
}

// ── 5-card classification ────────────────────────────────────────

/**
 * Evaluates a 5-card hand for 5-Card Draw.
 * Unlike Hold'em, there are no community cards — the input IS the hand.
 */
export function evaluateDrawHand(fiveCards: Card[]): HandRank {
  if (fiveCards.length !== 5) {
    throw new Error(`Expected 5 cards, got ${fiveCards.length}`)
  }

  const nums = fiveCards.map(c => rankToNumeric(c.rank)).sort((a, b) => b - a)
  const suits = fiveCards.map(c => c.suit)

  const isFlush = suits.every(s => s === suits[0])
  const isStraight = checkStraight(nums)
  const isWheel = isWheelStraight(nums)

  let straightHigh = nums[0]!
  if (isWheel) straightHigh = 5

  const countMap = new Map<number, number>()
  for (const n of nums) {
    countMap.set(n, (countMap.get(n) ?? 0) + 1)
  }

  const groups = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1] || b[0] - a[0])

  if (isFlush && isStraight && nums[0] === 14 && nums[4] === 10) {
    return makeResult(HandCategory.ROYAL_FLUSH, [14], fiveCards, 'Royal Flush')
  }

  if (isFlush && isStraight) {
    return makeResult(
      HandCategory.STRAIGHT_FLUSH, [straightHigh], fiveCards,
      `Straight Flush, ${rankName(straightHigh)}-high`,
    )
  }

  if (groups[0]![1] === 4) {
    const quadRank = groups[0]![0]
    const kicker = groups[1]![0]
    return makeResult(
      HandCategory.FOUR_OF_A_KIND, [quadRank, kicker], fiveCards,
      `Four of a Kind, ${rankNamePlural(quadRank)}`,
    )
  }

  if (groups[0]![1] === 3 && groups[1]![1] === 2) {
    const tripsRank = groups[0]![0]
    const pairRank = groups[1]![0]
    return makeResult(
      HandCategory.FULL_HOUSE, [tripsRank, pairRank], fiveCards,
      `Full House, ${rankNamePlural(tripsRank)} over ${rankNamePlural(pairRank)}`,
    )
  }

  if (isFlush) {
    return makeResult(
      HandCategory.FLUSH, nums, fiveCards,
      `Flush, ${rankName(nums[0]!)}-high`,
    )
  }

  if (isStraight) {
    return makeResult(
      HandCategory.STRAIGHT, [straightHigh], fiveCards,
      `Straight, ${rankName(straightHigh)}-high`,
    )
  }

  if (groups[0]![1] === 3) {
    const tripsRank = groups[0]![0]
    const kickers = groups.slice(1).map(g => g[0]).sort((a, b) => b - a)
    return makeResult(
      HandCategory.THREE_OF_A_KIND, [tripsRank, ...kickers], fiveCards,
      `Three of a Kind, ${rankNamePlural(tripsRank)}`,
    )
  }

  if (groups[0]![1] === 2 && groups[1]![1] === 2) {
    const highPair = Math.max(groups[0]![0], groups[1]![0])
    const lowPair = Math.min(groups[0]![0], groups[1]![0])
    const kicker = groups[2]![0]
    return makeResult(
      HandCategory.TWO_PAIR, [highPair, lowPair, kicker], fiveCards,
      `Two Pair, ${rankNamePlural(highPair)} and ${rankNamePlural(lowPair)}`,
    )
  }

  if (groups[0]![1] === 2) {
    const pairRank = groups[0]![0]
    const kickers = groups.slice(1).map(g => g[0]).sort((a, b) => b - a)
    return makeResult(
      HandCategory.ONE_PAIR, [pairRank, ...kickers], fiveCards,
      `Pair of ${rankNamePlural(pairRank)}`,
    )
  }

  return makeResult(
    HandCategory.HIGH_CARD, nums, fiveCards,
    `High Card, ${rankName(nums[0]!)}`,
  )
}

function checkStraight(nums: number[]): boolean {
  if (nums[0]! - nums[4]! === 4 && new Set(nums).size === 5) return true
  return isWheelStraight(nums)
}

function isWheelStraight(nums: number[]): boolean {
  return (
    nums[0] === 14 && nums[1] === 5 && nums[2] === 4 &&
    nums[3] === 3 && nums[4] === 2
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

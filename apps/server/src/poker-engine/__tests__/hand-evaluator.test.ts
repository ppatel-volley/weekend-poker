import { describe, it, expect } from 'vitest'
import { evaluateHand, compareHands, HandCategory } from '../hand-evaluator.js'
import type { Card, Suit } from '@weekend-poker/shared'

// ── Helpers ──────────────────────────────────────────────────────

/** Shorthand card builder: c('As') => { rank: 'A', suit: 'spades' } */
function c(notation: string): Card {
  const suitMap: Record<string, Suit> = {
    s: 'spades',
    h: 'hearts',
    d: 'diamonds',
    c: 'clubs',
  }
  // Handle '10' rank specially
  let rank: string
  let suitChar: string
  if (notation.startsWith('10')) {
    rank = '10'
    suitChar = notation[2]!
  } else {
    rank = notation[0]!
    suitChar = notation[1]!
  }
  const suit = suitMap[suitChar]
  if (!suit) throw new Error(`Invalid suit char '${suitChar}' in '${notation}'`)
  return { rank: rank as Card['rank'], suit }
}

/** Build a hand of 7 cards from notation strings. */
function hand(...notations: string[]): Card[] {
  return notations.map(c)
}

// ── Hand Category Recognition ────────────────────────────────────

describe('evaluateHand — category recognition', () => {
  describe('Royal Flush', () => {
    it('should identify a royal flush in spades', () => {
      const result = evaluateHand(hand('As', 'Ks', 'Qs', 'Js', '10s', '3d', '7h'))
      expect(result.category).toBe(HandCategory.ROYAL_FLUSH)
      expect(result.categoryRank).toBe(1)
      expect(result.description).toMatch(/Royal Flush/i)
    })

    it('should identify a royal flush in hearts with irrelevant extras', () => {
      const result = evaluateHand(hand('Ah', 'Kh', 'Qh', 'Jh', '10h', '2c', '2d'))
      expect(result.category).toBe(HandCategory.ROYAL_FLUSH)
      expect(result.cards).toHaveLength(5)
    })
  })

  describe('Straight Flush', () => {
    it('should identify a 9-high straight flush', () => {
      const result = evaluateHand(hand('9d', '8d', '7d', '6d', '5d', 'Kc', '2h'))
      expect(result.category).toBe(HandCategory.STRAIGHT_FLUSH)
      expect(result.categoryRank).toBe(2)
      expect(result.description).toMatch(/Straight Flush/i)
    })

    it('should identify the wheel straight flush (A-2-3-4-5 suited)', () => {
      const result = evaluateHand(hand('Ac', '2c', '3c', '4c', '5c', 'Kd', '9h'))
      expect(result.category).toBe(HandCategory.STRAIGHT_FLUSH)
      // Ace plays low, so 5 is the high card
      expect(result.ranks[0]).toBe(5)
    })

    it('should identify 6-high straight flush over ace-high flush', () => {
      const result = evaluateHand(hand('6s', '5s', '4s', '3s', '2s', 'As', 'Ks'))
      expect(result.category).toBe(HandCategory.STRAIGHT_FLUSH)
      // Best straight flush is 2-3-4-5-6
      expect(result.ranks[0]).toBe(6)
    })
  })

  describe('Four of a Kind', () => {
    it('should identify four aces', () => {
      const result = evaluateHand(hand('As', 'Ah', 'Ad', 'Ac', 'Ks', '7d', '3h'))
      expect(result.category).toBe(HandCategory.FOUR_OF_A_KIND)
      expect(result.categoryRank).toBe(3)
      expect(result.description).toMatch(/Four of a Kind/i)
    })

    it('should identify four twos with best kicker', () => {
      const result = evaluateHand(hand('2s', '2h', '2d', '2c', 'As', 'Kd', '7h'))
      expect(result.category).toBe(HandCategory.FOUR_OF_A_KIND)
      // Kicker should be ace (14)
      expect(result.ranks).toEqual([2, 14])
    })
  })

  describe('Full House', () => {
    it('should identify kings full of fours', () => {
      const result = evaluateHand(hand('Ks', 'Kh', 'Kd', '4c', '4s', '9d', '2h'))
      expect(result.category).toBe(HandCategory.FULL_HOUSE)
      expect(result.categoryRank).toBe(4)
      expect(result.description).toMatch(/Full House/i)
    })

    it('should identify aces full of kings', () => {
      const result = evaluateHand(hand('As', 'Ah', 'Ad', 'Ks', 'Kh', '7d', '3c'))
      expect(result.category).toBe(HandCategory.FULL_HOUSE)
      expect(result.ranks).toEqual([14, 13])
    })

    it('should choose the best full house with two trips available', () => {
      // Three Kings and three Fours — should be Kings full of Fours
      const result = evaluateHand(hand('Ks', 'Kh', 'Kd', '4c', '4s', '4d', '2h'))
      expect(result.category).toBe(HandCategory.FULL_HOUSE)
      expect(result.ranks).toEqual([13, 4])
    })

    it('should choose highest pair when trips + two pairs available', () => {
      // Three 8s, pair of Aces, pair of 3s
      const result = evaluateHand(hand('8s', '8h', '8d', 'As', 'Ah', '3s', '3h'))
      expect(result.category).toBe(HandCategory.FULL_HOUSE)
      expect(result.ranks).toEqual([8, 14])
    })
  })

  describe('Flush', () => {
    it('should identify an ace-high flush', () => {
      const result = evaluateHand(hand('As', 'Js', '8s', '5s', '3s', 'Kd', '9h'))
      expect(result.category).toBe(HandCategory.FLUSH)
      expect(result.categoryRank).toBe(5)
      expect(result.description).toMatch(/Flush/i)
    })

    it('should pick the best five flush cards from six suited', () => {
      const result = evaluateHand(hand('Ks', 'Js', '9s', '7s', '5s', '3s', '2h'))
      expect(result.category).toBe(HandCategory.FLUSH)
      expect(result.ranks).toEqual([13, 11, 9, 7, 5])
    })

    it('should pick the best five flush cards from seven suited', () => {
      const result = evaluateHand(hand('Ks', 'Js', '9s', '7s', '5s', '3s', '2s'))
      expect(result.category).toBe(HandCategory.FLUSH)
      expect(result.ranks).toEqual([13, 11, 9, 7, 5])
    })
  })

  describe('Straight', () => {
    it('should identify an ace-high straight (broadway)', () => {
      const result = evaluateHand(hand('As', 'Kd', 'Qh', 'Jc', '10s', '5d', '2h'))
      expect(result.category).toBe(HandCategory.STRAIGHT)
      expect(result.categoryRank).toBe(6)
      expect(result.ranks[0]).toBe(14)
    })

    it('should identify an ace-low straight (the wheel)', () => {
      const result = evaluateHand(hand('As', '2d', '3h', '4c', '5s', 'Kd', '9h'))
      expect(result.category).toBe(HandCategory.STRAIGHT)
      expect(result.ranks[0]).toBe(5)
    })

    it('should NOT recognise Q-K-A-2-3 as a straight (no wrap-around)', () => {
      const result = evaluateHand(hand('Qs', 'Kd', 'Ah', '2c', '3s', '7d', '9h'))
      expect(result.category).not.toBe(HandCategory.STRAIGHT)
      expect(result.category).not.toBe(HandCategory.STRAIGHT_FLUSH)
    })

    it('should identify a six-high straight', () => {
      const result = evaluateHand(hand('6s', '5d', '4h', '3c', '2s', 'Kd', 'Jh'))
      expect(result.category).toBe(HandCategory.STRAIGHT)
      expect(result.ranks[0]).toBe(6)
    })

    it('should pick the highest straight from 7 consecutive cards', () => {
      const result = evaluateHand(hand('9s', '8d', '7h', '6c', '5s', '4d', '3h'))
      expect(result.category).toBe(HandCategory.STRAIGHT)
      expect(result.ranks[0]).toBe(9)
    })
  })

  describe('Three of a Kind', () => {
    it('should identify three jacks', () => {
      const result = evaluateHand(hand('Js', 'Jh', 'Jd', 'As', '9d', '5c', '2h'))
      expect(result.category).toBe(HandCategory.THREE_OF_A_KIND)
      expect(result.categoryRank).toBe(7)
      expect(result.description).toMatch(/Three of a Kind/i)
    })

    it('should include the two best kickers', () => {
      const result = evaluateHand(hand('7s', '7h', '7d', 'Ac', 'Kd', '3s', '2h'))
      expect(result.category).toBe(HandCategory.THREE_OF_A_KIND)
      expect(result.ranks).toEqual([7, 14, 13])
    })
  })

  describe('Two Pair', () => {
    it('should identify aces and kings', () => {
      const result = evaluateHand(hand('As', 'Ah', 'Ks', 'Kh', '9d', '5c', '2h'))
      expect(result.category).toBe(HandCategory.TWO_PAIR)
      expect(result.categoryRank).toBe(8)
      expect(result.description).toMatch(/Two Pair/i)
    })

    it('should pick the best two pairs with best kicker from three pairs', () => {
      // Pairs: AA, KK, QQ — should pick AA + KK with Q kicker
      const result = evaluateHand(hand('As', 'Ah', 'Ks', 'Kh', 'Qs', 'Qh', '2d'))
      expect(result.category).toBe(HandCategory.TWO_PAIR)
      expect(result.ranks).toEqual([14, 13, 12])
    })

    it('should include the best kicker', () => {
      const result = evaluateHand(hand('5s', '5h', '3s', '3h', 'Ad', 'Kc', '2h'))
      expect(result.category).toBe(HandCategory.TWO_PAIR)
      expect(result.ranks).toEqual([5, 3, 14])
    })
  })

  describe('One Pair', () => {
    it('should identify a pair of tens', () => {
      const result = evaluateHand(hand('10s', '10h', 'Ad', 'Kc', '7s', '4d', '2h'))
      expect(result.category).toBe(HandCategory.ONE_PAIR)
      expect(result.categoryRank).toBe(9)
      expect(result.description).toMatch(/Pair/i)
    })

    it('should include the three best kickers', () => {
      const result = evaluateHand(hand('6s', '6h', 'Ad', 'Kc', 'Qs', '4d', '2h'))
      expect(result.category).toBe(HandCategory.ONE_PAIR)
      expect(result.ranks).toEqual([6, 14, 13, 12])
    })
  })

  describe('High Card', () => {
    it('should identify ace-high when no other hand is made', () => {
      const result = evaluateHand(hand('As', 'Jd', '9h', '7c', '5s', '3d', '2h'))
      expect(result.category).toBe(HandCategory.HIGH_CARD)
      expect(result.categoryRank).toBe(10)
      expect(result.description).toMatch(/High Card/i)
    })

    it('should return the five highest kickers', () => {
      const result = evaluateHand(hand('Ks', 'Jd', '9h', '7c', '4s', '3d', '2h'))
      expect(result.category).toBe(HandCategory.HIGH_CARD)
      expect(result.ranks).toEqual([13, 11, 9, 7, 4])
    })
  })
})

// ── Kicker Comparisons ───────────────────────────────────────────

describe('compareHands — kicker comparisons within same category', () => {
  it('should rank higher four-of-a-kind above lower', () => {
    const handA = evaluateHand(hand('As', 'Ah', 'Ad', 'Ac', '2s', '3d', '4h'))
    const handB = evaluateHand(hand('Ks', 'Kh', 'Kd', 'Kc', 'As', '3d', '4h'))
    expect(compareHands(handA, handB)).toBeGreaterThan(0)
  })

  it('should use kicker to break four-of-a-kind tie', () => {
    const handA = evaluateHand(hand('9s', '9h', '9d', '9c', 'As', '3d', '4h'))
    const handB = evaluateHand(hand('9s', '9h', '9d', '9c', 'Ks', '3d', '4h'))
    expect(compareHands(handA, handB)).toBeGreaterThan(0)
  })

  it('should rank higher full house above lower (trips rank)', () => {
    const handA = evaluateHand(hand('As', 'Ah', 'Ad', 'Ks', 'Kh', '3d', '4h'))
    const handB = evaluateHand(hand('Ks', 'Kh', 'Kd', 'Qs', 'Qh', '3d', '4c'))
    expect(compareHands(handA, handB)).toBeGreaterThan(0)
  })

  it('should break full house tie by pair rank', () => {
    const handA = evaluateHand(hand('Js', 'Jh', 'Jd', 'As', 'Ah', '3d', '4h'))
    const handB = evaluateHand(hand('Js', 'Jh', 'Jd', 'Ks', 'Kh', '3d', '4c'))
    expect(compareHands(handA, handB)).toBeGreaterThan(0)
  })

  it('should compare flushes by highest differing kicker', () => {
    const handA = evaluateHand(hand('As', 'Qs', '10s', '8s', '6s', '3d', '2h'))
    const handB = evaluateHand(hand('As', 'Qs', '10s', '8s', '5s', '3d', '2h'))
    expect(compareHands(handA, handB)).toBeGreaterThan(0)
  })

  it('should compare straights by high card', () => {
    const handA = evaluateHand(hand('10s', '9d', '8h', '7c', '6s', '3d', '2h'))
    const handB = evaluateHand(hand('9s', '8d', '7h', '6c', '5s', '3d', '2h'))
    expect(compareHands(handA, handB)).toBeGreaterThan(0)
  })

  it('ace-high straight beats ace-low straight', () => {
    const handA = evaluateHand(hand('As', 'Kd', 'Qh', 'Jc', '10s', '3d', '2h'))
    const handB = evaluateHand(hand('Ad', '2h', '3c', '4s', '5d', '9s', '8h'))
    expect(compareHands(handA, handB)).toBeGreaterThan(0)
  })

  it('should compare three-of-a-kind by trips rank then kickers', () => {
    const handA = evaluateHand(hand('Qs', 'Qh', 'Qd', 'As', 'Kd', '3c', '2h'))
    const handB = evaluateHand(hand('Qs', 'Qh', 'Qd', 'As', 'Jd', '3c', '2h'))
    expect(compareHands(handA, handB)).toBeGreaterThan(0)
  })

  it('should compare two pair by higher pair, then lower pair, then kicker', () => {
    // Same top pair (Aces), different second pair
    const handA = evaluateHand(hand('As', 'Ah', 'Ks', 'Kh', '3d', '5c', '2h'))
    const handB = evaluateHand(hand('As', 'Ah', 'Qs', 'Qh', '3d', '5c', '2h'))
    expect(compareHands(handA, handB)).toBeGreaterThan(0)
  })

  it('should compare two pair by kicker when pairs are the same', () => {
    const handA = evaluateHand(hand('Ks', 'Kh', 'Qs', 'Qh', 'Ad', '3c', '2h'))
    const handB = evaluateHand(hand('Ks', 'Kh', 'Qs', 'Qh', 'Jd', '3c', '2h'))
    expect(compareHands(handA, handB)).toBeGreaterThan(0)
  })

  it('should compare one pair by pair rank then kickers', () => {
    const handA = evaluateHand(hand('As', 'Ah', 'Kd', 'Qc', 'Js', '3d', '2h'))
    const handB = evaluateHand(hand('Ks', 'Kh', 'Ad', 'Qc', 'Js', '3d', '2h'))
    expect(compareHands(handA, handB)).toBeGreaterThan(0)
  })

  it('should compare high cards by highest differing card', () => {
    const handA = evaluateHand(hand('As', 'Qd', '10h', '8c', '6s', '3d', '2h'))
    const handB = evaluateHand(hand('As', 'Jd', '10h', '8c', '6s', '3d', '2h'))
    expect(compareHands(handA, handB)).toBeGreaterThan(0)
  })
})

// ── Cross-Category Comparisons ───────────────────────────────────

describe('compareHands — cross-category comparisons', () => {
  it('royal flush beats straight flush', () => {
    const royal = evaluateHand(hand('As', 'Ks', 'Qs', 'Js', '10s', '3d', '7h'))
    const sf = evaluateHand(hand('9d', '8d', '7d', '6d', '5d', 'Kc', '2h'))
    expect(compareHands(royal, sf)).toBeGreaterThan(0)
  })

  it('straight flush beats four of a kind', () => {
    const sf = evaluateHand(hand('9d', '8d', '7d', '6d', '5d', 'Kc', '2h'))
    const quads = evaluateHand(hand('As', 'Ah', 'Ad', 'Ac', 'Ks', '7d', '3h'))
    expect(compareHands(sf, quads)).toBeGreaterThan(0)
  })

  it('four of a kind beats full house', () => {
    const quads = evaluateHand(hand('As', 'Ah', 'Ad', 'Ac', 'Ks', '7d', '3h'))
    const fh = evaluateHand(hand('Ks', 'Kh', 'Kd', 'Qs', 'Qh', '7d', '3c'))
    expect(compareHands(quads, fh)).toBeGreaterThan(0)
  })

  it('full house beats flush', () => {
    const fh = evaluateHand(hand('Ks', 'Kh', 'Kd', 'Qs', 'Qh', '7d', '3c'))
    const flush = evaluateHand(hand('Ad', 'Jd', '9d', '7d', '5d', 'Kc', '2h'))
    expect(compareHands(fh, flush)).toBeGreaterThan(0)
  })

  it('flush beats straight', () => {
    const flush = evaluateHand(hand('Ad', 'Jd', '9d', '7d', '5d', 'Kc', '2h'))
    const straight = evaluateHand(hand('10s', '9c', '8h', '7s', '6d', 'Kc', '2h'))
    expect(compareHands(flush, straight)).toBeGreaterThan(0)
  })

  it('straight beats three of a kind', () => {
    const straight = evaluateHand(hand('10s', '9c', '8h', '7s', '6d', 'Kc', '2h'))
    const trips = evaluateHand(hand('As', 'Ah', 'Ad', 'Kd', '9c', '5s', '2h'))
    expect(compareHands(straight, trips)).toBeGreaterThan(0)
  })

  it('three of a kind beats two pair', () => {
    const trips = evaluateHand(hand('7s', '7h', '7d', 'Ad', 'Kc', '5s', '2h'))
    const twoPair = evaluateHand(hand('As', 'Ah', 'Ks', 'Kh', 'Qd', '5c', '2h'))
    expect(compareHands(trips, twoPair)).toBeGreaterThan(0)
  })

  it('two pair beats one pair', () => {
    const twoPair = evaluateHand(hand('As', 'Ah', 'Ks', 'Kh', 'Qd', '5c', '2h'))
    const onePair = evaluateHand(hand('As', 'Ah', 'Kd', 'Qc', 'Js', '5d', '2h'))
    expect(compareHands(twoPair, onePair)).toBeGreaterThan(0)
  })

  it('one pair beats high card', () => {
    const onePair = evaluateHand(hand('2s', '2h', 'Ad', 'Kc', 'Qs', '5d', '3h'))
    const highCard = evaluateHand(hand('As', 'Kd', 'Qh', 'Jc', '9s', '5d', '3h'))
    expect(compareHands(onePair, highCard)).toBeGreaterThan(0)
  })
})

// ── Split Pot Detection ──────────────────────────────────────────

describe('compareHands — split pot detection (identical hands)', () => {
  it('should return 0 for identical straights (different suits)', () => {
    const handA = evaluateHand(hand('10s', '9d', '8h', '7c', '6s', '3d', '2h'))
    const handB = evaluateHand(hand('10d', '9h', '8c', '7s', '6d', '3c', '2s'))
    expect(compareHands(handA, handB)).toBe(0)
  })

  it('should return 0 for identical two pair with same kicker', () => {
    const handA = evaluateHand(hand('As', 'Ad', 'Ks', 'Kd', 'Qh', '5c', '2h'))
    const handB = evaluateHand(hand('Ah', 'Ac', 'Kh', 'Kc', 'Qd', '5s', '2d'))
    expect(compareHands(handA, handB)).toBe(0)
  })

  it('should return 0 for identical high card hands', () => {
    const handA = evaluateHand(hand('As', 'Kd', 'Qh', 'Jc', '9s', '3d', '2h'))
    const handB = evaluateHand(hand('Ad', 'Kh', 'Qc', 'Js', '9d', '3c', '2s'))
    expect(compareHands(handA, handB)).toBe(0)
  })

  it('should return 0 for identical flushes (different suits)', () => {
    const handA = evaluateHand(hand('As', 'Js', '9s', '7s', '5s', '3d', '2h'))
    const handB = evaluateHand(hand('Ad', 'Jd', '9d', '7d', '5d', '3c', '2s'))
    expect(compareHands(handA, handB)).toBe(0)
  })
})

// ── Best 5 from 7 — Configuration Tests ─────────────────────────

describe('evaluateHand — best 5 from 7 configurations', () => {
  it('should use 2 hole + 3 community (hole cards are crucial)', () => {
    // Hole: Ah, Kh; Community: Qh, Jh, 10h, 2d, 3c
    // Best hand is Royal Flush using both hole cards + 3 community
    const result = evaluateHand(hand('Ah', 'Kh', 'Qh', 'Jh', '10h', '2d', '3c'))
    expect(result.category).toBe(HandCategory.ROYAL_FLUSH)
  })

  it('should use 1 hole + 4 community', () => {
    // Hole: Ah, 2d; Community: Kh, Qh, Jh, 10h, 3c
    // Best hand is broadway straight using Ah + 4 community
    const result = evaluateHand(hand('Ah', '2d', 'Kh', 'Qh', 'Jh', '10h', '3c'))
    // Could be flush or straight — with 4 hearts on board + Ah, it's a flush
    expect(result.category).toBe(HandCategory.ROYAL_FLUSH)
  })

  it('should use 0 hole + 5 community (playing the board)', () => {
    // Community makes a straight: 10-J-Q-K-A; hole cards are low and irrelevant
    const result = evaluateHand(hand('2s', '3d', 'As', 'Kd', 'Qh', 'Jc', '10s'))
    expect(result.category).toBe(HandCategory.STRAIGHT)
    expect(result.ranks[0]).toBe(14)
  })

  it('should pick flush over straight when both are possible', () => {
    // 5 spades and also a straight available, flush wins
    const result = evaluateHand(hand('As', 'Ks', 'Qs', '9s', '7s', 'Jd', '10h'))
    expect(result.category).toBe(HandCategory.FLUSH)
  })
})

// ── Edge Cases ───────────────────────────────────────────────────

describe('evaluateHand — edge cases', () => {
  it('should always return exactly 5 cards', () => {
    const result = evaluateHand(hand('As', 'Kd', 'Qh', 'Jc', '9s', '7d', '4h'))
    expect(result.cards).toHaveLength(5)
  })

  it('should handle straight with duplicate rank cards correctly', () => {
    // Two 8s but still a straight 5-6-7-8-9
    const result = evaluateHand(hand('9s', '8d', '8h', '7c', '6s', '5d', '2h'))
    expect(result.category).toBe(HandCategory.STRAIGHT)
    expect(result.ranks[0]).toBe(9)
  })

  it('should prefer straight flush over regular flush or straight', () => {
    const result = evaluateHand(hand('8h', '7h', '6h', '5h', '4h', 'Ad', 'Ks'))
    expect(result.category).toBe(HandCategory.STRAIGHT_FLUSH)
  })

  it('should prefer full house over flush when both exist', () => {
    // Three kings (2 of which are hearts) + pair + other hearts
    const result = evaluateHand(hand('Kh', 'Ks', 'Kd', '8h', '8s', '5h', '3h'))
    expect(result.category).toBe(HandCategory.FULL_HOUSE)
  })

  it('should handle ace-high straight flush as royal flush', () => {
    const result = evaluateHand(hand('Ad', 'Kd', 'Qd', 'Jd', '10d', '2s', '3c'))
    expect(result.category).toBe(HandCategory.ROYAL_FLUSH)
  })

  it('compareHands should return negative when first hand is worse', () => {
    const highCard = evaluateHand(hand('As', 'Kd', 'Qh', 'Jc', '9s', '7d', '4h'))
    const pair = evaluateHand(hand('As', 'Ah', 'Kd', 'Qc', 'Js', '7d', '4h'))
    expect(compareHands(highCard, pair)).toBeLessThan(0)
  })
})

// ── Description Format ───────────────────────────────────────────

describe('evaluateHand — description strings', () => {
  it('should describe royal flush', () => {
    const result = evaluateHand(hand('As', 'Ks', 'Qs', 'Js', '10s', '3d', '7h'))
    expect(result.description).toMatch(/Royal Flush/i)
  })

  it('should describe straight flush with high card', () => {
    const result = evaluateHand(hand('9d', '8d', '7d', '6d', '5d', 'Kc', '2h'))
    expect(result.description).toMatch(/Straight Flush/i)
  })

  it('should describe four of a kind with rank', () => {
    const result = evaluateHand(hand('As', 'Ah', 'Ad', 'Ac', 'Ks', '7d', '3h'))
    expect(result.description).toMatch(/Four of a Kind/i)
    expect(result.description).toMatch(/Ace/i)
  })

  it('should describe full house with both ranks', () => {
    const result = evaluateHand(hand('Ks', 'Kh', 'Kd', '4c', '4s', '9d', '2h'))
    expect(result.description).toMatch(/Full House/i)
    expect(result.description).toMatch(/King/i)
    expect(result.description).toMatch(/Four/i)
  })

  it('should describe flush', () => {
    const result = evaluateHand(hand('As', 'Js', '8s', '5s', '3s', 'Kd', '9h'))
    expect(result.description).toMatch(/Flush/i)
  })

  it('should describe straight with high card', () => {
    const result = evaluateHand(hand('10s', '9d', '8h', '7c', '6s', '3d', '2h'))
    expect(result.description).toMatch(/Straight/i)
  })

  it('should describe pair with rank', () => {
    const result = evaluateHand(hand('10s', '10h', 'Ad', 'Kc', '7s', '4d', '2h'))
    expect(result.description).toMatch(/Pair/i)
    expect(result.description).toMatch(/Ten/i)
  })
})

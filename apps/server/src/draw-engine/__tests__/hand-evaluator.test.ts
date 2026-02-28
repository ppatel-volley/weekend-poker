import { describe, it, expect } from 'vitest'
import { evaluateDrawHand, compareHands, HandCategory } from '../hand-evaluator.js'
import type { Card, Suit } from '@weekend-casino/shared'

// ── Helpers ──────────────────────────────────────────────────────

function c(notation: string): Card {
  const suitMap: Record<string, Suit> = {
    s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs',
  }
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

function hand(...notations: string[]): Card[] {
  return notations.map(c)
}

// ── Category Recognition ─────────────────────────────────────────

describe('evaluateDrawHand — category recognition', () => {
  it('should throw if not exactly 5 cards', () => {
    expect(() => evaluateDrawHand(hand('As', 'Ks', 'Qs'))).toThrow('Expected 5 cards')
    expect(() => evaluateDrawHand(hand('As', 'Ks', 'Qs', 'Js', '10s', '3d'))).toThrow('Expected 5 cards')
  })

  describe('Royal Flush', () => {
    it('should identify a royal flush', () => {
      const result = evaluateDrawHand(hand('As', 'Ks', 'Qs', 'Js', '10s'))
      expect(result.category).toBe(HandCategory.ROYAL_FLUSH)
      expect(result.categoryRank).toBe(1)
      expect(result.description).toMatch(/Royal Flush/)
    })
  })

  describe('Straight Flush', () => {
    it('should identify a 9-high straight flush', () => {
      const result = evaluateDrawHand(hand('9d', '8d', '7d', '6d', '5d'))
      expect(result.category).toBe(HandCategory.STRAIGHT_FLUSH)
      expect(result.description).toMatch(/Straight Flush/)
    })

    it('should identify a wheel straight flush (A-2-3-4-5)', () => {
      const result = evaluateDrawHand(hand('Ah', '2h', '3h', '4h', '5h'))
      expect(result.category).toBe(HandCategory.STRAIGHT_FLUSH)
      expect(result.ranks).toEqual([5])
    })
  })

  describe('Four of a Kind', () => {
    it('should identify four aces', () => {
      const result = evaluateDrawHand(hand('As', 'Ah', 'Ad', 'Ac', '7d'))
      expect(result.category).toBe(HandCategory.FOUR_OF_A_KIND)
      expect(result.description).toMatch(/Four of a Kind, Aces/)
    })
  })

  describe('Full House', () => {
    it('should identify kings over fours', () => {
      const result = evaluateDrawHand(hand('Ks', 'Kh', 'Kd', '4c', '4s'))
      expect(result.category).toBe(HandCategory.FULL_HOUSE)
      expect(result.description).toMatch(/Full House, Kings over Fours/)
    })
  })

  describe('Flush', () => {
    it('should identify a heart flush', () => {
      const result = evaluateDrawHand(hand('Ah', 'Jh', '8h', '4h', '2h'))
      expect(result.category).toBe(HandCategory.FLUSH)
      expect(result.description).toMatch(/Flush/)
    })
  })

  describe('Straight', () => {
    it('should identify a 10-high straight', () => {
      const result = evaluateDrawHand(hand('10s', '9h', '8d', '7c', '6s'))
      expect(result.category).toBe(HandCategory.STRAIGHT)
      expect(result.ranks).toEqual([10])
    })

    it('should identify a wheel (A-2-3-4-5)', () => {
      const result = evaluateDrawHand(hand('As', '2h', '3d', '4c', '5s'))
      expect(result.category).toBe(HandCategory.STRAIGHT)
      expect(result.ranks).toEqual([5])
    })
  })

  describe('Three of a Kind', () => {
    it('should identify three sevens', () => {
      const result = evaluateDrawHand(hand('7s', '7h', '7d', 'Kc', '2s'))
      expect(result.category).toBe(HandCategory.THREE_OF_A_KIND)
      expect(result.description).toMatch(/Three of a Kind, Sevens/)
    })
  })

  describe('Two Pair', () => {
    it('should identify aces and eights', () => {
      const result = evaluateDrawHand(hand('As', 'Ah', '8d', '8c', 'Ks'))
      expect(result.category).toBe(HandCategory.TWO_PAIR)
      expect(result.description).toMatch(/Two Pair, Aces and Eights/)
    })
  })

  describe('One Pair', () => {
    it('should identify a pair of queens', () => {
      const result = evaluateDrawHand(hand('Qs', 'Qh', '9d', '5c', '2s'))
      expect(result.category).toBe(HandCategory.ONE_PAIR)
      expect(result.description).toMatch(/Pair of Queens/)
    })
  })

  describe('High Card', () => {
    it('should identify ace high', () => {
      const result = evaluateDrawHand(hand('As', 'Jh', '8d', '5c', '2s'))
      expect(result.category).toBe(HandCategory.HIGH_CARD)
      expect(result.description).toMatch(/High Card, Ace/)
    })
  })
})

// ── Hand Comparison ──────────────────────────────────────────────

describe('compareHands', () => {
  it('should rank royal flush above straight flush', () => {
    const royal = evaluateDrawHand(hand('As', 'Ks', 'Qs', 'Js', '10s'))
    const sf = evaluateDrawHand(hand('9d', '8d', '7d', '6d', '5d'))
    expect(compareHands(royal, sf)).toBeGreaterThan(0)
  })

  it('should rank higher pair above lower pair', () => {
    const aces = evaluateDrawHand(hand('As', 'Ah', '9d', '5c', '2s'))
    const kings = evaluateDrawHand(hand('Ks', 'Kh', '9d', '5c', '2s'))
    expect(compareHands(aces, kings)).toBeGreaterThan(0)
  })

  it('should return 0 for identical hands (different suits)', () => {
    const handA = evaluateDrawHand(hand('As', 'Kh', 'Qd', 'Jc', '9s'))
    const handB = evaluateDrawHand(hand('Ah', 'Kd', 'Qc', 'Js', '9h'))
    expect(compareHands(handA, handB)).toBe(0)
  })

  it('should break ties with kickers', () => {
    const pairAcesHighKicker = evaluateDrawHand(hand('As', 'Ah', 'Kd', '5c', '2s'))
    const pairAcesLowKicker = evaluateDrawHand(hand('As', 'Ah', 'Qd', '5c', '2s'))
    expect(compareHands(pairAcesHighKicker, pairAcesLowKicker)).toBeGreaterThan(0)
  })

  it('should rank two pair above one pair', () => {
    const twoPair = evaluateDrawHand(hand('Ks', 'Kh', '8d', '8c', '2s'))
    const onePair = evaluateDrawHand(hand('As', 'Ah', 'Jd', '5c', '2s'))
    expect(compareHands(twoPair, onePair)).toBeGreaterThan(0)
  })

  it('should rank flush above straight', () => {
    const flush = evaluateDrawHand(hand('As', 'Js', '8s', '4s', '2s'))
    const straight = evaluateDrawHand(hand('As', 'Kh', 'Qd', 'Jc', '10s'))
    expect(compareHands(flush, straight)).toBeGreaterThan(0)
  })
})

// ── Card count in result ─────────────────────────────────────────

describe('result cards', () => {
  it('should always return exactly 5 cards', () => {
    const result = evaluateDrawHand(hand('As', 'Ah', '8d', '5c', '2s'))
    expect(result.cards).toHaveLength(5)
  })
})

import { describe, it, expect } from 'vitest'
import { evaluateTcpHand, dealerQualifies, compareTcpHands } from '../hand-evaluator.js'
import type { Card } from '@weekend-casino/shared'

/** Helper to create a 3-card hand from shorthand notation. */
function hand(cards: string): [Card, Card, Card] {
  const result: Card[] = []
  const parts = cards.split(' ')
  for (const part of parts) {
    const rankStr = part.slice(0, -1)
    const suitChar = part.slice(-1)
    const rankMap: Record<string, Card['rank']> = {
      '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8',
      '9': '9', '10': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
    }
    const suitMap: Record<string, Card['suit']> = {
      's': 'spades', 'h': 'hearts', 'd': 'diamonds', 'c': 'clubs',
    }
    result.push({ rank: rankMap[rankStr]!, suit: suitMap[suitChar]! })
  }
  return result as [Card, Card, Card]
}

describe('evaluateTcpHand', () => {
  describe('hand classification', () => {
    it('identifies a straight flush', () => {
      const result = evaluateTcpHand(hand('5h 6h 7h'))
      expect(result.rank).toBe('straight_flush')
      expect(result.description).toContain('Straight Flush')
    })

    it('identifies three of a kind', () => {
      const result = evaluateTcpHand(hand('Ks Kh Kd'))
      expect(result.rank).toBe('three_of_a_kind')
      expect(result.description).toContain('Three of a Kind')
    })

    it('identifies a straight', () => {
      const result = evaluateTcpHand(hand('9s 10h Jd'))
      expect(result.rank).toBe('straight')
      expect(result.description).toContain('Straight')
    })

    it('identifies a flush', () => {
      const result = evaluateTcpHand(hand('2s 7s Qs'))
      expect(result.rank).toBe('flush')
      expect(result.description).toContain('Flush')
    })

    it('identifies a pair', () => {
      const result = evaluateTcpHand(hand('8s 8h Ad'))
      expect(result.rank).toBe('pair')
      expect(result.description).toContain('Pair')
    })

    it('identifies high card', () => {
      const result = evaluateTcpHand(hand('As Jh 4d'))
      expect(result.rank).toBe('high_card')
      expect(result.description).toContain('Ace-high')
    })
  })

  describe('CRITICAL: 3-card ranking order (straight > flush)', () => {
    it('ranks straight ABOVE flush', () => {
      const straight = evaluateTcpHand(hand('9s 10h Jd'))
      const flush = evaluateTcpHand(hand('2s 7s Qs'))
      expect(straight.strength).toBeGreaterThan(flush.strength)
    })

    it('ranks straight flush ABOVE three of a kind', () => {
      const straightFlush = evaluateTcpHand(hand('5h 6h 7h'))
      const trips = evaluateTcpHand(hand('Ks Kh Kd'))
      expect(straightFlush.strength).toBeGreaterThan(trips.strength)
    })

    it('ranks three of a kind ABOVE straight', () => {
      const trips = evaluateTcpHand(hand('2s 2h 2d'))
      const straight = evaluateTcpHand(hand('Qs Kh Ad'))
      expect(trips.strength).toBeGreaterThan(straight.strength)
    })

    it('ranks flush ABOVE pair', () => {
      const flush = evaluateTcpHand(hand('2s 5s 7s'))
      const pair = evaluateTcpHand(hand('As Ah Kd'))
      expect(flush.strength).toBeGreaterThan(pair.strength)
    })

    it('ranks pair ABOVE high card', () => {
      const pair = evaluateTcpHand(hand('2s 2h 3d'))
      const highCard = evaluateTcpHand(hand('As Jh 4d')) // NOT A-K-Q which is a straight!
      expect(pair.strength).toBeGreaterThan(highCard.strength)
    })

    it('maintains strict ordering: SF > Trips > Straight > Flush > Pair > High Card', () => {
      const sf = evaluateTcpHand(hand('Qh Kh Ah'))
      const trips = evaluateTcpHand(hand('As Ah Ad'))
      const straight = evaluateTcpHand(hand('Qs Kh Ad'))
      const flush = evaluateTcpHand(hand('As 10s 7s'))
      const pair = evaluateTcpHand(hand('As Ah Kd'))
      const high = evaluateTcpHand(hand('As Kh Jd'))

      expect(sf.strength).toBeGreaterThan(trips.strength)
      expect(trips.strength).toBeGreaterThan(straight.strength)
      expect(straight.strength).toBeGreaterThan(flush.strength)
      expect(flush.strength).toBeGreaterThan(pair.strength)
      expect(pair.strength).toBeGreaterThan(high.strength)
    })

    it('ensures the WEAKEST straight beats the STRONGEST flush', () => {
      const weakestStraight = evaluateTcpHand(hand('As 2h 3d')) // A-2-3 low straight
      // A-K-Q same suit is a straight flush, not a flush. A-K-J suited is strongest flush.
      const strongestFlush = evaluateTcpHand(hand('As Ks Js')) // A-K-J flush (strongest non-SF)
      expect(weakestStraight.strength).toBeGreaterThan(strongestFlush.strength)
    })

    it('ensures the WEAKEST flush beats the STRONGEST pair', () => {
      const weakestFlush = evaluateTcpHand(hand('2s 3s 5s')) // 5-high flush (lowest non-sequential)
      const strongestPair = evaluateTcpHand(hand('As Ah Kd')) // Aces with King kicker
      expect(weakestFlush.strength).toBeGreaterThan(strongestPair.strength)
    })

    it('ensures the WEAKEST pair beats the STRONGEST high card', () => {
      const weakestPair = evaluateTcpHand(hand('2s 2h 3d')) // Pair of twos, 3 kicker
      // A-K-Q is sequential (straight), so strongest HC is A-K-J
      const strongestHighCard = evaluateTcpHand(hand('As Kh Jd'))
      expect(weakestPair.strength).toBeGreaterThan(strongestHighCard.strength)
    })

    it('ensures the WEAKEST three of a kind beats the STRONGEST straight', () => {
      const weakestTrips = evaluateTcpHand(hand('2s 2h 2d')) // Trip twos
      const strongestStraight = evaluateTcpHand(hand('Qs Kh Ad')) // Q-K-A straight
      expect(weakestTrips.strength).toBeGreaterThan(strongestStraight.strength)
    })

    it('ensures the WEAKEST straight flush beats the STRONGEST three of a kind', () => {
      const weakestSF = evaluateTcpHand(hand('As 2s 3s')) // A-2-3 suited (lowest SF)
      const strongestTrips = evaluateTcpHand(hand('As Ah Ad')) // Trip aces
      expect(weakestSF.strength).toBeGreaterThan(strongestTrips.strength)
    })
  })

  describe('A-2-3 low straight', () => {
    it('recognises A-2-3 as a straight', () => {
      const result = evaluateTcpHand(hand('As 2h 3d'))
      expect(result.rank).toBe('straight')
    })

    it('A-2-3 is the lowest straight', () => {
      const low = evaluateTcpHand(hand('As 2h 3d'))
      const next = evaluateTcpHand(hand('2s 3h 4d'))
      expect(next.strength).toBeGreaterThan(low.strength)
    })

    it('A-2-3 suited is a straight flush', () => {
      const result = evaluateTcpHand(hand('As 2s 3s'))
      expect(result.rank).toBe('straight_flush')
    })

    it('Q-K-A is the highest straight', () => {
      const highest = evaluateTcpHand(hand('Qs Kh Ad'))
      const secondHighest = evaluateTcpHand(hand('Js Qh Kd'))
      expect(highest.strength).toBeGreaterThan(secondHighest.strength)
    })
  })

  describe('within-rank tiebreaking', () => {
    it('higher straight flush beats lower', () => {
      const higher = evaluateTcpHand(hand('Jh Qh Kh'))
      const lower = evaluateTcpHand(hand('5h 6h 7h'))
      expect(compareTcpHands(higher, lower)).toBeGreaterThan(0)
    })

    it('higher trips beat lower trips', () => {
      const higher = evaluateTcpHand(hand('As Ah Ad'))
      const lower = evaluateTcpHand(hand('Ks Kh Kd'))
      expect(compareTcpHands(higher, lower)).toBeGreaterThan(0)
    })

    it('higher pair beats lower pair', () => {
      const higher = evaluateTcpHand(hand('As Ah 2d'))
      const lower = evaluateTcpHand(hand('Ks Kh Ad'))
      expect(compareTcpHands(higher, lower)).toBeGreaterThan(0)
    })

    it('same pair, higher kicker wins', () => {
      const higher = evaluateTcpHand(hand('Ks Kh Ad'))
      const lower = evaluateTcpHand(hand('Ks Kh 2d'))
      expect(compareTcpHands(higher, lower)).toBeGreaterThan(0)
    })

    it('identical hands tie', () => {
      const a = evaluateTcpHand(hand('As Kh Qd'))
      const b = evaluateTcpHand(hand('Ac Kd Qs'))
      expect(compareTcpHands(a, b)).toBe(0)
    })

    it('high card A-K-J beats A-K-10', () => {
      const higher = evaluateTcpHand(hand('As Kh Jd'))
      const lower = evaluateTcpHand(hand('Ac Kd 10s'))
      expect(compareTcpHands(higher, lower)).toBeGreaterThan(0)
    })

    it('flush with higher cards beats flush with lower cards', () => {
      const higher = evaluateTcpHand(hand('As Ks Qs'))
      const lower = evaluateTcpHand(hand('As Ks 2s'))
      expect(compareTcpHands(higher, lower)).toBeGreaterThan(0)
    })
  })
})

describe('dealerQualifies', () => {
  it('pair qualifies', () => {
    const result = evaluateTcpHand(hand('2s 2h 3d'))
    expect(dealerQualifies(result)).toBe(true)
  })

  it('straight qualifies', () => {
    const result = evaluateTcpHand(hand('9s 10h Jd'))
    expect(dealerQualifies(result)).toBe(true)
  })

  it('flush qualifies', () => {
    const result = evaluateTcpHand(hand('2s 5s 7s'))
    expect(dealerQualifies(result)).toBe(true)
  })

  it('three of a kind qualifies', () => {
    const result = evaluateTcpHand(hand('5s 5h 5d'))
    expect(dealerQualifies(result)).toBe(true)
  })

  it('Queen-high qualifies', () => {
    const result = evaluateTcpHand(hand('Qs 5h 2d'))
    expect(dealerQualifies(result)).toBe(true)
  })

  it('King-high qualifies', () => {
    const result = evaluateTcpHand(hand('Ks 5h 2d'))
    expect(dealerQualifies(result)).toBe(true)
  })

  it('Ace-high qualifies', () => {
    const result = evaluateTcpHand(hand('As 5h 2d'))
    expect(dealerQualifies(result)).toBe(true)
  })

  it('Jack-high does NOT qualify', () => {
    const result = evaluateTcpHand(hand('Js 5h 2d'))
    expect(dealerQualifies(result)).toBe(false)
  })

  it('10-high does NOT qualify', () => {
    const result = evaluateTcpHand(hand('10s 5h 2d'))
    expect(dealerQualifies(result)).toBe(false)
  })

  it('9-high does NOT qualify', () => {
    const result = evaluateTcpHand(hand('9s 5h 2d'))
    expect(dealerQualifies(result)).toBe(false)
  })
})

describe('compareTcpHands', () => {
  it('returns positive when first hand wins', () => {
    const a = evaluateTcpHand(hand('As Ah Ad')) // trips
    const b = evaluateTcpHand(hand('As Kh Qd')) // straight
    expect(compareTcpHands(a, b)).toBeGreaterThan(0)
  })

  it('returns negative when second hand wins', () => {
    const a = evaluateTcpHand(hand('2s 3h 5d')) // high card
    const b = evaluateTcpHand(hand('2s 2h 3d')) // pair
    expect(compareTcpHands(a, b)).toBeLessThan(0)
  })

  it('returns 0 for equal hands', () => {
    const a = evaluateTcpHand(hand('As Kh Qd'))
    const b = evaluateTcpHand(hand('Ac Kd Qs'))
    expect(compareTcpHands(a, b)).toBe(0)
  })
})

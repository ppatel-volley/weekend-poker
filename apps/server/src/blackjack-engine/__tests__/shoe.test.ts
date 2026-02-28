import { describe, it, expect } from 'vitest'
import {
  createShoe,
  shuffleShoe,
  calculatePenetration,
  needsReshuffle,
  dealCard,
} from '../shoe.js'

describe('createShoe', () => {
  it('creates a 6-deck shoe with 312 cards', () => {
    const shoe = createShoe(6)
    expect(shoe.length).toBe(312)
  })

  it('creates a 1-deck shoe with 52 cards', () => {
    const shoe = createShoe(1)
    expect(shoe.length).toBe(52)
  })

  it('creates a default 6-deck shoe', () => {
    const shoe = createShoe()
    expect(shoe.length).toBe(312)
  })

  it('contains correct number of each rank per deck', () => {
    const shoe = createShoe(1)
    const aces = shoe.filter(c => c.rank === 'A')
    expect(aces.length).toBe(4) // 4 suits
  })

  it('contains 24 Aces in a 6-deck shoe', () => {
    const shoe = createShoe(6)
    const aces = shoe.filter(c => c.rank === 'A')
    expect(aces.length).toBe(24) // 4 suits * 6 decks
  })

  it('contains all 4 suits', () => {
    const shoe = createShoe(1)
    const suits = new Set(shoe.map(c => c.suit))
    expect(suits.size).toBe(4)
    expect(suits.has('spades')).toBe(true)
    expect(suits.has('hearts')).toBe(true)
    expect(suits.has('diamonds')).toBe(true)
    expect(suits.has('clubs')).toBe(true)
  })
})

describe('shuffleShoe', () => {
  it('returns a shoe of the same length', () => {
    const shoe = createShoe(6)
    const shuffled = shuffleShoe(shoe)
    expect(shuffled.length).toBe(shoe.length)
  })

  it('does not mutate the original shoe', () => {
    const shoe = createShoe(1)
    const original = [...shoe]
    shuffleShoe(shoe)
    expect(shoe).toEqual(original)
  })

  it('produces a different order with random shuffle', () => {
    const shoe = createShoe(6)
    const shuffled = shuffleShoe(shoe)
    // With 312 cards, extremely unlikely to be identical
    const sameOrder = shoe.every((c, i) => c.rank === shuffled[i]!.rank && c.suit === shuffled[i]!.suit)
    expect(sameOrder).toBe(false)
  })

  it('accepts a custom random function for deterministic shuffle', () => {
    let counter = 0
    const deterministicRng = () => {
      counter = (counter + 1) % 100
      return counter / 100
    }
    const shoe = createShoe(1)
    const shuffled1 = shuffleShoe(shoe, deterministicRng)
    counter = 0
    const shuffled2 = shuffleShoe(shoe, deterministicRng)
    expect(shuffled1).toEqual(shuffled2)
  })
})

describe('calculatePenetration', () => {
  it('returns 0 when all cards remain', () => {
    expect(calculatePenetration(312, 312)).toBe(0)
  })

  it('returns 1 when no cards remain', () => {
    expect(calculatePenetration(0, 312)).toBe(1)
  })

  it('returns 0.5 when half the shoe is dealt', () => {
    expect(calculatePenetration(156, 312)).toBeCloseTo(0.5)
  })

  it('returns 0.75 when 75% dealt', () => {
    expect(calculatePenetration(78, 312)).toBeCloseTo(0.75)
  })

  it('handles totalCards of 0', () => {
    expect(calculatePenetration(0, 0)).toBe(0)
  })
})

describe('needsReshuffle', () => {
  it('returns false below threshold', () => {
    expect(needsReshuffle(200, 312, 0.75)).toBe(false) // ~36% penetration
  })

  it('returns true at threshold', () => {
    expect(needsReshuffle(78, 312, 0.75)).toBe(true) // 75% penetration
  })

  it('returns true above threshold', () => {
    expect(needsReshuffle(50, 312, 0.75)).toBe(true) // ~84% penetration
  })

  it('uses default 0.75 threshold', () => {
    expect(needsReshuffle(78, 312)).toBe(true)
    expect(needsReshuffle(100, 312)).toBe(false)
  })
})

describe('dealCard', () => {
  it('returns the first card and removes it', () => {
    const shoe = createShoe(1)
    const firstCard = shoe[0]
    const dealt = dealCard(shoe)
    expect(dealt).toEqual(firstCard)
    expect(shoe.length).toBe(51)
  })

  it('returns undefined from empty shoe', () => {
    const shoe: any[] = []
    expect(dealCard(shoe)).toBeUndefined()
  })

  it('deals cards in order', () => {
    const shoe = createShoe(1)
    const first = dealCard(shoe)
    const second = dealCard(shoe)
    expect(shoe.length).toBe(50)
    expect(first).not.toEqual(second)
  })
})

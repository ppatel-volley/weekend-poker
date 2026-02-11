import { describe, it, expect } from 'vitest'
import { createDeck, shuffleDeck } from '../deck.js'
import { RANKS, SUITS } from '@weekend-poker/shared'

describe('createDeck', () => {
  it('should produce exactly 52 cards', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
  })

  it('should contain every rank-suit combination exactly once', () => {
    const deck = createDeck()
    const keys = deck.map(c => `${c.rank}-${c.suit}`)
    const unique = new Set(keys)
    expect(unique.size).toBe(52)
  })

  it('should contain all 13 ranks for each suit', () => {
    const deck = createDeck()
    for (const suit of SUITS) {
      const ranksInSuit = deck.filter(c => c.suit === suit).map(c => c.rank)
      expect(ranksInSuit.sort()).toEqual([...RANKS].sort())
    }
  })

  it('should contain all 4 suits for each rank', () => {
    const deck = createDeck()
    for (const rank of RANKS) {
      const suitsForRank = deck.filter(c => c.rank === rank).map(c => c.suit)
      expect(suitsForRank.sort()).toEqual([...SUITS].sort())
    }
  })

  it('should return a new array each time (no shared references)', () => {
    const deck1 = createDeck()
    const deck2 = createDeck()
    expect(deck1).not.toBe(deck2)
    expect(deck1).toEqual(deck2)
  })
})

describe('shuffleDeck', () => {
  it('should return a deck with the same 52 cards', () => {
    const original = createDeck()
    const shuffled = shuffleDeck(original)
    expect(shuffled).toHaveLength(52)

    const originalKeys = original.map(c => `${c.rank}-${c.suit}`).sort()
    const shuffledKeys = shuffled.map(c => `${c.rank}-${c.suit}`).sort()
    expect(shuffledKeys).toEqual(originalKeys)
  })

  it('should NOT mutate the input deck', () => {
    const original = createDeck()
    const originalCopy = original.map(c => ({ ...c }))
    shuffleDeck(original)

    expect(original).toEqual(originalCopy)
  })

  it('should produce a different ordering (statistical check)', () => {
    const original = createDeck()

    // Run 5 shuffles; at least 1 must differ from the original ordering.
    // The probability of Fisher-Yates returning the exact same order is
    // 1/52! which is astronomically small, so this is safe.
    const anyDifferent = Array.from({ length: 5 }, () => {
      const shuffled = shuffleDeck(original)
      return shuffled.some((card, i) => {
        const orig = original[i]!
        return card.rank !== orig.rank || card.suit !== orig.suit
      })
    }).some(Boolean)

    expect(anyDifferent).toBe(true)
  })

  it('should accept a custom random function for deterministic testing', () => {
    const deck = createDeck()
    // Using a fixed seed-like pattern: always return 0 means swap with self
    const shuffled1 = shuffleDeck(deck, () => 0)
    const shuffled2 = shuffleDeck(deck, () => 0)
    expect(shuffled1).toEqual(shuffled2)
  })

  it('should return Card[] typed values', () => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck)
    for (const card of shuffled) {
      expect(card).toHaveProperty('rank')
      expect(card).toHaveProperty('suit')
      expect(RANKS).toContain(card.rank)
      expect(SUITS).toContain(card.suit)
    }
  })
})

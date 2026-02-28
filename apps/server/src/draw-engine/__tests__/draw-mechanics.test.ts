import { describe, it, expect } from 'vitest'
import { validateDiscardIndices, applyDiscard, drawFromDeck } from '../draw-mechanics.js'
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

// ── validateDiscardIndices ───────────────────────────────────────

describe('validateDiscardIndices', () => {
  it('should accept empty indices (stand pat)', () => {
    expect(validateDiscardIndices([], 5)).toBe(true)
  })

  it('should accept valid single index', () => {
    expect(validateDiscardIndices([2], 5)).toBe(true)
  })

  it('should accept maximum 3 indices (per spec: 0-3 discard limit)', () => {
    expect(validateDiscardIndices([0, 1, 2], 5)).toBe(true)
  })

  it('should reject 4 discards (exceeds MAX_DISCARD of 3)', () => {
    expect(validateDiscardIndices([0, 1, 2, 3], 5)).toBe(false)
  })

  it('should reject 5 discards (exceeds MAX_DISCARD of 3)', () => {
    expect(validateDiscardIndices([0, 1, 2, 3, 4], 5)).toBe(false)
  })

  it('should reject negative index', () => {
    expect(validateDiscardIndices([-1], 5)).toBe(false)
  })

  it('should reject index >= handSize', () => {
    expect(validateDiscardIndices([5], 5)).toBe(false)
  })

  it('should reject duplicate indices', () => {
    expect(validateDiscardIndices([2, 2], 5)).toBe(false)
  })

  it('should reject more indices than hand size', () => {
    expect(validateDiscardIndices([0, 1, 2, 3, 4, 5], 5)).toBe(false)
  })

  it('should reject non-integer indices', () => {
    expect(validateDiscardIndices([1.5], 5)).toBe(false)
  })
})

// ── applyDiscard ────────────────────────────────────────────────

describe('applyDiscard', () => {
  const original = [c('As'), c('Kh'), c('Qd'), c('Jc'), c('10s')]

  it('should return the same hand when no discards', () => {
    const result = applyDiscard(original, [], [])
    expect(result).toEqual(original)
  })

  it('should replace single card at index 2', () => {
    const replacement = c('2h')
    const result = applyDiscard(original, [2], [replacement])
    expect(result[0]).toEqual(c('As'))
    expect(result[1]).toEqual(c('Kh'))
    expect(result[2]).toEqual(c('2h'))
    expect(result[3]).toEqual(c('Jc'))
    expect(result[4]).toEqual(c('10s'))
  })

  it('should replace multiple cards', () => {
    const replacements = [c('2h'), c('3d')]
    const result = applyDiscard(original, [0, 4], replacements)
    expect(result[0]).toEqual(c('2h'))
    expect(result[1]).toEqual(c('Kh'))
    expect(result[2]).toEqual(c('Qd'))
    expect(result[3]).toEqual(c('Jc'))
    expect(result[4]).toEqual(c('3d'))
  })

  it('should replace all 5 cards', () => {
    const replacements = [c('2h'), c('3d'), c('4c'), c('5s'), c('6h')]
    const result = applyDiscard(original, [0, 1, 2, 3, 4], replacements)
    expect(result).toEqual(replacements)
  })

  it('should not mutate original hand', () => {
    const orig = [...original.map(card => ({ ...card }))]
    applyDiscard(original, [0], [c('2h')])
    expect(original).toEqual(orig)
  })

  it('should throw if replacement count mismatches discard count', () => {
    expect(() => applyDiscard(original, [0, 1], [c('2h')])).toThrow(
      'Replacement count (1) must match discard count (2)',
    )
  })
})

// ── drawFromDeck ────────────────────────────────────────────────

describe('drawFromDeck', () => {
  const deck = [c('As'), c('Kh'), c('Qd'), c('Jc'), c('10s')]

  it('should draw requested number of cards', () => {
    const [drawn, remaining] = drawFromDeck(deck, 2)
    expect(drawn).toHaveLength(2)
    expect(remaining).toHaveLength(3)
    expect(drawn[0]).toEqual(c('As'))
    expect(drawn[1]).toEqual(c('Kh'))
    expect(remaining[0]).toEqual(c('Qd'))
  })

  it('should draw 0 cards', () => {
    const [drawn, remaining] = drawFromDeck(deck, 0)
    expect(drawn).toHaveLength(0)
    expect(remaining).toHaveLength(5)
  })

  it('should draw all cards', () => {
    const [drawn, remaining] = drawFromDeck(deck, 5)
    expect(drawn).toHaveLength(5)
    expect(remaining).toHaveLength(0)
  })

  it('should not mutate original deck', () => {
    const orig = [...deck.map(card => ({ ...card }))]
    drawFromDeck(deck, 3)
    expect(deck).toEqual(orig)
  })

  it('should throw if drawing more cards than deck has', () => {
    expect(() => drawFromDeck(deck, 6)).toThrow('Cannot draw 6 cards from deck of 5')
  })
})

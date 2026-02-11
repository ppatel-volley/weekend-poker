import { describe, expect, it } from 'vitest'
import { RANKS, SUITS, rankToNumeric } from '../types/cards.js'

describe('Card types', () => {
  it('defines all 13 ranks', () => {
    expect(RANKS).toHaveLength(13)
    expect(RANKS[0]).toBe('2')
    expect(RANKS[12]).toBe('A')
  })

  it('defines all 4 suits', () => {
    expect(SUITS).toHaveLength(4)
    expect(SUITS).toContain('spades')
    expect(SUITS).toContain('hearts')
    expect(SUITS).toContain('diamonds')
    expect(SUITS).toContain('clubs')
  })
})

describe('rankToNumeric', () => {
  it('converts pip cards correctly', () => {
    expect(rankToNumeric('2')).toBe(2)
    expect(rankToNumeric('10')).toBe(10)
  })

  it('converts face cards correctly', () => {
    expect(rankToNumeric('J')).toBe(11)
    expect(rankToNumeric('Q')).toBe(12)
    expect(rankToNumeric('K')).toBe(13)
    expect(rankToNumeric('A')).toBe(14)
  })
})

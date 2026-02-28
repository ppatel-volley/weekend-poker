import { describe, it, expect } from 'vitest'
import type { Card } from '@weekend-casino/shared'
import {
  evaluateBlackjackHand,
  isNaturalBlackjack,
  canSplit,
  canDoubleDown,
} from '../hand-evaluator.js'

function card(rank: string, suit: string = 'spades'): Card {
  return { rank: rank as Card['rank'], suit: suit as Card['suit'] }
}

describe('evaluateBlackjackHand', () => {
  it('returns 0 for empty hand', () => {
    const result = evaluateBlackjackHand([])
    expect(result.value).toBe(0)
    expect(result.isSoft).toBe(false)
    expect(result.isBusted).toBe(false)
  })

  it('evaluates a simple hand (no aces)', () => {
    const result = evaluateBlackjackHand([card('5'), card('8')])
    expect(result.value).toBe(13)
    expect(result.isSoft).toBe(false)
    expect(result.isBusted).toBe(false)
  })

  it('evaluates face cards as 10', () => {
    const result = evaluateBlackjackHand([card('J'), card('Q')])
    expect(result.value).toBe(20)
    expect(result.isSoft).toBe(false)
  })

  it('evaluates Ace as 11 (soft hand)', () => {
    const result = evaluateBlackjackHand([card('A'), card('7')])
    expect(result.value).toBe(18)
    expect(result.isSoft).toBe(true)
    expect(result.isBusted).toBe(false)
  })

  it('reduces Ace to 1 to avoid bust', () => {
    const result = evaluateBlackjackHand([card('A'), card('7'), card('8')])
    expect(result.value).toBe(16)
    expect(result.isSoft).toBe(false)
    expect(result.isBusted).toBe(false)
  })

  it('handles two Aces', () => {
    const result = evaluateBlackjackHand([card('A'), card('A')])
    expect(result.value).toBe(12)
    expect(result.isSoft).toBe(true)
  })

  it('reduces multiple Aces to avoid bust', () => {
    const result = evaluateBlackjackHand([card('A'), card('A'), card('A')])
    expect(result.value).toBe(13)
    expect(result.isSoft).toBe(true)
  })

  it('detects bust', () => {
    const result = evaluateBlackjackHand([card('10'), card('8'), card('6')])
    expect(result.value).toBe(24)
    expect(result.isBusted).toBe(true)
  })

  it('evaluates blackjack (Ace + King)', () => {
    const result = evaluateBlackjackHand([card('A'), card('K')])
    expect(result.value).toBe(21)
    expect(result.isSoft).toBe(true)
  })

  it('evaluates 21 with three cards (not soft)', () => {
    const result = evaluateBlackjackHand([card('7'), card('7'), card('7')])
    expect(result.value).toBe(21)
    expect(result.isSoft).toBe(false)
  })

  it('handles soft 17 (Ace + 6)', () => {
    const result = evaluateBlackjackHand([card('A'), card('6')])
    expect(result.value).toBe(17)
    expect(result.isSoft).toBe(true)
  })

  it('handles hard 17 (10 + 7)', () => {
    const result = evaluateBlackjackHand([card('10'), card('7')])
    expect(result.value).toBe(17)
    expect(result.isSoft).toBe(false)
  })

  it('Ace + 5 + 10 = 16 (hard)', () => {
    const result = evaluateBlackjackHand([card('A'), card('5'), card('10')])
    expect(result.value).toBe(16)
    expect(result.isSoft).toBe(false)
  })
})

describe('isNaturalBlackjack', () => {
  it('returns true for Ace + 10', () => {
    expect(isNaturalBlackjack([card('A'), card('10')])).toBe(true)
  })

  it('returns true for Ace + King', () => {
    expect(isNaturalBlackjack([card('A'), card('K')])).toBe(true)
  })

  it('returns true for Ace + Queen', () => {
    expect(isNaturalBlackjack([card('A'), card('Q')])).toBe(true)
  })

  it('returns true for Ace + Jack', () => {
    expect(isNaturalBlackjack([card('A'), card('J')])).toBe(true)
  })

  it('returns false for 21 with three cards', () => {
    expect(isNaturalBlackjack([card('7'), card('7'), card('7')])).toBe(false)
  })

  it('returns false for non-21 two cards', () => {
    expect(isNaturalBlackjack([card('A'), card('5')])).toBe(false)
  })

  it('returns false for empty hand', () => {
    expect(isNaturalBlackjack([])).toBe(false)
  })
})

describe('canSplit', () => {
  it('returns true for matching rank cards', () => {
    expect(canSplit([card('8', 'spades'), card('8', 'hearts')])).toBe(true)
  })

  it('returns true for matching face cards (10-value)', () => {
    expect(canSplit([card('J', 'spades'), card('Q', 'hearts')])).toBe(true)
  })

  it('returns true for two Aces', () => {
    expect(canSplit([card('A', 'spades'), card('A', 'hearts')])).toBe(true)
  })

  it('returns false for different rank cards', () => {
    expect(canSplit([card('5'), card('8')])).toBe(false)
  })

  it('returns false for three cards', () => {
    expect(canSplit([card('8'), card('8'), card('8')])).toBe(false)
  })

  it('returns false for single card', () => {
    expect(canSplit([card('8')])).toBe(false)
  })
})

describe('canDoubleDown', () => {
  it('returns true for two cards', () => {
    expect(canDoubleDown([card('5'), card('7')])).toBe(true)
  })

  it('returns false for three cards', () => {
    expect(canDoubleDown([card('5'), card('7'), card('3')])).toBe(false)
  })

  it('returns false for single card', () => {
    expect(canDoubleDown([card('5')])).toBe(false)
  })

  it('returns true even for strong hands', () => {
    expect(canDoubleDown([card('A'), card('K')])).toBe(true)
  })
})

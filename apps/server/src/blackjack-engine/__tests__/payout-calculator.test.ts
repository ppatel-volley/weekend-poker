import { describe, it, expect } from 'vitest'
import type { Card } from '@weekend-casino/shared'
import { calculateHandPayout, calculateInsurancePayout } from '../payout-calculator.js'

function card(rank: string, suit: string = 'spades'): Card {
  return { rank: rank as Card['rank'], suit: suit as Card['suit'] }
}

describe('calculateHandPayout', () => {
  describe('regular win', () => {
    it('pays 1:1 for regular win', () => {
      // Player: 20, Dealer: 18
      const result = calculateHandPayout(
        [card('10'), card('Q')],
        [card('10'), card('8')],
        100, false, false,
      )
      expect(result.payout).toBe(100)
      expect(result.isWin).toBe(true)
      expect(result.outcome).toBe('win')
    })

    it('pays 1:1 for doubled win', () => {
      // Player: 20, Dealer: 18, doubled
      const result = calculateHandPayout(
        [card('10'), card('Q'), card('A')], // Won't be natural BJ with 3 cards
        [card('10'), card('8')],
        100, true, false,
      )
      expect(result.payout).toBe(200)
      expect(result.isWin).toBe(true)
    })
  })

  describe('blackjack (3:2)', () => {
    it('pays 3:2 for natural blackjack', () => {
      const result = calculateHandPayout(
        [card('A'), card('K')],
        [card('10'), card('8')],
        100, false, false,
      )
      expect(result.payout).toBe(150) // 3:2
      expect(result.isWin).toBe(true)
      expect(result.outcome).toBe('blackjack')
    })

    it('uses custom payout ratio', () => {
      const result = calculateHandPayout(
        [card('A'), card('K')],
        [card('10'), card('8')],
        100, false, false, 1.2, // 6:5
      )
      expect(result.payout).toBe(120)
    })
  })

  describe('push', () => {
    it('returns 0 for push', () => {
      // Both have 20
      const result = calculateHandPayout(
        [card('10'), card('Q')],
        [card('10'), card('K')],
        100, false, false,
      )
      expect(result.payout).toBe(0)
      expect(result.isPush).toBe(true)
      expect(result.outcome).toBe('push')
    })

    it('pushes on mutual blackjack', () => {
      const result = calculateHandPayout(
        [card('A'), card('K')],
        [card('A'), card('Q')],
        100, false, false,
      )
      expect(result.payout).toBe(0)
      expect(result.isPush).toBe(true)
      expect(result.outcome).toBe('push')
    })
  })

  describe('loss', () => {
    it('loses full bet', () => {
      // Player: 18, Dealer: 20
      const result = calculateHandPayout(
        [card('10'), card('8')],
        [card('10'), card('Q')],
        100, false, false,
      )
      expect(result.payout).toBe(-100)
      expect(result.isWin).toBe(false)
      expect(result.outcome).toBe('loss')
    })

    it('loses doubled bet', () => {
      // Player: 10+5+2 = 17 (doubled), Dealer: 10+Q = 20
      const result = calculateHandPayout(
        [card('10'), card('5'), card('2')],
        [card('10'), card('Q')],
        100, true, false,
      )
      expect(result.payout).toBe(-200)
    })
  })

  describe('bust', () => {
    it('loses on bust (even if dealer busts too)', () => {
      const result = calculateHandPayout(
        [card('10'), card('8'), card('6')], // 24
        [card('10'), card('6'), card('8')], // 24
        100, false, false,
      )
      expect(result.payout).toBe(-100)
      expect(result.outcome).toBe('bust')
    })
  })

  describe('dealer busts', () => {
    it('wins when dealer busts', () => {
      const result = calculateHandPayout(
        [card('10'), card('8')],
        [card('10'), card('6'), card('K')], // 26
        100, false, false,
      )
      expect(result.payout).toBe(100)
      expect(result.isWin).toBe(true)
      expect(result.outcome).toBe('win')
    })
  })

  describe('surrender', () => {
    it('loses half bet on surrender', () => {
      const result = calculateHandPayout(
        [card('10'), card('6')],
        [card('10'), card('K')],
        100, false, true,
      )
      expect(result.payout).toBe(-50)
      expect(result.outcome).toBe('surrender')
    })
  })

  describe('dealer blackjack vs player non-blackjack', () => {
    it('player loses against dealer blackjack', () => {
      const result = calculateHandPayout(
        [card('10'), card('9')],
        [card('A'), card('K')],
        100, false, false,
      )
      expect(result.payout).toBe(-100)
      expect(result.outcome).toBe('loss')
    })
  })
})

describe('calculateInsurancePayout', () => {
  it('pays 2:1 when dealer has blackjack', () => {
    expect(calculateInsurancePayout(50, true)).toBe(100)
  })

  it('loses insurance when dealer has no blackjack', () => {
    expect(calculateInsurancePayout(50, false)).toBe(-50)
  })

  it('returns 0 for no insurance bet', () => {
    expect(calculateInsurancePayout(0, true)).toBe(0)
    expect(calculateInsurancePayout(0, false)).toBe(0)
  })
})

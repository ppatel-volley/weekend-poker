import { describe, it, expect } from 'vitest'
import type { Card } from '@weekend-casino/shared'
import { shouldDealerHit, playDealerHand } from '../dealer-strategy.js'

function card(rank: string, suit: string = 'spades'): Card {
  return { rank: rank as Card['rank'], suit: suit as Card['suit'] }
}

describe('shouldDealerHit', () => {
  describe('default (stands on soft 17)', () => {
    it('hits on 16', () => {
      expect(shouldDealerHit([card('10'), card('6')])).toBe(true)
    })

    it('hits on 12', () => {
      expect(shouldDealerHit([card('5'), card('7')])).toBe(true)
    })

    it('stands on hard 17', () => {
      expect(shouldDealerHit([card('10'), card('7')])).toBe(false)
    })

    it('stands on soft 17 by default (D-009)', () => {
      expect(shouldDealerHit([card('A'), card('6')])).toBe(false)
    })

    it('stands on 18', () => {
      expect(shouldDealerHit([card('10'), card('8')])).toBe(false)
    })

    it('stands on 21', () => {
      expect(shouldDealerHit([card('A'), card('K')])).toBe(false)
    })

    it('stands on soft 18', () => {
      expect(shouldDealerHit([card('A'), card('7')])).toBe(false)
    })

    it('hits on soft 16', () => {
      expect(shouldDealerHit([card('A'), card('5')])).toBe(true)
    })
  })

  describe('hitSoft17 = true (hard difficulty)', () => {
    it('hits on soft 17', () => {
      expect(shouldDealerHit([card('A'), card('6')], true)).toBe(true)
    })

    it('still stands on hard 17', () => {
      expect(shouldDealerHit([card('10'), card('7')], true)).toBe(false)
    })

    it('still stands on 18', () => {
      expect(shouldDealerHit([card('10'), card('8')], true)).toBe(false)
    })

    it('still stands on soft 18', () => {
      expect(shouldDealerHit([card('A'), card('7')], true)).toBe(false)
    })

    it('hits on soft 17 with three cards', () => {
      expect(shouldDealerHit([card('A'), card('3'), card('3')], true)).toBe(true)
    })
  })
})

describe('playDealerHand', () => {
  it('draws cards until standing', () => {
    const shoe = [card('3'), card('2'), card('K')]
    const result = playDealerHand([card('10'), card('4')], shoe, false)
    // 10 + 4 = 14, hit → +3 = 17, stand
    expect(result.length).toBe(3)
  })

  it('does not draw when already at 17', () => {
    const shoe = [card('5')]
    const result = playDealerHand([card('10'), card('7')], shoe, false)
    expect(result.length).toBe(2)
    expect(shoe.length).toBe(1) // shoe untouched
  })

  it('busts when necessary', () => {
    const shoe = [card('10')]
    const result = playDealerHand([card('10'), card('6')], shoe, false)
    // 10 + 6 = 16, hit → +10 = 26, bust (but dealer plays out)
    expect(result.length).toBe(3)
  })

  it('does not mutate the input cards array', () => {
    const initial = [card('10'), card('4')]
    const shoe = [card('3')]
    playDealerHand(initial, shoe, false)
    expect(initial.length).toBe(2)
  })

  it('handles soft 17 hit rule', () => {
    const shoe = [card('3')]
    const result = playDealerHand([card('A'), card('6')], shoe, true)
    // A + 6 = soft 17, hit → +3 = 20, stand
    expect(result.length).toBe(3)
  })

  it('handles soft 17 stand rule', () => {
    const shoe = [card('3')]
    const result = playDealerHand([card('A'), card('6')], shoe, false)
    // A + 6 = soft 17, stand (default)
    expect(result.length).toBe(2)
    expect(shoe.length).toBe(1)
  })
})

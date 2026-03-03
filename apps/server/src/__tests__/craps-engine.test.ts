import { describe, it, expect } from 'vitest'
import {
  rollDice,
  isNatural,
  isCraps,
  isPoint,
  isHardway,
  resolvePassLineBet,
  resolveDontPassBet,
  resolvePlaceBet,
  resolveFieldBet,
  resolveOddsBet,
  resolveComeBet,
  calculatePayout,
  isValidPlaceNumber,
} from '../craps-engine/index.js'
import type { CrapsBet, CrapsComeBet } from '@weekend-casino/shared'

// ── Helper ──────────────────────────────────────────────────────────

function makeBet(overrides: Partial<CrapsBet> = {}): CrapsBet {
  return {
    id: 'test-bet-1',
    playerId: 'player-1',
    type: 'pass_line',
    amount: 100,
    working: true,
    status: 'active',
    payout: 0,
    ...overrides,
  }
}

function makeComeBet(overrides: Partial<CrapsComeBet> = {}): CrapsComeBet {
  return {
    id: 'test-come-1',
    playerId: 'player-1',
    type: 'come',
    amount: 100,
    comePoint: null,
    oddsAmount: 0,
    status: 'active',
    ...overrides,
  }
}

// ── rollDice ────────────────────────────────────────────────────────

describe('rollDice', () => {
  it('returns an array of two numbers', () => {
    const result = rollDice()
    expect(result).toHaveLength(2)
  })

  it('each die is between 1 and 6', () => {
    for (let i = 0; i < 100; i++) {
      const [d1, d2] = rollDice()
      expect(d1).toBeGreaterThanOrEqual(1)
      expect(d1).toBeLessThanOrEqual(6)
      expect(d2).toBeGreaterThanOrEqual(1)
      expect(d2).toBeLessThanOrEqual(6)
    }
  })
})

// ── Classification ──────────────────────────────────────────────────

describe('isNatural', () => {
  it('returns true for 7', () => expect(isNatural(7)).toBe(true))
  it('returns true for 11', () => expect(isNatural(11)).toBe(true))
  it('returns false for 6', () => expect(isNatural(6)).toBe(false))
  it('returns false for 2', () => expect(isNatural(2)).toBe(false))
  it('returns false for 12', () => expect(isNatural(12)).toBe(false))
})

describe('isCraps', () => {
  it('returns true for 2', () => expect(isCraps(2)).toBe(true))
  it('returns true for 3', () => expect(isCraps(3)).toBe(true))
  it('returns true for 12', () => expect(isCraps(12)).toBe(true))
  it('returns false for 7', () => expect(isCraps(7)).toBe(false))
  it('returns false for 4', () => expect(isCraps(4)).toBe(false))
})

describe('isPoint', () => {
  const pointNums = [4, 5, 6, 8, 9, 10]
  const nonPointNums = [2, 3, 7, 11, 12]

  for (const n of pointNums) {
    it(`returns true for ${n}`, () => expect(isPoint(n)).toBe(true))
  }
  for (const n of nonPointNums) {
    it(`returns false for ${n}`, () => expect(isPoint(n)).toBe(false))
  }
})

describe('isHardway', () => {
  it('returns true when both dice are equal', () => expect(isHardway(3, 3)).toBe(true))
  it('returns false when dice differ', () => expect(isHardway(3, 4)).toBe(false))
})

// ── Pass Line Resolution ────────────────────────────────────────────

describe('resolvePassLineBet', () => {
  describe('come-out roll (puckOn = false)', () => {
    it('wins on 7 (natural)', () => {
      const result = resolvePassLineBet(makeBet(), 7, null, false)
      expect(result.status).toBe('won')
      expect(result.payout).toBe(200) // 1:1
    })

    it('wins on 11 (natural)', () => {
      const result = resolvePassLineBet(makeBet(), 11, null, false)
      expect(result.status).toBe('won')
    })

    it('loses on 2 (craps)', () => {
      const result = resolvePassLineBet(makeBet(), 2, null, false)
      expect(result.status).toBe('lost')
      expect(result.payout).toBe(0)
    })

    it('loses on 3 (craps)', () => {
      const result = resolvePassLineBet(makeBet(), 3, null, false)
      expect(result.status).toBe('lost')
    })

    it('loses on 12 (craps)', () => {
      const result = resolvePassLineBet(makeBet(), 12, null, false)
      expect(result.status).toBe('lost')
    })

    it('stays active on point number (4)', () => {
      const result = resolvePassLineBet(makeBet(), 4, null, false)
      expect(result.status).toBe('active')
    })
  })

  describe('point phase (puckOn = true)', () => {
    it('wins when point is hit', () => {
      const result = resolvePassLineBet(makeBet(), 6, 6, true)
      expect(result.status).toBe('won')
      expect(result.payout).toBe(200)
    })

    it('loses on 7 (seven-out)', () => {
      const result = resolvePassLineBet(makeBet(), 7, 6, true)
      expect(result.status).toBe('lost')
      expect(result.payout).toBe(0)
    })

    it('stays active on non-point, non-7', () => {
      const result = resolvePassLineBet(makeBet(), 5, 6, true)
      expect(result.status).toBe('active')
    })
  })
})

// ── Don't Pass Resolution ───────────────────────────────────────────

describe('resolveDontPassBet', () => {
  describe('come-out roll', () => {
    it('wins on 2', () => {
      const bet = makeBet({ type: 'dont_pass' })
      const result = resolveDontPassBet(bet, 2, null, false)
      expect(result.status).toBe('won')
      expect(result.payout).toBe(200)
    })

    it('wins on 3', () => {
      const bet = makeBet({ type: 'dont_pass' })
      const result = resolveDontPassBet(bet, 3, null, false)
      expect(result.status).toBe('won')
    })

    it('pushes on 12 (bar)', () => {
      const bet = makeBet({ type: 'dont_pass' })
      const result = resolveDontPassBet(bet, 12, null, false)
      expect(result.status).toBe('push')
      expect(result.payout).toBe(100) // Return original bet
    })

    it('loses on 7', () => {
      const bet = makeBet({ type: 'dont_pass' })
      const result = resolveDontPassBet(bet, 7, null, false)
      expect(result.status).toBe('lost')
      expect(result.payout).toBe(0)
    })

    it('loses on 11', () => {
      const bet = makeBet({ type: 'dont_pass' })
      const result = resolveDontPassBet(bet, 11, null, false)
      expect(result.status).toBe('lost')
    })

    it('stays active on point number', () => {
      const bet = makeBet({ type: 'dont_pass' })
      const result = resolveDontPassBet(bet, 6, null, false)
      expect(result.status).toBe('active')
    })
  })

  describe('point phase', () => {
    it('wins on 7', () => {
      const bet = makeBet({ type: 'dont_pass' })
      const result = resolveDontPassBet(bet, 7, 6, true)
      expect(result.status).toBe('won')
    })

    it('loses when point is hit', () => {
      const bet = makeBet({ type: 'dont_pass' })
      const result = resolveDontPassBet(bet, 6, 6, true)
      expect(result.status).toBe('lost')
    })

    it('stays active on non-point, non-7', () => {
      const bet = makeBet({ type: 'dont_pass' })
      const result = resolveDontPassBet(bet, 5, 6, true)
      expect(result.status).toBe('active')
    })
  })
})

// ── Place Bet Resolution ────────────────────────────────────────────

describe('resolvePlaceBet', () => {
  it('wins when target number is rolled (6/8: 7:6)', () => {
    const bet = makeBet({ type: 'place', targetNumber: 6, amount: 60 })
    const result = resolvePlaceBet(bet, 6)
    expect(result.status).toBe('won')
    // 60 + floor(60 * 7/6) = 60 + 70 = 130
    expect(result.payout).toBe(130)
  })

  it('wins when target number is rolled (4/10: 9:5)', () => {
    const bet = makeBet({ type: 'place', targetNumber: 4, amount: 50 })
    const result = resolvePlaceBet(bet, 4)
    expect(result.status).toBe('won')
    // 50 + floor(50 * 9/5) = 50 + 90 = 140
    expect(result.payout).toBe(140)
  })

  it('wins when target number is rolled (5/9: 7:5)', () => {
    const bet = makeBet({ type: 'place', targetNumber: 5, amount: 50 })
    const result = resolvePlaceBet(bet, 5)
    expect(result.status).toBe('won')
    // 50 + floor(50 * 7/5) = 50 + 70 = 120
    expect(result.payout).toBe(120)
  })

  it('loses on 7', () => {
    const bet = makeBet({ type: 'place', targetNumber: 6 })
    const result = resolvePlaceBet(bet, 7)
    expect(result.status).toBe('lost')
    expect(result.payout).toBe(0)
  })

  it('stays active on other numbers', () => {
    const bet = makeBet({ type: 'place', targetNumber: 6 })
    const result = resolvePlaceBet(bet, 5)
    expect(result.status).toBe('active')
  })

  it('stays unchanged when not working', () => {
    const bet = makeBet({ type: 'place', targetNumber: 6, working: false })
    const result = resolvePlaceBet(bet, 6)
    expect(result.status).toBe('active') // Not working, so no resolution
  })
})

// ── Field Bet Resolution ────────────────────────────────────────────

describe('resolveFieldBet', () => {
  it('loses on non-field numbers (5, 6, 7, 8)', () => {
    for (const n of [5, 6, 7, 8]) {
      const result = resolveFieldBet(makeBet({ type: 'field' }), n)
      expect(result.status).toBe('lost')
    }
  })

  it('wins 1:1 on 3, 4, 9, 10, 11', () => {
    for (const n of [3, 4, 9, 10, 11]) {
      const result = resolveFieldBet(makeBet({ type: 'field', amount: 100 }), n)
      expect(result.status).toBe('won')
      expect(result.payout).toBe(200) // 1:1 + original
    }
  })

  it('wins 2:1 on 2 (double)', () => {
    const result = resolveFieldBet(makeBet({ type: 'field', amount: 100 }), 2)
    expect(result.status).toBe('won')
    expect(result.payout).toBe(300) // 2:1 + original
  })

  it('wins 3:1 on 12 (triple)', () => {
    const result = resolveFieldBet(makeBet({ type: 'field', amount: 100 }), 12)
    expect(result.status).toBe('won')
    expect(result.payout).toBe(400) // 3:1 + original
  })
})

// ── Odds Bet Resolution ─────────────────────────────────────────────

describe('resolveOddsBet', () => {
  describe('pass odds', () => {
    it('wins at true odds on point hit (4/10: 2:1)', () => {
      const bet = makeBet({ type: 'pass_odds', amount: 100 })
      const result = resolveOddsBet(bet, 4, 4, 'pass')
      expect(result.status).toBe('won')
      // 100 + floor(100 * 2/1) = 300
      expect(result.payout).toBe(300)
    })

    it('wins at true odds on point hit (5/9: 3:2)', () => {
      const bet = makeBet({ type: 'pass_odds', amount: 100 })
      const result = resolveOddsBet(bet, 5, 5, 'pass')
      expect(result.status).toBe('won')
      // 100 + floor(100 * 3/2) = 250
      expect(result.payout).toBe(250)
    })

    it('wins at true odds on point hit (6/8: 6:5)', () => {
      const bet = makeBet({ type: 'pass_odds', amount: 100 })
      const result = resolveOddsBet(bet, 6, 6, 'pass')
      expect(result.status).toBe('won')
      // 100 + floor(100 * 6/5) = 220
      expect(result.payout).toBe(220)
    })

    it('loses on 7', () => {
      const bet = makeBet({ type: 'pass_odds', amount: 100 })
      const result = resolveOddsBet(bet, 7, 6, 'pass')
      expect(result.status).toBe('lost')
    })

    it('stays active on other numbers', () => {
      const bet = makeBet({ type: 'pass_odds', amount: 100 })
      const result = resolveOddsBet(bet, 5, 6, 'pass')
      expect(result.status).toBe('active')
    })
  })

  describe('dont_pass odds', () => {
    it('wins at inverse odds on 7 (point 4: 1:2)', () => {
      const bet = makeBet({ type: 'dont_pass_odds', amount: 100 })
      const result = resolveOddsBet(bet, 7, 4, 'dont_pass')
      expect(result.status).toBe('won')
      // 100 + floor(100 * 1/2) = 150
      expect(result.payout).toBe(150)
    })

    it('loses when point is hit', () => {
      const bet = makeBet({ type: 'dont_pass_odds', amount: 100 })
      const result = resolveOddsBet(bet, 4, 4, 'dont_pass')
      expect(result.status).toBe('lost')
    })
  })
})

// ── Come Bet Resolution ─────────────────────────────────────────────

describe('resolveComeBet', () => {
  describe('come bet without point', () => {
    it('wins on natural (7)', () => {
      const result = resolveComeBet(makeComeBet(), 7)
      expect(result.status).toBe('won')
    })

    it('wins on natural (11)', () => {
      const result = resolveComeBet(makeComeBet(), 11)
      expect(result.status).toBe('won')
    })

    it('loses on craps (2)', () => {
      const result = resolveComeBet(makeComeBet(), 2)
      expect(result.status).toBe('lost')
    })

    it('loses on craps (3)', () => {
      const result = resolveComeBet(makeComeBet(), 3)
      expect(result.status).toBe('lost')
    })

    it('loses on craps (12)', () => {
      const result = resolveComeBet(makeComeBet(), 12)
      expect(result.status).toBe('lost')
    })

    it('establishes a come point on point number', () => {
      const result = resolveComeBet(makeComeBet(), 6)
      expect(result.status).toBe('active')
      expect(result.comePoint).toBe(6)
    })
  })

  describe('come bet with established point', () => {
    it('wins when come point is rolled', () => {
      const result = resolveComeBet(makeComeBet({ comePoint: 6 }), 6)
      expect(result.status).toBe('won')
    })

    it('loses on 7', () => {
      const result = resolveComeBet(makeComeBet({ comePoint: 6 }), 7)
      expect(result.status).toBe('lost')
    })

    it('stays active on other numbers', () => {
      const result = resolveComeBet(makeComeBet({ comePoint: 6 }), 5)
      expect(result.status).toBe('active')
    })
  })

  describe('dont_come without point', () => {
    it('wins on 2', () => {
      const result = resolveComeBet(makeComeBet({ type: 'dont_come' }), 2)
      expect(result.status).toBe('won')
    })

    it('wins on 3', () => {
      const result = resolveComeBet(makeComeBet({ type: 'dont_come' }), 3)
      expect(result.status).toBe('won')
    })

    it('pushes on 12', () => {
      const result = resolveComeBet(makeComeBet({ type: 'dont_come' }), 12)
      expect(result.status).toBe('push')
    })

    it('loses on 7', () => {
      const result = resolveComeBet(makeComeBet({ type: 'dont_come' }), 7)
      expect(result.status).toBe('lost')
    })

    it('establishes point on point number', () => {
      const result = resolveComeBet(makeComeBet({ type: 'dont_come' }), 8)
      expect(result.comePoint).toBe(8)
    })
  })

  describe('dont_come with established point', () => {
    it('wins on 7', () => {
      const result = resolveComeBet(makeComeBet({ type: 'dont_come', comePoint: 8 }), 7)
      expect(result.status).toBe('won')
    })

    it('loses when point is rolled', () => {
      const result = resolveComeBet(makeComeBet({ type: 'dont_come', comePoint: 8 }), 8)
      expect(result.status).toBe('lost')
    })
  })
})

// ── calculatePayout ─────────────────────────────────────────────────

describe('calculatePayout', () => {
  it('pass_line pays 1:1', () => {
    expect(calculatePayout('pass_line', 100)).toBe(200)
  })

  it('dont_pass pays 1:1', () => {
    expect(calculatePayout('dont_pass', 100)).toBe(200)
  })

  it('place bet on 6 pays 7:6', () => {
    const result = calculatePayout('place', 60, 6)
    expect(result).toBe(130) // 60 + floor(60 * 7/6) = 130
  })

  it('place bet on 4 pays 9:5', () => {
    const result = calculatePayout('place', 50, 4)
    expect(result).toBe(140) // 50 + floor(50 * 9/5) = 140
  })

  it('pass_odds on point 4 pays 2:1', () => {
    const result = calculatePayout('pass_odds', 100, 4)
    expect(result).toBe(300)
  })

  it('dont_pass_odds on point 4 pays 1:2', () => {
    const result = calculatePayout('dont_pass_odds', 100, 4)
    expect(result).toBe(150)
  })

  it('field pays 1:1 base', () => {
    expect(calculatePayout('field', 100)).toBe(200)
  })

  it('come pays 1:1', () => {
    expect(calculatePayout('come', 100)).toBe(200)
  })
})

// ── isValidPlaceNumber ──────────────────────────────────────────────

describe('isValidPlaceNumber', () => {
  it('returns true for valid place numbers', () => {
    for (const n of [4, 5, 6, 8, 9, 10]) {
      expect(isValidPlaceNumber(n)).toBe(true)
    }
  })

  it('returns false for invalid numbers', () => {
    for (const n of [1, 2, 3, 7, 11, 12, 13]) {
      expect(isValidPlaceNumber(n)).toBe(false)
    }
  })
})

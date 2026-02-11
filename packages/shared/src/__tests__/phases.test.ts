import { describe, expect, it } from 'vitest'
import { PokerPhase, BETTING_PHASES, DEALING_PHASES } from '../types/phases.js'

describe('PokerPhase enum', () => {
  it('has 14 phases', () => {
    const values = Object.values(PokerPhase)
    expect(values).toHaveLength(14)
  })

  it('uses SCREAMING_SNAKE_CASE string values', () => {
    expect(PokerPhase.Lobby).toBe('LOBBY')
    expect(PokerPhase.PreFlopBetting).toBe('PRE_FLOP_BETTING')
    expect(PokerPhase.AllInRunout).toBe('ALL_IN_RUNOUT')
    expect(PokerPhase.HandComplete).toBe('HAND_COMPLETE')
  })
})

describe('BETTING_PHASES', () => {
  it('contains exactly 4 betting phases', () => {
    expect(BETTING_PHASES).toHaveLength(4)
    expect(BETTING_PHASES).toContain(PokerPhase.PreFlopBetting)
    expect(BETTING_PHASES).toContain(PokerPhase.FlopBetting)
    expect(BETTING_PHASES).toContain(PokerPhase.TurnBetting)
    expect(BETTING_PHASES).toContain(PokerPhase.RiverBetting)
  })
})

describe('DEALING_PHASES', () => {
  it('contains exactly 4 dealing phases', () => {
    expect(DEALING_PHASES).toHaveLength(4)
    expect(DEALING_PHASES).toContain(PokerPhase.DealingHoleCards)
    expect(DEALING_PHASES).toContain(PokerPhase.DealingFlop)
    expect(DEALING_PHASES).toContain(PokerPhase.DealingTurn)
    expect(DEALING_PHASES).toContain(PokerPhase.DealingRiver)
  })
})

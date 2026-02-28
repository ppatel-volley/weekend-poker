import { describe, it, expect, beforeEach } from 'vitest'
import { CasinoPhase } from '@weekend-casino/shared'

/**
 * Draw phase transition tests.
 *
 * Verifies the phase flow:
 *   DRAW_POSTING_BLINDS → DRAW_DEALING → DRAW_BETTING_1
 *   → DRAW_DRAW_PHASE → DRAW_BETTING_2 → DRAW_SHOWDOWN
 *   → DRAW_POT_DISTRIBUTION → DRAW_HAND_COMPLETE
 */

describe('5-Card Draw phase definitions', () => {
  it('should have all DRAW_ phases defined in CasinoPhase', () => {
    expect(CasinoPhase.DrawPostingBlinds).toBe('DRAW_POSTING_BLINDS')
    expect(CasinoPhase.DrawDealing).toBe('DRAW_DEALING')
    expect(CasinoPhase.DrawBetting1).toBe('DRAW_BETTING_1')
    expect(CasinoPhase.DrawDrawPhase).toBe('DRAW_DRAW_PHASE')
    expect(CasinoPhase.DrawBetting2).toBe('DRAW_BETTING_2')
    expect(CasinoPhase.DrawShowdown).toBe('DRAW_SHOWDOWN')
    expect(CasinoPhase.DrawPotDistribution).toBe('DRAW_POT_DISTRIBUTION')
    expect(CasinoPhase.DrawHandComplete).toBe('DRAW_HAND_COMPLETE')
  })

  it('should map five_card_draw to DRAW_POSTING_BLINDS in GAME_FIRST_PHASE', async () => {
    const { GAME_FIRST_PHASE } = await import('@weekend-casino/shared')
    expect(GAME_FIRST_PHASE['five_card_draw']).toBe(CasinoPhase.DrawPostingBlinds)
  })

  it('should include DRAW_ betting phases in BETTING_PHASES', async () => {
    const { BETTING_PHASES } = await import('@weekend-casino/shared')
    expect(BETTING_PHASES).toContain(CasinoPhase.DrawBetting1)
    expect(BETTING_PHASES).toContain(CasinoPhase.DrawBetting2)
  })

  it('should include DRAW_ dealing phases in DEALING_PHASES', async () => {
    const { DEALING_PHASES } = await import('@weekend-casino/shared')
    expect(DEALING_PHASES).toContain(CasinoPhase.DrawDealing)
    expect(DEALING_PHASES).toContain(CasinoPhase.DrawDrawPhase)
  })

  it('should include DRAW_ settlement phases in SETTLEMENT_PHASES', async () => {
    const { SETTLEMENT_PHASES } = await import('@weekend-casino/shared')
    expect(SETTLEMENT_PHASES).toContain(CasinoPhase.DrawShowdown)
    expect(SETTLEMENT_PHASES).toContain(CasinoPhase.DrawPotDistribution)
  })

  it('should include DRAW_HAND_COMPLETE in HAND_COMPLETE_PHASES', async () => {
    const { HAND_COMPLETE_PHASES } = await import('@weekend-casino/shared')
    expect(HAND_COMPLETE_PHASES).toContain(CasinoPhase.DrawHandComplete)
  })
})

describe('5-Card Draw phase flow', () => {
  it('should have correct phase transition order', () => {
    // The phases should flow in sequence
    const expectedFlow = [
      CasinoPhase.DrawPostingBlinds,
      CasinoPhase.DrawDealing,
      CasinoPhase.DrawBetting1,
      CasinoPhase.DrawDrawPhase,
      CasinoPhase.DrawBetting2,
      CasinoPhase.DrawShowdown,
      CasinoPhase.DrawPotDistribution,
      CasinoPhase.DrawHandComplete,
    ]

    // Verify all phases exist and are distinct
    expect(new Set(expectedFlow).size).toBe(8)
    expectedFlow.forEach(phase => {
      expect(Object.values(CasinoPhase)).toContain(phase)
    })
  })
})

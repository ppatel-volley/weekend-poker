import { describe, expect, it } from 'vitest'
import { PokerPhase } from '../types/phases.js'
import { getSlotMapForPhase } from '../types/voice.js'

describe('getSlotMapForPhase', () => {
  it('returns lobby commands for Lobby phase', () => {
    const slotMap = getSlotMapForPhase(PokerPhase.Lobby)
    expect(slotMap.command).toContain('ready')
    expect(slotMap.command).toContain('start')
  })

  it('returns betting actions for all betting phases', () => {
    const phases = [
      PokerPhase.PreFlopBetting,
      PokerPhase.FlopBetting,
      PokerPhase.TurnBetting,
      PokerPhase.RiverBetting,
    ]
    for (const phase of phases) {
      const slotMap = getSlotMapForPhase(phase)
      expect(slotMap.action).toContain('fold')
      expect(slotMap.action).toContain('raise')
      expect(slotMap.action).toContain('all in')
      expect(slotMap.amount).toBeDefined()
    }
  })

  it('returns empty slot map for non-interactive phases', () => {
    const slotMap = getSlotMapForPhase(PokerPhase.Showdown)
    expect(Object.keys(slotMap)).toHaveLength(0)
  })
})

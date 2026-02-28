import { describe, it, expect } from 'vitest'
import { CasinoPhase } from '../types/casino-phases.js'
import { PHASE_LABELS, getPhaseLabel } from '../constants/phase-labels.js'

describe('PHASE_LABELS', () => {
  it('should have a label for every CasinoPhase', () => {
    const allPhases = Object.values(CasinoPhase)
    for (const phase of allPhases) {
      expect(PHASE_LABELS[phase]).toBeDefined()
      expect(typeof PHASE_LABELS[phase]).toBe('string')
      expect(PHASE_LABELS[phase].length).toBeGreaterThan(0)
    }
  })

  it('should map Hold\'em betting phases to readable labels', () => {
    expect(PHASE_LABELS[CasinoPhase.PostingBlinds]).toBe('Posting Blinds')
    expect(PHASE_LABELS[CasinoPhase.PreFlopBetting]).toBe('Pre-Flop')
    expect(PHASE_LABELS[CasinoPhase.FlopBetting]).toBe('Flop')
    expect(PHASE_LABELS[CasinoPhase.TurnBetting]).toBe('Turn')
    expect(PHASE_LABELS[CasinoPhase.RiverBetting]).toBe('River')
    expect(PHASE_LABELS[CasinoPhase.Showdown]).toBe('Showdown')
  })

  it('should map 5-Card Draw phases to readable labels', () => {
    expect(PHASE_LABELS[CasinoPhase.DrawDrawPhase]).toBe('Draw Phase')
    expect(PHASE_LABELS[CasinoPhase.DrawBetting1]).toBe('First Bet')
    expect(PHASE_LABELS[CasinoPhase.DrawBetting2]).toBe('Second Bet')
  })

  it('should map Blackjack phases to readable labels', () => {
    expect(PHASE_LABELS[CasinoPhase.BjPlayerTurns]).toBe('Your Turn')
    expect(PHASE_LABELS[CasinoPhase.BjDealerTurn]).toBe('Dealer\'s Turn')
    expect(PHASE_LABELS[CasinoPhase.BjPlaceBets]).toBe('Place Your Bets')
  })

  it('should map TCP phases to readable labels', () => {
    expect(PHASE_LABELS[CasinoPhase.TcpPlayerDecisions]).toBe('Play or Fold')
    expect(PHASE_LABELS[CasinoPhase.TcpDealerReveal]).toBe('Dealer Reveals')
  })

  it('should not contain raw UPPER_SNAKE_CASE labels', () => {
    const allLabels = Object.values(PHASE_LABELS)
    for (const label of allLabels) {
      expect(label).not.toMatch(/^[A-Z0-9_]+$/)
    }
  })
})

describe('getPhaseLabel', () => {
  it('should return the label for a known phase', () => {
    expect(getPhaseLabel(CasinoPhase.PreFlopBetting)).toBe('Pre-Flop')
    expect(getPhaseLabel(CasinoPhase.Lobby)).toBe('Lobby')
  })

  it('should fall back to the raw phase string for unknown values', () => {
    expect(getPhaseLabel('UNKNOWN_PHASE' as CasinoPhase)).toBe('UNKNOWN_PHASE')
  })
})

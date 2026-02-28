import { describe, it, expect } from 'vitest'
import {
  CasinoPhase,
  BETTING_PHASES,
  DEALING_PHASES,
  SETTLEMENT_PHASES,
  HAND_COMPLETE_PHASES,
  GAME_FIRST_PHASE,
} from '../types/casino-phases.js'

describe('CasinoPhase enum', () => {
  it('should have all shared phases', () => {
    expect(CasinoPhase.Lobby).toBe('LOBBY')
    expect(CasinoPhase.GameSelect).toBe('GAME_SELECT')
  })

  it('should have Hold\'em phases (unprefixed for backwards compat)', () => {
    expect(CasinoPhase.PostingBlinds).toBe('POSTING_BLINDS')
    expect(CasinoPhase.PreFlopBetting).toBe('PRE_FLOP_BETTING')
    expect(CasinoPhase.Showdown).toBe('SHOWDOWN')
    expect(CasinoPhase.HandComplete).toBe('HAND_COMPLETE')
  })

  it('should have 5-Card Draw phases with DRAW_ prefix', () => {
    expect(CasinoPhase.DrawPostingBlinds).toBe('DRAW_POSTING_BLINDS')
    expect(CasinoPhase.DrawBetting1).toBe('DRAW_BETTING_1')
    expect(CasinoPhase.DrawHandComplete).toBe('DRAW_HAND_COMPLETE')
  })

  it('should have Blackjack Classic phases with BJ_ prefix', () => {
    expect(CasinoPhase.BjPlaceBets).toBe('BJ_PLACE_BETS')
    expect(CasinoPhase.BjPlayerTurns).toBe('BJ_PLAYER_TURNS')
    expect(CasinoPhase.BjHandComplete).toBe('BJ_HAND_COMPLETE')
  })

  it('should have Blackjack Competitive phases with BJC_ prefix', () => {
    expect(CasinoPhase.BjcPlaceBets).toBe('BJC_PLACE_BETS')
    expect(CasinoPhase.BjcPlayerTurns).toBe('BJC_PLAYER_TURNS')
    expect(CasinoPhase.BjcHandComplete).toBe('BJC_HAND_COMPLETE')
  })

  it('should have Roulette phases with ROULETTE_ prefix', () => {
    expect(CasinoPhase.RoulettePlaceBets).toBe('ROULETTE_PLACE_BETS')
    expect(CasinoPhase.RouletteSpin).toBe('ROULETTE_SPIN')
    expect(CasinoPhase.RouletteRoundComplete).toBe('ROULETTE_ROUND_COMPLETE')
  })

  it('should have Three Card Poker phases with TCP_ prefix', () => {
    expect(CasinoPhase.TcpPlaceBets).toBe('TCP_PLACE_BETS')
    expect(CasinoPhase.TcpDealCards).toBe('TCP_DEAL_CARDS')
    expect(CasinoPhase.TcpRoundComplete).toBe('TCP_ROUND_COMPLETE')
  })

  it('should have Craps phases with CRAPS_ prefix', () => {
    expect(CasinoPhase.CrapsNewShooter).toBe('CRAPS_NEW_SHOOTER')
    expect(CasinoPhase.CrapsComeOutBetting).toBe('CRAPS_COME_OUT_BETTING')
    expect(CasinoPhase.CrapsRoundComplete).toBe('CRAPS_ROUND_COMPLETE')
  })

  it('should have Game Night phases with GN_ prefix', () => {
    expect(CasinoPhase.GnSetup).toBe('GN_SETUP')
    expect(CasinoPhase.GnLeaderboard).toBe('GN_LEADERBOARD')
  })

  it('should have Quick Play phase', () => {
    expect(CasinoPhase.QpAutoRotate).toBe('QP_AUTO_ROTATE')
  })
})

describe('Phase grouping constants', () => {
  it('should list all betting phases', () => {
    expect(BETTING_PHASES.length).toBeGreaterThan(0)
    expect(BETTING_PHASES).toContain(CasinoPhase.PreFlopBetting)
    expect(BETTING_PHASES).toContain(CasinoPhase.DrawBetting1)
    expect(BETTING_PHASES).toContain(CasinoPhase.BjPlayerTurns)
    expect(BETTING_PHASES).toContain(CasinoPhase.RoulettePlaceBets)
  })

  it('should list all dealing phases', () => {
    expect(DEALING_PHASES.length).toBeGreaterThan(0)
    expect(DEALING_PHASES).toContain(CasinoPhase.DealingHoleCards)
    expect(DEALING_PHASES).toContain(CasinoPhase.DrawDealing)
    expect(DEALING_PHASES).toContain(CasinoPhase.BjDealInitial)
  })

  it('should list all settlement phases', () => {
    expect(SETTLEMENT_PHASES.length).toBeGreaterThan(0)
    expect(SETTLEMENT_PHASES).toContain(CasinoPhase.Showdown)
    expect(SETTLEMENT_PHASES).toContain(CasinoPhase.BjSettlement)
  })

  it('should list all hand-complete phases', () => {
    expect(HAND_COMPLETE_PHASES.length).toBeGreaterThan(0)
    expect(HAND_COMPLETE_PHASES).toContain(CasinoPhase.HandComplete)
    expect(HAND_COMPLETE_PHASES).toContain(CasinoPhase.DrawHandComplete)
  })
})

describe('GAME_FIRST_PHASE routing table', () => {
  it('should map holdem to POSTING_BLINDS', () => {
    expect(GAME_FIRST_PHASE.holdem).toBe(CasinoPhase.PostingBlinds)
  })

  it('should map five_card_draw to DRAW_POSTING_BLINDS', () => {
    expect(GAME_FIRST_PHASE.five_card_draw).toBe(CasinoPhase.DrawPostingBlinds)
  })

  it('should map blackjack_classic to BJ_PLACE_BETS', () => {
    expect(GAME_FIRST_PHASE.blackjack_classic).toBe(CasinoPhase.BjPlaceBets)
  })

  it('should map blackjack_competitive to BJC_PLACE_BETS', () => {
    expect(GAME_FIRST_PHASE.blackjack_competitive).toBe(CasinoPhase.BjcPlaceBets)
  })

  it('should map roulette to ROULETTE_PLACE_BETS', () => {
    expect(GAME_FIRST_PHASE.roulette).toBe(CasinoPhase.RoulettePlaceBets)
  })

  it('should map three_card_poker to TCP_PLACE_BETS', () => {
    expect(GAME_FIRST_PHASE.three_card_poker).toBe(CasinoPhase.TcpPlaceBets)
  })

  it('should map craps to CRAPS_NEW_SHOOTER', () => {
    expect(GAME_FIRST_PHASE.craps).toBe(CasinoPhase.CrapsNewShooter)
  })
})

describe('Phase naming convention (D-003)', () => {
  it('should use UPPER_SNAKE_CASE for all phase values', () => {
    const phases = Object.values(CasinoPhase)
    phases.forEach((phase) => {
      const isUpperSnakeCase = /^[A-Z0-9_]+$/.test(phase)
      expect(isUpperSnakeCase).toBe(true)
    })
  })

  it('should prefix new games but not Hold\'em', () => {
    // Hold'em phases are unprefixed (no game prefix like DRAW_, BJ_, etc.)
    const holdemPhases = [
      CasinoPhase.PostingBlinds,
      CasinoPhase.DealingHoleCards,
      CasinoPhase.PreFlopBetting,
    ]
    holdemPhases.forEach((phase) => {
      // Hold'em phases should NOT start with typical game prefixes
      expect(phase.startsWith('DRAW_')).toBe(false)
      expect(phase.startsWith('BJ_')).toBe(false)
      expect(phase.startsWith('BJC_')).toBe(false)
      expect(phase.startsWith('ROULETTE_')).toBe(false)
      expect(phase.startsWith('TCP_')).toBe(false)
      expect(phase.startsWith('CRAPS_')).toBe(false)
    })

    // New games have specific prefixes
    expect(CasinoPhase.DrawPostingBlinds).toMatch(/^DRAW_/)
    expect(CasinoPhase.BjPlaceBets).toMatch(/^BJ_/)
    expect(CasinoPhase.BjcPlaceBets).toMatch(/^BJC_/)
    expect(CasinoPhase.RoulettePlaceBets).toMatch(/^ROULETTE_/)
    expect(CasinoPhase.TcpPlaceBets).toMatch(/^TCP_/)
    expect(CasinoPhase.CrapsNewShooter).toMatch(/^CRAPS_/)
    expect(CasinoPhase.GnSetup).toMatch(/^GN_/)
  })
})

import { describe, it, expect } from 'vitest'
import { deriveCurrentGame } from '../hooks/useVGFHooks.js'

describe('deriveCurrentGame', () => {
  // ── Returns selectedGame when provided ──────────────────────────

  it('returns selectedGame when it is set', () => {
    expect(deriveCurrentGame('holdem', 'PRE_FLOP_BETTING')).toBe('holdem')
  })

  it('returns selectedGame even if phase is lobby', () => {
    expect(deriveCurrentGame('blackjack_classic', 'LOBBY')).toBe('blackjack_classic')
  })

  // ── Returns null for lobby phases ───────────────────────────────

  it('returns null when selectedGame is null and phase is LOBBY', () => {
    expect(deriveCurrentGame(null, 'LOBBY')).toBeNull()
  })

  it('returns null when selectedGame is null and phase is GAME_SELECT', () => {
    expect(deriveCurrentGame(null, 'GAME_SELECT')).toBeNull()
  })

  it('returns null when phase is null', () => {
    expect(deriveCurrentGame(null, null)).toBeNull()
  })

  it('returns null when phase is undefined', () => {
    expect(deriveCurrentGame(undefined, undefined)).toBeNull()
  })

  // ── Derives from Hold'em phases (unprefixed) ───────────────────

  it('derives holdem from POSTING_BLINDS', () => {
    expect(deriveCurrentGame(null, 'POSTING_BLINDS')).toBe('holdem')
  })

  it('derives holdem from PRE_FLOP_BETTING', () => {
    expect(deriveCurrentGame(null, 'PRE_FLOP_BETTING')).toBe('holdem')
  })

  it('derives holdem from SHOWDOWN', () => {
    expect(deriveCurrentGame(null, 'SHOWDOWN')).toBe('holdem')
  })

  it('derives holdem from HAND_COMPLETE', () => {
    expect(deriveCurrentGame(null, 'HAND_COMPLETE')).toBe('holdem')
  })

  it('derives holdem from ALL_IN_RUNOUT', () => {
    expect(deriveCurrentGame(null, 'ALL_IN_RUNOUT')).toBe('holdem')
  })

  // ── Derives from prefixed phases ────────────────────────────────

  it('derives five_card_draw from DRAW_POSTING_BLINDS', () => {
    expect(deriveCurrentGame(null, 'DRAW_POSTING_BLINDS')).toBe('five_card_draw')
  })

  it('derives five_card_draw from DRAW_DRAW_PHASE', () => {
    expect(deriveCurrentGame(null, 'DRAW_DRAW_PHASE')).toBe('five_card_draw')
  })

  it('derives blackjack_classic from BJ_PLACE_BETS', () => {
    expect(deriveCurrentGame(null, 'BJ_PLACE_BETS')).toBe('blackjack_classic')
  })

  it('derives blackjack_classic from BJ_PLAYER_TURNS', () => {
    expect(deriveCurrentGame(null, 'BJ_PLAYER_TURNS')).toBe('blackjack_classic')
  })

  it('derives blackjack_competitive from BJC_PLACE_BETS', () => {
    expect(deriveCurrentGame(null, 'BJC_PLACE_BETS')).toBe('blackjack_competitive')
  })

  it('derives roulette from ROULETTE_SPIN', () => {
    expect(deriveCurrentGame(null, 'ROULETTE_SPIN')).toBe('roulette')
  })

  it('derives three_card_poker from TCP_DEAL_CARDS', () => {
    expect(deriveCurrentGame(null, 'TCP_DEAL_CARDS')).toBe('three_card_poker')
  })

  it('derives craps from CRAPS_COME_OUT_ROLL', () => {
    expect(deriveCurrentGame(null, 'CRAPS_COME_OUT_ROLL')).toBe('craps')
  })

  // ── Unknown phase falls through to null ─────────────────────────

  it('returns null for an unknown phase string', () => {
    expect(deriveCurrentGame(null, 'UNKNOWN_PHASE')).toBeNull()
  })
})

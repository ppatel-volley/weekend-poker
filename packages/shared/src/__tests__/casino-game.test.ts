import { describe, it, expect } from 'vitest'
import {
  CasinoGame,
  CASINO_GAME_LABELS,
  V1_GAMES,
  V2_0_GAMES,
  V2_1_GAMES,
  ALL_GAMES,
  isCasinoGame,
} from '../types/casino-game.js'

describe('CasinoGame type', () => {
  it('should include all v1 games', () => {
    const v1Games: CasinoGame[] = [
      'holdem',
      'five_card_draw',
      'blackjack_classic',
      'blackjack_competitive',
    ]
    v1Games.forEach((game) => {
      expect(V1_GAMES).toContain(game)
    })
  })

  it('should include all v2.0 games', () => {
    const v2Games: CasinoGame[] = ['roulette', 'three_card_poker']
    v2Games.forEach((game) => {
      expect(V2_0_GAMES).toContain(game)
    })
  })

  it('should include all v2.1 games', () => {
    const v2_1Games: CasinoGame[] = ['craps']
    v2_1Games.forEach((game) => {
      expect(V2_1_GAMES).toContain(game)
    })
  })
})

describe('CASINO_GAME_LABELS', () => {
  it('should have labels for all v1 games', () => {
    expect(CASINO_GAME_LABELS.holdem).toBe('Texas Hold\'em')
    expect(CASINO_GAME_LABELS.five_card_draw).toBe('5-Card Draw')
    expect(CASINO_GAME_LABELS.blackjack_classic).toBe('Blackjack')
    expect(CASINO_GAME_LABELS.blackjack_competitive).toBe('Competitive Blackjack')
  })

  it('should have labels for all v2.0 games', () => {
    expect(CASINO_GAME_LABELS.roulette).toBe('Roulette')
    expect(CASINO_GAME_LABELS.three_card_poker).toBe('Three Card Poker')
  })

  it('should have labels for all v2.1 games', () => {
    expect(CASINO_GAME_LABELS.craps).toBe('Craps')
  })

  it('should be complete for all games', () => {
    ALL_GAMES.forEach((game) => {
      expect(CASINO_GAME_LABELS[game]).toBeDefined()
      expect(typeof CASINO_GAME_LABELS[game]).toBe('string')
    })
  })
})

describe('Game version grouping', () => {
  it('should have 4 v1 games', () => {
    expect(V1_GAMES.length).toBe(4)
  })

  it('should have 2 v2.0 games', () => {
    expect(V2_0_GAMES.length).toBe(2)
  })

  it('should have 1 v2.1 game', () => {
    expect(V2_1_GAMES.length).toBe(1)
  })

  it('should have 7 total games', () => {
    expect(ALL_GAMES.length).toBe(7)
  })

  it('ALL_GAMES should combine all version groups', () => {
    const combined = [...V1_GAMES, ...V2_0_GAMES, ...V2_1_GAMES]
    expect(ALL_GAMES).toEqual(combined)
  })

  it('version groups should not overlap', () => {
    const allFlat = [...V1_GAMES, ...V2_0_GAMES, ...V2_1_GAMES]
    const uniqueCount = new Set(allFlat).size
    expect(uniqueCount).toBe(allFlat.length)
  })
})

describe('isCasinoGame type guard', () => {
  it('should accept all valid game strings', () => {
    expect(isCasinoGame('holdem')).toBe(true)
    expect(isCasinoGame('five_card_draw')).toBe(true)
    expect(isCasinoGame('blackjack_classic')).toBe(true)
    expect(isCasinoGame('blackjack_competitive')).toBe(true)
    expect(isCasinoGame('roulette')).toBe(true)
    expect(isCasinoGame('three_card_poker')).toBe(true)
    expect(isCasinoGame('craps')).toBe(true)
  })

  it('should reject invalid strings', () => {
    expect(isCasinoGame('poker')).toBe(false)
    expect(isCasinoGame('texas_holdem')).toBe(false)
    expect(isCasinoGame('HOLDEM')).toBe(false)
    expect(isCasinoGame('blackjack')).toBe(false)
    expect(isCasinoGame('')).toBe(false)
  })

  it('should reject non-string types', () => {
    expect(isCasinoGame(null)).toBe(false)
    expect(isCasinoGame(undefined)).toBe(false)
    expect(isCasinoGame(42)).toBe(false)
    expect(isCasinoGame({})).toBe(false)
    expect(isCasinoGame([])).toBe(false)
  })
})

describe('CasinoGame naming convention', () => {
  it('should use snake_case for all games (D-004)', () => {
    ALL_GAMES.forEach((game) => {
      const isSnakeCase = /^[a-z]+(_[a-z]+)*$/.test(game)
      expect(isSnakeCase).toBe(true)
    })
  })
})

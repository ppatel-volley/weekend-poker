import { describe, expect, it } from 'vitest'
import {
  MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
  BLIND_LEVELS,
  DEFAULT_BLIND_LEVEL,
  DEALER_CHARACTERS,
} from '../constants/poker.js'

describe('Poker constants', () => {
  it('MAX_PLAYERS is 4', () => {
    expect(MAX_PLAYERS).toBe(4)
  })

  it('MIN_PLAYERS_TO_START is 2', () => {
    expect(MIN_PLAYERS_TO_START).toBe(2)
  })

  it('has 5 blind levels with increasing values', () => {
    expect(BLIND_LEVELS).toHaveLength(5)
    for (let i = 1; i < BLIND_LEVELS.length; i++) {
      expect(BLIND_LEVELS[i]!.smallBlind).toBeGreaterThan(BLIND_LEVELS[i - 1]!.smallBlind)
    }
  })

  it('DEFAULT_BLIND_LEVEL is level 1', () => {
    expect(DEFAULT_BLIND_LEVEL.level).toBe(1)
    expect(DEFAULT_BLIND_LEVEL.smallBlind).toBe(5)
    expect(DEFAULT_BLIND_LEVEL.bigBlind).toBe(10)
  })

  it('big blind is always 2x small blind', () => {
    for (const level of BLIND_LEVELS) {
      expect(level.bigBlind).toBe(level.smallBlind * 2)
    }
  })

  it('has 4 dealer characters', () => {
    expect(DEALER_CHARACTERS).toHaveLength(4)
    expect(DEALER_CHARACTERS).toContain('vincent')
    expect(DEALER_CHARACTERS).toContain('maya')
  })
})

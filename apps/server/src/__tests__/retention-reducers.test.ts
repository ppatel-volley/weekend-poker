import { describe, it, expect } from 'vitest'
import { createInitialCasinoState, casinoReducers } from '../ruleset/casino-state.js'
import type { ChallengeSummary } from '@weekend-casino/shared'

describe('v2.2 Retention Reducers', () => {
  describe('setChallengeProgress', () => {
    it('sets challenge summaries for a player', () => {
      const state = createInitialCasinoState()
      const summaries: ChallengeSummary[] = [
        {
          challengeId: 'bronze_play_5_hands',
          title: 'Warm Up',
          tier: 'bronze',
          currentValue: 3,
          targetValue: 5,
          completed: false,
          claimed: false,
        },
      ]

      const result = casinoReducers.setChallengeProgress(state, 'player1', summaries)
      expect(result.challengeSummary).toBeDefined()
      expect(result.challengeSummary!['player1']).toEqual(summaries)
    })

    it('preserves existing challenge summaries for other players', () => {
      const state = createInitialCasinoState({
        challengeSummary: {
          player1: [{
            challengeId: 'x',
            title: 'X',
            tier: 'bronze',
            currentValue: 1,
            targetValue: 5,
            completed: false,
            claimed: false,
          }],
        },
      })

      const newSummaries: ChallengeSummary[] = [{
        challengeId: 'y',
        title: 'Y',
        tier: 'silver',
        currentValue: 7,
        targetValue: 10,
        completed: false,
        claimed: false,
      }]

      const result = casinoReducers.setChallengeProgress(state, 'player2', newSummaries)
      expect(result.challengeSummary!['player1']).toBeDefined()
      expect(result.challengeSummary!['player2']).toEqual(newSummaries)
    })
  })

  describe('setDailyBonus', () => {
    it('sets bonus data on state', () => {
      const state = createInitialCasinoState()
      const bonusData = {
        amount: 1000,
        streakDay: 3,
        multiplierApplied: false,
        timestamp: Date.now(),
      }

      const result = casinoReducers.setDailyBonus(state, bonusData)
      expect(result.lastDailyBonus).toEqual(bonusData)
    })
  })

  describe('clearDailyBonus', () => {
    it('removes bonus data from state', () => {
      const state = createInitialCasinoState({
        lastDailyBonus: {
          amount: 500,
          streakDay: 1,
          multiplierApplied: false,
          timestamp: Date.now(),
        },
      })

      const result = casinoReducers.clearDailyBonus(state)
      expect(result.lastDailyBonus).toBeUndefined()
    })
  })
})

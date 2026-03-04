import { describe, it, expect } from 'vitest'
import { parseVoiceIntent } from '../voice/parseVoiceIntent.js'

describe('Craps voice intents', () => {
  describe('pass line', () => {
    it('recognises "pass line"', () => {
      expect(parseVoiceIntent('pass line').intent).toBe('craps_pass_line')
    })

    it('recognises "pass"', () => {
      expect(parseVoiceIntent('pass').intent).toBe('craps_pass_line')
    })
  })

  describe("don't pass", () => {
    it('recognises "don\'t pass"', () => {
      expect(parseVoiceIntent("don't pass").intent).toBe('craps_dont_pass')
    })

    it('recognises "dont pass"', () => {
      expect(parseVoiceIntent('dont pass').intent).toBe('craps_dont_pass')
    })

    it('dont_pass takes priority over pass_line', () => {
      // "don't pass" contains "pass" — must match dont_pass first
      expect(parseVoiceIntent("don't pass").intent).toBe('craps_dont_pass')
    })
  })

  describe('come bets', () => {
    it('recognises "come bet"', () => {
      expect(parseVoiceIntent('come bet').intent).toBe('craps_come')
    })

    it('recognises "come"', () => {
      expect(parseVoiceIntent('come').intent).toBe('craps_come')
    })

    it('recognises "don\'t come"', () => {
      expect(parseVoiceIntent("don't come").intent).toBe('craps_dont_come')
    })

    it('dont_come takes priority over come', () => {
      expect(parseVoiceIntent("don't come").intent).toBe('craps_dont_come')
    })
  })

  describe('field', () => {
    it('recognises "field"', () => {
      expect(parseVoiceIntent('field').intent).toBe('craps_field')
    })

    it('recognises "field bet"', () => {
      expect(parseVoiceIntent('field bet').intent).toBe('craps_field')
    })
  })

  describe('place bets', () => {
    it('recognises "place 6"', () => {
      const result = parseVoiceIntent('place 6')
      expect(result.intent).toBe('craps_place')
      expect(result.entities.amount).toBe(6)
    })

    it('recognises "place bet 8"', () => {
      const result = parseVoiceIntent('place bet 8')
      expect(result.intent).toBe('craps_place')
      expect(result.entities.amount).toBe(8)
    })
  })

  describe('odds', () => {
    it('recognises "odds"', () => {
      expect(parseVoiceIntent('odds').intent).toBe('craps_odds')
    })

    it('recognises "add odds"', () => {
      expect(parseVoiceIntent('add odds').intent).toBe('craps_odds')
    })
  })

  describe('roll', () => {
    it('recognises "roll"', () => {
      expect(parseVoiceIntent('roll').intent).toBe('craps_roll')
    })

    it('recognises "roll the dice"', () => {
      expect(parseVoiceIntent('roll the dice').intent).toBe('craps_roll')
    })

    it('recognises "shoot"', () => {
      expect(parseVoiceIntent('shoot').intent).toBe('craps_roll')
    })

    it('recognises "let it ride"', () => {
      expect(parseVoiceIntent('let it ride').intent).toBe('craps_roll')
    })
  })
})

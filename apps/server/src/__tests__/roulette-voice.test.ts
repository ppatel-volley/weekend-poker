import { describe, it, expect } from 'vitest'
import { parseVoiceIntent } from '../voice/parseVoiceIntent.js'

describe('Roulette voice intents', () => {
  describe('colour bets', () => {
    it('recognises "red"', () => {
      expect(parseVoiceIntent('red').intent).toBe('roulette_red')
    })

    it('recognises "on red"', () => {
      expect(parseVoiceIntent('on red').intent).toBe('roulette_red')
    })

    it('recognises "black"', () => {
      expect(parseVoiceIntent('black').intent).toBe('roulette_black')
    })

    it('recognises "on black"', () => {
      expect(parseVoiceIntent('on black').intent).toBe('roulette_black')
    })
  })

  describe('parity bets', () => {
    it('recognises "odd"', () => {
      expect(parseVoiceIntent('odd').intent).toBe('roulette_odd')
    })

    it('recognises "even"', () => {
      expect(parseVoiceIntent('even').intent).toBe('roulette_even')
    })
  })

  describe('high/low bets', () => {
    it('recognises "high"', () => {
      expect(parseVoiceIntent('high').intent).toBe('roulette_high')
    })

    it('recognises "19 to 36"', () => {
      expect(parseVoiceIntent('19 to 36').intent).toBe('roulette_high')
    })

    it('recognises "low"', () => {
      expect(parseVoiceIntent('low').intent).toBe('roulette_low')
    })

    it('recognises "1 to 18"', () => {
      expect(parseVoiceIntent('1 to 18').intent).toBe('roulette_low')
    })
  })

  describe('dozen bets', () => {
    it('recognises "first dozen"', () => {
      const result = parseVoiceIntent('first dozen')
      expect(result.intent).toBe('roulette_dozen')
      expect(result.entities.amount).toBe(1)
    })

    it('recognises "second dozen"', () => {
      const result = parseVoiceIntent('second dozen')
      expect(result.intent).toBe('roulette_dozen')
      expect(result.entities.amount).toBe(2)
    })

    it('recognises "third dozen"', () => {
      const result = parseVoiceIntent('third dozen')
      expect(result.intent).toBe('roulette_dozen')
      expect(result.entities.amount).toBe(3)
    })
  })

  describe('straight-up bets', () => {
    it('recognises "number 17"', () => {
      const result = parseVoiceIntent('number 17')
      expect(result.intent).toBe('roulette_straight')
      expect(result.entities.amount).toBe(17)
    })

    it('recognises "straight up 5"', () => {
      const result = parseVoiceIntent('straight up 5')
      expect(result.intent).toBe('roulette_straight')
      expect(result.entities.amount).toBe(5)
    })
  })

  describe('split bets', () => {
    it('recognises "split 17 and 20"', () => {
      const result = parseVoiceIntent('split 17 and 20')
      expect(result.intent).toBe('roulette_split')
      expect(result.entities.amount).toBe(17)
      expect(result.entities.splitTarget).toBe(20)
    })

    it('recognises "split 1 & 2"', () => {
      const result = parseVoiceIntent('split 1 & 2')
      expect(result.intent).toBe('roulette_split')
      expect(result.entities.amount).toBe(1)
      expect(result.entities.splitTarget).toBe(2)
    })
  })

  describe('action intents', () => {
    it('recognises "repeat"', () => {
      expect(parseVoiceIntent('repeat').intent).toBe('roulette_repeat')
    })

    it('recognises "same again"', () => {
      expect(parseVoiceIntent('same again').intent).toBe('roulette_repeat')
    })

    it('recognises "clear all"', () => {
      expect(parseVoiceIntent('clear all').intent).toBe('roulette_clear')
    })

    it('recognises "done" as roulette confirm', () => {
      expect(parseVoiceIntent("done").intent).toBe('roulette_confirm')
    })

    it('recognises "that\'s it" as roulette confirm', () => {
      expect(parseVoiceIntent("that's it").intent).toBe('roulette_confirm')
    })

    it('recognises "no bet"', () => {
      expect(parseVoiceIntent('no bet').intent).toBe('roulette_no_bet')
    })

    it('recognises "skip"', () => {
      expect(parseVoiceIntent('skip').intent).toBe('roulette_no_bet')
    })
  })
})

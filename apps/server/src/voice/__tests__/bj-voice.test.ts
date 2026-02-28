import { describe, it, expect } from 'vitest'
import { parseVoiceIntent } from '../parseVoiceIntent.js'

describe('parseVoiceIntent — Blackjack intents', () => {
  it('"hit" → bj_hit', () => {
    expect(parseVoiceIntent('hit').intent).toBe('bj_hit')
  })

  it('"hit me" → bj_hit', () => {
    expect(parseVoiceIntent('hit me').intent).toBe('bj_hit')
  })

  it('"card" → bj_hit', () => {
    expect(parseVoiceIntent('card').intent).toBe('bj_hit')
  })

  it('"stand" → bj_stand', () => {
    expect(parseVoiceIntent('stand').intent).toBe('bj_stand')
  })

  it('"stay" → bj_stand', () => {
    expect(parseVoiceIntent('stay').intent).toBe('bj_stand')
  })

  it('"hold" → bj_stand', () => {
    expect(parseVoiceIntent('hold').intent).toBe('bj_stand')
  })

  it('"double" → bj_double', () => {
    expect(parseVoiceIntent('double').intent).toBe('bj_double')
  })

  it('"double down" → bj_double', () => {
    expect(parseVoiceIntent('double down').intent).toBe('bj_double')
  })

  it('"split" → bj_split', () => {
    expect(parseVoiceIntent('split').intent).toBe('bj_split')
  })

  it('"insurance" → bj_insurance', () => {
    expect(parseVoiceIntent('insurance').intent).toBe('bj_insurance')
  })

  it('"even money" → bj_insurance', () => {
    expect(parseVoiceIntent('even money').intent).toBe('bj_insurance')
  })

  it('"surrender" → bj_surrender', () => {
    expect(parseVoiceIntent('surrender').intent).toBe('bj_surrender')
  })

  it('"give up" → bj_surrender', () => {
    expect(parseVoiceIntent('give up').intent).toBe('bj_surrender')
  })

  it('"stand pat" still works for draw', () => {
    expect(parseVoiceIntent('stand pat').intent).toBe('stand_pat')
  })

  it('"keep all" still works for draw', () => {
    expect(parseVoiceIntent('keep all').intent).toBe('stand_pat')
  })

  it('returns unknown for gibberish', () => {
    expect(parseVoiceIntent('banana phone').intent).toBe('unknown')
  })
})

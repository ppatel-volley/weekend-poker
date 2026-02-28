import { describe, it, expect } from 'vitest'
import { parseVoiceIntent } from '../parseVoiceIntent.js'

describe('parseVoiceIntent — casual phrases', () => {
  it('"gimme a card" → bj_hit', () => {
    expect(parseVoiceIntent('gimme a card').intent).toBe('bj_hit')
  })

  it('"gimme card" → bj_hit', () => {
    expect(parseVoiceIntent('gimme card').intent).toBe('bj_hit')
  })

  it('"deal me in" → ready', () => {
    expect(parseVoiceIntent('deal me in').intent).toBe('ready')
  })

  it('"double me" → bj_double', () => {
    expect(parseVoiceIntent('double me').intent).toBe('bj_double')
  })

  it('"stay" → bj_stand (already existed)', () => {
    expect(parseVoiceIntent('stay').intent).toBe('bj_stand')
  })

  it('"hit me" → bj_hit (already existed)', () => {
    expect(parseVoiceIntent('hit me').intent).toBe('bj_hit')
  })

  it('"I\'m out" → tcp_fold', () => {
    expect(parseVoiceIntent("I'm out").intent).toBe('tcp_fold')
  })

  it('"im out" → tcp_fold', () => {
    expect(parseVoiceIntent('im out').intent).toBe('tcp_fold')
  })

  it('"deal me in" should take priority over bare "deal"', () => {
    const result = parseVoiceIntent('deal me in')
    expect(result.intent).toBe('ready')
  })
})

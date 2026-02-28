import { describe, it, expect } from 'vitest'
import { parseVoiceIntent } from '../voice/parseVoiceIntent.js'

describe('TCP voice commands', () => {
  it('parses "ante up" as tcp_ante', () => {
    const result = parseVoiceIntent('ante up')
    expect(result.intent).toBe('tcp_ante')
  })

  it('parses "ante 50" as tcp_ante with amount', () => {
    const result = parseVoiceIntent('ante 50')
    expect(result.intent).toBe('tcp_ante')
    expect(result.entities.amount).toBe(50)
  })

  it('parses "ante" alone as tcp_ante', () => {
    const result = parseVoiceIntent('ante')
    expect(result.intent).toBe('tcp_ante')
  })

  it('parses "pair plus" as tcp_pair_plus', () => {
    const result = parseVoiceIntent('pair plus')
    expect(result.intent).toBe('tcp_pair_plus')
  })

  it('parses "side bet" as tcp_pair_plus', () => {
    const result = parseVoiceIntent('side bet')
    expect(result.intent).toBe('tcp_pair_plus')
  })

  it('parses "play" as tcp_play', () => {
    const result = parseVoiceIntent('play')
    expect(result.intent).toBe('tcp_play')
  })

  it('parses "I\'m in" as tcp_play', () => {
    const result = parseVoiceIntent("I'm in")
    expect(result.intent).toBe('tcp_play')
  })

  it('parses "I\'m out" as tcp_fold', () => {
    const result = parseVoiceIntent("I'm out")
    expect(result.intent).toBe('tcp_fold')
  })

  it('parses "confirm" as tcp_confirm', () => {
    const result = parseVoiceIntent('confirm')
    expect(result.intent).toBe('tcp_confirm')
  })

  it('still parses generic fold correctly', () => {
    const result = parseVoiceIntent('fold')
    expect(result.intent).toBe('fold')
  })

  it('still parses generic check correctly', () => {
    const result = parseVoiceIntent('check')
    expect(result.intent).toBe('check')
  })
})

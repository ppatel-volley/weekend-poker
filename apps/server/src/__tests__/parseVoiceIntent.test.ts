import { describe, it, expect } from 'vitest'
import { parseVoiceIntent } from '../voice/parseVoiceIntent.js'

describe('parseVoiceIntent', () => {
  // ── Basic intents ───────────────────────────────────────────

  it('should parse "fold" as fold intent', () => {
    const result = parseVoiceIntent('fold')
    expect(result.intent).toBe('fold')
    expect(result.confidence).toBe(1.0)
  })

  it('should parse "I fold" as fold intent', () => {
    const result = parseVoiceIntent('I fold')
    expect(result.intent).toBe('fold')
  })

  it('should parse "muck" as fold intent', () => {
    const result = parseVoiceIntent('muck')
    expect(result.intent).toBe('fold')
  })

  it('should parse "check" as check intent', () => {
    const result = parseVoiceIntent('check')
    expect(result.intent).toBe('check')
  })

  it('should parse "I check" as check intent', () => {
    const result = parseVoiceIntent('I check')
    expect(result.intent).toBe('check')
  })

  it('should parse "call" as call intent', () => {
    const result = parseVoiceIntent('call')
    expect(result.intent).toBe('call')
  })

  it('should parse "I call" as call intent', () => {
    const result = parseVoiceIntent('I call')
    expect(result.intent).toBe('call')
  })

  it('should parse "all in" as all_in intent', () => {
    const result = parseVoiceIntent('all in')
    expect(result.intent).toBe('all_in')
  })

  it('should parse "I\'m all in" as all_in intent', () => {
    const result = parseVoiceIntent("I'm all in")
    expect(result.intent).toBe('all_in')
  })

  it('should parse "shove" as all_in intent', () => {
    const result = parseVoiceIntent('shove')
    expect(result.intent).toBe('all_in')
  })

  it('should parse "push" as all_in intent', () => {
    const result = parseVoiceIntent('push')
    expect(result.intent).toBe('all_in')
  })

  it('should parse "ready" as ready intent', () => {
    const result = parseVoiceIntent('ready')
    expect(result.intent).toBe('ready')
  })

  it('should parse "I\'m ready" as ready intent', () => {
    const result = parseVoiceIntent("I'm ready")
    expect(result.intent).toBe('ready')
  })

  it('should parse "start" as start intent', () => {
    const result = parseVoiceIntent('start')
    expect(result.intent).toBe('start')
  })

  it('should parse "deal" as start intent', () => {
    const result = parseVoiceIntent('deal')
    expect(result.intent).toBe('start')
  })

  it('should parse "start the game" as start intent', () => {
    const result = parseVoiceIntent('start the game')
    expect(result.intent).toBe('start')
  })

  it('should parse "settings" as settings intent', () => {
    const result = parseVoiceIntent('settings')
    expect(result.intent).toBe('settings')
  })

  it('should parse "options" as settings intent', () => {
    const result = parseVoiceIntent('options')
    expect(result.intent).toBe('settings')
  })

  // ── Amount parsing (numeric) ────────────────────────────────

  it('should parse "raise 200" with numeric amount', () => {
    const result = parseVoiceIntent('raise 200')
    expect(result.intent).toBe('raise')
    expect(result.entities.amount).toBe(200)
  })

  it('should parse "bet 100" with numeric amount', () => {
    const result = parseVoiceIntent('bet 100')
    expect(result.intent).toBe('bet')
    expect(result.entities.amount).toBe(100)
  })

  // ── Amount parsing (word-based) ─────────────────────────────

  it('should parse "raise to two hundred" with word amount', () => {
    const result = parseVoiceIntent('raise to two hundred')
    expect(result.intent).toBe('raise')
    expect(result.entities.amount).toBe(200)
  })

  it('should parse "bet fifty" with word amount', () => {
    const result = parseVoiceIntent('bet fifty')
    expect(result.intent).toBe('bet')
    expect(result.entities.amount).toBe(50)
  })

  // ── Amount parsing (relative) ───────────────────────────────

  it('should parse "raise half pot" with relative amount -1', () => {
    const result = parseVoiceIntent('raise half pot')
    expect(result.intent).toBe('raise')
    expect(result.entities.amount).toBe(-1)
  })

  it('should parse "bet pot" with relative amount -2', () => {
    const result = parseVoiceIntent('bet pot')
    expect(result.intent).toBe('bet')
    expect(result.entities.amount).toBe(-2)
  })

  // ── No amount for raise/bet ─────────────────────────────────

  it('should parse "raise" without amount when none given', () => {
    const result = parseVoiceIntent('raise')
    expect(result.intent).toBe('raise')
    expect(result.entities.amount).toBeUndefined()
  })

  // ── Priority ordering ───────────────────────────────────────

  it('should prioritise all_in over other intents', () => {
    // "all in" contains no other keywords, but check priority is correct
    const result = parseVoiceIntent('all in')
    expect(result.intent).toBe('all_in')
  })

  it('should prioritise fold over check when both are present', () => {
    const result = parseVoiceIntent('fold or check')
    expect(result.intent).toBe('fold')
  })

  // ── Edge cases ──────────────────────────────────────────────

  it('should handle empty string as unknown', () => {
    const result = parseVoiceIntent('')
    expect(result.intent).toBe('unknown')
    expect(result.confidence).toBe(0.0)
  })

  it('should handle gibberish as unknown', () => {
    const result = parseVoiceIntent('asdf qwerty zxcv')
    expect(result.intent).toBe('unknown')
    expect(result.confidence).toBe(0.0)
  })

  it('should handle mixed case input', () => {
    const result = parseVoiceIntent('FOLD')
    expect(result.intent).toBe('fold')
  })

  it('should handle leading/trailing whitespace', () => {
    const result = parseVoiceIntent('  check  ')
    expect(result.intent).toBe('check')
  })

  // ── rawTranscript ───────────────────────────────────────────

  it('should always include the original rawTranscript', () => {
    const original = '  I FOLD  '
    const result = parseVoiceIntent(original)
    expect(result.rawTranscript).toBe(original)
  })
})

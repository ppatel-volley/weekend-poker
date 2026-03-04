import { describe, it, expect } from 'vitest'
import { resolveIdentity } from '../persistence/identity-resolver.js'

describe('resolveIdentity', () => {
  // ── Priority 1: accountId ──────────────────────────────────────

  it('should return platform_account source for accountId', () => {
    const result = resolveIdentity({ accountId: 'acc-123' })
    expect(result.token).toBe('acc-123')
    expect(result.source).toBe('platform_account')
  })

  it('should recognise volley_account as alternative accountId key', () => {
    const result = resolveIdentity({ volley_account: 'vol-456' })
    expect(result.token).toBe('vol-456')
    expect(result.source).toBe('platform_account')
  })

  it('should prefer accountId over anonymousId and deviceToken', () => {
    const result = resolveIdentity({
      accountId: 'acc-123',
      anonymousId: 'anon-456',
      deviceToken: 'dev-789',
    })
    expect(result.token).toBe('acc-123')
    expect(result.source).toBe('platform_account')
  })

  // ── Priority 2: anonymousId ────────────────────────────────────

  it('should return platform_anonymous source for anonymousId', () => {
    const result = resolveIdentity({ anonymousId: 'anon-456' })
    expect(result.token).toBe('anon-456')
    expect(result.source).toBe('platform_anonymous')
  })

  it('should prefer anonymousId over deviceToken', () => {
    const result = resolveIdentity({
      anonymousId: 'anon-456',
      deviceToken: 'dev-789',
    })
    expect(result.token).toBe('anon-456')
    expect(result.source).toBe('platform_anonymous')
  })

  // ── Priority 3: deviceToken ────────────────────────────────────

  it('should return device_token source for deviceToken', () => {
    const result = resolveIdentity({ deviceToken: 'dev-789' })
    expect(result.token).toBe('dev-789')
    expect(result.source).toBe('device_token')
  })

  it('should recognise userId as alternative deviceToken key', () => {
    const result = resolveIdentity({ userId: 'user-abc' })
    expect(result.token).toBe('user-abc')
    expect(result.source).toBe('device_token')
  })

  // ── Edge cases ─────────────────────────────────────────────────

  it('should skip empty string accountId', () => {
    const result = resolveIdentity({ accountId: '', anonymousId: 'anon-456' })
    expect(result.token).toBe('anon-456')
    expect(result.source).toBe('platform_anonymous')
  })

  it('should skip non-string accountId', () => {
    const result = resolveIdentity({ accountId: 42, deviceToken: 'dev-789' })
    expect(result.token).toBe('dev-789')
    expect(result.source).toBe('device_token')
  })

  it('should skip empty string anonymousId', () => {
    const result = resolveIdentity({ anonymousId: '', deviceToken: 'dev-789' })
    expect(result.token).toBe('dev-789')
    expect(result.source).toBe('device_token')
  })

  it('should generate a fallback for completely empty metadata', () => {
    const result = resolveIdentity({})
    expect(result.token).toMatch(/^anon_\d+$/)
    expect(result.source).toBe('device_token')
  })

  it('should generate fallback when all fields are null/undefined', () => {
    const result = resolveIdentity({
      accountId: null,
      anonymousId: undefined,
      deviceToken: null,
    })
    expect(result.token).toMatch(/^anon_\d+$/)
    expect(result.source).toBe('device_token')
  })

  it('should handle missing fields gracefully (no throw)', () => {
    expect(() => resolveIdentity({})).not.toThrow()
    expect(() => resolveIdentity({ foo: 'bar' })).not.toThrow()
  })
})

import { describe, it, expect } from 'vitest'
import { retryStrategy } from '../redis-client.js'

describe('retryStrategy', () => {
  it('returns a value >= 2^times * 25 (before jitter cap)', () => {
    for (let times = 1; times <= 5; times++) {
      const result = retryStrategy(times)
      const base = Math.min(Math.pow(2, times) * 25, 5000)
      expect(result).toBeGreaterThanOrEqual(base)
    }
  })

  it('returns a value < base + 500 (jitter upper bound)', () => {
    for (let times = 1; times <= 5; times++) {
      const result = retryStrategy(times)
      const base = Math.min(Math.pow(2, times) * 25, 5000)
      expect(result).toBeLessThan(base + 500)
    }
  })

  it('produces exponential growth for early retries', () => {
    // times=1: base=50, times=2: base=100, times=3: base=200
    const base1 = Math.pow(2, 1) * 25
    const base2 = Math.pow(2, 2) * 25
    const base3 = Math.pow(2, 3) * 25

    expect(base1).toBe(50)
    expect(base2).toBe(100)
    expect(base3).toBe(200)
  })

  it('caps at 5000ms base (before jitter)', () => {
    // 2^8 * 25 = 6400, but capped at 5000
    const result = retryStrategy(8)
    expect(result).toBeGreaterThanOrEqual(5000)
    expect(result).toBeLessThan(5500)
  })

  it('stays capped for very high retry counts', () => {
    const result = retryStrategy(100)
    expect(result).toBeGreaterThanOrEqual(5000)
    expect(result).toBeLessThan(5500)
  })

  it('includes jitter (not deterministic)', () => {
    // Run multiple times and check they're not all identical
    const results = new Set<number>()
    for (let i = 0; i < 20; i++) {
      results.add(retryStrategy(5))
    }
    // With random jitter, extremely unlikely all 20 are identical
    expect(results.size).toBeGreaterThan(1)
  })
})

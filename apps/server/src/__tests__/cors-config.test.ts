import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parseAllowedOrigins } from '../cors-config.js'

describe('parseAllowedOrigins', () => {
  let originalAllowedOrigins: string | undefined

  beforeEach(() => {
    originalAllowedOrigins = process.env['ALLOWED_ORIGINS']
    delete process.env['ALLOWED_ORIGINS']
  })

  afterEach(() => {
    if (originalAllowedOrigins !== undefined) {
      process.env['ALLOWED_ORIGINS'] = originalAllowedOrigins
    } else {
      delete process.env['ALLOWED_ORIGINS']
    }
  })

  it('should return dev regex defaults when ALLOWED_ORIGINS is not set', () => {
    const origins = parseAllowedOrigins()

    expect(origins).toHaveLength(3)
    expect(origins[0]).toBeInstanceOf(RegExp)
    expect(origins[1]).toBeInstanceOf(RegExp)
    expect(origins[2]).toBeInstanceOf(RegExp)

    // Verify the regexes match expected dev patterns
    expect((origins[0] as RegExp).test('http://localhost:3000')).toBe(true)
    expect((origins[0] as RegExp).test('http://localhost:5173')).toBe(true)
    expect((origins[1] as RegExp).test('http://192.168.1.100:3000')).toBe(true)
    expect((origins[2] as RegExp).test('http://10.0.0.1:3000')).toBe(true)
  })

  it('should parse comma-separated origins from ALLOWED_ORIGINS env var', () => {
    process.env['ALLOWED_ORIGINS'] = 'https://example.com,https://other.com'
    const origins = parseAllowedOrigins()

    expect(origins).toEqual(['https://example.com', 'https://other.com'])
  })

  it('should handle a single origin', () => {
    process.env['ALLOWED_ORIGINS'] = 'https://only-one.com'
    const origins = parseAllowedOrigins()

    expect(origins).toEqual(['https://only-one.com'])
  })

  it('should trim whitespace from comma-separated values', () => {
    process.env['ALLOWED_ORIGINS'] = '  https://spaced.com , https://also-spaced.com  ,https://tight.com'
    const origins = parseAllowedOrigins()

    expect(origins).toEqual([
      'https://spaced.com',
      'https://also-spaced.com',
      'https://tight.com',
    ])
  })

  it('should filter out empty entries from trailing commas', () => {
    process.env['ALLOWED_ORIGINS'] = 'https://example.com,,https://other.com,'
    const origins = parseAllowedOrigins()

    expect(origins).toEqual(['https://example.com', 'https://other.com'])
  })

  it('should not match non-localhost origins with dev defaults', () => {
    const origins = parseAllowedOrigins()

    expect((origins[0] as RegExp).test('http://evil.com:3000')).toBe(false)
    expect((origins[0] as RegExp).test('https://localhost:3000')).toBe(false)
    expect((origins[1] as RegExp).test('http://192.169.1.1:3000')).toBe(false)
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { detectPlatform } from '../platform/detectPlatform.js'

describe('detectPlatform', () => {
  const originalLocation = window.location

  beforeEach(() => {
    // Reset URL to a clean state before each test
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '', href: 'http://localhost:5173/' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
    vi.restoreAllMocks()
  })

  // ── URL param override ─────────────────────────────────────────────

  it('detects FIRE_TV from URL param', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '?volley_platform=FIRE_TV', href: 'http://localhost:5173/?volley_platform=FIRE_TV' },
    })
    const result = detectPlatform()
    expect(result.platform).toBe('FIRE_TV')
    expect(result.isTV).toBe(true)
    expect(result.defaultInputMode).toBe('remote')
  })

  it('detects SAMSUNG_TIZEN from URL param', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '?volley_platform=SAMSUNG_TIZEN', href: 'http://localhost/' },
    })
    const result = detectPlatform()
    expect(result.platform).toBe('SAMSUNG_TIZEN')
    expect(result.isTV).toBe(true)
    expect(result.defaultInputMode).toBe('remote')
  })

  it('detects LG_WEBOS from URL param', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '?volley_platform=LG_WEBOS', href: 'http://localhost/' },
    })
    const result = detectPlatform()
    expect(result.platform).toBe('LG_WEBOS')
    expect(result.isTV).toBe(true)
    expect(result.defaultInputMode).toBe('remote')
  })

  it('detects ELECTRON from URL param', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '?volley_platform=ELECTRON', href: 'http://localhost/' },
    })
    const result = detectPlatform()
    expect(result.platform).toBe('ELECTRON')
    expect(result.isTV).toBe(false)
    expect(result.defaultInputMode).toBe('touch')
  })

  it('detects BROWSER from URL param', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '?volley_platform=BROWSER', href: 'http://localhost/' },
    })
    const result = detectPlatform()
    expect(result.platform).toBe('BROWSER')
    expect(result.isTV).toBe(false)
    expect(result.defaultInputMode).toBe('touch')
  })

  it('ignores invalid URL param values', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '?volley_platform=XBOX', href: 'http://localhost/' },
    })
    const result = detectPlatform()
    expect(result.platform).toBe('BROWSER') // fallback
  })

  // ── URL param takes priority over user agent ───────────────────────

  it('URL param overrides user agent detection', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '?volley_platform=BROWSER', href: 'http://localhost/' },
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Linux; Android 9; AFTSS Build/PS7285) AppleWebKit/537.36',
    )
    const result = detectPlatform()
    expect(result.platform).toBe('BROWSER')
  })

  // ── User agent detection ───────────────────────────────────────────

  it('detects Fire TV from AFT in user agent', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Linux; Android 9; AFTSS Build/PS7285) AppleWebKit/537.36',
    )
    const result = detectPlatform()
    expect(result.platform).toBe('FIRE_TV')
    expect(result.isTV).toBe(true)
    expect(result.defaultInputMode).toBe('remote')
  })

  it('detects Fire TV from Amazon in user agent', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Linux; Android 9; Amazon Fire TV Stick) AppleWebKit/537.36',
    )
    const result = detectPlatform()
    expect(result.platform).toBe('FIRE_TV')
  })

  it('detects Samsung Tizen from user agent', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36',
    )
    const result = detectPlatform()
    expect(result.platform).toBe('SAMSUNG_TIZEN')
    expect(result.isTV).toBe(true)
  })

  it('detects LG webOS from Web0S in user agent', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36',
    )
    const result = detectPlatform()
    expect(result.platform).toBe('LG_WEBOS')
    expect(result.isTV).toBe(true)
  })

  it('detects LG webOS from webOS in user agent', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (webOS; Linux) AppleWebKit/537.36',
    )
    const result = detectPlatform()
    expect(result.platform).toBe('LG_WEBOS')
    expect(result.isTV).toBe(true)
  })

  // ── Fallback ───────────────────────────────────────────────────────

  it('falls back to BROWSER when no match', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    )
    const result = detectPlatform()
    expect(result.platform).toBe('BROWSER')
    expect(result.isTV).toBe(false)
    expect(result.defaultInputMode).toBe('touch')
  })

  // ── sdkAvailable default ───────────────────────────────────────────

  it('sets sdkAvailable to false by default', () => {
    const result = detectPlatform()
    expect(result.sdkAvailable).toBe(false)
  })
})

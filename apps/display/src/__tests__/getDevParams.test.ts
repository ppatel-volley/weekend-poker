import { describe, it, expect } from 'vitest'
import { getDevParams } from '../utils/getDevParams.js'

function setSearch(search: string) {
  Object.defineProperty(window, 'location', {
    value: { search },
    writable: true,
    configurable: true,
  })
}

describe('getDevParams', () => {
  it('returns all undefined when no params are present', () => {
    setSearch('')
    const result = getDevParams()
    expect(result).toEqual({
      inputMode: undefined,
      platform: undefined,
      sessionId: undefined,
      serverUrl: undefined,
    })
  })

  it('parses a valid inputMode', () => {
    setSearch('?inputMode=remote')
    expect(getDevParams().inputMode).toBe('remote')
  })

  it('ignores an invalid inputMode', () => {
    setSearch('?inputMode=gamepad')
    expect(getDevParams().inputMode).toBeUndefined()
  })

  it('parses a valid volley_platform', () => {
    setSearch('?volley_platform=FIRE_TV')
    expect(getDevParams().platform).toBe('FIRE_TV')
  })

  it('ignores an invalid volley_platform', () => {
    setSearch('?volley_platform=PLAYSTATION')
    expect(getDevParams().platform).toBeUndefined()
  })

  it('parses sessionId', () => {
    setSearch('?sessionId=abc-123')
    expect(getDevParams().sessionId).toBe('abc-123')
  })

  it('parses serverUrl', () => {
    setSearch('?serverUrl=http://my-server:4000')
    expect(getDevParams().serverUrl).toBe('http://my-server:4000')
  })

  it('parses all params together', () => {
    setSearch(
      '?inputMode=voice&volley_platform=SAMSUNG_TIZEN&sessionId=sess-1&serverUrl=http://dev:5000',
    )
    const result = getDevParams()
    expect(result).toEqual({
      inputMode: 'voice',
      platform: 'SAMSUNG_TIZEN',
      sessionId: 'sess-1',
      serverUrl: 'http://dev:5000',
    })
  })

  it('parses touch inputMode', () => {
    setSearch('?inputMode=touch')
    expect(getDevParams().inputMode).toBe('touch')
  })

  it('parses all valid platforms', () => {
    const platforms = ['FIRE_TV', 'SAMSUNG_TIZEN', 'LG_WEBOS', 'BROWSER', 'ELECTRON']
    for (const p of platforms) {
      setSearch(`?volley_platform=${p}`)
      expect(getDevParams().platform).toBe(p)
    }
  })
})

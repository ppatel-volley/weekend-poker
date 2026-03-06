import { describe, it, expect } from 'vitest'
import { getPlatformApiUrl } from '../utils/getPlatformApiUrl.js'

describe('getPlatformApiUrl', () => {
  it('returns dev URL for local stage', () => {
    expect(getPlatformApiUrl('local')).toBe('platform-dev.volley-services.net')
  })

  it('returns dev URL for test stage', () => {
    expect(getPlatformApiUrl('test')).toBe('platform-dev.volley-services.net')
  })

  it('returns dev URL for dev stage', () => {
    expect(getPlatformApiUrl('dev')).toBe('platform-dev.volley-services.net')
  })

  it('returns staging URL for staging stage', () => {
    expect(getPlatformApiUrl('staging')).toBe('platform-staging.volley-services.net')
  })

  it('returns production URL for production stage', () => {
    expect(getPlatformApiUrl('production')).toBe('platform.volley-services.net')
  })

  it('falls back to production for unknown stage', () => {
    expect(getPlatformApiUrl('banana')).toBe('platform.volley-services.net')
  })

  it('falls back to production when stage is undefined', () => {
    expect(getPlatformApiUrl()).toBe('platform.volley-services.net')
  })
})

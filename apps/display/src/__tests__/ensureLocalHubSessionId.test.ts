import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ensureLocalHubSessionId } from '../utils/ensureLocalHubSessionId.js'

describe('ensureLocalHubSessionId', () => {
  const replaceStateSpy = vi.fn()

  beforeEach(() => {
    replaceStateSpy.mockClear()
    Object.defineProperty(window, 'location', {
      value: { search: '', pathname: '/' },
      writable: true,
    })
    window.history.replaceState = replaceStateSpy
  })

  it('injects volley_hub_session_id for local stage', () => {
    ensureLocalHubSessionId('local')
    expect(replaceStateSpy).toHaveBeenCalledOnce()
    const url = replaceStateSpy.mock.calls[0]![2] as string
    expect(url).toContain('volley_hub_session_id=local-dev-')
  })

  it('injects volley_hub_session_id for dev stage', () => {
    ensureLocalHubSessionId('dev')
    expect(replaceStateSpy).toHaveBeenCalledOnce()
  })

  it('injects volley_hub_session_id for test stage', () => {
    ensureLocalHubSessionId('test')
    expect(replaceStateSpy).toHaveBeenCalledOnce()
  })

  it('injects volley_hub_session_id for staging stage', () => {
    ensureLocalHubSessionId('staging')
    expect(replaceStateSpy).toHaveBeenCalledOnce()
  })

  it('does NOT inject for production stage', () => {
    ensureLocalHubSessionId('production')
    expect(replaceStateSpy).not.toHaveBeenCalled()
  })

  it('does NOT overwrite existing volley_hub_session_id', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?volley_hub_session_id=existing-id', pathname: '/' },
      writable: true,
    })
    ensureLocalHubSessionId('local')
    expect(replaceStateSpy).not.toHaveBeenCalled()
  })
})

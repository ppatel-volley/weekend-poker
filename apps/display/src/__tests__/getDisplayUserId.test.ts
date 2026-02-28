import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests for getDisplayUserId — dynamic Display session userId.
 *
 * Each test dynamically imports the module fresh (after vi.resetModules())
 * so the module-level cache is cleared between tests.
 */

beforeEach(() => {
  vi.resetModules()
})

function setSearch(search: string) {
  Object.defineProperty(window, 'location', {
    value: { search },
    writable: true,
    configurable: true,
  })
}

describe('getDisplayUserId', () => {
  it('returns userId from URL param when present', async () => {
    setSearch('?userId=test-player-42')
    const { getDisplayUserId } = await import('../utils/getDisplayUserId.js')
    expect(getDisplayUserId()).toBe('test-player-42')
  })

  it('generates a display-<uuid> when no URL param is present', async () => {
    setSearch('')
    const { getDisplayUserId } = await import('../utils/getDisplayUserId.js')
    const id = getDisplayUserId()
    expect(id).toMatch(/^display-[0-9a-f-]{36}$/)
  })

  it('caches the result across multiple calls', async () => {
    setSearch('')
    const { getDisplayUserId } = await import('../utils/getDisplayUserId.js')
    const first = getDisplayUserId()
    const second = getDisplayUserId()
    expect(first).toBe(second)
  })

  it('caches the URL param value across calls', async () => {
    setSearch('?userId=cached-id')
    const { getDisplayUserId } = await import('../utils/getDisplayUserId.js')
    const first = getDisplayUserId()

    // Change the URL — should still return the cached value
    setSearch('?userId=different-id')
    const second = getDisplayUserId()
    expect(second).toBe(first)
    expect(second).toBe('cached-id')
  })
})

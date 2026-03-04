import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock localStorage
const store: Record<string, string> = {}
const mockLocalStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k] }),
  get length() { return Object.keys(store).length },
  key: vi.fn(() => null),
}

Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true })

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-1234-5678-abcd'
vi.stubGlobal('crypto', { randomUUID: vi.fn(() => mockUUID) })

import { useDeviceToken } from '../hooks/useDeviceToken.js'

describe('useDeviceToken', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k]
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
  })

  it('generates a new token when none exists', () => {
    const { result } = renderHook(() => useDeviceToken())
    expect(result.current.deviceToken).toBe(mockUUID)
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'weekend-casino-device-token',
      mockUUID,
    )
  })

  it('returns existing token from localStorage', () => {
    store['weekend-casino-device-token'] = 'existing-token'

    const { result } = renderHook(() => useDeviceToken())
    expect(result.current.deviceToken).toBe('existing-token')
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
  })

  it('returns same token on re-render', () => {
    const { result, rerender } = renderHook(() => useDeviceToken())
    const first = result.current.deviceToken
    rerender()
    expect(result.current.deviceToken).toBe(first)
  })
})

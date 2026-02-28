import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWakeLock } from '../hooks/useWakeLock.js'

// ── Mock wake lock sentinel ────────────────────────────────────────────

function createMockSentinel() {
  const listeners: Record<string, (() => void)[]> = {}
  return {
    released: false,
    addEventListener: vi.fn((event: string, cb: () => void) => {
      listeners[event] = listeners[event] ?? []
      listeners[event].push(cb)
    }),
    removeEventListener: vi.fn(),
    release: vi.fn(async function (this: { released: boolean }) {
      this.released = true
      listeners['release']?.forEach((cb) => cb())
    }),
    // Helper for tests to fire release
    _fireRelease() {
      listeners['release']?.forEach((cb) => cb())
    },
  }
}

describe('useWakeLock', () => {
  let mockSentinel: ReturnType<typeof createMockSentinel>
  let originalWakeLock: WakeLock | undefined

  beforeEach(() => {
    mockSentinel = createMockSentinel()
    originalWakeLock = navigator.wakeLock

    Object.defineProperty(navigator, 'wakeLock', {
      value: {
        request: vi.fn().mockResolvedValue(mockSentinel),
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    if (originalWakeLock !== undefined) {
      Object.defineProperty(navigator, 'wakeLock', {
        value: originalWakeLock,
        writable: true,
        configurable: true,
      })
    } else {
      // Remove it if it wasn't there originally
      Object.defineProperty(navigator, 'wakeLock', {
        value: undefined,
        writable: true,
        configurable: true,
      })
    }
    vi.restoreAllMocks()
  })

  it('reports isSupported=true when API is available', async () => {
    const { result } = renderHook(() => useWakeLock())

    // Let the async acquisition settle
    await act(async () => {})

    expect(result.current.isSupported).toBe(true)
  })

  it('acquires a wake lock on mount', async () => {
    const { result } = renderHook(() => useWakeLock())

    await act(async () => {})

    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen')
    expect(result.current.isActive).toBe(true)
  })

  it('releases wake lock on unmount', async () => {
    const { unmount } = renderHook(() => useWakeLock())

    await act(async () => {})
    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen')

    unmount()
    expect(mockSentinel.release).toHaveBeenCalled()
  })

  it('sets isActive=false when sentinel fires release event', async () => {
    const { result } = renderHook(() => useWakeLock())

    await act(async () => {})
    expect(result.current.isActive).toBe(true)

    act(() => {
      mockSentinel._fireRelease()
    })
    expect(result.current.isActive).toBe(false)
  })

  it('re-acquires wake lock on visibilitychange to visible', async () => {
    renderHook(() => useWakeLock())

    await act(async () => {})
    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1)

    // Simulate visibility change
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    })

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2)
  })

  it('handles request failure gracefully', async () => {
    ;(navigator.wakeLock.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Not allowed'),
    )

    const { result } = renderHook(() => useWakeLock())

    await act(async () => {})

    expect(result.current.isActive).toBe(false)
    expect(result.current.isSupported).toBe(true)
  })
})

describe('useWakeLock (unsupported browser)', () => {
  let hadWakeLock: boolean
  let originalDescriptor: PropertyDescriptor | undefined

  beforeEach(() => {
    originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'wakeLock')
    hadWakeLock = 'wakeLock' in navigator
    // Fully remove the property so `'wakeLock' in navigator` returns false
    if (hadWakeLock) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (navigator as any).wakeLock
    }
  })

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'wakeLock', originalDescriptor)
    }
  })

  it('reports isSupported=false when API is missing', () => {
    const { result } = renderHook(() => useWakeLock())

    expect(result.current.isSupported).toBe(false)
    expect(result.current.isActive).toBe(false)
  })
})

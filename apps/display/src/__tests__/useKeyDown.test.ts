import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyDown } from '../hooks/useKeyDown.js'
import { useKeyUp } from '../hooks/useKeyUp.js'

// Helper to fire native keyboard events on window
function fireKeyDown(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

function fireKeyUp(key: string) {
  window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }))
}

// ── useKeyDown ──────────────────────────────────────────────────────────

describe('useKeyDown', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls the mapped callback on keydown', () => {
    const handler = vi.fn()
    renderHook(() => useKeyDown({ Enter: handler }))

    fireKeyDown('Enter')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('ignores keys not in the map', () => {
    const handler = vi.fn()
    renderHook(() => useKeyDown({ Enter: handler }))

    fireKeyDown('Escape')
    expect(handler).not.toHaveBeenCalled()
  })

  it('handles multiple keys', () => {
    const up = vi.fn()
    const down = vi.fn()
    renderHook(() => useKeyDown({ ArrowUp: up, ArrowDown: down }))

    fireKeyDown('ArrowUp')
    fireKeyDown('ArrowDown')
    expect(up).toHaveBeenCalledOnce()
    expect(down).toHaveBeenCalledOnce()
  })

  it('removes listener on unmount', () => {
    const handler = vi.fn()
    const { unmount } = renderHook(() => useKeyDown({ Enter: handler }))

    unmount()
    fireKeyDown('Enter')
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not attach listener when enabled=false', () => {
    const handler = vi.fn()
    renderHook(() => useKeyDown({ Enter: handler }, false))

    fireKeyDown('Enter')
    expect(handler).not.toHaveBeenCalled()
  })

  it('attaches listener when enabled changes to true', () => {
    const handler = vi.fn()
    const { rerender } = renderHook(
      ({ enabled }) => useKeyDown({ Enter: handler }, enabled),
      { initialProps: { enabled: false } },
    )

    fireKeyDown('Enter')
    expect(handler).not.toHaveBeenCalled()

    rerender({ enabled: true })
    fireKeyDown('Enter')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('removes listener when enabled changes to false', () => {
    const handler = vi.fn()
    const { rerender } = renderHook(
      ({ enabled }) => useKeyDown({ Enter: handler }, enabled),
      { initialProps: { enabled: true } },
    )

    fireKeyDown('Enter')
    expect(handler).toHaveBeenCalledOnce()

    rerender({ enabled: false })
    fireKeyDown('Enter')
    // Still only called once from before
    expect(handler).toHaveBeenCalledOnce()
  })

  it('uses latest callback without re-attaching listener', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(
      ({ cb }) => useKeyDown({ Enter: cb }),
      { initialProps: { cb: first } },
    )

    rerender({ cb: second })
    fireKeyDown('Enter')

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })
})

// ── useKeyUp ────────────────────────────────────────────────────────────

describe('useKeyUp', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls the mapped callback on keyup', () => {
    const handler = vi.fn()
    renderHook(() => useKeyUp({ Enter: handler }))

    fireKeyUp('Enter')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('ignores keys not in the map', () => {
    const handler = vi.fn()
    renderHook(() => useKeyUp({ Enter: handler }))

    fireKeyUp('Escape')
    expect(handler).not.toHaveBeenCalled()
  })

  it('removes listener on unmount', () => {
    const handler = vi.fn()
    const { unmount } = renderHook(() => useKeyUp({ Enter: handler }))

    unmount()
    fireKeyUp('Enter')
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not attach listener when enabled=false', () => {
    const handler = vi.fn()
    renderHook(() => useKeyUp({ Enter: handler }, false))

    fireKeyUp('Enter')
    expect(handler).not.toHaveBeenCalled()
  })

  it('uses latest callback without re-attaching listener', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(
      ({ cb }) => useKeyUp({ Enter: cb }),
      { initialProps: { cb: first } },
    )

    rerender({ cb: second })
    fireKeyUp('Enter')

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })
})

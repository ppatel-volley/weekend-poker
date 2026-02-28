import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDPadNavigation } from '../hooks/useDPadNavigation.js'

function makeKeyEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true })
}

describe('useDPadNavigation', () => {
  // ── List mode (columns=1) ──────────────────────────────────────────

  it('starts with focusIndex 0', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 5 }),
    )
    expect(result.current.focusIndex).toBe(0)
  })

  it('ArrowDown moves focus forward', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 5 }),
    )

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    expect(result.current.focusIndex).toBe(1)

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    expect(result.current.focusIndex).toBe(2)
  })

  it('ArrowUp moves focus backward', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 5 }),
    )

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    expect(result.current.focusIndex).toBe(2)

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowUp')))
    expect(result.current.focusIndex).toBe(1)
  })

  it('ArrowRight moves focus forward in list mode', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 5 }),
    )

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowRight')))
    expect(result.current.focusIndex).toBe(1)
  })

  it('ArrowLeft moves focus backward in list mode', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 5 }),
    )

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowRight')))
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowRight')))
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowLeft')))
    expect(result.current.focusIndex).toBe(1)
  })

  it('clamps at lower boundary without wrap', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 5 }),
    )

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowUp')))
    expect(result.current.focusIndex).toBe(0)
  })

  it('clamps at upper boundary without wrap', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 3 }),
    )

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    expect(result.current.focusIndex).toBe(2)
  })

  // ── Wrapping ───────────────────────────────────────────────────────

  it('wraps forward past the end', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 3, wrap: true }),
    )

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    expect(result.current.focusIndex).toBe(0)
  })

  it('wraps backward past the start', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 3, wrap: true }),
    )

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowUp')))
    expect(result.current.focusIndex).toBe(2)
  })

  // ── Enter / onSelect ──────────────────────────────────────────────

  it('Enter calls onSelect with current focusIndex', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 5, onSelect }),
    )

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    act(() => result.current.handleKeyDown(makeKeyEvent('Enter')))

    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('Enter with no onSelect does not throw', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 5 }),
    )

    expect(() => {
      act(() => result.current.handleKeyDown(makeKeyEvent('Enter')))
    }).not.toThrow()
  })

  // ── Escape ────────────────────────────────────────────────────────

  it('Escape resets focusIndex to 0', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 5 }),
    )

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    expect(result.current.focusIndex).toBe(2)

    act(() => result.current.handleKeyDown(makeKeyEvent('Escape')))
    expect(result.current.focusIndex).toBe(0)
  })

  // ── Grid mode ─────────────────────────────────────────────────────

  it('ArrowDown jumps by column count in grid mode', () => {
    // 9 items in a 3-column grid:
    // [0] [1] [2]
    // [3] [4] [5]
    // [6] [7] [8]
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 9, columns: 3 }),
    )

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    expect(result.current.focusIndex).toBe(3)

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    expect(result.current.focusIndex).toBe(6)
  })

  it('ArrowUp jumps by column count in grid mode', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 9, columns: 3 }),
    )

    // Move to row 2
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    expect(result.current.focusIndex).toBe(6)

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowUp')))
    expect(result.current.focusIndex).toBe(3)
  })

  it('ArrowRight/Left move by 1 in grid mode', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 9, columns: 3 }),
    )

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowRight')))
    expect(result.current.focusIndex).toBe(1)

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowRight')))
    expect(result.current.focusIndex).toBe(2)

    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowLeft')))
    expect(result.current.focusIndex).toBe(1)
  })

  it('grid mode clamps at boundaries without wrap', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 9, columns: 3 }),
    )

    // At row 3, try going further down
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    expect(result.current.focusIndex).toBe(8) // clamped
  })

  // ── setFocusIndex ─────────────────────────────────────────────────

  it('setFocusIndex manually sets the focus', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 5 }),
    )

    act(() => result.current.setFocusIndex(3))
    expect(result.current.focusIndex).toBe(3)
  })

  // ── Zero items ────────────────────────────────────────────────────

  it('handles zero items gracefully', () => {
    const { result } = renderHook(() =>
      useDPadNavigation({ itemCount: 0 }),
    )

    expect(result.current.focusIndex).toBe(0)
    expect(() => {
      act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown')))
    }).not.toThrow()
  })
})

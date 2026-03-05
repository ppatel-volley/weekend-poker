import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLastResult } from '../hooks/useLastResult.js'

describe('useLastResult', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not show initially', () => {
    const { result } = renderHook(() => useLastResult('BJ_PLACE_BETS', 0))
    expect(result.current.isShowing).toBe(false)
    expect(result.current.result).toBeNull()
  })

  it('shows win result when phase transitions from settlement to betting', () => {
    const { result, rerender } = renderHook(
      ({ phase, roundResult }) => useLastResult(phase, roundResult),
      { initialProps: { phase: 'BJ_SETTLEMENT', roundResult: 50 } },
    )

    // Transition to betting phase
    rerender({ phase: 'BJ_PLACE_BETS', roundResult: 50 })

    expect(result.current.isShowing).toBe(true)
    expect(result.current.result).toEqual({
      amount: 50,
      surrendered: false,
      label: 'WON $50',
      outcome: 'win',
    })
  })

  it('shows loss result', () => {
    const { result, rerender } = renderHook(
      ({ phase, roundResult }) => useLastResult(phase, roundResult),
      { initialProps: { phase: 'BJ_SETTLEMENT', roundResult: -25 } },
    )

    rerender({ phase: 'BJ_PLACE_BETS', roundResult: -25 })

    expect(result.current.isShowing).toBe(true)
    expect(result.current.result?.label).toBe('LOST $25')
    expect(result.current.result?.outcome).toBe('loss')
  })

  it('shows push result', () => {
    const { result, rerender } = renderHook(
      ({ phase, roundResult }) => useLastResult(phase, roundResult),
      { initialProps: { phase: 'BJ_SETTLEMENT', roundResult: 0 } },
    )

    rerender({ phase: 'BJ_PLACE_BETS', roundResult: 0 })

    expect(result.current.isShowing).toBe(true)
    expect(result.current.result?.label).toBe('PUSH')
    expect(result.current.result?.outcome).toBe('push')
  })

  it('shows surrendered result', () => {
    const { result, rerender } = renderHook(
      ({ phase, roundResult, surrendered }) => useLastResult(phase, roundResult, surrendered),
      { initialProps: { phase: 'BJ_SETTLEMENT', roundResult: 0, surrendered: true } },
    )

    rerender({ phase: 'BJ_PLACE_BETS', roundResult: 0, surrendered: true })

    expect(result.current.isShowing).toBe(true)
    expect(result.current.result?.label).toBe('SURRENDERED')
    expect(result.current.result?.outcome).toBe('loss')
  })

  it('auto-dismisses after 5 seconds', () => {
    const { result, rerender } = renderHook(
      ({ phase, roundResult }) => useLastResult(phase, roundResult),
      { initialProps: { phase: 'BJ_SETTLEMENT', roundResult: 100 } },
    )

    rerender({ phase: 'BJ_PLACE_BETS', roundResult: 100 })
    expect(result.current.isShowing).toBe(true)

    act(() => { vi.advanceTimersByTime(5_000) })
    expect(result.current.isShowing).toBe(false)
  })

  it('can be dismissed manually', () => {
    const { result, rerender } = renderHook(
      ({ phase, roundResult }) => useLastResult(phase, roundResult),
      { initialProps: { phase: 'BJ_SETTLEMENT', roundResult: 100 } },
    )

    rerender({ phase: 'BJ_PLACE_BETS', roundResult: 100 })
    expect(result.current.isShowing).toBe(true)

    act(() => { result.current.dismiss() })
    expect(result.current.isShowing).toBe(false)
  })

  it('works with BJC phase names (HAND_COMPLETE to PLACE_BETS)', () => {
    const { result, rerender } = renderHook(
      ({ phase, roundResult }) => useLastResult(phase, roundResult),
      { initialProps: { phase: 'BJC_HAND_COMPLETE', roundResult: 200 } },
    )

    rerender({ phase: 'BJC_PLACE_BETS', roundResult: 200 })

    expect(result.current.isShowing).toBe(true)
    expect(result.current.result?.label).toBe('WON $200')
  })

  it('does not trigger on non-settlement transitions', () => {
    const { result, rerender } = renderHook(
      ({ phase, roundResult }) => useLastResult(phase, roundResult),
      { initialProps: { phase: 'BJ_PLACE_BETS', roundResult: 0 } },
    )

    rerender({ phase: 'BJ_DEAL_INITIAL', roundResult: 0 })
    expect(result.current.isShowing).toBe(false)
  })
})

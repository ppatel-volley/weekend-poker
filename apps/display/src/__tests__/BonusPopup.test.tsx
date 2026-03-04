import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { BonusPopup } from '../components/hud/BonusPopup.js'

describe('BonusPopup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with correct content', () => {
    const onDismiss = vi.fn()
    render(
      <BonusPopup amount={500} streakDay={3} multiplierApplied={false} onDismiss={onDismiss} />,
    )

    expect(screen.getByTestId('bonus-popup')).toBeDefined()
    expect(screen.getByText('Daily Bonus!')).toBeDefined()
    expect(screen.getByText(/500/)).toBeDefined()
    expect(screen.getByText('Day 3 streak')).toBeDefined()
  })

  it('shows multiplier badge when multiplierApplied is true', () => {
    render(
      <BonusPopup amount={1000} streakDay={8} multiplierApplied={true} onDismiss={vi.fn()} />,
    )

    expect(screen.getByTestId('multiplier-badge')).toBeDefined()
    expect(screen.getByText('Streak Multiplier')).toBeDefined()
  })

  it('does not show multiplier badge when multiplierApplied is false', () => {
    render(
      <BonusPopup amount={200} streakDay={1} multiplierApplied={false} onDismiss={vi.fn()} />,
    )

    expect(screen.queryByTestId('multiplier-badge')).toBeNull()
  })

  it('auto-dismisses after 5 seconds', () => {
    const onDismiss = vi.fn()
    render(
      <BonusPopup amount={500} streakDay={2} multiplierApplied={false} onDismiss={onDismiss} />,
    )

    expect(onDismiss).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not dismiss before 5 seconds', () => {
    const onDismiss = vi.fn()
    render(
      <BonusPopup amount={500} streakDay={2} multiplierApplied={false} onDismiss={onDismiss} />,
    )

    act(() => {
      vi.advanceTimersByTime(4999)
    })
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('formats large chip amounts with locale string', () => {
    render(
      <BonusPopup amount={10000} streakDay={5} multiplierApplied={true} onDismiss={vi.fn()} />,
    )

    expect(screen.getByText(/10,000/)).toBeDefined()
  })
})

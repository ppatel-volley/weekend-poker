import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultToast } from '../components/shared/ResultToast.js'
import type { LastResultState } from '../hooks/useLastResult.js'

function makeState(overrides: Partial<LastResultState> = {}): LastResultState {
  return {
    isShowing: true,
    result: {
      amount: 50,
      surrendered: false,
      label: 'WON $50',
      outcome: 'win',
    },
    dismiss: vi.fn(),
    ...overrides,
  }
}

describe('ResultToast', () => {
  it('renders when isShowing is true', () => {
    render(<ResultToast lastResult={makeState()} />)
    expect(screen.getByTestId('result-toast')).toBeDefined()
    expect(screen.getByText('WON $50')).toBeDefined()
  })

  it('does not render when isShowing is false', () => {
    render(<ResultToast lastResult={makeState({ isShowing: false })} />)
    expect(screen.queryByTestId('result-toast')).toBeNull()
  })

  it('does not render when result is null', () => {
    render(<ResultToast lastResult={makeState({ result: null })} />)
    expect(screen.queryByTestId('result-toast')).toBeNull()
  })

  it('calls dismiss on click', () => {
    const dismiss = vi.fn()
    render(<ResultToast lastResult={makeState({ dismiss })} />)
    fireEvent.click(screen.getByTestId('result-toast'))
    expect(dismiss).toHaveBeenCalledOnce()
  })

  it('shows loss with red styling', () => {
    render(<ResultToast lastResult={makeState({
      result: { amount: -100, surrendered: false, label: 'LOST $100', outcome: 'loss' },
    })} />)
    const el = screen.getByTestId('result-toast')
    expect(el.textContent).toContain('LOST $100')
  })

  it('shows push with amber styling', () => {
    render(<ResultToast lastResult={makeState({
      result: { amount: 0, surrendered: false, label: 'PUSH', outcome: 'push' },
    })} />)
    expect(screen.getByText('PUSH')).toBeDefined()
  })
})

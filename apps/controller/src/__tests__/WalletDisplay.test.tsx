import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WalletDisplay } from '../components/shared/WalletDisplay.js'

const mockState = vi.fn<() => Record<string, unknown> | null>()

vi.mock('../hooks/useVGFHooks.js', () => ({
  useSessionMemberSafe: () => ({ sessionMemberId: 'player-1' }),
  useStateSync: () => mockState(),
}))

vi.mock('@weekend-casino/shared', () => ({
  getWalletBalance: (wallet: Record<string, number>, playerId: string) =>
    wallet[playerId] ?? 0,
}))

describe('WalletDisplay', () => {
  it('renders wallet balance from state', () => {
    mockState.mockReturnValue({
      wallet: { 'player-1': 7500 },
    })

    render(<WalletDisplay />)
    expect(screen.getByTestId('wallet-display')).toBeDefined()
    expect(screen.getByText('7,500')).toBeDefined()
  })

  it('renders 0 when wallet is missing', () => {
    mockState.mockReturnValue(null)

    render(<WalletDisplay />)
    expect(screen.getByText('0')).toBeDefined()
  })

  it('renders 0 when player not in wallet', () => {
    mockState.mockReturnValue({
      wallet: { 'other-player': 5000 },
    })

    render(<WalletDisplay />)
    expect(screen.getByText('0')).toBeDefined()
  })

  it('formats large balances with locale separators', () => {
    mockState.mockReturnValue({
      wallet: { 'player-1': 125000 },
    })

    render(<WalletDisplay />)
    expect(screen.getByText('125,000')).toBeDefined()
  })
})

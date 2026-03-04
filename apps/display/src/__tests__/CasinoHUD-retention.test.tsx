import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ─── Mocks ────────────────────────────────────────────────────────

// Mock state values controlled per-test
let mockState: Record<string, unknown> = {}

vi.mock('../hooks/useVGFHooks.js', () => ({
  useCurrentGame: vi.fn(() => mockState._currentGame ?? 'holdem'),
  useStateSyncSelector: vi.fn((selector: (s: any) => unknown) => selector(mockState)),
  usePhase: vi.fn(() => 'POSTING_BLINDS'),
}))

vi.mock('../hooks/useSessionId.js', () => ({
  useSessionId: vi.fn(() => 'test-session'),
}))

vi.mock('../platform/InputModeProvider.js', () => ({
  useInputMode: vi.fn(() => ({ inputMode: 'touch' })),
}))

vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  useFocusable: vi.fn(() => ({ ref: { current: null }, focused: false })),
}))

vi.mock('qrcode.react', () => ({
  QRCodeSVG: vi.fn(() => null),
}))

// ─── Tests ────────────────────────────────────────────────────────

describe('CasinoHUD — Retention Features', () => {
  beforeEach(() => {
    mockState = {
      _currentGame: 'holdem',
      selectedGame: 'holdem',
      wallet: { p1: 5000, p2: 3000 },
      players: [
        { id: 'p1', name: 'Alice', isBot: false, playerLevel: 5 },
        { id: 'p2', name: 'Bob', isBot: false, playerLevel: undefined },
      ],
      dealerMessage: null,
      gameNight: undefined,
      challengeSummary: undefined,
      lastDailyBonus: undefined,
    }
  })

  describe('Player Level Badges', () => {
    it('shows level badge for players with playerLevel', async () => {
      const { CasinoHUD } = await import('../components/hud/CasinoHUD.js')
      render(<CasinoHUD />)

      const badge = screen.getByTestId('level-badge-p1')
      expect(badge).toBeDefined()
      expect(badge.textContent).toBe('Lv.5')
    })

    it('does not show level badge when playerLevel is undefined', async () => {
      const { CasinoHUD } = await import('../components/hud/CasinoHUD.js')
      render(<CasinoHUD />)

      expect(screen.queryByTestId('level-badge-p2')).toBeNull()
    })

    it('shows level badges for all levelled players', async () => {
      mockState.players = [
        { id: 'p1', name: 'Alice', isBot: false, playerLevel: 3 },
        { id: 'p2', name: 'Bob', isBot: false, playerLevel: 7 },
      ]

      const { CasinoHUD } = await import('../components/hud/CasinoHUD.js')
      render(<CasinoHUD />)

      expect(screen.getByTestId('level-badge-p1').textContent).toBe('Lv.3')
      expect(screen.getByTestId('level-badge-p2').textContent).toBe('Lv.7')
    })
  })

  describe('Challenge Progress Indicators', () => {
    it('does not show indicators when no challengeSummary', async () => {
      const { CasinoHUD } = await import('../components/hud/CasinoHUD.js')
      render(<CasinoHUD />)

      expect(screen.queryByTestId('challenge-indicators')).toBeNull()
    })

    it('shows challenge dots when challengeSummary has data', async () => {
      mockState.challengeSummary = {
        p1: [
          { challengeId: 'c1', title: 'Win 3', tier: 'bronze', currentValue: 3, targetValue: 3, completed: true, claimed: false },
          { challengeId: 'c2', title: 'Win 10', tier: 'silver', currentValue: 5, targetValue: 10, completed: false, claimed: false },
          { challengeId: 'c3', title: 'Win 25', tier: 'gold', currentValue: 0, targetValue: 25, completed: false, claimed: false },
        ],
      }

      const { CasinoHUD } = await import('../components/hud/CasinoHUD.js')
      render(<CasinoHUD />)

      expect(screen.getByTestId('challenge-indicators')).toBeDefined()
      expect(screen.getByTestId('challenge-dot-bronze')).toBeDefined()
      expect(screen.getByTestId('challenge-dot-silver')).toBeDefined()
      expect(screen.getByTestId('challenge-dot-gold')).toBeDefined()
    })

    it('renders filled dot for completed challenge and hollow for in-progress', async () => {
      mockState.challengeSummary = {
        p1: [
          { challengeId: 'c1', title: 'Win 3', tier: 'bronze', currentValue: 3, targetValue: 3, completed: true, claimed: false },
          { challengeId: 'c2', title: 'Win 10', tier: 'silver', currentValue: 5, targetValue: 10, completed: false, claimed: false },
        ],
      }

      const { CasinoHUD } = await import('../components/hud/CasinoHUD.js')
      render(<CasinoHUD />)

      const bronzeDot = screen.getByTestId('challenge-dot-bronze')
      const silverDot = screen.getByTestId('challenge-dot-silver')

      // Completed bronze should have filled background (browser normalises hex to rgb)
      expect(bronzeDot.style.background).toBe('rgb(205, 127, 50)')
      // In-progress silver should have transparent background
      expect(silverDot.style.background).toBe('transparent')
    })
  })

  describe('Daily Bonus Popup Integration', () => {
    it('does not show popup when no lastDailyBonus', async () => {
      const { CasinoHUD } = await import('../components/hud/CasinoHUD.js')
      render(<CasinoHUD />)

      expect(screen.queryByTestId('bonus-popup')).toBeNull()
    })

    it('shows popup when lastDailyBonus appears in state', async () => {
      mockState.lastDailyBonus = {
        amount: 500,
        streakDay: 3,
        multiplierApplied: false,
        timestamp: Date.now(),
      }

      const { CasinoHUD } = await import('../components/hud/CasinoHUD.js')
      render(<CasinoHUD />)

      expect(screen.getByTestId('bonus-popup')).toBeDefined()
      expect(screen.getByText('Daily Bonus!')).toBeDefined()
      expect(screen.getByText(/500/)).toBeDefined()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock useProfile
const mockProfile = vi.fn()
const mockRefetch = vi.fn()

vi.mock('../hooks/useProfile.js', () => ({
  useProfile: () => mockProfile(),
}))

vi.mock('../hooks/useDeviceToken.js', () => ({
  useDeviceToken: () => ({ deviceToken: 'test-token' }),
}))

vi.mock('@weekend-casino/shared', () => ({
  PLAYER_LEVEL_XP_THRESHOLDS: [0, 500, 1500, 3000, 5000, 8000, 12000, 17000, 23000, 30000],
  DAILY_BONUS_SCHEDULE: [500, 750, 1000, 1500, 2000, 3000, 5000],
}))

import { ProfileView } from '../components/ProfileView.js'

describe('ProfileView', () => {
  beforeEach(() => {
    mockProfile.mockReset()
    mockRefetch.mockReset()
  })

  it('shows loading state', () => {
    mockProfile.mockReturnValue({ profile: null, loading: true, error: null, refetch: mockRefetch })
    render(<ProfileView />)
    expect(screen.getByText('Loading profile...')).toBeDefined()
  })

  it('shows error state', () => {
    mockProfile.mockReturnValue({ profile: null, loading: false, error: 'Network error', refetch: mockRefetch })
    render(<ProfileView />)
    expect(screen.getByText('Network error')).toBeDefined()
  })

  it('renders profile data', () => {
    mockProfile.mockReturnValue({
      profile: {
        identity: {
          deviceToken: 'test-token',
          persistentId: 'p-1',
          displayName: 'TestPlayer',
          lastLoginAt: '2026-03-03T00:00:00Z',
          identitySource: 'device_token',
          createdAt: '2026-03-01T00:00:00Z',
        },
        stats: {
          totalGamesPlayed: 42,
          totalHandsPlayed: 200,
          totalHandsWon: 80,
          totalChipsWon: 50000,
          totalChipsLost: 30000,
          byGameType: {},
          bestWinStreak: 7,
          currentWinStreak: 3,
          totalSessions: 10,
          gameNightWins: 2,
          challengesCompleted: 5,
        },
        level: 3,
        xp: 1800,
        dailyBonus: {
          currentStreak: 4,
          lastClaimDate: '2026-03-02',
          totalClaimed: 3750,
        },
        achievements: [],
        cosmetics: { ownedIds: [], equipped: { cardBack: null, tableFelt: null, avatarFrame: null } },
      },
      loading: false,
      error: null,
      refetch: mockRefetch,
    })

    render(<ProfileView />)
    expect(screen.getByText('TestPlayer')).toBeDefined()
    expect(screen.getByText('Level 3')).toBeDefined()
    expect(screen.getByText('42')).toBeDefined()
    expect(screen.getByText('80')).toBeDefined()
    expect(screen.getByText('40.0%')).toBeDefined()
    expect(screen.getByText('7')).toBeDefined()
    expect(screen.getByText(/Streak: 4 days/)).toBeDefined()
  })

  it('renders no profile state', () => {
    mockProfile.mockReturnValue({ profile: null, loading: false, error: null, refetch: mockRefetch })
    render(<ProfileView />)
    expect(screen.getByText('No profile found.')).toBeDefined()
  })
})

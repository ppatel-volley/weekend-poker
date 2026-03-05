import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { ChallengesView } from '../components/ChallengesView.js'

const mockChallenges = [
  {
    definition: {
      id: 'ch_1',
      title: 'Win 3 Hands',
      description: 'Win 3 hands of any game',
      tier: 'bronze' as const,
      targetValue: 3,
      rewardChips: 500,
      requiredGame: null,
      unlocksAchievement: null,
    },
    currentValue: 2,
    completed: false,
    claimed: false,
    assignedAt: '2026-03-03T00:00:00Z',
    completedAt: null,
  },
  {
    definition: {
      id: 'ch_2',
      title: 'Play 10 Rounds',
      description: 'Play 10 rounds of roulette',
      tier: 'silver' as const,
      targetValue: 10,
      rewardChips: 1500,
      requiredGame: 'roulette',
      unlocksAchievement: null,
    },
    currentValue: 10,
    completed: true,
    claimed: false,
    assignedAt: '2026-03-03T00:00:00Z',
    completedAt: '2026-03-03T02:00:00Z',
  },
  {
    definition: {
      id: 'ch_3',
      title: 'Win Streak 5',
      description: 'Achieve a 5-hand win streak',
      tier: 'gold' as const,
      targetValue: 5,
      rewardChips: 5000,
      requiredGame: null,
      unlocksAchievement: 'win_streak_5',
    },
    currentValue: 1,
    completed: false,
    claimed: false,
    assignedAt: '2026-03-03T00:00:00Z',
    completedAt: null,
  },
]

describe('ChallengesView', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // Never resolves
    render(<ChallengesView />)
    expect(screen.getByText('Loading challenges...')).toBeDefined()
  })

  it('renders challenge cards after fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockChallenges,
    })

    render(<ChallengesView />)

    // Wait for async fetch
    expect(await screen.findByText('Win 3 Hands')).toBeDefined()
    expect(screen.getByText('Play 10 Rounds')).toBeDefined()
    expect(screen.getByText('Win Streak 5')).toBeDefined()
  })

  it('shows Claim button for completed unclaimed challenges', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockChallenges,
    })

    render(<ChallengesView />)

    expect(await screen.findByText('Claim')).toBeDefined()
  })

  it('shows progress values', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockChallenges,
    })

    render(<ChallengesView />)

    expect(await screen.findByText('2 / 3')).toBeDefined()
    expect(screen.getByText('10 / 10')).toBeDefined()
    expect(screen.getByText('1 / 5')).toBeDefined()
  })

  it('shows error state on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    render(<ChallengesView />)

    expect(await screen.findByText('Failed to load challenges (500)')).toBeDefined()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../hooks/useDeviceToken.js', () => ({
  useDeviceToken: () => ({ deviceToken: 'test-token' }),
}))

vi.mock('@weekend-casino/shared', () => ({
  COSMETIC_DEFINITIONS: [
    { id: 'cb_classic_red', name: 'Classic Red', category: 'card_back', unlockedBy: 'first_hand_holdem', previewKey: 'card_back_classic_red' },
    { id: 'cb_midnight_blue', name: 'Midnight Blue', category: 'card_back', unlockedBy: 'first_hand_blackjack', previewKey: 'card_back_midnight_blue' },
    { id: 'tf_emerald', name: 'Emerald', category: 'table_felt', unlockedBy: 'first_hand_roulette', previewKey: 'table_felt_emerald' },
    { id: 'af_bronze', name: 'Bronze Ring', category: 'avatar_frame', unlockedBy: 'first_hand_any', previewKey: 'avatar_frame_bronze' },
  ],
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { CosmeticsView } from '../components/CosmeticsView.js'

const mockOwned = {
  ownedIds: ['cb_classic_red'],
  equipped: { cardBack: 'cb_classic_red', tableFelt: null, avatarFrame: null },
}

describe('CosmeticsView', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<CosmeticsView />)
    expect(screen.getByText('Loading cosmetics...')).toBeDefined()
  })

  it('renders cosmetic items after fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOwned,
    })

    render(<CosmeticsView />)

    // Default tab is card_back
    expect(await screen.findByText('Classic Red')).toBeDefined()
    expect(screen.getByText('Midnight Blue')).toBeDefined()
  })

  it('shows Equipped badge for equipped items', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOwned,
    })

    render(<CosmeticsView />)
    expect(await screen.findByText('Equipped')).toBeDefined()
  })

  it('shows lock text for unowned items', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOwned,
    })

    render(<CosmeticsView />)
    // Midnight Blue is not owned — shows unlock requirement
    expect(await screen.findByText('first hand blackjack')).toBeDefined()
  })

  it('switches category tabs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOwned,
    })

    render(<CosmeticsView />)
    await screen.findByText('Classic Red') // Wait for load

    fireEvent.click(screen.getByText('Table Felts'))
    expect(screen.getByText('Emerald')).toBeDefined()

    fireEvent.click(screen.getByText('Avatar Frames'))
    expect(screen.getByText('Bronze Ring')).toBeDefined()
  })

  it('shows error state on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })

    render(<CosmeticsView />)
    expect(await screen.findByText('Failed to load cosmetics (404)')).toBeDefined()
  })
})

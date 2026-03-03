import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GameRouter } from '../components/GameRouter.js'

// Mock VGF hooks
const mockPhase = vi.fn<() => string | null>()
const mockState = vi.fn<() => Record<string, unknown> | null>()

vi.mock('../hooks/useVGFHooks.js', () => ({
  usePhase: () => mockPhase(),
  useStateSync: () => mockState(),
  useSessionMember: () => ({ sessionMemberId: 'p1', displayName: 'Test', isReady: false }),
  useSessionMemberSafe: () => ({ sessionMemberId: 'p1', displayName: 'Test', isReady: false }),
  useClientActions: () => ({ toggleReady: vi.fn(), updateState: vi.fn() }),
  useDispatch: () => vi.fn(),
  useDispatchThunk: () => vi.fn(),
  useStateSyncSelector: () => null,
}))

// Mock private hole cards hook (cards delivered via targeted events, not broadcast state)
vi.mock('../hooks/usePrivateHoleCards.js', () => ({
  usePrivateHoleCards: () => undefined,
}))

// Mock Deepgram SDK (used by useVoice -> VoiceButton in some game layouts)
vi.mock('@deepgram/sdk', () => ({
  createClient: vi.fn(),
  LiveTranscriptionEvents: {
    Open: 'open',
    Close: 'close',
    Error: 'error',
    Transcript: 'Results',
  },
}))

// Mock shared exports
vi.mock('@weekend-casino/shared', () => ({
  CasinoPhase: {
    Lobby: 'LOBBY',
    GameSelect: 'GAME_SELECT',
    PostingBlinds: 'POSTING_BLINDS',
    PreFlopBetting: 'PRE_FLOP_BETTING',
    DrawBetting1: 'DRAW_BETTING_1',
    BjPlayerTurns: 'BJ_PLAYER_TURNS',
    BjcPlayerTurns: 'BJC_PLAYER_TURNS',
    TcpPlaceBets: 'TCP_PLACE_BETS',
  },
  PokerPhase: {
    Lobby: 'LOBBY',
    PreFlopBetting: 'PRE_FLOP_BETTING',
  },
  BETTING_PHASES: ['PRE_FLOP_BETTING', 'DRAW_BETTING_1'],
  CASINO_GAME_LABELS: {
    holdem: 'Texas Hold\'em',
    five_card_draw: '5-Card Draw',
    blackjack_classic: 'Blackjack',
    blackjack_competitive: 'Competitive Blackjack',
  },
  CASINO_GAME_DESCRIPTIONS: {
    holdem: 'Classic poker — 2 cards + 5 community',
    five_card_draw: 'Draw poker — swap up to 3 cards',
    blackjack_classic: 'Beat the dealer to 21',
    blackjack_competitive: 'Beat your friends to 21',
  },
  V1_GAMES: ['holdem', 'five_card_draw', 'blackjack_classic', 'blackjack_competitive'],
  V2_0_GAMES: ['roulette', 'three_card_poker'],
  getWalletBalance: () => 10000,
  getPhaseLabel: (phase: string) => {
    const labels: Record<string, string> = {
      PRE_FLOP_BETTING: 'Pre-Flop',
      DRAW_BETTING_1: 'First Bet',
      LOBBY: 'Lobby',
      GAME_SELECT: 'Game Select',
    }
    return labels[phase] ?? phase
  },
}))

describe('GameRouter', () => {
  beforeEach(() => {
    mockPhase.mockReset()
    mockState.mockReset()
  })

  it('shows connecting message when phase is null', () => {
    mockPhase.mockReturnValue(null)
    mockState.mockReturnValue(null)

    render(<GameRouter />)
    expect(screen.getByText('Connecting to game...')).toBeDefined()
  })

  it('renders LobbyController for LOBBY phase', () => {
    mockPhase.mockReturnValue('LOBBY')
    mockState.mockReturnValue(null)

    render(<GameRouter />)
    expect(screen.getByAltText('Weekend Casino')).toBeDefined()
  })

  it('renders LobbyController for GAME_SELECT phase', () => {
    mockPhase.mockReturnValue('GAME_SELECT')
    mockState.mockReturnValue(null)

    render(<GameRouter />)
    expect(screen.getByAltText('Weekend Casino')).toBeDefined()
  })

  it('renders HoldemController for Hold\'em gameplay phase', () => {
    mockPhase.mockReturnValue('PRE_FLOP_BETTING')
    mockState.mockReturnValue({ selectedGame: 'holdem', players: [], holeCards: {} })

    render(<GameRouter />)
    // HoldemController renders ControllerGameplay which shows translated phase label
    expect(screen.getByText('Pre-Flop')).toBeDefined()
  })

  it('renders FiveCardDrawController for Draw phase', () => {
    mockPhase.mockReturnValue('DRAW_BETTING_1')
    mockState.mockReturnValue({ selectedGame: 'five_card_draw' })

    render(<GameRouter />)
    expect(screen.getByText('5-Card Draw')).toBeDefined()
  })

  it('renders BlackjackController for BJ phase', () => {
    mockPhase.mockReturnValue('BJ_PLAYER_TURNS')
    mockState.mockReturnValue({ selectedGame: 'blackjack_classic' })

    render(<GameRouter />)
    expect(screen.getByText('Blackjack')).toBeDefined()
  })

  it('renders ThreeCardPokerController for TCP phase', () => {
    mockPhase.mockReturnValue('TCP_PLACE_BETS')
    mockState.mockReturnValue({ selectedGame: 'three_card_poker' })

    render(<GameRouter />)
    expect(screen.getByText('Three Card Poker')).toBeDefined()
  })

  it('derives game from phase when selectedGame is null', () => {
    mockPhase.mockReturnValue('DRAW_BETTING_1')
    mockState.mockReturnValue({ selectedGame: null })

    render(<GameRouter />)
    expect(screen.getByText('5-Card Draw')).toBeDefined()
  })

  it('derives blackjack competitive from BJC_ prefix', () => {
    mockPhase.mockReturnValue('BJC_PLAYER_TURNS')
    mockState.mockReturnValue({ selectedGame: null })

    render(<GameRouter />)
    expect(screen.getByText('Blackjack Arena')).toBeDefined()
  })

  it('shows loading for unknown game', () => {
    mockPhase.mockReturnValue('CRAPS_NEW_SHOOTER')
    mockState.mockReturnValue({ selectedGame: 'craps' })

    render(<GameRouter />)
    expect(screen.getByText('Game loading...')).toBeDefined()
  })
})

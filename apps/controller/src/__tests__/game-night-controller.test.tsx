import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GameNightSetupController } from '../components/games/GameNightSetupController.js'
import { GameNightLeaderboardController } from '../components/games/GameNightLeaderboardController.js'
import { GameNightChampionController } from '../components/games/GameNightChampionController.js'
import { GameRouter } from '../components/GameRouter.js'
import { LobbyController } from '../components/games/LobbyController.js'

// ── Mocks ──────────────────────────────────────────────────────

const mockPhase = vi.fn<() => string | null>()
const mockState = vi.fn<() => Record<string, unknown> | null>()
const mockDispatch = vi.fn()

vi.mock('../hooks/useVGFHooks.js', () => ({
  usePhase: () => mockPhase(),
  useStateSync: () => mockState(),
  useSessionMember: () => ({ sessionMemberId: 'p1', displayName: 'Host', isReady: false }),
  useSessionMemberSafe: () => ({ sessionMemberId: 'p1', displayName: 'Host', isReady: false }),
  useClientActions: () => ({ toggleReady: vi.fn(), updateState: vi.fn() }),
  useDispatch: () => mockDispatch,
  useDispatchThunk: () => vi.fn(),
  useStateSyncSelector: () => null,
}))

vi.mock('../hooks/usePrivateHoleCards.js', () => ({
  usePrivateHoleCards: () => undefined,
}))

vi.mock('@deepgram/sdk', () => ({
  createClient: vi.fn(),
  LiveTranscriptionEvents: {
    Open: 'open',
    Close: 'close',
    Error: 'error',
    Transcript: 'Results',
  },
}))

vi.mock('@weekend-casino/shared', () => ({
  CasinoPhase: {
    Lobby: 'LOBBY',
    GameSelect: 'GAME_SELECT',
    GnSetup: 'GN_SETUP',
    GnLeaderboard: 'GN_LEADERBOARD',
    GnChampion: 'GN_CHAMPION',
    PostingBlinds: 'POSTING_BLINDS',
  },
  CASINO_GAME_LABELS: {
    holdem: "Texas Hold'em",
    five_card_draw: '5-Card Draw',
    blackjack_classic: 'Blackjack',
    blackjack_competitive: 'Competitive Blackjack',
    roulette: 'Roulette',
    three_card_poker: 'Three Card Poker',
    craps: 'Craps',
  },
  CASINO_GAME_DESCRIPTIONS: {
    holdem: 'Classic poker',
    five_card_draw: 'Draw poker',
    blackjack_classic: 'Beat the dealer',
    blackjack_competitive: 'Beat your friends',
    roulette: 'Spin the wheel',
    three_card_poker: 'Fast poker',
    craps: 'Roll the dice',
  },
  V1_GAMES: ['holdem', 'five_card_draw', 'blackjack_classic', 'blackjack_competitive'],
  V2_0_GAMES: ['roulette', 'three_card_poker'],
  V2_1_GAMES: ['craps'],
  GN_MIN_GAMES: 3,
  GN_MAX_GAMES: 5,
  GN_DEFAULT_ROUNDS_PER_GAME: 5,
  GN_THEMES: ['classic', 'neon', 'high_roller', 'tropical'],
  GN_DEFAULT_THEME: 'classic',
  getWalletBalance: () => 10000,
  getPhaseLabel: (phase: string) => phase,
  BETTING_PHASES: [],
}))

// ── Helpers ────────────────────────────────────────────────────

const makeHostState = (overrides: Record<string, unknown> = {}) => ({
  players: [{ id: 'p1', isHost: true }],
  selectedGame: null,
  ...overrides,
})

const makeNonHostState = (overrides: Record<string, unknown> = {}) => ({
  players: [{ id: 'p2', isHost: true }],
  selectedGame: null,
  ...overrides,
})

// ── GameNightSetupController ───────────────────────────────────

describe('GameNightSetupController', () => {
  beforeEach(() => {
    mockPhase.mockReset()
    mockState.mockReset()
    mockDispatch.mockReset()
  })

  it('renders GAME NIGHT heading for host', () => {
    mockState.mockReturnValue(makeHostState())

    render(<GameNightSetupController />)
    expect(screen.getByText('GAME NIGHT')).toBeDefined()
  })

  it('renders game selection buttons', () => {
    mockState.mockReturnValue(makeHostState())

    render(<GameNightSetupController />)
    expect(screen.getByText("Texas Hold'em")).toBeDefined()
    expect(screen.getByText('Roulette')).toBeDefined()
    expect(screen.getByText('5-Card Draw')).toBeDefined()
  })

  it('shows waiting message for non-host', () => {
    mockState.mockReturnValue(makeNonHostState())

    render(<GameNightSetupController />)
    expect(screen.getByText('Waiting for host...')).toBeDefined()
  })

  it('shows theme buttons for host', () => {
    mockState.mockReturnValue(makeHostState())

    render(<GameNightSetupController />)
    expect(screen.getByText('Classic')).toBeDefined()
    expect(screen.getByText('Neon')).toBeDefined()
    expect(screen.getByText('High Roller')).toBeDefined()
    expect(screen.getByText('Tropical')).toBeDefined()
  })

  it('shows rounds per game selector', () => {
    mockState.mockReturnValue(makeHostState())

    render(<GameNightSetupController />)
    expect(screen.getByTestId('gn-rounds-value').textContent).toBe('5')
  })

  it('increments rounds per game', () => {
    mockState.mockReturnValue(makeHostState())

    render(<GameNightSetupController />)
    fireEvent.click(screen.getByTestId('gn-rounds-plus'))
    expect(screen.getByTestId('gn-rounds-value').textContent).toBe('6')
  })

  it('decrements rounds per game', () => {
    mockState.mockReturnValue(makeHostState())

    render(<GameNightSetupController />)
    fireEvent.click(screen.getByTestId('gn-rounds-minus'))
    expect(screen.getByTestId('gn-rounds-value').textContent).toBe('4')
  })

  it('does not decrement below 3', () => {
    mockState.mockReturnValue(makeHostState())

    render(<GameNightSetupController />)
    // Click minus 3 times from default of 5 -> 4 -> 3 -> 3
    fireEvent.click(screen.getByTestId('gn-rounds-minus'))
    fireEvent.click(screen.getByTestId('gn-rounds-minus'))
    fireEvent.click(screen.getByTestId('gn-rounds-minus'))
    expect(screen.getByTestId('gn-rounds-value').textContent).toBe('3')
  })

  it('dispatches gnInitGameNight and gnConfirmSetup on start', () => {
    mockState.mockReturnValue(makeHostState())

    render(<GameNightSetupController />)

    // Select 3 games
    fireEvent.click(screen.getByTestId('gn-game-holdem'))
    fireEvent.click(screen.getByTestId('gn-game-roulette'))
    fireEvent.click(screen.getByTestId('gn-game-blackjack_classic'))

    fireEvent.click(screen.getByTestId('gn-start-button'))

    expect(mockDispatch).toHaveBeenCalledWith(
      'gnInitGameNight',
      ['holdem', 'roulette', 'blackjack_classic'],
      5,
      'classic',
    )
    expect(mockDispatch).toHaveBeenCalledWith('gnConfirmSetup')
  })

  it('disables start button when fewer than 3 games selected', () => {
    mockState.mockReturnValue(makeHostState())

    render(<GameNightSetupController />)

    const startBtn = screen.getByTestId('gn-start-button')
    expect(startBtn.getAttribute('disabled')).toBe('')
  })
})

// ── GameNightLeaderboardController ─────────────────────────────

describe('GameNightLeaderboardController', () => {
  beforeEach(() => {
    mockState.mockReset()
  })

  it('renders LEADERBOARD heading', () => {
    mockState.mockReturnValue({
      gameNight: {
        playerScores: {},
        gameLineup: [],
        currentGameIndex: 0,
        gameResults: [],
      },
    })

    render(<GameNightLeaderboardController />)
    expect(screen.getByText('LEADERBOARD')).toBeDefined()
  })

  it('renders ranked players', () => {
    mockState.mockReturnValue({
      gameNight: {
        playerScores: {
          p1: { playerId: 'p1', playerName: 'Alice', totalScore: 200, gamesPlayed: 2 },
          p2: { playerId: 'p2', playerName: 'Bob', totalScore: 150, gamesPlayed: 2 },
        },
        gameLineup: ['holdem', 'roulette', 'blackjack_classic'],
        currentGameIndex: 1,
        gameResults: [],
      },
    })

    render(<GameNightLeaderboardController />)
    expect(screen.getByText('Alice')).toBeDefined()
    expect(screen.getByText('Bob')).toBeDefined()
    expect(screen.getByTestId('gn-rank-1')).toBeDefined()
    expect(screen.getByTestId('gn-rank-2')).toBeDefined()
  })

  it('shows next game indicator', () => {
    mockState.mockReturnValue({
      gameNight: {
        playerScores: {},
        gameLineup: ['holdem', 'roulette', 'blackjack_classic'],
        currentGameIndex: 0,
        gameResults: [],
      },
    })

    render(<GameNightLeaderboardController />)
    expect(screen.getByTestId('gn-next-game')).toBeDefined()
    expect(screen.getByText('Roulette')).toBeDefined()
  })

  it('shows final standings when no next game', () => {
    mockState.mockReturnValue({
      gameNight: {
        playerScores: {},
        gameLineup: ['holdem'],
        currentGameIndex: 0,
        gameResults: [],
      },
    })

    render(<GameNightLeaderboardController />)
    expect(screen.getByText('Final standings')).toBeDefined()
  })

  it('shows no scores message when empty', () => {
    mockState.mockReturnValue({
      gameNight: {
        playerScores: {},
        gameLineup: [],
        currentGameIndex: 0,
        gameResults: [],
      },
    })

    render(<GameNightLeaderboardController />)
    expect(screen.getByText('No scores yet')).toBeDefined()
  })
})

// ── GameNightChampionController ────────────────────────────────

describe('GameNightChampionController', () => {
  beforeEach(() => {
    mockState.mockReset()
  })

  it('renders CHAMPION heading', () => {
    mockState.mockReturnValue({
      gameNight: {
        championId: null,
        playerScores: {},
      },
    })

    render(<GameNightChampionController />)
    expect(screen.getByTestId('gn-champion-title').textContent).toBe('CHAMPION')
  })

  it('renders champion name and score', () => {
    mockState.mockReturnValue({
      gameNight: {
        championId: 'p1',
        playerScores: {
          p1: { playerId: 'p1', playerName: 'Alice', totalScore: 500, gamesPlayed: 3 },
        },
        gameResults: [{}, {}, {}],
      },
    })

    render(<GameNightChampionController />)
    expect(screen.getByTestId('gn-champion-name').textContent).toBe('Alice')
    expect(screen.getByTestId('gn-champion-score').textContent).toBe('500 points')
  })

  it('shows calculating message when no champion yet', () => {
    mockState.mockReturnValue({
      gameNight: {
        championId: null,
        playerScores: {},
      },
    })

    render(<GameNightChampionController />)
    expect(screen.getByText('Calculating winner...')).toBeDefined()
  })

  it('renders return to lobby button', () => {
    mockState.mockReturnValue({
      gameNight: {
        championId: null,
        playerScores: {},
      },
    })

    render(<GameNightChampionController />)
    expect(screen.getByTestId('gn-return-lobby')).toBeDefined()
    expect(screen.getByText('RETURN TO LOBBY')).toBeDefined()
  })
})

// ── GameRouter GN Phase Routing ────────────────────────────────

describe('GameRouter - Game Night phases', () => {
  beforeEach(() => {
    mockPhase.mockReset()
    mockState.mockReset()
  })

  it('routes GN_SETUP to GameNightSetupController', () => {
    mockPhase.mockReturnValue('GN_SETUP')
    mockState.mockReturnValue(makeHostState())

    render(<GameRouter />)
    expect(screen.getByText('GAME NIGHT')).toBeDefined()
  })

  it('routes GN_LEADERBOARD to GameNightLeaderboardController', () => {
    mockPhase.mockReturnValue('GN_LEADERBOARD')
    mockState.mockReturnValue({
      gameNight: {
        playerScores: {},
        gameLineup: [],
        currentGameIndex: 0,
        gameResults: [],
      },
    })

    render(<GameRouter />)
    expect(screen.getByText('LEADERBOARD')).toBeDefined()
  })

  it('routes GN_CHAMPION to GameNightChampionController', () => {
    mockPhase.mockReturnValue('GN_CHAMPION')
    mockState.mockReturnValue({
      gameNight: {
        championId: null,
        playerScores: {},
      },
    })

    render(<GameRouter />)
    expect(screen.getByTestId('gn-champion-title')).toBeDefined()
  })
})

// ── LobbyController Game Night Button ──────────────────────────

describe('LobbyController - Game Night button', () => {
  beforeEach(() => {
    mockPhase.mockReset()
    mockState.mockReset()
    mockDispatch.mockReset()
  })

  it('renders GAME NIGHT button', () => {
    mockPhase.mockReturnValue('LOBBY')
    mockState.mockReturnValue({ selectedGame: null })

    render(<LobbyController />)
    expect(screen.getByTestId('game-night-button')).toBeDefined()
    expect(screen.getByText('GAME NIGHT')).toBeDefined()
  })

  it('dispatches gnInitGameNight on click', () => {
    mockPhase.mockReturnValue('LOBBY')
    mockState.mockReturnValue({ selectedGame: null })

    render(<LobbyController />)
    fireEvent.click(screen.getByTestId('game-night-button'))

    expect(mockDispatch).toHaveBeenCalledWith(
      'gnInitGameNight',
      [],
      5,
      'classic',
    )
  })
})

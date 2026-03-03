import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CrapsController } from '../components/games/CrapsController.js'
import { GameRouter } from '../components/GameRouter.js'

const mockPhase = vi.fn<() => string | null>()
const mockState = vi.fn<() => Record<string, unknown> | null>()
const mockDispatch = vi.fn()

vi.mock('../hooks/useVGFHooks.js', () => ({
  usePhase: () => mockPhase(),
  useStateSync: () => mockState(),
  useSessionMember: () => ({ sessionMemberId: 'p1', displayName: 'Test', isReady: false }),
  useSessionMemberSafe: () => ({ sessionMemberId: 'p1', displayName: 'Test', isReady: false }),
  useClientActions: () => ({ toggleReady: vi.fn(), updateState: vi.fn() }),
  useDispatch: () => mockDispatch,
  useDispatchThunk: () => vi.fn(),
  useStateSyncSelector: () => null,
}))

// Mock private hole cards hook
vi.mock('../hooks/usePrivateHoleCards.js', () => ({
  usePrivateHoleCards: () => undefined,
}))

// Mock Deepgram SDK
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
    CrapsNewShooter: 'CRAPS_NEW_SHOOTER',
    CrapsComeOutBetting: 'CRAPS_COME_OUT_BETTING',
    CrapsComeOutRoll: 'CRAPS_COME_OUT_ROLL',
    CrapsComeOutResolution: 'CRAPS_COME_OUT_RESOLUTION',
    CrapsPointBetting: 'CRAPS_POINT_BETTING',
    CrapsPointRoll: 'CRAPS_POINT_ROLL',
    CrapsPointResolution: 'CRAPS_POINT_RESOLUTION',
    CrapsRoundComplete: 'CRAPS_ROUND_COMPLETE',
    GnSetup: 'GN_SETUP',
    GnLeaderboard: 'GN_LEADERBOARD',
    GnChampion: 'GN_CHAMPION',
  },
  CASINO_GAME_LABELS: {
    holdem: "Texas Hold'em",
    five_card_draw: '5-Card Draw',
    blackjack_classic: 'Blackjack',
    blackjack_competitive: 'Competitive Blackjack',
    craps: 'Craps',
  },
  CASINO_GAME_DESCRIPTIONS: {
    holdem: 'Classic poker',
    five_card_draw: 'Draw poker',
    blackjack_classic: 'Beat the dealer',
    blackjack_competitive: 'Beat your friends',
    craps: 'Dice game',
  },
  V1_GAMES: ['holdem', 'five_card_draw', 'blackjack_classic', 'blackjack_competitive'],
  V2_0_GAMES: ['roulette', 'three_card_poker'],
  CRAPS_PLACE_NUMBERS: [4, 5, 6, 8, 9, 10],
  CRAPS_MIN_BET: 10,
  CRAPS_MAX_BET: 500,
  getWalletBalance: () => 10000,
  getPhaseLabel: (phase: string) => phase,
  BETTING_PHASES: [],
}))

const makeCrapsState = (overrides: Record<string, unknown> = {}) => ({
  shooterPlayerId: 'p1',
  shooterIndex: 0,
  point: null,
  puckOn: false,
  lastRollDie1: 0,
  lastRollDie2: 0,
  lastRollTotal: 0,
  rollHistory: [],
  bets: [],
  comeBets: [],
  players: [{ playerId: 'p1', totalAtRisk: 0, betsConfirmed: false, roundResult: 0 }],
  sevenOut: false,
  pointHit: false,
  newShooterReady: false,
  allComeOutBetsPlaced: false,
  rollComplete: false,
  comeOutResolutionComplete: false,
  allPointBetsPlaced: false,
  pointResolutionComplete: false,
  roundCompleteReady: false,
  roundNumber: 1,
  config: { minBet: 10, maxBet: 500, maxOddsMultiplier: 3, placeBetsWorkOnComeOut: false, simpleMode: true },
  ...overrides,
})

describe('CrapsController', () => {
  beforeEach(() => {
    mockPhase.mockReset()
    mockState.mockReset()
    mockDispatch.mockReset()
  })

  it('renders without crashing', () => {
    mockPhase.mockReturnValue('CRAPS_NEW_SHOOTER')
    mockState.mockReturnValue({ craps: makeCrapsState(), wallet: { p1: 10000 } })

    render(<CrapsController />)
    expect(screen.getByText('CRAPS')).toBeDefined()
  })

  it('shows waiting message when craps state is null', () => {
    mockPhase.mockReturnValue('CRAPS_NEW_SHOOTER')
    mockState.mockReturnValue({ craps: undefined, wallet: { p1: 10000 } })

    render(<CrapsController />)
    expect(screen.getByText('Waiting for round to start...')).toBeDefined()
  })

  describe('New Shooter phase', () => {
    it('shows shooter banner when player is shooter', () => {
      mockPhase.mockReturnValue('CRAPS_NEW_SHOOTER')
      mockState.mockReturnValue({ craps: makeCrapsState({ shooterPlayerId: 'p1' }), wallet: { p1: 10000 } })

      render(<CrapsController />)
      expect(screen.getByText("YOU'RE THE SHOOTER!")).toBeDefined()
    })

    it('shows new shooter message when player is not shooter', () => {
      mockPhase.mockReturnValue('CRAPS_NEW_SHOOTER')
      mockState.mockReturnValue({ craps: makeCrapsState({ shooterPlayerId: 'p2' }), wallet: { p1: 10000 } })

      render(<CrapsController />)
      expect(screen.getByText('NEW SHOOTER')).toBeDefined()
    })
  })

  describe('Come-out betting phase', () => {
    it('shows pass line and dont pass buttons', () => {
      mockPhase.mockReturnValue('CRAPS_COME_OUT_BETTING')
      mockState.mockReturnValue({ craps: makeCrapsState(), wallet: { p1: 10000 } })

      render(<CrapsController />)
      expect(screen.getByTestId('pass-line-btn')).toBeDefined()
      expect(screen.getByTestId('dont-pass-btn')).toBeDefined()
    })

    it('shows field bet button', () => {
      mockPhase.mockReturnValue('CRAPS_COME_OUT_BETTING')
      mockState.mockReturnValue({ craps: makeCrapsState(), wallet: { p1: 10000 } })

      render(<CrapsController />)
      expect(screen.getByTestId('field-btn')).toBeDefined()
    })

    it('shows confirm bets button', () => {
      mockPhase.mockReturnValue('CRAPS_COME_OUT_BETTING')
      mockState.mockReturnValue({ craps: makeCrapsState(), wallet: { p1: 10000 } })

      render(<CrapsController />)
      expect(screen.getByTestId('confirm-bets-btn')).toBeDefined()
    })

    it('dispatches crapsValidateAndPlaceBet on pass line click', () => {
      mockPhase.mockReturnValue('CRAPS_COME_OUT_BETTING')
      mockState.mockReturnValue({ craps: makeCrapsState(), wallet: { p1: 10000 } })

      render(<CrapsController />)
      fireEvent.click(screen.getByTestId('pass-line-btn'))
      expect(mockDispatch).toHaveBeenCalledWith('crapsValidateAndPlaceBet', 'p1', 'pass_line', 10)
    })

    it('dispatches crapsValidateAndPlaceBet on dont pass click', () => {
      mockPhase.mockReturnValue('CRAPS_COME_OUT_BETTING')
      mockState.mockReturnValue({ craps: makeCrapsState(), wallet: { p1: 10000 } })

      render(<CrapsController />)
      fireEvent.click(screen.getByTestId('dont-pass-btn'))
      expect(mockDispatch).toHaveBeenCalledWith('crapsValidateAndPlaceBet', 'p1', 'dont_pass', 10)
    })

    it('dispatches crapsConfirmBets on confirm click', () => {
      mockPhase.mockReturnValue('CRAPS_COME_OUT_BETTING')
      mockState.mockReturnValue({ craps: makeCrapsState(), wallet: { p1: 10000 } })

      render(<CrapsController />)
      fireEvent.click(screen.getByTestId('confirm-bets-btn'))
      expect(mockDispatch).toHaveBeenCalledWith('crapsConfirmBets', 'p1')
    })

    it('shows come out roll header', () => {
      mockPhase.mockReturnValue('CRAPS_COME_OUT_BETTING')
      mockState.mockReturnValue({ craps: makeCrapsState(), wallet: { p1: 10000 } })

      render(<CrapsController />)
      expect(screen.getByText('COME OUT ROLL')).toBeDefined()
    })

    it('shows chip selector buttons', () => {
      mockPhase.mockReturnValue('CRAPS_COME_OUT_BETTING')
      mockState.mockReturnValue({ craps: makeCrapsState(), wallet: { p1: 10000 } })

      render(<CrapsController />)
      expect(screen.getByTestId('chip-10')).toBeDefined()
      expect(screen.getByTestId('chip-25')).toBeDefined()
      expect(screen.getByTestId('chip-50')).toBeDefined()
      expect(screen.getByTestId('chip-100')).toBeDefined()
    })

    it('changes chip value on chip button click', () => {
      mockPhase.mockReturnValue('CRAPS_COME_OUT_BETTING')
      mockState.mockReturnValue({ craps: makeCrapsState(), wallet: { p1: 10000 } })

      render(<CrapsController />)
      fireEvent.click(screen.getByTestId('chip-50'))
      fireEvent.click(screen.getByTestId('pass-line-btn'))
      expect(mockDispatch).toHaveBeenCalledWith('crapsValidateAndPlaceBet', 'p1', 'pass_line', 50)
    })
  })

  describe('Roll phase', () => {
    it('shows ROLL button for shooter during come-out roll', () => {
      mockPhase.mockReturnValue('CRAPS_COME_OUT_ROLL')
      mockState.mockReturnValue({ craps: makeCrapsState({ shooterPlayerId: 'p1' }), wallet: { p1: 10000 } })

      render(<CrapsController />)
      expect(screen.getByTestId('roll-btn')).toBeDefined()
    })

    it('shows ROLL button for shooter during point roll', () => {
      mockPhase.mockReturnValue('CRAPS_POINT_ROLL')
      mockState.mockReturnValue({ craps: makeCrapsState({ shooterPlayerId: 'p1', puckOn: true, point: 8 }), wallet: { p1: 10000 } })

      render(<CrapsController />)
      expect(screen.getByTestId('roll-btn')).toBeDefined()
    })

    it('shows waiting message for non-shooter', () => {
      mockPhase.mockReturnValue('CRAPS_COME_OUT_ROLL')
      mockState.mockReturnValue({ craps: makeCrapsState({ shooterPlayerId: 'p2' }), wallet: { p1: 10000 } })

      render(<CrapsController />)
      expect(screen.getByTestId('waiting-for-roll')).toBeDefined()
    })

    it('dispatches crapsSetRollComplete on ROLL click', () => {
      mockPhase.mockReturnValue('CRAPS_COME_OUT_ROLL')
      mockState.mockReturnValue({ craps: makeCrapsState({ shooterPlayerId: 'p1' }), wallet: { p1: 10000 } })

      render(<CrapsController />)
      fireEvent.click(screen.getByTestId('roll-btn'))
      expect(mockDispatch).toHaveBeenCalledWith('crapsSetRollComplete', true)
    })

    it('shows point number during point roll phase', () => {
      mockPhase.mockReturnValue('CRAPS_POINT_ROLL')
      mockState.mockReturnValue({ craps: makeCrapsState({ shooterPlayerId: 'p1', puckOn: true, point: 6 }), wallet: { p1: 10000 } })

      render(<CrapsController />)
      expect(screen.getByText('POINT IS 6')).toBeDefined()
    })
  })

  describe('Resolution phase', () => {
    it('shows dice result during come-out resolution', () => {
      mockPhase.mockReturnValue('CRAPS_COME_OUT_RESOLUTION')
      mockState.mockReturnValue({
        craps: makeCrapsState({
          lastRollDie1: 3,
          lastRollDie2: 4,
          lastRollTotal: 7,
        }),
        wallet: { p1: 10000 },
      })

      render(<CrapsController />)
      expect(screen.getByTestId('dice-total')).toBeDefined()
      expect(screen.getByText('= 7')).toBeDefined()
    })

    it('shows SEVEN OUT outcome during point resolution', () => {
      mockPhase.mockReturnValue('CRAPS_POINT_RESOLUTION')
      mockState.mockReturnValue({
        craps: makeCrapsState({
          lastRollDie1: 3,
          lastRollDie2: 4,
          lastRollTotal: 7,
          puckOn: true,
          point: 8,
          sevenOut: true,
        }),
        wallet: { p1: 10000 },
      })

      render(<CrapsController />)
      expect(screen.getByTestId('outcome-text')).toBeDefined()
      expect(screen.getByText('SEVEN OUT!')).toBeDefined()
    })

    it('shows POINT HIT outcome', () => {
      mockPhase.mockReturnValue('CRAPS_POINT_RESOLUTION')
      mockState.mockReturnValue({
        craps: makeCrapsState({
          lastRollDie1: 4,
          lastRollDie2: 4,
          lastRollTotal: 8,
          puckOn: true,
          point: 8,
          pointHit: true,
        }),
        wallet: { p1: 10000 },
      })

      render(<CrapsController />)
      expect(screen.getByText('POINT HIT!')).toBeDefined()
    })
  })

  describe('Point betting phase', () => {
    it('shows point number prominently', () => {
      mockPhase.mockReturnValue('CRAPS_POINT_BETTING')
      mockState.mockReturnValue({
        craps: makeCrapsState({ point: 8, puckOn: true }),
        wallet: { p1: 10000 },
      })

      render(<CrapsController />)
      expect(screen.getByText('POINT IS')).toBeDefined()
      // Point number appears in header + place bet grid; confirm header exists
      expect(screen.getAllByText('8').length).toBeGreaterThanOrEqual(1)
    })

    it('shows come and dont come buttons', () => {
      mockPhase.mockReturnValue('CRAPS_POINT_BETTING')
      mockState.mockReturnValue({
        craps: makeCrapsState({ point: 8, puckOn: true }),
        wallet: { p1: 10000 },
      })

      render(<CrapsController />)
      expect(screen.getByTestId('come-btn')).toBeDefined()
      expect(screen.getByTestId('dont-come-btn')).toBeDefined()
    })

    it('shows place bet buttons for valid numbers', () => {
      mockPhase.mockReturnValue('CRAPS_POINT_BETTING')
      mockState.mockReturnValue({
        craps: makeCrapsState({ point: 8, puckOn: true }),
        wallet: { p1: 10000 },
      })

      render(<CrapsController />)
      expect(screen.getByTestId('place-4-btn')).toBeDefined()
      expect(screen.getByTestId('place-5-btn')).toBeDefined()
      expect(screen.getByTestId('place-6-btn')).toBeDefined()
      expect(screen.getByTestId('place-8-btn')).toBeDefined()
      expect(screen.getByTestId('place-9-btn')).toBeDefined()
      expect(screen.getByTestId('place-10-btn')).toBeDefined()
    })

    it('shows add odds button when player has pass line bet', () => {
      mockPhase.mockReturnValue('CRAPS_POINT_BETTING')
      mockState.mockReturnValue({
        craps: makeCrapsState({
          point: 8,
          puckOn: true,
          bets: [{ id: 'b1', playerId: 'p1', type: 'pass_line', amount: 10, working: true, status: 'active', payout: 0 }],
        }),
        wallet: { p1: 10000 },
      })

      render(<CrapsController />)
      expect(screen.getByTestId('add-odds-btn')).toBeDefined()
    })
  })

  describe('Round complete phase', () => {
    it('shows round complete message', () => {
      mockPhase.mockReturnValue('CRAPS_ROUND_COMPLETE')
      mockState.mockReturnValue({ craps: makeCrapsState(), wallet: { p1: 10000 } })

      render(<CrapsController />)
      expect(screen.getByText('ROUND COMPLETE')).toBeDefined()
    })

    it('shows new shooter message on seven out', () => {
      mockPhase.mockReturnValue('CRAPS_ROUND_COMPLETE')
      mockState.mockReturnValue({ craps: makeCrapsState({ sevenOut: true }), wallet: { p1: 10000 } })

      render(<CrapsController />)
      expect(screen.getByText('New shooter coming up...')).toBeDefined()
    })
  })
})

describe('GameRouter craps routing', () => {
  beforeEach(() => {
    mockPhase.mockReset()
    mockState.mockReset()
  })

  it('routes CRAPS_ phases to CrapsController', () => {
    mockPhase.mockReturnValue('CRAPS_NEW_SHOOTER')
    mockState.mockReturnValue({ selectedGame: 'craps', craps: makeCrapsState(), wallet: { p1: 10000 } })

    render(<GameRouter />)
    expect(screen.getByText('CRAPS')).toBeDefined()
  })

  it('derives craps from CRAPS_ phase prefix when selectedGame is null', () => {
    mockPhase.mockReturnValue('CRAPS_COME_OUT_BETTING')
    mockState.mockReturnValue({ selectedGame: null, craps: makeCrapsState(), wallet: { p1: 10000 } })

    render(<GameRouter />)
    expect(screen.getByText('CRAPS')).toBeDefined()
  })
})

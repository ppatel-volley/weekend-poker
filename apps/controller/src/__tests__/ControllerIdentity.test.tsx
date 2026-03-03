import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * Regression tests for controller identity binding.
 *
 * Bug: Controllers used `players[0]?.id` to determine the current player,
 * meaning player 2/3/4 would see player 1's state and dispatch as player 1.
 *
 * Fix: Use `useSessionMember().sessionMemberId` from VGF to get the real
 * session member identity, matching the pattern in ControllerGameplay.
 */

// ── Mock control ────────────────────────────────────────────────────────────

let mockSessionMemberId = 'player-2'
const mockDispatchThunk = vi.fn()
const mockPhase = vi.fn<() => string | null>()
const mockState = vi.fn<() => Record<string, unknown> | null>()

vi.mock('../hooks/useVGFHooks.js', () => ({
  usePhase: () => mockPhase(),
  useStateSync: () => mockState(),
  useSessionMember: () => ({
    sessionMemberId: mockSessionMemberId,
    displayName: 'Player Two',
    isReady: true,
    state: { name: 'Player Two' },
  }),
  useSessionMemberSafe: () => ({
    sessionMemberId: mockSessionMemberId,
    displayName: 'Player Two',
    isReady: true,
    state: { name: 'Player Two' },
  }),
  useClientActions: () => ({ toggleReady: vi.fn(), updateState: vi.fn() }),
  useDispatch: () => vi.fn(),
  useDispatchThunk: () => mockDispatchThunk,
  useStateSyncSelector: () => null,
}))

vi.mock('@deepgram/sdk', () => ({
  createClient: vi.fn(),
  LiveTranscriptionEvents: {
    Open: 'open', Close: 'close', Error: 'error', Transcript: 'Results',
  },
}))

vi.mock('@weekend-casino/shared', () => ({
  CasinoPhase: {},
  BETTING_PHASES: [],
  getPhaseLabel: (p: string) => p,
  CASINO_GAME_LABELS: {},
  CASINO_GAME_DESCRIPTIONS: {},
  V1_GAMES: [],
}))

// ── Imports (after mocks) ───────────────────────────────────────────────────

import { BlackjackController } from '../components/games/BlackjackController.js'
import { CompetitiveBlackjackController } from '../components/games/CompetitiveBlackjackController.js'
import { ThreeCardPokerController } from '../components/games/ThreeCardPokerController.js'
import { RouletteController } from '../components/games/RouletteController.js'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeHand(overrides = {}) {
  return {
    cards: [],
    stood: false,
    busted: false,
    isBlackjack: false,
    doubled: false,
    bet: 25,
    value: 15,
    isSoft: false,
    ...overrides,
  }
}

function makeDealerHand(overrides = {}) {
  return {
    cards: [{ rank: 'K', suit: 'spades' }],
    holeCardRevealed: false,
    value: 10,
    isSoft: false,
    busted: false,
    isBlackjack: false,
    ...overrides,
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Controller identity binding', () => {
  beforeEach(() => {
    mockSessionMemberId = 'player-2'
    mockPhase.mockReset()
    mockState.mockReset()
    mockDispatchThunk.mockReset()
  })

  describe('BlackjackController', () => {
    const twoPlayerBjState = {
      players: [
        { id: 'player-1', name: 'Alice' },
        { id: 'player-2', name: 'Bob' },
      ],
      wallet: { 'player-1': 5000, 'player-2': 3000 },
      blackjack: {
        playerStates: [
          {
            playerId: 'player-1',
            hands: [makeHand({ bet: 100 })],
            activeHandIndex: 0,
            insuranceBet: 0,
            insuranceResolved: false,
            surrendered: false,
            totalPayout: 0,
            roundResult: 0,
          },
          {
            playerId: 'player-2',
            hands: [makeHand({ bet: 50 })],
            activeHandIndex: 0,
            insuranceBet: 0,
            insuranceResolved: false,
            surrendered: false,
            totalPayout: 0,
            roundResult: 0,
          },
        ],
        dealerHand: makeDealerHand(),
        turnOrder: ['player-1', 'player-2'],
        currentTurnIndex: 1,
        allBetsPlaced: true,
        dealComplete: true,
        insuranceComplete: true,
        playerTurnsComplete: false,
        dealerTurnComplete: false,
        settlementComplete: false,
        roundCompleteReady: false,
        roundNumber: 1,
        shoePenetration: 10,
        config: {
          minBet: 10,
          maxBet: 500,
          dealerHitsSoft17: false,
          numberOfDecks: 6,
          reshuffleThreshold: 0.75,
          blackjackPaysRatio: 1.5,
          insuranceEnabled: true,
          surrenderEnabled: true,
          splitEnabled: true,
          maxSplits: 3,
        },
      },
    }

    it('renders player 2 wallet balance, not player 1', () => {
      mockPhase.mockReturnValue('BJ_PLACE_BETS')
      // Player 2 has no bet yet so we see the bet placement view with balance
      const stateWithNoBet = structuredClone(twoPlayerBjState)
      stateWithNoBet.blackjack.playerStates[1]!.hands[0]!.bet = 0
      mockState.mockReturnValue(stateWithNoBet)

      render(<BlackjackController />)
      // Player 2 has $3000, Player 1 has $5000
      expect(screen.getByText(/Balance: \$3000/)).toBeDefined()
    })

    it('dispatches HIT with player 2 ID when player 2 clicks', () => {
      mockPhase.mockReturnValue('BJ_PLAYER_TURNS')
      mockState.mockReturnValue(twoPlayerBjState)

      render(<BlackjackController />)
      const hitButton = screen.getByText('HIT')
      fireEvent.click(hitButton)
      expect(mockDispatchThunk).toHaveBeenCalledWith('bjHit', 'player-2')
    })

    it('dispatches STAND with player 2 ID', () => {
      mockPhase.mockReturnValue('BJ_PLAYER_TURNS')
      mockState.mockReturnValue(twoPlayerBjState)

      render(<BlackjackController />)
      fireEvent.click(screen.getByText('STAND'))
      expect(mockDispatchThunk).toHaveBeenCalledWith('bjStand', 'player-2')
    })
  })

  describe('CompetitiveBlackjackController', () => {
    const twoPlayerBjcState = {
      players: [
        { id: 'player-1', name: 'Alice' },
        { id: 'player-2', name: 'Bob' },
      ],
      blackjackCompetitive: {
        playerStates: [
          {
            playerId: 'player-1',
            hand: makeHand({ bet: 50, value: 18 }),
            turnComplete: false,
          },
          {
            playerId: 'player-2',
            hand: makeHand({ bet: 50, value: 12 }),
            turnComplete: false,
          },
        ],
        pot: 100,
        turnOrder: ['player-1', 'player-2'],
        currentTurnIndex: 1,
        allAntesPlaced: true,
        dealComplete: true,
        playerTurnsComplete: false,
        showdownComplete: false,
        settlementComplete: false,
        roundCompleteReady: false,
        roundNumber: 1,
        shoePenetration: 10,
        anteAmount: 50,
        winnerIds: [],
        resultMessage: '',
      },
    }

    it('shows player 2 hand value (12), not player 1 (18)', () => {
      mockPhase.mockReturnValue('BJC_PLAYER_TURNS')
      mockState.mockReturnValue(twoPlayerBjcState)

      render(<CompetitiveBlackjackController />)
      // Player 2's hand value badge should show 12
      expect(screen.getByText('12')).toBeDefined()
    })

    it('dispatches bjcHit with player 2 ID', () => {
      mockPhase.mockReturnValue('BJC_PLAYER_TURNS')
      mockState.mockReturnValue(twoPlayerBjcState)

      render(<CompetitiveBlackjackController />)
      fireEvent.click(screen.getByText('HIT'))
      expect(mockDispatchThunk).toHaveBeenCalledWith('bjcHit', 'player-2')
    })

    it('dispatches bjcStand with player 2 ID', () => {
      mockPhase.mockReturnValue('BJC_PLAYER_TURNS')
      mockState.mockReturnValue(twoPlayerBjcState)

      render(<CompetitiveBlackjackController />)
      fireEvent.click(screen.getByText('STAND'))
      expect(mockDispatchThunk).toHaveBeenCalledWith('bjcStand', 'player-2')
    })
  })

  describe('ThreeCardPokerController', () => {
    const twoPlayerTcpState = {
      players: [
        { id: 'player-1', name: 'Alice' },
        { id: 'player-2', name: 'Bob' },
      ],
      wallet: { 'player-1': 5000, 'player-2': 2000 },
      threeCardPoker: {
        playerHands: [
          {
            playerId: 'player-1',
            cards: [
              { rank: 'A', suit: 'spades' },
              { rank: 'K', suit: 'hearts' },
              { rank: 'Q', suit: 'diamonds' },
            ],
            anteBet: 25,
            playBet: 0,
            pairPlusBet: 0,
            decision: 'undecided' as const,
            handRank: null,
            handStrength: 0,
            anteBonus: 0,
            pairPlusPayout: 0,
            totalPayout: 0,
            roundResult: 0,
          },
          {
            playerId: 'player-2',
            cards: [
              { rank: '2', suit: 'clubs' },
              { rank: '7', suit: 'hearts' },
              { rank: 'J', suit: 'spades' },
            ],
            anteBet: 50,
            playBet: 0,
            pairPlusBet: 0,
            decision: 'undecided' as const,
            handRank: null,
            handStrength: 0,
            anteBonus: 0,
            pairPlusPayout: 0,
            totalPayout: 0,
            roundResult: 0,
          },
        ],
        dealerHand: {
          cards: [],
          revealed: false,
          handRank: null,
          handStrength: 0,
        },
        dealerQualifies: null,
        allAntesPlaced: true,
        dealComplete: true,
        allDecisionsMade: false,
        dealerRevealed: false,
        payoutComplete: false,
        roundCompleteReady: false,
        roundNumber: 1,
        config: { minAnte: 10, maxAnte: 500, maxPairPlus: 100 },
      },
    }

    it('renders player 2 wallet balance ($2000), not player 1 ($5000)', () => {
      mockPhase.mockReturnValue('TCP_PLACE_BETS')
      // Player 2 has no ante yet so we see the bet placement view with balance
      const stateWithNoAnte = structuredClone(twoPlayerTcpState)
      stateWithNoAnte.threeCardPoker.playerHands[1]!.anteBet = 0
      mockState.mockReturnValue(stateWithNoAnte)

      render(<ThreeCardPokerController />)
      expect(screen.getByText(/Balance: \$2000/)).toBeDefined()
    })

    it('shows player 2 cards during decisions, not player 1', () => {
      mockPhase.mockReturnValue('TCP_PLAYER_DECISIONS')
      mockState.mockReturnValue(twoPlayerTcpState)

      render(<ThreeCardPokerController />)
      // Player 2's ante is $50, player 1's is $25
      expect(screen.getByText(/Ante: \$50/)).toBeDefined()
    })

    it('dispatches PLAY decision with player 2 ID', () => {
      mockPhase.mockReturnValue('TCP_PLAYER_DECISIONS')
      mockState.mockReturnValue(twoPlayerTcpState)

      render(<ThreeCardPokerController />)
      fireEvent.click(screen.getByText(/PLAY/))
      expect(mockDispatchThunk).toHaveBeenCalledWith(
        'tcpMakeDecision', 'player-2', 'play',
      )
    })

    it('dispatches FOLD decision with player 2 ID', () => {
      mockPhase.mockReturnValue('TCP_PLAYER_DECISIONS')
      mockState.mockReturnValue(twoPlayerTcpState)

      render(<ThreeCardPokerController />)
      fireEvent.click(screen.getByText('FOLD'))
      expect(mockDispatchThunk).toHaveBeenCalledWith(
        'tcpMakeDecision', 'player-2', 'fold',
      )
    })
  })

  describe('RouletteController', () => {
    const twoPlayerRouletteState = {
      players: [
        { id: 'player-1', name: 'Alice' },
        { id: 'player-2', name: 'Bob' },
      ],
      wallet: { 'player-1': 5000, 'player-2': 1500 },
      roulette: {
        winningNumber: null,
        winningColour: null,
        bets: [],
        players: [
          {
            playerId: 'player-1',
            totalBet: 100,
            totalPayout: 0,
            roundResult: 0,
            betsConfirmed: false,
            favouriteNumbers: [],
          },
          {
            playerId: 'player-2',
            totalBet: 0,
            totalPayout: 0,
            roundResult: 0,
            betsConfirmed: false,
            favouriteNumbers: [],
          },
        ],
        history: [],
        spinState: 'idle',
        nearMisses: [],
        allBetsPlaced: false,
        bettingClosed: false,
        spinComplete: false,
        resultAnnounced: false,
        payoutComplete: false,
        roundCompleteReady: false,
        roundNumber: 1,
        config: {
          minBet: 5,
          maxInsideBet: 100,
          maxOutsideBet: 500,
          maxTotalBet: 1000,
          laPartage: false,
        },
      },
    }

    it('renders player 2 wallet balance ($1500), not player 1 ($5000)', () => {
      mockPhase.mockReturnValue('ROULETTE_PLACE_BETS')
      mockState.mockReturnValue(twoPlayerRouletteState)

      render(<RouletteController />)
      expect(screen.getByText(/Balance: \$1500/)).toBeDefined()
    })

    it('dispatches RED bet with player 2 ID', () => {
      mockPhase.mockReturnValue('ROULETTE_PLACE_BETS')
      mockState.mockReturnValue(twoPlayerRouletteState)

      render(<RouletteController />)
      fireEvent.click(screen.getByText('RED'))
      expect(mockDispatchThunk).toHaveBeenCalledWith(
        'roulettePlaceBet', 'player-2', 'red', 5,
      )
    })

    it('dispatches CONFIRM BETS with player 2 ID', () => {
      mockPhase.mockReturnValue('ROULETTE_PLACE_BETS')
      mockState.mockReturnValue(twoPlayerRouletteState)

      render(<RouletteController />)
      fireEvent.click(screen.getByText('CONFIRM BETS'))
      expect(mockDispatchThunk).toHaveBeenCalledWith(
        'rouletteConfirmBets', 'player-2',
      )
    })

    it('dispatches CLEAR ALL with player 2 ID', () => {
      mockPhase.mockReturnValue('ROULETTE_PLACE_BETS')
      mockState.mockReturnValue(twoPlayerRouletteState)

      render(<RouletteController />)
      fireEvent.click(screen.getByText('CLEAR ALL'))
      expect(mockDispatchThunk).toHaveBeenCalledWith(
        'rouletteClearBets', 'player-2',
      )
    })
  })
})

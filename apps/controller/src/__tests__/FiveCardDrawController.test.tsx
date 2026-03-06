import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FiveCardDrawController } from '../components/games/FiveCardDrawController.js'

const mockPhase = vi.fn<() => string | null>()
const mockState = vi.fn<() => Record<string, unknown> | null>()
const mockDispatchThunk = vi.fn()

vi.mock('../hooks/useVGFHooks.js', () => ({
  usePhase: () => mockPhase(),
  useStateSync: () => mockState(),
  useSessionMember: () => ({ sessionMemberId: 'p1', displayName: 'Test', isReady: false }),
  useDispatchThunk: () => mockDispatchThunk,
}))

vi.mock('@weekend-casino/shared', () => ({
  CasinoPhase: {
    DrawBetting1: 'DRAW_BETTING_1',
    DrawBetting2: 'DRAW_BETTING_2',
    DrawDrawPhase: 'DRAW_DRAW_PHASE',
    DrawShowdown: 'DRAW_SHOWDOWN',
    DrawPotDistribution: 'DRAW_POT_DISTRIBUTION',
    DrawHandComplete: 'DRAW_HAND_COMPLETE',
    DrawPostingBlinds: 'DRAW_POSTING_BLINDS',
    DrawDealing: 'DRAW_DEALING',
  },
}))

const makeDrawState = (overrides: Record<string, unknown> = {}) => ({
  hands: {
    p1: [
      { rank: 'A', suit: 'spades' },
      { rank: 'K', suit: 'hearts' },
      { rank: 'Q', suit: 'diamonds' },
      { rank: 'J', suit: 'clubs' },
      { rank: '10', suit: 'spades' },
    ],
  },
  discardSelections: {},
  replacementCards: {},
  confirmedDiscards: {},
  drawComplete: false,
  pot: 30,
  sidePots: [],
  currentBet: 10,
  minRaiseIncrement: 10,
  activePlayerIndex: 0,
  ...overrides,
})

const makePlayers = () => [
  { id: 'p1', status: 'active', stack: 990, bet: 10, lastAction: null },
  { id: 'p2', status: 'active', stack: 990, bet: 10, lastAction: null },
]

describe('FiveCardDrawController', () => {
  beforeEach(() => {
    mockPhase.mockReset()
    mockState.mockReset()
    mockDispatchThunk.mockReset()
  })

  it('shows heading', () => {
    mockPhase.mockReturnValue('DRAW_BETTING_1')
    mockState.mockReturnValue({ fiveCardDraw: makeDrawState(), players: makePlayers() })

    render(<FiveCardDrawController />)
    expect(screen.getByText('5-Card Draw')).toBeDefined()
  })

  it('shows waiting message when draw state is null and phase is unknown', () => {
    mockPhase.mockReturnValue('DRAW_BETTING_1')
    mockState.mockReturnValue({ fiveCardDraw: undefined, players: [] })

    render(<FiveCardDrawController />)
    expect(screen.getByText(/Waiting for hand to start/)).toBeDefined()
  })

  it('shows posting blinds message during DRAW_POSTING_BLINDS', () => {
    mockPhase.mockReturnValue('DRAW_POSTING_BLINDS')
    mockState.mockReturnValue({ fiveCardDraw: undefined, players: [] })

    render(<FiveCardDrawController />)
    expect(screen.getByText(/Posting blinds/)).toBeDefined()
  })

  it('shows dealing message during DRAW_DEALING', () => {
    mockPhase.mockReturnValue('DRAW_DEALING')
    mockState.mockReturnValue({ fiveCardDraw: undefined, players: [] })

    render(<FiveCardDrawController />)
    expect(screen.getByText(/Dealing cards/)).toBeDefined()
  })

  it('renders betting buttons during DRAW_BETTING_1 when it is my turn', () => {
    mockPhase.mockReturnValue('DRAW_BETTING_1')
    mockState.mockReturnValue({ fiveCardDraw: makeDrawState(), players: makePlayers() })

    render(<FiveCardDrawController />)
    expect(screen.getByText('FOLD')).toBeDefined()
    expect(screen.getByText('CHECK')).toBeDefined()
    expect(screen.getByText('RAISE')).toBeDefined()
    expect(screen.getByText('ALL IN')).toBeDefined()
  })

  it('shows CALL instead of CHECK when current bet exceeds player bet', () => {
    mockPhase.mockReturnValue('DRAW_BETTING_1')
    const players = makePlayers()
    players[0]!.bet = 0
    mockState.mockReturnValue({ fiveCardDraw: makeDrawState(), players })

    render(<FiveCardDrawController />)
    expect(screen.getByText(/CALL/)).toBeDefined()
  })

  it('dispatches fold action when FOLD is clicked', () => {
    mockPhase.mockReturnValue('DRAW_BETTING_1')
    mockState.mockReturnValue({ fiveCardDraw: makeDrawState(), players: makePlayers() })

    render(<FiveCardDrawController />)
    fireEvent.click(screen.getByText('FOLD'))
    expect(mockDispatchThunk).toHaveBeenCalledWith('drawProcessAction', 'p1', 'fold')
  })

  it('dispatches all_in action when ALL IN is clicked', () => {
    mockPhase.mockReturnValue('DRAW_BETTING_1')
    mockState.mockReturnValue({ fiveCardDraw: makeDrawState(), players: makePlayers() })

    render(<FiveCardDrawController />)
    fireEvent.click(screen.getByText('ALL IN'))
    expect(mockDispatchThunk).toHaveBeenCalledWith('drawProcessAction', 'p1', 'all_in')
  })

  it('shows waiting message when it is not my turn', () => {
    mockPhase.mockReturnValue('DRAW_BETTING_1')
    mockState.mockReturnValue({
      fiveCardDraw: makeDrawState({ activePlayerIndex: 1 }),
      players: makePlayers(),
    })

    render(<FiveCardDrawController />)
    expect(screen.getByText(/Waiting for other players/)).toBeDefined()
  })

  it('renders discard UI during DRAW_DRAW_PHASE', () => {
    mockPhase.mockReturnValue('DRAW_DRAW_PHASE')
    mockState.mockReturnValue({ fiveCardDraw: makeDrawState(), players: makePlayers() })

    render(<FiveCardDrawController />)
    expect(screen.getByText(/Tap cards to select for discard/)).toBeDefined()
    expect(screen.getByText('KEEP ALL CARDS')).toBeDefined()
  })

  it('toggles card selection on click during discard phase', () => {
    mockPhase.mockReturnValue('DRAW_DRAW_PHASE')
    mockState.mockReturnValue({ fiveCardDraw: makeDrawState(), players: makePlayers() })

    render(<FiveCardDrawController />)

    const card1 = screen.getByLabelText('Card 1')
    fireEvent.click(card1)
    expect(screen.getByText(/1 card selected for discard/)).toBeDefined()

    const card2 = screen.getByLabelText('Card 2')
    fireEvent.click(card2)
    expect(screen.getByText(/2 cards selected for discard/)).toBeDefined()
  })

  it('dispatches drawProcessDiscard with selected indices', () => {
    mockPhase.mockReturnValue('DRAW_DRAW_PHASE')
    mockState.mockReturnValue({ fiveCardDraw: makeDrawState(), players: makePlayers() })

    render(<FiveCardDrawController />)

    fireEvent.click(screen.getByLabelText('Card 1'))
    fireEvent.click(screen.getByLabelText('Card 3'))

    fireEvent.click(screen.getByText(/DRAW/))
    expect(mockDispatchThunk).toHaveBeenCalledWith('drawProcessDiscard', 'p1', expect.arrayContaining([0, 2]))
  })

  it('dispatches drawProcessDiscard with empty array for KEEP ALL', () => {
    mockPhase.mockReturnValue('DRAW_DRAW_PHASE')
    mockState.mockReturnValue({ fiveCardDraw: makeDrawState(), players: makePlayers() })

    render(<FiveCardDrawController />)
    fireEvent.click(screen.getByText('KEEP ALL CARDS'))
    expect(mockDispatchThunk).toHaveBeenCalledWith('drawProcessDiscard', 'p1', [])
  })

  it('shows confirmed message after discard is confirmed', () => {
    mockPhase.mockReturnValue('DRAW_DRAW_PHASE')
    mockState.mockReturnValue({
      fiveCardDraw: makeDrawState({ confirmedDiscards: { p1: true } }),
      players: makePlayers(),
    })

    render(<FiveCardDrawController />)
    expect(screen.getByText(/Discard confirmed/)).toBeDefined()
  })

  it('shows results view during DRAW_SHOWDOWN', () => {
    mockPhase.mockReturnValue('DRAW_SHOWDOWN')
    mockState.mockReturnValue({ fiveCardDraw: makeDrawState(), players: makePlayers() })

    render(<FiveCardDrawController />)
    expect(screen.getByText('YOUR HAND')).toBeDefined()
  })

  it('shows hand complete during DRAW_HAND_COMPLETE', () => {
    mockPhase.mockReturnValue('DRAW_HAND_COMPLETE')
    mockState.mockReturnValue({
      fiveCardDraw: makeDrawState({ pot: 0 }),
      players: makePlayers(),
    })

    render(<FiveCardDrawController />)
    expect(screen.getByText(/Hand complete/)).toBeDefined()
  })

  it('renders 2D card display in betting view', () => {
    mockPhase.mockReturnValue('DRAW_BETTING_1')
    mockState.mockReturnValue({ fiveCardDraw: makeDrawState(), players: makePlayers() })

    render(<FiveCardDrawController />)
    // Cards render as plain HTML — verify rank text is visible
    expect(screen.getByText('A')).toBeDefined()
    expect(screen.getByText('K')).toBeDefined()
  })

  it('shows pot info in betting view', () => {
    mockPhase.mockReturnValue('DRAW_BETTING_1')
    mockState.mockReturnValue({ fiveCardDraw: makeDrawState(), players: makePlayers() })

    render(<FiveCardDrawController />)
    expect(screen.getByText(/Pot: \$30/)).toBeDefined()
  })
})

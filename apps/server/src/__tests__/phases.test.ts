import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PokerGameState, PokerPlayer, Card } from '@weekend-poker/shared'
import { PokerPhase, STARTING_STACK, DEFAULT_BLIND_LEVEL } from '@weekend-poker/shared'
import { createInitialState, pokerRuleset } from '../ruleset/index.js'
import { _resetAllServerState, setServerHandState, getServerHandState } from '../poker-engine/index.js'

// ── Test helpers ─────────────────────────────────────────────────

function makePlayer(overrides: Partial<PokerPlayer> = {}): PokerPlayer {
  return {
    id: 'player-1',
    name: 'Alice',
    seatIndex: 0,
    stack: STARTING_STACK,
    bet: 0,
    status: 'active',
    lastAction: null,
    isBot: false,
    isConnected: true,
    sittingOutHandCount: 0,
    ...overrides,
  }
}

function stateWithPlayers(...players: PokerPlayer[]): PokerGameState {
  return createInitialState({ players })
}

/**
 * Creates a mock VGF phase context.
 * Phase hooks receive a different context than thunks — they get
 * getState, dispatch, and must return state from onBegin.
 */
function createMockPhaseCtx(initialState: PokerGameState, sessionId = 'test-session') {
  let state = { ...initialState }
  const dispatched: Array<{ name: string; args: unknown[] }> = []

  // session object with a live `state` getter so endIf/next always see current state
  const session = {
    members: {},
    get state() { return state },
  }

  const ctx = {
    getState: () => state,
    getSessionId: () => sessionId,
    dispatch: (name: string, ...args: unknown[]) => {
      dispatched.push({ name, args })
      const reducer = pokerRuleset.reducers[name]
      if (reducer) {
        state = reducer(state, ...args)
      }
    },
    dispatchThunk: vi.fn(async (_name: string, ..._args: unknown[]) => {}),
    getMembers: () => ({}),
    scheduler: {
      upsertTimeout: vi.fn(),
      cancel: vi.fn(),
    },
    session,
  }

  return { ctx, dispatched, getState: () => state }
}

beforeEach(() => {
  _resetAllServerState()
})

// ── PostingBlinds phase ──────────────────────────────────────────

describe('PostingBlinds phase', () => {
  const phase = pokerRuleset.phases[PokerPhase.PostingBlinds]!

  it('should post small blind and big blind on onBegin', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, stack: 1000 }),
        makePlayer({ id: 'p2', seatIndex: 1, stack: 1000 }),
        makePlayer({ id: 'p3', seatIndex: 2, stack: 1000 }),
      ),
      dealerIndex: 0,
      phase: PokerPhase.PostingBlinds,
    }

    const { ctx, getState } = createMockPhaseCtx(state)
    phase.onBegin(ctx)
    const next = getState()

    // Dealer rotates from 0 to 1 (p2). With 3 players and dealer now at p2(1):
    // SB = p3 (index 2), BB = p1 (index 0)
    const sb = next.players.find(p => p.id === 'p3')!
    const bb = next.players.find(p => p.id === 'p1')!

    expect(sb.bet).toBe(DEFAULT_BLIND_LEVEL.smallBlind)
    expect(sb.stack).toBe(1000 - DEFAULT_BLIND_LEVEL.smallBlind)
    expect(bb.bet).toBe(DEFAULT_BLIND_LEVEL.bigBlind)
    expect(bb.stack).toBe(1000 - DEFAULT_BLIND_LEVEL.bigBlind)
  })

  it('should handle heads-up blind posting (button = SB)', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, stack: 1000 }),
        makePlayer({ id: 'p2', seatIndex: 1, stack: 1000 }),
      ),
      dealerIndex: 0,
      phase: PokerPhase.PostingBlinds,
    }

    const { ctx, getState } = createMockPhaseCtx(state)
    phase.onBegin(ctx)
    const next = getState()

    // Dealer rotates from 0 to 1 (p2). Heads-up: button (p2, index 1) is SB,
    // p1 (index 0) is BB
    const sb = next.players.find(p => p.id === 'p2')!
    const bb = next.players.find(p => p.id === 'p1')!

    expect(sb.bet).toBe(DEFAULT_BLIND_LEVEL.smallBlind)
    expect(bb.bet).toBe(DEFAULT_BLIND_LEVEL.bigBlind)
  })

  it('should increment hand number', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
      ),
      handNumber: 5,
      dealerIndex: 0,
      phase: PokerPhase.PostingBlinds,
    }

    const { ctx, getState } = createMockPhaseCtx(state)
    phase.onBegin(ctx)

    expect(getState().handNumber).toBe(6)
  })

  it('endIf should return true once blinds are posted', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, bet: 5, lastAction: 'post_small_blind' }),
        makePlayer({ id: 'p2', seatIndex: 1, bet: 10, lastAction: 'post_big_blind' }),
        makePlayer({ id: 'p3', seatIndex: 2 }),
      ),
      dealerIndex: 2,
      currentBet: 10,
      phase: PokerPhase.PostingBlinds,
    }

    const ctx = createMockPhaseCtx(state).ctx
    expect(phase.endIf(ctx)).toBe(true)
  })

  it('next should transition to DealingHoleCards', () => {
    expect(phase.next).toBe(PokerPhase.DealingHoleCards)
  })
})

// ── DealingHoleCards phase ────────────────────────────────────────

describe('DealingHoleCards phase', () => {
  const phase = pokerRuleset.phases[PokerPhase.DealingHoleCards]!

  it('should create deck and deal 2 cards per active player', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
        makePlayer({ id: 'p3', seatIndex: 2 }),
      ),
      dealerIndex: 0,
      phase: PokerPhase.DealingHoleCards,
    }

    const { ctx } = createMockPhaseCtx(state)
    phase.onBegin(ctx)

    // Each player should have 2 hole cards in server state
    const serverState = getServerHandState('test-session')
    expect(serverState).toBeDefined()
    expect(serverState!.holeCards.size).toBe(3)

    for (const playerId of ['p1', 'p2', 'p3']) {
      const cards = serverState!.holeCards.get(playerId)
      expect(cards).toHaveLength(2)
    }
  })

  it('should not deal to busted or sitting-out players', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1, status: 'busted' }),
        makePlayer({ id: 'p3', seatIndex: 2 }),
      ),
      dealerIndex: 0,
      phase: PokerPhase.DealingHoleCards,
    }

    const { ctx } = createMockPhaseCtx(state)
    phase.onBegin(ctx)

    const serverState = getServerHandState('test-session')
    expect(serverState!.holeCards.has('p2')).toBe(false)
    expect(serverState!.holeCards.size).toBe(2)
  })

  it('should store the remaining deck after dealing', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
      ),
      dealerIndex: 0,
      phase: PokerPhase.DealingHoleCards,
    }

    const { ctx } = createMockPhaseCtx(state)
    phase.onBegin(ctx)

    const serverState = getServerHandState('test-session')
    // 52 cards - 4 dealt (2 players * 2 cards) = 48
    expect(serverState!.deck).toHaveLength(48)
  })

  it('endIf should return true when dealingComplete is true', () => {
    const state = createInitialState({ dealingComplete: true })
    const ctx = createMockPhaseCtx(state).ctx
    expect(phase.endIf(ctx)).toBe(true)
  })

  it('endIf should return false when dealingComplete is false', () => {
    const state = createInitialState({ dealingComplete: false })
    const ctx = createMockPhaseCtx(state).ctx
    expect(phase.endIf(ctx)).toBe(false)
  })
})

// ── Betting phase tests (shared logic) ───────────────────────────

describe('PreFlopBetting phase', () => {
  const phase = pokerRuleset.phases[PokerPhase.PreFlopBetting]!

  it('should set active player to first left of BB (UTG)', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1, bet: 5, lastAction: 'post_small_blind' }),
        makePlayer({ id: 'p3', seatIndex: 2, bet: 10, lastAction: 'post_big_blind' }),
      ),
      dealerIndex: 0,
      currentBet: 10,
      phase: PokerPhase.PreFlopBetting,
    }

    // Dealer = p1(0), SB = p2(1), BB = p3(2), UTG = p1(0) wraps around
    // But UTG in 3-player is actually left of BB = index 0 again
    const { ctx, getState } = createMockPhaseCtx(state)
    phase.onBegin(ctx)

    // UTG (first left of BB at index 2) should be index 0 (p1)
    expect(getState().activePlayerIndex).toBe(0)
  })

  it('should set currentBet to big blind', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1, bet: 5 }),
        makePlayer({ id: 'p3', seatIndex: 2, bet: 10 }),
      ),
      dealerIndex: 0,
      currentBet: 0,
      phase: PokerPhase.PreFlopBetting,
    }

    const { ctx, getState } = createMockPhaseCtx(state)
    phase.onBegin(ctx)

    expect(getState().currentBet).toBe(DEFAULT_BLIND_LEVEL.bigBlind)
  })

  it('endIf should return true when betting round is complete', () => {
    // All active players have acted and matched the bet
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, bet: 10, lastAction: 'call' }),
        makePlayer({ id: 'p2', seatIndex: 1, bet: 10, lastAction: 'call' }),
        makePlayer({ id: 'p3', seatIndex: 2, bet: 10, lastAction: 'check' }),
      ),
      currentBet: 10,
      phase: PokerPhase.PreFlopBetting,
    }

    const ctx = createMockPhaseCtx(state).ctx
    expect(phase.endIf(ctx)).toBe(true)
  })

  it('endIf should return true when only one player remains', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, status: 'folded' }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
        makePlayer({ id: 'p3', seatIndex: 2, status: 'folded' }),
      ),
      currentBet: 10,
      phase: PokerPhase.PreFlopBetting,
    }

    const ctx = createMockPhaseCtx(state).ctx
    expect(phase.endIf(ctx)).toBe(true)
  })

  it('next should return HandComplete when only one player remains', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, status: 'folded' }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
        makePlayer({ id: 'p3', seatIndex: 2, status: 'folded' }),
      ),
      phase: PokerPhase.PreFlopBetting,
    }

    const ctx = createMockPhaseCtx(state).ctx
    const next = typeof phase.next === 'function' ? phase.next(ctx) : phase.next
    expect(next).toBe(PokerPhase.HandComplete)
  })

  it('next should return AllInRunout when all remaining are all-in', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, status: 'all_in' }),
        makePlayer({ id: 'p2', seatIndex: 1, status: 'all_in' }),
        makePlayer({ id: 'p3', seatIndex: 2, status: 'folded' }),
      ),
      phase: PokerPhase.PreFlopBetting,
    }

    const ctx = createMockPhaseCtx(state).ctx
    const next = typeof phase.next === 'function' ? phase.next(ctx) : phase.next
    expect(next).toBe(PokerPhase.AllInRunout)
  })

  it('next should return DealingFlop in normal play', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
      ),
      phase: PokerPhase.PreFlopBetting,
    }

    const ctx = createMockPhaseCtx(state).ctx
    const next = typeof phase.next === 'function' ? phase.next(ctx) : phase.next
    expect(next).toBe(PokerPhase.DealingFlop)
  })
})

describe('FlopBetting phase', () => {
  const phase = pokerRuleset.phases[PokerPhase.FlopBetting]!

  it('should set first active player left of button', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
        makePlayer({ id: 'p3', seatIndex: 2 }),
      ),
      dealerIndex: 0,
      phase: PokerPhase.FlopBetting,
    }

    const { ctx, getState } = createMockPhaseCtx(state)
    phase.onBegin(ctx)

    // First active left of button(0) = index 1
    expect(getState().activePlayerIndex).toBe(1)
  })

  it('should reset currentBet to 0', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
      ),
      dealerIndex: 0,
      currentBet: 200,
      phase: PokerPhase.FlopBetting,
    }

    const { ctx, getState } = createMockPhaseCtx(state)
    phase.onBegin(ctx)

    expect(getState().currentBet).toBe(0)
  })

  it('should reset minRaiseIncrement to big blind', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
      ),
      dealerIndex: 0,
      minRaiseIncrement: 500,
      phase: PokerPhase.FlopBetting,
    }

    const { ctx, getState } = createMockPhaseCtx(state)
    phase.onBegin(ctx)

    expect(getState().minRaiseIncrement).toBe(DEFAULT_BLIND_LEVEL.bigBlind)
  })
})

// ── DealingFlop phase ────────────────────────────────────────────

describe('DealingFlop phase', () => {
  const phase = pokerRuleset.phases[PokerPhase.DealingFlop]!

  it('should deal 3 community cards (after burning 1)', () => {
    const mockDeck: Card[] = Array.from({ length: 48 }, () => ({
      rank: '2' as const,
      suit: 'spades' as const,
    }))
    // Set up identifiable cards for burn + flop
    mockDeck[0] = { rank: 'J', suit: 'clubs' }   // burn
    mockDeck[1] = { rank: 'A', suit: 'spades' }   // flop 1
    mockDeck[2] = { rank: 'K', suit: 'hearts' }   // flop 2
    mockDeck[3] = { rank: 'Q', suit: 'diamonds' }  // flop 3

    setServerHandState('test-session', {
      deck: mockDeck,
      holeCards: new Map(),
    })

    const state = {
      ...createInitialState(),
      phase: PokerPhase.DealingFlop,
    }

    const { ctx, getState } = createMockPhaseCtx(state)
    phase.onBegin(ctx)

    const next = getState()
    expect(next.communityCards).toHaveLength(3)
    expect(next.communityCards[0]).toEqual({ rank: 'A', suit: 'spades' })
    expect(next.communityCards[1]).toEqual({ rank: 'K', suit: 'hearts' })
    expect(next.communityCards[2]).toEqual({ rank: 'Q', suit: 'diamonds' })

    // Deck should be reduced by 4 (1 burn + 3 dealt)
    const serverState = getServerHandState('test-session')
    expect(serverState!.deck).toHaveLength(44)
  })
})

// ── DealingTurn phase ────────────────────────────────────────────

describe('DealingTurn phase', () => {
  const phase = pokerRuleset.phases[PokerPhase.DealingTurn]!

  it('should deal 1 community card (after burning 1)', () => {
    const mockDeck: Card[] = Array.from({ length: 44 }, () => ({
      rank: '2' as const,
      suit: 'spades' as const,
    }))
    mockDeck[0] = { rank: '3', suit: 'clubs' }   // burn
    mockDeck[1] = { rank: '9', suit: 'hearts' }   // turn

    setServerHandState('test-session', {
      deck: mockDeck,
      holeCards: new Map(),
    })

    const state = {
      ...createInitialState({
        communityCards: [
          { rank: 'A', suit: 'spades' },
          { rank: 'K', suit: 'hearts' },
          { rank: 'Q', suit: 'diamonds' },
        ],
      }),
      phase: PokerPhase.DealingTurn,
    }

    const { ctx, getState } = createMockPhaseCtx(state)
    phase.onBegin(ctx)

    const next = getState()
    expect(next.communityCards).toHaveLength(4)
    expect(next.communityCards[3]).toEqual({ rank: '9', suit: 'hearts' })

    const serverState = getServerHandState('test-session')
    expect(serverState!.deck).toHaveLength(42)
  })
})

// ── AllInRunout phase ────────────────────────────────────────────

describe('AllInRunout phase', () => {
  const phase = pokerRuleset.phases[PokerPhase.AllInRunout]!

  it('should deal remaining community cards up to 5 total', () => {
    // Already have 3 (flop), need turn + river = 2 more, each with burn
    const mockDeck: Card[] = Array.from({ length: 44 }, () => ({
      rank: '2' as const,
      suit: 'spades' as const,
    }))
    mockDeck[0] = { rank: '3', suit: 'clubs' }   // burn for turn
    mockDeck[1] = { rank: '9', suit: 'hearts' }   // turn
    mockDeck[2] = { rank: '4', suit: 'clubs' }   // burn for river
    mockDeck[3] = { rank: '10', suit: 'diamonds' } // river

    setServerHandState('test-session', {
      deck: mockDeck,
      holeCards: new Map(),
    })

    const state = {
      ...createInitialState({
        communityCards: [
          { rank: 'A', suit: 'spades' },
          { rank: 'K', suit: 'hearts' },
          { rank: 'Q', suit: 'diamonds' },
        ],
      }),
      phase: PokerPhase.AllInRunout,
    }

    const { ctx, getState } = createMockPhaseCtx(state)
    phase.onBegin(ctx)

    const next = getState()
    expect(next.communityCards).toHaveLength(5)
  })

  it('endIf should return true (immediate transition)', () => {
    const state = createInitialState()
    const ctx = createMockPhaseCtx(state).ctx
    expect(phase.endIf(ctx)).toBe(true)
  })

  it('next should be Showdown', () => {
    expect(phase.next).toBe(PokerPhase.Showdown)
  })
})

// ── HandComplete phase ───────────────────────────────────────────

describe('HandComplete phase', () => {
  const phase = pokerRuleset.phases[PokerPhase.HandComplete]!

  it('should mark busted players (stack = 0)', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, stack: 0, status: 'all_in' }),
        makePlayer({ id: 'p2', seatIndex: 1, stack: 500 }),
      ),
      phase: PokerPhase.HandComplete,
    }

    const { ctx, getState } = createMockPhaseCtx(state)
    phase.onBegin(ctx)

    const next = getState()
    const p1 = next.players.find(p => p.id === 'p1')!
    expect(p1.status).toBe('busted')
  })

  it('next should return Lobby when fewer than MIN_PLAYERS remain', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, status: 'busted' }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
      ),
      phase: PokerPhase.HandComplete,
    }

    const ctx = createMockPhaseCtx(state).ctx
    const next = typeof phase.next === 'function' ? phase.next(ctx) : phase.next
    expect(next).toBe(PokerPhase.Lobby)
  })

  it('next should return PostingBlinds when enough players remain', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
      ),
      phase: PokerPhase.HandComplete,
    }

    const ctx = createMockPhaseCtx(state).ctx
    const next = typeof phase.next === 'function' ? phase.next(ctx) : phase.next
    expect(next).toBe(PokerPhase.PostingBlinds)
  })
})

// ── Phase transition flow ────────────────────────────────────────

describe('Phase transition flow', () => {
  it('DealingFlop.next should be FlopBetting', () => {
    const phase = pokerRuleset.phases[PokerPhase.DealingFlop]!
    expect(phase.next).toBe(PokerPhase.FlopBetting)
  })

  it('FlopBetting.next should return DealingTurn in normal play', () => {
    const phase = pokerRuleset.phases[PokerPhase.FlopBetting]!
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', seatIndex: 0 }),
      makePlayer({ id: 'p2', seatIndex: 1 }),
    )
    const ctx = createMockPhaseCtx(state).ctx
    const next = typeof phase.next === 'function' ? phase.next(ctx) : phase.next
    expect(next).toBe(PokerPhase.DealingTurn)
  })

  it('DealingTurn.next should be TurnBetting', () => {
    const phase = pokerRuleset.phases[PokerPhase.DealingTurn]!
    expect(phase.next).toBe(PokerPhase.TurnBetting)
  })

  it('TurnBetting.next should return DealingRiver in normal play', () => {
    const phase = pokerRuleset.phases[PokerPhase.TurnBetting]!
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', seatIndex: 0 }),
      makePlayer({ id: 'p2', seatIndex: 1 }),
    )
    const ctx = createMockPhaseCtx(state).ctx
    const next = typeof phase.next === 'function' ? phase.next(ctx) : phase.next
    expect(next).toBe(PokerPhase.DealingRiver)
  })

  it('DealingRiver.next should be RiverBetting', () => {
    const phase = pokerRuleset.phases[PokerPhase.DealingRiver]!
    expect(phase.next).toBe(PokerPhase.RiverBetting)
  })

  it('RiverBetting.next should return Showdown in normal play', () => {
    const phase = pokerRuleset.phases[PokerPhase.RiverBetting]!
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', seatIndex: 0 }),
      makePlayer({ id: 'p2', seatIndex: 1 }),
    )
    const ctx = createMockPhaseCtx(state).ctx
    const next = typeof phase.next === 'function' ? phase.next(ctx) : phase.next
    expect(next).toBe(PokerPhase.Showdown)
  })

  it('Showdown.next should be PotDistribution', () => {
    const phase = pokerRuleset.phases[PokerPhase.Showdown]!
    expect(phase.next).toBe(PokerPhase.PotDistribution)
  })

  it('PotDistribution.next should be HandComplete', () => {
    const phase = pokerRuleset.phases[PokerPhase.PotDistribution]!
    expect(phase.next).toBe(PokerPhase.HandComplete)
  })
})

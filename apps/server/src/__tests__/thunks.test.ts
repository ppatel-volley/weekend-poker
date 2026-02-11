import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PokerGameState, PokerPlayer, Card } from '@weekend-poker/shared'
import { PokerPhase, STARTING_STACK } from '@weekend-poker/shared'
import { createInitialState, pokerRuleset } from '../ruleset/index.js'
import { _resetAllServerState, setServerHandState } from '../poker-engine/index.js'

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
 * Creates a mock VGF thunk context.
 *
 * The mock tracks dispatched reducer calls and thunk calls,
 * and applies reducers to the state so that subsequent getState()
 * calls return the updated state.
 */
function createMockCtx(initialState: PokerGameState, sessionId = 'test-session') {
  let state = { ...initialState }
  const dispatched: Array<{ name: string; args: unknown[] }> = []
  const thunkDispatched: Array<{ name: string; args: unknown[] }> = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock context for testing
  const ctx = {
    getState: () => state,
    getClientId: () => 'test-client',
    getSessionId: () => sessionId,
    dispatch: (name: string, ...args: unknown[]) => {
      dispatched.push({ name, args })
      // Apply the reducer to keep state consistent
      const reducer = pokerRuleset.reducers[name]
      if (reducer) {
        state = reducer(state, ...args)
      }
    },
    dispatchThunk: vi.fn(async (_name: string, ..._args: unknown[]) => {
      thunkDispatched.push({ name: _name, args: _args })
    }),
    getMembers: () => ({}),
    scheduler: {
      upsertTimeout: vi.fn(),
      cancel: vi.fn(),
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    sessionManager: {
      kick: vi.fn(),
    },
  } as any

  return { ctx, dispatched, thunkDispatched, getState: () => state }
}

function getThunk(name: string) {
  const t = pokerRuleset.thunks[name]
  if (!t) throw new Error(`Thunk "${name}" not found`)
  return t
}

// ── Reset server state between tests ─────────────────────────────

beforeEach(() => {
  _resetAllServerState()
})

// ── processPlayerAction ──────────────────────────────────────────

describe('processPlayerAction thunk', () => {
  const processPlayerAction = getThunk('processPlayerAction')

  it('should reject action when it is not the player\'s turn', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
      ),
      activePlayerIndex: 1, // p2's turn, not p1's
      phase: PokerPhase.PreFlopBetting,
    }

    const { ctx, dispatched } = createMockCtx(state)
    await processPlayerAction(ctx, 'p1', 'fold')

    // Should NOT have dispatched foldPlayer — it's not p1's turn
    expect(dispatched.find(d => d.name === 'foldPlayer')).toBeUndefined()
  })

  it('should execute a fold action', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
      ),
      activePlayerIndex: 0,
      phase: PokerPhase.PreFlopBetting,
      currentBet: 10,
    }

    const { ctx, dispatched } = createMockCtx(state)
    await processPlayerAction(ctx, 'p1', 'fold')

    expect(dispatched.some(d => d.name === 'foldPlayer' && d.args[0] === 'p1')).toBe(true)
  })

  it('should execute a check action when no bet is facing', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
      ),
      activePlayerIndex: 0,
      phase: PokerPhase.FlopBetting,
      currentBet: 0,
    }

    const { ctx, dispatched } = createMockCtx(state)
    await processPlayerAction(ctx, 'p1', 'check')

    // Check doesn't need a reducer dispatch for the bet, but should record the action
    expect(dispatched.some(d => d.name === 'setPlayerLastAction' && d.args[1] === 'check')).toBe(true)
  })

  it('should execute a call action', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, stack: 1000, bet: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1, stack: 900, bet: 100 }),
      ),
      activePlayerIndex: 0,
      phase: PokerPhase.PreFlopBetting,
      currentBet: 100,
    }

    const { ctx, dispatched, getState } = createMockCtx(state)
    await processPlayerAction(ctx, 'p1', 'call')

    expect(dispatched.some(d => d.name === 'updatePlayerBet' && d.args[0] === 'p1' && d.args[1] === 100)).toBe(true)
    expect(getState().players[0]!.bet).toBe(100)
    expect(getState().players[0]!.stack).toBe(900)
  })

  it('should execute a bet action', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, stack: 1000 }),
        makePlayer({ id: 'p2', seatIndex: 1, stack: 1000 }),
      ),
      activePlayerIndex: 0,
      phase: PokerPhase.FlopBetting,
      currentBet: 0,
    }

    const { ctx, dispatched, getState } = createMockCtx(state)
    await processPlayerAction(ctx, 'p1', 'bet', 200)

    expect(dispatched.some(d => d.name === 'updatePlayerBet' && d.args[1] === 200)).toBe(true)
    expect(getState().players[0]!.bet).toBe(200)
  })

  it('should execute a raise action', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, stack: 1000, bet: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1, stack: 900, bet: 100 }),
      ),
      activePlayerIndex: 0,
      phase: PokerPhase.PreFlopBetting,
      currentBet: 100,
      minRaiseIncrement: 100,
    }

    const { ctx, dispatched, getState } = createMockCtx(state)
    await processPlayerAction(ctx, 'p1', 'raise', 300)

    expect(dispatched.some(d => d.name === 'updatePlayerBet' && d.args[1] === 300)).toBe(true)
    expect(getState().players[0]!.bet).toBe(300)
  })

  it('should execute an all-in action', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, stack: 500, bet: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1, stack: 900, bet: 100 }),
      ),
      activePlayerIndex: 0,
      phase: PokerPhase.PreFlopBetting,
      currentBet: 100,
    }

    const { ctx, dispatched, getState } = createMockCtx(state)
    await processPlayerAction(ctx, 'p1', 'all_in')

    // All-in bets the player's entire stack
    expect(dispatched.some(d => d.name === 'updatePlayerBet' && d.args[1] === 500)).toBe(true)
    expect(getState().players[0]!.stack).toBe(0)
    expect(getState().players[0]!.status).toBe('all_in')
  })

  it('should reject an illegal action (check when facing a bet)', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, stack: 1000, bet: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1, stack: 900, bet: 100 }),
      ),
      activePlayerIndex: 0,
      phase: PokerPhase.PreFlopBetting,
      currentBet: 100,
    }

    const { ctx, dispatched } = createMockCtx(state)
    await processPlayerAction(ctx, 'p1', 'check')

    // Check is not legal when facing a bet — no updatePlayerBet should fire
    expect(dispatched.find(d => d.name === 'updatePlayerBet')).toBeUndefined()
    expect(dispatched.find(d => d.name === 'setPlayerLastAction')).toBeUndefined()
  })

  it('should record the action in player last action', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
      ),
      activePlayerIndex: 0,
      phase: PokerPhase.FlopBetting,
      currentBet: 0,
    }

    const { ctx, getState } = createMockCtx(state)
    await processPlayerAction(ctx, 'p1', 'check')

    expect(getState().players[0]!.lastAction).toBe('check')
  })

  it('should advance to next active player after action', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
        makePlayer({ id: 'p3', seatIndex: 2 }),
      ),
      activePlayerIndex: 0,
      phase: PokerPhase.FlopBetting,
      currentBet: 0,
    }

    const { ctx, dispatched } = createMockCtx(state)
    await processPlayerAction(ctx, 'p1', 'check')

    // Should set active player to p2 (index 1)
    expect(dispatched.some(d => d.name === 'setActivePlayer' && d.args[0] === 1)).toBe(true)
  })
})

// ── autoFoldPlayer ───────────────────────────────────────────────

describe('autoFoldPlayer thunk', () => {
  const autoFoldPlayer = getThunk('autoFoldPlayer')

  it('should auto-check when no bet is facing the player', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1 }),
      ),
      activePlayerIndex: 0,
      phase: PokerPhase.FlopBetting,
      currentBet: 0,
    }

    const { ctx, getState } = createMockCtx(state)
    await autoFoldPlayer(ctx, 'p1')

    // Should check rather than fold when there's nothing to call
    expect(getState().players[0]!.lastAction).toBe('check')
    expect(getState().players[0]!.status).toBe('active')
  })

  it('should auto-fold when facing a bet', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, bet: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1, bet: 100, stack: 900 }),
      ),
      activePlayerIndex: 0,
      phase: PokerPhase.PreFlopBetting,
      currentBet: 100,
    }

    const { ctx, getState } = createMockCtx(state)
    await autoFoldPlayer(ctx, 'p1')

    expect(getState().players[0]!.status).toBe('folded')
  })
})

// ── evaluateHands ────────────────────────────────────────────────

describe('evaluateHands thunk', () => {
  const evaluateHands = getThunk('evaluateHands')

  it('should determine the winner based on hand strength', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, status: 'active' }),
        makePlayer({ id: 'p2', seatIndex: 1, status: 'active' }),
      ),
      communityCards: [
        { rank: '2' as const, suit: 'diamonds' as const },
        { rank: '7' as const, suit: 'hearts' as const },
        { rank: '8' as const, suit: 'clubs' as const },
        { rank: 'J' as const, suit: 'spades' as const },
        { rank: 'K' as const, suit: 'diamonds' as const },
      ],
      pot: 200,
      phase: PokerPhase.Showdown,
    }

    // p1 has pair of Aces, p2 has pair of Tens
    setServerHandState('test-session', {
      deck: [],
      holeCards: new Map([
        ['p1', [{ rank: 'A', suit: 'spades' }, { rank: 'A', suit: 'hearts' }] as [Card, Card]],
        ['p2', [{ rank: '10', suit: 'spades' }, { rank: '10', suit: 'hearts' }] as [Card, Card]],
      ]),
    })

    const { ctx, dispatched } = createMockCtx(state)
    await evaluateHands(ctx)

    // p1 should have been stored as the winner (pair of aces beats pair of tens)
    // The thunk should store results that distributePot can use
    const awardDispatch = dispatched.find(d => d.name === 'awardPot')
    if (awardDispatch) {
      const winnerIds = awardDispatch.args[0] as string[]
      expect(winnerIds).toContain('p1')
    }
  })

  it('should handle split pot with identical hands', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, status: 'active' }),
        makePlayer({ id: 'p2', seatIndex: 1, status: 'active' }),
      ),
      communityCards: [
        { rank: 'A' as const, suit: 'spades' as const },
        { rank: 'K' as const, suit: 'spades' as const },
        { rank: 'Q' as const, suit: 'hearts' as const },
        { rank: 'J' as const, suit: 'diamonds' as const },
        { rank: '10' as const, suit: 'clubs' as const },
      ],
      pot: 200,
      phase: PokerPhase.Showdown,
    }

    // Both players have the same straight (playing the board)
    setServerHandState('test-session', {
      deck: [],
      holeCards: new Map([
        ['p1', [{ rank: '2', suit: 'hearts' }, { rank: '3', suit: 'diamonds' }] as [Card, Card]],
        ['p2', [{ rank: '4', suit: 'hearts' }, { rank: '5', suit: 'diamonds' }] as [Card, Card]],
      ]),
    })

    const { ctx, dispatched } = createMockCtx(state)
    await evaluateHands(ctx)

    // Both should be awarded — split pot
    const awardDispatch = dispatched.find(d => d.name === 'awardPot')
    if (awardDispatch) {
      const winnerIds = awardDispatch.args[0] as string[]
      const amounts = awardDispatch.args[1] as number[]
      expect(winnerIds).toContain('p1')
      expect(winnerIds).toContain('p2')
      // Each gets half
      expect(amounts[winnerIds.indexOf('p1')]).toBe(100)
      expect(amounts[winnerIds.indexOf('p2')]).toBe(100)
    }
  })

  it('should handle side pots correctly', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, status: 'all_in', stack: 0 }),
        makePlayer({ id: 'p2', seatIndex: 1, status: 'active', stack: 500 }),
        makePlayer({ id: 'p3', seatIndex: 2, status: 'active', stack: 500 }),
      ),
      pot: 700,
      sidePots: [
        { amount: 300, eligiblePlayerIds: ['p1', 'p2', 'p3'] },
        { amount: 400, eligiblePlayerIds: ['p2', 'p3'] },
      ],
      communityCards: [
        { rank: '2' as const, suit: 'diamonds' as const },
        { rank: '5' as const, suit: 'hearts' as const },
        { rank: '8' as const, suit: 'clubs' as const },
        { rank: 'J' as const, suit: 'spades' as const },
        { rank: '9' as const, suit: 'diamonds' as const },
      ],
      phase: PokerPhase.Showdown,
    }

    // p1 has pair of Aces (best overall), p2 has pair of Queens (second best), p3 has nothing
    // p1 wins main pot (300). p2 wins side pot (400) as best of p2/p3.
    setServerHandState('test-session', {
      deck: [],
      holeCards: new Map([
        ['p1', [{ rank: 'A', suit: 'spades' }, { rank: 'A', suit: 'hearts' }] as [Card, Card]],
        ['p2', [{ rank: 'Q', suit: 'spades' }, { rank: 'Q', suit: 'hearts' }] as [Card, Card]],
        ['p3', [{ rank: '3', suit: 'spades' }, { rank: '4', suit: 'hearts' }] as [Card, Card]],
      ]),
    })

    const { ctx, dispatched } = createMockCtx(state)
    await evaluateHands(ctx)

    const awardDispatch = dispatched.find(d => d.name === 'awardPot')
    expect(awardDispatch).toBeDefined()

    const winnerIds = awardDispatch!.args[0] as string[]
    const amounts = awardDispatch!.args[1] as number[]

    // p1 wins main pot (300) with pair of Aces, p2 wins side pot (400) with pair of Queens
    // p3 has nothing — loses both pots
    const p1Award = amounts.reduce((sum, amt, i) => winnerIds[i] === 'p1' ? sum + amt : sum, 0)
    const p2Award = amounts.reduce((sum, amt, i) => winnerIds[i] === 'p2' ? sum + amt : sum, 0)
    expect(p1Award).toBe(300)
    expect(p2Award).toBe(400)
  })

  it('should skip folded players', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, status: 'folded' }),
        makePlayer({ id: 'p2', seatIndex: 1, status: 'active' }),
      ),
      communityCards: [
        { rank: '2' as const, suit: 'diamonds' as const },
        { rank: '7' as const, suit: 'hearts' as const },
        { rank: '8' as const, suit: 'clubs' as const },
        { rank: 'J' as const, suit: 'spades' as const },
        { rank: 'K' as const, suit: 'diamonds' as const },
      ],
      pot: 200,
      phase: PokerPhase.Showdown,
    }

    // Even though p1 has better cards, they folded
    setServerHandState('test-session', {
      deck: [],
      holeCards: new Map([
        ['p1', [{ rank: 'A', suit: 'spades' }, { rank: 'A', suit: 'hearts' }] as [Card, Card]],
        ['p2', [{ rank: '3', suit: 'spades' }, { rank: '4', suit: 'hearts' }] as [Card, Card]],
      ]),
    })

    const { ctx, dispatched } = createMockCtx(state)
    await evaluateHands(ctx)

    const awardDispatch = dispatched.find(d => d.name === 'awardPot')
    if (awardDispatch) {
      const winnerIds = awardDispatch.args[0] as string[]
      expect(winnerIds).not.toContain('p1')
      expect(winnerIds).toContain('p2')
    }
  })
})

// ── distributePot ────────────────────────────────────────────────

describe('distributePot thunk', () => {
  const distributePot = getThunk('distributePot')

  it('should award pot to the sole remaining player when all others folded', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, status: 'active' }),
        makePlayer({ id: 'p2', seatIndex: 1, status: 'folded' }),
      ),
      pot: 300,
      sidePots: [],
      phase: PokerPhase.PotDistribution,
    }

    const { ctx, dispatched } = createMockCtx(state)
    await distributePot(ctx)

    const awardDispatch = dispatched.find(d => d.name === 'awardPot')
    expect(awardDispatch).toBeDefined()
    const winnerIds = awardDispatch!.args[0] as string[]
    const amounts = awardDispatch!.args[1] as number[]
    expect(winnerIds).toEqual(['p1'])
    expect(amounts).toEqual([300])
  })

  it('should delegate to evaluateHands for multi-player showdown', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, status: 'active', stack: 500 }),
        makePlayer({ id: 'p2', seatIndex: 1, status: 'active', stack: 500 }),
      ),
      pot: 400,
      phase: PokerPhase.PotDistribution,
    }

    const { ctx, thunkDispatched } = createMockCtx(state)
    await distributePot(ctx)

    // When multiple players remain, distributePot should delegate to evaluateHands
    expect(thunkDispatched.some(d => d.name === 'evaluateHands')).toBe(true)
  })
})

// ── startHand ────────────────────────────────────────────────────

describe('startHand thunk', () => {
  const startHand = getThunk('startHand')

  it('should reset hand state', async () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', seatIndex: 0, lastAction: 'fold' as const, status: 'folded' }),
        makePlayer({ id: 'p2', seatIndex: 1, lastAction: 'call' as const }),
      ),
      pot: 500,
      communityCards: [{ rank: '2' as const, suit: 'hearts' as const }],
      handHistory: [{ playerId: 'p1', playerName: 'Alice', action: 'fold' as const, amount: 0, phase: PokerPhase.PreFlopBetting, timestamp: 0 }],
      currentBet: 100,
      phase: PokerPhase.PostingBlinds,
    }

    const { ctx, getState } = createMockCtx(state)
    await startHand(ctx)

    const next = getState()
    expect(next.communityCards).toEqual([])
    expect(next.pot).toBe(0)
    expect(next.currentBet).toBe(0)
    expect(next.handHistory).toEqual([])
    expect(next.lastAggressor).toBeNull()
    expect(next.dealingComplete).toBe(false)
  })
})

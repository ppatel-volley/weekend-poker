import { describe, it, expect } from 'vitest'
import { crapsReducers } from '../ruleset/craps-reducers.js'
import type { CasinoGameState, CrapsBet, CrapsComeBet } from '@weekend-casino/shared'
import { createInitialCasinoState } from '../ruleset/casino-state.js'

// ── Helper ──────────────────────────────────────────────────────────

function makeState(crapsOverrides: Partial<NonNullable<CasinoGameState['craps']>> = {}): CasinoGameState {
  const base = createInitialCasinoState({
    players: [
      { id: 'p1', name: 'Alice', avatarId: 'a', seatIndex: 0, isHost: true, isReady: true, currentGameStatus: 'active', stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
      { id: 'p2', name: 'Bob', avatarId: 'b', seatIndex: 1, isHost: false, isReady: true, currentGameStatus: 'active', stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
    ],
    wallet: { p1: 10000, p2: 10000 },
  })

  base.craps = {
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
    players: [
      { playerId: 'p1', totalAtRisk: 0, betsConfirmed: false, roundResult: 0 },
      { playerId: 'p2', totalAtRisk: 0, betsConfirmed: false, roundResult: 0 },
    ],
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
    config: {
      minBet: 10,
      maxBet: 500,
      maxOddsMultiplier: 3,
      placeBetsWorkOnComeOut: false,
      simpleMode: true,
    },
    ...crapsOverrides,
  }

  return base
}

function makeBet(overrides: Partial<CrapsBet> = {}): CrapsBet {
  return {
    id: 'bet-1',
    playerId: 'p1',
    type: 'pass_line',
    amount: 100,
    working: true,
    status: 'active',
    payout: 0,
    ...overrides,
  }
}

// ── crapsInitRound ──────────────────────────────────────────────────

describe('crapsInitRound', () => {
  it('creates craps sub-state', () => {
    const base = createInitialCasinoState({
      players: [
        { id: 'p1', name: 'Alice', avatarId: 'a', seatIndex: 0, isHost: true, isReady: true, currentGameStatus: 'active', stack: 10000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
      ],
    })
    const result = crapsReducers.crapsInitRound(base, 'p1', 0)
    expect(result.craps).toBeDefined()
    expect(result.craps!.shooterPlayerId).toBe('p1')
    expect(result.craps!.roundNumber).toBe(1)
    expect(result.craps!.players).toHaveLength(1)
  })

  it('increments round number from previous state', () => {
    const state = makeState({ roundNumber: 5 })
    const result = crapsReducers.crapsInitRound(state, 'p1', 0)
    expect(result.craps!.roundNumber).toBe(6)
  })

  it('preserves come bets with established points', () => {
    const comeBet: CrapsComeBet = {
      id: 'cb-1', playerId: 'p1', type: 'come', amount: 50, comePoint: 6, oddsAmount: 0, status: 'active',
    }
    const state = makeState({ comeBets: [comeBet] })
    const result = crapsReducers.crapsInitRound(state, 'p1', 0)
    expect(result.craps!.comeBets).toHaveLength(1)
    expect(result.craps!.comeBets[0]!.comePoint).toBe(6)
  })

  it('drops come bets without established points', () => {
    const comeBet: CrapsComeBet = {
      id: 'cb-1', playerId: 'p1', type: 'come', amount: 50, comePoint: null, oddsAmount: 0, status: 'active',
    }
    const state = makeState({ comeBets: [comeBet] })
    const result = crapsReducers.crapsInitRound(state, 'p1', 0)
    expect(result.craps!.comeBets).toHaveLength(0)
  })
})

// ── crapsSetShooter ─────────────────────────────────────────────────

describe('crapsSetShooter', () => {
  it('sets the shooter', () => {
    const state = makeState()
    const result = crapsReducers.crapsSetShooter(state, 'p2', 1)
    expect(result.craps!.shooterPlayerId).toBe('p2')
    expect(result.craps!.shooterIndex).toBe(1)
  })

  it('returns unchanged state when craps is undefined', () => {
    const base = createInitialCasinoState()
    const result = crapsReducers.crapsSetShooter(base, 'p1', 0)
    expect(result).toBe(base)
  })
})

// ── crapsPlaceBet ───────────────────────────────────────────────────

describe('crapsPlaceBet', () => {
  it('adds a bet to the array', () => {
    const state = makeState()
    const bet = makeBet()
    const result = crapsReducers.crapsPlaceBet(state, bet)
    expect(result.craps!.bets).toHaveLength(1)
    expect(result.craps!.bets[0]!.id).toBe('bet-1')
  })

  it('updates player totalAtRisk', () => {
    const state = makeState()
    const bet = makeBet({ amount: 200 })
    const result = crapsReducers.crapsPlaceBet(state, bet)
    const player = result.craps!.players.find(p => p.playerId === 'p1')
    expect(player!.totalAtRisk).toBe(200)
  })

  it('returns unchanged state when craps is undefined', () => {
    const base = createInitialCasinoState()
    const result = crapsReducers.crapsPlaceBet(base, makeBet())
    expect(result).toBe(base)
  })
})

// ── crapsPlaceComeBet ───────────────────────────────────────────────

describe('crapsPlaceComeBet', () => {
  it('adds a come bet', () => {
    const state = makeState()
    const comeBet: CrapsComeBet = {
      id: 'cb-1', playerId: 'p1', type: 'come', amount: 50, comePoint: null, oddsAmount: 0, status: 'active',
    }
    const result = crapsReducers.crapsPlaceComeBet(state, comeBet)
    expect(result.craps!.comeBets).toHaveLength(1)
  })
})

// ── crapsSetRollResult ──────────────────────────────────────────────

describe('crapsSetRollResult', () => {
  it('records the roll result', () => {
    const state = makeState()
    const result = crapsReducers.crapsSetRollResult(state, 3, 4, 1)
    expect(result.craps!.lastRollDie1).toBe(3)
    expect(result.craps!.lastRollDie2).toBe(4)
    expect(result.craps!.lastRollTotal).toBe(7)
    expect(result.craps!.rollHistory).toHaveLength(1)
    expect(result.craps!.rollHistory[0]!.isHardway).toBe(false)
  })

  it('detects hardway', () => {
    const state = makeState()
    const result = crapsReducers.crapsSetRollResult(state, 3, 3, 1)
    expect(result.craps!.rollHistory[0]!.isHardway).toBe(true)
  })
})

// ── crapsSetPoint ───────────────────────────────────────────────────

describe('crapsSetPoint', () => {
  it('sets the point', () => {
    const state = makeState()
    const result = crapsReducers.crapsSetPoint(state, 6)
    expect(result.craps!.point).toBe(6)
  })

  it('clears the point', () => {
    const state = makeState({ point: 6 })
    const result = crapsReducers.crapsSetPoint(state, null)
    expect(result.craps!.point).toBeNull()
  })
})

// ── crapsSetPuckOn ──────────────────────────────────────────────────

describe('crapsSetPuckOn', () => {
  it('turns puck ON', () => {
    const state = makeState()
    const result = crapsReducers.crapsSetPuckOn(state, true)
    expect(result.craps!.puckOn).toBe(true)
  })
})

// ── crapsResolveBets ────────────────────────────────────────────────

describe('crapsResolveBets', () => {
  it('replaces bets and comeBets atomically', () => {
    const state = makeState({
      bets: [makeBet()],
      comeBets: [{ id: 'cb-1', playerId: 'p1', type: 'come', amount: 50, comePoint: null, oddsAmount: 0, status: 'active' }],
    })
    const newBets = [makeBet({ status: 'won', payout: 200 })]
    const newComeBets: CrapsComeBet[] = []

    const result = crapsReducers.crapsResolveBets(state, newBets, newComeBets)
    expect(result.craps!.bets[0]!.status).toBe('won')
    expect(result.craps!.comeBets).toHaveLength(0)
  })
})

// ── crapsSetPlayerConfirmed ─────────────────────────────────────────

describe('crapsSetPlayerConfirmed', () => {
  it('sets player confirmed flag', () => {
    const state = makeState()
    const result = crapsReducers.crapsSetPlayerConfirmed(state, 'p1', true)
    const player = result.craps!.players.find(p => p.playerId === 'p1')
    expect(player!.betsConfirmed).toBe(true)
  })
})

// ── Phase transition flags ──────────────────────────────────────────

describe('phase transition flags', () => {
  it('crapsSetAllBetsPlaced sets both flags', () => {
    const state = makeState()
    const result = crapsReducers.crapsSetAllBetsPlaced(state, true)
    expect(result.craps!.allComeOutBetsPlaced).toBe(true)
    expect(result.craps!.allPointBetsPlaced).toBe(true)
  })

  it('crapsSetRollComplete sets flag', () => {
    const result = crapsReducers.crapsSetRollComplete(makeState(), true)
    expect(result.craps!.rollComplete).toBe(true)
  })

  it('crapsSetResolutionComplete sets both flags', () => {
    const result = crapsReducers.crapsSetResolutionComplete(makeState(), true)
    expect(result.craps!.comeOutResolutionComplete).toBe(true)
    expect(result.craps!.pointResolutionComplete).toBe(true)
  })

  it('crapsSetRoundCompleteReady sets flag', () => {
    const result = crapsReducers.crapsSetRoundCompleteReady(makeState(), true)
    expect(result.craps!.roundCompleteReady).toBe(true)
  })

  it('crapsSetNewShooterReady sets flag', () => {
    const result = crapsReducers.crapsSetNewShooterReady(makeState(), true)
    expect(result.craps!.newShooterReady).toBe(true)
  })

  it('crapsSetSevenOut sets flag', () => {
    const result = crapsReducers.crapsSetSevenOut(makeState(), true)
    expect(result.craps!.sevenOut).toBe(true)
  })

  it('crapsSetPointHit sets flag', () => {
    const result = crapsReducers.crapsSetPointHit(makeState(), true)
    expect(result.craps!.pointHit).toBe(true)
  })
})

// ── crapsRotateShooter ──────────────────────────────────────────────

describe('crapsRotateShooter', () => {
  it('rotates to next player', () => {
    const state = makeState({ shooterPlayerId: 'p1' })
    const result = crapsReducers.crapsRotateShooter(state)
    expect(result.craps!.shooterPlayerId).toBe('p2')
  })

  it('wraps around to first player', () => {
    const state = makeState({ shooterPlayerId: 'p2' })
    const result = crapsReducers.crapsRotateShooter(state)
    expect(result.craps!.shooterPlayerId).toBe('p1')
  })

  it('returns unchanged when no active players', () => {
    const state = makeState()
    state.players = []
    const result = crapsReducers.crapsRotateShooter(state)
    expect(result).toBe(state)
  })
})

// ── crapsClearRound ─────────────────────────────────────────────────

describe('crapsClearRound', () => {
  it('clears round state', () => {
    const state = makeState({
      bets: [makeBet()],
      sevenOut: true,
      rollComplete: true,
    })
    const result = crapsReducers.crapsClearRound(state)
    expect(result.craps!.bets).toHaveLength(0)
    expect(result.craps!.sevenOut).toBe(false)
    expect(result.craps!.rollComplete).toBe(false)
  })

  it('preserves come bets with established points', () => {
    const state = makeState({
      comeBets: [
        { id: 'cb-1', playerId: 'p1', type: 'come', amount: 50, comePoint: 6, oddsAmount: 0, status: 'active' },
        { id: 'cb-2', playerId: 'p1', type: 'come', amount: 50, comePoint: null, oddsAmount: 0, status: 'active' },
      ],
    })
    const result = crapsReducers.crapsClearRound(state)
    expect(result.craps!.comeBets).toHaveLength(1)
    expect(result.craps!.comeBets[0]!.comePoint).toBe(6)
  })

  it('resets player confirmation flags', () => {
    const state = makeState()
    state.craps!.players[0]!.betsConfirmed = true
    const result = crapsReducers.crapsClearRound(state)
    expect(result.craps!.players[0]!.betsConfirmed).toBe(false)
  })
})

// ── crapsReturnComeBets ─────────────────────────────────────────────

describe('crapsReturnComeBets', () => {
  it('marks all active come bets as returned', () => {
    const state = makeState({
      comeBets: [
        { id: 'cb-1', playerId: 'p1', type: 'come', amount: 50, comePoint: 6, oddsAmount: 0, status: 'active' },
        { id: 'cb-2', playerId: 'p2', type: 'come', amount: 75, comePoint: null, oddsAmount: 0, status: 'active' },
        { id: 'cb-3', playerId: 'p1', type: 'come', amount: 25, comePoint: 8, oddsAmount: 0, status: 'won' },
      ],
    })
    const result = crapsReducers.crapsReturnComeBets(state)
    expect(result.craps!.comeBets[0]!.status).toBe('returned')
    expect(result.craps!.comeBets[1]!.status).toBe('returned')
    expect(result.craps!.comeBets[2]!.status).toBe('won') // Already resolved — unchanged
  })
})

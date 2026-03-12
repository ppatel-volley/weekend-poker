/**
 * Infinite cascade prevention tests for TCP, Roulette, and Craps.
 *
 * Validates that when all human players are busted/sitting_out (only bots
 * remain), the round-complete phase routes to GameSelect instead of looping
 * back to the betting phase — which would cause an unbounded OOM cascade.
 *
 * Mirrors the BJ cascade prevention tests in bj-integration.test.ts section 12.
 */

import { describe, it, expect, vi } from 'vitest'
import type { CasinoGameState } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'

// Mock game-night-utils so wrapWithGameNightCheck is a passthrough
vi.mock('../game-night-utils.js', () => ({
  wrapWithGameNightCheck: (fn: any) => fn,
  incrementGameNightRoundIfActive: vi.fn(),
}))

// Mock thunk dispatchers that TCP/Roulette/Craps phases call in onBegin
vi.mock('../tcp-thunks.js', () => ({}))
vi.mock('../roulette-thunks.js', () => ({}))
vi.mock('../craps-thunks.js', () => ({}))

import { tcpRoundCompletePhase } from '../tcp-phases.js'
import { rouletteRoundCompletePhase } from '../roulette-phases.js'
import { crapsRoundCompletePhase } from '../craps-phases.js'

// ── Helpers ──────────────────────────────────────────────────

function createTestState(opts: {
  humanCount?: number
  botCount?: number
  bustedHumans?: number
  sittingOutHumans?: number
}): CasinoGameState {
  const humanCount = opts.humanCount ?? 1
  const botCount = opts.botCount ?? 1
  const bustedHumans = opts.bustedHumans ?? 0
  const sittingOutHumans = opts.sittingOutHumans ?? 0

  const players: any[] = []
  const wallet: Record<string, number> = {}

  for (let i = 0; i < humanCount; i++) {
    const id = `human${i + 1}`
    let status = 'active'
    if (i < bustedHumans) status = 'busted'
    else if (i < bustedHumans + sittingOutHumans) status = 'sitting_out'
    players.push({
      id, name: `Human ${i + 1}`, seatIndex: i, stack: 1000, bet: 0,
      status, lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0,
    })
    wallet[id] = status === 'busted' ? 0 : 1000
  }
  for (let i = 0; i < botCount; i++) {
    const id = `bot${i + 1}`
    players.push({
      id, name: `Bot ${i + 1}`, seatIndex: humanCount + i, stack: 1000, bet: 0,
      status: 'active', lastAction: null, isBot: true, isConnected: true, sittingOutHandCount: 0,
    })
    wallet[id] = 1000
  }

  return {
    phase: CasinoPhase.GameSelect,
    selectedGame: null,
    gameSelectConfirmed: false,
    gameChangeRequested: false,
    gameChangeVotes: {},
    wallet,
    players,
    dealerCharacterId: 'ace_malone',
    blindLevel: { level: 1, smallBlind: 5, bigBlind: 10, minBuyIn: 200, maxBuyIn: 1000 },
    handNumber: 0,
    dealerIndex: 0,
    lobbyReady: false,
    dealerMessage: null,
    ttsQueue: [],
    sessionStats: { gamesPlayed: 0, totalHandsPlayed: 0, playerStats: {} },
  } as any as CasinoGameState
}

function makeNextCtx(state: CasinoGameState, extraState?: Record<string, any>) {
  return {
    session: {
      state: { ...state, ...extraState },
    },
  }
}

// ═══════════════════════════════════════════════════════════════
//  TCP infinite cascade prevention
// ═══════════════════════════════════════════════════════════════

describe('TCP infinite cascade prevention (OOM fix)', () => {
  it('ROUND_COMPLETE routes to GameSelect when all humans are busted', () => {
    const state = createTestState({ humanCount: 1, botCount: 2, bustedHumans: 1 })
    const ctx = makeNextCtx(state, {
      threeCardPoker: { roundCompleteReady: true },
    })

    const nextPhase = tcpRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })

  it('ROUND_COMPLETE routes to GameSelect when all humans are sitting_out', () => {
    const state = createTestState({ humanCount: 1, botCount: 1, sittingOutHumans: 1 })
    const ctx = makeNextCtx(state, {
      threeCardPoker: { roundCompleteReady: true },
    })

    const nextPhase = tcpRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })

  it('ROUND_COMPLETE routes to GameSelect when no humans at all (all bots)', () => {
    const state = createTestState({ humanCount: 0, botCount: 3 })
    const ctx = makeNextCtx(state, {
      threeCardPoker: { roundCompleteReady: true },
    })

    const nextPhase = tcpRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })

  it('ROUND_COMPLETE still loops to TcpPlaceBets when active humans remain', () => {
    const state = createTestState({ humanCount: 2, botCount: 1, bustedHumans: 1 })
    const ctx = makeNextCtx(state, {
      threeCardPoker: { roundCompleteReady: true },
    })

    // human1 busted, but human2 is still active
    const nextPhase = tcpRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.TcpPlaceBets)
  })

  it('ROUND_COMPLETE routes to GameSelect when gameChangeRequested (regardless of humans)', () => {
    const state = createTestState({ humanCount: 1, botCount: 1 })
    const ctx = makeNextCtx(state, {
      gameChangeRequested: true,
      threeCardPoker: { roundCompleteReady: true },
    })

    const nextPhase = tcpRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })
})

// ═══════════════════════════════════════════════════════════════
//  Roulette infinite cascade prevention
// ═══════════════════════════════════════════════════════════════

describe('Roulette infinite cascade prevention (OOM fix)', () => {
  it('ROUND_COMPLETE routes to GameSelect when all humans are busted', () => {
    const state = createTestState({ humanCount: 1, botCount: 2, bustedHumans: 1 })
    const ctx = makeNextCtx(state, {
      roulette: { roundCompleteReady: true },
    })

    const nextPhase = rouletteRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })

  it('ROUND_COMPLETE routes to GameSelect when all humans are sitting_out', () => {
    const state = createTestState({ humanCount: 1, botCount: 1, sittingOutHumans: 1 })
    const ctx = makeNextCtx(state, {
      roulette: { roundCompleteReady: true },
    })

    const nextPhase = rouletteRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })

  it('ROUND_COMPLETE routes to GameSelect when no humans at all (all bots)', () => {
    const state = createTestState({ humanCount: 0, botCount: 3 })
    const ctx = makeNextCtx(state, {
      roulette: { roundCompleteReady: true },
    })

    const nextPhase = rouletteRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })

  it('ROUND_COMPLETE still loops to RoulettePlaceBets when active humans remain', () => {
    const state = createTestState({ humanCount: 2, botCount: 1, bustedHumans: 1 })
    const ctx = makeNextCtx(state, {
      roulette: { roundCompleteReady: true },
    })

    const nextPhase = rouletteRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.RoulettePlaceBets)
  })

  it('ROUND_COMPLETE routes to GameSelect when gameChangeRequested', () => {
    const state = createTestState({ humanCount: 1, botCount: 1 })
    const ctx = makeNextCtx(state, {
      gameChangeRequested: true,
      roulette: { roundCompleteReady: true },
    })

    const nextPhase = rouletteRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })
})

// ═══════════════════════════════════════════════════════════════
//  Craps infinite cascade prevention
// ═══════════════════════════════════════════════════════════════

describe('Craps infinite cascade prevention (OOM fix)', () => {
  it('ROUND_COMPLETE routes to GameSelect when all humans are busted (no seven-out)', () => {
    const state = createTestState({ humanCount: 1, botCount: 2, bustedHumans: 1 })
    const ctx = makeNextCtx(state, {
      craps: { roundCompleteReady: true, sevenOut: false },
    })

    const nextPhase = crapsRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })

  it('ROUND_COMPLETE routes to GameSelect when all humans are busted (seven-out)', () => {
    const state = createTestState({ humanCount: 1, botCount: 2, bustedHumans: 1 })
    const ctx = makeNextCtx(state, {
      craps: { roundCompleteReady: true, sevenOut: true },
    })

    // Even with seven-out, should NOT go to CrapsNewShooter — only bots remain
    const nextPhase = crapsRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })

  it('ROUND_COMPLETE routes to GameSelect when no humans at all (all bots)', () => {
    const state = createTestState({ humanCount: 0, botCount: 3 })
    const ctx = makeNextCtx(state, {
      craps: { roundCompleteReady: true, sevenOut: false },
    })

    const nextPhase = crapsRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })

  it('ROUND_COMPLETE routes to CrapsNewShooter on seven-out with active humans', () => {
    const state = createTestState({ humanCount: 1, botCount: 1 })
    const ctx = makeNextCtx(state, {
      craps: { roundCompleteReady: true, sevenOut: true },
    })

    const nextPhase = crapsRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.CrapsNewShooter)
  })

  it('ROUND_COMPLETE routes to CrapsComeOutBetting (no seven-out) with active humans', () => {
    const state = createTestState({ humanCount: 1, botCount: 1 })
    const ctx = makeNextCtx(state, {
      craps: { roundCompleteReady: true, sevenOut: false },
    })

    const nextPhase = crapsRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.CrapsComeOutBetting)
  })

  it('ROUND_COMPLETE routes to GameSelect when gameChangeRequested', () => {
    const state = createTestState({ humanCount: 1, botCount: 1 })
    const ctx = makeNextCtx(state, {
      gameChangeRequested: true,
      craps: { roundCompleteReady: true, sevenOut: true },
    })

    const nextPhase = crapsRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })

  it('ROUND_COMPLETE routes to GameSelect when all humans sitting_out (seven-out)', () => {
    const state = createTestState({ humanCount: 2, botCount: 1, sittingOutHumans: 2 })
    const ctx = makeNextCtx(state, {
      craps: { roundCompleteReady: true, sevenOut: true },
    })

    const nextPhase = crapsRoundCompletePhase.next(ctx)
    expect(nextPhase).toBe(CasinoPhase.GameSelect)
  })
})

/**
 * Blackjack OOM reproduction test.
 *
 * Simulates VGF's PhaseRunner2.checkAndTransitionIfNeeded() loop to detect
 * infinite phase cascades that cause out-of-memory crashes.
 *
 * Root cause: VGF's PhaseRunner2 checks endIf BEFORE running onBegin when
 * transitioning phases. Per-round phase flags (allBetsPlaced, dealComplete, etc.)
 * persist from the previous round, so endIf returns true immediately — skipping
 * onBegin (which would have reset them via bjInitRound). This creates an infinite
 * BJ_PLACE_BETS → ... → BJ_HAND_COMPLETE → BJ_PLACE_BETS cascade.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CasinoGameState, Card } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'
import { bjReducers } from '../bj-reducers.js'
import {
  bjPlaceBetsPhase,
  bjDealInitialPhase,
  bjInsurancePhase,
  bjPlayerTurnsPhase,
  bjDealerTurnPhase,
  bjSettlementPhase,
  bjHandCompletePhase,
} from '../bj-phases.js'

// ── Mocks ────────────────────────────────────────────────────

let mockShoe: Card[] = []

vi.mock('../../server-game-state.js', () => ({
  getServerGameState: () => ({
    blackjack: {
      get shoe() { return mockShoe },
      set shoe(v: Card[]) { mockShoe = v },
      dealerHoleCard: null,
    },
  }),
  setServerGameState: vi.fn(),
}))

vi.mock('../game-night-utils.js', () => ({
  wrapWithGameNightCheck: (fn: any) => fn,
  incrementGameNightRoundIfActive: vi.fn(),
}))

// ── Helpers ──────────────────────────────────────────────────

function card(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { rank, suit }
}

function createTestState(opts: {
  humanCount?: number
  botCount?: number
  walletAmount?: number
} = {}): CasinoGameState {
  const humanCount = opts.humanCount ?? 1
  const botCount = opts.botCount ?? 1
  const walletAmount = opts.walletAmount ?? 1000

  const players: any[] = []
  const wallet: Record<string, number> = {}

  for (let i = 0; i < humanCount; i++) {
    const id = `human${i + 1}`
    players.push({
      id, name: `Human ${i + 1}`, seatIndex: i, stack: walletAmount, bet: 0,
      status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0,
    })
    wallet[id] = walletAmount
  }
  for (let i = 0; i < botCount; i++) {
    const id = `bot${i + 1}`
    players.push({
      id, name: `Bot ${i + 1}`, seatIndex: humanCount + i, stack: walletAmount, bet: 0,
      status: 'active', lastAction: null, isBot: true, isConnected: true, sittingOutHandCount: 0,
    })
    wallet[id] = walletAmount
  }

  return {
    phase: CasinoPhase.BjPlaceBets,
    previousPhase: undefined,
    selectedGame: 'blackjack_classic',
    gameSelectConfirmed: true,
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

function updateWallet(state: CasinoGameState, playerId: string, delta: number): CasinoGameState {
  return {
    ...state,
    wallet: {
      ...state.wallet,
      [playerId]: Math.max(0, (state.wallet[playerId] ?? 0) + delta),
    },
  }
}

function markPlayerBusted(state: CasinoGameState, playerId: string): CasinoGameState {
  return {
    ...state,
    players: state.players.map((p: any) =>
      p.id === playerId ? { ...p, status: 'busted' } : p,
    ),
  }
}

function createReducerMap(): Record<string, (...args: any[]) => CasinoGameState> {
  return {
    bjInitRound: (s, ids, rn) => bjReducers.bjInitRound(s, ids, rn),
    bjPlaceBet: (s, pid, amt) => bjReducers.bjPlaceBet(s, pid, amt),
    bjSetAllBetsPlaced: (s, v) => bjReducers.bjSetAllBetsPlaced(s, v),
    bjSetPlayerCards: (s, pid, cards, val, soft, bj) => bjReducers.bjSetPlayerCards(s, pid, cards, val, soft, bj),
    bjSetDealerCards: (s, cards, val, soft, bj) => bjReducers.bjSetDealerCards(s, cards, val, soft, bj),
    bjSetShoePenetration: (s, p) => bjReducers.bjSetShoePenetration(s, p),
    bjSetDealComplete: (s, v) => bjReducers.bjSetDealComplete(s, v),
    bjDeclineInsurance: (s, pid) => bjReducers.bjDeclineInsurance(s, pid),
    bjSetInsuranceBet: (s, pid, amt) => bjReducers.bjSetInsuranceBet(s, pid, amt),
    bjSetInsuranceComplete: (s, v) => bjReducers.bjSetInsuranceComplete(s, v),
    bjStandHand: (s, pid) => bjReducers.bjStandHand(s, pid),
    bjAdvanceTurn: (s) => bjReducers.bjAdvanceTurn(s),
    bjAdvanceHand: (s, pid) => bjReducers.bjAdvanceHand(s, pid),
    bjSetPlayerTurnsComplete: (s, v) => bjReducers.bjSetPlayerTurnsComplete(s, v),
    bjAddCardToHand: (s, pid, c, val, soft, bust) => bjReducers.bjAddCardToHand(s, pid, c, val, soft, bust),
    bjDoubleDown: (s, pid, c, val, soft, bust) => bjReducers.bjDoubleDown(s, pid, c, val, soft, bust),
    bjSurrender: (s, pid) => bjReducers.bjSurrender(s, pid),
    bjSplitHand: (s, pid, c1, c2, v1, s1, v2, s2) => bjReducers.bjSplitHand(s, pid, c1, c2, v1, s1, v2, s2),
    bjSetDealerFinalHand: (s, cards, val, soft, bust) => bjReducers.bjSetDealerFinalHand(s, cards, val, soft, bust),
    bjSetDealerTurnComplete: (s, v) => bjReducers.bjSetDealerTurnComplete(s, v),
    bjSetPlayerPayout: (s, pid, pay, net) => bjReducers.bjSetPlayerPayout(s, pid, pay, net),
    bjSetSettlementComplete: (s, v) => bjReducers.bjSetSettlementComplete(s, v),
    bjSetRoundCompleteReady: (s, v) => bjReducers.bjSetRoundCompleteReady(s, v),
    bjResetPhaseFlags: (s) => (s as any).blackjack ? bjReducers.bjResetPhaseFlags(s) : s,
    updateWallet: (s, pid, delta) => updateWallet(s, pid, delta),
    markPlayerBusted: (s, pid) => markPlayerBusted(s, pid),
    setDealerMessage: (s) => s,
    setBetError: (s) => s,
  }
}

// ── Phase map (matching casino-ruleset) ──────────────────────

const phases: Record<string, any> = {
  [CasinoPhase.BjPlaceBets]: bjPlaceBetsPhase,
  [CasinoPhase.BjDealInitial]: bjDealInitialPhase,
  [CasinoPhase.BjInsurance]: bjInsurancePhase,
  [CasinoPhase.BjPlayerTurns]: bjPlayerTurnsPhase,
  [CasinoPhase.BjDealerTurn]: bjDealerTurnPhase,
  [CasinoPhase.BjSettlement]: bjSettlementPhase,
  [CasinoPhase.BjHandComplete]: bjHandCompletePhase,
}

/**
 * Simulate VGF PhaseRunner2.checkAndTransitionIfNeeded().
 *
 * This replicates the EXACT logic from the VGF source (server.js lines 4327-4501):
 *   1. Check endIf — if true, SET_PHASE to next, return true (loop again)
 *   2. Check if phase changed — if so, run onEnd of previous, onBegin of current,
 *      SET_PHASE with same phase name, return true
 *   3. If neither, return false (stable)
 *
 * The while-loop repeats until stable. If it exceeds maxIterations, we've found
 * the infinite cascade.
 */
function simulateVgfPhaseCascade(
  initialState: CasinoGameState,
  maxIterations = 50,
): { state: CasinoGameState; iterations: number; log: string[]; looped: boolean } {
  const reducerMap = createReducerMap()
  // Simulate storage: mutable session object
  const session = {
    sessionId: 'test-session',
    state: initialState,
    members: {},
  }

  function createOnBeginCtx() {
    return {
      getState: () => session.state,
      session,
      reducerDispatcher: (name: string, ...args: any[]) => {
        const fn = reducerMap[name]
        if (fn) {
          session.state = fn(session.state, ...args)
        }
      },
    }
  }

  function createEndIfCtx() {
    return { session }
  }

  function createNextCtx() {
    return { session }
  }

  const log: string[] = []
  let iterations = 0

  // Simulate the while-loop from PhaseRunner2.checkAndTransitionIfNeeded
  let stable = false
  while (!stable && iterations < maxIterations) {
    iterations++
    const currentPhaseName = session.state.phase
    const previousPhaseName = (session.state as any).previousPhase
    const phase = phases[currentPhaseName]

    if (!phase) {
      log.push(`[${iterations}] No phase found for ${currentPhaseName}, stopping`)
      break
    }

    // Step 1: Check endIf
    if (phase.endIf) {
      const shouldEnd = phase.endIf(createEndIfCtx())
      if (shouldEnd) {
        // Determine next phase
        const next = typeof phase.next === 'function' ? phase.next(createNextCtx()) : phase.next
        log.push(`[${iterations}] ${currentPhaseName} endIf=true → ${next}`)

        // SET_PHASE reducer: previousPhase = current, phase = next
        session.state = { ...session.state, previousPhase: currentPhaseName, phase: next } as any
        continue // Loop again (return true in VGF)
      }
    }

    // Step 2: Check if phase changed (previousPhase !== currentPhase)
    if (previousPhaseName !== currentPhaseName && previousPhaseName !== undefined) {
      log.push(`[${iterations}] Phase changed: ${previousPhaseName} → ${currentPhaseName}, running onBegin`)

      // Run onBegin
      if (phase.onBegin) {
        const ctx = createOnBeginCtx()
        phase.onBegin(ctx)
      }

      // SET_PHASE with same name (sets previousPhase = currentPhase)
      session.state = { ...session.state, previousPhase: currentPhaseName } as any
      continue // Loop again (return true in VGF)
    }

    // Neither triggered — phase is stable
    log.push(`[${iterations}] ${currentPhaseName} is stable (endIf=${phase.endIf ? phase.endIf(createEndIfCtx()) : 'none'})`)
    stable = true
  }

  return {
    state: session.state,
    iterations,
    log,
    looped: iterations >= maxIterations,
  }
}

// ── Tests ────────────────────────────────────────────────────

describe('Blackjack OOM reproduction — VGF phase cascade simulation', () => {

  beforeEach(() => {
    // Reset shoe for deal phases
    mockShoe = [
      card('10'), card('J'), card('Q'), card('K'),
      card('9'), card('8'), card('7'), card('6'),
      card('5'), card('4'), card('3'), card('2'),
      card('A'), card('10'), card('J'), card('Q'),
      card('K'), card('9'), card('8'), card('7'),
      card('6'), card('5'), card('4'), card('3'),
    ]
  })

  it('first round: LOBBY → BJ_PLACE_BETS should stabilise (no BJ state yet)', () => {
    // Simulate entering BJ_PLACE_BETS for the first time (blackjack is null)
    const state = createTestState()
    // Set previousPhase to LOBBY to simulate the transition
    ;(state as any).previousPhase = 'LOBBY'

    const result = simulateVgfPhaseCascade(state, 50)

    // Should NOT loop — should stabilise after onBegin runs
    expect(result.looped).toBe(false)
    expect(result.iterations).toBeLessThan(10)
    // Should be waiting at BJ_PLACE_BETS for human to bet
    expect(result.state.phase).toBe(CasinoPhase.BjPlaceBets)
    expect(result.state.blackjack?.allBetsPlaced).toBe(false)
  })

  it('second round: BJ_HAND_COMPLETE waits for human "Next Round" tap (fix applied)', () => {
    // Start from BJ_HAND_COMPLETE where settlement has just finished.
    // BJ_HAND_COMPLETE's onBegin should reset phase flags but NOT set roundCompleteReady
    // when humans are present — waits for the "Next Round" button tap.
    // The cascade should stabilise at HAND_COMPLETE (not cascade further).
    const state = createTestState()
    ;(state as any).blackjack = {
      allBetsPlaced: true,
      dealComplete: true,
      insuranceComplete: true,
      playerTurnsComplete: true,
      dealerTurnComplete: true,
      settlementComplete: true,
      roundCompleteReady: false, // Not yet set — onBegin hasn't run
      roundNumber: 1,
      shoePenetration: 50,
      playerStates: [
        { playerId: 'human1', hands: [{ bet: 10, cards: [card('10'), card('J')], value: 20, isSoft: false, stood: true, busted: false, isBlackjack: false, doubled: false }], activeHandIndex: 0, insuranceBet: 0, insuranceResolved: false, surrendered: false, totalPayout: 20, roundResult: 10 },
        { playerId: 'bot1', hands: [{ bet: 10, cards: [card('9'), card('8')], value: 17, isSoft: false, stood: true, busted: false, isBlackjack: false, doubled: false }], activeHandIndex: 0, insuranceBet: 0, insuranceResolved: false, surrendered: false, totalPayout: 0, roundResult: -10 },
      ],
      dealerHand: { cards: [card('K'), card('7')], holeCardRevealed: true, value: 17, isSoft: false, busted: false, isBlackjack: false },
      turnOrder: ['human1', 'bot1'],
      currentTurnIndex: 2,
      config: { minBet: 10, maxBet: 500, dealerHitsSoft17: true, numberOfDecks: 6, reshuffleThreshold: 0.25, blackjackPaysRatio: 1.5, insuranceEnabled: true, surrenderEnabled: true, splitEnabled: true, maxSplits: 3 },
    }

    // Phase is BJ_HAND_COMPLETE, previous is BJ_SETTLEMENT — onBegin needs to run
    ;(state as any).phase = CasinoPhase.BjHandComplete
    ;(state as any).previousPhase = CasinoPhase.BjSettlement

    const result = simulateVgfPhaseCascade(state, 50)

    if (result.looped) {
      console.log('OOM BUG STILL PRESENT! Phase cascade log:')
      result.log.slice(0, 20).forEach(l => console.log(l))
      console.log(`... (${result.iterations} iterations total)`)
    }
    expect(result.looped).toBe(false)
    // Should stabilise at BJ_HAND_COMPLETE waiting for human "Next Round" tap
    expect(result.state.phase).toBe(CasinoPhase.BjHandComplete)
    // Phase flags should have been reset by onBegin
    expect(result.state.blackjack?.allBetsPlaced).toBe(false)
    // roundCompleteReady should still be false — waiting for human
    expect(result.state.blackjack?.roundCompleteReady).toBe(false)
  })

  it('WITHOUT fix: stale flags at BJ_PLACE_BETS cause infinite cascade', () => {
    // This test simulates what happens WITHOUT the fix: entering BJ_PLACE_BETS
    // with stale flags still set from the previous round. This SHOULD loop
    // infinitely (we cap at 50 iterations to prove it).
    const state = createTestState()
    ;(state as any).blackjack = {
      allBetsPlaced: true,  // Stale! Should have been reset
      dealComplete: true,
      insuranceComplete: true,
      playerTurnsComplete: true,
      dealerTurnComplete: true,
      settlementComplete: true,
      roundCompleteReady: true,
      roundNumber: 1,
      shoePenetration: 50,
      playerStates: [
        { playerId: 'human1', hands: [{ bet: 10, cards: [card('10'), card('J')], value: 20, isSoft: false, stood: true, busted: false, isBlackjack: false, doubled: false }], activeHandIndex: 0, insuranceBet: 0, insuranceResolved: false, surrendered: false, totalPayout: 20, roundResult: 10 },
        { playerId: 'bot1', hands: [{ bet: 10, cards: [card('9'), card('8')], value: 17, isSoft: false, stood: true, busted: false, isBlackjack: false, doubled: false }], activeHandIndex: 0, insuranceBet: 0, insuranceResolved: false, surrendered: false, totalPayout: 0, roundResult: -10 },
      ],
      dealerHand: { cards: [card('K'), card('7')], holeCardRevealed: true, value: 17, isSoft: false, busted: false, isBlackjack: false },
      turnOrder: ['human1', 'bot1'],
      currentTurnIndex: 2,
      config: { minBet: 10, maxBet: 500, dealerHitsSoft17: true, numberOfDecks: 6, reshuffleThreshold: 0.25, blackjackPaysRatio: 1.5, insuranceEnabled: true, surrenderEnabled: true, splitEnabled: true, maxSplits: 3 },
    }

    // Simulate the BUG scenario: already at BJ_PLACE_BETS with stale flags
    ;(state as any).phase = CasinoPhase.BjPlaceBets
    ;(state as any).previousPhase = CasinoPhase.BjHandComplete

    const result = simulateVgfPhaseCascade(state, 50)

    // This SHOULD loop because the fix (bjResetPhaseFlags) runs in HAND_COMPLETE,
    // not in PLACE_BETS. By the time we're here, the damage is done.
    expect(result.looped).toBe(true)
    expect(result.iterations).toBe(50)
  })

  it('all-bot table should NOT cascade infinitely', () => {
    // All players are bots — allBetsPlaced gets set in onBegin
    // This means every phase's onBegin sets its endIf flag, creating a cascade.
    // The cascade should stop at HAND_COMPLETE → next returning GAME_SELECT
    // because there are no active humans.
    const state = createTestState({ humanCount: 0, botCount: 2 })
    ;(state as any).previousPhase = 'LOBBY'

    const result = simulateVgfPhaseCascade(state, 100)

    // Should NOT loop infinitely
    if (result.looped) {
      console.log('All-bot cascade log:')
      result.log.slice(0, 30).forEach(l => console.log(l))
    }
    expect(result.looped).toBe(false)
    // Should end at GAME_SELECT since no humans
    expect(result.state.phase).toBe(CasinoPhase.GameSelect)
  })
}, 5000)

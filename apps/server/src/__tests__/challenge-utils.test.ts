import { describe, it, expect, beforeEach } from 'vitest'
import * as playerStore from '../persistence/player-store.js'
import * as challengeStore from '../persistence/challenge-store.js'
import { createEmptyPersistentStats } from '@weekend-casino/shared'
import {
  updateChallengeProgressIfPersistent,
  emitGameNightWonEvent,
  _resetSessionTracker,
  _getGamesPlayedForPlayer,
} from '../persistence/challenge-utils.js'
import { createInitialCasinoState } from '../ruleset/casino-state.js'
import type { CasinoGameState, CasinoPlayer } from '@weekend-casino/shared'

function makePlayer(overrides: Partial<CasinoPlayer> = {}): CasinoPlayer {
  return {
    id: 'p1',
    name: 'Alice',
    avatarId: 'default',
    seatIndex: 0,
    isHost: true,
    isConnected: true,
    isReady: true,
    currentGameStatus: 'active',
    sittingOutHandCount: 0,
    stack: 10000,
    bet: 0,
    status: 'active',
    lastAction: null,
    isBot: false,
    persistentId: 'persistent-p1',
    ...overrides,
  }
}

function makeBotPlayer(overrides: Partial<CasinoPlayer> = {}): CasinoPlayer {
  return makePlayer({ id: 'bot1', name: 'Bot', isBot: true, persistentId: undefined, ...overrides })
}

function makeCtx(state: CasinoGameState) {
  const dispatchCalls: any[][] = []
  return {
    getState: () => state,
    dispatch: (...args: any[]) => { dispatchCalls.push(args) },
    reducerDispatcher: (...args: any[]) => { dispatchCalls.push(args) },
    dispatchCalls,
  }
}

beforeEach(async () => {
  // Reset the session tracker
  _resetSessionTracker()
  // Flush all data in the mock Redis (ioredis-mock instances share memory)
  const { getRedisClient } = await import('../persistence/redis-client.js')
  const redis = await getRedisClient()
  await redis.flushall()
})

/** Helper to set up a player profile and assign challenges in fresh Redis. */
async function setupPlayerWithChallenges(): Promise<void> {
  await playerStore.getOrCreateByDeviceToken('persistent-p1', 'device_token', 'Alice')
  await challengeStore.assignChallenges('persistent-p1', createEmptyPersistentStats())
}

describe('updateChallengeProgressIfPersistent', () => {
  it('emits hand_complete for all persistent players', async () => {
    await setupPlayerWithChallenges()

    const state = createInitialCasinoState({
      selectedGame: 'blackjack_classic' as any,
      players: [makePlayer(), makeBotPlayer()],
      blackjack: {
        playerStates: [{ playerId: 'p1', roundResult: 0, hands: [], activeHandIndex: 0, insuranceBet: 0, insuranceResolved: false, surrendered: false, totalPayout: 0 }],
        dealerHand: { cards: [], holeCardRevealed: false, value: 0, isSoft: false, busted: false, isBlackjack: false },
        turnOrder: ['p1'],
        currentTurnIndex: 0,
        allBetsPlaced: true, dealComplete: true, insuranceComplete: true,
        playerTurnsComplete: true, dealerTurnComplete: true, settlementComplete: true,
        roundCompleteReady: true, roundNumber: 1, shoePenetration: 50,
        config: { minBet: 10, maxBet: 500, dealerHitsSoft17: false, numberOfDecks: 6, reshuffleThreshold: 0.75, blackjackPaysRatio: 1.5, insuranceEnabled: true, surrenderEnabled: true, splitEnabled: true, maxSplits: 3 },
      } as any,
    })

    const ctx = makeCtx(state)
    await updateChallengeProgressIfPersistent(ctx)

    // Should have dispatched setChallengeProgress at least once (bot skipped)
    const challengeDispatches = ctx.dispatchCalls.filter(
      (args) => args[0] === 'setChallengeProgress',
    )
    expect(challengeDispatches.length).toBeGreaterThanOrEqual(1)
    for (const call of challengeDispatches) {
      expect(call[1]).toBe('p1')
    }
  })

  it('emits hand_won for players with positive roundResult (blackjack)', async () => {
    await setupPlayerWithChallenges()

    const state = createInitialCasinoState({
      selectedGame: 'blackjack_classic' as any,
      players: [makePlayer()],
      blackjack: {
        playerStates: [{ playerId: 'p1', roundResult: 50, hands: [], activeHandIndex: 0, insuranceBet: 0, insuranceResolved: false, surrendered: false, totalPayout: 150 }],
        dealerHand: { cards: [], holeCardRevealed: true, value: 17, isSoft: false, busted: false, isBlackjack: false },
        turnOrder: ['p1'],
        currentTurnIndex: 0,
        allBetsPlaced: true, dealComplete: true, insuranceComplete: true,
        playerTurnsComplete: true, dealerTurnComplete: true, settlementComplete: true,
        roundCompleteReady: true, roundNumber: 1, shoePenetration: 50,
        config: { minBet: 10, maxBet: 500, dealerHitsSoft17: false, numberOfDecks: 6, reshuffleThreshold: 0.75, blackjackPaysRatio: 1.5, insuranceEnabled: true, surrenderEnabled: true, splitEnabled: true, maxSplits: 3 },
      } as any,
    })

    const ctx = makeCtx(state)
    await updateChallengeProgressIfPersistent(ctx)

    // Should dispatch for hand_complete + hand_won (at least 2)
    const challengeDispatches = ctx.dispatchCalls.filter(
      (args) => args[0] === 'setChallengeProgress',
    )
    expect(challengeDispatches.length).toBeGreaterThanOrEqual(2)
  })

  it('updates persistent stats (totalHandsPlayed)', async () => {
    await setupPlayerWithChallenges()

    const state = createInitialCasinoState({
      selectedGame: 'roulette' as any,
      players: [makePlayer()],
      roulette: {
        winningNumber: 7, winningColour: 'red', bets: [],
        players: [{ playerId: 'p1', totalBet: 100, totalPayout: 0, roundResult: -100, betsConfirmed: true, favouriteNumbers: [] }],
        history: [], spinState: 'stopped', nearMisses: [],
        allBetsPlaced: true, bettingClosed: true, spinComplete: true,
        resultAnnounced: true, payoutComplete: true, roundCompleteReady: true,
        roundNumber: 1, config: { minBet: 10, maxInsideBet: 100, maxOutsideBet: 500, maxTotalBet: 1000, laPartage: false },
      } as any,
    })

    const ctx = makeCtx(state)
    await updateChallengeProgressIfPersistent(ctx)

    const profile = await playerStore.getProfile('persistent-p1')
    expect(profile).not.toBeNull()
    expect(profile!.stats.totalHandsPlayed).toBe(1)
  })

  it('adds XP (10 base + 20 bonus for win)', async () => {
    await setupPlayerWithChallenges()

    const state = createInitialCasinoState({
      selectedGame: 'roulette' as any,
      players: [makePlayer()],
      roulette: {
        winningNumber: 7, winningColour: 'red', bets: [],
        players: [{ playerId: 'p1', totalBet: 100, totalPayout: 350, roundResult: 250, betsConfirmed: true, favouriteNumbers: [] }],
        history: [], spinState: 'stopped', nearMisses: [],
        allBetsPlaced: true, bettingClosed: true, spinComplete: true,
        resultAnnounced: true, payoutComplete: true, roundCompleteReady: true,
        roundNumber: 1, config: { minBet: 10, maxInsideBet: 100, maxOutsideBet: 500, maxTotalBet: 1000, laPartage: false },
      } as any,
    })

    const ctx = makeCtx(state)
    await updateChallengeProgressIfPersistent(ctx)

    const profile = await playerStore.getProfile('persistent-p1')
    // 10 base + 20 bonus = 30 XP for a win
    expect(profile!.xp).toBe(30)
  })

  it('adds only base XP (10) for a loss', async () => {
    await setupPlayerWithChallenges()

    const state = createInitialCasinoState({
      selectedGame: 'roulette' as any,
      players: [makePlayer()],
      roulette: {
        winningNumber: 7, winningColour: 'red', bets: [],
        players: [{ playerId: 'p1', totalBet: 100, totalPayout: 0, roundResult: -100, betsConfirmed: true, favouriteNumbers: [] }],
        history: [], spinState: 'stopped', nearMisses: [],
        allBetsPlaced: true, bettingClosed: true, spinComplete: true,
        resultAnnounced: true, payoutComplete: true, roundCompleteReady: true,
        roundNumber: 1, config: { minBet: 10, maxInsideBet: 100, maxOutsideBet: 500, maxTotalBet: 1000, laPartage: false },
      } as any,
    })

    const ctx = makeCtx(state)
    await updateChallengeProgressIfPersistent(ctx)

    const profile = await playerStore.getProfile('persistent-p1')
    // 10 base XP only (no win bonus)
    expect(profile!.xp).toBe(10)
  })

  it('tracks unique games played per session', async () => {
    await setupPlayerWithChallenges()

    const state1 = createInitialCasinoState({
      selectedGame: 'roulette' as any,
      players: [makePlayer()],
      roulette: {
        winningNumber: 7, winningColour: 'red', bets: [],
        players: [{ playerId: 'p1', totalBet: 0, totalPayout: 0, roundResult: 0, betsConfirmed: true, favouriteNumbers: [] }],
        history: [], spinState: 'stopped', nearMisses: [],
        allBetsPlaced: true, bettingClosed: true, spinComplete: true,
        resultAnnounced: true, payoutComplete: true, roundCompleteReady: true,
        roundNumber: 1, config: { minBet: 10, maxInsideBet: 100, maxOutsideBet: 500, maxTotalBet: 1000, laPartage: false },
      } as any,
    })

    await updateChallengeProgressIfPersistent(makeCtx(state1))
    expect(_getGamesPlayedForPlayer('persistent-p1')).toEqual(['roulette'])

    const state2 = createInitialCasinoState({
      selectedGame: 'blackjack_classic' as any,
      players: [makePlayer()],
      blackjack: {
        playerStates: [{ playerId: 'p1', roundResult: 0, hands: [], activeHandIndex: 0, insuranceBet: 0, insuranceResolved: false, surrendered: false, totalPayout: 0 }],
        dealerHand: { cards: [], holeCardRevealed: false, value: 0, isSoft: false, busted: false, isBlackjack: false },
        turnOrder: ['p1'], currentTurnIndex: 0,
        allBetsPlaced: true, dealComplete: true, insuranceComplete: true,
        playerTurnsComplete: true, dealerTurnComplete: true, settlementComplete: true,
        roundCompleteReady: true, roundNumber: 1, shoePenetration: 50,
        config: { minBet: 10, maxBet: 500, dealerHitsSoft17: false, numberOfDecks: 6, reshuffleThreshold: 0.75, blackjackPaysRatio: 1.5, insuranceEnabled: true, surrenderEnabled: true, splitEnabled: true, maxSplits: 3 },
      } as any,
    })

    await updateChallengeProgressIfPersistent(makeCtx(state2))
    const games = _getGamesPlayedForPlayer('persistent-p1')
    expect(games).toContain('roulette')
    expect(games).toContain('blackjack_classic')
    expect(games).toHaveLength(2)
  })

  it('updates win streak on wins and resets on losses', async () => {
    await setupPlayerWithChallenges()

    const winState = createInitialCasinoState({
      selectedGame: 'roulette' as any,
      players: [makePlayer()],
      roulette: {
        winningNumber: 7, winningColour: 'red', bets: [],
        players: [{ playerId: 'p1', totalBet: 100, totalPayout: 350, roundResult: 250, betsConfirmed: true, favouriteNumbers: [] }],
        history: [], spinState: 'stopped', nearMisses: [],
        allBetsPlaced: true, bettingClosed: true, spinComplete: true,
        resultAnnounced: true, payoutComplete: true, roundCompleteReady: true,
        roundNumber: 1, config: { minBet: 10, maxInsideBet: 100, maxOutsideBet: 500, maxTotalBet: 1000, laPartage: false },
      } as any,
    })

    await updateChallengeProgressIfPersistent(makeCtx(winState))
    let profile = await playerStore.getProfile('persistent-p1')
    expect(profile!.stats.currentWinStreak).toBe(1)

    await updateChallengeProgressIfPersistent(makeCtx(winState))
    profile = await playerStore.getProfile('persistent-p1')
    expect(profile!.stats.currentWinStreak).toBe(2)

    const loseState = createInitialCasinoState({
      selectedGame: 'roulette' as any,
      players: [makePlayer()],
      roulette: {
        winningNumber: 7, winningColour: 'red', bets: [],
        players: [{ playerId: 'p1', totalBet: 100, totalPayout: 0, roundResult: -100, betsConfirmed: true, favouriteNumbers: [] }],
        history: [], spinState: 'stopped', nearMisses: [],
        allBetsPlaced: true, bettingClosed: true, spinComplete: true,
        resultAnnounced: true, payoutComplete: true, roundCompleteReady: true,
        roundNumber: 1, config: { minBet: 10, maxInsideBet: 100, maxOutsideBet: 500, maxTotalBet: 1000, laPartage: false },
      } as any,
    })

    await updateChallengeProgressIfPersistent(makeCtx(loseState))
    profile = await playerStore.getProfile('persistent-p1')
    expect(profile!.stats.currentWinStreak).toBe(0)
  })

  it('skips bots and players without persistentId', async () => {
    const state = createInitialCasinoState({
      selectedGame: 'roulette' as any,
      players: [
        makeBotPlayer(),
        makePlayer({ id: 'p2', persistentId: undefined }),
      ],
      roulette: {
        winningNumber: 7, winningColour: 'red', bets: [],
        players: [],
        history: [], spinState: 'stopped', nearMisses: [],
        allBetsPlaced: true, bettingClosed: true, spinComplete: true,
        resultAnnounced: true, payoutComplete: true, roundCompleteReady: true,
        roundNumber: 1, config: { minBet: 10, maxInsideBet: 100, maxOutsideBet: 500, maxTotalBet: 1000, laPartage: false },
      } as any,
    })

    const ctx = makeCtx(state)
    await updateChallengeProgressIfPersistent(ctx)

    expect(ctx.dispatchCalls.length).toBe(0)
  })

  it('does not break game flow on error (non-critical)', async () => {
    const state = createInitialCasinoState({
      selectedGame: null,
      players: [makePlayer()],
    })

    const ctx = makeCtx(state)
    await expect(updateChallengeProgressIfPersistent(ctx)).resolves.not.toThrow()
  })

  it('detects BJC winners via winnerIds', async () => {
    await setupPlayerWithChallenges()

    const state = createInitialCasinoState({
      selectedGame: 'blackjack_competitive' as any,
      players: [makePlayer()],
      blackjackCompetitive: {
        playerStates: [{ playerId: 'p1', hand: { cards: [], stood: true, busted: false, isBlackjack: false, doubled: false, bet: 100, value: 20, isSoft: false }, turnComplete: true }],
        pot: 200,
        turnOrder: ['p1'],
        currentTurnIndex: 0,
        allAntesPlaced: true, dealComplete: true, playerTurnsComplete: true,
        showdownComplete: true, settlementComplete: true, roundCompleteReady: true,
        roundNumber: 1, shoePenetration: 50, anteAmount: 100,
        winnerIds: ['p1'],
        resultMessage: 'p1 wins!',
      } as any,
    })

    const ctx = makeCtx(state)
    await updateChallengeProgressIfPersistent(ctx)

    // Should dispatch for hand_complete + hand_won (at least 2)
    const challengeDispatches = ctx.dispatchCalls.filter(
      (args) => args[0] === 'setChallengeProgress',
    )
    expect(challengeDispatches.length).toBeGreaterThanOrEqual(2)
  })

  it('detects TCP winners via roundResult', async () => {
    await setupPlayerWithChallenges()

    const state = createInitialCasinoState({
      selectedGame: 'three_card_poker' as any,
      players: [makePlayer()],
      threeCardPoker: {
        playerHands: [{
          playerId: 'p1', cards: [], anteBet: 100, playBet: 100, pairPlusBet: 0,
          decision: 'play', handRank: 'pair', handStrength: 200,
          anteBonus: 0, pairPlusPayout: 0, totalPayout: 400, roundResult: 200,
        }],
        dealerHand: { cards: [], revealed: true, handRank: 'high_card', handStrength: 50 },
        dealerQualifies: true,
        allAntesPlaced: true, dealComplete: true, allDecisionsMade: true,
        dealerRevealed: true, payoutComplete: true, roundCompleteReady: true,
        roundNumber: 1,
        config: { minAnte: 10, maxAnte: 500, maxPairPlus: 100 },
      } as any,
    })

    const ctx = makeCtx(state)
    await updateChallengeProgressIfPersistent(ctx)

    const profile = await playerStore.getProfile('persistent-p1')
    expect(profile!.stats.totalHandsWon).toBe(1)
    expect(profile!.stats.totalChipsWon).toBe(200)
  })

  it('records totalChipsLost on a loss', async () => {
    await setupPlayerWithChallenges()

    const state = createInitialCasinoState({
      selectedGame: 'roulette' as any,
      players: [makePlayer()],
      roulette: {
        winningNumber: 7, winningColour: 'red', bets: [],
        players: [{ playerId: 'p1', totalBet: 100, totalPayout: 0, roundResult: -100, betsConfirmed: true, favouriteNumbers: [] }],
        history: [], spinState: 'stopped', nearMisses: [],
        allBetsPlaced: true, bettingClosed: true, spinComplete: true,
        resultAnnounced: true, payoutComplete: true, roundCompleteReady: true,
        roundNumber: 1, config: { minBet: 10, maxInsideBet: 100, maxOutsideBet: 500, maxTotalBet: 1000, laPartage: false },
      } as any,
    })

    const ctx = makeCtx(state)
    await updateChallengeProgressIfPersistent(ctx)

    const profile = await playerStore.getProfile('persistent-p1')
    expect(profile!.stats.totalChipsLost).toBe(100)
    expect(profile!.stats.totalHandsWon).toBe(0)
  })
})

describe('emitGameNightWonEvent', () => {
  it('emits game_night_won for the champion', async () => {
    await setupPlayerWithChallenges()

    const state = createInitialCasinoState({
      players: [makePlayer()],
      gameNight: {
        active: true, roundLimit: 3, roundsPlayed: 3,
        scores: { p1: 300 }, gameLineup: ['roulette' as any],
        currentGameIndex: 0, roundsPerGame: 3, playerScores: {},
        gameResults: [], theme: 'classic' as any, championId: 'p1',
        startedAt: Date.now(), leaderboardReady: true, championReady: false,
        achievements: [], setupConfirmed: true,
      } as any,
    })

    const ctx = makeCtx(state)
    // Should not throw
    await expect(emitGameNightWonEvent(ctx)).resolves.not.toThrow()
  })

  it('updates gameNightWins stat for champion', async () => {
    await setupPlayerWithChallenges()

    const state = createInitialCasinoState({
      players: [makePlayer()],
      gameNight: {
        active: true, roundLimit: 3, roundsPlayed: 3,
        scores: { p1: 300 }, gameLineup: ['roulette' as any],
        currentGameIndex: 0, roundsPerGame: 3, playerScores: {},
        gameResults: [], theme: 'classic' as any, championId: 'p1',
        startedAt: Date.now(), leaderboardReady: true, championReady: false,
        achievements: [], setupConfirmed: true,
      } as any,
    })

    await emitGameNightWonEvent(makeCtx(state))

    const profile = await playerStore.getProfile('persistent-p1')
    expect(profile!.stats.gameNightWins).toBe(1)
  })

  it('awards bonus XP for winning Game Night', async () => {
    await setupPlayerWithChallenges()

    const state = createInitialCasinoState({
      players: [makePlayer()],
      gameNight: {
        active: true, roundLimit: 3, roundsPlayed: 3,
        scores: { p1: 300 }, gameLineup: ['roulette' as any],
        currentGameIndex: 0, roundsPerGame: 3, playerScores: {},
        gameResults: [], theme: 'classic' as any, championId: 'p1',
        startedAt: Date.now(), leaderboardReady: true, championReady: false,
        achievements: [], setupConfirmed: true,
      } as any,
    })

    await emitGameNightWonEvent(makeCtx(state))

    const profile = await playerStore.getProfile('persistent-p1')
    expect(profile!.xp).toBe(50) // GN win bonus
  })

  it('skips if no championId set', async () => {
    const state = createInitialCasinoState({
      players: [makePlayer()],
      gameNight: {
        active: true, roundLimit: 3, roundsPlayed: 3,
        scores: {}, gameLineup: ['roulette' as any],
        currentGameIndex: 0, roundsPerGame: 3, playerScores: {},
        gameResults: [], theme: 'classic' as any, championId: null,
        startedAt: Date.now(), leaderboardReady: true, championReady: false,
        achievements: [], setupConfirmed: true,
      } as any,
    })

    const ctx = makeCtx(state)
    await emitGameNightWonEvent(ctx)

    expect(ctx.dispatchCalls.length).toBe(0)
  })

  it('skips if champion is a bot', async () => {
    const state = createInitialCasinoState({
      players: [makeBotPlayer({ id: 'bot1' })],
      gameNight: {
        active: true, roundLimit: 3, roundsPlayed: 3,
        scores: { bot1: 300 }, gameLineup: ['roulette' as any],
        currentGameIndex: 0, roundsPerGame: 3, playerScores: {},
        gameResults: [], theme: 'classic' as any, championId: 'bot1',
        startedAt: Date.now(), leaderboardReady: true, championReady: false,
        achievements: [], setupConfirmed: true,
      } as any,
    })

    const ctx = makeCtx(state)
    await emitGameNightWonEvent(ctx)

    expect(ctx.dispatchCalls.length).toBe(0)
  })
})

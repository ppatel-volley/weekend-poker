import { describe, it, expect } from 'vitest'
import type {
  CasinoGameState,
  HoldemGameState,
  FiveCardDrawGameState,
  BlackjackGameState,
  BlackjackCompetitiveGameState,
  RouletteGameState,
  ThreeCardPokerGameState,
  CrapsGameState,
  GameNightGameState,
  QuickPlayConfig,
  ProgressiveJackpot,
} from '../types/casino-game-state.js'
import { CasinoPhase } from '../types/casino-phases.js'
import { createSessionStats } from '../types/casino-session-stats.js'

describe('CasinoGameState structure', () => {
  it('should have index signature for VGF compatibility', () => {
    const state: CasinoGameState = {
      [Symbol.toStringTag]: 'CasinoGameState',
      phase: CasinoPhase.Lobby,
      selectedGame: null,
      gameSelectConfirmed: false,
      gameChangeRequested: false,
      gameChangeVotes: {},
      wallet: {},
      players: [],
      dealerCharacterId: 'vincent',
      blindLevel: { level: 1, smallBlind: 10, bigBlind: 20, minBuyIn: 200, maxBuyIn: 2000 },
      handNumber: 0,
      dealerIndex: 0,
      lobbyReady: false,
      dealerMessage: null,
      ttsQueue: [],
      sessionStats: createSessionStats(Date.now()),
    }
    expect(state).toBeDefined()
  })

  it('should have phase as required field', () => {
    const state: CasinoGameState = {
      phase: CasinoPhase.Lobby,
      selectedGame: null,
      gameSelectConfirmed: false,
      gameChangeRequested: false,
      gameChangeVotes: {},
      wallet: {},
      players: [],
      dealerCharacterId: 'vincent',
      blindLevel: { level: 1, smallBlind: 10, bigBlind: 20, minBuyIn: 200, maxBuyIn: 2000 },
      handNumber: 0,
      dealerIndex: 0,
      lobbyReady: false,
      dealerMessage: null,
      ttsQueue: [],
      sessionStats: createSessionStats(Date.now()),
    }
    expect(state.phase).toBe(CasinoPhase.Lobby)
  })

  it('should allow previousPhase as optional field', () => {
    const state: CasinoGameState = {
      phase: CasinoPhase.PreFlopBetting,
      previousPhase: CasinoPhase.DealingHoleCards,
      selectedGame: 'holdem',
      gameSelectConfirmed: true,
      gameChangeRequested: false,
      gameChangeVotes: {},
      wallet: { 'player-1': 10_000 },
      players: [],
      dealerCharacterId: 'vincent',
      blindLevel: { level: 1, smallBlind: 10, bigBlind: 20, minBuyIn: 200, maxBuyIn: 2000 },
      handNumber: 1,
      dealerIndex: 0,
      lobbyReady: true,
      dealerMessage: 'Deal cards',
      ttsQueue: [],
      sessionStats: createSessionStats(Date.now()),
    }
    expect(state.previousPhase).toBe(CasinoPhase.DealingHoleCards)
  })

  it('should support multi-game control fields', () => {
    const state: CasinoGameState = {
      phase: CasinoPhase.GameSelect,
      selectedGame: 'holdem',
      gameSelectConfirmed: true,
      gameChangeRequested: false,
      gameChangeVotes: {
        'player-1': 'roulette',
        'player-2': 'craps',
      },
      wallet: {},
      players: [],
      dealerCharacterId: 'vincent',
      blindLevel: { level: 1, smallBlind: 10, bigBlind: 20, minBuyIn: 200, maxBuyIn: 2000 },
      handNumber: 0,
      dealerIndex: 0,
      lobbyReady: false,
      dealerMessage: null,
      ttsQueue: [],
      sessionStats: createSessionStats(Date.now()),
    }
    expect(state.gameChangeVotes['player-1']).toBe('roulette')
    expect(state.gameChangeVotes['player-2']).toBe('craps')
  })

  it('should support optional v1 game sub-states', () => {
    const state: CasinoGameState = {
      phase: CasinoPhase.PreFlopBetting,
      selectedGame: 'holdem',
      gameSelectConfirmed: true,
      gameChangeRequested: false,
      gameChangeVotes: {},
      wallet: { 'player-1': 10_000 },
      players: [],
      dealerCharacterId: 'vincent',
      blindLevel: { level: 1, smallBlind: 10, bigBlind: 20, minBuyIn: 200, maxBuyIn: 2000 },
      handNumber: 1,
      dealerIndex: 0,
      lobbyReady: true,
      dealerMessage: null,
      ttsQueue: [],
      sessionStats: createSessionStats(Date.now()),
      holdem: {} as HoldemGameState,
      fiveCardDraw: {} as FiveCardDrawGameState,
      blackjack: {} as BlackjackGameState,
      blackjackCompetitive: {} as BlackjackCompetitiveGameState,
    }
    expect(state.holdem).toBeDefined()
    expect(state.fiveCardDraw).toBeDefined()
  })

  it('should support optional v2.0 game sub-states', () => {
    const state: CasinoGameState = {
      phase: CasinoPhase.RoulettePlaceBets,
      selectedGame: 'roulette',
      gameSelectConfirmed: true,
      gameChangeRequested: false,
      gameChangeVotes: {},
      wallet: { 'player-1': 10_000 },
      players: [],
      dealerCharacterId: 'vincent',
      blindLevel: { level: 1, smallBlind: 10, bigBlind: 20, minBuyIn: 200, maxBuyIn: 2000 },
      handNumber: 1,
      dealerIndex: 0,
      lobbyReady: true,
      dealerMessage: null,
      ttsQueue: [],
      sessionStats: createSessionStats(Date.now()),
      roulette: {} as RouletteGameState,
      threeCardPoker: {} as ThreeCardPokerGameState,
    }
    expect(state.roulette).toBeDefined()
    expect(state.threeCardPoker).toBeDefined()
  })

  it('should support optional v2.1 game sub-states', () => {
    const state: CasinoGameState = {
      phase: CasinoPhase.CrapsNewShooter,
      selectedGame: 'craps',
      gameSelectConfirmed: true,
      gameChangeRequested: false,
      gameChangeVotes: {},
      wallet: { 'player-1': 10_000 },
      players: [],
      dealerCharacterId: 'vincent',
      blindLevel: { level: 1, smallBlind: 10, bigBlind: 20, minBuyIn: 200, maxBuyIn: 2000 },
      handNumber: 1,
      dealerIndex: 0,
      lobbyReady: true,
      dealerMessage: null,
      ttsQueue: [],
      sessionStats: createSessionStats(Date.now()),
      craps: {} as CrapsGameState,
    }
    expect(state.craps).toBeDefined()
  })

  it('should support optional meta-game sub-states', () => {
    const state: CasinoGameState = {
      phase: CasinoPhase.GnSetup,
      selectedGame: null,
      gameSelectConfirmed: false,
      gameChangeRequested: false,
      gameChangeVotes: {},
      wallet: {},
      players: [],
      dealerCharacterId: 'vincent',
      blindLevel: { level: 1, smallBlind: 10, bigBlind: 20, minBuyIn: 200, maxBuyIn: 2000 },
      handNumber: 0,
      dealerIndex: 0,
      lobbyReady: false,
      dealerMessage: null,
      ttsQueue: [],
      sessionStats: createSessionStats(Date.now()),
      gameNight: {} as GameNightGameState,
      quickPlay: { enabled: true, rotationIntervalMs: 30000 } as QuickPlayConfig,
      jackpot: { currentAmount: 100000, lastWinAmount: 50000, lastWinPlayerName: 'Alice' } as ProgressiveJackpot,
    }
    expect(state.gameNight).toBeDefined()
    expect(state.quickPlay).toBeDefined()
    expect(state.jackpot).toBeDefined()
  })

  it('should support optional video playback', () => {
    const state: CasinoGameState = {
      phase: CasinoPhase.Lobby,
      selectedGame: null,
      gameSelectConfirmed: false,
      gameChangeRequested: false,
      gameChangeVotes: {},
      wallet: {},
      players: [],
      dealerCharacterId: 'vincent',
      blindLevel: { level: 1, smallBlind: 10, bigBlind: 20, minBuyIn: 200, maxBuyIn: 2000 },
      handNumber: 0,
      dealerIndex: 0,
      lobbyReady: false,
      dealerMessage: null,
      ttsQueue: [],
      sessionStats: createSessionStats(Date.now()),
      videoPlayback: {
        assetKey: 'lobby-intro',
        mode: 'full_screen',
        startedAt: Date.now(),
        durationMs: 5000,
        blocking: true,
        skippable: true,
        skipDelayMs: 2000,
        priority: 'high',
        complete: false,
      },
      backgroundVideo: {
        assetKey: 'lobby-ambient',
        looping: true,
        active: true,
      },
    }
    expect(state.videoPlayback?.assetKey).toBe('lobby-intro')
    expect(state.backgroundVideo?.looping).toBe(true)
  })

  it('should support optional bet error state', () => {
    const state: CasinoGameState = {
      phase: CasinoPhase.PreFlopBetting,
      selectedGame: 'holdem',
      gameSelectConfirmed: true,
      gameChangeRequested: false,
      gameChangeVotes: {},
      wallet: { 'player-1': 10_000 },
      players: [],
      dealerCharacterId: 'vincent',
      blindLevel: { level: 1, smallBlind: 10, bigBlind: 20, minBuyIn: 200, maxBuyIn: 2000 },
      handNumber: 1,
      dealerIndex: 0,
      lobbyReady: true,
      dealerMessage: null,
      ttsQueue: [],
      sessionStats: createSessionStats(Date.now()),
      betError: {
        playerId: 'player-1',
        message: 'Insufficient balance',
        clearedAt: Date.now() + 3000,
      },
    }
    expect(state.betError?.message).toBe('Insufficient balance')
  })
})

describe('Game sub-state placeholder types', () => {
  it('HoldemGameState should have index signature', () => {
    const state: HoldemGameState = {
      [Symbol.toStringTag]: 'HoldemGameState',
    }
    expect(state).toBeDefined()
  })

  it('FiveCardDrawGameState should have index signature', () => {
    const state: FiveCardDrawGameState = {
      [Symbol.toStringTag]: 'FiveCardDrawGameState',
    }
    expect(state).toBeDefined()
  })

  it('BlackjackGameState should have index signature', () => {
    const state: BlackjackGameState = {
      [Symbol.toStringTag]: 'BlackjackGameState',
    }
    expect(state).toBeDefined()
  })

  it('BlackjackCompetitiveGameState should have index signature', () => {
    const state: BlackjackCompetitiveGameState = {
      [Symbol.toStringTag]: 'BlackjackCompetitiveGameState',
    }
    expect(state).toBeDefined()
  })

  it('RouletteGameState should have index signature', () => {
    const state: RouletteGameState = {
      [Symbol.toStringTag]: 'RouletteGameState',
    }
    expect(state).toBeDefined()
  })

  it('ThreeCardPokerGameState should have index signature', () => {
    const state: ThreeCardPokerGameState = {
      [Symbol.toStringTag]: 'ThreeCardPokerGameState',
    }
    expect(state).toBeDefined()
  })

  it('CrapsGameState should have index signature', () => {
    const state: CrapsGameState = {
      [Symbol.toStringTag]: 'CrapsGameState',
    }
    expect(state).toBeDefined()
  })

  it('GameNightGameState should have index signature', () => {
    const state: GameNightGameState = {
      [Symbol.toStringTag]: 'GameNightGameState',
    }
    expect(state).toBeDefined()
  })
})

describe('QuickPlayConfig and ProgressiveJackpot', () => {
  it('should allow QuickPlayConfig creation', () => {
    const config: QuickPlayConfig = {
      enabled: true,
      rotationIntervalMs: 45000,
    }
    expect(config.enabled).toBe(true)
    expect(config.rotationIntervalMs).toBe(45000)
  })

  it('should allow ProgressiveJackpot creation', () => {
    const jackpot: ProgressiveJackpot = {
      currentAmount: 250_000,
      lastWinAmount: 100_000,
      lastWinPlayerName: 'Bob',
    }
    expect(jackpot.currentAmount).toBe(250_000)
    expect(jackpot.lastWinPlayerName).toBe('Bob')
  })

  it('should allow ProgressiveJackpot with null lastWinPlayerName', () => {
    const jackpot: ProgressiveJackpot = {
      currentAmount: 100_000,
      lastWinAmount: 0,
      lastWinPlayerName: null,
    }
    expect(jackpot.lastWinPlayerName).toBeNull()
  })
})

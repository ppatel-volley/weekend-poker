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

/** Hold'em backward-compat fields required on every CasinoGameState object. */
const HOLDEM_DEFAULTS: Pick<CasinoGameState, 'interHandDelaySec' | 'autoFillBots' | 'activePlayerIndex' | 'communityCards' | 'pot' | 'sidePots' | 'currentBet' | 'minRaiseIncrement' | 'holeCards' | 'handHistory' | 'lastAggressor' | 'dealingComplete'> = {
  interHandDelaySec: 3,
  autoFillBots: true,
  activePlayerIndex: -1,
  communityCards: [],
  pot: 0,
  sidePots: [],
  currentBet: 0,
  minRaiseIncrement: 20,
  holeCards: {},
  handHistory: [],
  lastAggressor: null,
  dealingComplete: false,
}

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
      reactions: [],
      ...HOLDEM_DEFAULTS,
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
      reactions: [],
      ...HOLDEM_DEFAULTS,
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
      reactions: [],
      ...HOLDEM_DEFAULTS,
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
      reactions: [],
      ...HOLDEM_DEFAULTS,
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
      reactions: [],
      ...HOLDEM_DEFAULTS,
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
      reactions: [],
      ...HOLDEM_DEFAULTS,
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
      reactions: [],
      ...HOLDEM_DEFAULTS,
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
      reactions: [],
      ...HOLDEM_DEFAULTS,
      gameNight: {} as GameNightGameState,
      quickPlayMode: { enabled: true, rotationIntervalHands: 10, currentHandCount: 0, gamesPlayed: [] } as QuickPlayConfig,
      jackpot: { currentAmount: 100000, lastWinAmount: 50000, lastWinPlayerName: 'Alice' } as ProgressiveJackpot,
    }
    expect(state.gameNight).toBeDefined()
    expect(state.quickPlayMode).toBeDefined()
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
      reactions: [],
      ...HOLDEM_DEFAULTS,
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
      reactions: [],
      ...HOLDEM_DEFAULTS,
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

  it('FiveCardDrawGameState should have required fields', () => {
    const state: FiveCardDrawGameState = {
      hands: {},
      discardSelections: {},
      replacementCards: {},
      confirmedDiscards: {},
      drawComplete: false,
      pot: 0,
      sidePots: [],
      currentBet: 0,
      minRaiseIncrement: 10,
      activePlayerIndex: -1,
    }
    expect(state).toBeDefined()
    expect(state.hands).toEqual({})
  })

  it('BlackjackGameState should have required fields', () => {
    const state: BlackjackGameState = {
      playerStates: [],
      dealerHand: {
        cards: [],
        holeCardRevealed: false,
        value: 0,
        isSoft: false,
        busted: false,
        isBlackjack: false,
      },
      turnOrder: [],
      currentTurnIndex: 0,
      allBetsPlaced: false,
      dealComplete: false,
      insuranceComplete: false,
      playerTurnsComplete: false,
      dealerTurnComplete: false,
      settlementComplete: false,
      roundCompleteReady: false,
      roundNumber: 0,
      shoePenetration: 0,
      config: {
        minBet: 10,
        maxBet: 1000,
        dealerHitsSoft17: false,
        numberOfDecks: 6,
        reshuffleThreshold: 0.75,
        blackjackPaysRatio: 1.5,
        insuranceEnabled: true,
        surrenderEnabled: true,
        splitEnabled: true,
        maxSplits: 3,
      },
    }
    expect(state).toBeDefined()
    expect(state.playerStates).toEqual([])
  })

  it('BlackjackCompetitiveGameState should have required fields', () => {
    const state: BlackjackCompetitiveGameState = {
      playerStates: [],
      pot: 0,
      turnOrder: [],
      currentTurnIndex: 0,
      allAntesPlaced: false,
      dealComplete: false,
      playerTurnsComplete: false,
      showdownComplete: false,
      settlementComplete: false,
      roundCompleteReady: false,
      roundNumber: 0,
      shoePenetration: 0,
      anteAmount: 10,
      winnerIds: [],
      resultMessage: '',
    }
    expect(state).toBeDefined()
    expect(state.pot).toBe(0)
  })

  it('RouletteGameState should have required fields', () => {
    const state: RouletteGameState = {
      winningNumber: null,
      winningColour: null,
      bets: [],
      players: [],
      history: [],
      spinState: 'idle',
      nearMisses: [],
      allBetsPlaced: false,
      bettingClosed: false,
      spinComplete: false,
      resultAnnounced: false,
      payoutComplete: false,
      roundCompleteReady: false,
      roundNumber: 0,
      config: {
        minBet: 10,
        maxInsideBet: 500,
        maxOutsideBet: 1000,
        maxTotalBet: 5000,
        laPartage: false,
      },
    }
    expect(state).toBeDefined()
    expect(state.spinState).toBe('idle')
  })

  it('ThreeCardPokerGameState should have required fields', () => {
    const state: ThreeCardPokerGameState = {
      playerHands: [],
      dealerHand: {
        cards: [],
        revealed: false,
        handRank: null,
        handStrength: 0,
      },
      dealerQualifies: null,
      allAntesPlaced: false,
      dealComplete: false,
      allDecisionsMade: false,
      dealerRevealed: false,
      payoutComplete: false,
      roundCompleteReady: false,
      roundNumber: 0,
      config: {
        minAnte: 10,
        maxAnte: 500,
        maxPairPlus: 500,
      },
    }
    expect(state).toBeDefined()
    expect(state.dealerQualifies).toBeNull()
  })

  it('CrapsGameState should have index signature', () => {
    const state: CrapsGameState = {
      [Symbol.toStringTag]: 'CrapsGameState',
    }
    expect(state).toBeDefined()
  })

  it('GameNightGameState should have required fields', () => {
    const state: GameNightGameState = {
      active: false,
      roundLimit: 10,
      roundsPlayed: 0,
      scores: {},
    }
    expect(state).toBeDefined()
    expect(state.active).toBe(false)
  })
})

describe('QuickPlayConfig and ProgressiveJackpot', () => {
  it('should allow QuickPlayConfig creation', () => {
    const config: QuickPlayConfig = {
      enabled: true,
      rotationIntervalHands: 10,
      currentHandCount: 0,
      gamesPlayed: [],
    }
    expect(config.enabled).toBe(true)
    expect(config.rotationIntervalHands).toBe(10)
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

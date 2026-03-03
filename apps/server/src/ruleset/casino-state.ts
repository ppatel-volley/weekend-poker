/**
 * Casino initial state factory and shared reducers/thunks.
 *
 * Per TDD-backend Section 3.1-3.3 and D-001, D-002, D-005.
 */

import type { CasinoGameState, CasinoGame, CasinoPlayer, TTSMessage, TTSPriority, InputMode, ReactionType, SpeedConfig } from '@weekend-casino/shared'
import { CasinoPhase, DEFAULT_BLIND_LEVEL, STARTING_WALLET_BALANCE, REACTION_TYPES, REACTION_RATE_LIMIT, MAX_REACTION_QUEUE_SIZE, DEFAULT_QUICK_PLAY_CONFIG } from '@weekend-casino/shared'
import type { GameReducer, GameThunk } from '@volley/vgf/types'

// ── Type aliases for brevity ──────────────────────────────────────

type Reducer<TArgs extends unknown[] = never[]> = GameReducer<CasinoGameState, TArgs>
type Thunk<TArgs extends unknown[] = never[]> = GameThunk<CasinoGameState, TArgs>
// ThunkCtx used indirectly via Thunk type alias

// ── Initial State Factory ─────────────────────────────────────────

/**
 * Creates initial casino state for a fresh multi-game session.
 * Per D-005: all players start with 10,000 chips in wallet.
 */
export function createInitialCasinoState(
  partial?: Partial<CasinoGameState>,
): CasinoGameState {
  const now = Date.now()
  return {
    phase: CasinoPhase.Lobby,
    selectedGame: null,
    gameSelectConfirmed: false,
    gameChangeRequested: false,
    gameChangeVotes: {},
    wallet: {},  // Players added to lobby will be initialized with STARTING_WALLET_BALANCE
    players: [],
    dealerCharacterId: 'vincent',
    blindLevel: DEFAULT_BLIND_LEVEL,
    handNumber: 0,
    dealerIndex: 0,
    lobbyReady: false,
    dealerMessage: null,
    ttsQueue: [],

    // Reactions (v2.0 — cosmetic only)
    reactions: [],

    // Hold'em backward-compatible defaults (casino state is a SUPERSET)
    interHandDelaySec: 3,
    autoFillBots: true,
    activePlayerIndex: -1,
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentBet: 0,
    minRaiseIncrement: DEFAULT_BLIND_LEVEL.bigBlind,
    holeCards: {},
    handHistory: [],
    lastAggressor: null,
    dealingComplete: false,

    // Session stats — Poker-compatible shape at runtime for backward compat.
    // CasinoGameState.sessionStats is typed as casino SessionStats, but Hold'em phases
    // read poker-shaped fields (largestPot, biggestBluff). This cast documents the mismatch
    // until a unified stats adapter is built (v2.1).
    sessionStats: {
      handsPlayed: 0,
      totalPotDealt: 0,
      startedAt: now,
      playerStats: {},
      largestPot: null,
      biggestBluff: null,
      worstBeat: null,
    } as unknown as CasinoGameState['sessionStats'],

    ...partial,
  }
}

// ── Global Reducers ──────────────────────────────────────────────

/**
 * Add a player to the session and initialize their wallet.
 * Per D-005: starting balance is 10,000 chips.
 */
export const casinoAddPlayer: Reducer<[CasinoPlayer]> = (state, player) => ({
  ...state,
  players: [...state.players, player],
  wallet: {
    ...state.wallet,
    [player.id]: state.wallet[player.id] ?? STARTING_WALLET_BALANCE,
  },
})

/**
 * Remove a player from the session.
 */
export const casinoRemovePlayer: Reducer<[string]> = (state, playerId) => ({
  ...state,
  players: state.players.filter(p => p.id !== playerId),
  wallet: Object.fromEntries(
    Object.entries(state.wallet).filter(([id]) => id !== playerId),
  ),
})

/**
 * Set a player's ready state in the game state.
 * Called alongside VGF's toggleReady() to keep CasinoPlayer.isReady in sync.
 */
export const casinoSetPlayerReady: Reducer<[string, boolean]> = (state, playerId, ready) => ({
  ...state,
  players: state.players.map(p =>
    p.id === playerId ? { ...p, isReady: ready } : p,
  ),
})

/**
 * Mark a player as disconnected (but keep them in the roster).
 */
export const casinoMarkPlayerDisconnected: Reducer<[string]> = (state, playerId) => ({
  ...state,
  players: state.players.map(p =>
    p.id === playerId ? { ...p, isConnected: false } : p,
  ),
})

/**
 * Mark a player as reconnected.
 */
export const casinoMarkPlayerReconnected: Reducer<[string]> = (state, playerId) => ({
  ...state,
  players: state.players.map(p =>
    p.id === playerId ? { ...p, isConnected: true } : p,
  ),
})

/**
 * Update wallet balance for a player (Sync Points).
 * Positive delta = gain, negative = loss.
 */
export const casinoUpdateWallet: Reducer<[string, number]> = (state, playerId, delta) => ({
  ...state,
  wallet: {
    ...state.wallet,
    [playerId]: Math.max(0, (state.wallet[playerId] ?? 0) + delta),
  },
})

/**
 * Set wallet balance for a player directly.
 */
export const casinoSetWalletBalance: Reducer<[string, number]> = (state, playerId, amount) => ({
  ...state,
  wallet: {
    ...state.wallet,
    [playerId]: Math.max(0, amount),
  },
})

/**
 * Set the selected game (GAME_SELECT phase).
 */
export const casinoSetSelectedGame: Reducer<[CasinoGame]> = (state, game) => ({
  ...state,
  selectedGame: game,
  gameSelectConfirmed: false,
})

/**
 * Confirm game selection (GAME_SELECT phase).
 */
export const casinoConfirmGameSelection: Reducer = state => ({
  ...state,
  gameSelectConfirmed: true,
})

/**
 * Request a game change (host-only, between hands/rounds).
 */
export const casinoSetGameChangeRequested: Reducer<[boolean]> = (state, requested) => ({
  ...state,
  gameChangeRequested: requested,
})

/**
 * Record a game change vote for a player (v2.1 voting system).
 */
export const casinoSetGameChangeVote: Reducer<[string, CasinoGame]> = (state, playerId, game) => ({
  ...state,
  gameChangeVotes: {
    ...state.gameChangeVotes,
    [playerId]: game,
  },
})

/**
 * Clear all game change votes.
 */
export const casinoClearGameChangeVotes: Reducer = state => ({
  ...state,
  gameChangeVotes: {},
})

/**
 * Set a dealer message (TTS text).
 */
export const casinoSetDealerMessage: Reducer<[string | null]> = (state, msg) => ({
  ...state,
  dealerMessage: msg,
})

/**
 * Add a message to the TTS queue.
 */
export const casinoEnqueueTTS: Reducer<[TTSMessage]> = (state, msg) => ({
  ...state,
  ttsQueue: [...state.ttsQueue, msg],
})

/**
 * Dequeue and remove the first TTS message.
 */
export const casinoDequeueTTS: Reducer = state => ({
  ...state,
  ttsQueue: state.ttsQueue.slice(1),
})

/**
 * Clear all TTS messages.
 */
export const casinoClearTTSQueue: Reducer = state => ({
  ...state,
  ttsQueue: [],
})

/**
 * Set video playback state.
 */
export const casinoSetVideoPlayback: Reducer<[any]> = (state, playback) => ({
  ...state,
  videoPlayback: playback,
})

/**
 * Clear video playback state.
 */
export const casinoClearVideoPlayback: Reducer = state => ({
  ...state,
  videoPlayback: undefined,
})

/**
 * Set a bet error for a player.
 */
export const casinoSetBetError: Reducer<[string, string, number]> = (
  state,
  playerId,
  message,
  clearedAtMs,
) => ({
  ...state,
  betError: {
    playerId,
    message,
    clearedAt: clearedAtMs,
  },
})

/**
 * Clear the bet error.
 */
export const casinoClearBetError: Reducer = state => ({
  ...state,
  betError: undefined,
})

/**
 * Toggle lobby ready flag.
 */
export const casinoSetLobbyReady: Reducer<[boolean]> = (state, ready) => ({
  ...state,
  lobbyReady: ready,
})

/**
 * Set the input mode on game state.
 */
export const casinoSetInputMode: Reducer<[InputMode]> = (state, mode) => ({
  ...state,
  inputMode: mode,
})

/**
 * Send a reaction (cosmetic only — no game state impact).
 * Rate-limited: max 3 per player per 10 seconds (server-enforced).
 * Reactions queue is capped at MAX_REACTION_QUEUE_SIZE (10).
 */
export const casinoSendReaction: Reducer<[string, ReactionType]> = (state, playerId, reactionType) => {
  // Validate player exists
  if (!state.players.some(p => p.id === playerId)) return state

  // Validate reaction type
  if (!(REACTION_TYPES as readonly string[]).includes(reactionType)) return state

  const now = Date.now()

  // Rate limit check: count recent reactions from this player within the window
  const windowStart = now - REACTION_RATE_LIMIT.windowMs
  const recentCount = state.reactions.filter(
    r => r.playerId === playerId && r.timestamp >= windowStart,
  ).length

  if (recentCount >= REACTION_RATE_LIMIT.maxReactions) return state

  const newReaction = { playerId, type: reactionType, timestamp: now }
  const updatedReactions = [...state.reactions, newReaction].slice(-MAX_REACTION_QUEUE_SIZE)

  return { ...state, reactions: updatedReactions }
}

// ── Speed Config Reducers (v2.0) ────────────────────────────────

/**
 * Set speed config for the current game.
 * Backwards compatible: default is disabled.
 */
export const casinoSetSpeedConfig: Reducer<[SpeedConfig]> = (state, config) => ({
  ...state,
  speedConfig: config,
})

/**
 * Clear speed config (return to standard speed).
 */
export const casinoClearSpeedConfig: Reducer = state => ({
  ...state,
  speedConfig: undefined,
})

// ── Quick-Play Reducers (v2.0) ──────────────────────────────────

/**
 * Enable quick-play mode. Randomly selects next game after each round.
 */
export const casinoEnableQuickPlay: Reducer = state => ({
  ...state,
  quickPlayMode: {
    ...DEFAULT_QUICK_PLAY_CONFIG,
    enabled: true,
    gamesPlayed: state.selectedGame ? [state.selectedGame] : [],
  },
})

/**
 * Disable quick-play mode.
 */
export const casinoDisableQuickPlay: Reducer = state => ({
  ...state,
  quickPlayMode: undefined,
})

/**
 * Increment the quick-play hand counter.
 * Called at each hand/round complete phase.
 */
export const casinoQuickPlayIncrementHand: Reducer = state => {
  if (!state.quickPlayMode?.enabled) return state
  return {
    ...state,
    quickPlayMode: {
      ...state.quickPlayMode,
      currentHandCount: state.quickPlayMode.currentHandCount + 1,
    },
  }
}

/**
 * Record a game switch in quick-play history and reset the hand counter.
 */
export const casinoQuickPlayRecordGameSwitch: Reducer<[CasinoGame]> = (state, game) => {
  if (!state.quickPlayMode?.enabled) return state
  return {
    ...state,
    quickPlayMode: {
      ...state.quickPlayMode,
      currentHandCount: 0,
      gamesPlayed: [...state.quickPlayMode.gamesPlayed, game],
    },
  }
}

// ── Casino Crawl Reducers (v2.0) ────────────────────────────────

/**
 * Start a casino crawl with shuffled game order.
 * Games are shuffled using a seeded random (seed provided for determinism).
 */
export const casinoStartCasinoCrawl: Reducer<[CasinoGame[], number]> = (state, gamesOrder, roundsPerGame) => ({
  ...state,
  casinoCrawl: {
    active: true,
    gamesOrder,
    currentIndex: 0,
    roundsPerGame: roundsPerGame > 0 ? roundsPerGame : 5,
    roundsPlayed: 0,
  },
  selectedGame: gamesOrder[0] ?? null,
})

/**
 * Advance the casino crawl: increment roundsPlayed, auto-switch if needed.
 * Returns state with updated crawl. The next phase logic checks this.
 */
export const casinoAdvanceCasinoCrawl: Reducer = state => {
  if (!state.casinoCrawl?.active) return state

  const newRoundsPlayed = state.casinoCrawl.roundsPlayed + 1

  if (newRoundsPlayed >= state.casinoCrawl.roundsPerGame) {
    const nextIndex = state.casinoCrawl.currentIndex + 1
    if (nextIndex >= state.casinoCrawl.gamesOrder.length) {
      // Crawl complete — deactivate
      return {
        ...state,
        casinoCrawl: { ...state.casinoCrawl, active: false, roundsPlayed: newRoundsPlayed },
      }
    }
    // Advance to next game
    return {
      ...state,
      casinoCrawl: {
        ...state.casinoCrawl,
        currentIndex: nextIndex,
        roundsPlayed: 0,
      },
      selectedGame: state.casinoCrawl.gamesOrder[nextIndex] ?? null,
    }
  }

  // Same game, increment round counter
  return {
    ...state,
    casinoCrawl: { ...state.casinoCrawl, roundsPlayed: newRoundsPlayed },
  }
}

/**
 * Stop the casino crawl.
 */
export const casinoStopCasinoCrawl: Reducer = state => ({
  ...state,
  casinoCrawl: undefined,
})

// ── Global Thunks (Mock/Stub) ────────────────────────────────────

/**
 * Process voice commands (mock TTS system — text only, no audio).
 * Per Kickoff decision: mock TTS entirely.
 */
export const casinoProcessVoiceCommand: Thunk<[string]> = async (ctx, transcript) => {
  console.log('[VOICE] Transcript received:', transcript)
  // TODO: Implement voice intent parsing for multi-game (Craps, Roulette, etc.)
  // For now, dispatch a TTS message back
  ctx.dispatch('enqueueTTS', {
    text: `I heard: "${transcript}". Processing...`,
    priority: 'normal',
  })
}

/**
 * Request TTS message (mock).
 * In production, connects to external TTS service (ElevenLabs, etc.)
 */
export const casinoRequestTTS: Thunk<[string, TTSPriority?]> = async (ctx, text, priority) => {
  console.log('[TTS] Requested:', text)
  ctx.dispatch('enqueueTTS', {
    text,
    priority: priority ?? 'normal',
  })
}

/**
 * Handle rebuy request (player buys additional chips).
 * Per D-005, wallet is synced at sync points.
 */
export const casinoHandleRebuy: Thunk<[string, number]> = async (ctx, playerId, amount) => {
  const currentBalance = ctx.getState().wallet[playerId] ?? 0
  const newBalance = currentBalance + amount
  ctx.dispatch('setWalletBalance', playerId, newBalance)
  ctx.dispatch('setDealerMessage', `${playerId} rebuys for ${amount} chips!`)
}

/**
 * Trigger a video playback (server-authoritative per D-011).
 */
export const casinoTriggerVideo: Thunk<[any]> = async (ctx, config) => {
  console.log('[VIDEO] Triggering:', config.assetKey)
  ctx.dispatch('setVideoPlayback', {
    assetKey: config.assetKey,
    mode: config.mode ?? 'full_screen',
    startedAt: Date.now(),
    durationMs: config.durationMs,
    blocking: config.blocking ?? false,
    skippable: config.skippable ?? false,
    skipDelayMs: config.skipDelayMs ?? 0,
    priority: config.priority ?? 'medium',
    complete: false,
  })
}

/**
 * Complete video playback.
 */
export const casinoCompleteVideo: Thunk = async (ctx) => {
  if (ctx.getState().videoPlayback) {
    ctx.dispatch('clearVideoPlayback')
  }
}

/**
 * Activate remote mode — sets inputMode to 'remote' on the game state.
 * Uses explicit reducer dispatch per endIf Rule 3 (no implicit phase changes).
 */
export const casinoActivateRemoteMode: Thunk = async (ctx) => {
  ctx.dispatch('setInputMode', 'remote')
}

// ── Exports ────────────────────────────────────────────────────────

export const casinoReducers = {
  addPlayer: casinoAddPlayer,
  removePlayer: casinoRemovePlayer,
  setPlayerReady: casinoSetPlayerReady,
  markPlayerDisconnected: casinoMarkPlayerDisconnected,
  markPlayerReconnected: casinoMarkPlayerReconnected,
  updateWallet: casinoUpdateWallet,
  setWalletBalance: casinoSetWalletBalance,
  setSelectedGame: casinoSetSelectedGame,
  confirmGameSelection: casinoConfirmGameSelection,
  setGameChangeRequested: casinoSetGameChangeRequested,
  setGameChangeVote: casinoSetGameChangeVote,
  clearGameChangeVotes: casinoClearGameChangeVotes,
  setDealerMessage: casinoSetDealerMessage,
  enqueueTTS: casinoEnqueueTTS,
  dequeueTTS: casinoDequeueTTS,
  clearTTSQueue: casinoClearTTSQueue,
  setVideoPlayback: casinoSetVideoPlayback,
  clearVideoPlayback: casinoClearVideoPlayback,
  setBetError: casinoSetBetError,
  clearBetError: casinoClearBetError,
  setLobbyReady: casinoSetLobbyReady,
  setInputMode: casinoSetInputMode,
  sendReaction: casinoSendReaction,
  setSpeedConfig: casinoSetSpeedConfig,
  clearSpeedConfig: casinoClearSpeedConfig,
  enableQuickPlay: casinoEnableQuickPlay,
  disableQuickPlay: casinoDisableQuickPlay,
  quickPlayIncrementHand: casinoQuickPlayIncrementHand,
  quickPlayRecordGameSwitch: casinoQuickPlayRecordGameSwitch,
  startCasinoCrawl: casinoStartCasinoCrawl,
  advanceCasinoCrawl: casinoAdvanceCasinoCrawl,
  stopCasinoCrawl: casinoStopCasinoCrawl,
}

export const casinoThunks = {
  processVoiceCommand: casinoProcessVoiceCommand,
  requestTTS: casinoRequestTTS,
  handleRebuy: casinoHandleRebuy,
  triggerVideo: casinoTriggerVideo,
  completeVideo: casinoCompleteVideo,
  activateRemoteMode: casinoActivateRemoteMode,
}

/**
 * Casino initial state factory and shared reducers/thunks.
 *
 * Per TDD-backend Section 3.1-3.3 and D-001, D-002, D-005.
 */

import type { CasinoGameState, CasinoGame, CasinoPlayer, TTSMessage, HandHighlight } from '@weekend-casino/shared'
import { CasinoPhase, DEFAULT_BLIND_LEVEL, STARTING_WALLET_BALANCE, STARTING_STACK, BLIND_LEVELS } from '@weekend-casino/shared'
import type { GameReducer, GameThunk, IThunkContext } from '@volley/vgf/types'

// ── Type aliases for brevity ──────────────────────────────────────

type Reducer<TArgs extends unknown[] = never[]> = GameReducer<CasinoGameState, TArgs>
type Thunk<TArgs extends unknown[] = never[]> = GameThunk<CasinoGameState, TArgs>
type ThunkCtx = IThunkContext<CasinoGameState>

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

    // Session stats — Poker-specific SessionStats shape (NOT casino cross-game stats)
    sessionStats: {
      handsPlayed: 0,
      totalPotDealt: 0,
      startedAt: now,
      playerStats: {},
      largestPot: null,
      biggestBluff: null,
      worstBeat: null,
    },

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

// ── Global Thunks (Mock/Stub) ────────────────────────────────────

/**
 * Process voice commands (mock TTS system — text only, no audio).
 * Per Kickoff decision: mock TTS entirely.
 */
export const casinoProcessVoiceCommand: Thunk<[string]> = async (ctx, transcript) => {
  const state = ctx.getState()
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
export const casinoRequestTTS: Thunk<[string, string?]> = async (ctx, text, priority) => {
  const state = ctx.getState()
  console.log('[TTS] Requested:', text)
  ctx.dispatch('enqueueTTS', {
    text,
    priority: (priority as any) ?? 'normal',
  })
}

/**
 * Handle rebuy request (player buys additional chips).
 * Per D-005, wallet is synced at sync points.
 */
export const casinoHandleRebuy: Thunk<[string, number]> = async (ctx, playerId, amount) => {
  const state = ctx.getState()
  const currentBalance = state.wallet[playerId] ?? 0
  const newBalance = currentBalance + amount
  ctx.dispatch('setWalletBalance', playerId, newBalance)
  ctx.dispatch('setDealerMessage', `${playerId} rebuys for ${amount} chips!`)
}

/**
 * Trigger a video playback (server-authoritative per D-011).
 */
export const casinoTriggerVideo: Thunk<[any]> = async (ctx, config) => {
  const state = ctx.getState()
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
  const state = ctx.getState()
  if (state.videoPlayback) {
    ctx.dispatch('clearVideoPlayback')
  }
}

// ── Exports ────────────────────────────────────────────────────────

export const casinoReducers = {
  addPlayer: casinoAddPlayer,
  removePlayer: casinoRemovePlayer,
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
}

export const casinoThunks = {
  processVoiceCommand: casinoProcessVoiceCommand,
  requestTTS: casinoRequestTTS,
  handleRebuy: casinoHandleRebuy,
  triggerVideo: casinoTriggerVideo,
  completeVideo: casinoCompleteVideo,
}

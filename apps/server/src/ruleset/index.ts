import type { GameRuleset, GameReducer, GameThunk, IThunkContext, IConnectionLifeCycleContext } from '@volley/vgf/types'
import { ClientType } from '@volley/vgf/types'
import type { PokerGameState, PokerPlayer, PlayerAction } from '@weekend-poker/shared'
import { PokerPhase, DEFAULT_BLIND_LEVEL, MAX_PLAYERS, MIN_PLAYERS_TO_START, STARTING_STACK } from '@weekend-poker/shared'
import { parseVoiceIntent } from '../voice/parseVoiceIntent.js'

// ── Initial state factory ──────────────────────────────────────

/**
 * Creates the initial game state for a fresh poker session.
 * All values are sensible defaults; players join via the Lobby phase.
 */
export function createInitialState(
  partial?: Partial<PokerGameState>,
): PokerGameState {
  return {
    phase: PokerPhase.Lobby,
    blindLevel: DEFAULT_BLIND_LEVEL,
    dealerCharacterId: 'vincent',
    interHandDelaySec: 3,
    autoFillBots: true,
    handNumber: 0,
    dealerIndex: 0,
    activePlayerIndex: -1,
    players: [],
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentBet: 0,
    minRaiseIncrement: DEFAULT_BLIND_LEVEL.bigBlind,
    handHistory: [],
    lastAggressor: null,
    dealingComplete: false,
    dealerMessage: null,
    ttsQueue: [],
    sessionStats: {
      handsPlayed: 0,
      totalPotDealt: 0,
      startedAt: Date.now(),
      playerStats: {},
      largestPot: null,
      biggestBluff: null,
      worstBeat: null,
    },
    ...partial,
  }
}

// ── Type aliases for brevity ─────────────────────────────────

type Reducer<TArgs extends unknown[] = never[]> = GameReducer<PokerGameState, TArgs>
type Thunk<TArgs extends unknown[] = never[]> = GameThunk<PokerGameState, TArgs>
type ThunkCtx = IThunkContext<PokerGameState>
type ConnCtx = IConnectionLifeCycleContext<PokerGameState>

// ── Global reducers ────────────────────────────────────────────
//
// Pure functions that return the next state.
// Every reducer is a stub awaiting implementation.

const reducers: Record<string, Reducer<any>> = {
  addPlayer: ((state: PokerGameState, player: PokerPlayer): PokerGameState => {
    return { ...state, players: [...state.players, player] }
  }) satisfies Reducer<[PokerPlayer]>,

  removePlayer: ((state: PokerGameState, playerId: string): PokerGameState => {
    return { ...state, players: state.players.filter(p => p.id !== playerId) }
  }) satisfies Reducer<[string]>,

  updatePlayerBet: ((state: PokerGameState, _playerId: string, _amount: number): PokerGameState => {
    // TODO: Find the player by ID and update their bet, deducting from stack
    return state
  }) satisfies Reducer<[string, number]>,

  foldPlayer: ((state: PokerGameState, _playerId: string): PokerGameState => {
    // TODO: Set player status to 'folded' and clear their active state
    return state
  }) satisfies Reducer<[string]>,

  dealCommunityCards: ((state: PokerGameState, _cards: unknown[]): PokerGameState => {
    // TODO: Append dealt cards to communityCards array
    return state
  }) satisfies Reducer<[unknown[]]>,

  rotateDealerButton: ((state: PokerGameState): PokerGameState => {
    // TODO: Advance dealerIndex to next active, non-busted player
    return state
  }) satisfies Reducer,

  updatePot: ((state: PokerGameState): PokerGameState => {
    // TODO: Gather bets from all players, calculate main pot and side pots
    return state
  }) satisfies Reducer,

  awardPot: ((state: PokerGameState, _winnerIds: string[], _amounts: number[]): PokerGameState => {
    // TODO: Add winnings to each winner's stack, reset pot to zero
    return state
  }) satisfies Reducer<[string[], number[]]>,

  setActivePlayer: ((state: PokerGameState, _playerIndex: number): PokerGameState => {
    // TODO: Update activePlayerIndex and notify clients
    return state
  }) satisfies Reducer<[number]>,

  markPlayerDisconnected: ((state: PokerGameState, playerId: string): PokerGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, isConnected: false } : p,
      ),
    }
  }) satisfies Reducer<[string]>,

  markPlayerReconnected: ((state: PokerGameState, playerId: string): PokerGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, isConnected: true } : p,
      ),
    }
  }) satisfies Reducer<[string]>,

  updatePlayerName: ((state: PokerGameState, playerId: string, name: string): PokerGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, name } : p,
      ),
    }
  }) satisfies Reducer<[string, string]>,

  updateDealerCharacter: ((state: PokerGameState, _characterId: string): PokerGameState => {
    // TODO: Update dealerCharacterId and trigger voice/personality change
    return state
  }) satisfies Reducer<[string]>,

  updateBlindLevel: ((state: PokerGameState, _level: number): PokerGameState => {
    // TODO: Look up new blind level from BLIND_LEVELS and update state
    return state
  }) satisfies Reducer<[number]>,

  addBotPlayer: ((state: PokerGameState, _seatIndex: number, _difficulty: string): PokerGameState => {
    // TODO: Create a PokerPlayer with isBot=true and add to players array
    return state
  }) satisfies Reducer<[number, string]>,

  removeBotPlayer: ((state: PokerGameState, _playerId: string): PokerGameState => {
    // TODO: Filter the bot out of the players array
    return state
  }) satisfies Reducer<[string]>,

  updateEmotionalState: ((state: PokerGameState, _emotion: string): PokerGameState => {
    // TODO: Store emotional state for dealer character rendering
    return state
  }) satisfies Reducer<[string]>,

  updateOpponentProfile: ((state: PokerGameState, _playerId: string, _profileData: unknown): PokerGameState => {
    // TODO: Store updated opponent modelling data for bot decisions
    return state
  }) satisfies Reducer<[string, unknown]>,

  setPlayerLastAction: ((state: PokerGameState, playerId: string, action: string): PokerGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, lastAction: action as PlayerAction } : p,
      ),
    }
  }) satisfies Reducer<[string, string]>,

  updateSessionHighlights: ((state: PokerGameState, _highlight: unknown): PokerGameState => {
    // TODO: Compare incoming highlight against session records and update
    return state
  }) satisfies Reducer<[unknown]>,

  enqueueTTSMessage: ((state: PokerGameState, _message: unknown): PokerGameState => {
    // TODO: Push new TTSMessage onto the ttsQueue array
    return state
  }) satisfies Reducer<[unknown]>,

  markDealingComplete: ((state: PokerGameState): PokerGameState => {
    // TODO: Set dealingComplete = true so betting can commence
    return state
  }) satisfies Reducer,
}

// ── Global thunks ──────────────────────────────────────────────

const thunks: Record<string, Thunk<any>> = {
  processPlayerAction: (async (_ctx: ThunkCtx) => {
    // TODO: Validate the action is legal, then dispatch appropriate reducers
  }) satisfies Thunk,

  processVoiceCommand: (async (ctx: ThunkCtx, transcript: string) => {
    const result = parseVoiceIntent(transcript)
    console.log('[voice]', JSON.stringify(result))

    const actionIntents = ['fold', 'check', 'call', 'bet', 'raise', 'all_in']
    if (actionIntents.includes(result.intent)) {
      ctx.dispatch('setPlayerLastAction', ctx.getClientId(), result.intent)
    }
  }) satisfies Thunk<[string]>,

  startHand: (async (_ctx: ThunkCtx) => {
    // TODO: Reset hand state, rotate dealer, post blinds, transition to dealing
  }) satisfies Thunk,

  evaluateHands: (async (_ctx: ThunkCtx) => {
    // TODO: Run hand evaluation logic and determine winners
  }) satisfies Thunk,

  distributePot: (async (_ctx: ThunkCtx) => {
    // TODO: Calculate split pots, award winnings, update session stats
  }) satisfies Thunk,

  botDecision: (async (_ctx: ThunkCtx) => {
    // TODO: Run bot AI logic based on difficulty and dispatch the chosen action
  }) satisfies Thunk,

  autoFoldPlayer: (async (_ctx: ThunkCtx) => {
    // TODO: Dispatch foldPlayer reducer for the timed-out player
  }) satisfies Thunk,

  requestTTS: (async (_ctx: ThunkCtx) => {
    // TODO: Build the TTS message and enqueue it via reducer
  }) satisfies Thunk,

  handleRebuy: (async (_ctx: ThunkCtx) => {
    // TODO: Validate rebuy is allowed, update player stack
  }) satisfies Thunk,

  sitOutPlayer: (async (_ctx: ThunkCtx) => {
    // TODO: Set player status to 'sitting_out' and increment sit-out counter
  }) satisfies Thunk,

  dealInPlayer: (async (_ctx: ThunkCtx) => {
    // TODO: Reset sitting-out status so the player is dealt in next hand
  }) satisfies Thunk,

  endSession: (async (_ctx: ThunkCtx) => {
    // TODO: Finalise session stats, notify clients, transition to Lobby
  }) satisfies Thunk,
}

// ── Phase definitions ──────────────────────────────────────────
//
// Each phase defines its own reducers, thunks, lifecycle hooks, and routing.
// `actions: {}` is required by the Phase interface but deprecated in VGF v4.
//
// Lifecycle hook types:
//   onBegin: (ctx: IOnBeginContext) => GameState | Promise<GameState>
//   onEnd:   (ctx: IOnEndContext)   => GameState | Promise<GameState>
//   endIf:   (ctx: IGameActionContext) => boolean
//   next:    string | ((ctx: IGameActionContext) => string)
//
// We use (ctx: any) for the stubs to avoid importing every context variant.
// Once implementations are written, proper types should be applied.

function makePhase(overrides: {
  reducers?: Record<string, Reducer<any>>
  thunks?: Record<string, Thunk<any>>
  onBegin?: (ctx: any) => any
  onEnd?: (ctx: any) => any
  endIf?: (ctx: any) => boolean
  next: string | ((ctx: any) => string)
}) {
  return {
    actions: {} as Record<string, never>,
    reducers: overrides.reducers ?? {},
    thunks: overrides.thunks ?? {},
    onBegin: overrides.onBegin ?? ((ctx: any) => ctx.getState()),
    endIf: overrides.endIf ?? (() => false),
    next: overrides.next,
    ...(overrides.onEnd ? { onEnd: overrides.onEnd } : {}),
  }
}

const lobbyPhase = makePhase({
  thunks: {
    startGame: (async (_ctx: ThunkCtx) => {
      // TODO: Verify min player count, fill bots if auto-fill is on, begin hand
    }) satisfies Thunk,
    checkLobbyReady: (async (_ctx: ThunkCtx) => {
      // No-op — the dispatch itself triggers endIf evaluation
    }) satisfies Thunk,
  },
  onBegin: (ctx: any) => {
    // TODO: Lobby setup — reset hand state, welcome message via TTS
    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const members = ctx.session?.members ?? {}
    const readyControllers = Object.values(members).filter(
      (m: any) => m.clientType === ClientType.Controller && m.isReady,
    )
    return readyControllers.length >= MIN_PLAYERS_TO_START
  },
  next: PokerPhase.PostingBlinds,
})

const postingBlindsPhase = makePhase({
  onBegin: (ctx: any) => {
    // TODO: Identify SB and BB positions, post forced bets
    return ctx.getState()
  },
  endIf: () => false, // TODO: Return true once both blinds are posted
  next: PokerPhase.DealingHoleCards,
})

const dealingHoleCardsPhase = makePhase({
  onBegin: (ctx: any) => {
    // TODO: Shuffle deck, deal two hole cards to each active player
    return ctx.getState()
  },
  endIf: () => false, // TODO: Return true when dealing animation completes
  next: PokerPhase.PreFlopBetting,
})

const preFlopBettingPhase = makePhase({
  onBegin: (ctx: any) => {
    // TODO: Set first active player (left of big blind), start action timer
    return ctx.getState()
  },
  endIf: () => false, // TODO: Return true when betting round is complete
  next: () => {
    // TODO: If all but one folded, go to HandComplete
    // TODO: If all-in detected, go to AllInRunout
    return PokerPhase.DealingFlop
  },
})

const dealingFlopPhase = makePhase({
  onBegin: (ctx: any) => {
    // TODO: Deal three community cards (the flop)
    return ctx.getState()
  },
  endIf: () => false,
  next: PokerPhase.FlopBetting,
})

const flopBettingPhase = makePhase({
  onBegin: (ctx: any) => {
    // TODO: Set first active player (left of dealer), reset current bet
    return ctx.getState()
  },
  endIf: () => false,
  next: () => {
    // TODO: If all but one folded, go to HandComplete; if all-in, go to AllInRunout
    return PokerPhase.DealingTurn
  },
})

const dealingTurnPhase = makePhase({
  onBegin: (ctx: any) => {
    // TODO: Deal one community card (the turn)
    return ctx.getState()
  },
  endIf: () => false,
  next: PokerPhase.TurnBetting,
})

const turnBettingPhase = makePhase({
  onBegin: (ctx: any) => {
    // TODO: Set first active player (left of dealer), reset current bet
    return ctx.getState()
  },
  endIf: () => false,
  next: () => {
    // TODO: If all but one folded, go to HandComplete; if all-in, go to AllInRunout
    return PokerPhase.DealingRiver
  },
})

const dealingRiverPhase = makePhase({
  onBegin: (ctx: any) => {
    // TODO: Deal one community card (the river)
    return ctx.getState()
  },
  endIf: () => false,
  next: PokerPhase.RiverBetting,
})

const riverBettingPhase = makePhase({
  onBegin: (ctx: any) => {
    // TODO: Set first active player (left of dealer), reset current bet
    return ctx.getState()
  },
  endIf: () => false,
  next: () => {
    // TODO: If all but one folded, go to HandComplete
    return PokerPhase.Showdown
  },
})

const allInRunoutPhase = makePhase({
  onBegin: (ctx: any) => {
    // TODO: Deal remaining community cards with animation delays
    return ctx.getState()
  },
  endIf: () => false,
  next: PokerPhase.Showdown,
})

const showdownPhase = makePhase({
  onBegin: (ctx: any) => {
    // TODO: Reveal hole cards, evaluate hands, announce results via TTS
    return ctx.getState()
  },
  endIf: () => false,
  next: PokerPhase.PotDistribution,
})

const potDistributionPhase = makePhase({
  onBegin: (ctx: any) => {
    // TODO: Distribute main pot and side pots to winners
    return ctx.getState()
  },
  endIf: () => false,
  next: PokerPhase.HandComplete,
})

const handCompletePhase = makePhase({
  onBegin: (ctx: any) => {
    // TODO: Update session stats, check for busted players, apply inter-hand delay
    return ctx.getState()
  },
  endIf: () => false,
  next: () => {
    // TODO: If fewer than MIN_PLAYERS_TO_START remain, return to Lobby
    return PokerPhase.PostingBlinds
  },
})

// ── Phase map ──────────────────────────────────────────────────

const phases = {
  [PokerPhase.Lobby]: lobbyPhase,
  [PokerPhase.PostingBlinds]: postingBlindsPhase,
  [PokerPhase.DealingHoleCards]: dealingHoleCardsPhase,
  [PokerPhase.PreFlopBetting]: preFlopBettingPhase,
  [PokerPhase.DealingFlop]: dealingFlopPhase,
  [PokerPhase.FlopBetting]: flopBettingPhase,
  [PokerPhase.DealingTurn]: dealingTurnPhase,
  [PokerPhase.TurnBetting]: turnBettingPhase,
  [PokerPhase.DealingRiver]: dealingRiverPhase,
  [PokerPhase.RiverBetting]: riverBettingPhase,
  [PokerPhase.AllInRunout]: allInRunoutPhase,
  [PokerPhase.Showdown]: showdownPhase,
  [PokerPhase.PotDistribution]: potDistributionPhase,
  [PokerPhase.HandComplete]: handCompletePhase,
}

// ── Connection handlers ────────────────────────────────────────

const onConnect = async (ctx: ConnCtx) => {
  const { clientType } = ctx.connection.metadata
  if (clientType !== ClientType.Controller) return

  const state = ctx.getState()
  if (state.players.length >= MAX_PLAYERS) return

  const clientId = ctx.getClientId()

  // If the player already exists, mark them as reconnected instead of adding a duplicate
  if (state.players.some(p => p.id === clientId)) {
    ctx.dispatch('markPlayerReconnected', clientId)
    return
  }

  // Find the next available seat index (0 to MAX_PLAYERS - 1)
  const takenSeats = new Set(state.players.map(p => p.seatIndex))
  let seatIndex = 0
  while (takenSeats.has(seatIndex) && seatIndex < MAX_PLAYERS) {
    seatIndex++
  }

  // Resolve display name from member state
  const members = ctx.getMembers()
  const member = members[clientId]
  const displayName =
    (member?.state as Record<string, unknown>)?.displayName as string
    ?? member?.state?.name
    ?? `Player ${seatIndex + 1}`

  const newPlayer: PokerPlayer = {
    id: clientId,
    name: displayName,
    seatIndex,
    stack: STARTING_STACK,
    bet: 0,
    status: 'active',
    lastAction: null,
    isBot: false,
    isConnected: true,
    sittingOutHandCount: 0,
  }

  ctx.dispatch('addPlayer', newPlayer)
}

const onDisconnect = async (ctx: ConnCtx) => {
  const clientId = ctx.getClientId()
  const state = ctx.getState()
  const player = state.players.find(p => p.id === clientId)
  if (!player) return

  if (state.phase === PokerPhase.Lobby) {
    // In lobby, remove the player entirely
    ctx.dispatch('removePlayer', clientId)
  } else {
    // During gameplay, mark as disconnected
    ctx.dispatch('markPlayerDisconnected', clientId)
  }
}

// ── Ruleset export ─────────────────────────────────────────────

/**
 * The poker game ruleset consumed by VGFServer.
 * Conforms to the GameRuleset interface from @volley/vgf/types.
 */
export const pokerRuleset = {
  setup: createInitialState,
  reducers,
  thunks,
  phases,
  actions: {},
  onConnect,
  onDisconnect,
} satisfies GameRuleset<PokerGameState>

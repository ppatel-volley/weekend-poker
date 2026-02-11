import type { GameRuleset, GameReducer, GameThunk, IThunkContext, IConnectionLifeCycleContext } from '@volley/vgf/types'
import { ClientType } from '@volley/vgf/types'
import type { PokerGameState, PokerPlayer, PlayerAction, Card, TTSMessage, HandHighlight, BotDifficulty } from '@weekend-poker/shared'
import { PokerPhase, DEFAULT_BLIND_LEVEL, MAX_PLAYERS, MIN_PLAYERS_TO_START, STARTING_STACK, BLIND_LEVELS } from '@weekend-poker/shared'
import {
  calculateSidePots,
  rotateDealerButton as rotateDealerButtonFn,
  createDeck,
  shuffleDeck,
  evaluateHand,
  compareHands,
  getLegalActions,
  isBettingRoundComplete,
  isOnlyOnePlayerRemaining,
  areAllRemainingPlayersAllIn,
  getSmallBlindIndex,
  getBigBlindIndex,
  findFirstActivePlayerLeftOfButton,
  findFirstActivePlayerLeftOfBB,
  nextActivePlayer,
  getServerHandState,
  setServerHandState,
} from '../poker-engine/index.js'
import type { HandRank } from '../poker-engine/index.js'
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

  updatePlayerBet: ((state: PokerGameState, playerId: string, amount: number): PokerGameState => {
    return {
      ...state,
      players: state.players.map(p => {
        if (p.id !== playerId) return p
        const additionalChips = amount - p.bet
        const newStack = p.stack - additionalChips
        return {
          ...p,
          bet: amount,
          stack: newStack,
          status: newStack <= 0 ? 'all_in' as const : p.status,
        }
      }),
      currentBet: Math.max(state.currentBet, amount),
      // Update minRaiseIncrement when this is a raise above the current bet
      minRaiseIncrement: amount > state.currentBet
        ? Math.max(state.minRaiseIncrement, amount - state.currentBet)
        : state.minRaiseIncrement,
    }
  }) satisfies Reducer<[string, number]>,

  foldPlayer: ((state: PokerGameState, playerId: string): PokerGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, status: 'folded' as const, lastAction: 'fold' as const } : p,
      ),
    }
  }) satisfies Reducer<[string]>,

  dealCommunityCards: ((state: PokerGameState, cards: Card[]): PokerGameState => {
    return {
      ...state,
      communityCards: [...state.communityCards, ...cards],
    }
  }) satisfies Reducer<[Card[]]>,

  rotateDealerButton: ((state: PokerGameState): PokerGameState => {
    const newDealerIndex = rotateDealerButtonFn(state.players, state.dealerIndex)
    return { ...state, dealerIndex: newDealerIndex }
  }) satisfies Reducer,

  updatePot: ((state: PokerGameState): PokerGameState => {
    const totalBets = state.players.reduce((sum, p) => sum + p.bet, 0)
    if (totalBets === 0) return state

    const newSidePots = calculateSidePots(state.players)

    // Merge new side pots with any existing ones from prior betting rounds.
    // Side pots with identical eligible player sets are combined; otherwise appended.
    const mergedPots = state.sidePots.map(p => ({ ...p, eligiblePlayerIds: [...p.eligiblePlayerIds] }))
    for (const newPot of newSidePots) {
      const keyNew = [...newPot.eligiblePlayerIds].sort().join(',')
      const existing = mergedPots.find(p => [...p.eligiblePlayerIds].sort().join(',') === keyNew)
      if (existing) {
        existing.amount += newPot.amount
      } else {
        mergedPots.push({ ...newPot })
      }
    }

    return {
      ...state,
      pot: state.pot + totalBets,
      sidePots: mergedPots,
      currentBet: 0,
      players: state.players.map(p => ({ ...p, bet: 0 })),
    }
  }) satisfies Reducer,

  awardPot: ((state: PokerGameState, winnerIds: string[], amounts: number[]): PokerGameState => {
    // Build a map of winnerId -> total amount awarded
    const winnings = new Map<string, number>()
    for (let i = 0; i < winnerIds.length; i++) {
      const id = winnerIds[i]!
      winnings.set(id, (winnings.get(id) ?? 0) + amounts[i]!)
    }

    return {
      ...state,
      pot: 0,
      sidePots: [],
      players: state.players.map(p => {
        const award = winnings.get(p.id)
        return award ? { ...p, stack: p.stack + award } : p
      }),
    }
  }) satisfies Reducer<[string[], number[]]>,

  setActivePlayer: ((state: PokerGameState, playerIndex: number): PokerGameState => {
    return { ...state, activePlayerIndex: playerIndex }
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

  updateDealerCharacter: ((state: PokerGameState, characterId: string): PokerGameState => {
    return { ...state, dealerCharacterId: characterId }
  }) satisfies Reducer<[string]>,

  updateBlindLevel: ((state: PokerGameState, level: number): PokerGameState => {
    const blindLevel = BLIND_LEVELS.find(bl => bl.level === level)
    if (!blindLevel) return state
    return {
      ...state,
      blindLevel,
      minRaiseIncrement: blindLevel.bigBlind,
    }
  }) satisfies Reducer<[number]>,

  addBotPlayer: ((state: PokerGameState, seatIndex: number, difficulty: string): PokerGameState => {
    const botId = `bot-${seatIndex}`
    const botPlayer: PokerPlayer = {
      id: botId,
      name: `Bot ${seatIndex + 1}`,
      seatIndex,
      stack: STARTING_STACK,
      bet: 0,
      status: 'active',
      lastAction: null,
      isBot: true,
      botConfig: {
        difficulty: difficulty as BotDifficulty,
        personalityId: `bot-personality-${seatIndex}`,
      },
      isConnected: true,
      sittingOutHandCount: 0,
    }
    return { ...state, players: [...state.players, botPlayer] }
  }) satisfies Reducer<[number, string]>,

  removeBotPlayer: ((state: PokerGameState, playerId: string): PokerGameState => {
    return {
      ...state,
      players: state.players.filter(p => !(p.id === playerId && p.isBot)),
    }
  }) satisfies Reducer<[string]>,

  updateEmotionalState: ((state: PokerGameState, emotion: string): PokerGameState => {
    return { ...state, dealerEmotion: emotion }
  }) satisfies Reducer<[string]>,

  updateOpponentProfile: ((state: PokerGameState, playerId: string, profileData: unknown): PokerGameState => {
    return {
      ...state,
      opponentProfiles: {
        ...(state['opponentProfiles'] as Record<string, unknown> ?? {}),
        [playerId]: profileData,
      },
    }
  }) satisfies Reducer<[string, unknown]>,

  setPlayerLastAction: ((state: PokerGameState, playerId: string, action: string | null): PokerGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, lastAction: action as PlayerAction | null } : p,
      ),
    }
  }) satisfies Reducer<[string, string | null]>,

  updateSessionHighlights: ((state: PokerGameState, highlight: HandHighlight): PokerGameState => {
    const stats = { ...state.sessionStats }

    // Update largest pot if this highlight's pot is bigger
    if (!stats.largestPot || highlight.potSize > stats.largestPot.potSize) {
      stats.largestPot = highlight
    }

    return { ...state, sessionStats: stats }
  }) satisfies Reducer<[HandHighlight]>,

  enqueueTTSMessage: ((state: PokerGameState, message: TTSMessage): PokerGameState => {
    return { ...state, ttsQueue: [...state.ttsQueue, message] }
  }) satisfies Reducer<[TTSMessage]>,

  markDealingComplete: ((state: PokerGameState, complete?: boolean): PokerGameState => {
    return { ...state, dealingComplete: complete ?? true }
  }) satisfies Reducer<[boolean?]>,

  resetHandState: ((state: PokerGameState): PokerGameState => {
    return {
      ...state,
      communityCards: [],
      pot: 0,
      sidePots: [],
      currentBet: 0,
      minRaiseIncrement: state.blindLevel.bigBlind,
      handHistory: [],
      lastAggressor: null,
      dealingComplete: false,
      dealerMessage: null,
      players: state.players.map(p => ({
        ...p,
        bet: 0,
        lastAction: null,
        status: p.status === 'busted' ? 'busted' as const
          : p.status === 'sitting_out' ? 'sitting_out' as const
          : 'active' as const,
      })),
    }
  }) satisfies Reducer,

  setHandNumber: ((state: PokerGameState, handNumber: number): PokerGameState => {
    return { ...state, handNumber }
  }) satisfies Reducer<[number]>,

  setCurrentBet: ((state: PokerGameState, amount: number): PokerGameState => {
    return { ...state, currentBet: amount }
  }) satisfies Reducer<[number]>,

  setMinRaiseIncrement: ((state: PokerGameState, amount: number): PokerGameState => {
    return { ...state, minRaiseIncrement: amount }
  }) satisfies Reducer<[number]>,

  markPlayerBusted: ((state: PokerGameState, playerId: string): PokerGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, status: 'busted' as const } : p,
      ),
    }
  }) satisfies Reducer<[string]>,
}

// ── Shared helpers ─────────────────────────────────────────────

/**
 * Evaluates hands and determines pot distribution.
 * Returns { winnerIds, amounts } for use with the awardPot reducer.
 * Handles both single-winner (sole remaining) and multi-player showdown with side pots.
 */
function resolveWinners(
  state: PokerGameState,
  sessionId: string,
): { winnerIds: string[]; amounts: number[] } | null {
  const serverState = getServerHandState(sessionId)
  const remaining = state.players.filter(
    p => p.status === 'active' || p.status === 'all_in',
  )

  // If only one player remains (everyone else folded), they win by default
  if (remaining.length === 1) {
    return { winnerIds: [remaining[0]!.id], amounts: [state.pot] }
  }

  // Evaluate each remaining player's hand
  const playerHands: Array<{ playerId: string; hand: HandRank }> = []
  for (const player of remaining) {
    const holeCards = serverState?.holeCards.get(player.id)
    if (!holeCards) continue
    const allCards = [...holeCards, ...state.communityCards]
    const hand = evaluateHand(allCards)
    playerHands.push({ playerId: player.id, hand })
  }

  // Handle side pots if they exist, otherwise treat as a single pot
  const pots = state.sidePots.length > 0
    ? state.sidePots
    : [{ amount: state.pot, eligiblePlayerIds: remaining.map(p => p.id) }]

  const winnerIds: string[] = []
  const amounts: number[] = []

  for (const pot of pots) {
    // Find best hand(s) among eligible players in this pot
    const eligible = playerHands.filter(ph => pot.eligiblePlayerIds.includes(ph.playerId))
    if (eligible.length === 0) continue

    // Sort best-first
    eligible.sort((a, b) => compareHands(b.hand, a.hand))

    // Find all players tied for best
    const bestHand = eligible[0]!.hand
    const winners = eligible.filter(e => compareHands(e.hand, bestHand) === 0)

    // Split the pot among winners (integer division, remainder to first winner)
    const share = Math.floor(pot.amount / winners.length)
    const remainder = pot.amount - (share * winners.length)

    for (let i = 0; i < winners.length; i++) {
      winnerIds.push(winners[i]!.playerId)
      amounts.push(share + (i === 0 ? remainder : 0))
    }
  }

  return { winnerIds, amounts }
}

/** Advances to the next active player if the betting round is not yet over. */
function advanceToNextPlayer(ctx: ThunkCtx): void {
  const state = ctx.getState()
  if (!isBettingRoundComplete(state) && !isOnlyOnePlayerRemaining(state)) {
    const nextIdx = nextActivePlayer(state.players, state.activePlayerIndex)
    if (nextIdx !== -1) {
      ctx.dispatch('setActivePlayer', nextIdx)
    }
  }
}

// ── Global thunks ──────────────────────────────────────────────

const thunks: Record<string, Thunk<any>> = {
  /**
   * Central action handler — validates legality, executes via reducers,
   * and advances to the next active player.
   */
  processPlayerAction: (async (ctx: ThunkCtx, playerId: string, action: PlayerAction, amount?: number) => {
    const state = ctx.getState()
    const player = state.players.find(p => p.id === playerId)
    if (!player) return

    // Validate turn order
    if (state.players[state.activePlayerIndex]?.id !== playerId) return

    // Validate action legality
    const legalActions = getLegalActions(state, playerId)
    if (!legalActions.includes(action)) return

    // Execute the action
    switch (action) {
      case 'fold':
        ctx.dispatch('foldPlayer', playerId)
        break
      case 'check':
        // No bet change — just record the action
        break
      case 'call': {
        ctx.dispatch('updatePlayerBet', playerId, state.currentBet)
        break
      }
      case 'bet':
        if (amount === undefined) return
        ctx.dispatch('updatePlayerBet', playerId, amount)
        break
      case 'raise':
        if (amount === undefined) return
        ctx.dispatch('updatePlayerBet', playerId, amount)
        break
      case 'all_in':
        ctx.dispatch('updatePlayerBet', playerId, player.stack + player.bet)
        break
    }

    // Record the action
    ctx.dispatch('setPlayerLastAction', playerId, action)

    // Advance to the next active player (if the round isn't over)
    advanceToNextPlayer(ctx)
  }) satisfies Thunk<[string, PlayerAction, number?]>,

  processVoiceCommand: (async (ctx: ThunkCtx, transcript: string) => {
    const result = parseVoiceIntent(transcript)
    console.log('[voice]', JSON.stringify(result))

    const actionIntents = ['fold', 'check', 'call', 'bet', 'raise', 'all_in']
    if (actionIntents.includes(result.intent)) {
      ctx.dispatch('setPlayerLastAction', ctx.getClientId(), result.intent)
    }
  }) satisfies Thunk<[string]>,

  /**
   * Resets hand state in preparation for a new hand.
   * Called at the start of the PostingBlinds phase.
   */
  startHand: (async (ctx: ThunkCtx) => {
    ctx.dispatch('resetHandState')
  }) satisfies Thunk,

  /**
   * Evaluates all remaining (non-folded) players' hands and awards
   * the pot. Uses the server-side hole cards combined with community cards.
   */
  evaluateHands: (async (ctx: ThunkCtx) => {
    const result = resolveWinners(ctx.getState(), ctx.getSessionId())
    if (result) {
      ctx.dispatch('awardPot', result.winnerIds, result.amounts)
    }
  }) satisfies Thunk,

  /**
   * Distributes pots to winners. Handles the case where everyone
   * has folded (sole remaining player wins) as well as showdown scenarios.
   */
  distributePot: (async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const remaining = state.players.filter(
      p => p.status === 'active' || p.status === 'all_in',
    )

    // If only one player remains, they win the entire pot
    if (remaining.length === 1) {
      ctx.dispatch('awardPot', [remaining[0]!.id], [state.pot])
      return
    }

    // Otherwise, use evaluateHands to determine winners
    await ctx.dispatchThunk('evaluateHands')
  }) satisfies Thunk,

  botDecision: (async (_ctx: ThunkCtx) => {
    // TODO: Run bot AI logic based on difficulty and dispatch the chosen action
  }) satisfies Thunk,

  /**
   * Auto-action for timed-out or disconnected players.
   * Checks if legal (no bet facing), otherwise folds.
   */
  autoFoldPlayer: (async (ctx: ThunkCtx, playerId: string) => {
    const state = ctx.getState()
    const legalActions = getLegalActions(state, playerId)

    if (legalActions.includes('check')) {
      ctx.dispatch('setPlayerLastAction', playerId, 'check')
    } else {
      ctx.dispatch('foldPlayer', playerId)
    }

    advanceToNextPlayer(ctx)
  }) satisfies Thunk<[string]>,

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

// ── Phase helper: betting phase endIf (shared by all 4 betting phases) ──

function bettingEndIf(ctx: any): boolean {
  const state: PokerGameState = ctx.getState()
  return isBettingRoundComplete(state) || isOnlyOnePlayerRemaining(state)
}

/** Determines the next phase after a betting round. Shared by all betting phases. */
function bettingNextPhase(ctx: any, normalNext: string): string {
  const state: PokerGameState = ctx.getState()
  if (isOnlyOnePlayerRemaining(state)) return PokerPhase.HandComplete
  if (areAllRemainingPlayersAllIn(state)) return PokerPhase.AllInRunout
  return normalNext
}

/** Shared onBegin for post-flop betting phases (flop, turn, river). */
function postFlopBettingOnBegin(ctx: any): void {
  const state: PokerGameState = ctx.getState()
  const firstToAct = findFirstActivePlayerLeftOfButton(state.players, state.dealerIndex)
  ctx.dispatch('setActivePlayer', firstToAct)
  ctx.dispatch('setCurrentBet', 0)
  ctx.dispatch('setMinRaiseIncrement', state.blindLevel.bigBlind)
  // Reset player lastActions for the new betting round
  for (const player of state.players) {
    if (player.status === 'active') {
      ctx.dispatch('setPlayerLastAction', player.id, null)
    }
  }
}

/**
 * Shared onBegin for dealing phases — burns a card and deals N community cards.
 * Updates the server-side deck state accordingly.
 */
function dealCommunityOnBegin(ctx: any, cardCount: number): void {
  const sessionId = ctx.getSessionId()
  const serverState = getServerHandState(sessionId)
  if (!serverState) return

  const deck = [...serverState.deck]

  // Burn one card
  deck.shift()

  // Deal the specified number of cards
  const dealtCards = deck.splice(0, cardCount)
  ctx.dispatch('dealCommunityCards', dealtCards)
  ctx.dispatch('markDealingComplete', true)

  // Update the deck in server state
  setServerHandState(sessionId, { ...serverState, deck })
}

// ── Phase definitions ────────────────────────────────────────────

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
    const state: PokerGameState = ctx.getState()

    // Reset hand state for the new hand
    ctx.dispatch('resetHandState')

    // Increment hand number
    ctx.dispatch('setHandNumber', state.handNumber + 1)

    // Rotate dealer button
    ctx.dispatch('rotateDealerButton')

    const updated: PokerGameState = ctx.getState()
    const dealerIndex = updated.dealerIndex

    // Identify blind positions
    const sbIndex = getSmallBlindIndex(updated.players, dealerIndex)
    const bbIndex = getBigBlindIndex(updated.players, dealerIndex)
    const sbPlayer = updated.players[sbIndex]!
    const bbPlayer = updated.players[bbIndex]!

    // Post small blind
    ctx.dispatch('updatePlayerBet', sbPlayer.id, updated.blindLevel.smallBlind)
    ctx.dispatch('setPlayerLastAction', sbPlayer.id, 'post_small_blind')

    // Post big blind
    ctx.dispatch('updatePlayerBet', bbPlayer.id, updated.blindLevel.bigBlind)
    ctx.dispatch('setPlayerLastAction', bbPlayer.id, 'post_big_blind')

    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: PokerGameState = ctx.getState()
    // Check both blinds are posted by looking for the blind posting actions
    const sbPosted = state.players.some(p => p.lastAction === 'post_small_blind' && p.bet > 0)
    const bbPosted = state.players.some(p => p.lastAction === 'post_big_blind' && p.bet > 0)
    return sbPosted && bbPosted
  },
  next: PokerPhase.DealingHoleCards,
})

const dealingHoleCardsPhase = makePhase({
  onBegin: (ctx: any) => {
    const state: PokerGameState = ctx.getState()
    const sessionId = ctx.getSessionId()

    // Create and shuffle a fresh deck
    const deck = shuffleDeck(createDeck())

    // Determine active players (not busted, not sitting out)
    const activePlayers = state.players.filter(
      p => p.status !== 'busted' && p.status !== 'sitting_out',
    )

    // Deal 2 cards per player, one at a time, clockwise from left of button
    const startIndex = activePlayers.length > 0
      ? (state.dealerIndex + 1) % activePlayers.length
      : 0
    const holeCards = new Map<string, [Card, Card]>()
    let deckIndex = 0
    const cardsByPlayer = new Map<string, Card[]>()
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < activePlayers.length; i++) {
        const playerIndex = (startIndex + i) % activePlayers.length
        const player = activePlayers[playerIndex]!
        const cards = cardsByPlayer.get(player.id) ?? []
        cards.push(deck[deckIndex]!)
        cardsByPlayer.set(player.id, cards)
        deckIndex++
      }
    }
    for (const [playerId, cards] of cardsByPlayer) {
      holeCards.set(playerId, [cards[0]!, cards[1]!])
    }

    // Store in server-side state (not broadcast to clients)
    setServerHandState(sessionId, {
      deck: deck.slice(deckIndex),
      holeCards,
    })

    ctx.dispatch('markDealingComplete', true)
    return ctx.getState()
  },
  endIf: (ctx: any) => {
    return ctx.getState().dealingComplete === true
  },
  onEnd: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    return ctx.getState()
  },
  next: PokerPhase.PreFlopBetting,
})

const preFlopBettingPhase = makePhase({
  onBegin: (ctx: any) => {
    const state: PokerGameState = ctx.getState()
    // UTG = first active player left of big blind
    const firstToAct = findFirstActivePlayerLeftOfBB(state.players, state.dealerIndex)
    ctx.dispatch('setActivePlayer', firstToAct)
    // currentBet is already set from the big blind posting
    ctx.dispatch('setCurrentBet', state.blindLevel.bigBlind)
    return ctx.getState()
  },
  onEnd: (ctx: any) => {
    ctx.dispatch('updatePot')
    return ctx.getState()
  },
  endIf: bettingEndIf,
  next: (ctx: any) => bettingNextPhase(ctx, PokerPhase.DealingFlop),
})

const dealingFlopPhase = makePhase({
  onBegin: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    dealCommunityOnBegin(ctx, 3)
    return ctx.getState()
  },
  endIf: (ctx: any) => ctx.getState().dealingComplete === true,
  onEnd: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    return ctx.getState()
  },
  next: PokerPhase.FlopBetting,
})

const flopBettingPhase = makePhase({
  onBegin: (ctx: any) => {
    postFlopBettingOnBegin(ctx)
    return ctx.getState()
  },
  onEnd: (ctx: any) => {
    ctx.dispatch('updatePot')
    return ctx.getState()
  },
  endIf: bettingEndIf,
  next: (ctx: any) => bettingNextPhase(ctx, PokerPhase.DealingTurn),
})

const dealingTurnPhase = makePhase({
  onBegin: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    dealCommunityOnBegin(ctx, 1)
    return ctx.getState()
  },
  endIf: (ctx: any) => ctx.getState().dealingComplete === true,
  onEnd: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    return ctx.getState()
  },
  next: PokerPhase.TurnBetting,
})

const turnBettingPhase = makePhase({
  onBegin: (ctx: any) => {
    postFlopBettingOnBegin(ctx)
    return ctx.getState()
  },
  onEnd: (ctx: any) => {
    ctx.dispatch('updatePot')
    return ctx.getState()
  },
  endIf: bettingEndIf,
  next: (ctx: any) => bettingNextPhase(ctx, PokerPhase.DealingRiver),
})

const dealingRiverPhase = makePhase({
  onBegin: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    dealCommunityOnBegin(ctx, 1)
    return ctx.getState()
  },
  endIf: (ctx: any) => ctx.getState().dealingComplete === true,
  onEnd: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    return ctx.getState()
  },
  next: PokerPhase.RiverBetting,
})

const riverBettingPhase = makePhase({
  onBegin: (ctx: any) => {
    postFlopBettingOnBegin(ctx)
    return ctx.getState()
  },
  onEnd: (ctx: any) => {
    ctx.dispatch('updatePot')
    return ctx.getState()
  },
  endIf: bettingEndIf,
  next: (ctx: any) => {
    const state: PokerGameState = ctx.getState()
    if (isOnlyOnePlayerRemaining(state)) return PokerPhase.HandComplete
    return PokerPhase.Showdown
  },
})

const allInRunoutPhase = makePhase({
  onBegin: (ctx: any) => {
    const state: PokerGameState = ctx.getState()
    const sessionId = ctx.getSessionId()
    const serverState = getServerHandState(sessionId)
    if (!serverState) return ctx.getState()

    const deck = [...serverState.deck]
    const cardsNeeded = 5 - state.communityCards.length

    // Deal remaining cards with burns
    for (let i = 0; i < cardsNeeded; i++) {
      deck.shift() // burn
      const card = deck.shift()
      if (card) {
        ctx.dispatch('dealCommunityCards', [card])
      }
    }

    setServerHandState(sessionId, { ...serverState, deck })
    return ctx.getState()
  },
  endIf: () => true, // Immediate transition
  next: PokerPhase.Showdown,
})

const showdownPhase = makePhase({
  onBegin: (ctx: any) => {
    // Showdown evaluates hands — the actual evaluation happens in the
    // evaluateHands thunk which is called from here or from distributePot
    return ctx.getState()
  },
  endIf: () => true,
  next: PokerPhase.PotDistribution,
})

const potDistributionPhase = makePhase({
  onBegin: (ctx: any) => {
    const result = resolveWinners(ctx.getState(), ctx.getSessionId())
    if (result) {
      ctx.dispatch('awardPot', result.winnerIds, result.amounts)
    }
    return ctx.getState()
  },
  endIf: () => true,
  next: PokerPhase.HandComplete,
})

const handCompletePhase = makePhase({
  onBegin: (ctx: any) => {
    const state: PokerGameState = ctx.getState()

    // Mark players with zero stack as busted
    for (const player of state.players) {
      if (player.stack === 0 && player.status !== 'busted') {
        ctx.dispatch('markPlayerBusted', player.id)
      }
    }

    return ctx.getState()
  },
  endIf: () => true,
  next: (ctx: any) => {
    const state: PokerGameState = ctx.getState()
    const playablePlayers = state.players.filter(
      p => p.status !== 'busted' && p.status !== 'sitting_out',
    )
    if (playablePlayers.length < MIN_PLAYERS_TO_START) {
      return PokerPhase.Lobby
    }
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

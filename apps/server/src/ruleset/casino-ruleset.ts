/**
 * Casino multi-game ruleset — Integrates Lobby, GameSelect, and all game phases.
 *
 * Per D-001: Single GameRuleset with phase namespaces instead of per-game rulesets.
 * This file expands pokerRuleset into casinoRuleset, unifying:
 *   - Shared phases (Lobby, GameSelect)
 *   - Hold'em phases (unprefixed per D-003)
 *   - Future game phases (Roulette*, TCP*, Craps*, etc.)
 *
 * State Management (D-002, D-005):
 *   - Root state: CasinoGameState (flat union with optional game sub-objects)
 *   - Server-side: ServerGameState (private decks, hole cards, pre-generated rolls)
 *   - Wallet: 10,000 chips starting balance, sync points at SP1/SP2/SP3
 */

import type { GameRuleset, IConnectionLifeCycleContext, IThunkContext } from '@volley/vgf/types'
import { ClientType } from '@volley/vgf/types'
import type { CasinoGameState, CasinoPlayer, Card, BotDifficulty, PlayerAction, SidePot } from '@weekend-casino/shared'
import { CasinoPhase, MAX_PLAYERS, STARTING_WALLET_BALANCE, STARTING_STACK, BLIND_LEVELS, BETTING_PHASES } from '@weekend-casino/shared'
import { createInitialCasinoState, casinoReducers, casinoThunks } from './casino-state.js'
import { lobbyPhase, gameSelectPhase } from './casino-phases.js'
import { tcpReducers } from './tcp-reducers.js'
import { tcpThunks } from './tcp-thunks.js'
import {
  tcpPlaceBetsPhase,
  tcpDealCardsPhase,
  tcpPlayerDecisionsPhase,
  tcpDealerRevealPhase,
  tcpSettlementPhase,
  tcpRoundCompletePhase,
} from './tcp-phases.js'
import { bjReducers } from './bj-reducers.js'
import { bjThunks } from './bj-thunks.js'
import {
  bjPlaceBetsPhase,
  bjDealInitialPhase,
  bjInsurancePhase,
  bjPlayerTurnsPhase,
  bjDealerTurnPhase,
  bjSettlementPhase,
  bjHandCompletePhase,
} from './bj-phases.js'
import { bjcReducers } from './bjc-reducers.js'
import { bjcThunks } from './bjc-thunks.js'
import {
  bjcPlaceBetsPhase,
  bjcDealInitialPhase,
  bjcPlayerTurnsPhase,
  bjcShowdownPhase,
  bjcSettlementPhase,
  bjcHandCompletePhase,
} from './bjc-phases.js'
import { rouletteReducers } from './roulette-reducers.js'
import { rouletteThunks } from './roulette-thunks.js'
import {
  roulettePlaceBetsPhase,
  rouletteNoMoreBetsPhase,
  rouletteSpinPhase,
  rouletteResultPhase,
  roulettePayoutPhase,
  rouletteRoundCompletePhase,
} from './roulette-phases.js'
import {
  drawResetHand,
  drawSetHands,
  drawSelectDiscard,
  drawConfirmDiscard,
  drawReplaceCards,
  drawMarkComplete,
  drawSetActivePlayer,
  drawUpdatePlayerBet,
  drawFoldPlayer,
  drawUpdatePot,
  drawAwardPot,
  drawSetCurrentBet,
  drawSetMinRaiseIncrement,
} from './draw-reducers.js'
import {
  drawProcessAction,
  drawProcessDiscard,
  drawExecuteReplace,
  drawEvaluateAndDistribute,
} from './draw-thunks.js'
import {
  drawPostingBlindsPhase,
  drawDealingPhase,
  drawBetting1Phase,
  drawDrawPhasePhase,
  drawBetting2Phase,
  drawShowdownPhase,
  drawPotDistributionPhase,
  drawHandCompletePhase,
} from './draw-phases.js'
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
import { BotManager } from '../bot-engine/index.js'
import { wrapWithGameNightCheck } from './game-night-utils.js'
import { validatePlayerIdOrBot, getAuthorizedPlayerId, isCallerHost, validateBetAmount } from './security.js'
import { registerConnection, unregisterConnection, emitToClient } from './connection-registry.js'

// ── Bot Manager (module-level singleton per server process) ─────
const botManager = new BotManager()

// ── Type aliases for brevity ──────────────────────────────────────

type ThunkCtx = IThunkContext<CasinoGameState>
type ConnCtx = IConnectionLifeCycleContext<CasinoGameState>

// VGF framework boundary: CasinoGameState is a structural superset of PokerGameState
// but TypeScript can't verify this due to different `players` and `phase` types.
// These helpers document the boundary and keep the cast in one place.
type PokerCompatState = Parameters<typeof getLegalActions>[0]
const asPokerState = (state: CasinoGameState): PokerCompatState => state as unknown as PokerCompatState

// ── Hold'em-specific reducers ──────────────────────────────────────
//
// Per D-003 (unprefixed for Hold'em), these are namespaced under the casino.
// They remain largely unchanged from pokerRuleset for backwards compatibility.

const holdemReducers = {
  updatePlayerBet: ((state: CasinoGameState, playerId: string, amount: number): CasinoGameState => {
    return {
      ...state,
      players: state.players.map(p => {
        if (p.id !== playerId) return p
        const additionalChips = amount - p.bet
        const newStack = Math.max(0, p.stack - additionalChips)
        return {
          ...p,
          bet: amount,
          stack: newStack,
          status: newStack <= 0 ? 'all_in' as const : p.status,
        }
      }),
      currentBet: Math.max(state.currentBet, amount),
      minRaiseIncrement: amount > state.currentBet
        ? Math.max(state.minRaiseIncrement, amount - state.currentBet)
        : state.minRaiseIncrement,
    }
  }),

  foldPlayer: ((state: CasinoGameState, playerId: string): CasinoGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, status: 'folded' as const, lastAction: 'fold' as const } : p,
      ),
    }
  }),

  dealCommunityCards: ((state: CasinoGameState, cards: Card[]): CasinoGameState => {
    return {
      ...state,
      communityCards: [...state.communityCards, ...cards],
    }
  }),

  rotateDealerButton: ((state: CasinoGameState): CasinoGameState => {
    const newDealerIndex = rotateDealerButtonFn(state.players, state.dealerIndex)
    return { ...state, dealerIndex: newDealerIndex }
  }),

  updatePot: ((state: CasinoGameState): CasinoGameState => {
    const totalBets = state.players.reduce((sum, p) => sum + p.bet, 0)
    if (totalBets === 0) return state

    const newSidePots = calculateSidePots(state.players)
    const mergedPots: SidePot[] = state.sidePots.map(p => ({ ...p, eligiblePlayerIds: [...p.eligiblePlayerIds] }))
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
  }),

  awardPot: ((state: CasinoGameState, winnerIds: string[], amounts: number[]): CasinoGameState => {
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
  }),

  setActivePlayer: ((state: CasinoGameState, playerIndex: number): CasinoGameState => {
    return { ...state, activePlayerIndex: playerIndex }
  }),

  updateBlindLevel: ((state: CasinoGameState, level: number): CasinoGameState => {
    const newLevel = BLIND_LEVELS[level - 1]
    if (!newLevel) return state
    return {
      ...state,
      blindLevel: newLevel,
      minRaiseIncrement: newLevel.bigBlind,
    }
  }),

  setPlayerLastAction: ((state: CasinoGameState, playerId: string, action: PlayerAction | null): CasinoGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, lastAction: action } : p,
      ),
    }
  }),

  markDealingComplete: ((state: CasinoGameState, complete?: boolean): CasinoGameState => {
    return { ...state, dealingComplete: complete ?? true }
  }),

  resetHandState: ((state: CasinoGameState): CasinoGameState => {
    return {
      ...state,
      communityCards: [],
      pot: 0,
      sidePots: [],
      currentBet: 0,
      minRaiseIncrement: state.blindLevel.bigBlind,
      holeCards: {},
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
  }),

  setHandNumber: ((state: CasinoGameState, handNumber: number): CasinoGameState => {
    return { ...state, handNumber }
  }),

  setCurrentBet: ((state: CasinoGameState, amount: number): CasinoGameState => {
    return { ...state, currentBet: amount }
  }),

  setMinRaiseIncrement: ((state: CasinoGameState, amount: number): CasinoGameState => {
    return { ...state, minRaiseIncrement: amount }
  }),

  markPlayerBusted: ((state: CasinoGameState, playerId: string): CasinoGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, status: 'busted' as const } : p,
      ),
    }
  }),

  updatePlayerName: ((state: CasinoGameState, playerId: string, name: string): CasinoGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, name } : p,
      ),
    }
  }),

  updateDealerCharacter: ((state: CasinoGameState, characterId: string): CasinoGameState => {
    return { ...state, dealerCharacterId: characterId }
  }),

  addBotPlayer: ((state: CasinoGameState, seatIndex: number, difficulty: BotDifficulty): CasinoGameState => {
    const botId = `bot-${seatIndex}`
    return {
      ...state,
      players: [
        ...state.players,
        {
          id: botId,
          name: `Bot ${seatIndex}`,
          avatarId: 'default',
          seatIndex,
          stack: STARTING_STACK,
          bet: 0,
          status: 'active' as const,
          lastAction: null,
          isBot: true,
          isHost: false,
          isReady: true,
          currentGameStatus: 'active',
          botConfig: { difficulty, personalityId: 'default' },
          isConnected: true,
          sittingOutHandCount: 0,
        } satisfies CasinoPlayer,
      ],
    }
  }),

  removeBotPlayer: ((state: CasinoGameState, botId: string): CasinoGameState => {
    return {
      ...state,
      players: state.players.filter(p => !(p.id === botId && p.isBot)),
    }
  }),

  updateEmotionalState: ((state: CasinoGameState, _playerId: string, _emotionalState: unknown): CasinoGameState => {
    // Deferred: bot emotional states not implemented in v1
    return state
  }),

  updateOpponentProfile: ((state: CasinoGameState, _playerId: string, _profile: unknown): CasinoGameState => {
    // Deferred: opponent profiling not implemented in v1
    return state
  }),

  enqueueTTSMessage: ((state: CasinoGameState, message: unknown): CasinoGameState => {
    // Delegate to casinoEnqueueTTS in casinoReducers
    return { ...state, ttsQueue: [...state.ttsQueue, message as CasinoGameState['ttsQueue'][number]] }
  }),

  updateSessionHighlights: ((state: CasinoGameState, highlight: { potSize: number }): CasinoGameState => {
    // sessionStats uses poker-compatible shape at runtime (see createInitialCasinoState)
    const stats = state.sessionStats as unknown as Record<string, unknown>
    const currentLargestPot = stats?.largestPot as { potSize: number } | null | undefined
    const shouldUpdate = !currentLargestPot || highlight.potSize > currentLargestPot.potSize

    return {
      ...state,
      sessionStats: {
        ...state.sessionStats,
        largestPot: shouldUpdate ? highlight : currentLargestPot,
      } as CasinoGameState['sessionStats'],
    }
  }),
}

// ── Hold'em-specific thunks ────────────────────────────────────────

const holdemThunks = {
  processPlayerAction: (async (ctx: ThunkCtx, claimedPlayerId: string, action: string, amount?: number) => {
    const state = ctx.getState()

    // SECURITY: Validate player identity — client-supplied playerId is untrusted
    const playerId = validatePlayerIdOrBot(ctx, claimedPlayerId, state)
    if (!playerId) return

    const player = state.players.find(p => p.id === playerId)
    if (!player) return

    if (state.players[state.activePlayerIndex]?.id !== playerId) return

    const legalActions = getLegalActions(asPokerState(state), playerId)
    if (!legalActions.includes(action as PlayerAction)) return

    // SECURITY: Validate bet/raise amounts (High #4)
    if ((action === 'bet' || action === 'raise') && amount !== undefined) {
      const error = validateBetAmount(
        amount,
        player.stack,
        player.bet,
        state.currentBet,
        state.minRaiseIncrement,
        action,
      )
      if (error) {
        ctx.dispatch('setBetError', playerId, error, Date.now() + 3000)
        return
      }
    }

    switch (action) {
      case 'fold':
        ctx.dispatch('foldPlayer', playerId)
        break
      case 'check':
        break
      case 'call':
        ctx.dispatch('updatePlayerBet', playerId, state.currentBet)
        break
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

    ctx.dispatch('setPlayerLastAction', playerId, action)
    advanceToNextPlayer(ctx)
  }),

  processVoiceCommand: (async (ctx: ThunkCtx, transcript: string) => {
    const result = parseVoiceIntent(transcript)
    console.log('[voice]', JSON.stringify(result))

    const state = ctx.getState()
    if (!(BETTING_PHASES as readonly string[]).includes(state.phase)) return

    // Hold'em betting actions: route through processPlayerAction for full validation
    const holdemActions = ['fold', 'check', 'call', 'bet', 'raise', 'all_in']
    if (holdemActions.includes(result.intent)) {
      const playerId = ctx.getClientId()
      const amount = result.entities?.amount !== undefined ? result.entities.amount : undefined
      await ctx.dispatchThunk('processPlayerAction', playerId, result.intent, amount)
      return
    }

    // TODO: Non-Hold'em game actions (hit/stand/draw/ante) — route through
    // their respective processAction thunks once voice support is expanded.
  }),

  startHand: (async (ctx: ThunkCtx) => {
    ctx.dispatch('resetHandState')
  }),

  evaluateHands: (async (ctx: ThunkCtx) => {
    const result = resolveWinners(ctx.getState(), ctx.getSessionId())
    if (result) {
      ctx.dispatch('awardPot', result.winnerIds, result.amounts)
    }
  }),

  distributePot: (async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const remaining = state.players.filter(
      p => p.status === 'active' || p.status === 'all_in',
    )

    if (remaining.length === 1) {
      ctx.dispatch('awardPot', [remaining[0]!.id], [state.pot])
      return
    }

    await ctx.dispatchThunk('evaluateHands')
  }),

  autoFoldPlayer: (async (ctx: ThunkCtx, playerId: string) => {
    const state = ctx.getState()
    const legalActions = getLegalActions(asPokerState(state), playerId)

    if (legalActions.includes('check')) {
      ctx.dispatch('setPlayerLastAction', playerId, 'check')
    } else {
      ctx.dispatch('foldPlayer', playerId)
    }

    advanceToNextPlayer(ctx)
  }),

  botDecision: (async (ctx: ThunkCtx, botId: string) => {
    const state = ctx.getState()
    const bot = state.players.find(p => p.id === botId)
    if (!bot || !bot.isBot) return

    const legalActions = getLegalActions(asPokerState(state), botId)
    if (legalActions.length === 0) return

    // Ensure bot is registered in the manager
    if (!botManager.isBot(botId)) {
      const difficulty: BotDifficulty = bot.botConfig?.difficulty ?? 'medium'
      const personalityId = bot.botConfig?.personalityId ?? 'vincent'
      botManager.addBot(bot.seatIndex, difficulty, personalityId)
    }

    // Read hole cards from server-side state (not broadcast state)
    const serverHoleCards = getServerHandState(ctx.getSessionId())?.holeCards.get(botId)
    const holeCards: Card[] = serverHoleCards ? [...serverHoleCards] : []

    const BOT_TIMEOUT_MS = 10_000
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Bot decision timeout')), BOT_TIMEOUT_MS),
    )

    let decision: Awaited<ReturnType<typeof botManager.requestBotAction>>
    try {
      decision = await Promise.race([
        botManager.requestBotAction({
          gameType: state.selectedGame ?? 'holdem',
          botPlayerId: botId,
          stack: bot.stack,
          bet: bot.bet,
          currentBet: state.currentBet,
          minRaiseIncrement: state.minRaiseIncrement,
          pot: state.pot,
          communityCards: state.communityCards,
          holeCards,
          legalActions,
          activePlayers: state.players.filter(p => p.status === 'active' || p.status === 'all_in').length,
          positionFromDealer: (state.players.indexOf(bot) - state.dealerIndex + state.players.length) % state.players.length,
          bigBlind: state.blindLevel.bigBlind,
          handNumber: state.handNumber,
        }),
        timeoutPromise,
      ])
    } catch {
      // Timeout or error — default to fold
      decision = { action: 'fold', amount: undefined, dialogue: undefined, thinkTimeMs: 0 }
    }

    // Set dialogue as dealer message if present
    if (decision.dialogue) {
      ctx.dispatch('setDealerMessage', `${bot.name}: ${decision.dialogue}`)
    }

    await ctx.dispatchThunk('processPlayerAction', botId, decision.action, decision.amount)
  }),

  /**
   * Securely delivers the calling player's own hole cards via targeted emit.
   * SECURITY: Cards are sent ONLY to the requesting client's connection,
   * never written to broadcast state. state.holeCards stays {} at all times.
   */
  requestMyHoleCards: (async (ctx: ThunkCtx) => {
    const authorizedId = getAuthorizedPlayerId(ctx)
    const sessionId = ctx.getSessionId()
    const serverState = getServerHandState(sessionId)
    if (!serverState) return

    const myCards = serverState.holeCards.get(authorizedId)
    if (!myCards) return

    // Deliver cards via targeted connection emit — NOT broadcast state.
    emitToClient(sessionId, authorizedId, 'privateHoleCards', {
      playerId: authorizedId,
      cards: myCards,
    })
  }),

  /**
   * Host-only game selection (High #5).
   * Moves selectGame from a plain reducer to a thunk with host authorization.
   */
  selectGameAsHost: (async (ctx: ThunkCtx, game: string) => {
    const state = ctx.getState()
    if (!isCallerHost(ctx, state)) {
      console.warn('[SECURITY] Non-host attempted to select game. Rejecting.')
      return
    }
    ctx.dispatch('setSelectedGame', game)
  }),

  /**
   * Host-only game selection confirmation (High #5).
   */
  confirmGameSelectAsHost: (async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    if (!isCallerHost(ctx, state)) {
      console.warn('[SECURITY] Non-host attempted to confirm game selection. Rejecting.')
      return
    }
    // SECURITY: Use internal reducer — 'confirmGameSelection' is blocked for clients.
    ctx.dispatch('_confirmGameSelectionInternal')
  }),

  // Full sit-out logic (skip in turn order, hold seat) deferred to v2.1
  sitOutPlayer: (async (ctx: ThunkCtx, playerId: string) => {
    const state = ctx.getState()
    const player = state.players.find(p => p.id === playerId)
    if (!player) return

    if (player.status !== 'busted') {
      ctx.dispatch('setPlayerLastAction', playerId, null)
    }
  }),

  // Full deal-in logic (validate seat, restore to active roster) deferred to v2.1
  dealInPlayer: (async (ctx: ThunkCtx, playerId: string) => {
    const state = ctx.getState()
    const player = state.players.find(p => p.id === playerId)
    if (!player) return
    // No-op: player remains in roster, will be dealt in on next hand
  }),

  // Full session end (persist stats, leaderboard) deferred to v2.1
  endSession: (async (ctx: ThunkCtx) => {
    ctx.dispatch('setDealerMessage', 'Session ending. Thanks for playing!')
  }),
}

// ── Shared helpers ────────────────────────────────────────────────

function resolveWinners(
  state: CasinoGameState,
  sessionId: string,
): { winnerIds: string[]; amounts: number[] } | null {
  const serverState = getServerHandState(sessionId)
  const remaining = state.players.filter(
    p => p.status === 'active' || p.status === 'all_in',
  )

  if (remaining.length === 1) {
    return { winnerIds: [remaining[0]!.id], amounts: [state.pot] }
  }

  const playerHands: Array<{ playerId: string; hand: HandRank }> = []
  for (const player of remaining) {
    const holeCards = serverState?.holeCards.get(player.id)
    if (!holeCards) continue
    const allCards = [...holeCards, ...state.communityCards]
    const hand = evaluateHand(allCards)
    playerHands.push({ playerId: player.id, hand })
  }

  const pots: SidePot[] = state.sidePots.length > 0
    ? state.sidePots
    : [{ amount: state.pot, eligiblePlayerIds: remaining.map(p => p.id) }]

  const winnerIds: string[] = []
  const amounts: number[] = []

  for (const pot of pots) {
    const eligible = playerHands.filter(ph => pot.eligiblePlayerIds.includes(ph.playerId))
    if (eligible.length === 0) continue

    eligible.sort((a, b) => compareHands(b.hand, a.hand))

    const bestHand = eligible[0]!.hand
    const winners = eligible.filter(e => compareHands(e.hand, bestHand) === 0)

    const share = Math.floor(pot.amount / winners.length)
    const remainder = pot.amount - (share * winners.length)

    for (let i = 0; i < winners.length; i++) {
      winnerIds.push(winners[i]!.playerId)
      amounts.push(share + (i === 0 ? remainder : 0))
    }
  }

  return { winnerIds, amounts }
}

function advanceToNextPlayer(ctx: ThunkCtx): void {
  const state = ctx.getState()
  const pokerState = asPokerState(state)
  if (!isBettingRoundComplete(pokerState) && !isOnlyOnePlayerRemaining(pokerState)) {
    const nextIdx = nextActivePlayer(state.players, state.activePlayerIndex)
    if (nextIdx !== -1) {
      ctx.dispatch('setActivePlayer', nextIdx)
    }
  }
}

function adaptPhaseCtx(vgfCtx: any) {
  return {
    get dispatch() { return vgfCtx.reducerDispatcher ?? vgfCtx.dispatch },
    get dispatchThunk() { return vgfCtx.thunkDispatcher ?? vgfCtx.dispatchThunk },
    getState: () => vgfCtx.getState?.() ?? vgfCtx.session?.state,
    getSessionId: () => vgfCtx.getSessionId?.() ?? vgfCtx.session?.sessionId,
    getMembers: () => vgfCtx.getMembers?.() ?? vgfCtx.session?.members,
    getClientId: () => vgfCtx.getClientId?.() ?? vgfCtx.connection?.id,
    get session() { return vgfCtx.session },
    get scheduler() { return vgfCtx.scheduler },
    get logger() { return vgfCtx.logger },
  }
}

function makePhase(overrides: {
  reducers?: Record<string, any>
  thunks?: Record<string, any>
  onBegin?: (ctx: any) => any
  onEnd?: (ctx: any) => any
  endIf?: (ctx: any) => boolean
  next: string | ((ctx: any) => string)
}) {
  const wrappedOnBegin = overrides.onBegin
    ? (ctx: any) => overrides.onBegin!(adaptPhaseCtx(ctx))
    : (ctx: any) => ctx.session.state

  const wrappedOnEnd = overrides.onEnd
    ? (ctx: any) => overrides.onEnd!(adaptPhaseCtx(ctx))
    : undefined

  return {
    actions: {} as Record<string, never>,
    reducers: overrides.reducers ?? {},
    thunks: overrides.thunks ?? {},
    onBegin: wrappedOnBegin,
    endIf: overrides.endIf ?? (() => false),
    next: overrides.next,
    ...(wrappedOnEnd ? { onEnd: wrappedOnEnd } : {}),
  }
}

// ── Hold'em phase helpers ──────────────────────────────────────────

function bettingEndIf(ctx: any): boolean {
  const state: CasinoGameState = ctx.session.state
  const pokerState = asPokerState(state)
  return isBettingRoundComplete(pokerState) || isOnlyOnePlayerRemaining(pokerState)
}

function bettingNextPhase(ctx: any, normalNext: string): string {
  const state: CasinoGameState = ctx.session.state
  const pokerState = asPokerState(state)
  if (isOnlyOnePlayerRemaining(pokerState)) return CasinoPhase.HandComplete
  if (areAllRemainingPlayersAllIn(pokerState)) return CasinoPhase.AllInRunout
  return normalNext
}

/** Auto-fold any disconnected active player whose turn it is. */
function autoFoldIfDisconnected(ctx: any): void {
  const state: CasinoGameState = ctx.getState()
  const activeIdx = state.activePlayerIndex
  const activePlayer = state.players[activeIdx]
  if (activePlayer && !activePlayer.isConnected && activePlayer.status === 'active') {
    ctx.dispatchThunk('autoFoldPlayer', activePlayer.id)
  }
}

function postFlopBettingOnBegin(ctx: any): void {
  const state: CasinoGameState = ctx.getState()
  const firstToAct = findFirstActivePlayerLeftOfButton(state.players, state.dealerIndex)
  ctx.dispatch('setActivePlayer', firstToAct)
  ctx.dispatch('setCurrentBet', 0)
  ctx.dispatch('setMinRaiseIncrement', state.blindLevel.bigBlind)
  for (const player of state.players) {
    if (player.status === 'active') {
      ctx.dispatch('setPlayerLastAction', player.id, null)
    }
  }
  autoFoldIfDisconnected(ctx)
}

function dealCommunityOnBegin(ctx: any, cardCount: number): void {
  const sessionId = ctx.getSessionId()
  const serverState = getServerHandState(sessionId)
  if (!serverState) return

  const deck = [...serverState.deck]
  deck.shift()
  const dealtCards = deck.splice(0, cardCount)
  ctx.dispatch('dealCommunityCards', dealtCards)
  ctx.dispatch('markDealingComplete', true)
  setServerHandState(sessionId, { ...serverState, deck })
}

// ── Hold'em phase definitions ──────────────────────────────────────

const postingBlindsPhase = makePhase({
  onBegin: (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    ctx.dispatch('resetHandState')
    ctx.dispatch('setHandNumber', state.handNumber + 1)
    ctx.dispatch('rotateDealerButton')

    const updated: CasinoGameState = ctx.getState()
    const dealerIndex = updated.dealerIndex
    const sbIndex = getSmallBlindIndex(updated.players, dealerIndex)
    const bbIndex = getBigBlindIndex(updated.players, dealerIndex)
    const sbPlayer = updated.players[sbIndex]!
    const bbPlayer = updated.players[bbIndex]!

    ctx.dispatch('updatePlayerBet', sbPlayer.id, updated.blindLevel.smallBlind)
    ctx.dispatch('setPlayerLastAction', sbPlayer.id, 'post_small_blind')
    ctx.dispatch('updatePlayerBet', bbPlayer.id, updated.blindLevel.bigBlind)
    ctx.dispatch('setPlayerLastAction', bbPlayer.id, 'post_big_blind')

    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    const sbPosted = state.players.some(p => p.lastAction === 'post_small_blind' && p.bet > 0)
    const bbPosted = state.players.some(p => p.lastAction === 'post_big_blind' && p.bet > 0)
    return sbPosted && bbPosted
  },
  next: CasinoPhase.DealingHoleCards,
})

const dealingHoleCardsPhase = makePhase({
  onBegin: (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    const sessionId = ctx.getSessionId()

    const deck = shuffleDeck(createDeck())
    const activePlayers = state.players.filter(
      p => p.status !== 'busted' && p.status !== 'sitting_out',
    )

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

    setServerHandState(sessionId, {
      deck: deck.slice(deckIndex),
      holeCards,
    })

    // SECURITY: Hole cards are stored ONLY in ServerHandState.
    // Each player retrieves their own cards via requestMyHoleCards thunk,
    // which delivers them via targeted connection emit (never broadcast state).
    // state.holeCards stays {} at all times.
    ctx.dispatch('markDealingComplete', true)
    return ctx.getState()
  },
  endIf: (ctx: any) => {
    return ctx.session.state.dealingComplete === true
  },
  onEnd: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    return ctx.getState()
  },
  next: CasinoPhase.PreFlopBetting,
})

const preFlopBettingPhase = makePhase({
  onBegin: (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    const firstToAct = findFirstActivePlayerLeftOfBB(state.players, state.dealerIndex)
    ctx.dispatch('setActivePlayer', firstToAct)
    ctx.dispatch('setCurrentBet', state.blindLevel.bigBlind)
    autoFoldIfDisconnected(ctx)
    return ctx.getState()
  },
  onEnd: (ctx: any) => {
    ctx.dispatch('updatePot')
    return ctx.getState()
  },
  endIf: bettingEndIf,
  next: (ctx: any) => bettingNextPhase(ctx, CasinoPhase.DealingFlop),
})

const dealingFlopPhase = makePhase({
  onBegin: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    dealCommunityOnBegin(ctx, 3)
    return ctx.getState()
  },
  endIf: (ctx: any) => ctx.session.state.dealingComplete === true,
  onEnd: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    return ctx.getState()
  },
  next: CasinoPhase.FlopBetting,
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
  next: (ctx: any) => bettingNextPhase(ctx, CasinoPhase.DealingTurn),
})

const dealingTurnPhase = makePhase({
  onBegin: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    dealCommunityOnBegin(ctx, 1)
    return ctx.getState()
  },
  endIf: (ctx: any) => ctx.session.state.dealingComplete === true,
  onEnd: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    return ctx.getState()
  },
  next: CasinoPhase.TurnBetting,
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
  next: (ctx: any) => bettingNextPhase(ctx, CasinoPhase.DealingRiver),
})

const dealingRiverPhase = makePhase({
  onBegin: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    dealCommunityOnBegin(ctx, 1)
    return ctx.getState()
  },
  endIf: (ctx: any) => ctx.session.state.dealingComplete === true,
  onEnd: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    return ctx.getState()
  },
  next: CasinoPhase.RiverBetting,
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
    const state: CasinoGameState = ctx.session.state
    if (isOnlyOnePlayerRemaining(asPokerState(state))) return CasinoPhase.HandComplete
    return CasinoPhase.Showdown
  },
})

const allInRunoutPhase = makePhase({
  onBegin: (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    const sessionId = ctx.getSessionId()
    const serverState = getServerHandState(sessionId)
    if (!serverState) return ctx.getState()

    const deck = [...serverState.deck]
    const currentCount = state.communityCards.length

    // Standard poker burn logic per street:
    // Flop (0→3): burn 1, deal 3
    // Turn (3→4): burn 1, deal 1
    // River (4→5): burn 1, deal 1
    if (currentCount < 3) {
      deck.shift() // burn before flop
      const flopCards = deck.splice(0, 3)
      ctx.dispatch('dealCommunityCards', flopCards)
    }
    if (currentCount < 4) {
      deck.shift() // burn before turn
      const turnCard = deck.shift()
      if (turnCard) ctx.dispatch('dealCommunityCards', [turnCard])
    }
    if (currentCount < 5) {
      deck.shift() // burn before river
      const riverCard = deck.shift()
      if (riverCard) ctx.dispatch('dealCommunityCards', [riverCard])
    }

    setServerHandState(sessionId, { ...serverState, deck })
    return ctx.getState()
  },
  endIf: () => true,
  next: CasinoPhase.Showdown,
})

const showdownPhase = makePhase({
  onBegin: (ctx: any) => {
    return ctx.getState()
  },
  endIf: () => true,
  next: CasinoPhase.PotDistribution,
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
  next: CasinoPhase.HandComplete,
})

const handCompletePhase = makePhase({
  onBegin: (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    for (const player of state.players) {
      if (player.stack === 0 && player.status !== 'busted') {
        ctx.dispatch('markPlayerBusted', player.id)
      }
    }
    return ctx.getState()
  },
  endIf: () => true,
  next: wrapWithGameNightCheck((ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    if (state.gameChangeRequested) return CasinoPhase.GameSelect
    const playablePlayers = state.players.filter(
      p => p.status !== 'busted' && p.status !== 'sitting_out',
    )
    if (playablePlayers.length < 2) {
      return CasinoPhase.Lobby
    }
    return CasinoPhase.PostingBlinds
  }),
})

// ── Phase map ──────────────────────────────────────────────────────

const phases = {
  // Casino shared phases
  [CasinoPhase.Lobby]: lobbyPhase,
  [CasinoPhase.GameSelect]: gameSelectPhase,

  // Hold'em phases (unprefixed per D-003)
  [CasinoPhase.PostingBlinds]: postingBlindsPhase,
  [CasinoPhase.DealingHoleCards]: dealingHoleCardsPhase,
  [CasinoPhase.PreFlopBetting]: preFlopBettingPhase,
  [CasinoPhase.DealingFlop]: dealingFlopPhase,
  [CasinoPhase.FlopBetting]: flopBettingPhase,
  [CasinoPhase.DealingTurn]: dealingTurnPhase,
  [CasinoPhase.TurnBetting]: turnBettingPhase,
  [CasinoPhase.DealingRiver]: dealingRiverPhase,
  [CasinoPhase.RiverBetting]: riverBettingPhase,
  [CasinoPhase.AllInRunout]: allInRunoutPhase,
  [CasinoPhase.Showdown]: showdownPhase,
  [CasinoPhase.PotDistribution]: potDistributionPhase,
  [CasinoPhase.HandComplete]: handCompletePhase,

  // 5-Card Draw phases (DRAW_ prefix per D-003)
  [CasinoPhase.DrawPostingBlinds]: drawPostingBlindsPhase,
  [CasinoPhase.DrawDealing]: drawDealingPhase,
  [CasinoPhase.DrawBetting1]: drawBetting1Phase,
  [CasinoPhase.DrawDrawPhase]: drawDrawPhasePhase,
  [CasinoPhase.DrawBetting2]: drawBetting2Phase,
  [CasinoPhase.DrawShowdown]: drawShowdownPhase,
  [CasinoPhase.DrawPotDistribution]: drawPotDistributionPhase,
  [CasinoPhase.DrawHandComplete]: drawHandCompletePhase,

  // Blackjack Classic phases (BJ_ prefix per D-003)
  [CasinoPhase.BjPlaceBets]: bjPlaceBetsPhase,
  [CasinoPhase.BjDealInitial]: bjDealInitialPhase,
  [CasinoPhase.BjInsurance]: bjInsurancePhase,
  [CasinoPhase.BjPlayerTurns]: bjPlayerTurnsPhase,
  [CasinoPhase.BjDealerTurn]: bjDealerTurnPhase,
  [CasinoPhase.BjSettlement]: bjSettlementPhase,
  [CasinoPhase.BjHandComplete]: bjHandCompletePhase,

  // Blackjack Competitive phases (BJC_ prefix per D-003, D-007)
  [CasinoPhase.BjcPlaceBets]: bjcPlaceBetsPhase,
  [CasinoPhase.BjcDealInitial]: bjcDealInitialPhase,
  [CasinoPhase.BjcPlayerTurns]: bjcPlayerTurnsPhase,
  [CasinoPhase.BjcShowdown]: bjcShowdownPhase,
  [CasinoPhase.BjcSettlement]: bjcSettlementPhase,
  [CasinoPhase.BjcHandComplete]: bjcHandCompletePhase,

  // Three Card Poker phases (TCP_ prefix per D-003)
  [CasinoPhase.TcpPlaceBets]: tcpPlaceBetsPhase,
  [CasinoPhase.TcpDealCards]: tcpDealCardsPhase,
  [CasinoPhase.TcpPlayerDecisions]: tcpPlayerDecisionsPhase,
  [CasinoPhase.TcpDealerReveal]: tcpDealerRevealPhase,
  [CasinoPhase.TcpSettlement]: tcpSettlementPhase,
  [CasinoPhase.TcpRoundComplete]: tcpRoundCompletePhase,

  // Roulette phases (ROULETTE_ prefix per D-003)
  [CasinoPhase.RoulettePlaceBets]: roulettePlaceBetsPhase,
  [CasinoPhase.RouletteNoMoreBets]: rouletteNoMoreBetsPhase,
  [CasinoPhase.RouletteSpin]: rouletteSpinPhase,
  [CasinoPhase.RouletteResult]: rouletteResultPhase,
  [CasinoPhase.RoulettePayout]: roulettePayoutPhase,
  [CasinoPhase.RouletteRoundComplete]: rouletteRoundCompletePhase,
}

// ── Connection handlers ────────────────────────────────────────────

const onConnect = async (ctx: ConnCtx) => {
  const { clientType } = ctx.connection.metadata
  const clientId = ctx.getClientId()
  const sessionId = ctx.getSessionId()

  // Register connection for targeted private messaging (hole card delivery).
  registerConnection(sessionId, clientId, ctx.connection)

  if (clientType !== ClientType.Controller) return

  const state = ctx.getState()
  if (state.players.length >= MAX_PLAYERS) return

  if (state.players.some(p => p.id === clientId)) {
    ctx.dispatch('markPlayerReconnected', clientId)
    return
  }

  const takenSeats = new Set(state.players.map(p => p.seatIndex ?? -1))
  let seatIndex = 0
  while (takenSeats.has(seatIndex) && seatIndex < MAX_PLAYERS) {
    seatIndex++
  }

  const members = ctx.getMembers()
  const member = members?.[clientId]
  const displayName =
    (member?.state as Record<string, unknown>)?.displayName as string
    ?? member?.state?.name
    ?? `Player ${seatIndex + 1}`

  const newPlayer: CasinoPlayer = {
    id: clientId,
    name: displayName,
    avatarId: 'default',
    seatIndex,
    isHost: state.players.length === 0,
    isReady: false,
    currentGameStatus: 'active',
    stack: STARTING_WALLET_BALANCE,
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
  const sessionId = ctx.getSessionId()

  // Unregister connection from private messaging registry.
  unregisterConnection(sessionId, clientId)

  const state = ctx.getState()
  const player = state.players.find(p => p.id === clientId)
  if (!player) return

  if (state.phase === CasinoPhase.Lobby) {
    ctx.dispatch('removePlayer', clientId)
  } else {
    ctx.dispatch('markPlayerDisconnected', clientId)
  }
}

// ── Ruleset export ─────────────────────────────────────────────────

/**
 * The casino multi-game ruleset consumed by VGFServer.
 * Conforms to the GameRuleset interface from @volley/vgf/types.
 * Per D-001: Single GameRuleset with phase namespaces for all games.
 */
export const casinoRuleset = {
  setup: createInitialCasinoState,
  reducers: {
    ...casinoReducers,
    ...holdemReducers,
    ...tcpReducers,
    ...bjReducers,
    ...bjcReducers,
    ...rouletteReducers,
    // 5-Card Draw reducers
    drawResetHand,
    drawSetHands,
    drawSelectDiscard,
    drawConfirmDiscard,
    drawReplaceCards,
    drawMarkComplete,
    drawSetActivePlayer,
    drawUpdatePlayerBet,
    drawFoldPlayer,
    drawUpdatePot,
    drawAwardPot,
    drawSetCurrentBet,
    drawSetMinRaiseIncrement,
    // SECURITY: setHoleCards is a hard no-op. Hole cards are NEVER in broadcast state.
    // Cards are delivered via targeted connection emits (see requestMyHoleCards thunk).
    setHoleCards: ((state: CasinoGameState, _holeCards: Record<string, [Card, Card]>): CasinoGameState => {
      console.warn('[SECURITY] setHoleCards dispatch blocked. Cards never go in broadcast state.')
      return { ...state, holeCards: {} }
    }),
    // SECURITY: selectGame and confirmGameSelection are blocked for direct client dispatch.
    // Use selectGameAsHost and confirmGameSelectAsHost thunks instead.
    // These no-ops prevent clients from bypassing host authorization.
    selectGame: ((state: CasinoGameState, _game: unknown): CasinoGameState => {
      console.warn('[SECURITY] Client attempted direct selectGame dispatch. Use selectGameAsHost thunk.')
      return state
    }),
    confirmGameSelection: ((state: CasinoGameState): CasinoGameState => {
      console.warn('[SECURITY] Client attempted direct confirmGameSelection dispatch. Use confirmGameSelectAsHost thunk.')
      return state
    }),
    // Internal-only confirmation reducer used by confirmGameSelectAsHost thunk.
    _confirmGameSelectionInternal: ((state: CasinoGameState): CasinoGameState => ({
      ...state,
      gameSelectConfirmed: true,
    })),
    checkLobbyReady: ((state: CasinoGameState): CasinoGameState => ({
      ...state,
      lobbyReady: true,
    })),
  },
  thunks: {
    ...casinoThunks,
    ...holdemThunks,
    ...tcpThunks,
    ...bjThunks,
    ...bjcThunks,
    ...rouletteThunks,
    // 5-Card Draw thunks
    drawProcessAction,
    drawProcessDiscard,
    drawExecuteReplace,
    drawEvaluateAndDistribute,
  },
  // VGF framework boundary: phase onBegin/onEnd/endIf callbacks use adapted contexts
  // (makePhase/adaptPhaseCtx wrappers) and lobby/gameSelect phases return Promise<void>
  // from onBegin (VGF accepts this at runtime but Phase type expects GameState | Promise<GameState>).
  // Removing this cast would require updating 50+ test mock types in phases.test.ts and
  // qa-audit-fixes.test.ts — deferred to dedicated test-hardening pass.
  phases: phases as any,
  actions: {},
  onConnect,
  onDisconnect,
} satisfies GameRuleset<CasinoGameState>

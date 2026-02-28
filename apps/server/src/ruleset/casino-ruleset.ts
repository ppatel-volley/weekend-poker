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

import type { GameRuleset, IConnectionLifeCycleContext } from '@volley/vgf/types'
import { ClientType } from '@volley/vgf/types'
import type { CasinoGameState, CasinoPlayer, Card } from '@weekend-casino/shared'
import { CasinoPhase, MAX_PLAYERS, STARTING_WALLET_BALANCE, STARTING_STACK, BLIND_LEVELS } from '@weekend-casino/shared'
import { createInitialCasinoState, casinoReducers, casinoThunks } from './casino-state.js'
import { lobbyPhase, gameSelectPhase } from './casino-phases.js'
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

// ── Type aliases for brevity ──────────────────────────────────────

type ThunkCtx = Parameters<typeof casinoThunks.requestTTS>[0]
type ConnCtx = IConnectionLifeCycleContext<CasinoGameState>

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
        const newStack = p.stack - additionalChips
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
  }) as any,

  foldPlayer: ((state: CasinoGameState, playerId: string): CasinoGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, status: 'folded' as const, lastAction: 'fold' as const } : p,
      ),
    }
  }) as any,

  dealCommunityCards: ((state: CasinoGameState, cards: Card[]): CasinoGameState => {
    return {
      ...state,
      communityCards: [...(state['communityCards'] as Card[] ?? []), ...cards],
    }
  }) as any,

  rotateDealerButton: ((state: CasinoGameState): CasinoGameState => {
    const newDealerIndex = rotateDealerButtonFn(state.players, state.dealerIndex)
    return { ...state, dealerIndex: newDealerIndex }
  }) as any,

  updatePot: ((state: CasinoGameState): CasinoGameState => {
    const totalBets = state.players.reduce((sum, p) => sum + p.bet, 0)
    if (totalBets === 0) return state

    const newSidePots = calculateSidePots(state.players)
    const mergedPots = (state['sidePots'] as any[] ?? []).map(p => ({ ...p, eligiblePlayerIds: [...p.eligiblePlayerIds] }))
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
      pot: (state['pot'] as number ?? 0) + totalBets,
      sidePots: mergedPots,
      currentBet: 0,
      players: state.players.map(p => ({ ...p, bet: 0 })),
    }
  }) as any,

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
  }) as any,

  setActivePlayer: ((state: CasinoGameState, playerIndex: number): CasinoGameState => {
    return { ...state, activePlayerIndex: playerIndex }
  }) as any,

  updateBlindLevel: ((state: CasinoGameState, level: number): CasinoGameState => {
    const newLevel = BLIND_LEVELS[level - 1]
    if (!newLevel) return state
    return {
      ...state,
      blindLevel: newLevel,
      minRaiseIncrement: newLevel.bigBlind,
    }
  }) as any,

  setPlayerLastAction: ((state: CasinoGameState, playerId: string, action: string | null): CasinoGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, lastAction: action as any } : p,
      ),
    }
  }) as any,

  markDealingComplete: ((state: CasinoGameState, complete?: boolean): CasinoGameState => {
    return { ...state, dealingComplete: complete ?? true }
  }) as any,

  setHoleCards: ((state: CasinoGameState, holeCards: Record<string, [Card, Card]>): CasinoGameState => {
    return { ...state, holeCards }
  }) as any,

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
  }) as any,

  setHandNumber: ((state: CasinoGameState, handNumber: number): CasinoGameState => {
    return { ...state, handNumber }
  }) as any,

  setCurrentBet: ((state: CasinoGameState, amount: number): CasinoGameState => {
    return { ...state, currentBet: amount }
  }) as any,

  setMinRaiseIncrement: ((state: CasinoGameState, amount: number): CasinoGameState => {
    return { ...state, minRaiseIncrement: amount }
  }) as any,

  markPlayerBusted: ((state: CasinoGameState, playerId: string): CasinoGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, status: 'busted' as const } : p,
      ),
    }
  }) as any,

  updatePlayerName: ((state: CasinoGameState, playerId: string, name: string): CasinoGameState => {
    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, name } : p,
      ),
    }
  }) as any,

  updateDealerCharacter: ((state: CasinoGameState, characterId: string): CasinoGameState => {
    return { ...state, dealerCharacterId: characterId }
  }) as any,

  addBotPlayer: ((state: CasinoGameState, seatIndex: number, difficulty: string): CasinoGameState => {
    const botId = `bot-${seatIndex}`
    return {
      ...state,
      players: [
        ...state.players,
        {
          id: botId,
          name: `Bot ${seatIndex}`,
          seatIndex,
          stack: STARTING_STACK,
          bet: 0,
          status: 'active' as const,
          lastAction: null,
          isBot: true,
          botConfig: { difficulty, personalityId: 'default' },
          isConnected: true,
          sittingOutHandCount: 0,
        },
      ],
    }
  }) as any,

  removeBotPlayer: ((state: CasinoGameState, botId: string): CasinoGameState => {
    return {
      ...state,
      players: state.players.filter(p => !(p.id === botId && p.isBot)),
    }
  }) as any,

  updateEmotionalState: ((state: CasinoGameState, playerId: string, emotionalState: any): CasinoGameState => {
    // For future use when implementing bot emotional states
    return state
  }) as any,

  updateOpponentProfile: ((state: CasinoGameState, playerId: string, profile: any): CasinoGameState => {
    // For future use when implementing opponent profiling
    return state
  }) as any,

  enqueueTTSMessage: ((state: CasinoGameState, message: any): CasinoGameState => {
    // Delegate to casinoEnqueueTTS in casinoReducers
    return { ...state, ttsQueue: [...state.ttsQueue, message] }
  }) as any,

  updateSessionHighlights: ((state: CasinoGameState, highlight: any): CasinoGameState => {
    const currentLargestPot = state.sessionStats?.largestPot
    const shouldUpdate = !currentLargestPot || highlight.potSize > currentLargestPot.potSize

    return {
      ...state,
      sessionStats: {
        ...state.sessionStats,
        largestPot: shouldUpdate ? highlight : currentLargestPot,
      },
    }
  }) as any,
}

// ── Hold'em-specific thunks ────────────────────────────────────────

const holdemThunks = {
  processPlayerAction: (async (ctx: ThunkCtx, playerId: string, action: string, amount?: number) => {
    const state = ctx.getState()
    const player = state.players.find(p => p.id === playerId)
    if (!player) return

    if (state.players[state['activePlayerIndex'] as number ?? -1]?.id !== playerId) return

    const legalActions = getLegalActions(state as any, playerId)
    if (!legalActions.includes(action)) return

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
  }) as any,

  processVoiceCommand: (async (ctx: ThunkCtx, transcript: string) => {
    const result = parseVoiceIntent(transcript)
    console.log('[voice]', JSON.stringify(result))

    const actionIntents = ['fold', 'check', 'call', 'bet', 'raise', 'all_in']
    if (actionIntents.includes(result.intent)) {
      ctx.dispatch('setPlayerLastAction', ctx.getClientId(), result.intent)
    }
  }) as any,

  startHand: (async (ctx: ThunkCtx) => {
    ctx.dispatch('resetHandState')
  }) as any,

  evaluateHands: (async (ctx: ThunkCtx) => {
    const result = resolveWinners(ctx.getState(), ctx.getSessionId())
    if (result) {
      ctx.dispatch('awardPot', result.winnerIds, result.amounts)
    }
  }) as any,

  distributePot: (async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const remaining = state.players.filter(
      p => p.status === 'active' || p.status === 'all_in',
    )

    if (remaining.length === 1) {
      ctx.dispatch('awardPot', [remaining[0]!.id], [state['pot'] as number ?? 0])
      return
    }

    await ctx.dispatchThunk('evaluateHands')
  }) as any,

  autoFoldPlayer: (async (ctx: ThunkCtx, playerId: string) => {
    const state = ctx.getState()
    const legalActions = getLegalActions(state as any, playerId)

    if (legalActions.includes('check')) {
      ctx.dispatch('setPlayerLastAction', playerId, 'check')
    } else {
      ctx.dispatch('foldPlayer', playerId)
    }

    advanceToNextPlayer(ctx)
  }) as any,

  botDecision: (async (ctx: ThunkCtx, botId: string) => {
    // TODO: Implement bot decision logic
    // This will be enhanced with Claude AI in future phases
    const state = ctx.getState()
    const legalActions = getLegalActions(state as any, botId)

    if (legalActions.length === 0) return

    // Simple random action for now
    const action = legalActions[Math.floor(Math.random() * legalActions.length)]!
    const amount = action === 'bet' || action === 'raise' ? state.currentBet + state.minRaiseIncrement : undefined

    await ctx.dispatchThunk('processPlayerAction', botId, action, amount)
  }) as any,

  sitOutPlayer: (async (ctx: ThunkCtx, playerId: string) => {
    // Mark player as sitting out for the next hand
    const state = ctx.getState()
    const player = state.players.find(p => p.id === playerId)
    if (!player) return

    // If not already busted, keep them in the player list but mark as sitting out
    if (player.status !== 'busted') {
      ctx.dispatch('updatePlayerName', playerId, player.name) // Placeholder reducer call
      // TODO: Add sitOutPlayer reducer when needed
    }
  }) as any,

  dealInPlayer: (async (ctx: ThunkCtx, playerId: string) => {
    // Re-seat a player who was sitting out
    // TODO: Implement deal in logic
  }) as any,

  endSession: (async (ctx: ThunkCtx) => {
    // TODO: Implement session end logic (record stats, trigger transitions, etc)
  }) as any,
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
    return { winnerIds: [remaining[0]!.id], amounts: [state['pot'] as number ?? 0] }
  }

  const playerHands: Array<{ playerId: string; hand: HandRank }> = []
  for (const player of remaining) {
    const holeCards = serverState?.holeCards.get(player.id)
    if (!holeCards) continue
    const allCards = [...holeCards, ...(state['communityCards'] as Card[] ?? [])]
    const hand = evaluateHand(allCards)
    playerHands.push({ playerId: player.id, hand })
  }

  const pots = (state['sidePots'] as any[] ?? []).length > 0
    ? (state['sidePots'] as any[])
    : [{ amount: state['pot'] ?? 0, eligiblePlayerIds: remaining.map(p => p.id) }]

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
  if (!isBettingRoundComplete(state as any) && !isOnlyOnePlayerRemaining(state as any)) {
    const nextIdx = nextActivePlayer(state.players, state['activePlayerIndex'] as number ?? -1)
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
  return isBettingRoundComplete(state as any) || isOnlyOnePlayerRemaining(state as any)
}

function bettingNextPhase(ctx: any, normalNext: string): string {
  const state: CasinoGameState = ctx.session.state
  if (isOnlyOnePlayerRemaining(state as any)) return CasinoPhase.HandComplete
  if (areAllRemainingPlayersAllIn(state as any)) return CasinoPhase.AllInRunout
  return normalNext
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

    const holeCardsRecord: Record<string, [Card, Card]> = {}
    for (const [playerId, cards] of holeCards) {
      holeCardsRecord[playerId] = cards
    }
    ctx.dispatch('setHoleCards', holeCardsRecord)
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
    if (isOnlyOnePlayerRemaining(state as any)) return CasinoPhase.HandComplete
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
    const cardsNeeded = 5 - ((state['communityCards'] as Card[] ?? []).length)

    for (let i = 0; i < cardsNeeded; i++) {
      deck.shift()
      const card = deck.shift()
      if (card) {
        ctx.dispatch('dealCommunityCards', [card])
      }
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
  next: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    const playablePlayers = state.players.filter(
      p => p.status !== 'busted' && p.status !== 'sitting_out',
    )
    if (playablePlayers.length < 2) {
      return CasinoPhase.Lobby
    }
    return CasinoPhase.PostingBlinds
  },
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
}

// ── Connection handlers ────────────────────────────────────────────

const onConnect = async (ctx: ConnCtx) => {
  const { clientType } = ctx.connection.metadata
  if (clientType !== ClientType.Controller) return

  const state = ctx.getState()
  if (state.players.length >= MAX_PLAYERS) return

  const clientId = ctx.getClientId()

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
    seatIndex,
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
  },
  thunks: {
    ...casinoThunks,
    ...holdemThunks,
  },
  phases,
  actions: {},
  onConnect,
  onDisconnect,
} satisfies GameRuleset<CasinoGameState>

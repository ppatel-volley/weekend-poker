/**
 * 5-Card Draw phase definitions.
 *
 * Phase flow (D-003 DRAW_ prefix):
 *   GAME_SELECT → DRAW_POSTING_BLINDS → DRAW_DEALING → DRAW_BETTING_1
 *     → DRAW_DRAW_PHASE → DRAW_BETTING_2 → DRAW_SHOWDOWN
 *     → DRAW_POT_DISTRIBUTION → DRAW_HAND_COMPLETE → loop or GAME_SELECT
 */
import type { CasinoGameState, Card } from '@weekend-casino/shared'
import { CasinoPhase } from '@weekend-casino/shared'
import {
  isBettingRoundComplete,
  isOnlyOnePlayerRemaining,
  getSmallBlindIndex,
  getBigBlindIndex,
  findFirstActivePlayerLeftOfButton,
  findFirstActivePlayerLeftOfBB,
} from '../poker-engine/index.js'
import { createDeck, shuffleDeck } from '../poker-engine/deck.js'
import { getServerGameState, setServerGameState } from '../server-game-state.js'
import { wrapWithGameNightCheck, incrementGameNightRoundIfActive } from './game-night-utils.js'

// ── Phase helpers ────────────────────────────────────────────────

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
    : (ctx: any) => ctx.getState()

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

/** Build PokerGameState-compatible shape for betting helpers. */
function asBettingState(state: CasinoGameState) {
  const drawState = state.fiveCardDraw!
  return {
    ...state,
    currentBet: drawState.currentBet,
    minRaiseIncrement: drawState.minRaiseIncrement,
    activePlayerIndex: drawState.activePlayerIndex,
  }
}

function drawBettingEndIf(ctx: any): boolean {
  const state: CasinoGameState = ctx.session.state
  if (!state.fiveCardDraw) return true
  const bettingState = asBettingState(state)
  return isBettingRoundComplete(bettingState as any) || isOnlyOnePlayerRemaining(bettingState as any)
}

// ── Phase definitions ────────────────────────────────────────────

/**
 * DRAW_POSTING_BLINDS: Reset hand, rotate dealer, post blinds.
 */
export const drawPostingBlindsPhase = makePhase({
  onBegin: (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    ctx.dispatch('drawResetHand')
    ctx.dispatch('setHandNumber', state.handNumber + 1)

    // Use holdem's rotateDealerButton reducer since it's shared
    ctx.dispatch('rotateDealerButton')

    const afterRotate: CasinoGameState = ctx.getState()
    const dealerIndex = afterRotate.dealerIndex
    const sbIndex = getSmallBlindIndex(afterRotate.players, dealerIndex)
    const bbIndex = getBigBlindIndex(afterRotate.players, dealerIndex)
    const sbPlayer = afterRotate.players[sbIndex]!
    const bbPlayer = afterRotate.players[bbIndex]!

    ctx.dispatch('drawUpdatePlayerBet', sbPlayer.id, afterRotate.blindLevel.smallBlind)
    ctx.dispatch('setPlayerLastAction', sbPlayer.id, 'post_small_blind')
    ctx.dispatch('drawUpdatePlayerBet', bbPlayer.id, afterRotate.blindLevel.bigBlind)
    ctx.dispatch('setPlayerLastAction', bbPlayer.id, 'post_big_blind')

    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    const sbPosted = state.players.some(p => p.lastAction === 'post_small_blind' && p.bet > 0)
    const bbPosted = state.players.some(p => p.lastAction === 'post_big_blind' && p.bet > 0)
    return sbPosted && bbPosted
  },
  next: CasinoPhase.DrawDealing,
})

/**
 * DRAW_DEALING: Shuffle deck, deal 5 cards to each active player.
 */
export const drawDealingPhase = makePhase({
  onBegin: (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    const sessionId = ctx.getSessionId()

    const deck = shuffleDeck(createDeck())
    const activePlayers = state.players.filter(
      p => p.status !== 'busted' && p.status !== 'sitting_out',
    )

    const hands: Record<string, Card[]> = {}
    const serverHoleCards = new Map<string, Card[]>()
    let deckIndex = 0

    // Deal 5 cards to each player, one at a time round-robin style
    for (let round = 0; round < 5; round++) {
      for (const player of activePlayers) {
        if (!hands[player.id]) hands[player.id] = []
        hands[player.id]!.push(deck[deckIndex]!)
        deckIndex++
      }
    }

    for (const player of activePlayers) {
      serverHoleCards.set(player.id, [...hands[player.id]!])
    }

    // Store server-side state
    const serverGameState = getServerGameState(sessionId)
    serverGameState.draw = {
      deck: deck.slice(deckIndex),
      holeCards: serverHoleCards,
      discardPile: [],
    }
    setServerGameState(sessionId, serverGameState)

    ctx.dispatch('drawSetHands', hands)
    ctx.dispatch('markDealingComplete', true)
    return ctx.getState()
  },
  endIf: (ctx: any) => ctx.session.state.dealingComplete === true,
  onEnd: (ctx: any) => {
    ctx.dispatch('markDealingComplete', false)
    return ctx.getState()
  },
  next: CasinoPhase.DrawBetting1,
})

/**
 * DRAW_BETTING_1: First betting round (pre-draw).
 * Same mechanics as Hold'em pre-flop — left of BB acts first.
 */
export const drawBetting1Phase = makePhase({
  onBegin: (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    const firstToAct = findFirstActivePlayerLeftOfBB(state.players, state.dealerIndex)
    ctx.dispatch('drawSetActivePlayer', firstToAct)
    ctx.dispatch('drawSetCurrentBet', state.blindLevel.bigBlind)
    return ctx.getState()
  },
  onEnd: (ctx: any) => {
    ctx.dispatch('drawUpdatePot')
    return ctx.getState()
  },
  endIf: drawBettingEndIf,
  next: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    if (isOnlyOnePlayerRemaining(asBettingState(state) as any)) {
      return CasinoPhase.DrawHandComplete
    }
    return CasinoPhase.DrawDrawPhase
  },
})

/**
 * DRAW_DRAW_PHASE: Players select cards to discard, then replacements are dealt.
 *
 * Combined discard + replace phase. Players select cards to discard
 * via controller, confirm, and replacements are dealt from deck.
 */
export const drawDrawPhasePhase = makePhase({
  onBegin: (ctx: any) => {
    // Reset discard state for new draw
    // Players with 'active' or 'all_in' status participate
    // Stand pat (discard 0) is the default — players must confirm
    return ctx.getState()
  },
  onEnd: async (ctx: any) => {
    // Apply card replacements before moving to betting round 2
    await ctx.dispatchThunk('drawExecuteReplace')
    return ctx.getState()
  },
  endIf: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    if (!state.fiveCardDraw) return true
    if (state.fiveCardDraw.drawComplete) return true

    // Check if all active players have confirmed their discards
    const activePlayers = state.players.filter(
      p => p.status === 'active' || p.status === 'all_in',
    )
    return activePlayers.every(
      p => state.fiveCardDraw!.confirmedDiscards[p.id] === true,
    )
  },
  next: CasinoPhase.DrawBetting2,
})

/**
 * DRAW_BETTING_2: Second betting round (post-draw).
 * Left of dealer acts first.
 */
export const drawBetting2Phase = makePhase({
  onBegin: (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    const firstToAct = findFirstActivePlayerLeftOfButton(state.players, state.dealerIndex)
    ctx.dispatch('drawSetActivePlayer', firstToAct)
    ctx.dispatch('drawSetCurrentBet', 0)
    ctx.dispatch('drawSetMinRaiseIncrement', state.blindLevel.bigBlind)
    // Reset last actions for new betting round
    for (const player of state.players) {
      if (player.status === 'active') {
        ctx.dispatch('setPlayerLastAction', player.id, null)
      }
    }
    return ctx.getState()
  },
  onEnd: (ctx: any) => {
    ctx.dispatch('drawUpdatePot')
    return ctx.getState()
  },
  endIf: drawBettingEndIf,
  next: (ctx: any) => {
    const state: CasinoGameState = ctx.session.state
    if (isOnlyOnePlayerRemaining(asBettingState(state) as any)) {
      return CasinoPhase.DrawHandComplete
    }
    return CasinoPhase.DrawShowdown
  },
})

/**
 * DRAW_SHOWDOWN: Reveal hands, evaluate winner.
 */
export const drawShowdownPhase = makePhase({
  onBegin: (ctx: any) => {
    return ctx.getState()
  },
  endIf: () => true,
  next: CasinoPhase.DrawPotDistribution,
})

/**
 * DRAW_POT_DISTRIBUTION: Award pot to winner(s).
 */
export const drawPotDistributionPhase = makePhase({
  onBegin: async (ctx: any) => {
    // Thunk call to evaluate and distribute
    await ctx.dispatchThunk('drawEvaluateAndDistribute')
    return ctx.getState()
  },
  endIf: () => true,
  next: CasinoPhase.DrawHandComplete,
})

/**
 * DRAW_HAND_COMPLETE: Check for busted players, loop or end.
 */
export const drawHandCompletePhase = makePhase({
  onBegin: (ctx: any) => {
    const state: CasinoGameState = ctx.getState()
    for (const player of state.players) {
      if (player.stack === 0 && player.status !== 'busted') {
        ctx.dispatch('markPlayerBusted', player.id)
      }
    }
    incrementGameNightRoundIfActive(ctx)
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
    return CasinoPhase.DrawPostingBlinds
  }),
})

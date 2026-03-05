/**
 * 5-Card Draw thunks — async operations for the draw game.
 *
 * Per VGF constraints: async logic lives in thunks, not reducers.
 */
import type { CasinoGameState } from '@weekend-casino/shared'
import type { IThunkContext } from '@volley/vgf/types'
import {
  getLegalActions,
  isBettingRoundComplete,
  isOnlyOnePlayerRemaining,
  nextActivePlayer,
} from '../poker-engine/index.js'
import { evaluateDrawHand, compareHands } from '../draw-engine/index.js'
import { validateDiscardIndices, drawFromDeck } from '../draw-engine/index.js'
import { getServerGameState, setServerGameState } from '../server-game-state.js'
import { validatePlayerIdOrBot } from './security.js'
import type { HandRank } from '../draw-engine/index.js'

type ThunkCtx = IThunkContext<CasinoGameState>

/**
 * Build a PokerGameState-compatible object for betting helpers.
 * The poker-engine betting functions expect PokerGameState shape.
 */
function asBettingState(state: CasinoGameState) {
  const drawState = state.fiveCardDraw!
  return {
    ...state,
    currentBet: drawState.currentBet,
    minRaiseIncrement: drawState.minRaiseIncrement,
    activePlayerIndex: drawState.activePlayerIndex,
  }
}

/**
 * Process a betting action (fold/check/call/bet/raise/all_in).
 */
export const drawProcessAction = async (
  ctx: ThunkCtx,
  claimedPlayerId: string,
  action: string,
  amount?: number,
): Promise<void> => {
  const state = ctx.getState()
  const playerId = validatePlayerIdOrBot(ctx, claimedPlayerId, state)
  if (!playerId) return

  const drawState = state.fiveCardDraw
  if (!drawState) return

  const player = state.players.find(p => p.id === playerId)
  if (!player) return

  const activeIdx = drawState.activePlayerIndex
  if (state.players[activeIdx]?.id !== playerId) return

  const bettingState = asBettingState(state)
  const legalActions = getLegalActions(bettingState as any, playerId)
  if (!legalActions.includes(action as any)) return

  switch (action) {
    case 'fold':
      ctx.dispatch('drawFoldPlayer', playerId)
      break
    case 'check':
      break
    case 'call':
      ctx.dispatch('drawUpdatePlayerBet', playerId, drawState.currentBet)
      break
    case 'bet':
      if (amount === undefined) return
      ctx.dispatch('drawUpdatePlayerBet', playerId, amount)
      break
    case 'raise':
      if (amount === undefined) return
      ctx.dispatch('drawUpdatePlayerBet', playerId, amount)
      break
    case 'all_in':
      ctx.dispatch('drawUpdatePlayerBet', playerId, player.stack + player.bet)
      break
  }

  ctx.dispatch('setPlayerLastAction', playerId, action)
  drawAdvanceToNextPlayer(ctx)
}

/**
 * Process a player's discard selection.
 */
export const drawProcessDiscard = async (
  ctx: ThunkCtx,
  claimedPlayerId: string,
  cardIndices: number[],
): Promise<void> => {
  const state = ctx.getState()
  const playerId = validatePlayerIdOrBot(ctx, claimedPlayerId, state)
  if (!playerId) return

  const drawState = state.fiveCardDraw
  if (!drawState) return

  const hand = drawState.hands[playerId]
  if (!hand) return

  if (!validateDiscardIndices(cardIndices, hand.length)) return

  ctx.dispatch('drawSelectDiscard', playerId, cardIndices)
  ctx.dispatch('drawConfirmDiscard', playerId)
}

/**
 * Execute all replacements from the deck.
 * Called after all players have confirmed their discards.
 */
export const drawExecuteReplace = async (ctx: ThunkCtx): Promise<void> => {
  const state = ctx.getState()
  const drawState = state.fiveCardDraw
  if (!drawState) return

  const sessionId = ctx.getSessionId()
  const serverState = getServerGameState(sessionId)
  if (!serverState?.draw) return

  let deck = [...serverState.draw.deck]
  const discardPile = [...serverState.draw.discardPile]

  const activePlayers = state.players.filter(
    p => p.status === 'active' || p.status === 'all_in',
  )

  for (const player of activePlayers) {
    const discardIndices = drawState.discardSelections[player.id] ?? []
    if (discardIndices.length === 0) continue

    // Add discarded cards to the discard pile
    const playerHand = drawState.hands[player.id] ?? []
    for (const idx of discardIndices) {
      if (playerHand[idx]) {
        discardPile.push({ ...playerHand[idx] })
      }
    }

    const [replacements, remainingDeck] = drawFromDeck(deck, discardIndices.length)
    deck = remainingDeck
    ctx.dispatch('drawReplaceCards', player.id, replacements)

    // Update server-side hole cards
    const currentServerHand = serverState.draw.holeCards.get(player.id)
    if (currentServerHand) {
      const newServerHand = [...currentServerHand]
      const sorted = [...discardIndices].sort((a, b) => a - b)
      for (let i = 0; i < sorted.length; i++) {
        newServerHand[sorted[i]!] = { ...replacements[i]! }
      }
      serverState.draw.holeCards.set(player.id, newServerHand)
    }
  }

  serverState.draw.deck = deck
  serverState.draw.discardPile = discardPile
  setServerGameState(sessionId, serverState)

  ctx.dispatch('drawMarkComplete')
}

/**
 * Evaluate hands and distribute pot at showdown.
 */
export const drawEvaluateAndDistribute = async (ctx: ThunkCtx): Promise<void> => {
  const state = ctx.getState()
  const drawState = state.fiveCardDraw
  if (!drawState) return

  const remaining = state.players.filter(
    p => p.status === 'active' || p.status === 'all_in',
  )

  // Single player remaining — award full pot
  if (remaining.length === 1) {
    ctx.dispatch('drawAwardPot', [remaining[0]!.id], [drawState.pot])
    return
  }

  // Evaluate each player's hand
  const playerHands: Array<{ playerId: string; hand: HandRank }> = []
  for (const player of remaining) {
    const cards = drawState.hands[player.id]
    if (!cards || cards.length !== 5) continue
    const hand = evaluateDrawHand(cards)
    playerHands.push({ playerId: player.id, hand })
  }

  // Distribute pots
  const pots = drawState.sidePots.length > 0
    ? drawState.sidePots
    : [{ amount: drawState.pot, eligiblePlayerIds: remaining.map(p => p.id) }]

  const winnerIds: string[] = []
  const amounts: number[] = []

  for (const pot of pots) {
    const eligible = playerHands.filter(ph =>
      pot.eligiblePlayerIds.includes(ph.playerId),
    )
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

  if (winnerIds.length > 0) {
    ctx.dispatch('drawAwardPot', winnerIds, amounts)
  }
}

// ── Helper ────────────────────────────────────────────────────────

function drawAdvanceToNextPlayer(ctx: ThunkCtx): void {
  let state = ctx.getState()
  let drawState = state.fiveCardDraw
  if (!drawState) return

  let bettingState = asBettingState(state)
  if (isBettingRoundComplete(bettingState as any) || isOnlyOnePlayerRemaining(bettingState as any)) return

  const nextIdx = nextActivePlayer(state.players, drawState.activePlayerIndex)
  if (nextIdx === -1) return
  ctx.dispatch('drawSetActivePlayer', nextIdx)

  // Auto-play consecutive bots after advancing
  state = ctx.getState()
  drawState = state.fiveCardDraw!
  bettingState = asBettingState(state)

  while (!isBettingRoundComplete(bettingState as any) && !isOnlyOnePlayerRemaining(bettingState as any)) {
    const activePlayer = state.players[drawState.activePlayerIndex]
    if (!activePlayer?.isBot) break

    // Bot strategy: check if possible, else call
    const legalActions = getLegalActions(bettingState as any, activePlayer.id)
    if (legalActions.length === 0) break

    let botAction = 'fold'
    if (legalActions.includes('check')) {
      botAction = 'check'
    } else if (legalActions.includes('call')) {
      botAction = 'call'
      ctx.dispatch('drawUpdatePlayerBet', activePlayer.id, drawState.currentBet)
    }
    ctx.dispatch('setPlayerLastAction', activePlayer.id, botAction)
    if (botAction === 'fold') {
      ctx.dispatch('drawFoldPlayer', activePlayer.id)
    }

    // Advance to next
    state = ctx.getState()
    drawState = state.fiveCardDraw!
    bettingState = asBettingState(state)
    if (isBettingRoundComplete(bettingState as any) || isOnlyOnePlayerRemaining(bettingState as any)) break

    const botNextIdx = nextActivePlayer(state.players, drawState.activePlayerIndex)
    if (botNextIdx === -1) break
    ctx.dispatch('drawSetActivePlayer', botNextIdx)

    state = ctx.getState()
    drawState = state.fiveCardDraw!
    bettingState = asBettingState(state)
  }
}

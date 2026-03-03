/**
 * 5-Card Draw reducers — pure state transformations.
 *
 * All reducers are pure functions that return new state without mutation.
 * Per VGF constraints: immutable state, Object.freeze compatible.
 */
import type { CasinoGameState } from '@weekend-casino/shared'
import type { Card } from '@weekend-casino/shared'
import { calculateSidePots } from '../poker-engine/pot-calculator.js'

/**
 * Initialise the fiveCardDraw sub-state for a new hand.
 */
export const drawResetHand = (state: CasinoGameState): CasinoGameState => ({
  ...state,
  fiveCardDraw: {
    hands: {},
    discardSelections: {},
    replacementCards: {},
    confirmedDiscards: {},
    drawComplete: false,
    pot: 0,
    sidePots: [],
    currentBet: 0,
    minRaiseIncrement: state.blindLevel.bigBlind,
    activePlayerIndex: -1,
  },
  dealerMessage: null,
  players: state.players.map(p => ({
    ...p,
    bet: 0,
    lastAction: null,
    status: p.status === 'busted' ? ('busted' as const)
      : p.status === 'sitting_out' ? ('sitting_out' as const)
      : 'active' as const,
  })),
})

/**
 * Set the hands dealt to each player (playerId -> Card[]).
 */
export const drawSetHands = (
  state: CasinoGameState,
  hands: Record<string, Card[]>,
): CasinoGameState => ({
  ...state,
  fiveCardDraw: {
    ...state.fiveCardDraw!,
    hands,
  },
})

/**
 * Player selects card indices to discard.
 */
export const drawSelectDiscard = (
  state: CasinoGameState,
  playerId: string,
  cardIndices: number[],
): CasinoGameState => ({
  ...state,
  fiveCardDraw: {
    ...state.fiveCardDraw!,
    discardSelections: {
      ...state.fiveCardDraw!.discardSelections,
      [playerId]: [...cardIndices],
    },
  },
})

/**
 * Player confirms their discard selection.
 */
export const drawConfirmDiscard = (
  state: CasinoGameState,
  playerId: string,
): CasinoGameState => ({
  ...state,
  fiveCardDraw: {
    ...state.fiveCardDraw!,
    confirmedDiscards: {
      ...state.fiveCardDraw!.confirmedDiscards,
      [playerId]: true,
    },
  },
})

/**
 * Replace discarded cards for a player with new cards from the deck.
 */
export const drawReplaceCards = (
  state: CasinoGameState,
  playerId: string,
  newCards: Card[],
): CasinoGameState => {
  const drawState = state.fiveCardDraw!
  const currentHand = drawState.hands[playerId] ?? []
  const discardIndices = drawState.discardSelections[playerId] ?? []

  const newHand = currentHand.map((card, idx) => {
    const discardPos = discardIndices.indexOf(idx)
    return discardPos !== -1 ? { ...newCards[discardPos]! } : { ...card }
  })

  return {
    ...state,
    fiveCardDraw: {
      ...drawState,
      hands: {
        ...drawState.hands,
        [playerId]: newHand,
      },
      replacementCards: {
        ...drawState.replacementCards,
        [playerId]: [...newCards],
      },
    },
  }
}

/**
 * Mark the draw phase as complete.
 */
export const drawMarkComplete = (state: CasinoGameState): CasinoGameState => ({
  ...state,
  fiveCardDraw: {
    ...state.fiveCardDraw!,
    drawComplete: true,
  },
})

/**
 * Set the active player index for betting.
 */
export const drawSetActivePlayer = (
  state: CasinoGameState,
  playerIndex: number,
): CasinoGameState => ({
  ...state,
  fiveCardDraw: {
    ...state.fiveCardDraw!,
    activePlayerIndex: playerIndex,
  },
})

/**
 * Update a player's bet amount and stack.
 */
export const drawUpdatePlayerBet = (
  state: CasinoGameState,
  playerId: string,
  amount: number,
): CasinoGameState => {
  const drawState = state.fiveCardDraw!
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
        status: newStack <= 0 ? ('all_in' as const) : p.status,
      }
    }),
    fiveCardDraw: {
      ...drawState,
      currentBet: Math.max(drawState.currentBet, amount),
      minRaiseIncrement: amount > drawState.currentBet
        ? Math.max(drawState.minRaiseIncrement, amount - drawState.currentBet)
        : drawState.minRaiseIncrement,
    },
  }
}

/**
 * Fold a player.
 */
export const drawFoldPlayer = (
  state: CasinoGameState,
  playerId: string,
): CasinoGameState => ({
  ...state,
  players: state.players.map(p =>
    p.id === playerId ? { ...p, status: 'folded' as const, lastAction: 'fold' as const } : p,
  ),
})

/**
 * Collect bets into the pot, calculate side pots, reset bets to 0.
 */
export const drawUpdatePot = (state: CasinoGameState): CasinoGameState => {
  const drawState = state.fiveCardDraw!
  const totalBets = state.players.reduce((sum, p) => sum + p.bet, 0)
  if (totalBets === 0) return state

  const newSidePots = calculateSidePots(state.players as any)
  const mergedPots = (drawState.sidePots as any[]).map(p => ({
    ...p,
    eligiblePlayerIds: [...p.eligiblePlayerIds],
  }))

  for (const newPot of newSidePots) {
    const keyNew = [...newPot.eligiblePlayerIds].sort().join(',')
    const existing = mergedPots.find(
      p => [...p.eligiblePlayerIds].sort().join(',') === keyNew,
    )
    if (existing) {
      existing.amount += newPot.amount
    } else {
      mergedPots.push({ ...newPot })
    }
  }

  return {
    ...state,
    fiveCardDraw: {
      ...drawState,
      pot: drawState.pot + totalBets,
      sidePots: mergedPots,
      currentBet: 0,
    },
    players: state.players.map(p => ({ ...p, bet: 0 })),
  }
}

/**
 * Award pot to winners.
 */
export const drawAwardPot = (
  state: CasinoGameState,
  winnerIds: string[],
  amounts: number[],
): CasinoGameState => {
  const winnings = new Map<string, number>()
  for (let i = 0; i < winnerIds.length; i++) {
    const id = winnerIds[i]!
    winnings.set(id, (winnings.get(id) ?? 0) + amounts[i]!)
  }

  return {
    ...state,
    fiveCardDraw: {
      ...state.fiveCardDraw!,
      pot: 0,
      sidePots: [],
    },
    players: state.players.map(p => {
      const award = winnings.get(p.id)
      return award ? { ...p, stack: p.stack + award } : p
    }),
  }
}

/**
 * Set current bet for the draw betting round.
 */
export const drawSetCurrentBet = (
  state: CasinoGameState,
  amount: number,
): CasinoGameState => ({
  ...state,
  fiveCardDraw: {
    ...state.fiveCardDraw!,
    currentBet: amount,
  },
})

/**
 * Set minimum raise increment.
 */
export const drawSetMinRaiseIncrement = (
  state: CasinoGameState,
  amount: number,
): CasinoGameState => ({
  ...state,
  fiveCardDraw: {
    ...state.fiveCardDraw!,
    minRaiseIncrement: amount,
  },
})

import { describe, it, expect } from 'vitest'
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
} from '../ruleset/draw-reducers.js'
import type { CasinoGameState } from '@weekend-casino/shared'
import type { Card, Suit } from '@weekend-casino/shared'

// ── Helpers ──────────────────────────────────────────────────────

function c(notation: string): Card {
  const suitMap: Record<string, Suit> = {
    s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs',
  }
  let rank: string
  let suitChar: string
  if (notation.startsWith('10')) {
    rank = '10'
    suitChar = notation[2]!
  } else {
    rank = notation[0]!
    suitChar = notation[1]!
  }
  const suit = suitMap[suitChar]
  if (!suit) throw new Error(`Invalid suit char '${suitChar}' in '${notation}'`)
  return { rank: rank as Card['rank'], suit }
}

function makeState(overrides?: Partial<CasinoGameState>): CasinoGameState {
  return {
    phase: 'DRAW_POSTING_BLINDS' as any,
    selectedGame: 'five_card_draw' as any,
    gameSelectConfirmed: false,
    gameChangeRequested: false,
    gameChangeVotes: {},
    wallet: { p1: 10000, p2: 10000 },
    players: [
      { id: 'p1', name: 'Alice', seatIndex: 0, stack: 1000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
      { id: 'p2', name: 'Bob', seatIndex: 1, stack: 1000, bet: 0, status: 'active', lastAction: null, isBot: false, isConnected: true, sittingOutHandCount: 0 },
    ] as any,
    dealerCharacterId: 'vincent',
    blindLevel: { level: 1, smallBlind: 5, bigBlind: 10, minBuyIn: 200, maxBuyIn: 1000 },
    handNumber: 0,
    dealerIndex: 0,
    lobbyReady: false,
    dealerMessage: null,
    ttsQueue: [],
    sessionStats: { handsPlayed: 0, totalPotDealt: 0, startedAt: Date.now(), playerStats: {}, largestPot: null, biggestBluff: null, worstBeat: null } as any,
    fiveCardDraw: {
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
    },
    ...overrides,
  } as CasinoGameState
}

// ── Tests ────────────────────────────────────────────────────────

describe('drawResetHand', () => {
  it('should initialise fiveCardDraw sub-state', () => {
    const state = makeState({ fiveCardDraw: undefined } as any)
    const result = drawResetHand(state)
    expect(result.fiveCardDraw).toBeDefined()
    expect(result.fiveCardDraw!.hands).toEqual({})
    expect(result.fiveCardDraw!.drawComplete).toBe(false)
    expect(result.fiveCardDraw!.pot).toBe(0)
  })

  it('should reset player bets and lastAction', () => {
    const state = makeState()
    state.players[0]!.bet = 50
    state.players[0]!.lastAction = 'bet' as any
    const result = drawResetHand(state)
    expect(result.players[0]!.bet).toBe(0)
    expect(result.players[0]!.lastAction).toBeNull()
  })

  it('should preserve busted players as busted', () => {
    const state = makeState()
    state.players[1]!.status = 'busted' as any
    const result = drawResetHand(state)
    expect(result.players[1]!.status).toBe('busted')
  })
})

describe('drawSetHands', () => {
  it('should set player hands', () => {
    const state = makeState()
    const hands = {
      p1: [c('As'), c('Kh'), c('Qd'), c('Jc'), c('10s')],
      p2: [c('2h'), c('3d'), c('4c'), c('5s'), c('6h')],
    }
    const result = drawSetHands(state, hands)
    expect(result.fiveCardDraw!.hands['p1']).toHaveLength(5)
    expect(result.fiveCardDraw!.hands['p2']).toHaveLength(5)
  })
})

describe('drawSelectDiscard', () => {
  it('should set discard selection for a player', () => {
    const state = makeState()
    const result = drawSelectDiscard(state, 'p1', [0, 2, 4])
    expect(result.fiveCardDraw!.discardSelections['p1']).toEqual([0, 2, 4])
  })
})

describe('drawConfirmDiscard', () => {
  it('should mark a player as confirmed', () => {
    const state = makeState()
    const result = drawConfirmDiscard(state, 'p1')
    expect(result.fiveCardDraw!.confirmedDiscards['p1']).toBe(true)
  })
})

describe('drawReplaceCards', () => {
  it('should replace discarded cards', () => {
    const state = makeState()
    state.fiveCardDraw!.hands = {
      p1: [c('As'), c('Kh'), c('Qd'), c('Jc'), c('10s')],
    }
    state.fiveCardDraw!.discardSelections = { p1: [1, 3] }

    const newCards = [c('2h'), c('3d')]
    const result = drawReplaceCards(state, 'p1', newCards)
    const hand = result.fiveCardDraw!.hands['p1']!

    expect(hand[0]).toEqual(c('As'))
    expect(hand[1]).toEqual(c('2h'))
    expect(hand[2]).toEqual(c('Qd'))
    expect(hand[3]).toEqual(c('3d'))
    expect(hand[4]).toEqual(c('10s'))
  })

  it('should track replacement cards', () => {
    const state = makeState()
    state.fiveCardDraw!.hands = {
      p1: [c('As'), c('Kh'), c('Qd'), c('Jc'), c('10s')],
    }
    state.fiveCardDraw!.discardSelections = { p1: [0] }

    const result = drawReplaceCards(state, 'p1', [c('2h')])
    expect(result.fiveCardDraw!.replacementCards['p1']).toEqual([c('2h')])
  })
})

describe('drawMarkComplete', () => {
  it('should set drawComplete to true', () => {
    const state = makeState()
    const result = drawMarkComplete(state)
    expect(result.fiveCardDraw!.drawComplete).toBe(true)
  })
})

describe('drawSetActivePlayer', () => {
  it('should set the active player index', () => {
    const state = makeState()
    const result = drawSetActivePlayer(state, 1)
    expect(result.fiveCardDraw!.activePlayerIndex).toBe(1)
  })
})

describe('drawUpdatePlayerBet', () => {
  it('should update player bet and stack', () => {
    const state = makeState()
    const result = drawUpdatePlayerBet(state, 'p1', 50)
    expect(result.players.find(p => p.id === 'p1')!.bet).toBe(50)
    expect(result.players.find(p => p.id === 'p1')!.stack).toBe(950)
  })

  it('should update currentBet on fiveCardDraw sub-state', () => {
    const state = makeState()
    const result = drawUpdatePlayerBet(state, 'p1', 50)
    expect(result.fiveCardDraw!.currentBet).toBe(50)
  })

  it('should mark player all_in when stack reaches 0', () => {
    const state = makeState()
    const result = drawUpdatePlayerBet(state, 'p1', 1000)
    expect(result.players.find(p => p.id === 'p1')!.status).toBe('all_in')
  })
})

describe('drawFoldPlayer', () => {
  it('should fold a player', () => {
    const state = makeState()
    const result = drawFoldPlayer(state, 'p1')
    expect(result.players.find(p => p.id === 'p1')!.status).toBe('folded')
    expect(result.players.find(p => p.id === 'p1')!.lastAction).toBe('fold')
  })
})

describe('drawUpdatePot', () => {
  it('should collect bets into pot', () => {
    const state = makeState()
    state.players[0]!.bet = 50
    state.players[1]!.bet = 50
    state.fiveCardDraw!.currentBet = 50

    const result = drawUpdatePot(state)
    expect(result.fiveCardDraw!.pot).toBe(100)
    expect(result.players[0]!.bet).toBe(0)
    expect(result.players[1]!.bet).toBe(0)
  })

  it('should not change state when no bets', () => {
    const state = makeState()
    const result = drawUpdatePot(state)
    expect(result).toBe(state)
  })
})

describe('drawAwardPot', () => {
  it('should award pot to a single winner', () => {
    const state = makeState()
    state.fiveCardDraw!.pot = 200
    const result = drawAwardPot(state, ['p1'], [200])
    expect(result.players.find(p => p.id === 'p1')!.stack).toBe(1200)
    expect(result.fiveCardDraw!.pot).toBe(0)
  })

  it('should split pot between multiple winners', () => {
    const state = makeState()
    state.fiveCardDraw!.pot = 200
    const result = drawAwardPot(state, ['p1', 'p2'], [100, 100])
    expect(result.players.find(p => p.id === 'p1')!.stack).toBe(1100)
    expect(result.players.find(p => p.id === 'p2')!.stack).toBe(1100)
  })
})

describe('drawSetCurrentBet', () => {
  it('should set current bet', () => {
    const state = makeState()
    const result = drawSetCurrentBet(state, 100)
    expect(result.fiveCardDraw!.currentBet).toBe(100)
  })
})

describe('drawSetMinRaiseIncrement', () => {
  it('should set min raise increment', () => {
    const state = makeState()
    const result = drawSetMinRaiseIncrement(state, 20)
    expect(result.fiveCardDraw!.minRaiseIncrement).toBe(20)
  })
})

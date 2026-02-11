import { describe, it, expect } from 'vitest'
import type { PokerGameState, PokerPlayer, Card, TTSMessage, HandHighlight } from '@weekend-poker/shared'
import { STARTING_STACK, BLIND_LEVELS } from '@weekend-poker/shared'
import { createInitialState, pokerRuleset } from '../ruleset/index.js'

// ── Helpers ────────────────────────────────────────────────────

/** Creates a test player with sensible defaults. */
function makePlayer(overrides: Partial<PokerPlayer> = {}): PokerPlayer {
  return {
    id: 'player-1',
    name: 'Alice',
    seatIndex: 0,
    stack: STARTING_STACK,
    bet: 0,
    status: 'active',
    lastAction: null,
    isBot: false,
    isConnected: true,
    sittingOutHandCount: 0,
    ...overrides,
  }
}

/** Creates a state with players pre-populated. */
function stateWithPlayers(...players: PokerPlayer[]): PokerGameState {
  return createInitialState({ players })
}

/** Grabs a reducer from the ruleset by name. */
function getReducer(name: string) {
  const r = pokerRuleset.reducers[name]
  if (!r) throw new Error(`Reducer "${name}" not found`)
  return r
}

/** Makes a simple Card for testing. */
function card(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit }
}

// ── updatePlayerBet ────────────────────────────────────────────

describe('updatePlayerBet reducer', () => {
  const updatePlayerBet = getReducer('updatePlayerBet')

  it('should deduct the bet amount from the player stack', () => {
    const state = stateWithPlayers(makePlayer({ id: 'p1', stack: 1000, bet: 0 }))
    const next = updatePlayerBet(state, 'p1', 100)

    expect(next.players[0]!.stack).toBe(900)
    expect(next.players[0]!.bet).toBe(100)
  })

  it('should handle incremental bets correctly (raise scenario)', () => {
    // Player already has 50 bet, now raising to 150
    const state = stateWithPlayers(makePlayer({ id: 'p1', stack: 950, bet: 50 }))
    const next = updatePlayerBet(state, 'p1', 150)

    // Should only deduct the additional 100
    expect(next.players[0]!.stack).toBe(850)
    expect(next.players[0]!.bet).toBe(150)
  })

  it('should set status to all_in when stack reaches zero', () => {
    const state = stateWithPlayers(makePlayer({ id: 'p1', stack: 500, bet: 0 }))
    const next = updatePlayerBet(state, 'p1', 500)

    expect(next.players[0]!.stack).toBe(0)
    expect(next.players[0]!.status).toBe('all_in')
  })

  it('should update currentBet when the bet exceeds it', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', stack: 1000, bet: 0 }),
    )
    expect(state.currentBet).toBe(0)

    const next = updatePlayerBet(state, 'p1', 200)
    expect(next.currentBet).toBe(200)
  })

  it('should not lower currentBet when bet is below it', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', stack: 1000, bet: 0 }),
      ),
      currentBet: 300,
    }

    const next = updatePlayerBet(state, 'p1', 100)
    expect(next.currentBet).toBe(300)
  })

  it('should update minRaiseIncrement when this is a raise', () => {
    const state = {
      ...stateWithPlayers(makePlayer({ id: 'p1', stack: 1000, bet: 0 })),
      currentBet: 100,
      minRaiseIncrement: 100,
    }

    // Raise to 300 (a raise of 200, which is bigger than the current increment of 100)
    const next = updatePlayerBet(state, 'p1', 300)
    expect(next.minRaiseIncrement).toBe(200)
  })

  it('should not mutate the original state', () => {
    const state = stateWithPlayers(makePlayer({ id: 'p1', stack: 1000 }))
    const next = updatePlayerBet(state, 'p1', 100)

    expect(next).not.toBe(state)
    expect(state.players[0]!.stack).toBe(1000)
    expect(state.players[0]!.bet).toBe(0)
  })

  it('should leave other players unchanged', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', stack: 1000 }),
      makePlayer({ id: 'p2', seatIndex: 1, stack: 800 }),
    )
    const next = updatePlayerBet(state, 'p1', 100)

    expect(next.players[1]!.stack).toBe(800)
    expect(next.players[1]!.bet).toBe(0)
  })
})

// ── foldPlayer ─────────────────────────────────────────────────

describe('foldPlayer reducer', () => {
  const foldPlayer = getReducer('foldPlayer')

  it('should set the player status to folded', () => {
    const state = stateWithPlayers(makePlayer({ id: 'p1', status: 'active' }))
    const next = foldPlayer(state, 'p1')

    expect(next.players[0]!.status).toBe('folded')
  })

  it('should set lastAction to fold', () => {
    const state = stateWithPlayers(makePlayer({ id: 'p1' }))
    const next = foldPlayer(state, 'p1')

    expect(next.players[0]!.lastAction).toBe('fold')
  })

  it('should not affect other players', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1' }),
      makePlayer({ id: 'p2', seatIndex: 1 }),
    )
    const next = foldPlayer(state, 'p1')

    expect(next.players[1]!.status).toBe('active')
    expect(next.players[1]!.lastAction).toBeNull()
  })

  it('should not mutate the original state', () => {
    const state = stateWithPlayers(makePlayer({ id: 'p1' }))
    const next = foldPlayer(state, 'p1')

    expect(next).not.toBe(state)
    expect(state.players[0]!.status).toBe('active')
  })
})

// ── dealCommunityCards ─────────────────────────────────────────

describe('dealCommunityCards reducer', () => {
  const dealCommunityCards = getReducer('dealCommunityCards')

  it('should append three cards for the flop', () => {
    const state = createInitialState()
    const flopCards: Card[] = [
      card('A', 'spades'),
      card('K', 'hearts'),
      card('Q', 'diamonds'),
    ]

    const next = dealCommunityCards(state, flopCards)
    expect(next.communityCards).toHaveLength(3)
    expect(next.communityCards).toEqual(flopCards)
  })

  it('should append one card for the turn', () => {
    const state = createInitialState({
      communityCards: [
        card('A', 'spades'),
        card('K', 'hearts'),
        card('Q', 'diamonds'),
      ],
    })

    const turnCard = [card('J', 'clubs')]
    const next = dealCommunityCards(state, turnCard)
    expect(next.communityCards).toHaveLength(4)
    expect(next.communityCards[3]).toEqual(card('J', 'clubs'))
  })

  it('should append one card for the river', () => {
    const state = createInitialState({
      communityCards: [
        card('A', 'spades'),
        card('K', 'hearts'),
        card('Q', 'diamonds'),
        card('J', 'clubs'),
      ],
    })

    const riverCard = [card('10', 'spades')]
    const next = dealCommunityCards(state, riverCard)
    expect(next.communityCards).toHaveLength(5)
  })

  it('should not mutate the original state', () => {
    const state = createInitialState()
    const next = dealCommunityCards(state, [card('A', 'spades')])

    expect(next).not.toBe(state)
    expect(state.communityCards).toHaveLength(0)
  })
})

// ── rotateDealerButton ─────────────────────────────────────────

describe('rotateDealerButton reducer', () => {
  const rotateDealerButton = getReducer('rotateDealerButton')

  it('should advance the dealer to the next eligible player', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', seatIndex: 0 }),
      makePlayer({ id: 'p2', seatIndex: 1 }),
      makePlayer({ id: 'p3', seatIndex: 2 }),
    )

    const next = rotateDealerButton({ ...state, dealerIndex: 0 })
    expect(next.dealerIndex).toBe(1)
  })

  it('should wrap around the player array', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', seatIndex: 0 }),
      makePlayer({ id: 'p2', seatIndex: 1 }),
      makePlayer({ id: 'p3', seatIndex: 2 }),
    )

    const next = rotateDealerButton({ ...state, dealerIndex: 2 })
    expect(next.dealerIndex).toBe(0)
  })

  it('should skip busted players', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', seatIndex: 0 }),
      makePlayer({ id: 'p2', seatIndex: 1, status: 'busted' }),
      makePlayer({ id: 'p3', seatIndex: 2 }),
    )

    const next = rotateDealerButton({ ...state, dealerIndex: 0 })
    expect(next.dealerIndex).toBe(2)
  })

  it('should skip sitting-out players', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', seatIndex: 0 }),
      makePlayer({ id: 'p2', seatIndex: 1, status: 'sitting_out' }),
      makePlayer({ id: 'p3', seatIndex: 2 }),
    )

    const next = rotateDealerButton({ ...state, dealerIndex: 0 })
    expect(next.dealerIndex).toBe(2)
  })

  it('should not mutate the original state', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', seatIndex: 0 }),
      makePlayer({ id: 'p2', seatIndex: 1 }),
    )
    const withDealer = { ...state, dealerIndex: 0 }
    const next = rotateDealerButton(withDealer)

    expect(next).not.toBe(withDealer)
    expect(withDealer.dealerIndex).toBe(0)
  })
})

// ── updatePot ──────────────────────────────────────────────────

describe('updatePot reducer', () => {
  const updatePot = getReducer('updatePot')

  it('should collect all player bets into the pot', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', bet: 100 }),
      makePlayer({ id: 'p2', seatIndex: 1, bet: 100 }),
    )

    const next = updatePot(state)
    expect(next.pot).toBe(200)
  })

  it('should reset all player bets to zero', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', bet: 100 }),
      makePlayer({ id: 'p2', seatIndex: 1, bet: 100 }),
    )

    const next = updatePot(state)
    expect(next.players[0]!.bet).toBe(0)
    expect(next.players[1]!.bet).toBe(0)
  })

  it('should reset currentBet to zero', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', bet: 100 }),
      ),
      currentBet: 100,
    }

    const next = updatePot(state)
    expect(next.currentBet).toBe(0)
  })

  it('should accumulate with existing pot', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', bet: 50 }),
        makePlayer({ id: 'p2', seatIndex: 1, bet: 50 }),
      ),
      pot: 200,
    }

    const next = updatePot(state)
    expect(next.pot).toBe(300)
  })

  it('should calculate side pots when players are all-in at different amounts', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', bet: 100, status: 'all_in', stack: 0 }),
      makePlayer({ id: 'p2', seatIndex: 1, bet: 200, status: 'all_in', stack: 0 }),
      makePlayer({ id: 'p3', seatIndex: 2, bet: 200, status: 'active', stack: 800 }),
    )

    const next = updatePot(state)
    // Main pot: 100 * 3 = 300 (p1, p2, p3 eligible)
    // Side pot: 100 * 2 = 200 (p2, p3 eligible)
    expect(next.sidePots).toHaveLength(2)
    expect(next.sidePots[0]!.amount).toBe(300)
    expect(next.sidePots[0]!.eligiblePlayerIds).toContain('p1')
    expect(next.sidePots[1]!.amount).toBe(200)
    expect(next.sidePots[1]!.eligiblePlayerIds).not.toContain('p1')
  })

  it('should return state unchanged if no bets exist', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', bet: 0 }),
      makePlayer({ id: 'p2', seatIndex: 1, bet: 0 }),
    )

    const next = updatePot(state)
    expect(next).toBe(state)
  })

  it('should not mutate the original state', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', bet: 100 }),
    )
    const next = updatePot(state)

    expect(next).not.toBe(state)
    expect(state.players[0]!.bet).toBe(100)
    expect(state.pot).toBe(0)
  })

  it('should exclude folded players from side pot eligibility', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', bet: 100, status: 'folded' }),
      makePlayer({ id: 'p2', seatIndex: 1, bet: 100, status: 'active' }),
      makePlayer({ id: 'p3', seatIndex: 2, bet: 100, status: 'active' }),
    )

    const next = updatePot(state)
    // p1 contributed but should not be eligible
    expect(next.sidePots[0]!.eligiblePlayerIds).not.toContain('p1')
    expect(next.sidePots[0]!.eligiblePlayerIds).toContain('p2')
    expect(next.sidePots[0]!.eligiblePlayerIds).toContain('p3')
  })
})

// ── awardPot ───────────────────────────────────────────────────

describe('awardPot reducer', () => {
  const awardPot = getReducer('awardPot')

  it('should add winnings to the winner stack', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', stack: 500 }),
        makePlayer({ id: 'p2', seatIndex: 1, stack: 500 }),
      ),
      pot: 200,
    }

    const next = awardPot(state, ['p1'], [200])
    expect(next.players[0]!.stack).toBe(700)
    expect(next.players[1]!.stack).toBe(500)
  })

  it('should handle split pot between multiple winners', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', stack: 500 }),
        makePlayer({ id: 'p2', seatIndex: 1, stack: 500 }),
      ),
      pot: 200,
    }

    const next = awardPot(state, ['p1', 'p2'], [100, 100])
    expect(next.players[0]!.stack).toBe(600)
    expect(next.players[1]!.stack).toBe(600)
  })

  it('should reset pot to zero', () => {
    const state = {
      ...stateWithPlayers(makePlayer({ id: 'p1', stack: 500 })),
      pot: 200,
    }

    const next = awardPot(state, ['p1'], [200])
    expect(next.pot).toBe(0)
  })

  it('should clear sidePots', () => {
    const state = {
      ...stateWithPlayers(makePlayer({ id: 'p1', stack: 500 })),
      pot: 200,
      sidePots: [{ amount: 200, eligiblePlayerIds: ['p1'] }],
    }

    const next = awardPot(state, ['p1'], [200])
    expect(next.sidePots).toEqual([])
  })

  it('should handle a player winning multiple side pots (same id appears twice)', () => {
    const state = {
      ...stateWithPlayers(
        makePlayer({ id: 'p1', stack: 500 }),
        makePlayer({ id: 'p2', seatIndex: 1, stack: 100 }),
      ),
      pot: 400,
    }

    // p1 wins main pot (200) and side pot (200)
    const next = awardPot(state, ['p1', 'p1'], [200, 200])
    expect(next.players[0]!.stack).toBe(900)
  })

  it('should not mutate the original state', () => {
    const state = {
      ...stateWithPlayers(makePlayer({ id: 'p1', stack: 500 })),
      pot: 200,
    }
    const next = awardPot(state, ['p1'], [200])

    expect(next).not.toBe(state)
    expect(state.players[0]!.stack).toBe(500)
    expect(state.pot).toBe(200)
  })
})

// ── setActivePlayer ────────────────────────────────────────────

describe('setActivePlayer reducer', () => {
  const setActivePlayer = getReducer('setActivePlayer')

  it('should set the activePlayerIndex', () => {
    const state = createInitialState({ activePlayerIndex: -1 })
    const next = setActivePlayer(state, 2)

    expect(next.activePlayerIndex).toBe(2)
  })

  it('should not mutate the original state', () => {
    const state = createInitialState({ activePlayerIndex: -1 })
    const next = setActivePlayer(state, 2)

    expect(next).not.toBe(state)
    expect(state.activePlayerIndex).toBe(-1)
  })
})

// ── markDealingComplete ────────────────────────────────────────

describe('markDealingComplete reducer', () => {
  const markDealingComplete = getReducer('markDealingComplete')

  it('should set dealingComplete to true', () => {
    const state = createInitialState({ dealingComplete: false })
    const next = markDealingComplete(state)

    expect(next.dealingComplete).toBe(true)
  })

  it('should not mutate the original state', () => {
    const state = createInitialState({ dealingComplete: false })
    const next = markDealingComplete(state)

    expect(next).not.toBe(state)
    expect(state.dealingComplete).toBe(false)
  })
})

// ── updateDealerCharacter ──────────────────────────────────────

describe('updateDealerCharacter reducer', () => {
  const updateDealerCharacter = getReducer('updateDealerCharacter')

  it('should update the dealer character id', () => {
    const state = createInitialState({ dealerCharacterId: 'vincent' })
    const next = updateDealerCharacter(state, 'maya')

    expect(next.dealerCharacterId).toBe('maya')
  })

  it('should not mutate the original state', () => {
    const state = createInitialState({ dealerCharacterId: 'vincent' })
    const next = updateDealerCharacter(state, 'maya')

    expect(next).not.toBe(state)
    expect(state.dealerCharacterId).toBe('vincent')
  })
})

// ── updateBlindLevel ───────────────────────────────────────────

describe('updateBlindLevel reducer', () => {
  const updateBlindLevel = getReducer('updateBlindLevel')

  it('should update blindLevel from BLIND_LEVELS lookup', () => {
    const state = createInitialState()
    const next = updateBlindLevel(state, 3)

    expect(next.blindLevel).toEqual(BLIND_LEVELS[2]) // level 3 is index 2
    expect(next.blindLevel.smallBlind).toBe(25)
    expect(next.blindLevel.bigBlind).toBe(50)
  })

  it('should update minRaiseIncrement to the new big blind', () => {
    const state = createInitialState()
    const next = updateBlindLevel(state, 3)

    expect(next.minRaiseIncrement).toBe(50)
  })

  it('should return state unchanged for an invalid level', () => {
    const state = createInitialState()
    const next = updateBlindLevel(state, 99)

    expect(next.blindLevel).toEqual(state.blindLevel)
  })

  it('should not mutate the original state', () => {
    const state = createInitialState()
    const next = updateBlindLevel(state, 3)

    expect(next).not.toBe(state)
    expect(state.blindLevel.level).toBe(1)
  })
})

// ── addBotPlayer ───────────────────────────────────────────────

describe('addBotPlayer reducer', () => {
  const addBotPlayer = getReducer('addBotPlayer')

  it('should add a bot player with isBot=true', () => {
    const state = createInitialState()
    const next = addBotPlayer(state, 2, 'medium')

    expect(next.players).toHaveLength(1)
    expect(next.players[0]!.isBot).toBe(true)
  })

  it('should set the correct seat index', () => {
    const state = createInitialState()
    const next = addBotPlayer(state, 2, 'medium')

    expect(next.players[0]!.seatIndex).toBe(2)
  })

  it('should set the botConfig with the given difficulty', () => {
    const state = createInitialState()
    const next = addBotPlayer(state, 0, 'hard')

    expect(next.players[0]!.botConfig).toBeDefined()
    expect(next.players[0]!.botConfig!.difficulty).toBe('hard')
  })

  it('should give the bot the starting stack', () => {
    const state = createInitialState()
    const next = addBotPlayer(state, 0, 'easy')

    expect(next.players[0]!.stack).toBe(STARTING_STACK)
  })

  it('should not mutate the original state', () => {
    const state = createInitialState()
    const next = addBotPlayer(state, 0, 'easy')

    expect(next).not.toBe(state)
    expect(state.players).toHaveLength(0)
  })
})

// ── removeBotPlayer ────────────────────────────────────────────

describe('removeBotPlayer reducer', () => {
  const removeBotPlayer = getReducer('removeBotPlayer')

  it('should remove a bot player by id', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'bot-0', isBot: true }),
      makePlayer({ id: 'p1', seatIndex: 1 }),
    )

    const next = removeBotPlayer(state, 'bot-0')
    expect(next.players).toHaveLength(1)
    expect(next.players[0]!.id).toBe('p1')
  })

  it('should not remove a human player even if the id matches', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'p1', isBot: false }),
    )

    const next = removeBotPlayer(state, 'p1')
    expect(next.players).toHaveLength(1)
  })

  it('should not mutate the original state', () => {
    const state = stateWithPlayers(
      makePlayer({ id: 'bot-0', isBot: true }),
    )
    const next = removeBotPlayer(state, 'bot-0')

    expect(next).not.toBe(state)
    expect(state.players).toHaveLength(1)
  })
})

// ── enqueueTTSMessage ──────────────────────────────────────────

describe('enqueueTTSMessage reducer', () => {
  const enqueueTTSMessage = getReducer('enqueueTTSMessage')

  it('should push a TTS message onto the queue', () => {
    const state = createInitialState()
    const message: TTSMessage = {
      id: 'tts-1',
      text: 'Player raises to 200.',
      voiceId: 'vincent',
      priority: 'normal',
      timestamp: Date.now(),
    }

    const next = enqueueTTSMessage(state, message)
    expect(next.ttsQueue).toHaveLength(1)
    expect(next.ttsQueue[0]).toEqual(message)
  })

  it('should append to existing messages in the queue', () => {
    const msg1: TTSMessage = {
      id: 'tts-1',
      text: 'First message.',
      voiceId: 'vincent',
      priority: 'normal',
      timestamp: Date.now(),
    }
    const msg2: TTSMessage = {
      id: 'tts-2',
      text: 'Second message.',
      voiceId: 'vincent',
      priority: 'high',
      timestamp: Date.now(),
    }

    const state = createInitialState({ ttsQueue: [msg1] })
    const next = enqueueTTSMessage(state, msg2)

    expect(next.ttsQueue).toHaveLength(2)
    expect(next.ttsQueue[1]).toEqual(msg2)
  })

  it('should not mutate the original state', () => {
    const state = createInitialState()
    const message: TTSMessage = {
      id: 'tts-1',
      text: 'Test.',
      voiceId: 'vincent',
      priority: 'low',
      timestamp: Date.now(),
    }

    const next = enqueueTTSMessage(state, message)
    expect(next).not.toBe(state)
    expect(state.ttsQueue).toHaveLength(0)
  })
})

// ── updateSessionHighlights ────────────────────────────────────

describe('updateSessionHighlights reducer', () => {
  const updateSessionHighlights = getReducer('updateSessionHighlights')

  it('should set largestPot when none exists', () => {
    const state = createInitialState()
    const highlight: HandHighlight = {
      handNumber: 5,
      players: ['p1', 'p2'],
      description: 'Big hand between Alice and Bob',
      potSize: 500,
    }

    const next = updateSessionHighlights(state, highlight)
    expect(next.sessionStats.largestPot).toEqual(highlight)
  })

  it('should update largestPot when the new pot is bigger', () => {
    const existingHighlight: HandHighlight = {
      handNumber: 3,
      players: ['p1'],
      description: 'Previous largest',
      potSize: 300,
    }
    const state = createInitialState({
      sessionStats: {
        handsPlayed: 5,
        totalPotDealt: 1000,
        startedAt: Date.now(),
        playerStats: {},
        largestPot: existingHighlight,
        biggestBluff: null,
        worstBeat: null,
      },
    })

    const newHighlight: HandHighlight = {
      handNumber: 6,
      players: ['p1', 'p2'],
      description: 'New largest',
      potSize: 600,
    }

    const next = updateSessionHighlights(state, newHighlight)
    expect(next.sessionStats.largestPot).toEqual(newHighlight)
  })

  it('should not update largestPot when the new pot is smaller', () => {
    const existingHighlight: HandHighlight = {
      handNumber: 3,
      players: ['p1'],
      description: 'Current largest',
      potSize: 1000,
    }
    const state = createInitialState({
      sessionStats: {
        handsPlayed: 5,
        totalPotDealt: 1000,
        startedAt: Date.now(),
        playerStats: {},
        largestPot: existingHighlight,
        biggestBluff: null,
        worstBeat: null,
      },
    })

    const smallerHighlight: HandHighlight = {
      handNumber: 6,
      players: ['p1'],
      description: 'Smaller pot',
      potSize: 200,
    }

    const next = updateSessionHighlights(state, smallerHighlight)
    expect(next.sessionStats.largestPot).toEqual(existingHighlight)
  })

  it('should not mutate the original state', () => {
    const state = createInitialState()
    const highlight: HandHighlight = {
      handNumber: 1,
      players: ['p1'],
      description: 'Test',
      potSize: 100,
    }

    const next = updateSessionHighlights(state, highlight)
    expect(next).not.toBe(state)
    expect(state.sessionStats.largestPot).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import {
  createRulesEngine,
  createSeededRandom,
  evaluateHoldemPreFlop,
  evaluateHoldemPostFlop,
  evaluateDrawHand,
  evaluateTCPHand,
  getThinkTime,
} from '../rules-engine.js'
import type { BotDecisionContext } from '../types.js'
import type { PlayerAction } from '@weekend-casino/shared'

// ── Test Helpers ────────────────────────────────────────────────

function makeContext(overrides: Partial<BotDecisionContext> = {}): BotDecisionContext {
  return {
    gameType: 'holdem',
    botPlayerId: 'bot-0',
    stack: 1000,
    bet: 0,
    currentBet: 0,
    minRaiseIncrement: 10,
    pot: 50,
    communityCards: [],
    holeCards: [
      { rank: 'A', suit: 'spades' },
      { rank: 'K', suit: 'spades' },
    ],
    legalActions: ['fold', 'check', 'bet', 'all_in'] as PlayerAction[],
    difficulty: 'medium',
    activePlayers: 3,
    positionFromDealer: 1,
    bigBlind: 10,
    handNumber: 1,
    personalityId: 'vincent',
    ...overrides,
  }
}

// ── Seeded Random ───────────────────────────────────────────────

describe('createSeededRandom', () => {
  it('should produce deterministic results from the same seed', () => {
    const rng1 = createSeededRandom(42)
    const rng2 = createSeededRandom(42)

    const seq1 = [rng1.next(), rng1.next(), rng1.next()]
    const seq2 = [rng2.next(), rng2.next(), rng2.next()]

    expect(seq1).toEqual(seq2)
  })

  it('should produce different results from different seeds', () => {
    const rng1 = createSeededRandom(42)
    const rng2 = createSeededRandom(99)

    expect(rng1.next()).not.toBe(rng2.next())
  })

  it('should produce values in [0, 1)', () => {
    const rng = createSeededRandom(123)
    for (let i = 0; i < 100; i++) {
      const val = rng.next()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })
})

// ── Hand Evaluation: Hold'em Pre-Flop ───────────────────────────

describe('evaluateHoldemPreFlop', () => {
  it('should rate pocket aces as very strong (>0.8)', () => {
    const strength = evaluateHoldemPreFlop([
      { rank: 'A', suit: 'spades' },
      { rank: 'A', suit: 'hearts' },
    ])
    expect(strength).toBeGreaterThan(0.8)
  })

  it('should rate pocket deuces lower than pocket aces', () => {
    const aces = evaluateHoldemPreFlop([
      { rank: 'A', suit: 'spades' },
      { rank: 'A', suit: 'hearts' },
    ])
    const deuces = evaluateHoldemPreFlop([
      { rank: '2', suit: 'spades' },
      { rank: '2', suit: 'hearts' },
    ])
    expect(aces).toBeGreaterThan(deuces)
  })

  it('should give suited cards a bonus over offsuit', () => {
    // Use mid-range cards where the suit bonus can differentiate
    const suited = evaluateHoldemPreFlop([
      { rank: '10', suit: 'spades' },
      { rank: '8', suit: 'spades' },
    ])
    const offsuit = evaluateHoldemPreFlop([
      { rank: '10', suit: 'spades' },
      { rank: '8', suit: 'hearts' },
    ])
    expect(suited).toBeGreaterThan(offsuit)
  })

  it('should give connected cards a bonus', () => {
    const connected = evaluateHoldemPreFlop([
      { rank: '9', suit: 'spades' },
      { rank: '10', suit: 'hearts' },
    ])
    const gapped = evaluateHoldemPreFlop([
      { rank: '9', suit: 'spades' },
      { rank: '3', suit: 'hearts' },
    ])
    expect(connected).toBeGreaterThan(gapped)
  })

  it('should return a low value for empty cards', () => {
    expect(evaluateHoldemPreFlop([])).toBeLessThanOrEqual(0.2)
  })
})

// ── Hand Evaluation: Hold'em Post-Flop ──────────────────────────

describe('evaluateHoldemPostFlop', () => {
  it('should rate a pair higher than high card', () => {
    const pair = evaluateHoldemPostFlop(
      [{ rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'hearts' }],
      [{ rank: 'A', suit: 'hearts' }, { rank: '7', suit: 'clubs' }, { rank: '3', suit: 'diamonds' }],
    )
    const highCard = evaluateHoldemPostFlop(
      [{ rank: 'Q', suit: 'spades' }, { rank: 'J', suit: 'hearts' }],
      [{ rank: '8', suit: 'hearts' }, { rank: '7', suit: 'clubs' }, { rank: '3', suit: 'diamonds' }],
    )
    expect(pair).toBeGreaterThan(highCard)
  })

  it('should rate trips higher than a pair', () => {
    const trips = evaluateHoldemPostFlop(
      [{ rank: 'A', suit: 'spades' }, { rank: 'A', suit: 'hearts' }],
      [{ rank: 'A', suit: 'diamonds' }, { rank: '7', suit: 'clubs' }, { rank: '3', suit: 'clubs' }],
    )
    const pair = evaluateHoldemPostFlop(
      [{ rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'hearts' }],
      [{ rank: 'A', suit: 'hearts' }, { rank: '7', suit: 'clubs' }, { rank: '3', suit: 'diamonds' }],
    )
    expect(trips).toBeGreaterThan(pair)
  })

  it('should fall back to pre-flop evaluation with no community cards', () => {
    const result = evaluateHoldemPostFlop(
      [{ rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'spades' }],
      [],
    )
    const preFlopResult = evaluateHoldemPreFlop([
      { rank: 'A', suit: 'spades' },
      { rank: 'K', suit: 'spades' },
    ])
    expect(result).toBe(preFlopResult)
  })
})

// ── Hand Evaluation: 5-Card Draw ────────────────────────────────

describe('evaluateDrawHand', () => {
  it('should rate four of a kind very highly', () => {
    const quads = evaluateDrawHand([
      { rank: 'A', suit: 'spades' },
      { rank: 'A', suit: 'hearts' },
      { rank: 'A', suit: 'diamonds' },
      { rank: 'A', suit: 'clubs' },
      { rank: 'K', suit: 'spades' },
    ])
    expect(quads).toBeGreaterThanOrEqual(0.9)
  })

  it('should rate a pair in the middle range', () => {
    const pair = evaluateDrawHand([
      { rank: 'A', suit: 'spades' },
      { rank: 'A', suit: 'hearts' },
      { rank: '7', suit: 'diamonds' },
      { rank: '5', suit: 'clubs' },
      { rank: '3', suit: 'spades' },
    ])
    expect(pair).toBeGreaterThanOrEqual(0.3)
    expect(pair).toBeLessThanOrEqual(0.5)
  })

  it('should rate high card only as weak', () => {
    const highCard = evaluateDrawHand([
      { rank: 'A', suit: 'spades' },
      { rank: 'K', suit: 'hearts' },
      { rank: '9', suit: 'diamonds' },
      { rank: '5', suit: 'clubs' },
      { rank: '3', suit: 'spades' },
    ])
    expect(highCard).toBeLessThan(0.3)
  })

  it('should return a low value for empty hand', () => {
    expect(evaluateDrawHand([])).toBeLessThanOrEqual(0.2)
  })
})

// ── Hand Evaluation: TCP ────────────────────────────────────────

describe('evaluateTCPHand', () => {
  it('should rate three of a kind very highly', () => {
    const trips = evaluateTCPHand([
      { rank: 'A', suit: 'spades' },
      { rank: 'A', suit: 'hearts' },
      { rank: 'A', suit: 'diamonds' },
    ])
    expect(trips).toBeGreaterThanOrEqual(0.9)
  })

  it('should rate a straight in the upper range', () => {
    const straight = evaluateTCPHand([
      { rank: '10', suit: 'spades' },
      { rank: 'J', suit: 'hearts' },
      { rank: 'Q', suit: 'diamonds' },
    ])
    expect(straight).toBeGreaterThanOrEqual(0.6)
  })

  it('should rate a pair in the middle', () => {
    const pair = evaluateTCPHand([
      { rank: 'K', suit: 'spades' },
      { rank: 'K', suit: 'hearts' },
      { rank: '7', suit: 'diamonds' },
    ])
    expect(pair).toBeGreaterThanOrEqual(0.4)
    expect(pair).toBeLessThanOrEqual(0.6)
  })

  it('should rate sub-queen hands as weak', () => {
    const weak = evaluateTCPHand([
      { rank: 'J', suit: 'spades' },
      { rank: '8', suit: 'hearts' },
      { rank: '5', suit: 'diamonds' },
    ])
    expect(weak).toBeLessThanOrEqual(0.3)
  })

  it('should return low value for insufficient cards', () => {
    expect(evaluateTCPHand([{ rank: 'A', suit: 'spades' }])).toBeLessThanOrEqual(0.2)
  })
})

// ── Think Time ──────────────────────────────────────────────────

describe('getThinkTime', () => {
  it('should return time within easy range (1000-2000)', () => {
    const time = getThinkTime('easy', () => 0.5)
    expect(time).toBeGreaterThanOrEqual(1000)
    expect(time).toBeLessThanOrEqual(2000)
  })

  it('should return time within medium range (2000-4000)', () => {
    const time = getThinkTime('medium', () => 0.5)
    expect(time).toBeGreaterThanOrEqual(2000)
    expect(time).toBeLessThanOrEqual(4000)
  })

  it('should return time within hard range (3000-6000)', () => {
    const time = getThinkTime('hard', () => 0.5)
    expect(time).toBeGreaterThanOrEqual(3000)
    expect(time).toBeLessThanOrEqual(6000)
  })

  it('should return min time with random=0', () => {
    expect(getThinkTime('easy', () => 0)).toBe(1000)
    expect(getThinkTime('medium', () => 0)).toBe(2000)
    expect(getThinkTime('hard', () => 0)).toBe(3000)
  })
})

// ── Rules Engine: Decision Making ───────────────────────────────

describe('createRulesEngine', () => {
  it('should return a valid decision with action from legal actions', async () => {
    const rng = createSeededRandom(42)
    const engine = createRulesEngine(() => rng.next())
    const ctx = makeContext()

    const decision = await engine.decide(ctx)

    expect(ctx.legalActions).toContain(decision.action)
    expect(decision.thinkTimeMs).toBeGreaterThan(0)
  })

  it('should return fold with zero think time for empty legal actions', async () => {
    const engine = createRulesEngine(() => 0.5)
    const ctx = makeContext({ legalActions: [] })

    const decision = await engine.decide(ctx)

    expect(decision.action).toBe('fold')
    expect(decision.thinkTimeMs).toBe(0)
  })

  it('should return the only legal action when there is just one', async () => {
    const engine = createRulesEngine(() => 0.5)
    const ctx = makeContext({ legalActions: ['call'] as PlayerAction[] })

    const decision = await engine.decide(ctx)

    expect(decision.action).toBe('call')
  })

  it('should produce deterministic results with seeded random', async () => {
    const ctx = makeContext()

    const rng1 = createSeededRandom(42)
    const engine1 = createRulesEngine(() => rng1.next())
    const d1 = await engine1.decide(ctx)

    const rng2 = createSeededRandom(42)
    const engine2 = createRulesEngine(() => rng2.next())
    const d2 = await engine2.decide(ctx)

    expect(d1.action).toBe(d2.action)
    expect(d1.amount).toBe(d2.amount)
  })
})

describe('easy difficulty', () => {
  it('should produce valid actions (never an illegal action)', async () => {
    const rng = createSeededRandom(1)
    const engine = createRulesEngine(() => rng.next())

    for (let i = 0; i < 50; i++) {
      const ctx = makeContext({
        difficulty: 'easy',
        legalActions: ['fold', 'check', 'bet', 'all_in'] as PlayerAction[],
      })
      const decision = await engine.decide(ctx)
      expect(['fold', 'check', 'bet', 'all_in']).toContain(decision.action)
    }
  })

  it('should fold frequently (fold bias)', async () => {
    let foldCount = 0
    const runs = 100

    for (let seed = 0; seed < runs; seed++) {
      const rng = createSeededRandom(seed)
      const engine = createRulesEngine(() => rng.next())
      const ctx = makeContext({
        difficulty: 'easy',
        legalActions: ['fold', 'call', 'raise', 'all_in'] as PlayerAction[],
        currentBet: 20,
        bet: 0,
      })
      const decision = await engine.decide(ctx)
      if (decision.action === 'fold') foldCount++
    }

    // Easy bot should fold at least 20% of the time
    expect(foldCount).toBeGreaterThan(20)
  })
})

describe('medium difficulty', () => {
  it('should raise with strong hands', async () => {
    let raiseCount = 0
    const runs = 50

    for (let seed = 0; seed < runs; seed++) {
      const rng = createSeededRandom(seed)
      const engine = createRulesEngine(() => rng.next())
      const ctx = makeContext({
        difficulty: 'medium',
        holeCards: [
          { rank: 'A', suit: 'spades' },
          { rank: 'A', suit: 'hearts' },
        ],
        legalActions: ['fold', 'call', 'raise', 'all_in'] as PlayerAction[],
        currentBet: 10,
        bet: 0,
      })
      const decision = await engine.decide(ctx)
      if (decision.action === 'raise') raiseCount++
    }

    // Medium bot with pocket aces should raise frequently
    expect(raiseCount).toBeGreaterThan(15)
  })

  it('should fold weak hands when facing a bet', async () => {
    let foldCount = 0
    const runs = 50

    for (let seed = 0; seed < runs; seed++) {
      const rng = createSeededRandom(seed)
      const engine = createRulesEngine(() => rng.next())
      const ctx = makeContext({
        difficulty: 'medium',
        holeCards: [
          { rank: '2', suit: 'spades' },
          { rank: '7', suit: 'hearts' },
        ],
        legalActions: ['fold', 'call', 'raise', 'all_in'] as PlayerAction[],
        currentBet: 100,
        pot: 120,
        bet: 0,
      })
      const decision = await engine.decide(ctx)
      if (decision.action === 'fold') foldCount++
    }

    // Medium bot with garbage should fold often against a big bet
    expect(foldCount).toBeGreaterThan(20)
  })
})

describe('hard difficulty', () => {
  it('should value bet premium hands aggressively', async () => {
    let raiseOrBetCount = 0
    const runs = 50

    for (let seed = 0; seed < runs; seed++) {
      const rng = createSeededRandom(seed)
      const engine = createRulesEngine(() => rng.next())
      const ctx = makeContext({
        difficulty: 'hard',
        holeCards: [
          { rank: 'A', suit: 'spades' },
          { rank: 'A', suit: 'hearts' },
        ],
        legalActions: ['fold', 'check', 'bet', 'all_in'] as PlayerAction[],
      })
      const decision = await engine.decide(ctx)
      if (decision.action === 'bet' || decision.action === 'raise') raiseOrBetCount++
    }

    // Hard bot with pocket aces should bet/raise most of the time
    expect(raiseOrBetCount).toBeGreaterThan(25)
  })

  it('should respect position when bluffing', async () => {
    let latePositionBets = 0
    let earlyPositionBets = 0
    const runs = 100

    for (let seed = 0; seed < runs; seed++) {
      const rng = createSeededRandom(seed)
      const engine = createRulesEngine(() => rng.next())

      // Late position (last to act)
      const lateDec = await engine.decide(makeContext({
        difficulty: 'hard',
        holeCards: [{ rank: '5', suit: 'spades' }, { rank: '8', suit: 'hearts' }],
        positionFromDealer: 2,
        activePlayers: 3,
        legalActions: ['fold', 'check', 'bet', 'all_in'] as PlayerAction[],
      }))
      if (lateDec.action === 'bet') latePositionBets++

      // Early position (first to act)
      const earlyRng = createSeededRandom(seed)
      const earlyEngine = createRulesEngine(() => earlyRng.next())
      const earlyDec = await earlyEngine.decide(makeContext({
        difficulty: 'hard',
        holeCards: [{ rank: '5', suit: 'spades' }, { rank: '8', suit: 'hearts' }],
        positionFromDealer: 0,
        activePlayers: 3,
        legalActions: ['fold', 'check', 'bet', 'all_in'] as PlayerAction[],
      }))
      if (earlyDec.action === 'bet') earlyPositionBets++
    }

    // Late position should bet more than early with marginal hands
    expect(latePositionBets).toBeGreaterThanOrEqual(earlyPositionBets)
  })
})

describe('per-game strategies', () => {
  it('should work for five_card_draw game type', async () => {
    const rng = createSeededRandom(42)
    const engine = createRulesEngine(() => rng.next())
    const ctx = makeContext({
      gameType: 'five_card_draw',
      holeCards: [
        { rank: 'A', suit: 'spades' },
        { rank: 'A', suit: 'hearts' },
        { rank: 'K', suit: 'diamonds' },
        { rank: '7', suit: 'clubs' },
        { rank: '3', suit: 'spades' },
      ],
    })

    const decision = await engine.decide(ctx)
    expect(ctx.legalActions).toContain(decision.action)
  })

  it('should work for three_card_poker game type', async () => {
    const rng = createSeededRandom(42)
    const engine = createRulesEngine(() => rng.next())
    const ctx = makeContext({
      gameType: 'three_card_poker',
      holeCards: [
        { rank: 'A', suit: 'spades' },
        { rank: 'K', suit: 'hearts' },
        { rank: 'Q', suit: 'diamonds' },
      ],
    })

    const decision = await engine.decide(ctx)
    expect(ctx.legalActions).toContain(decision.action)
  })

  it('should handle unsupported game types gracefully', async () => {
    const rng = createSeededRandom(42)
    const engine = createRulesEngine(() => rng.next())
    const ctx = makeContext({
      gameType: 'roulette' as any,
      holeCards: [],
    })

    const decision = await engine.decide(ctx)
    expect(ctx.legalActions).toContain(decision.action)
  })
})

describe('dialogue generation', () => {
  it('should sometimes include dialogue based on personality chattiness', async () => {
    let dialogueCount = 0
    const runs = 100

    for (let seed = 0; seed < runs; seed++) {
      const rng = createSeededRandom(seed)
      const engine = createRulesEngine(() => rng.next())
      const ctx = makeContext({ personalityId: 'maya' }) // Maya is very chatty

      const decision = await engine.decide(ctx)
      if (decision.dialogue) dialogueCount++
    }

    // Maya (chattiness=0.9) should talk most of the time
    expect(dialogueCount).toBeGreaterThan(50)
  })

  it('should rarely include dialogue for quiet personalities', async () => {
    let dialogueCount = 0
    const runs = 100

    for (let seed = 0; seed < runs; seed++) {
      const rng = createSeededRandom(seed)
      const engine = createRulesEngine(() => rng.next())
      const ctx = makeContext({ personalityId: 'remy' }) // Remy is very quiet

      const decision = await engine.decide(ctx)
      if (decision.dialogue) dialogueCount++
    }

    // Remy (chattiness=0.2) should rarely talk
    expect(dialogueCount).toBeLessThan(50)
  })
})

describe('bet amounts', () => {
  it('should produce valid bet amounts (not exceeding stack)', async () => {
    const rng = createSeededRandom(42)
    const engine = createRulesEngine(() => rng.next())

    for (let i = 0; i < 50; i++) {
      const ctx = makeContext({
        stack: 200,
        bet: 0,
        currentBet: 50,
        minRaiseIncrement: 10,
        difficulty: 'hard',
        legalActions: ['fold', 'call', 'raise', 'all_in'] as PlayerAction[],
      })
      const decision = await engine.decide(ctx)
      if (decision.amount !== undefined) {
        expect(decision.amount).toBeGreaterThan(0)
        expect(decision.amount).toBeLessThanOrEqual(ctx.stack + ctx.bet)
      }
    }
  })
})

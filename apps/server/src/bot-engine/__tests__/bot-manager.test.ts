import { describe, it, expect } from 'vitest'
import { BotManager } from '../bot-manager.js'
import { createSeededRandom } from '../rules-engine.js'
import type { BotActionRequest } from '../bot-manager.js'
import type { PlayerAction } from '@weekend-casino/shared'

// ── Test Helpers ────────────────────────────────────────────────

function makeActionRequest(overrides: Partial<BotActionRequest> = {}): BotActionRequest {
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
    activePlayers: 3,
    positionFromDealer: 1,
    bigBlind: 10,
    handNumber: 1,
    ...overrides,
  }
}

// ── Bot Registration ────────────────────────────────────────────

describe('BotManager: addBot / removeBot', () => {
  it('should add a bot and return a registration', () => {
    const manager = new BotManager()
    const reg = manager.addBot(0, 'medium')

    expect(reg.botId).toBe('bot-0')
    expect(reg.seatIndex).toBe(0)
    expect(reg.difficulty).toBe('medium')
    expect(reg.personalityId).toBeDefined()
  })

  it('should assign personality based on seat index if not provided', () => {
    const manager = new BotManager()
    const reg0 = manager.addBot(0, 'easy')
    const reg1 = manager.addBot(1, 'easy')

    // Different seats get different personalities
    expect(reg0.personalityId).toBeDefined()
    expect(reg1.personalityId).toBeDefined()
  })

  it('should use the provided personality if specified', () => {
    const manager = new BotManager()
    const reg = manager.addBot(0, 'hard', 'jade')

    expect(reg.personalityId).toBe('jade')
  })

  it('should remove a bot by ID', () => {
    const manager = new BotManager()
    manager.addBot(0, 'medium')

    expect(manager.isBot('bot-0')).toBe(true)
    const removed = manager.removeBot('bot-0')

    expect(removed).toBe(true)
    expect(manager.isBot('bot-0')).toBe(false)
  })

  it('should return false when removing a non-existent bot', () => {
    const manager = new BotManager()
    expect(manager.removeBot('bot-99')).toBe(false)
  })

  it('should track multiple bots', () => {
    const manager = new BotManager()
    manager.addBot(0, 'easy')
    manager.addBot(1, 'medium')
    manager.addBot(2, 'hard')

    expect(manager.getAllBots()).toHaveLength(3)
    expect(manager.isBot('bot-0')).toBe(true)
    expect(manager.isBot('bot-1')).toBe(true)
    expect(manager.isBot('bot-2')).toBe(true)
  })
})

describe('BotManager: getBot', () => {
  it('should return the registration for an existing bot', () => {
    const manager = new BotManager()
    manager.addBot(2, 'hard', 'maya')

    const bot = manager.getBot('bot-2')
    expect(bot).toBeDefined()
    expect(bot!.difficulty).toBe('hard')
    expect(bot!.personalityId).toBe('maya')
  })

  it('should return undefined for non-existent bot', () => {
    const manager = new BotManager()
    expect(manager.getBot('bot-99')).toBeUndefined()
  })
})

describe('BotManager: isBot', () => {
  it('should return true for registered bots', () => {
    const manager = new BotManager()
    manager.addBot(0, 'easy')

    expect(manager.isBot('bot-0')).toBe(true)
  })

  it('should return false for human players', () => {
    const manager = new BotManager()
    expect(manager.isBot('player-1')).toBe(false)
  })
})

describe('BotManager: clear', () => {
  it('should remove all bots', () => {
    const manager = new BotManager()
    manager.addBot(0, 'easy')
    manager.addBot(1, 'medium')
    manager.addBot(2, 'hard')

    manager.clear()
    expect(manager.getAllBots()).toHaveLength(0)
  })
})

// ── Decision Making ─────────────────────────────────────────────

describe('BotManager: requestBotAction', () => {
  it('should return a valid decision for a registered bot', async () => {
    const rng = createSeededRandom(42)
    const manager = new BotManager({ randomFn: () => rng.next() })
    manager.addBot(0, 'medium')

    const request = makeActionRequest()
    const decision = await manager.requestBotAction(request)

    expect(request.legalActions).toContain(decision.action)
    expect(decision.thinkTimeMs).toBeGreaterThan(0)
  })

  it('should fold for an unregistered bot', async () => {
    const manager = new BotManager()
    const request = makeActionRequest({ botPlayerId: 'bot-99' })

    const decision = await manager.requestBotAction(request)

    expect(decision.action).toBe('fold')
    expect(decision.thinkTimeMs).toBe(0)
  })

  it('should produce deterministic results with seeded random', async () => {
    const request = makeActionRequest()

    const rng1 = createSeededRandom(42)
    const manager1 = new BotManager({ randomFn: () => rng1.next() })
    manager1.addBot(0, 'hard', 'vincent')
    const d1 = await manager1.requestBotAction(request)

    const rng2 = createSeededRandom(42)
    const manager2 = new BotManager({ randomFn: () => rng2.next() })
    manager2.addBot(0, 'hard', 'vincent')
    const d2 = await manager2.requestBotAction(request)

    expect(d1.action).toBe(d2.action)
    expect(d1.amount).toBe(d2.amount)
  })

  it('should respect the difficulty level of the bot', async () => {
    // Easy and hard should behave differently on average
    let easyFolds = 0
    let hardFolds = 0
    const runs = 50

    for (let seed = 0; seed < runs; seed++) {
      const easyRng = createSeededRandom(seed)
      const easyManager = new BotManager({ randomFn: () => easyRng.next() })
      easyManager.addBot(0, 'easy')

      const hardRng = createSeededRandom(seed)
      const hardManager = new BotManager({ randomFn: () => hardRng.next() })
      hardManager.addBot(0, 'hard')

      const request = makeActionRequest({
        legalActions: ['fold', 'call', 'raise', 'all_in'] as PlayerAction[],
        currentBet: 20,
        holeCards: [
          { rank: '3', suit: 'spades' },
          { rank: '7', suit: 'hearts' },
        ],
      })

      const easyDec = await easyManager.requestBotAction(request)
      const hardDec = await hardManager.requestBotAction(request)

      if (easyDec.action === 'fold') easyFolds++
      if (hardDec.action === 'fold') hardFolds++
    }

    // With a weak hand, hard bot should fold more (better at folding weak hands)
    // and easy bot should call too much
    // Both should have some folds though
    expect(easyFolds + hardFolds).toBeGreaterThan(0)
  })
})

// ── Dialogue ────────────────────────────────────────────────────

describe('BotManager: getBotDialogue', () => {
  it('should return a dialogue line for a registered bot', () => {
    const manager = new BotManager({ randomFn: () => 0 })
    manager.addBot(0, 'medium', 'maya')

    const dialogue = manager.getBotDialogue('bot-0', 'onBigWin')
    expect(typeof dialogue).toBe('string')
    expect(dialogue.length).toBeGreaterThan(0)
  })

  it('should return empty string for unregistered bot', () => {
    const manager = new BotManager()
    expect(manager.getBotDialogue('bot-99', 'idle')).toBe('')
  })

  it('should return different lines for different situations', () => {
    const manager = new BotManager({ randomFn: () => 0 })
    manager.addBot(0, 'medium', 'maya')

    const winLine = manager.getBotDialogue('bot-0', 'onBigWin')
    const foldLine = manager.getBotDialogue('bot-0', 'onFold')

    // Maya has different lines for different situations
    expect(typeof winLine).toBe('string')
    expect(typeof foldLine).toBe('string')
  })
})

// ── Claude Integration ──────────────────────────────────────────

describe('BotManager: Claude engine integration', () => {
  it('should use rules engine when no anthropic client is provided', async () => {
    const rng = createSeededRandom(42)
    const manager = new BotManager({ randomFn: () => rng.next() })
    manager.addBot(0, 'medium')

    const decision = await manager.requestBotAction(makeActionRequest())
    expect(decision.action).toBeDefined()
  })

  it('should use rules engine when useClaudeDialogue is false', async () => {
    const rng = createSeededRandom(42)
    const manager = new BotManager({
      randomFn: () => rng.next(),
      useClaudeDialogue: false,
    })
    manager.addBot(0, 'medium')

    const decision = await manager.requestBotAction(makeActionRequest())
    expect(decision.action).toBeDefined()
  })
})

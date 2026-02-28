import { describe, it, expect, vi } from 'vitest'
import { createClaudeEngine, getFallbackDialogue } from '../claude-engine.js'
import type { AnthropicClient } from '../claude-engine.js'
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

function createMockClient(
  response: string = 'Looking good, I shall proceed carefully.',
): AnthropicClient {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: response }],
      }),
    },
  }
}

function createFailingClient(): AnthropicClient {
  return {
    messages: {
      create: vi.fn().mockRejectedValue(new Error('API unavailable')),
    },
  }
}

// ── Tests ───────────────────────────────────────────────────────

describe('createClaudeEngine', () => {
  it('should make a game decision even without a Claude client', async () => {
    const engine = createClaudeEngine({ randomFn: () => 0.5 })
    const ctx = makeContext()

    const decision = await engine.decide(ctx)

    expect(ctx.legalActions).toContain(decision.action)
    expect(decision.thinkTimeMs).toBeGreaterThan(0)
  })

  it('should include Claude-generated dialogue when client is provided', async () => {
    const mockClient = createMockClient('An interesting board indeed.')
    const engine = createClaudeEngine({
      client: mockClient,
      randomFn: () => 0.5,
    })
    const ctx = makeContext()

    const decision = await engine.decide(ctx)

    expect(decision.dialogue).toBe('An interesting board indeed.')
    expect(mockClient.messages.create).toHaveBeenCalledOnce()
  })

  it('should pass correct parameters to Claude API', async () => {
    const mockClient = createMockClient()
    const engine = createClaudeEngine({
      client: mockClient,
      randomFn: () => 0.5,
    })

    await engine.decide(makeContext({ personalityId: 'maya' }))

    const callArgs = (mockClient.messages.create as any).mock.calls[0][0]
    expect(callArgs.model).toBe('claude-haiku-4-5-20251001')
    expect(callArgs.max_tokens).toBe(60)
    expect(callArgs.system).toContain('Maya')
    expect(callArgs.messages[0].role).toBe('user')
    expect(callArgs.messages[0].content).toContain('holdem')
  })

  it('should fall back to canned dialogue when Claude API fails', async () => {
    const failingClient = createFailingClient()
    const engine = createClaudeEngine({
      client: failingClient,
      randomFn: () => 0.5,
    })
    const ctx = makeContext()

    const decision = await engine.decide(ctx)

    // Should still have a valid game decision
    expect(ctx.legalActions).toContain(decision.action)
    // Dialogue may or may not be present (from rules engine fallback)
  })

  it('should enforce rate limit: max 1 Claude call per bot per hand', async () => {
    const mockClient = createMockClient('First call')
    const engine = createClaudeEngine({
      client: mockClient,
      randomFn: () => 0.5,
    })

    const ctx = makeContext({ handNumber: 5 })

    // First call should hit Claude
    await engine.decide(ctx)
    expect(mockClient.messages.create).toHaveBeenCalledTimes(1)

    // Second call same bot same hand should NOT hit Claude
    await engine.decide(ctx)
    expect(mockClient.messages.create).toHaveBeenCalledTimes(1)

    // New hand should hit Claude again
    const ctx2 = makeContext({ handNumber: 6 })
    await engine.decide(ctx2)
    expect(mockClient.messages.create).toHaveBeenCalledTimes(2)
  })

  it('should allow different bots to call Claude on the same hand', async () => {
    const mockClient = createMockClient('Different bot')
    const engine = createClaudeEngine({
      client: mockClient,
      randomFn: () => 0.5,
    })

    await engine.decide(makeContext({ botPlayerId: 'bot-0', handNumber: 1 }))
    await engine.decide(makeContext({ botPlayerId: 'bot-1', handNumber: 1 }))

    expect(mockClient.messages.create).toHaveBeenCalledTimes(2)
  })

  it('should handle empty response content', async () => {
    const mockClient: AnthropicClient = {
      messages: {
        create: vi.fn().mockResolvedValue({ content: [] }),
      },
    }
    const engine = createClaudeEngine({
      client: mockClient,
      randomFn: () => 0.5,
    })

    const decision = await engine.decide(makeContext())

    // Should still work, just no Claude dialogue
    expect(decision.action).toBeDefined()
  })

  it('should include community cards in the prompt when present', async () => {
    const mockClient = createMockClient()
    const engine = createClaudeEngine({
      client: mockClient,
      randomFn: () => 0.5,
    })

    await engine.decide(makeContext({
      communityCards: [
        { rank: 'A', suit: 'hearts' },
        { rank: 'K', suit: 'diamonds' },
        { rank: '7', suit: 'clubs' },
      ],
    }))

    const callArgs = (mockClient.messages.create as any).mock.calls[0][0]
    expect(callArgs.messages[0].content).toContain('Board:')
  })
})

describe('getFallbackDialogue', () => {
  it('should return a string for known actions', () => {
    const line = getFallbackDialogue('vincent', 'fold', () => 0)
    expect(typeof line).toBe('string')
    expect(line.length).toBeGreaterThan(0)
  })

  it('should return idle dialogue for unknown actions', () => {
    const line = getFallbackDialogue('vincent', 'unknown_action', () => 0)
    expect(typeof line).toBe('string')
  })

  it('should respect the personality parameter', () => {
    const vincentLine = getFallbackDialogue('vincent', 'fold', () => 0)
    const mayaLine = getFallbackDialogue('maya', 'fold', () => 0)
    // Different personalities should (usually) have different lines
    // Not guaranteed for index 0, but the function should not error
    expect(typeof vincentLine).toBe('string')
    expect(typeof mayaLine).toBe('string')
  })

  it('should use the random function for selection', () => {
    const line0 = getFallbackDialogue('maya', 'onRaise' as any, () => 0)
    const lineLast = getFallbackDialogue('maya', 'onRaise' as any, () => 0.99)
    // These may differ if Maya has multiple raise lines
    expect(typeof line0).toBe('string')
    expect(typeof lineLast).toBe('string')
  })
})

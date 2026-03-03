/**
 * Claude LLM Engine — Generates personality-driven dialogue for bots.
 *
 * Uses the Anthropic SDK for dialogue generation (NOT primary decision-making).
 * Falls back to canned responses from the personality system if the API is
 * unavailable or rate-limited.
 *
 * Rate limit: max 1 Claude call per bot per hand.
 */

import type { BotDecisionContext, IBotEngine, BotDecision } from './types.js'
import { getPersonality, pickDialogueLine } from './personalities.js'
import { createRulesEngine } from './rules-engine.js'
import type { DialogueLines } from './types.js'

// ── Types ───────────────────────────────────────────────────────

/** Minimal interface for the Anthropic client (for mocking). */
export interface AnthropicClient {
  messages: {
    create(params: {
      model: string
      max_tokens: number
      system: string
      messages: Array<{ role: string; content: string }>
    }): Promise<{ content: Array<{ type: string; text: string }> }>
  }
}

interface ClaudeEngineOptions {
  /** Anthropic client instance (or mock). */
  client?: AnthropicClient | null
  /** Random function for fallback dialogue and rules engine. */
  randomFn?: () => number
}

// ── Rate Limiter ────────────────────────────────────────────────

/** Tracks per-bot-per-hand Claude API usage. */
class RateLimiter {
  private calls = new Map<string, number>()

  /** Returns true if the bot can make a Claude call this hand. */
  canCall(botId: string, handNumber: number): boolean {
    const key = `${botId}:${handNumber}`
    return !this.calls.has(key)
  }

  /** Records a Claude call for the bot on this hand. */
  record(botId: string, handNumber: number): void {
    const key = `${botId}:${handNumber}`
    this.calls.set(key, Date.now())
  }

  /** Clears old entries (called periodically). */
  cleanup(currentHandNumber: number): void {
    for (const [key] of this.calls) {
      const handNum = parseInt(key.split(':')[1] ?? '0', 10)
      if (handNum < currentHandNumber - 5) {
        this.calls.delete(key)
      }
    }
  }
}

// ── Prompt Builder ──────────────────────────────────────────────

function buildSystemPrompt(context: BotDecisionContext): string {
  const personality = getPersonality(context.personalityId)
  return [
    `You are ${personality.name}, an AI poker player in a casino game.`,
    `Personality: ${personality.description}`,
    `Traits: aggression=${personality.aggression}, chattiness=${personality.chattiness}, tightness=${personality.tightness}`,
    `You are playing ${context.gameType}. Respond with a short, in-character quip (1 sentence max).`,
    `Do NOT include game action decisions. Only provide dialogue.`,
  ].join('\n')
}

function buildUserPrompt(context: BotDecisionContext, action: string): string {
  const parts = [
    `Game: ${context.gameType}`,
    `Hand #${context.handNumber}`,
    `Action taken: ${action}`,
    `Pot: ${context.pot} chips`,
    `Players remaining: ${context.activePlayers}`,
  ]
  if (context.communityCards.length > 0) {
    const cards = context.communityCards
      .map(c => `${c.rank}${c.suit[0]}`)
      .join(' ')
    parts.push(`Board: ${cards}`)
  }
  return parts.join('. ') + '.\nRespond with a short, in-character quip.'
}

// ── Claude Engine ───────────────────────────────────────────────

/**
 * Creates a Claude-enhanced bot engine.
 * Uses rules engine for decisions, Claude for dialogue.
 */
export function createClaudeEngine(options: ClaudeEngineOptions = {}): IBotEngine {
  const { client = null, randomFn } = options
  const rulesEngine = createRulesEngine(randomFn)
  const rateLimiter = new RateLimiter()

  return {
    async decide(context: BotDecisionContext): Promise<BotDecision> {
      // Rules engine makes the actual game decision
      const decision = await rulesEngine.decide(context)

      // Try Claude for dialogue if client is available and within rate limit
      if (client && rateLimiter.canCall(context.botPlayerId, context.handNumber)) {
        try {
          const systemPrompt = buildSystemPrompt(context)
          const userPrompt = buildUserPrompt(context, decision.action)

          const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 60,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          })

          const text = response.content?.[0]?.type === 'text'
            ? response.content[0].text.trim()
            : null

          if (text) {
            decision.dialogue = text
            rateLimiter.record(context.botPlayerId, context.handNumber)
          }
        } catch {
          // Claude unavailable — fall back to canned dialogue (already set by rules engine)
        }
      }

      // Clean up old rate limit entries
      rateLimiter.cleanup(context.handNumber)

      return decision
    },
  }
}

/**
 * Gets a fallback dialogue line without calling Claude.
 * Useful when the API is unavailable.
 */
export function getFallbackDialogue(
  personalityId: string,
  action: string,
  random: () => number = Math.random,
): string {
  const personality = getPersonality(personalityId)
  const situationMap: Record<string, keyof DialogueLines> = {
    fold: 'onFold',
    raise: 'onRaise',
    call: 'onCall',
    all_in: 'onAllIn',
    bet: 'onRaise',
    check: 'idle',
  }
  const situation = situationMap[action] ?? 'idle'
  return pickDialogueLine(personality, situation, random)
}

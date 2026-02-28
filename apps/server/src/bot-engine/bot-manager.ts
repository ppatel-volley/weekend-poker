/**
 * Bot Manager — Orchestrates bot lifecycle and decision flow.
 *
 * Responsibilities:
 *   - Add/remove bots from sessions
 *   - Route decision requests to the appropriate engine
 *   - Manage personality assignment
 *   - Enforce think-time delays
 */

import type { CasinoGame, BotDifficulty, PlayerAction, Card } from '@weekend-casino/shared'
import type { BotDecisionContext, BotDecision, IBotEngine } from './types.js'
import { createRulesEngine } from './rules-engine.js'
import { createClaudeEngine, type AnthropicClient } from './claude-engine.js'
import { getPersonality, BOT_PERSONALITIES } from './personalities.js'

// ── Types ───────────────────────────────────────────────────────

export interface BotRegistration {
  botId: string
  seatIndex: number
  difficulty: BotDifficulty
  personalityId: string
}

export interface BotActionRequest {
  gameType: CasinoGame
  botPlayerId: string
  stack: number
  bet: number
  currentBet: number
  minRaiseIncrement: number
  pot: number
  communityCards: Card[]
  holeCards: Card[]
  legalActions: PlayerAction[]
  activePlayers: number
  positionFromDealer: number
  bigBlind: number
  handNumber: number
}

interface BotManagerOptions {
  /** Anthropic client for Claude dialogue (optional). */
  anthropicClient?: AnthropicClient | null
  /** Custom random function (for deterministic testing). */
  randomFn?: () => number
  /** Use Claude engine for dialogue (default: true if client provided). */
  useClaudeDialogue?: boolean
}

// ── Personality Assignment ──────────────────────────────────────

const PERSONALITY_IDS = Object.keys(BOT_PERSONALITIES)

function assignPersonality(seatIndex: number): string {
  return PERSONALITY_IDS[seatIndex % PERSONALITY_IDS.length]!
}

// ── Bot Manager ─────────────────────────────────────────────────

export class BotManager {
  private bots = new Map<string, BotRegistration>()
  private engine: IBotEngine
  private randomFn: () => number

  constructor(options: BotManagerOptions = {}) {
    const { anthropicClient, randomFn, useClaudeDialogue } = options
    this.randomFn = randomFn ?? Math.random

    if (useClaudeDialogue && anthropicClient) {
      this.engine = createClaudeEngine({
        client: anthropicClient,
        randomFn: this.randomFn,
      })
    } else {
      this.engine = createRulesEngine(this.randomFn)
    }
  }

  /** Add a bot to the session. */
  addBot(seatIndex: number, difficulty: BotDifficulty, personalityId?: string): BotRegistration {
    const botId = `bot-${seatIndex}`
    const assignedPersonality = personalityId ?? assignPersonality(seatIndex)

    const registration: BotRegistration = {
      botId,
      seatIndex,
      difficulty,
      personalityId: assignedPersonality,
    }

    this.bots.set(botId, registration)
    return registration
  }

  /** Remove a bot from the session. */
  removeBot(botId: string): boolean {
    return this.bots.delete(botId)
  }

  /** Get a bot's registration. */
  getBot(botId: string): BotRegistration | undefined {
    return this.bots.get(botId)
  }

  /** Get all registered bots. */
  getAllBots(): BotRegistration[] {
    return Array.from(this.bots.values())
  }

  /** Check if a player ID belongs to a bot. */
  isBot(playerId: string): boolean {
    return this.bots.has(playerId)
  }

  /** Request a bot's action decision. */
  async requestBotAction(request: BotActionRequest): Promise<BotDecision> {
    const bot = this.bots.get(request.botPlayerId)
    if (!bot) {
      return { action: 'fold', thinkTimeMs: 0 }
    }

    const context: BotDecisionContext = {
      gameType: request.gameType,
      botPlayerId: request.botPlayerId,
      stack: request.stack,
      bet: request.bet,
      currentBet: request.currentBet,
      minRaiseIncrement: request.minRaiseIncrement,
      pot: request.pot,
      communityCards: request.communityCards,
      holeCards: request.holeCards,
      legalActions: request.legalActions,
      difficulty: bot.difficulty,
      activePlayers: request.activePlayers,
      positionFromDealer: request.positionFromDealer,
      bigBlind: request.bigBlind,
      handNumber: request.handNumber,
      personalityId: bot.personalityId,
    }

    return this.engine.decide(context)
  }

  /** Get a dialogue line for a bot (without making a game decision). */
  getBotDialogue(
    botPlayerId: string,
    situation: 'onBigWin' | 'onBigLoss' | 'onBluff' | 'onFold' | 'onRaise' | 'onCall' | 'onAllIn' | 'idle',
  ): string {
    const bot = this.bots.get(botPlayerId)
    if (!bot) return ''

    const personality = getPersonality(bot.personalityId)
    const lines = personality.dialogueLines[situation]
    if (lines.length === 0) return ''

    const index = Math.floor(this.randomFn() * lines.length)
    return lines[index]!
  }

  /** Clear all bots. */
  clear(): void {
    this.bots.clear()
  }
}

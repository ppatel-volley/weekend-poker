/**
 * Bot Engine — Public API for the AI bot system.
 */

export type {
  BotDecisionContext,
  BotDecision,
  IBotEngine,
  BotPersonality,
  DialogueLines,
  SeededRandom,
} from './types.js'

export { createRulesEngine, createSeededRandom } from './rules-engine.js'
export {
  evaluateHoldemPreFlop,
  evaluateHoldemPostFlop,
  evaluateDrawHand,
  evaluateTCPHand,
  getThinkTime,
} from './rules-engine.js'

export { createClaudeEngine, getFallbackDialogue } from './claude-engine.js'
export type { AnthropicClient } from './claude-engine.js'

export { BotManager } from './bot-manager.js'
export type { BotRegistration, BotActionRequest } from './bot-manager.js'

export {
  BOT_PERSONALITIES,
  getPersonality,
  pickDialogueLine,
  VINCENT,
  MAYA,
  REMY,
  JADE,
} from './personalities.js'

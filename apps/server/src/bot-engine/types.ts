/**
 * Bot Engine Types — Interfaces for AI bot decision-making system.
 *
 * Supports hybrid architecture: rules-based engine for game actions,
 * Claude LLM for personality dialogue.
 */

import type { CasinoGame, BotDifficulty, PlayerAction } from '@weekend-casino/shared'

// ── Decision Context ────────────────────────────────────────────

/** Context provided to the bot engine for making decisions. */
export interface BotDecisionContext {
  gameType: CasinoGame
  botPlayerId: string
  /** Bot's current stack. */
  stack: number
  /** Bot's current bet this round. */
  bet: number
  /** Current bet to match. */
  currentBet: number
  /** Minimum raise increment. */
  minRaiseIncrement: number
  /** Pot size. */
  pot: number
  /** Community cards (Hold'em) — rank/suit tuples. */
  communityCards: ReadonlyArray<{ rank: string; suit: string }>
  /** Bot's hole cards — rank/suit tuples. */
  holeCards: ReadonlyArray<{ rank: string; suit: string }>
  /** Legal actions for this bot right now. */
  legalActions: PlayerAction[]
  /** Bot difficulty level. */
  difficulty: BotDifficulty
  /** Number of active (non-folded, non-busted) players. */
  activePlayers: number
  /** Bot's seat position relative to dealer (0-based). */
  positionFromDealer: number
  /** Blind level — big blind amount. */
  bigBlind: number
  /** Current hand number. */
  handNumber: number
  /** Bot's personality ID. */
  personalityId: string
}

// ── Decision Output ─────────────────────────────────────────────

/** The result of a bot's decision process. */
export interface BotDecision {
  action: PlayerAction
  amount?: number
  dialogue?: string
  thinkTimeMs: number
}

// ── Engine Interface ────────────────────────────────────────────

/** Interface for bot decision engines (rules-based or LLM). */
export interface IBotEngine {
  decide(context: BotDecisionContext): Promise<BotDecision>
}

// ── Personality ─────────────────────────────────────────────────

/** Defines a bot personality's behavioural traits. */
export interface BotPersonality {
  id: string
  name: string
  description: string
  /** Aggression factor: 0 = very passive, 1 = very aggressive. */
  aggression: number
  /** Bluff frequency: 0 = never bluffs, 1 = bluffs constantly. */
  bluffFrequency: number
  /** Chattiness: 0 = silent, 1 = talks constantly. */
  chattiness: number
  /** Tightness: 0 = very loose (plays many hands), 1 = very tight (plays few). */
  tightness: number
  /** Canned dialogue lines by situation. */
  dialogueLines: DialogueLines
}

/** Dialogue lines categorised by game situation. */
export interface DialogueLines {
  onBigWin: string[]
  onBigLoss: string[]
  onBluff: string[]
  onFold: string[]
  onRaise: string[]
  onCall: string[]
  onAllIn: string[]
  idle: string[]
}

// ── Seeded Random ───────────────────────────────────────────────

/** Simple seeded PRNG for deterministic bot decisions in tests. */
export interface SeededRandom {
  /** Returns a float in [0, 1). */
  next(): number
}

/**
 * Rules-Based Decision Engine — Determines bot actions using game theory heuristics.
 *
 * Three difficulty levels:
 *   Easy   — Random-leaning play with fold bias, calls too much, rarely raises.
 *   Medium — Basic GTO-lite: considers hand strength, pot odds, position.
 *   Hard   — Strong play: proper evaluation, position awareness, bluff detection.
 *
 * Per-game strategies:
 *   Hold'em       — Pre-flop hand ranges, pot odds, position.
 *   5-Card Draw   — Draw quality assessment, discard strategy.
 *   TCP           — Ante bonus awareness, qualification-based play/fold.
 */

import type { PlayerAction } from '@weekend-casino/shared'
import { rankToNumeric } from '@weekend-casino/shared'
import type { BotDecisionContext, BotDecision, IBotEngine, SeededRandom } from './types.js'
import { getPersonality, pickDialogueLine } from './personalities.js'

// ── Seeded PRNG ─────────────────────────────────────────────────

/** Creates a seeded random number generator (mulberry32). */
export function createSeededRandom(seed: number): SeededRandom {
  let state = seed | 0
  return {
    next(): number {
      state = (state + 0x6D2B79F5) | 0
      let t = Math.imul(state ^ (state >>> 15), 1 | state)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}

// ── Hand Strength Helpers ───────────────────────────────────────

/** Evaluates pre-flop hand strength for Hold'em (0-1 scale). */
export function evaluateHoldemPreFlop(
  holeCards: ReadonlyArray<{ rank: string; suit: string }>,
): number {
  if (holeCards.length < 2) return 0.2

  const r1 = rankToNumeric(holeCards[0]!.rank as any)
  const r2 = rankToNumeric(holeCards[1]!.rank as any)
  const high = Math.max(r1, r2)
  const low = Math.min(r1, r2)
  const paired = r1 === r2
  const suited = holeCards[0]!.suit === holeCards[1]!.suit
  const gap = high - low

  let strength = 0

  // Pairs
  if (paired) {
    strength = 0.5 + (high / 14) * 0.5 // AA=1.0, 22=0.57
    return Math.min(strength, 1)
  }

  // High card bonus
  strength = (high + low) / 28 // Scale 0-1 based on card ranks
  if (high >= 14) strength += 0.15 // Ace bonus
  if (high >= 13) strength += 0.08 // King bonus

  // Suited bonus
  if (suited) strength += 0.06

  // Connectedness
  if (gap <= 1) strength += 0.06
  else if (gap <= 2) strength += 0.03
  else if (gap >= 5) strength -= 0.05

  return Math.max(0, Math.min(strength, 1))
}

/** Evaluates post-flop hand strength based on community cards. */
export function evaluateHoldemPostFlop(
  holeCards: ReadonlyArray<{ rank: string; suit: string }>,
  communityCards: ReadonlyArray<{ rank: string; suit: string }>,
): number {
  if (holeCards.length < 2 || communityCards.length === 0) {
    return evaluateHoldemPreFlop(holeCards)
  }

  const allCards = [...holeCards, ...communityCards]
  const ranks = allCards.map(c => rankToNumeric(c.rank as any))
  const suits = allCards.map(c => c.suit)

  let strength = 0.1

  // Count pairs/trips/quads
  const rankCounts = new Map<number, number>()
  for (const r of ranks) {
    rankCounts.set(r, (rankCounts.get(r) ?? 0) + 1)
  }

  const holeRanks = holeCards.map(c => rankToNumeric(c.rank as any))
  let madeHand = false

  // Check if hole cards connect with the board
  for (const hr of holeRanks) {
    const count = rankCounts.get(hr) ?? 0
    if (count >= 4) { strength = 0.95; madeHand = true } // Quads
    else if (count >= 3) { strength = Math.max(strength, 0.75); madeHand = true } // Trips
    else if (count >= 2) { strength = Math.max(strength, 0.5); madeHand = true } // Pair
  }

  // Two pair check
  const pairs = Array.from(rankCounts.values()).filter(c => c >= 2).length
  if (pairs >= 2 && madeHand) strength = Math.max(strength, 0.65)

  // Flush draw / flush
  const suitCounts = new Map<string, number>()
  for (const s of suits) {
    suitCounts.set(s, (suitCounts.get(s) ?? 0) + 1)
  }
  const maxSuitCount = Math.max(...suitCounts.values())
  if (maxSuitCount >= 5) strength = Math.max(strength, 0.8)
  else if (maxSuitCount === 4) strength = Math.max(strength, 0.35) // Flush draw

  // Straight check (simplified)
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b)
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    if (uniqueRanks[i + 4]! - uniqueRanks[i]! === 4) {
      strength = Math.max(strength, 0.75)
    }
  }

  // High card value if no made hand
  if (!madeHand) {
    const highCard = Math.max(...holeRanks) / 14
    strength = Math.max(strength, highCard * 0.3)
  }

  return Math.min(strength, 1)
}

/** Evaluates hand strength for 5-Card Draw (simplified). */
export function evaluateDrawHand(
  holeCards: ReadonlyArray<{ rank: string; suit: string }>,
): number {
  if (holeCards.length === 0) return 0.2

  const ranks = holeCards.map(c => rankToNumeric(c.rank as any))
  const rankCounts = new Map<number, number>()
  for (const r of ranks) {
    rankCounts.set(r, (rankCounts.get(r) ?? 0) + 1)
  }

  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a)

  // Classify the hand
  if (counts[0] === 4) return 0.9  // Four of a kind
  if (counts[0] === 3 && counts[1] === 2) return 0.85 // Full house
  if (counts[0] === 3) return 0.65 // Three of a kind
  if (counts[0] === 2 && counts[1] === 2) return 0.5 // Two pair
  if (counts[0] === 2) return 0.35 // One pair

  // High card only
  const high = Math.max(...ranks)
  return (high / 14) * 0.25
}

/** Evaluates TCP hand strength (3 cards). */
export function evaluateTCPHand(
  holeCards: ReadonlyArray<{ rank: string; suit: string }>,
): number {
  if (holeCards.length < 3) return 0.2

  const ranks = holeCards.map(c => rankToNumeric(c.rank as any)).sort((a, b) => b - a)
  const suited = holeCards[0]!.suit === holeCards[1]!.suit && holeCards[1]!.suit === holeCards[2]!.suit

  const rankCounts = new Map<number, number>()
  for (const r of ranks) {
    rankCounts.set(r, (rankCounts.get(r) ?? 0) + 1)
  }
  const maxCount = Math.max(...rankCounts.values())

  // Three of a kind
  if (maxCount === 3) return 0.95

  // Straight flush
  const isStraight = (ranks[0]! - ranks[2]! === 2) ||
    (ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2) // A-2-3
  if (suited && isStraight) return 0.95

  // Straight
  if (isStraight) return 0.7

  // Flush
  if (suited) return 0.65

  // Pair
  if (maxCount === 2) return 0.5

  // Queen-high or better qualifies (dealer needs Q-high to qualify)
  const highCard = ranks[0]!
  if (highCard >= 12) return 0.35 // Queen or better

  return 0.2
}

// ── Think Time ──────────────────────────────────────────────────

/** Returns a randomised think time in ms for the given difficulty. */
export function getThinkTime(
  difficulty: 'easy' | 'medium' | 'hard',
  random: () => number = Math.random,
): number {
  const ranges: Record<string, [number, number]> = {
    easy: [1000, 2000],
    medium: [2000, 4000],
    hard: [3000, 6000],
  }
  const [min, max] = ranges[difficulty]!
  return Math.floor(min + random() * (max - min))
}

// ── Difficulty Strategies ───────────────────────────────────────

function pickAction(
  legalActions: PlayerAction[],
  preferred: PlayerAction,
): PlayerAction {
  return legalActions.includes(preferred)
    ? preferred
    : legalActions[0]!
}

function easyDecision(
  context: BotDecisionContext,
  random: () => number,
): { action: PlayerAction; amount?: number } {
  const { legalActions, currentBet, bet, minRaiseIncrement } = context
  const roll = random()

  // Easy bot: random with fold bias, calls too much, rarely raises
  if (roll < 0.35 && legalActions.includes('fold')) {
    return { action: 'fold' }
  }
  if (roll < 0.65 && legalActions.includes('call')) {
    return { action: 'call' }
  }
  if (roll < 0.70 && legalActions.includes('check')) {
    return { action: 'check' }
  }
  if (roll < 0.80 && legalActions.includes('bet')) {
    return { action: 'bet', amount: context.bigBlind }
  }
  if (roll < 0.85 && legalActions.includes('raise')) {
    return { action: 'raise', amount: currentBet + minRaiseIncrement }
  }

  // Fallback: check > call > fold
  if (legalActions.includes('check')) return { action: 'check' }
  if (legalActions.includes('call')) return { action: 'call' }
  return { action: pickAction(legalActions, 'fold') }
}

function mediumDecision(
  context: BotDecisionContext,
  handStrength: number,
  random: () => number,
): { action: PlayerAction; amount?: number } {
  const { legalActions, currentBet, bet, minRaiseIncrement, pot, stack, bigBlind } = context

  const amountToCall = currentBet - bet
  const potOdds = amountToCall > 0 ? amountToCall / (pot + amountToCall) : 0

  // Strong hand (>0.7): raise or bet
  if (handStrength > 0.7) {
    if (legalActions.includes('raise')) {
      const raiseAmount = currentBet + minRaiseIncrement * 2
      return { action: 'raise', amount: Math.min(raiseAmount, stack + bet) }
    }
    if (legalActions.includes('bet')) {
      const betAmount = Math.max(bigBlind, Math.floor(pot * 0.6))
      return { action: 'bet', amount: Math.min(betAmount, stack) }
    }
    return { action: pickAction(legalActions, 'call') }
  }

  // Decent hand (>0.45): call if pot odds are right
  if (handStrength > 0.45) {
    if (handStrength > potOdds && legalActions.includes('call')) {
      return { action: 'call' }
    }
    if (legalActions.includes('check')) return { action: 'check' }
    // Occasionally bluff
    if (random() < 0.15 && legalActions.includes('bet')) {
      return { action: 'bet', amount: Math.min(bigBlind * 2, stack) }
    }
    if (legalActions.includes('call') && amountToCall <= bigBlind * 2) {
      return { action: 'call' }
    }
    return { action: pickAction(legalActions, 'fold') }
  }

  // Weak hand (<0.45): mostly fold, occasionally check
  if (legalActions.includes('check')) return { action: 'check' }
  if (random() < 0.1 && legalActions.includes('call') && amountToCall <= bigBlind) {
    return { action: 'call' }
  }
  return { action: pickAction(legalActions, 'fold') }
}

function hardDecision(
  context: BotDecisionContext,
  handStrength: number,
  random: () => number,
): { action: PlayerAction; amount?: number } {
  const {
    legalActions, currentBet, bet, minRaiseIncrement,
    pot, stack, bigBlind, positionFromDealer, activePlayers,
  } = context

  const amountToCall = currentBet - bet
  const potOdds = amountToCall > 0 ? amountToCall / (pot + amountToCall) : 0

  // Position bonus: later position = more aggressive
  const positionMultiplier = 1 + (positionFromDealer / Math.max(activePlayers, 1)) * 0.15
  const adjustedStrength = Math.min(handStrength * positionMultiplier, 1)

  // Premium hand (>0.8): value bet / raise aggressively
  if (adjustedStrength > 0.8) {
    if (legalActions.includes('raise')) {
      const raiseSize = Math.floor(pot * 0.75) + currentBet
      return { action: 'raise', amount: Math.min(raiseSize, stack + bet) }
    }
    if (legalActions.includes('bet')) {
      const betSize = Math.max(bigBlind, Math.floor(pot * 0.7))
      return { action: 'bet', amount: Math.min(betSize, stack) }
    }
    return { action: pickAction(legalActions, 'call') }
  }

  // Strong hand (>0.6): standard aggression
  if (adjustedStrength > 0.6) {
    if (random() < 0.6 && legalActions.includes('raise')) {
      const raiseSize = currentBet + minRaiseIncrement + Math.floor(random() * minRaiseIncrement)
      return { action: 'raise', amount: Math.min(raiseSize, stack + bet) }
    }
    if (legalActions.includes('bet')) {
      const betSize = Math.max(bigBlind, Math.floor(pot * 0.5))
      return { action: 'bet', amount: Math.min(betSize, stack) }
    }
    if (legalActions.includes('call')) return { action: 'call' }
    return { action: pickAction(legalActions, 'check') }
  }

  // Marginal hand (>0.4): play cautiously, consider bluffs
  if (adjustedStrength > 0.4) {
    if (legalActions.includes('check')) return { action: 'check' }

    // Pot odds decision
    if (adjustedStrength > potOdds && legalActions.includes('call')) {
      return { action: 'call' }
    }

    // Positional bluff (late position, fewer players)
    if (random() < 0.2 && positionFromDealer >= activePlayers - 1) {
      if (legalActions.includes('bet')) {
        return { action: 'bet', amount: Math.min(bigBlind * 2, stack) }
      }
      if (legalActions.includes('raise')) {
        return { action: 'raise', amount: Math.min(currentBet + minRaiseIncrement, stack + bet) }
      }
    }

    return { action: pickAction(legalActions, 'fold') }
  }

  // Weak hand (<0.4): fold unless free
  if (legalActions.includes('check')) return { action: 'check' }

  // Occasional steal from late position
  if (random() < 0.08 && positionFromDealer >= activePlayers - 1 && legalActions.includes('bet')) {
    return { action: 'bet', amount: Math.min(bigBlind * 3, stack) }
  }

  return { action: pickAction(legalActions, 'fold') }
}

// ── Game-Specific Decision Routing ──────────────────────────────

function getHandStrength(context: BotDecisionContext): number {
  switch (context.gameType) {
    case 'holdem':
      return context.communityCards.length > 0
        ? evaluateHoldemPostFlop(context.holeCards, context.communityCards)
        : evaluateHoldemPreFlop(context.holeCards)
    case 'five_card_draw':
      return evaluateDrawHand(context.holeCards)
    case 'three_card_poker':
      return evaluateTCPHand(context.holeCards)
    default:
      // For unsupported games, use a basic high-card heuristic
      if (context.holeCards.length === 0) return 0.3
      const high = Math.max(
        ...context.holeCards.map(c => rankToNumeric(c.rank as any)),
      )
      return high / 14
  }
}

function decideForDifficulty(
  context: BotDecisionContext,
  handStrength: number,
  random: () => number,
): { action: PlayerAction; amount?: number } {
  switch (context.difficulty) {
    case 'easy':
      return easyDecision(context, random)
    case 'medium':
      return mediumDecision(context, handStrength, random)
    case 'hard':
      return hardDecision(context, handStrength, random)
  }
}

// ── Dialogue Selection ──────────────────────────────────────────

function getDialogueSituation(action: PlayerAction): keyof import('./types.js').DialogueLines {
  switch (action) {
    case 'fold': return 'onFold'
    case 'raise': return 'onRaise'
    case 'call': return 'onCall'
    case 'all_in': return 'onAllIn'
    default: return 'idle'
  }
}

// ── Main Engine ─────────────────────────────────────────────────

/** Creates a rules-based bot engine, optionally with a seeded PRNG. */
export function createRulesEngine(randomFn?: () => number): IBotEngine {
  const random = randomFn ?? Math.random

  return {
    async decide(context: BotDecisionContext): Promise<BotDecision> {
      const { legalActions, difficulty, personalityId } = context

      if (legalActions.length === 0) {
        return { action: 'fold', thinkTimeMs: 0 }
      }

      if (legalActions.length === 1) {
        return {
          action: legalActions[0]!,
          thinkTimeMs: getThinkTime(difficulty, random),
        }
      }

      const handStrength = getHandStrength(context)
      const personality = getPersonality(personalityId)

      // Apply personality modifiers
      const personalityAdjustedContext = { ...context }

      const { action, amount } = decideForDifficulty(
        personalityAdjustedContext,
        handStrength,
        random,
      )

      // Determine dialogue based on personality chattiness
      let dialogue: string | undefined
      if (random() < personality.chattiness) {
        const situation = getDialogueSituation(action)
        const line = pickDialogueLine(personality, situation, random)
        if (line) dialogue = line
      }

      return {
        action,
        amount,
        dialogue,
        thinkTimeMs: getThinkTime(difficulty, random),
      }
    },
  }
}

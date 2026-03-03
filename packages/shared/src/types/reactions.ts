/**
 * Reactions/Emotes — Cosmetic-only player expression system.
 *
 * Per v2.0 roadmap: 6 reactions, rate-limited, TV display animation.
 * Reactions have NO effect on game state or gameplay.
 */

/** Available reaction types. */
export type ReactionType = 'thumbs_up' | 'fire' | 'laugh' | 'clap' | 'wow' | 'cry'

/** All valid reaction types as a const array. */
export const REACTION_TYPES: readonly ReactionType[] = [
  'thumbs_up', 'fire', 'laugh', 'clap', 'wow', 'cry',
] as const

/** A single reaction event stored in state. */
export interface ReactionEvent {
  playerId: string
  type: ReactionType
  timestamp: number
}

/** Rate limit configuration for reactions. */
export const REACTION_RATE_LIMIT = {
  /** Maximum reactions per player within the time window. */
  maxReactions: 3,
  /** Time window in milliseconds. */
  windowMs: 10_000,
} as const

/** Maximum number of recent reactions stored in state. */
export const MAX_REACTION_QUEUE_SIZE = 10

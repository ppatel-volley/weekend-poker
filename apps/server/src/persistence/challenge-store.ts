/**
 * Challenge store — weekly challenge assignment, progress tracking, and rewards.
 *
 * 3 slots: Bronze (easy), Silver (medium), Gold (hard).
 * Assignment algorithm weights toward underplayed games.
 * Weekly rotation: reset on Monday midnight UTC.
 *
 * Redis schema:
 *   Hash: `challenges:{persistentId}` — { bronze, silver, gold } as JSON ActiveChallenge
 *   String: `challenges:{persistentId}:week` — ISO week identifier for rotation
 */

import type {
  ActiveChallenge,
  ChallengeSummary,
  ChallengeDefinition,
  PersistentPlayerStats,
  ChallengeTier,
} from '@weekend-casino/shared'
import { getChallengesByTier } from '@weekend-casino/shared'
import { getRedisClient } from './redis-client.js'

const CHALLENGES_PREFIX = 'challenges:'

/**
 * Get a Monday-aligned UTC week identifier (YYYY-WNN) for a date.
 * Weeks start on Monday 00:00 UTC, matching the product rule
 * "challenge rotation resets on Monday midnight UTC".
 */
export function getWeekIdentifier(date: Date = new Date()): string {
  // Find the Monday at or before this date (UTC)
  const dayOfWeek = date.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  // Convert to Mon=0, Tue=1, ..., Sun=6
  const daysSinceMonday = (dayOfWeek + 6) % 7
  const monday = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - daysSinceMonday,
  ))

  // Use the Monday's year for the week identifier
  const year = monday.getUTCFullYear()
  const janFirst = new Date(Date.UTC(year, 0, 1))
  const dayOfYear = Math.floor((monday.getTime() - janFirst.getTime()) / (1000 * 60 * 60 * 24))
  const weekNum = Math.floor(dayOfYear / 7) + 1

  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

/**
 * Pick a challenge from a tier, weighted toward underplayed games.
 */
function pickChallenge(
  tier: ChallengeTier,
  playerStats: PersistentPlayerStats,
  exclude: string[],
): ChallengeDefinition {
  const candidates = getChallengesByTier(tier).filter(c => !exclude.includes(c.id))

  if (candidates.length === 0) {
    // Fallback: use any from the tier
    const all = getChallengesByTier(tier)
    return all[Math.floor(Math.random() * all.length)]!
  }

  // Weight toward challenges for underplayed games
  const weighted = candidates.map(c => {
    let weight = 1
    if (c.requiredGame) {
      const gameStats = playerStats.byGameType[c.requiredGame]
      const gamesPlayed = gameStats?.gamesPlayed ?? 0
      // Higher weight for less-played games (inverse relationship)
      weight = Math.max(1, 10 - gamesPlayed)
    }
    return { challenge: c, weight }
  })

  // Weighted random selection
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0)
  let random = Math.random() * totalWeight
  for (const { challenge, weight } of weighted) {
    random -= weight
    if (random <= 0) return challenge
  }

  return weighted[0]!.challenge
}

/**
 * Assign new weekly challenges for a player.
 */
export async function assignChallenges(
  persistentId: string,
  playerStats: PersistentPlayerStats,
): Promise<ActiveChallenge[]> {
  const redis = await getRedisClient()
  const key = `${CHALLENGES_PREFIX}${persistentId}`
  const weekKey = `${key}:week`

  const currentWeek = getWeekIdentifier()
  const storedWeek = await redis.get(weekKey)

  // If already assigned this week, return existing
  if (storedWeek === currentWeek) {
    return getActiveChallenges(persistentId)
  }

  const now = new Date().toISOString()
  const assigned: string[] = []
  const challenges: ActiveChallenge[] = []

  for (const tier of ['bronze', 'silver', 'gold'] as ChallengeTier[]) {
    const def = pickChallenge(tier, playerStats, assigned)
    assigned.push(def.id)

    const active: ActiveChallenge = {
      definition: def,
      currentValue: 0,
      completed: false,
      claimed: false,
      assignedAt: now,
      completedAt: null,
    }
    challenges.push(active)
  }

  // Persist to Redis
  await redis.hset(key, {
    bronze: JSON.stringify(challenges[0]),
    silver: JSON.stringify(challenges[1]),
    gold: JSON.stringify(challenges[2]),
  })
  await redis.set(weekKey, currentWeek)

  return challenges
}

/**
 * Get active challenges for a player.
 */
export async function getActiveChallenges(persistentId: string): Promise<ActiveChallenge[]> {
  const redis = await getRedisClient()
  const key = `${CHALLENGES_PREFIX}${persistentId}`

  const data = await redis.hgetall(key)
  if (!data || Object.keys(data).length === 0) return []

  const challenges: ActiveChallenge[] = []
  for (const tier of ['bronze', 'silver', 'gold']) {
    if (data[tier]) {
      challenges.push(JSON.parse(data[tier]))
    }
  }

  return challenges
}

/**
 * Check and update challenge progress based on a game event.
 *
 * @param persistentId - Player's persistent ID
 * @param event - Game event to check against challenges
 * @returns Updated challenges (with any newly completed)
 */
export async function checkAndUpdateProgress(
  persistentId: string,
  event: ChallengeEvent,
): Promise<ActiveChallenge[]> {
  const challenges = await getActiveChallenges(persistentId)
  if (challenges.length === 0) return challenges

  let updated = false
  const redis = await getRedisClient()
  const key = `${CHALLENGES_PREFIX}${persistentId}`

  for (const challenge of challenges) {
    if (challenge.completed) continue

    const increment = evaluateChallengeProgress(challenge.definition, event, challenge.currentValue)
    if (increment > 0) {
      challenge.currentValue += increment
      if (challenge.currentValue >= challenge.definition.targetValue) {
        challenge.completed = true
        challenge.completedAt = new Date().toISOString()
      }
      updated = true
    }
  }

  if (updated) {
    const tierMap = { bronze: 0, silver: 1, gold: 2 }
    for (const challenge of challenges) {
      const idx = tierMap[challenge.definition.tier as keyof typeof tierMap]
      const tier = ['bronze', 'silver', 'gold'][idx]!
      await redis.hset(key, tier, JSON.stringify(challenge))
    }
  }

  return challenges
}

/**
 * Mark a challenge as claimed (reward collected).
 */
export async function claimChallenge(
  persistentId: string,
  challengeId: string,
): Promise<{ success: boolean; rewardChips: number; tier?: string; unlocksAchievement?: string | null }> {
  const challenges = await getActiveChallenges(persistentId)
  const challenge = challenges.find(c => c.definition.id === challengeId)

  if (!challenge || !challenge.completed || challenge.claimed) {
    return { success: false, rewardChips: 0 }
  }

  challenge.claimed = true
  const redis = await getRedisClient()
  const key = `${CHALLENGES_PREFIX}${persistentId}`

  const tierMap = { bronze: 0, silver: 1, gold: 2 }
  const idx = tierMap[challenge.definition.tier as keyof typeof tierMap]
  const tierKey = ['bronze', 'silver', 'gold'][idx]!
  await redis.hset(key, tierKey, JSON.stringify(challenge))

  return {
    success: true,
    rewardChips: challenge.definition.rewardChips,
    tier: challenge.definition.tier,
    unlocksAchievement: challenge.definition.unlocksAchievement,
  }
}

/**
 * Convert active challenges to display summaries (for VGF state projection).
 */
export function toChallengeSummaries(challenges: ActiveChallenge[]): ChallengeSummary[] {
  return challenges.map(c => ({
    challengeId: c.definition.id,
    title: c.definition.title,
    tier: c.definition.tier,
    currentValue: c.currentValue,
    targetValue: c.definition.targetValue,
    completed: c.completed,
    claimed: c.claimed,
  }))
}

// ── Game Event Types ─────────────────────────────────────────────

/** Structured game event for challenge progress evaluation. */
export interface ChallengeEvent {
  type: 'hand_complete' | 'hand_won' | 'game_night_won' | 'win_streak'
  game: string
  /** For win_streak: the current streak count. */
  value?: number
  /** Set of distinct game types played this session. */
  gamesPlayedThisSession?: string[]
}

/**
 * Evaluate how much a challenge should progress based on a game event.
 */
function evaluateChallengeProgress(def: ChallengeDefinition, event: ChallengeEvent, currentValue: number): number {
  const id = def.id

  // Play-based challenges
  if (id.includes('play_') && event.type === 'hand_complete') {
    if (def.requiredGame === null || def.requiredGame === event.game) {
      return 1
    }
  }

  // Win-based challenges
  if (id.includes('win_') && event.type === 'hand_won') {
    if (def.requiredGame === null || def.requiredGame === event.game) {
      return 1
    }
  }

  // Multi-game challenges (play different games)
  // Only increment when the unique game count EXCEEDS current progress.
  if (id === 'silver_play_3_games' && event.type === 'hand_complete') {
    const uniqueCount = event.gamesPlayedThisSession?.length ?? 0
    return uniqueCount > currentValue ? uniqueCount - currentValue : 0
  }

  // World Tour (all games) — same unique-count logic
  if (id === 'gold_play_all_games' && event.type === 'hand_complete') {
    const uniqueCount = event.gamesPlayedThisSession?.length ?? 0
    return uniqueCount > currentValue ? uniqueCount - currentValue : 0
  }

  // Win streak
  if (id === 'gold_win_streak_5' && event.type === 'win_streak') {
    return event.value ?? 0 >= def.targetValue ? def.targetValue : 0
  }

  // Game Night win
  if (id === 'gold_game_night_win' && event.type === 'game_night_won') {
    return 1
  }

  // Craps-specific
  if (id === 'silver_craps_streak' && event.type === 'hand_won' && event.game === 'craps') {
    return 1
  }

  return 0
}

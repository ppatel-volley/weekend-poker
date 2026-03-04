import { describe, it, expect, beforeEach } from 'vitest'
import { resetRedisClient } from '../persistence/redis-client.js'
import {
  assignChallenges,
  getActiveChallenges,
  checkAndUpdateProgress,
  claimChallenge,
  toChallengeSummaries,
  getWeekIdentifier,
} from '../persistence/challenge-store.js'
import { parseVoiceIntent } from '../voice/parseVoiceIntent.js'
import type { ChallengeEvent } from '../persistence/challenge-store.js'
import { createEmptyPersistentStats } from '@weekend-casino/shared'

const emptyStats = createEmptyPersistentStats()

beforeEach(() => {
  resetRedisClient()
})

describe('getWeekIdentifier', () => {
  it('returns YYYY-WNN format', () => {
    const week = getWeekIdentifier(new Date('2026-03-03T12:00:00Z'))
    expect(week).toMatch(/^\d{4}-W\d{2}$/)
  })

  it('returns consistent value for same Mon-Sun week', () => {
    const mon = getWeekIdentifier(new Date('2026-03-02T00:00:00Z'))
    const tue = getWeekIdentifier(new Date('2026-03-03T00:00:00Z'))
    const sun = getWeekIdentifier(new Date('2026-03-08T23:59:59Z'))
    expect(mon).toBe(tue)
    expect(tue).toBe(sun)
  })

  it('changes at Monday boundary', () => {
    const sun = getWeekIdentifier(new Date('2026-03-08T23:59:59Z'))
    const nextMon = getWeekIdentifier(new Date('2026-03-09T00:00:00Z'))
    expect(sun).not.toBe(nextMon)
  })

  it('handles year boundary (Dec 31 to Jan 1)', () => {
    // Dec 29 2025 is a Monday, Jan 4 2026 is a Sunday of same week
    const dec29 = getWeekIdentifier(new Date('2025-12-29T00:00:00Z'))
    const jan4 = getWeekIdentifier(new Date('2026-01-04T00:00:00Z'))
    expect(dec29).toBe(jan4) // Same week spans year boundary

    const jan5 = getWeekIdentifier(new Date('2026-01-05T00:00:00Z')) // Next Monday
    expect(jan5).not.toBe(dec29)
  })
})

describe('assignChallenges', () => {
  it('creates 3 challenges (one per tier)', async () => {
    const challenges = await assignChallenges('player-1', emptyStats)

    expect(challenges).toHaveLength(3)
    const tiers = challenges.map(c => c.definition.tier).sort()
    expect(tiers).toEqual(['bronze', 'gold', 'silver'])
  })

  it('assigns challenges with correct initial state', async () => {
    const challenges = await assignChallenges('player-2', emptyStats)

    for (const challenge of challenges) {
      expect(challenge.currentValue).toBe(0)
      expect(challenge.completed).toBe(false)
      expect(challenge.claimed).toBe(false)
      expect(challenge.assignedAt).toBeTruthy()
      expect(challenge.completedAt).toBeNull()
    }
  })

  it('returns same challenges if called again in same week', async () => {
    const first = await assignChallenges('player-3', emptyStats)
    const second = await assignChallenges('player-3', emptyStats)

    expect(first.map(c => c.definition.id)).toEqual(second.map(c => c.definition.id))
  })
})

describe('getActiveChallenges', () => {
  it('returns empty array for player with no challenges', async () => {
    const challenges = await getActiveChallenges('nobody')
    expect(challenges).toEqual([])
  })

  it('returns assigned challenges', async () => {
    await assignChallenges('player-4', emptyStats)
    const challenges = await getActiveChallenges('player-4')
    expect(challenges).toHaveLength(3)
  })
})

describe('checkAndUpdateProgress', () => {
  it('increments progress on matching hand_complete event', async () => {
    await assignChallenges('player-5', emptyStats)
    const before = await getActiveChallenges('player-5')
    const bronzePlay = before.find(c => c.definition.id.includes('play_'))

    if (!bronzePlay) {
      // If no play-based challenge was assigned, skip gracefully
      return
    }

    const event: ChallengeEvent = {
      type: 'hand_complete',
      game: bronzePlay.definition.requiredGame ?? 'holdem',
    }

    const updated = await checkAndUpdateProgress('player-5', event)
    const matching = updated.find(c => c.definition.id === bronzePlay.definition.id)
    expect(matching!.currentValue).toBeGreaterThanOrEqual(1)
  })

  it('marks challenge complete when target reached', async () => {
    await assignChallenges('player-6', emptyStats)
    const before = await getActiveChallenges('player-6')
    const bronzePlay = before.find(c => c.definition.id.includes('play_'))

    if (!bronzePlay) return

    const game = bronzePlay.definition.requiredGame ?? 'holdem'
    const event: ChallengeEvent = { type: 'hand_complete', game }

    // Fire enough events to complete the challenge
    let challenges = before
    for (let i = 0; i < bronzePlay.definition.targetValue + 1; i++) {
      challenges = await checkAndUpdateProgress('player-6', event)
    }

    const matching = challenges.find(c => c.definition.id === bronzePlay.definition.id)
    expect(matching!.completed).toBe(true)
    expect(matching!.completedAt).toBeTruthy()
  })

  it('returns unchanged challenges for non-matching event', async () => {
    await assignChallenges('player-7', emptyStats)

    const event: ChallengeEvent = { type: 'game_night_won', game: 'holdem' }
    const updated = await checkAndUpdateProgress('player-7', event)

    // Only gold_game_night_win would match, check others are unchanged
    const noGameNight = updated.filter(c => c.definition.id !== 'gold_game_night_win')
    for (const c of noGameNight) {
      expect(c.currentValue).toBe(0)
    }
  })

  it('returns empty for player with no challenges', async () => {
    const event: ChallengeEvent = { type: 'hand_complete', game: 'holdem' }
    const result = await checkAndUpdateProgress('ghost-player', event)
    expect(result).toEqual([])
  })
})

describe('claimChallenge', () => {
  it('succeeds on completed unclaimed challenge', async () => {
    await assignChallenges('player-8', emptyStats)
    const before = await getActiveChallenges('player-8')
    const bronzePlay = before.find(c => c.definition.id.includes('play_'))

    if (!bronzePlay) return

    const game = bronzePlay.definition.requiredGame ?? 'holdem'
    const event: ChallengeEvent = { type: 'hand_complete', game }

    // Complete the challenge
    for (let i = 0; i < bronzePlay.definition.targetValue + 1; i++) {
      await checkAndUpdateProgress('player-8', event)
    }

    const result = await claimChallenge('player-8', bronzePlay.definition.id)
    expect(result.success).toBe(true)
    expect(result.rewardChips).toBe(bronzePlay.definition.rewardChips)
  })

  it('fails on uncompleted challenge', async () => {
    await assignChallenges('player-9', emptyStats)
    const before = await getActiveChallenges('player-9')
    const challenge = before[0]!

    const result = await claimChallenge('player-9', challenge.definition.id)
    expect(result.success).toBe(false)
    expect(result.rewardChips).toBe(0)
  })

  it('fails on already-claimed challenge', async () => {
    await assignChallenges('player-10', emptyStats)
    const before = await getActiveChallenges('player-10')
    const bronzePlay = before.find(c => c.definition.id.includes('play_'))

    if (!bronzePlay) return

    const game = bronzePlay.definition.requiredGame ?? 'holdem'
    const event: ChallengeEvent = { type: 'hand_complete', game }

    for (let i = 0; i < bronzePlay.definition.targetValue + 1; i++) {
      await checkAndUpdateProgress('player-10', event)
    }

    // Claim once
    await claimChallenge('player-10', bronzePlay.definition.id)
    // Attempt to claim again
    const result = await claimChallenge('player-10', bronzePlay.definition.id)
    expect(result.success).toBe(false)
  })

  it('fails for non-existent challenge ID', async () => {
    await assignChallenges('player-11', emptyStats)
    const result = await claimChallenge('player-11', 'nonexistent_challenge')
    expect(result.success).toBe(false)
    expect(result.rewardChips).toBe(0)
  })
})

describe('toChallengeSummaries', () => {
  it('maps active challenges to display summaries', async () => {
    await assignChallenges('player-12', emptyStats)
    const challenges = await getActiveChallenges('player-12')
    const summaries = toChallengeSummaries(challenges)

    expect(summaries).toHaveLength(3)
    for (const s of summaries) {
      expect(s.challengeId).toBeTruthy()
      expect(s.title).toBeTruthy()
      expect(['bronze', 'silver', 'gold']).toContain(s.tier)
      expect(s.currentValue).toBe(0)
      expect(s.targetValue).toBeGreaterThan(0)
      expect(s.completed).toBe(false)
      expect(s.claimed).toBe(false)
    }
  })

  it('returns empty array for empty input', () => {
    expect(toChallengeSummaries([])).toEqual([])
  })
})

describe('multi-game challenge regression', () => {
  it('silver_play_3_games requires unique games, not total hands', async () => {
    await assignChallenges('player-mg-1', emptyStats)
    const challenges = await getActiveChallenges('player-mg-1')
    const multiGame = challenges.find(c => c.definition.id === 'silver_play_3_games')
    if (!multiGame) return // may not be assigned this run (random selection)

    // Playing 10 hands of the SAME game should NOT complete the challenge
    for (let i = 0; i < 10; i++) {
      await checkAndUpdateProgress('player-mg-1', {
        type: 'hand_complete',
        game: 'holdem',
        gamesPlayedThisSession: ['holdem'],
      })
    }

    const after = await getActiveChallenges('player-mg-1')
    const updated = after.find(c => c.definition.id === 'silver_play_3_games')!
    // Should be 1 unique game, not 10
    expect(updated.currentValue).toBe(1)
    expect(updated.completed).toBe(false)
  })

  it('silver_play_3_games increments on unique game count increase', async () => {
    await assignChallenges('player-mg-2', emptyStats)
    const challenges = await getActiveChallenges('player-mg-2')
    const multiGame = challenges.find(c => c.definition.id === 'silver_play_3_games')
    if (!multiGame) return

    // Play holdem (1 unique game)
    await checkAndUpdateProgress('player-mg-2', {
      type: 'hand_complete',
      game: 'holdem',
      gamesPlayedThisSession: ['holdem'],
    })

    // Play blackjack (2 unique games)
    await checkAndUpdateProgress('player-mg-2', {
      type: 'hand_complete',
      game: 'blackjack_classic',
      gamesPlayedThisSession: ['holdem', 'blackjack_classic'],
    })

    // Play roulette (3 unique games)
    await checkAndUpdateProgress('player-mg-2', {
      type: 'hand_complete',
      game: 'roulette',
      gamesPlayedThisSession: ['holdem', 'blackjack_classic', 'roulette'],
    })

    const after = await getActiveChallenges('player-mg-2')
    const updated = after.find(c => c.definition.id === 'silver_play_3_games')!
    expect(updated.currentValue).toBe(3)
    expect(updated.completed).toBe(true)
  })
})

describe('roulette dozen voice entity regression', () => {
  it('dozen entities store index not wager amount', () => {
    // "first dozen" should store amount=1 (dozen index), not a wager
    const result = parseVoiceIntent('first dozen')
    expect(result.intent).toBe('roulette_dozen')
    // amount is the dozen INDEX (1, 2, or 3) — routing must use defaultBet for wager
    expect(result.entities.amount).toBe(1)
    expect(result.entities.amount).toBeLessThanOrEqual(3)
  })
})

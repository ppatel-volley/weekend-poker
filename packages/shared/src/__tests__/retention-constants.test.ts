import { describe, it, expect } from 'vitest'
import {
  DAILY_BONUS_SCHEDULE,
  DAILY_BONUS_STREAK_MULTIPLIER,
  DAILY_BONUS_STREAK_WINDOW_HOURS,
  DAILY_BONUS_XP_REWARD,
  CHALLENGE_DEFINITIONS,
  CHALLENGE_XP_REWARDS,
  CHALLENGE_SLOT_COUNT,
  getChallengesByTier,
  COSMETIC_DEFINITIONS,
  DEFAULT_EQUIPPED_LOADOUT,
  getCosmeticsByCategory,
  getCosmeticForAchievement,
} from '@weekend-casino/shared'

// ── Daily Bonus Schedule ────────────────────────────────────────

describe('DAILY_BONUS_SCHEDULE', () => {
  it('should have exactly 7 entries (7-day cycle)', () => {
    expect(DAILY_BONUS_SCHEDULE).toHaveLength(7)
  })

  it('should have all positive values', () => {
    for (const amount of DAILY_BONUS_SCHEDULE) {
      expect(amount).toBeGreaterThan(0)
    }
  })

  it('should be monotonically increasing (bigger rewards for later days)', () => {
    for (let i = 1; i < DAILY_BONUS_SCHEDULE.length; i++) {
      expect(DAILY_BONUS_SCHEDULE[i]).toBeGreaterThan(DAILY_BONUS_SCHEDULE[i - 1]!)
    }
  })

  it('should have expected day 1 and day 7 values', () => {
    expect(DAILY_BONUS_SCHEDULE[0]).toBe(500)
    expect(DAILY_BONUS_SCHEDULE[6]).toBe(5_000)
  })
})

describe('Daily bonus constants', () => {
  it('should have a streak multiplier of 1.5', () => {
    expect(DAILY_BONUS_STREAK_MULTIPLIER).toBe(1.5)
  })

  it('should have a 36-hour streak window', () => {
    expect(DAILY_BONUS_STREAK_WINDOW_HOURS).toBe(36)
  })

  it('should award 50 XP per daily bonus claim', () => {
    expect(DAILY_BONUS_XP_REWARD).toBe(50)
  })
})

// ── Challenge Definitions ───────────────────────────────────────

describe('CHALLENGE_DEFINITIONS', () => {
  it('should have at least 5 bronze challenges', () => {
    const bronze = CHALLENGE_DEFINITIONS.filter(c => c.tier === 'bronze')
    expect(bronze.length).toBeGreaterThanOrEqual(5)
  })

  it('should have at least 5 silver challenges', () => {
    const silver = CHALLENGE_DEFINITIONS.filter(c => c.tier === 'silver')
    expect(silver.length).toBeGreaterThanOrEqual(5)
  })

  it('should have at least 4 gold challenges', () => {
    const gold = CHALLENGE_DEFINITIONS.filter(c => c.tier === 'gold')
    expect(gold.length).toBeGreaterThanOrEqual(4)
  })

  it('each challenge should have all required fields', () => {
    for (const def of CHALLENGE_DEFINITIONS) {
      expect(def.id).toBeTruthy()
      expect(def.title).toBeTruthy()
      expect(def.description).toBeTruthy()
      expect(['bronze', 'silver', 'gold']).toContain(def.tier)
      expect(def.targetValue).toBeGreaterThan(0)
      expect(def.rewardChips).toBeGreaterThan(0)
      // requiredGame can be null — just verify it is defined
      expect('requiredGame' in def).toBe(true)
      expect('unlocksAchievement' in def).toBe(true)
    }
  })

  it('should have unique IDs', () => {
    const ids = CHALLENGE_DEFINITIONS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('CHALLENGE_XP_REWARDS', () => {
  it('should have XP for all three tiers', () => {
    expect(CHALLENGE_XP_REWARDS['bronze']).toBeGreaterThan(0)
    expect(CHALLENGE_XP_REWARDS['silver']).toBeGreaterThan(0)
    expect(CHALLENGE_XP_REWARDS['gold']).toBeGreaterThan(0)
  })

  it('should have increasing rewards by tier', () => {
    expect(CHALLENGE_XP_REWARDS['silver']!).toBeGreaterThan(CHALLENGE_XP_REWARDS['bronze']!)
    expect(CHALLENGE_XP_REWARDS['gold']!).toBeGreaterThan(CHALLENGE_XP_REWARDS['silver']!)
  })
})

describe('CHALLENGE_SLOT_COUNT', () => {
  it('should be 3 (one per tier)', () => {
    expect(CHALLENGE_SLOT_COUNT).toBe(3)
  })
})

describe('getChallengesByTier', () => {
  it('should return only bronze challenges for bronze tier', () => {
    const bronze = getChallengesByTier('bronze')
    expect(bronze.length).toBeGreaterThan(0)
    for (const c of bronze) {
      expect(c.tier).toBe('bronze')
    }
  })

  it('should return only silver challenges for silver tier', () => {
    const silver = getChallengesByTier('silver')
    expect(silver.length).toBeGreaterThan(0)
    for (const c of silver) {
      expect(c.tier).toBe('silver')
    }
  })

  it('should return only gold challenges for gold tier', () => {
    const gold = getChallengesByTier('gold')
    expect(gold.length).toBeGreaterThan(0)
    for (const c of gold) {
      expect(c.tier).toBe('gold')
    }
  })

  it('should return empty array for non-existent tier', () => {
    const none = getChallengesByTier('platinum')
    expect(none).toHaveLength(0)
  })
})

// ── Cosmetic Definitions ────────────────────────────────────────

describe('COSMETIC_DEFINITIONS', () => {
  it('should have exactly 20 cosmetics', () => {
    expect(COSMETIC_DEFINITIONS).toHaveLength(20)
  })

  it('should have 6 card backs', () => {
    const cardBacks = COSMETIC_DEFINITIONS.filter(c => c.category === 'card_back')
    expect(cardBacks).toHaveLength(6)
  })

  it('should have 6 table felts', () => {
    const felts = COSMETIC_DEFINITIONS.filter(c => c.category === 'table_felt')
    expect(felts).toHaveLength(6)
  })

  it('should have 8 avatar frames', () => {
    const frames = COSMETIC_DEFINITIONS.filter(c => c.category === 'avatar_frame')
    expect(frames).toHaveLength(8)
  })

  it('each cosmetic should have all required fields', () => {
    for (const cos of COSMETIC_DEFINITIONS) {
      expect(cos.id).toBeTruthy()
      expect(cos.name).toBeTruthy()
      expect(['card_back', 'table_felt', 'avatar_frame']).toContain(cos.category)
      expect(cos.unlockedBy).toBeTruthy()
      expect(cos.previewKey).toBeTruthy()
    }
  })

  it('should have unique IDs', () => {
    const ids = COSMETIC_DEFINITIONS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('DEFAULT_EQUIPPED_LOADOUT', () => {
  it('should have all null fields', () => {
    expect(DEFAULT_EQUIPPED_LOADOUT.cardBack).toBeNull()
    expect(DEFAULT_EQUIPPED_LOADOUT.tableFelt).toBeNull()
    expect(DEFAULT_EQUIPPED_LOADOUT.avatarFrame).toBeNull()
  })
})

describe('getCosmeticsByCategory', () => {
  it('should return 6 card backs', () => {
    expect(getCosmeticsByCategory('card_back')).toHaveLength(6)
  })

  it('should return 6 table felts', () => {
    expect(getCosmeticsByCategory('table_felt')).toHaveLength(6)
  })

  it('should return 8 avatar frames', () => {
    expect(getCosmeticsByCategory('avatar_frame')).toHaveLength(8)
  })

  it('should return empty array for unknown category', () => {
    expect(getCosmeticsByCategory('unknown')).toHaveLength(0)
  })

  it('should only return items matching the category', () => {
    const felts = getCosmeticsByCategory('table_felt')
    for (const f of felts) {
      expect(f.category).toBe('table_felt')
    }
  })
})

describe('getCosmeticForAchievement', () => {
  it('should find the cosmetic for first_hand_holdem', () => {
    const cos = getCosmeticForAchievement('first_hand_holdem')
    expect(cos).toBeDefined()
    expect(cos!.id).toBe('cb_classic_red')
  })

  it('should find the cosmetic for first_hand_any', () => {
    const cos = getCosmeticForAchievement('first_hand_any')
    expect(cos).toBeDefined()
    expect(cos!.id).toBe('af_bronze')
  })

  it('should return undefined for achievement with no cosmetic', () => {
    const cos = getCosmeticForAchievement('non_existent_achievement')
    expect(cos).toBeUndefined()
  })

  it('should find cosmetics for rare achievements', () => {
    expect(getCosmeticForAchievement('royal_flush')).toBeDefined()
    expect(getCosmeticForAchievement('natural_blackjack')).toBeDefined()
    expect(getCosmeticForAchievement('straight_up_roulette')).toBeDefined()
  })
})

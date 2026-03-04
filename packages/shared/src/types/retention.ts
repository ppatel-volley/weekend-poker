/**
 * Retention types — Player identity, profiles, daily bonuses, challenges,
 * achievements (persistent), and cosmetics.
 *
 * v2.2: "Come Back Tomorrow" — persistence layer for player retention.
 *
 * Design decisions:
 *   - Profile data lives in side-channel (NOT in VGF state) — keeps state lean
 *   - Challenge progress source of truth is Redis; VGF state carries display-only summary
 *   - Identity supports dev-mode device token AND production Platform SDK identity
 *   - Achievements extend existing GameNightAchievementType (backward compat)
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Identity
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Source of the player's identity. */
export type IdentitySource =
  | 'device_token'        // Dev-mode: localStorage UUID
  | 'platform_anonymous'  // Production: Platform SDK useAnonymousId()
  | 'platform_account'    // Production: Platform SDK useAccount() (authenticated)

/** Persistent player identity across sessions. */
export interface PlayerIdentity {
  /** Device token (dev-mode UUID or Platform SDK anonymousId). */
  deviceToken: string
  /** Resolved persistent ID used as Redis key. */
  persistentId: string
  /** Display name (editable). */
  displayName: string
  /** Last login timestamp (ISO 8601). */
  lastLoginAt: string
  /** How the identity was resolved. */
  identitySource: IdentitySource
  /** First seen timestamp (ISO 8601). */
  createdAt: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Player Stats (Persistent)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Per-game-type win/loss stats. */
export interface GameTypeStats {
  gamesPlayed: number
  handsWon: number
  handsPlayed: number
  totalChipsWon: number
  totalChipsLost: number
  bestStreak: number
  currentStreak: number
}

/** Persistent player stats across all sessions. */
export interface PersistentPlayerStats {
  totalGamesPlayed: number
  totalHandsPlayed: number
  totalHandsWon: number
  totalChipsWon: number
  totalChipsLost: number
  /** Per-game-type breakdown. */
  byGameType: Partial<Record<string, GameTypeStats>>
  /** Longest overall win streak. */
  bestWinStreak: number
  /** Current win streak. */
  currentWinStreak: number
  /** Total sessions played. */
  totalSessions: number
  /** Game Night wins. */
  gameNightWins: number
  /** Challenges completed. */
  challengesCompleted: number
}

/** Factory for empty persistent stats. */
export function createEmptyPersistentStats(): PersistentPlayerStats {
  return {
    totalGamesPlayed: 0,
    totalHandsPlayed: 0,
    totalHandsWon: 0,
    totalChipsWon: 0,
    totalChipsLost: 0,
    byGameType: {},
    bestWinStreak: 0,
    currentWinStreak: 0,
    totalSessions: 0,
    gameNightWins: 0,
    challengesCompleted: 0,
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Daily Bonus
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Daily bonus state for a player. */
export interface DailyBonusState {
  /** Current consecutive day streak. */
  currentStreak: number
  /** ISO date of the last claim (YYYY-MM-DD). */
  lastClaimDate: string | null
  /** Total chips claimed from daily bonuses. */
  totalClaimed: number
}

/** Result of a daily bonus calculation. */
export interface DailyBonusResult {
  /** Whether the player is eligible for a bonus. */
  eligible: boolean
  /** Chip amount awarded (0 if not eligible). */
  amount: number
  /** The day in the streak (1-7+). */
  streakDay: number
  /** Whether a streak multiplier was applied (day 8+). */
  multiplierApplied: boolean
  /** The new streak count after claiming. */
  newStreak: number
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Challenges
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Challenge difficulty tier. */
export type ChallengeTier = 'bronze' | 'silver' | 'gold'

/** Static challenge definition. */
export interface ChallengeDefinition {
  id: string
  title: string
  description: string
  tier: ChallengeTier
  /** Target value to reach (e.g., win 5 hands). */
  targetValue: number
  /** Reward in chips. */
  rewardChips: number
  /** Optional: specific game required (null = any game). */
  requiredGame: string | null
  /** Achievement unlocked on completion (if any). */
  unlocksAchievement: string | null
}

/** Active challenge with progress for a player. */
export interface ActiveChallenge {
  definition: ChallengeDefinition
  /** Current progress toward targetValue. */
  currentValue: number
  /** Whether the challenge is completed. */
  completed: boolean
  /** Whether the reward has been claimed. */
  claimed: boolean
  /** When this challenge was assigned (ISO 8601). */
  assignedAt: string
  /** When the challenge was completed (ISO 8601 or null). */
  completedAt: string | null
}

/** Challenge summary projected into VGF state (display-only). */
export interface ChallengeSummary {
  challengeId: string
  title: string
  tier: ChallengeTier
  currentValue: number
  targetValue: number
  completed: boolean
  claimed: boolean
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Persistent Achievements (extends Game Night achievements)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Achievement category. */
export type PersistentAchievementCategory =
  | 'getting_started'
  | 'mastery'
  | 'milestone'
  | 'rare'

/** Static achievement definition. */
export interface AchievementDefinition {
  id: string
  title: string
  description: string
  category: PersistentAchievementCategory
  /** Icon key for display. */
  icon: string
  /** Cosmetic unlocked by this achievement (null if none). */
  unlocksCosmetic: string | null
}

/** A recorded earned achievement. */
export interface EarnedAchievement {
  achievementId: string
  /** When the achievement was earned (ISO 8601). */
  earnedAt: string
  /** Which game was being played when earned. */
  game: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cosmetics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Cosmetic item category. */
export type CosmeticCategory = 'card_back' | 'table_felt' | 'avatar_frame'

/** Static cosmetic definition. */
export interface CosmeticDefinition {
  id: string
  name: string
  category: CosmeticCategory
  /** Achievement that unlocks this cosmetic. */
  unlockedBy: string
  /** Preview image key for display. */
  previewKey: string
}

/** Equipped cosmetic loadout (stored in Redis, projected onto CasinoPlayer). */
export interface EquippedLoadout {
  cardBack: string | null
  tableFelt: string | null
  avatarFrame: string | null
}

/** Owned cosmetics for a player. */
export interface OwnedCosmetics {
  /** Set of cosmetic IDs the player owns. */
  ownedIds: string[]
  /** Currently equipped loadout. */
  equipped: EquippedLoadout
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Player Profile (Full — served via REST, NOT VGF state)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** XP thresholds for player levels. */
export const PLAYER_LEVEL_XP_THRESHOLDS = [
  0,      // Level 1
  500,    // Level 2
  1_500,  // Level 3
  3_000,  // Level 4
  5_000,  // Level 5
  8_000,  // Level 6
  12_000, // Level 7
  17_000, // Level 8
  23_000, // Level 9
  30_000, // Level 10
] as const

/** Full player profile (REST API response). */
export interface PlayerProfile {
  identity: PlayerIdentity
  stats: PersistentPlayerStats
  level: number
  xp: number
  dailyBonus: DailyBonusState
  achievements: EarnedAchievement[]
  cosmetics: OwnedCosmetics
}

/** Calculate player level from XP. */
export function calculatePlayerLevel(xp: number): number {
  for (let i = PLAYER_LEVEL_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= PLAYER_LEVEL_XP_THRESHOLDS[i]!) {
      return i + 1
    }
  }
  return 1
}

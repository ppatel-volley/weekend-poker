// ────────────────────────────────────────────────────────────────────
// Re-export all casino + poker + shared types from ./types
// ────────────────────────────────────────────────────────────────────
export * from './types/index.js'
export type * from './types/index.js'
export {
  MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
  STARTING_STACK,
  ACTION_TIMEOUT_MS,
  TIME_WARNING_MS,
  DISCONNECT_TIMEOUT_MS,
  INTER_HAND_DELAY_MS,
  DEALING_ANIMATION_MS,
  SIT_OUT_MAX_HANDS,
  BLIND_LEVELS,
  DEFAULT_BLIND_LEVEL,
  DEALER_CHARACTERS,
  TCP_MIN_ANTE,
  TCP_MAX_ANTE,
  TCP_MAX_PAIR_PLUS,
  TCP_BET_TIMEOUT_MS,
  TCP_DECISION_TIMEOUT_MS,
  BJ_MIN_BET,
  BJ_MAX_BET,
  BJ_NUMBER_OF_DECKS,
  BJ_RESHUFFLE_THRESHOLD,
  BJ_BLACKJACK_PAYS_RATIO,
  BJ_INSURANCE_PAYS_RATIO,
  BJ_DEALER_HITS_SOFT_17,
  BJ_MAX_SPLITS,
  BJ_BET_TIMEOUT_MS,
  BJ_ACTION_TIMEOUT_MS,
  BJ_INSURANCE_TIMEOUT_MS,
  ROULETTE_MIN_BET,
  ROULETTE_MAX_INSIDE_BET,
  ROULETTE_MAX_OUTSIDE_BET,
  ROULETTE_MAX_TOTAL_BET,
  ROULETTE_BET_TIMEOUT_MS,
  ROULETTE_SPIN_ANIMATION_TARGET_MS,
  ROULETTE_SPIN_HARD_TIMEOUT_MS,
  CRAPS_MIN_BET,
  CRAPS_MAX_BET,
  CRAPS_MAX_ODDS_MULTIPLIER,
  CRAPS_BET_TIMEOUT_MS,
  CRAPS_ROLL_AUTO_TIMEOUT_MS,
  CRAPS_PLACE_PAYOUTS,
  CRAPS_TRUE_ODDS,
  CRAPS_DONT_ODDS,
  CRAPS_FIELD_NUMBERS,
  CRAPS_FIELD_DOUBLE,
  CRAPS_FIELD_TRIPLE,
  CRAPS_PLACE_NUMBERS,
  DEFAULT_CRAPS_CONFIG,
} from './constants/poker.js'
export type { DealerCharacter } from './constants/poker.js'
export { PHASE_LABELS, getPhaseLabel } from './constants/phase-labels.js'
export {
  GN_RANK_POINTS,
  GN_MAX_MARGIN_BONUS,
  GN_LEADERBOARD_DISPLAY_MS,
  GN_CHAMPION_DISPLAY_MS,
  GN_MIN_GAMES,
  GN_MAX_GAMES,
  GN_DEFAULT_ROUNDS_PER_GAME,
  GN_ACHIEVEMENT_BONUSES,
  GN_ACHIEVEMENT_TYPES,
  GN_THEMES,
  GN_DEFAULT_THEME,
} from './constants/game-night.js'

// ── v2.2 Retention Constants ──────────────────────────────────────
export {
  DAILY_BONUS_SCHEDULE,
  DAILY_BONUS_STREAK_MULTIPLIER,
  DAILY_BONUS_STREAK_WINDOW_HOURS,
  DAILY_BONUS_XP_REWARD,
} from './constants/daily-bonus.js'
export {
  CHALLENGE_DEFINITIONS,
  CHALLENGE_XP_REWARDS,
  CHALLENGE_SLOT_COUNT,
  getChallengesByTier,
} from './constants/challenges.js'
export {
  COSMETIC_DEFINITIONS,
  DEFAULT_EQUIPPED_LOADOUT,
  getCosmeticsByCategory,
  getCosmeticForAchievement,
} from './constants/cosmetics.js'

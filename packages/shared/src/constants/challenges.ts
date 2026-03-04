/**
 * Challenge definitions — weekly rotating challenges across 3 tiers.
 *
 * v2.2: "Come Back Tomorrow" retention feature.
 *
 * 3 slots: Bronze (easy), Silver (medium), Gold (hard).
 * Assignment algorithm weights toward underplayed games.
 * Weekly rotation: reset on Monday midnight UTC.
 */

import type { ChallengeDefinition } from '../types/retention.js'

/** XP reward per challenge tier. */
export const CHALLENGE_XP_REWARDS: Record<string, number> = {
  bronze: 100,
  silver: 250,
  gold: 500,
}

/** Number of challenge slots. */
export const CHALLENGE_SLOT_COUNT = 3

/** Challenge definitions — static pool. */
export const CHALLENGE_DEFINITIONS: ChallengeDefinition[] = [
  // ── Bronze (Easy) ──────────────────────────────────────────────
  {
    id: 'bronze_play_5_hands',
    title: 'Warm Up',
    description: 'Play 5 hands of any game',
    tier: 'bronze',
    targetValue: 5,
    rewardChips: 1_000,
    requiredGame: null,
    unlocksAchievement: null,
  },
  {
    id: 'bronze_win_3_hands',
    title: 'Lucky Streak',
    description: 'Win 3 hands of any game',
    tier: 'bronze',
    targetValue: 3,
    rewardChips: 1_500,
    requiredGame: null,
    unlocksAchievement: null,
  },
  {
    id: 'bronze_play_holdem',
    title: 'Texas Toast',
    description: "Play 3 hands of Hold'em",
    tier: 'bronze',
    targetValue: 3,
    rewardChips: 1_000,
    requiredGame: 'holdem',
    unlocksAchievement: null,
  },
  {
    id: 'bronze_play_blackjack',
    title: 'Hit Me',
    description: 'Play 3 hands of Blackjack',
    tier: 'bronze',
    targetValue: 3,
    rewardChips: 1_000,
    requiredGame: 'blackjack_classic',
    unlocksAchievement: null,
  },
  {
    id: 'bronze_play_roulette',
    title: 'Spin Doctor',
    description: 'Play 3 rounds of Roulette',
    tier: 'bronze',
    targetValue: 3,
    rewardChips: 1_000,
    requiredGame: 'roulette',
    unlocksAchievement: null,
  },

  // ── Silver (Medium) ────────────────────────────────────────────
  {
    id: 'silver_win_10_hands',
    title: 'On a Roll',
    description: 'Win 10 hands of any game',
    tier: 'silver',
    targetValue: 10,
    rewardChips: 3_000,
    requiredGame: null,
    unlocksAchievement: null,
  },
  {
    id: 'silver_play_3_games',
    title: 'Casino Crawler',
    description: 'Play 3 different game types in one session',
    tier: 'silver',
    targetValue: 3,
    rewardChips: 2_500,
    requiredGame: null,
    unlocksAchievement: null,
  },
  {
    id: 'silver_win_5_holdem',
    title: 'Poker Pro',
    description: "Win 5 hands of Hold'em",
    tier: 'silver',
    targetValue: 5,
    rewardChips: 3_000,
    requiredGame: 'holdem',
    unlocksAchievement: null,
  },
  {
    id: 'silver_win_5_blackjack',
    title: 'Card Counter',
    description: 'Win 5 hands of Blackjack',
    tier: 'silver',
    targetValue: 5,
    rewardChips: 3_000,
    requiredGame: 'blackjack_classic',
    unlocksAchievement: null,
  },
  {
    id: 'silver_craps_streak',
    title: 'Hot Shooter',
    description: 'Win 5 pass line bets in Craps',
    tier: 'silver',
    targetValue: 5,
    rewardChips: 3_000,
    requiredGame: 'craps',
    unlocksAchievement: null,
  },
  {
    id: 'silver_play_draw',
    title: 'Five Alive',
    description: 'Play 5 hands of Five Card Draw',
    tier: 'silver',
    targetValue: 5,
    rewardChips: 2_000,
    requiredGame: 'five_card_draw',
    unlocksAchievement: null,
  },

  // ── Gold (Hard) ────────────────────────────────────────────────
  {
    id: 'gold_win_20_hands',
    title: 'High Roller',
    description: 'Win 20 hands of any game',
    tier: 'gold',
    targetValue: 20,
    rewardChips: 7_500,
    requiredGame: null,
    unlocksAchievement: 'challenge_champion',
  },
  {
    id: 'gold_play_all_games',
    title: 'World Tour',
    description: 'Play at least 1 hand of every game type',
    tier: 'gold',
    targetValue: 7,
    rewardChips: 10_000,
    requiredGame: null,
    unlocksAchievement: 'world_tourist',
  },
  {
    id: 'gold_win_streak_5',
    title: 'Unstoppable',
    description: 'Win 5 hands in a row',
    tier: 'gold',
    targetValue: 5,
    rewardChips: 5_000,
    requiredGame: null,
    unlocksAchievement: null,
  },
  {
    id: 'gold_game_night_win',
    title: 'Night Owl',
    description: 'Win a Game Night session',
    tier: 'gold',
    targetValue: 1,
    rewardChips: 10_000,
    requiredGame: null,
    unlocksAchievement: 'game_night_champion',
  },
  {
    id: 'gold_tcp_master',
    title: 'Three Card Master',
    description: 'Win 10 hands of Three Card Poker',
    tier: 'gold',
    targetValue: 10,
    rewardChips: 5_000,
    requiredGame: 'three_card_poker',
    unlocksAchievement: null,
  },
]

/** Get challenges by tier. */
export function getChallengesByTier(tier: string): ChallengeDefinition[] {
  return CHALLENGE_DEFINITIONS.filter(c => c.tier === tier)
}

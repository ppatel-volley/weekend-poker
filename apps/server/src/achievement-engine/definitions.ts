/**
 * Persistent achievement definitions — ~25 achievements across 4 categories.
 *
 * v2.2: Expands the Game Night MVP set (7 types) into a full persistent
 * achievement system. Game Night achievements remain unchanged (backward compat).
 *
 * Categories:
 *   - getting_started (7): First hand of each game type
 *   - mastery (10): Win streaks, win counts per game
 *   - milestone (5): Total hands, total chips, all-games, challenge completions
 *   - rare (3): Royal flush, natural BJ + dealer bust, straight-up roulette hit
 */

import type { AchievementDefinition, PersistentAchievementCategory } from '@weekend-casino/shared'

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // ── Getting Started (7) ────────────────────────────────────────
  {
    id: 'first_hand_any',
    title: 'First Timer',
    description: 'Play your first hand of any game',
    category: 'getting_started',
    icon: 'star',
    unlocksCosmetic: 'af_bronze',
  },
  {
    id: 'first_hand_holdem',
    title: 'Texas Welcome',
    description: "Play your first hand of Hold'em",
    category: 'getting_started',
    icon: 'cards',
    unlocksCosmetic: 'cb_classic_red',
  },
  {
    id: 'first_hand_blackjack',
    title: 'Hit or Stand',
    description: 'Play your first hand of Blackjack',
    category: 'getting_started',
    icon: 'spade',
    unlocksCosmetic: 'cb_midnight_blue',
  },
  {
    id: 'first_hand_roulette',
    title: 'Wheel Watcher',
    description: 'Play your first round of Roulette',
    category: 'getting_started',
    icon: 'wheel',
    unlocksCosmetic: 'tf_emerald',
  },
  {
    id: 'first_hand_tcp',
    title: 'Three Card Start',
    description: 'Play your first hand of Three Card Poker',
    category: 'getting_started',
    icon: 'poker_chip',
    unlocksCosmetic: 'af_ice',
  },
  {
    id: 'first_hand_draw',
    title: 'Five Card Opener',
    description: 'Play your first hand of Five Card Draw',
    category: 'getting_started',
    icon: 'hand',
    unlocksCosmetic: null,
  },
  {
    id: 'first_hand_craps',
    title: 'Roll the Bones',
    description: 'Play your first round of Craps',
    category: 'getting_started',
    icon: 'dice',
    unlocksCosmetic: 'tf_midnight',
  },

  // ── Mastery (10) ───────────────────────────────────────────────
  {
    id: 'win_streak_5',
    title: 'Hot Hand',
    description: 'Win 5 hands in a row',
    category: 'mastery',
    icon: 'fire',
    unlocksCosmetic: 'af_fire',
  },
  {
    id: 'win_streak_10',
    title: 'Unstoppable',
    description: 'Win 10 hands in a row',
    category: 'mastery',
    icon: 'lightning',
    unlocksCosmetic: 'cb_royal_gold',
  },
  {
    id: 'win_25_hands',
    title: 'Getting Good',
    description: 'Win 25 hands total',
    category: 'mastery',
    icon: 'trophy_bronze',
    unlocksCosmetic: 'af_silver',
  },
  {
    id: 'win_50_hands',
    title: 'Skilled Player',
    description: 'Win 50 hands total',
    category: 'mastery',
    icon: 'trophy_silver',
    unlocksCosmetic: 'tf_crimson',
  },
  {
    id: 'win_100_hands',
    title: 'Century Club',
    description: 'Win 100 hands total',
    category: 'mastery',
    icon: 'trophy_gold',
    unlocksCosmetic: 'af_gold',
  },
  {
    id: 'holdem_master',
    title: "Hold'em Master",
    description: "Win 20 hands of Hold'em",
    category: 'mastery',
    icon: 'crown',
    unlocksCosmetic: null,
  },
  {
    id: 'blackjack_master',
    title: 'Blackjack Master',
    description: 'Win 20 hands of Blackjack',
    category: 'mastery',
    icon: 'crown',
    unlocksCosmetic: null,
  },
  {
    id: 'roulette_master',
    title: 'Roulette Master',
    description: 'Win 20 rounds of Roulette',
    category: 'mastery',
    icon: 'crown',
    unlocksCosmetic: null,
  },
  {
    id: 'tcp_master',
    title: 'TCP Master',
    description: 'Win 20 hands of Three Card Poker',
    category: 'mastery',
    icon: 'crown',
    unlocksCosmetic: null,
  },
  {
    id: 'craps_master',
    title: 'Craps Master',
    description: 'Win 20 rounds of Craps',
    category: 'mastery',
    icon: 'crown',
    unlocksCosmetic: null,
  },

  // ── Milestone (6) ──────────────────────────────────────────────
  {
    id: 'play_100_hands',
    title: 'Centurion',
    description: 'Play 100 hands total',
    category: 'milestone',
    icon: 'scroll',
    unlocksCosmetic: 'cb_neon_green',
  },
  {
    id: 'world_tourist',
    title: 'World Tourist',
    description: 'Play at least one hand of every game type',
    category: 'milestone',
    icon: 'globe',
    unlocksCosmetic: 'cb_lucky_seven',
  },
  {
    id: 'complete_5_challenges',
    title: 'Challenge Accepted',
    description: 'Complete 5 weekly challenges',
    category: 'milestone',
    icon: 'checklist',
    unlocksCosmetic: 'tf_ocean',
  },
  {
    id: 'game_night_champion',
    title: 'Night Owl',
    description: 'Win a Game Night session',
    category: 'milestone',
    icon: 'moon',
    unlocksCosmetic: 'tf_velvet',
  },
  {
    id: 'reach_level_10',
    title: 'High Roller',
    description: 'Reach player level 10',
    category: 'milestone',
    icon: 'diamond',
    unlocksCosmetic: 'tf_platinum',
  },
  {
    id: 'challenge_champion',
    title: 'Challenge Champion',
    description: 'Complete a gold weekly challenge',
    category: 'milestone',
    icon: 'medal',
    unlocksCosmetic: 'af_royal',
  },

  // ── Rare (3) ───────────────────────────────────────────────────
  {
    id: 'royal_flush',
    title: 'Royal Flush',
    description: 'Get a royal flush in poker',
    category: 'rare',
    icon: 'crown_jewel',
    unlocksCosmetic: 'cb_diamond',
  },
  {
    id: 'natural_blackjack',
    title: 'Natural 21',
    description: 'Get a natural blackjack',
    category: 'rare',
    icon: 'sparkle',
    unlocksCosmetic: 'af_diamond',
  },
  {
    id: 'straight_up_roulette',
    title: 'Lucky Number',
    description: 'Win a straight-up bet in roulette',
    category: 'rare',
    icon: 'star_burst',
    unlocksCosmetic: 'af_neon',
  },
]

/** Get achievement definitions by category. */
export function getAchievementsByCategory(
  category: PersistentAchievementCategory,
): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS.filter(a => a.category === category)
}

/** Get a single achievement definition by ID. */
export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find(a => a.id === id)
}

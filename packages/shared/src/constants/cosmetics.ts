/**
 * Cosmetic definitions — achievement-gated items across 3 categories.
 *
 * v2.2: "Come Back Tomorrow" retention feature.
 *
 * 20 items: 6 card backs, 6 table felts, 8 avatar frames.
 * Each linked to an achievement via `unlockedBy` field.
 * No shop/purchase logic — purely achievement-gated.
 */

import type { CosmeticDefinition, EquippedLoadout } from '../types/retention.js'

/** All cosmetic definitions. */
export const COSMETIC_DEFINITIONS: CosmeticDefinition[] = [
  // ── Card Backs (6) ─────────────────────────────────────────────
  {
    id: 'cb_classic_red',
    name: 'Classic Red',
    category: 'card_back',
    unlockedBy: 'first_hand_holdem',
    previewKey: 'card_back_classic_red',
  },
  {
    id: 'cb_midnight_blue',
    name: 'Midnight Blue',
    category: 'card_back',
    unlockedBy: 'first_hand_blackjack',
    previewKey: 'card_back_midnight_blue',
  },
  {
    id: 'cb_royal_gold',
    name: 'Royal Gold',
    category: 'card_back',
    unlockedBy: 'win_streak_10',
    previewKey: 'card_back_royal_gold',
  },
  {
    id: 'cb_neon_green',
    name: 'Neon Green',
    category: 'card_back',
    unlockedBy: 'play_100_hands',
    previewKey: 'card_back_neon_green',
  },
  {
    id: 'cb_diamond',
    name: 'Diamond',
    category: 'card_back',
    unlockedBy: 'royal_flush',
    previewKey: 'card_back_diamond',
  },
  {
    id: 'cb_lucky_seven',
    name: 'Lucky Seven',
    category: 'card_back',
    unlockedBy: 'world_tourist',
    previewKey: 'card_back_lucky_seven',
  },

  // ── Table Felts (6) ────────────────────────────────────────────
  {
    id: 'tf_emerald',
    name: 'Emerald',
    category: 'table_felt',
    unlockedBy: 'first_hand_roulette',
    previewKey: 'table_felt_emerald',
  },
  {
    id: 'tf_crimson',
    name: 'Crimson',
    category: 'table_felt',
    unlockedBy: 'win_50_hands',
    previewKey: 'table_felt_crimson',
  },
  {
    id: 'tf_midnight',
    name: 'Midnight',
    category: 'table_felt',
    unlockedBy: 'first_hand_craps',
    previewKey: 'table_felt_midnight',
  },
  {
    id: 'tf_ocean',
    name: 'Ocean',
    category: 'table_felt',
    unlockedBy: 'complete_5_challenges',
    previewKey: 'table_felt_ocean',
  },
  {
    id: 'tf_velvet',
    name: 'Velvet Purple',
    category: 'table_felt',
    unlockedBy: 'game_night_champion',
    previewKey: 'table_felt_velvet',
  },
  {
    id: 'tf_platinum',
    name: 'Platinum',
    category: 'table_felt',
    unlockedBy: 'reach_level_10',
    previewKey: 'table_felt_platinum',
  },

  // ── Avatar Frames (8) ──────────────────────────────────────────
  {
    id: 'af_bronze',
    name: 'Bronze Ring',
    category: 'avatar_frame',
    unlockedBy: 'first_hand_any',
    previewKey: 'avatar_frame_bronze',
  },
  {
    id: 'af_silver',
    name: 'Silver Ring',
    category: 'avatar_frame',
    unlockedBy: 'win_25_hands',
    previewKey: 'avatar_frame_silver',
  },
  {
    id: 'af_gold',
    name: 'Gold Ring',
    category: 'avatar_frame',
    unlockedBy: 'win_100_hands',
    previewKey: 'avatar_frame_gold',
  },
  {
    id: 'af_diamond',
    name: 'Diamond Ring',
    category: 'avatar_frame',
    unlockedBy: 'natural_blackjack',
    previewKey: 'avatar_frame_diamond',
  },
  {
    id: 'af_fire',
    name: 'Fire Ring',
    category: 'avatar_frame',
    unlockedBy: 'win_streak_5',
    previewKey: 'avatar_frame_fire',
  },
  {
    id: 'af_ice',
    name: 'Ice Ring',
    category: 'avatar_frame',
    unlockedBy: 'first_hand_tcp',
    previewKey: 'avatar_frame_ice',
  },
  {
    id: 'af_royal',
    name: 'Royal Crown',
    category: 'avatar_frame',
    unlockedBy: 'challenge_champion',
    previewKey: 'avatar_frame_royal',
  },
  {
    id: 'af_neon',
    name: 'Neon Glow',
    category: 'avatar_frame',
    unlockedBy: 'straight_up_roulette',
    previewKey: 'avatar_frame_neon',
  },
]

/** Default equipped loadout (nothing equipped). */
export const DEFAULT_EQUIPPED_LOADOUT: EquippedLoadout = {
  cardBack: null,
  tableFelt: null,
  avatarFrame: null,
}

/** Get cosmetics by category. */
export function getCosmeticsByCategory(category: string): CosmeticDefinition[] {
  return COSMETIC_DEFINITIONS.filter(c => c.category === category)
}

/** Find the cosmetic unlocked by a specific achievement. */
export function getCosmeticForAchievement(achievementId: string): CosmeticDefinition | undefined {
  return COSMETIC_DEFINITIONS.find(c => c.unlockedBy === achievementId)
}

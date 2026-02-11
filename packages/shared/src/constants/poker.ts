import type { BlindLevel } from '../types/game-state.js'

export const MAX_PLAYERS = 4
export const MIN_PLAYERS_TO_START = 2
export const STARTING_STACK = 1000
export const ACTION_TIMEOUT_MS = 30_000
export const TIME_WARNING_MS = 20_000
export const DISCONNECT_TIMEOUT_MS = 30_000
export const INTER_HAND_DELAY_MS = 3_000
export const DEALING_ANIMATION_MS = 1_500
export const SIT_OUT_MAX_HANDS = 3

export const BLIND_LEVELS: readonly BlindLevel[] = [
  { level: 1, smallBlind: 5, bigBlind: 10, minBuyIn: 200, maxBuyIn: 1000 },
  { level: 2, smallBlind: 10, bigBlind: 20, minBuyIn: 400, maxBuyIn: 2000 },
  { level: 3, smallBlind: 25, bigBlind: 50, minBuyIn: 1000, maxBuyIn: 5000 },
  { level: 4, smallBlind: 50, bigBlind: 100, minBuyIn: 2000, maxBuyIn: 10000 },
  { level: 5, smallBlind: 100, bigBlind: 200, minBuyIn: 4000, maxBuyIn: 20000 },
]

export const DEFAULT_BLIND_LEVEL = BLIND_LEVELS[0]!

export const DEALER_CHARACTERS = ['vincent', 'maya', 'remy', 'jade'] as const
export type DealerCharacter = typeof DEALER_CHARACTERS[number]

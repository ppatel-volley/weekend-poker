import type { BotConfig, PlayerStatus, PlayerAction } from './game-state.js'

/**
 * Player status in the casino session.
 * Can be active in current game, sitting out, spectating, or removed.
 */
export type CasinoPlayerStatus = 'active' | 'sitting-out' | 'spectating' | 'busted'

/**
 * Casino Player — Unified player type across all games (v1 and v2).
 *
 * Includes poker-compatible fields (stack, bet, status, lastAction) for
 * backward compatibility with Hold'em and Draw game phases/reducers that
 * operate directly on state.players elements.
 */
export interface CasinoPlayer {
  // ─── VGF index signature for extensibility ───
  [key: string]: unknown

  // ─── Identity ───
  id: string
  name: string
  avatarId: string

  // ─── Seating ───
  seatIndex: number
  isHost: boolean

  // ─── Session State ───
  isConnected: boolean
  isReady: boolean
  currentGameStatus: CasinoPlayerStatus
  sittingOutHandCount: number

  // ─── Poker-Compatible Game Fields (backward compat) ───
  stack: number
  bet: number
  status: PlayerStatus
  lastAction: PlayerAction | null

  // ─── Bot Configuration ───
  isBot: boolean
  botConfig?: BotConfig

  // ─── v2.2: Persistence (optional, not used in v1) ───
  persistentId?: string        // from Player Identity Service
  cosmeticLoadout?: CosmeticLoadout
}

/**
 * Cosmetic loadout for a player — skins, emotes, accessories (v2.2).
 * Optional in v1; populated from Player Identity Service in v2.2.
 */
export interface CosmeticLoadout {
  skinId: string
  emoteIds: string[]
  tableAccessories?: string[]
}

/**
 * Type guard to check if a value is a CasinoPlayer.
 */
export function isCasinoPlayer(value: unknown): value is CasinoPlayer {
  if (typeof value !== 'object' || value === null) return false
  const player = value as Record<string, unknown>
  return (
    typeof player.id === 'string'
    && typeof player.name === 'string'
    && typeof player.seatIndex === 'number'
    && typeof player.isBot === 'boolean'
    && typeof player.isConnected === 'boolean'
  )
}

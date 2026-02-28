import type { GameRuleset } from '@volley/vgf/types'
import type { CasinoGameState } from '@weekend-casino/shared'
import { casinoRuleset } from './casino-ruleset.js'
import { createInitialCasinoState } from './casino-state.js'

/**
 * The casino multi-game ruleset consumed by VGFServer.
 *
 * Per D-001 (Canonical Decision): Single GameRuleset with phase namespaces
 * instead of per-game rulesets. Integrates:
 * - Casino shared phases (Lobby, GameSelect) for multi-game session setup
 * - Hold'em game phases and logic without modification (backward compatibility)
 * - Shared wallet and player management
 * - Server-side game state isolation for secrets (hole cards, pre-generated rolls)
 *
 * Conforms to the GameRuleset interface from @volley/vgf/types.
 */
export const ruleset = casinoRuleset satisfies GameRuleset<CasinoGameState>

// Backwards-compatible aliases — existing tests import these names
export const pokerRuleset = casinoRuleset
export const createInitialState = createInitialCasinoState

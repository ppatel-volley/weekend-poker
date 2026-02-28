import { getVGFHooks, useSessionMembers } from '@volley/vgf/client'
import type { CasinoGameState, CasinoGame, CasinoPhase } from '@weekend-casino/shared'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hooks = getVGFHooks<any, CasinoGameState, CasinoPhase>()

/** Full synchronised game state. */
export const useStateSync = hooks.useStateSync

/** Selector into the synchronised game state — avoids unnecessary re-renders. */
export const useStateSyncSelector = hooks.useStateSyncSelector

/** Dispatch a game action to the server. */
export const useDispatch = hooks.useDispatch

/** Dispatch an async thunk action. */
export const useDispatchThunk = hooks.useDispatchThunk

/** Current game phase. */
export const usePhase = hooks.usePhase

/** All session members (players, displays, etc.). */
export { useSessionMembers }

// ────────────────────────────────────────────────────────────────────
// Multi-Game Hooks
// ────────────────────────────────────────────────────────────────────

/** Phase prefix -> CasinoGame mapping for deriving current game from phase. */
const PHASE_TO_GAME: Record<string, CasinoGame> = {
  DRAW_: 'five_card_draw',
  BJ_: 'blackjack_classic',
  BJC_: 'blackjack_competitive',
  ROULETTE_: 'roulette',
  TCP_: 'three_card_poker',
  CRAPS_: 'craps',
  GN_: 'holdem', // Game Night uses selectedGame, but fallback
  QP_: 'holdem', // Quick Play uses selectedGame, but fallback
}

/** Hold'em phases (unprefixed, not LOBBY or GAME_SELECT). */
const HOLDEM_PHASES = new Set([
  'POSTING_BLINDS', 'DEALING_HOLE_CARDS', 'PRE_FLOP_BETTING',
  'DEALING_FLOP', 'FLOP_BETTING', 'DEALING_TURN', 'TURN_BETTING',
  'DEALING_RIVER', 'RIVER_BETTING', 'ALL_IN_RUNOUT', 'SHOWDOWN',
  'POT_DISTRIBUTION', 'HAND_COMPLETE',
])

/**
 * Derives the current game from state.selectedGame or phase prefix.
 * Returns null when in lobby/game-select or state unavailable.
 */
export function deriveCurrentGame(
  selectedGame: CasinoGame | null | undefined,
  phase: string | null | undefined,
): CasinoGame | null {
  if (selectedGame) return selectedGame

  if (!phase || phase === 'LOBBY' || phase === 'GAME_SELECT') return null

  for (const [prefix, game] of Object.entries(PHASE_TO_GAME)) {
    if (phase.startsWith(prefix)) return game
  }

  if (HOLDEM_PHASES.has(phase)) return 'holdem'

  return null
}

/** Current game derived from selectedGame or phase. Returns null in lobby. */
export function useCurrentGame(): CasinoGame | null {
  const selectedGame = useStateSyncSelector((s) => s.selectedGame)
  const phase = usePhase()
  return deriveCurrentGame(selectedGame, phase as string | null)
}

/** Wallet balance for a given player. Returns 0 if not found. */
export function useWallet(playerId: string): number {
  return useStateSyncSelector((s) => s.wallet?.[playerId] ?? 0)
}

import { getVGFHooks, useClientActions, useSessionMember, useSessionMembers } from '@volley/vgf/client'
import type { PokerGameState } from '@weekend-poker/shared'
import type { PokerPhase } from '@weekend-poker/shared'

// TODO: Pass the actual ruleset type parameter once server types are shared.
// For now, we use `any` for the ruleset generic and supply the concrete
// game-state and phase types so that selectors and phase checks are typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hooks = getVGFHooks<any, PokerGameState, PokerPhase>()

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

/** Lobby actions for controller clients (toggle ready, update state). */
export { useClientActions }

/** Current client's session member. */
export { useSessionMember }

/** All session members. */
export { useSessionMembers }

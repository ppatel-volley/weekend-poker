/**
 * Session lifecycle thunks — joinSession and leaveSession.
 *
 * These thunks replicate the logic previously handled by onConnect/onDisconnect
 * lifecycle hooks. WGFServer does NOT call those hooks (Learning 015), so all
 * session setup must be client-initiated via thunk dispatch.
 *
 * joinSession: Called by the controller after VGF state sync completes.
 * leaveSession: Called on beforeunload/visibilitychange, or by Socket.IO
 *   disconnect middleware on the server side.
 */

import type { GameThunk } from '@volley/vgf/types'
import { ClientType } from '@volley/vgf/types'
import type { CasinoGameState, CasinoPlayer, DailyBonusState } from '@weekend-casino/shared'
import { CasinoPhase, MAX_PLAYERS, STARTING_WALLET_BALANCE } from '@weekend-casino/shared'
import { resolveIdentity, playerStore, dailyBonusStore, challengeStore } from '../persistence/index.js'
import { clearSessionTracker } from '../persistence/challenge-utils.js'
import { logger } from '../logger.js'

type Thunk<TArgs extends unknown[] = never[]> = GameThunk<CasinoGameState, TArgs>

/** Payload for the joinSession thunk. */
export interface JoinSessionPayload {
  /** Display name for the player (from VGF member state or client-provided). */
  displayName?: string
  /** Connection metadata for identity resolution (deviceToken, accountId, etc.). */
  metadata?: Record<string, unknown>
}

/**
 * joinSession — Replaces onConnect lifecycle hook.
 *
 * Handles:
 * 1. Player identity resolution via persistent store
 * 2. Challenge assignment (proactive, non-blocking)
 * 3. Daily bonus calculation and wallet credit
 * 4. CasinoPlayer creation with seat assignment and host designation
 * 5. Reconnection handling for existing players
 *
 * NOTE: Connection registration for private messaging (hole cards) is handled
 * separately via Socket.IO middleware, NOT in this thunk. Thunks don't have
 * access to the raw socket/connection object.
 */
export const joinSession: Thunk<[JoinSessionPayload]> = async (ctx, payload) => {
  const clientId = ctx.getClientId()
  const state = ctx.getState()

  // Guard: Only controllers can join as players — Display clients must not create CasinoPlayer entries
  const members = ctx.getMembers()
  const member = members?.[clientId]
  if (!member || member.clientType !== ClientType.Controller) return

  // Guard: max players reached
  if (state.players.length >= MAX_PLAYERS) return

  // Reconnection: if player already exists, mark them reconnected
  if (state.players.some(p => p.id === clientId)) {
    await ctx.dispatch('markPlayerReconnected', clientId)
    return
  }

  // Seat assignment: find next available seat
  const takenSeats = new Set(state.players.map(p => p.seatIndex ?? -1))
  let seatIndex = 0
  while (takenSeats.has(seatIndex) && seatIndex < MAX_PLAYERS) {
    seatIndex++
  }

  // Resolve display name from members or payload
  const displayName =
    payload.displayName
    ?? (member?.state as Record<string, unknown>)?.displayName as string
    ?? member?.state?.name
    ?? `Player ${seatIndex + 1}`

  // Persistent identity resolution and profile loading.
  // Use explicit metadata from payload if provided, otherwise fall back to
  // { userId: clientId } so resolveIdentity can still resolve via the userId
  // key (identity-resolver.ts line 45). This ensures retention linkage even
  // when the controller dispatches joinSession({}) without metadata.
  let persistentId: string | undefined
  let playerLevel: number | undefined
  let pendingBonus: { amount: number; streakDay: number; multiplierApplied: boolean; newStreak: number } | null = null
  let originalBonusState: DailyBonusState | null = null

  const identityMetadata = payload.metadata ?? { userId: clientId }
  {
    try {
      const identity = resolveIdentity(identityMetadata)
      const profile = await playerStore.getOrCreateByDeviceToken(
        identity.token,
        identity.source,
        displayName,
      )
      persistentId = profile.identity.persistentId
      playerLevel = profile.level

      // Proactive challenge assignment (non-blocking per Learning 011)
      try {
        await challengeStore.assignChallenges(persistentId, profile.stats)
      } catch (challengeErr) {
        logger.error('[persistence] Proactive challenge assignment failed:', challengeErr)
      }

      // Daily bonus eligibility check
      const bonusResult = dailyBonusStore.calculateDailyBonus(profile.dailyBonus)
      if (bonusResult.eligible) {
        originalBonusState = { ...profile.dailyBonus }
        pendingBonus = {
          amount: bonusResult.amount,
          streakDay: bonusResult.streakDay,
          multiplierApplied: bonusResult.multiplierApplied,
          newStreak: bonusResult.newStreak,
        }
        // NOTE: Persistent bonus claim is deferred to AFTER wallet dispatch succeeds (below)
        // to eliminate double-claim rollback window (F6)
      }
    } catch (err) {
      // Non-blocking: persistence failures should NOT prevent joining
      logger.error('[persistence] joinSession identity resolution failed:', err)
    }
  }

  const newPlayer: CasinoPlayer = {
    id: clientId,
    name: displayName,
    avatarId: 'default',
    seatIndex,
    isHost: state.players.length === 0,
    isReady: false,
    currentGameStatus: 'active',
    stack: STARTING_WALLET_BALANCE,
    bet: 0,
    status: 'active',
    lastAction: null,
    isBot: false,
    isConnected: true,
    sittingOutHandCount: 0,
    persistentId,
    playerLevel,
  }

  // VGF RFC (Predictable Game State Processing): Always await ctx.dispatch() to
  // guarantee fresh state between dispatches. Each await ensures any triggered
  // endIf/phase transitions complete before the next dispatch runs (fixes VGF F3).
  await ctx.dispatch('addPlayer', newPlayer)

  if (pendingBonus) {
    try {
      await ctx.dispatch('updateWallet', clientId, pendingBonus.amount)
      await ctx.dispatch('setDailyBonus', {
        amount: pendingBonus.amount,
        streakDay: pendingBonus.streakDay,
        multiplierApplied: pendingBonus.multiplierApplied,
        timestamp: Date.now(),
      })
      // Persist bonus claim AFTER wallet dispatch succeeds — eliminates double-claim window (F6)
      if (persistentId && originalBonusState) {
        const updatedBonus = dailyBonusStore.applyDailyBonusClaim(
          originalBonusState,
          { eligible: true as const, ...pendingBonus },
        )
        await playerStore.updateDailyBonus(persistentId, updatedBonus)
      }
    } catch {
      // Wallet dispatch failed — bonus was NOT persisted, so no rollback needed
    }
  }
}

/**
 * leaveSession — Replaces onDisconnect lifecycle hook.
 *
 * Handles:
 * 1. Player removal (lobby) or disconnect marking (mid-game)
 * 2. Session tracker cleanup for cross-session leakage prevention
 *
 * NOTE: Connection unregistration for private messaging is handled
 * separately via Socket.IO disconnect middleware, NOT in this thunk.
 */
export const leaveSession: Thunk = async (ctx) => {
  const clientId = ctx.getClientId()
  const sessionId = ctx.getSessionId()
  const state = ctx.getState()

  const player = state.players.find(p => p.id === clientId)
  if (!player) return

  if (state.phase === CasinoPhase.Lobby) {
    // True session leave — clear session tracker to prevent cross-session leakage
    if (player.persistentId) {
      clearSessionTracker(sessionId, player.persistentId)
    }
    await ctx.dispatch('removePlayer', clientId)
  } else {
    // Transient disconnect mid-game — preserve session tracker for reconnect
    await ctx.dispatch('markPlayerDisconnected', clientId)
  }
}

export const sessionThunks = {
  joinSession,
  leaveSession,
}

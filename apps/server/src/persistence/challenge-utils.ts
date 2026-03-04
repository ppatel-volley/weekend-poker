/**
 * Challenge phase integration utility.
 *
 * Called from hand-complete onBegin callbacks to update challenge progress.
 * Same pattern as incrementGameNightRoundIfActive — try/catch, non-critical.
 *
 * v2.2: Also updates persistent stats, XP, and emits richer challenge events
 * (hand_won, win_streak, gamesPlayedThisSession).
 */

import type { CasinoGameState } from '@weekend-casino/shared'
import * as challengeStore from './challenge-store.js'
import type { ChallengeEvent } from './challenge-store.js'
import * as playerStore from './player-store.js'

/** XP constants for hand completion. */
const HAND_PLAYED_XP = 10
const HAND_WON_BONUS_XP = 20

/**
 * Module-level session game tracker.
 * Keyed by `sessionId:persistentId` to scope tracking to a specific game session.
 * Entries are pruned when a player disconnects via clearSessionTracker().
 */
const sessionGamesPlayed = new Map<string, Set<string>>()

/** Build a composite key for the session tracker. */
function sessionKey(sessionId: string, persistentId: string): string {
  return `${sessionId}:${persistentId}`
}

/** Exported for testing: reset the entire session tracker. */
export function _resetSessionTracker(): void {
  sessionGamesPlayed.clear()
}

/** Exported for testing: get games played by a persistent player in a session. */
export function _getGamesPlayedForPlayer(persistentId: string, sessionId = ''): string[] {
  // Search by persistentId suffix for backwards compat in tests
  for (const [key, games] of sessionGamesPlayed) {
    if (key.endsWith(`:${persistentId}`) || key === persistentId) {
      return Array.from(games)
    }
  }
  return Array.from(sessionGamesPlayed.get(sessionKey(sessionId, persistentId)) ?? [])
}

/**
 * Clear session tracker entries for a specific session+player.
 * Call from onDisconnect to prevent cross-session leakage.
 */
export function clearSessionTracker(sessionId: string, persistentId: string): void {
  sessionGamesPlayed.delete(sessionKey(sessionId, persistentId))
}

/**
 * Clear ALL entries for a session (e.g., when session ends).
 */
export function clearSessionTrackerForSession(sessionId: string): void {
  for (const key of sessionGamesPlayed.keys()) {
    if (key.startsWith(`${sessionId}:`)) {
      sessionGamesPlayed.delete(key)
    }
  }
}

/**
 * Determine if a player won the hand based on game-specific state.
 *
 * Returns the net round result (positive = won, negative = lost, 0 = push).
 * For poker games (Hold'em, Draw), checks wallet change since pot award has
 * already occurred by the time hand-complete fires.
 */
function getPlayerRoundResult(
  state: CasinoGameState,
  playerId: string,
): number {
  const game = state.selectedGame

  // Blackjack Classic — per-player roundResult
  if (game === 'blackjack_classic' && state.blackjack) {
    const ps = state.blackjack.playerStates.find(p => p.playerId === playerId)
    return ps?.roundResult ?? 0
  }

  // Blackjack Competitive — check winnerIds
  if (game === 'blackjack_competitive' && state.blackjackCompetitive) {
    return state.blackjackCompetitive.winnerIds.includes(playerId) ? 1 : -1
  }

  // Three Card Poker — per-player roundResult
  if (game === 'three_card_poker' && state.threeCardPoker) {
    const hand = state.threeCardPoker.playerHands.find(h => h.playerId === playerId)
    return hand?.roundResult ?? 0
  }

  // Roulette — per-player roundResult
  if (game === 'roulette' && state.roulette) {
    const rp = state.roulette.players.find(p => p.playerId === playerId)
    return rp?.roundResult ?? 0
  }

  // Craps — per-player roundResult
  if (game === 'craps' && state.craps) {
    const cp = state.craps.players?.find(p => p.playerId === playerId)
    return cp?.roundResult ?? 0
  }

  // Hold'em / Five Card Draw — compare player stack to wallet balance.
  // By hand-complete, pot has been awarded to player.stack but wallet hasn't
  // been synced yet (SP2 sync happens at hand-complete). So stack > wallet = won.
  if (game === 'holdem' || game === 'five_card_draw') {
    const player = state.players.find(p => p.id === playerId)
    if (!player) return 0
    const walletBalance = state.wallet[playerId] ?? 0
    // stack > wallet means the player gained chips from the pot this hand
    return player.stack - walletBalance
  }

  return 0
}

/**
 * Update challenge progress for all persistent players after a hand completes.
 * Non-critical: wrapped in try/catch so failures don't break game flow.
 *
 * Now also:
 *   - Detects hand winners and emits hand_won events
 *   - Updates persistent stats (hands played, hands won, chips won/lost, win streak)
 *   - Awards XP (10 per hand, +20 bonus for wins)
 *   - Tracks unique games played per session for multi-game challenges
 *   - Emits win_streak events when streak >= 5
 */
export async function updateChallengeProgressIfPersistent(ctx: any): Promise<void> {
  try {
    const state: CasinoGameState = ctx.getState()
    const dispatch = ctx.reducerDispatcher ?? ctx.dispatch
    if (!dispatch) return

    const game = state.selectedGame
    if (!game) return

    // Get sessionId for session-scoped tracking (VGF ctx may expose it)
    const sid: string = ctx.getSessionId?.() ?? ctx.sessionId ?? 'default'

    for (const player of state.players) {
      if (!player.persistentId || player.isBot) continue

      const persistentId = player.persistentId
      const sKey = sessionKey(sid, persistentId)

      // ── Track unique games played this session ──
      if (!sessionGamesPlayed.has(sKey)) {
        sessionGamesPlayed.set(sKey, new Set())
      }
      const isNewGameType = !sessionGamesPlayed.get(sKey)!.has(game)
      sessionGamesPlayed.get(sKey)!.add(game)
      const gamesPlayed = Array.from(sessionGamesPlayed.get(sKey)!)

      // ── Determine win/loss ──
      const roundResult = getPlayerRoundResult(state, player.id)
      const won = roundResult > 0

      // ── Update persistent stats ──
      try {
        const statsUpdate: Record<string, number> = {
          totalHandsPlayed: 1,
          ...(isNewGameType ? { totalGamesPlayed: 1 } : {}),
        }
        if (won) {
          statsUpdate['totalHandsWon'] = 1
        }
        if (roundResult > 0) {
          statsUpdate['totalChipsWon'] = roundResult
        } else if (roundResult < 0) {
          statsUpdate['totalChipsLost'] = Math.abs(roundResult)
        }

        // Get current stats for win streak tracking
        const profile = await playerStore.getProfile(persistentId)
        const currentStreak = profile?.stats.currentWinStreak ?? 0
        const newStreak = won ? currentStreak + 1 : 0
        statsUpdate['currentWinStreak'] = newStreak

        await playerStore.updateStats(persistentId, statsUpdate as any)

        // ── Update per-game-type stats (for achievement detection) ──
        await playerStore.updateGameTypeStats(
          persistentId,
          game,
          won,
          roundResult > 0 ? roundResult : 0,
          roundResult < 0 ? Math.abs(roundResult) : 0,
        )

        // ── Award XP ──
        const xpAmount = HAND_PLAYED_XP + (won ? HAND_WON_BONUS_XP : 0)
        await playerStore.addXp(persistentId, xpAmount)

        // ── Emit win_streak event if threshold reached ──
        if (newStreak >= 5) {
          const streakEvent: ChallengeEvent = {
            type: 'win_streak',
            game,
            value: newStreak,
          }
          const streakUpdated = await challengeStore.checkAndUpdateProgress(
            persistentId,
            streakEvent,
          )
          if (streakUpdated.length > 0) {
            const summaries = challengeStore.toChallengeSummaries(streakUpdated)
            dispatch('setChallengeProgress', player.id, summaries)
          }
        }
      } catch (statsErr) {
        // Stats/XP update failure is non-critical
        console.error('[persistence] Stats/XP update failed:', statsErr)
      }

      // ── Emit hand_complete event ──
      const handCompleteEvent: ChallengeEvent = {
        type: 'hand_complete',
        game,
        gamesPlayedThisSession: gamesPlayed,
      }

      const updated = await challengeStore.checkAndUpdateProgress(
        persistentId,
        handCompleteEvent,
      )

      if (updated.length > 0) {
        const summaries = challengeStore.toChallengeSummaries(updated)
        dispatch('setChallengeProgress', player.id, summaries)
      }

      // ── Emit hand_won event if applicable ──
      if (won) {
        const handWonEvent: ChallengeEvent = {
          type: 'hand_won',
          game,
        }

        const wonUpdated = await challengeStore.checkAndUpdateProgress(
          persistentId,
          handWonEvent,
        )

        if (wonUpdated.length > 0) {
          const summaries = challengeStore.toChallengeSummaries(wonUpdated)
          dispatch('setChallengeProgress', player.id, summaries)
        }
      }
    }
  } catch (err) {
    // Non-critical: challenge progress update failure should NOT break game flow
    console.error('[persistence] Challenge progress update failed:', err)
  }
}

/**
 * Emit a game_night_won challenge event for the champion.
 * Called from GN_CHAMPION phase after champion is determined.
 */
export async function emitGameNightWonEvent(ctx: any): Promise<void> {
  try {
    const state: CasinoGameState = ctx.getState()
    const dispatch = ctx.reducerDispatcher ?? ctx.dispatch
    if (!dispatch) return

    const championId = state.gameNight?.championId
    if (!championId) return

    // Find the champion player to get their persistentId
    const champion = state.players.find(p => p.id === championId)
    if (!champion?.persistentId || champion.isBot) return

    const event: ChallengeEvent = {
      type: 'game_night_won',
      game: 'game_night',
    }

    const updated = await challengeStore.checkAndUpdateProgress(
      champion.persistentId,
      event,
    )

    if (updated.length > 0) {
      const summaries = challengeStore.toChallengeSummaries(updated)
      dispatch('setChallengeProgress', champion.id, summaries)
    }

    // Also update persistent stats
    await playerStore.updateStats(champion.persistentId, { gameNightWins: 1 } as any)
    await playerStore.addXp(champion.persistentId, 50) // Bonus XP for winning GN
  } catch (err) {
    console.error('[persistence] Game Night won event failed:', err)
  }
}

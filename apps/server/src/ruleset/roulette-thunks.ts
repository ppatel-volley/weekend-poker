/**
 * Roulette thunks — async orchestration.
 *
 * Per VGF: thunks handle validation, side effects, and multi-dispatch sequences.
 * ctx.dispatch() is synchronous — state visible immediately after.
 */

import type { CasinoGameState, RouletteBet, RouletteBetType } from '@weekend-casino/shared'
import {
  generateWinningNumber,
  getNumberColour,
  getAdjacentNumbers,
  isValidBet,
  isInsideBet,
  getNumbersForBet,
  resolveAllBets,
} from '../roulette-engine/index.js'
import { getServerGameState, setServerGameState } from '../server-game-state.js'
import { validatePlayerIdOrBot } from './security.js'

type ThunkCtx = {
  getState: () => CasinoGameState
  getSessionId: () => string
  getMembers: () => any
  getClientId: () => string
  dispatch: (name: string, ...args: unknown[]) => void
  dispatchThunk: (name: string, ...args: unknown[]) => Promise<void>
  scheduler: {
    upsertTimeout(opts: {
      name: string
      delayMs?: number
      dueAt?: number
      dispatch: { kind: 'reducer' | 'thunk'; name: string; args?: unknown[] }
      mode?: 'hold' | 'catch-up'
      paused?: boolean
    }): Promise<void>
    cancel(name: string): Promise<void>
    [key: string]: any
  }
  logger?: any
}

let betIdCounter = 0

export const rouletteThunks = {
  /**
   * Place a bet with validation.
   * Called by controller when player places a bet.
   */
  roulettePlaceBet: async (
    ctx: ThunkCtx,
    claimedPlayerId: string,
    betType: RouletteBetType,
    amount: number,
    numbers?: number[],
  ) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    const roulette = state.roulette
    if (!roulette) return

    // Resolve the numbers covered by this bet
    const betNumbers = getNumbersForBet(betType, numbers)

    // Validate bet structure
    if (!isValidBet(betType, betNumbers)) {
      ctx.dispatch('setBetError', playerId, 'Invalid bet placement', Date.now() + 3000)
      return
    }

    // Validate amount range
    const config = roulette.config
    if (amount < config.minBet) {
      ctx.dispatch('setBetError', playerId, `Minimum bet is ${config.minBet}`, Date.now() + 3000)
      return
    }

    const maxForType = isInsideBet(betType) ? config.maxInsideBet : config.maxOutsideBet
    if (amount > maxForType) {
      ctx.dispatch('setBetError', playerId, `Maximum bet for this type is ${maxForType}`, Date.now() + 3000)
      return
    }

    // Validate total bet limit
    const playerState = roulette.players.find(p => p.playerId === playerId)
    const currentTotal = playerState?.totalBet ?? 0
    if (currentTotal + amount > config.maxTotalBet) {
      ctx.dispatch('setBetError', playerId, `Maximum total bet is ${config.maxTotalBet}`, Date.now() + 3000)
      return
    }

    // Validate wallet balance
    const walletBalance = state.wallet[playerId] ?? 0
    if (currentTotal + amount > walletBalance) {
      ctx.dispatch('setBetError', playerId, 'Insufficient chips', Date.now() + 3000)
      return
    }

    const bet: RouletteBet = {
      id: `rbet-${++betIdCounter}`,
      playerId,
      type: betType,
      amount,
      numbers: betNumbers,
      status: 'active',
      payout: 0,
    }

    ctx.dispatch('roulettePlaceBet', bet)
  },

  /**
   * Remove a bet.
   */
  rouletteRemoveBet: async (ctx: ThunkCtx, claimedPlayerId: string, betId: string) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    const roulette = state.roulette
    if (!roulette) return

    const bet = roulette.bets.find(b => b.id === betId)
    if (!bet || bet.playerId !== playerId) return

    ctx.dispatch('rouletteRemoveBet', betId)
  },

  /**
   * Repeat all bets from the previous round.
   */
  rouletteRepeatLastBets: async (ctx: ThunkCtx, claimedPlayerId: string, previousBets: RouletteBet[]) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    const roulette = state.roulette
    if (!roulette) return

    const walletBalance = state.wallet[playerId] ?? 0
    let totalNeeded = 0
    for (const bet of previousBets) {
      totalNeeded += bet.amount
    }

    if (totalNeeded > walletBalance) {
      ctx.dispatch('setBetError', playerId, 'Insufficient chips to repeat all bets', Date.now() + 3000)
      return
    }

    for (const prevBet of previousBets) {
      const newBet: RouletteBet = {
        id: `rbet-${++betIdCounter}`,
        playerId,
        type: prevBet.type,
        amount: prevBet.amount,
        numbers: prevBet.numbers,
        status: 'active',
        payout: 0,
      }
      ctx.dispatch('roulettePlaceBet', newBet)
    }
  },

  /**
   * Clear all bets for a player.
   */
  rouletteClearBets: async (ctx: ThunkCtx, claimedPlayerId: string) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    ctx.dispatch('rouletteClearPlayerBets', playerId)
  },

  /**
   * Confirm bets for a player.
   * Checks if all players have confirmed to advance phase.
   */
  rouletteConfirmBets: async (ctx: ThunkCtx, claimedPlayerId: string) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    ctx.dispatch('rouletteConfirmBets', playerId)

    const updated = ctx.getState()
    const roulette = updated.roulette!
    const allConfirmed = roulette.players.every(p => p.betsConfirmed)
    if (allConfirmed) {
      ctx.dispatch('rouletteSetAllBetsPlaced', true)
    }
  },

  /**
   * Skip betting (no bet this round).
   */
  rouletteNoBet: async (ctx: ThunkCtx, claimedPlayerId: string) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    ctx.dispatch('rouletteClearPlayerBets', playerId)
    ctx.dispatch('rouletteConfirmBets', playerId)

    const updated = ctx.getState()
    const roulette = updated.roulette!
    const allConfirmed = roulette.players.every(p => p.betsConfirmed)
    if (allConfirmed) {
      ctx.dispatch('rouletteSetAllBetsPlaced', true)
    }
  },

  /**
   * Spin the wheel — generate winning number, store server-side,
   * and trigger the spin animation on the Display.
   */
  rouletteSpinWheel: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const roulette = state.roulette
    if (!roulette) return

    const sessionId = ctx.getSessionId()

    // Generate winning number server-side
    const winningNumber = generateWinningNumber()
    const winningColour = getNumberColour(winningNumber)

    // Store in server-side state (not broadcast to clients yet)
    const serverState = getServerGameState(sessionId)
    serverState.roulette = { winningNumber }
    setServerGameState(sessionId, serverState)

    // Deduct bets from wallets
    for (const bet of roulette.bets) {
      ctx.dispatch('updateWallet', bet.playerId, -bet.amount)
    }

    // Set winning number in public state (Display needs it for animation targeting)
    ctx.dispatch('rouletteSetWinningNumber', winningNumber, winningColour)

    // Detect near misses
    const nearMisses = detectNearMisses(winningNumber, roulette.bets)
    if (nearMisses.length > 0) {
      ctx.dispatch('rouletteSetNearMisses', nearMisses)
    }

    ctx.dispatch('setDealerMessage', 'The wheel spins!')

    // Schedule fallback: if the Display never reports spin completion,
    // force-complete after 8 seconds to prevent deadlock.
    // Production uses VGF's Redis-backed scheduler; dev uses setTimeout fallback.
    const SPIN_TIMEOUT_MS = 8_000
    try {
      await ctx.scheduler.upsertTimeout({
        name: 'roulette-force-complete-spin',
        delayMs: SPIN_TIMEOUT_MS,
        dispatch: { kind: 'thunk', name: 'rouletteForceCompleteSpin' },
      })
    } catch {
      // Dev-mode no-op scheduler — fall back to plain setTimeout.
      // Production MUST use a real scheduler (Redis-backed) for persistence.
      setTimeout(() => {
        ctx.dispatchThunk('rouletteForceCompleteSpin').catch(() => {})
      }, SPIN_TIMEOUT_MS)
    }
  },

  /**
   * Complete the spin — called by Display when animation finishes.
   * Client-driven completion signal (RC-6 pattern).
   */
  rouletteCompleteSpinFromClient: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    if (state.phase !== 'ROULETTE_SPIN') return
    ctx.dispatch('rouletteSetSpinComplete', true)
    ctx.dispatch('rouletteSetSpinState', 'stopped')

    // Cancel the fallback timer since the client reported completion
    try {
      await ctx.scheduler.cancel('roulette-force-complete-spin')
    } catch {
      // Scheduler may not have the timer (dev no-op scheduler); safe to ignore
    }
  },

  /**
   * Force-complete the spin — server hard timeout fallback (8s).
   * Fired by scheduler if Display never reports completion.
   */
  rouletteForceCompleteSpin: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    if (state.roulette?.spinComplete) return // Already completed
    ctx.dispatch('rouletteSetSpinComplete', true)
    ctx.dispatch('rouletteSetSpinState', 'stopped')
  },

  /**
   * Resolve bets after the spin result is shown.
   * Calculates payouts and updates wallets.
   */
  rouletteResolveBets: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const roulette = state.roulette
    if (!roulette || roulette.winningNumber === null) return

    const winningNumber = roulette.winningNumber

    // Resolve all bets
    const resolvedBets = roulette.bets.map(bet => {
      const won = bet.numbers.includes(winningNumber)
      return {
        betId: bet.id,
        status: (won ? 'won' : 'lost') as 'won' | 'lost',
        payout: won ? bet.amount * getPayoutMultiplier(bet.type) : 0,
      }
    })

    ctx.dispatch('rouletteResolveBets', resolvedBets)

    // Calculate per-player payouts
    const playerPayouts = resolveAllBets(roulette.bets, winningNumber)
    for (const [playerId, result] of playerPayouts) {
      ctx.dispatch('rouletteSetPlayerPayout', playerId, result.totalPayout, result.netResult)

      // Credit winnings to wallet
      if (result.totalPayout > 0) {
        ctx.dispatch('updateWallet', playerId, result.totalPayout)
      }
    }

    // Announce result
    const colour = getNumberColour(winningNumber)
    const colourLabel = colour.charAt(0).toUpperCase() + colour.slice(1)
    ctx.dispatch('setDealerMessage', `${winningNumber}, ${colourLabel}!`)

    ctx.dispatch('rouletteSetResultAnnounced', true)
  },

  /**
   * Complete payout phase — trigger animations and advance.
   */
  rouletteCompletePayout: async (ctx: ThunkCtx) => {
    ctx.dispatch('rouletteSetPayoutComplete', true)
  },

  /**
   * Complete the round — add to history, sync stats.
   */
  rouletteCompleteRound: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const roulette = state.roulette
    if (!roulette || roulette.winningNumber === null) return

    // Add to history
    const colour = getNumberColour(roulette.winningNumber)
    ctx.dispatch('rouletteAddHistory', {
      roundNumber: roulette.roundNumber,
      number: roulette.winningNumber,
      colour,
    })

    ctx.dispatch('rouletteSetRoundCompleteReady', true)
    ctx.dispatch('setDealerMessage', null)
  },
}

// ── Helpers ────────────────────────────────────────────────────────

import { getPayoutMultiplier } from '../roulette-engine/payout-calculator.js'

function detectNearMisses(
  winningNumber: number,
  bets: RouletteBet[],
): Array<{ playerId: string; betNumber: number }> {
  const adjacent = getAdjacentNumbers(winningNumber)
  return bets
    .filter(b => b.type === 'straight_up' && adjacent.includes(b.numbers[0]!))
    .map(b => ({ playerId: b.playerId, betNumber: b.numbers[0]! }))
}

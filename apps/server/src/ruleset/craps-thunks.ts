/**
 * Craps thunks — async orchestration.
 *
 * Per VGF: thunks handle validation, side effects, and multi-dispatch sequences.
 * await ctx.dispatch() is synchronous — state visible immediately after.
 */

import type { CasinoGameState, CrapsBetType, CrapsBet, CrapsComeBet } from '@weekend-casino/shared'
import {
  rollDice,
  resolvePassLineBet,
  resolveDontPassBet,
  resolvePlaceBet,
  resolveFieldBet,
  resolveOddsBet,
  resolveComeBet,
  isNatural,
  isCraps,
  isPoint,
  isValidPlaceNumber,
} from '../craps-engine/index.js'
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

import { randomUUID } from 'node:crypto'

export const crapsThunks = {
  /**
   * Validate and place a bet.
   * Handles pass_line, dont_pass, place, field, and odds bets.
   */
  crapsValidateAndPlaceBet: async (
    ctx: ThunkCtx,
    claimedPlayerId: string,
    betType: CrapsBetType,
    amount: number,
    targetNumber?: number,
  ) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    const craps = state.craps
    if (!craps) return

    const config = craps.config

    // Reject invalid bet amounts
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return
    }

    // Validate amount
    if (amount < config.minBet) {
      await ctx.dispatch('setBetError', playerId, `Minimum bet is ${config.minBet}`, Date.now() + 3000)
      return
    }
    if (amount > config.maxBet) {
      await ctx.dispatch('setBetError', playerId, `Maximum bet is ${config.maxBet}`, Date.now() + 3000)
      return
    }

    // Validate wallet
    const walletBalance = state.wallet[playerId] ?? 0
    const playerState = craps.players.find(p => p.playerId === playerId)
    const currentAtRisk = playerState?.totalAtRisk ?? 0
    if (currentAtRisk + amount > walletBalance) {
      await ctx.dispatch('setBetError', playerId, 'Insufficient chips', Date.now() + 3000)
      return
    }

    // Type-specific validation
    if (betType === 'place') {
      if (targetNumber == null || !isValidPlaceNumber(targetNumber)) {
        await ctx.dispatch('setBetError', playerId, 'Invalid place bet number', Date.now() + 3000)
        return
      }
    }

    if (betType === 'pass_odds' || betType === 'dont_pass_odds') {
      // Odds require a point to be established
      if (!craps.puckOn || craps.point === null) {
        await ctx.dispatch('setBetError', playerId, 'Cannot place odds without an established point', Date.now() + 3000)
        return
      }
      // Validate odds multiplier
      const parentBet = craps.bets.find(b =>
        b.playerId === playerId &&
        b.status === 'active' &&
        (betType === 'pass_odds' ? b.type === 'pass_line' : b.type === 'dont_pass'),
      )
      if (!parentBet) {
        await ctx.dispatch('setBetError', playerId, 'No qualifying pass/don\'t pass bet for odds', Date.now() + 3000)
        return
      }
      if (amount > parentBet.amount * config.maxOddsMultiplier) {
        await ctx.dispatch('setBetError', playerId, `Maximum odds is ${config.maxOddsMultiplier}x`, Date.now() + 3000)
        return
      }
    }

    // Come/Don't Come bets
    if (betType === 'come' || betType === 'dont_come') {
      const comeBet: CrapsComeBet = {
        id: `cbet-${randomUUID()}`,
        playerId,
        type: betType,
        amount,
        comePoint: null,
        oddsAmount: 0,
        status: 'active',
      }
      await ctx.dispatch('crapsPlaceComeBet', comeBet)
      await ctx.dispatch('updateWallet', playerId, -amount)
      return
    }

    // Come/Don't Come odds
    if (betType === 'come_odds' || betType === 'dont_come_odds') {
      if (targetNumber == null) {
        await ctx.dispatch('setBetError', playerId, 'Must specify come point for odds', Date.now() + 3000)
        return
      }
      const parentComeBet = craps.comeBets.find(cb =>
        cb.playerId === playerId &&
        cb.status === 'active' &&
        cb.comePoint === targetNumber &&
        (betType === 'come_odds' ? cb.type === 'come' : cb.type === 'dont_come'),
      )
      if (!parentComeBet) {
        await ctx.dispatch('setBetError', playerId, 'No qualifying come bet for odds', Date.now() + 3000)
        return
      }
      if (amount > parentComeBet.amount * config.maxOddsMultiplier) {
        await ctx.dispatch('setBetError', playerId, `Maximum odds is ${config.maxOddsMultiplier}x`, Date.now() + 3000)
        return
      }
    }

    const bet: CrapsBet = {
      id: `crbet-${randomUUID()}`,
      playerId,
      type: betType,
      amount,
      targetNumber: targetNumber ?? undefined,
      working: betType !== 'place' || craps.puckOn, // Place bets off during come-out by default
      status: 'active',
      payout: 0,
    }

    await ctx.dispatch('crapsPlaceBet', bet)
    await ctx.dispatch('updateWallet', playerId, -amount)
  },

  /**
   * Confirm a player's bets. If all players confirmed, advance phase.
   */
  crapsConfirmBets: async (ctx: ThunkCtx, claimedPlayerId: string) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    await ctx.dispatch('crapsSetPlayerConfirmed', playerId, true)

    const updated = ctx.getState()
    const craps = updated.craps!
    const allConfirmed = craps.players.every(p => p.betsConfirmed)
    if (allConfirmed) {
      await ctx.dispatch('crapsSetAllBetsPlaced', true)
    }
  },

  /**
   * Skip betting (no bet this round).
   */
  crapsNoBet: async (ctx: ThunkCtx, claimedPlayerId: string) => {
    const state = ctx.getState()
    const playerId = validatePlayerIdOrBot(ctx as any, claimedPlayerId, state)
    if (!playerId) return

    await ctx.dispatch('crapsSetPlayerConfirmed', playerId, true)

    const updated = ctx.getState()
    const craps = updated.craps!
    const allConfirmed = craps.players.every(p => p.betsConfirmed)
    if (allConfirmed) {
      await ctx.dispatch('crapsSetAllBetsPlaced', true)
    }
  },

  /**
   * Roll the dice. Pre-generates result server-side, then sets it in state.
   * The main resolution logic is in crapsResolveCrapsRoll.
   */
  crapsRollDice: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const craps = state.craps
    if (!craps) return

    const sessionId = ctx.getSessionId()

    // Generate dice roll
    const [die1, die2] = rollDice()

    // Store in server-side state
    const serverState = getServerGameState(sessionId)
    serverState.craps = {
      nextRoll: [die1, die2],
      rngSeed: new Uint8Array(0), // Placeholder for CSPRNG audit
    }
    setServerGameState(sessionId, serverState)

    const rollNumber = craps.rollHistory.length + 1
    await ctx.dispatch('crapsSetRollResult', die1, die2, rollNumber)
    await ctx.dispatch('setDealerMessage', `${die1} and ${die2}!`)
    await ctx.dispatch('crapsSetRollComplete', true)
  },

  /**
   * The big one — resolves ALL bets atomically after a roll.
   * Called from phase onBegin after roll result is set.
   */
  crapsResolveCrapsRoll: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const craps = state.craps
    if (!craps) return

    const total = craps.lastRollTotal
    const point = craps.point
    const puckOn = craps.puckOn

    // Resolve all standard bets
    const resolvedBets: CrapsBet[] = craps.bets.map(bet => {
      if (bet.status !== 'active') return bet

      switch (bet.type) {
        case 'pass_line':
          return resolvePassLineBet(bet, total, point, puckOn)
        case 'dont_pass':
          return resolveDontPassBet(bet, total, point, puckOn)
        case 'place':
          return resolvePlaceBet(bet, total)
        case 'field':
          return resolveFieldBet(bet, total)
        case 'pass_odds':
          if (point === null) return bet
          return resolveOddsBet(bet, total, point, 'pass')
        case 'dont_pass_odds':
          if (point === null) return bet
          return resolveOddsBet(bet, total, point, 'dont_pass')
        case 'come_odds':
        case 'dont_come_odds':
          // Come odds resolved with their parent come bet
          return bet
        default:
          return bet
      }
    })

    // Resolve come bets
    const resolvedComeBets: CrapsComeBet[] = craps.comeBets.map(cb => {
      if (cb.status !== 'active') return cb
      return resolveComeBet(cb, total)
    })

    // Single atomic dispatch for all resolutions (RC-1)
    await ctx.dispatch('crapsResolveBets', resolvedBets, resolvedComeBets)

    // Calculate payouts and update wallets
    const playerPayouts: Record<string, number> = {}

    for (const bet of resolvedBets) {
      if (bet.status === 'won' && bet.payout > 0) {
        playerPayouts[bet.playerId] = (playerPayouts[bet.playerId] ?? 0) + bet.payout
      }
      if (bet.status === 'push') {
        playerPayouts[bet.playerId] = (playerPayouts[bet.playerId] ?? 0) + bet.amount
      }
    }

    for (const cb of resolvedComeBets) {
      if (cb.status === 'won') {
        // Come bets pay 1:1
        const payout = cb.amount * 2 + cb.oddsAmount
        playerPayouts[cb.playerId] = (playerPayouts[cb.playerId] ?? 0) + payout
      }
      if (cb.status === 'push') {
        playerPayouts[cb.playerId] = (playerPayouts[cb.playerId] ?? 0) + cb.amount
      }
    }

    for (const [playerId, payout] of Object.entries(playerPayouts)) {
      if (payout > 0) {
        await ctx.dispatch('updateWallet', playerId, payout)
      }
    }

    // Determine outcome flags
    if (puckOn && point !== null) {
      if (total === 7) {
        await ctx.dispatch('crapsSetSevenOut', true)
        await ctx.dispatch('setDealerMessage', 'Seven out!')
      } else if (total === point) {
        await ctx.dispatch('crapsSetPointHit', true)
        await ctx.dispatch('crapsSetPoint', null)
        await ctx.dispatch('crapsSetPuckOn', false)
        await ctx.dispatch('setDealerMessage', `${total}! Winner!`)
      }
    } else {
      // Come-out roll
      if (isNatural(total)) {
        await ctx.dispatch('setDealerMessage', `${total}! Winner on the come-out!`)
      } else if (isCraps(total)) {
        await ctx.dispatch('setDealerMessage', `${total}! Craps!`)
      } else if (isPoint(total)) {
        // Establish the point
        await ctx.dispatch('crapsSetPoint', total)
        await ctx.dispatch('crapsSetPuckOn', true)
        await ctx.dispatch('setDealerMessage', `The point is ${total}!`)
        // Turn on place bets now that puck is ON (if configured)
      }
    }

    await ctx.dispatch('crapsSetResolutionComplete', true)
  },

  /**
   * Return all active come bets at face value (RC-5: game switch).
   */
  crapsReturnActiveComeBets: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const craps = state.craps
    if (!craps) return

    // Return come bet amounts to wallets
    for (const cb of craps.comeBets) {
      if (cb.status === 'active') {
        await ctx.dispatch('updateWallet', cb.playerId, cb.amount + cb.oddsAmount)
      }
    }

    await ctx.dispatch('crapsReturnComeBets')
  },

  /**
   * Complete the round — sync wallet, update stats.
   */
  crapsCompleteRound: async (ctx: ThunkCtx) => {
    const state = ctx.getState()
    const craps = state.craps
    if (!craps) return

    await ctx.dispatch('crapsSetRoundCompleteReady', true)
    await ctx.dispatch('setDealerMessage', null)
  },
}

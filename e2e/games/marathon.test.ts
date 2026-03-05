/**
 * Marathon tests — 10 rounds of each game.
 * Validates wallet stays positive and integer throughout.
 */
import { test, expect } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import {
  playBlackjackRound,
  playBjcRound,
  playHoldemRound,
  playDrawRound,
  playTcpRound,
  playRouletteRound,
  playCrapsRound,
} from '../helpers/strategies'
import { extractWalletBalance } from '../helpers/wallet-helpers'

const MARATHON_ROUNDS = 10

test.describe('Marathon — sustained play', () => {
  test('Hold\'em: 10 rounds with wallet tracking', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'holdem', 'MarathonHoldem')
    const startBalance = await extractWalletBalance(controllerPage)
    expect(startBalance).toBeGreaterThan(0)

    for (let i = 0; i < MARATHON_ROUNDS; i++) {
      await playHoldemRound(controllerPage)
      const balance = await extractWalletBalance(controllerPage)
      expect(balance).toBeGreaterThan(0)
      expect(Number.isInteger(balance)).toBe(true)
    }
  })

  test('Blackjack Classic: 10 rounds with wallet tracking', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'blackjack_classic', 'MarathonBJ')
    const startBalance = await extractWalletBalance(controllerPage)
    expect(startBalance).toBeGreaterThan(0)

    for (let i = 0; i < MARATHON_ROUNDS; i++) {
      await playBlackjackRound(controllerPage)
      const balance = await extractWalletBalance(controllerPage)
      expect(balance).toBeGreaterThan(0)
      expect(Number.isInteger(balance)).toBe(true)
    }
  })

  test('Competitive Blackjack: 10 rounds with wallet tracking', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'blackjack_competitive', 'MarathonBJC')
    const startBalance = await extractWalletBalance(controllerPage)
    expect(startBalance).toBeGreaterThan(0)

    for (let i = 0; i < MARATHON_ROUNDS; i++) {
      await playBjcRound(controllerPage)
      const balance = await extractWalletBalance(controllerPage)
      expect(balance).toBeGreaterThan(0)
      expect(Number.isInteger(balance)).toBe(true)
    }
  })

  test('5-Card Draw: 10 rounds with wallet tracking', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'five_card_draw', 'MarathonDraw')
    const startBalance = await extractWalletBalance(controllerPage)
    expect(startBalance).toBeGreaterThan(0)

    for (let i = 0; i < MARATHON_ROUNDS; i++) {
      await playDrawRound(controllerPage)
      const balance = await extractWalletBalance(controllerPage)
      expect(balance).toBeGreaterThan(0)
      expect(Number.isInteger(balance)).toBe(true)
    }
  })

  test('Three Card Poker: 10 rounds with wallet tracking', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'three_card_poker', 'MarathonTCP')
    const startBalance = await extractWalletBalance(controllerPage)
    expect(startBalance).toBeGreaterThan(0)

    for (let i = 0; i < MARATHON_ROUNDS; i++) {
      await playTcpRound(controllerPage)
      const balance = await extractWalletBalance(controllerPage)
      expect(balance).toBeGreaterThan(0)
      expect(Number.isInteger(balance)).toBe(true)
    }
  })

  test('Roulette: 10 rounds with wallet tracking', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'roulette', 'MarathonRoulette')
    const startBalance = await extractWalletBalance(controllerPage)
    expect(startBalance).toBeGreaterThan(0)

    for (let i = 0; i < MARATHON_ROUNDS; i++) {
      await playRouletteRound(controllerPage)
      const balance = await extractWalletBalance(controllerPage)
      expect(balance).toBeGreaterThan(0)
      expect(Number.isInteger(balance)).toBe(true)
    }
  })

  test('Craps: 10 rounds with wallet tracking', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'craps', 'MarathonCraps')
    const startBalance = await extractWalletBalance(controllerPage)
    expect(startBalance).toBeGreaterThan(0)

    for (let i = 0; i < MARATHON_ROUNDS; i++) {
      await playCrapsRound(controllerPage)
      const balance = await extractWalletBalance(controllerPage)
      expect(balance).toBeGreaterThan(0)
      expect(Number.isInteger(balance)).toBe(true)
    }
  })
})

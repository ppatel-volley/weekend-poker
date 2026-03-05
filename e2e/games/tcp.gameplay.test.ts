import { test, expect } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playTcpRound } from '../helpers/strategies'
import { extractWalletBalance } from '../helpers/wallet-helpers'

test.describe('Three Card Poker Gameplay', () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'three_card_poker', 'TCPPlayer')
    const before = await extractWalletBalance(controllerPage)
    await playTcpRound(controllerPage)
    const after = await extractWalletBalance(controllerPage)
    expect(after).toBeGreaterThan(0)
    expect(Number.isInteger(after)).toBe(true)
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'three_card_poker', 'TCPPlayer')
    const startBalance = await extractWalletBalance(controllerPage)
    expect(startBalance).toBeGreaterThan(0)
    for (let i = 0; i < 3; i++) {
      await playTcpRound(controllerPage)
      const balance = await extractWalletBalance(controllerPage)
      expect(balance).toBeGreaterThan(0)
    }
  })
})

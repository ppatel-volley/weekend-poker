import { test, expect } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playDrawRound } from '../helpers/strategies'
import { extractWalletBalance } from '../helpers/wallet-helpers'

test.describe('5-Card Draw Gameplay', () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'five_card_draw', 'DrawPlayer')
    const before = await extractWalletBalance(controllerPage)
    await playDrawRound(controllerPage)
    const after = await extractWalletBalance(controllerPage)
    expect(after).toBeGreaterThan(0)
    expect(Number.isInteger(after)).toBe(true)
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'five_card_draw', 'DrawPlayer')
    const startBalance = await extractWalletBalance(controllerPage)
    expect(startBalance).toBeGreaterThan(0)
    for (let i = 0; i < 3; i++) {
      await playDrawRound(controllerPage)
      const balance = await extractWalletBalance(controllerPage)
      expect(balance).toBeGreaterThan(0)
    }
  })
})

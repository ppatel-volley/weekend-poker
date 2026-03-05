import { test, expect } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playRouletteRound } from '../helpers/strategies'
import { extractWalletBalance } from '../helpers/wallet-helpers'

test.describe('Roulette Gameplay', () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'roulette', 'RoulettePlayer')
    const before = await extractWalletBalance(controllerPage)
    await playRouletteRound(controllerPage)
    const after = await extractWalletBalance(controllerPage)
    expect(after).toBeGreaterThan(0)
    expect(Number.isInteger(after)).toBe(true)
    await expect(controllerPage.getByText(/Round 2/i)).toBeVisible({ timeout: 10_000 })
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'roulette', 'RoulettePlayer')
    const startBalance = await extractWalletBalance(controllerPage)
    expect(startBalance).toBeGreaterThan(0)
    for (let i = 0; i < 3; i++) {
      await playRouletteRound(controllerPage)
      const balance = await extractWalletBalance(controllerPage)
      expect(balance).toBeGreaterThan(0)
    }
    await expect(controllerPage.getByText(/Round 4/i)).toBeVisible({ timeout: 10_000 })
  })
})

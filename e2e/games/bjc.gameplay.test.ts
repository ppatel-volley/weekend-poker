import { test, expect } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playBjcRound } from '../helpers/strategies'
import { extractWalletBalance } from '../helpers/wallet-helpers'

test.describe('Competitive Blackjack Gameplay', () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'blackjack_competitive', 'BJCPlayer')
    const before = await extractWalletBalance(controllerPage)
    await playBjcRound(controllerPage)
    const after = await extractWalletBalance(controllerPage)
    expect(after).toBeGreaterThan(0)
    expect(Number.isInteger(after)).toBe(true)
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'blackjack_competitive', 'BJCPlayer')
    const startBalance = await extractWalletBalance(controllerPage)
    expect(startBalance).toBeGreaterThan(0)
    for (let i = 0; i < 3; i++) {
      await playBjcRound(controllerPage)
      const balance = await extractWalletBalance(controllerPage)
      expect(balance).toBeGreaterThan(0)
    }
  })
})

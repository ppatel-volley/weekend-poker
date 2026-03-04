import { test, expect } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playRouletteRound } from '../helpers/strategies'

test.describe('Roulette Gameplay', () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'roulette', 'RoulettePlayer')
    // playRouletteRound waits for the next round's betting phase to appear,
    // which proves the round completed (spin + result + payout all happened).
    await playRouletteRound(controllerPage)
    // Verify we're on round 2 (proves round 1 completed)
    await expect(controllerPage.getByText(/Round 2/i)).toBeVisible({ timeout: 10_000 })
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'roulette', 'RoulettePlayer')
    for (let i = 0; i < 3; i++) {
      await playRouletteRound(controllerPage)
    }
    // After 3 rounds, should be on round 4
    await expect(controllerPage.getByText(/Round 4/i)).toBeVisible({ timeout: 10_000 })
  })
})

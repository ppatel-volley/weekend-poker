import { test } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playRouletteRound } from '../helpers/strategies'
import { waitForHandResult } from '../helpers/wait-helpers'

test.describe('Roulette Gameplay', () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'roulette', 'RoulettePlayer')
    await playRouletteRound(controllerPage)
    await waitForHandResult(controllerPage)
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'roulette', 'RoulettePlayer')
    for (let i = 0; i < 3; i++) {
      await playRouletteRound(controllerPage)
      await waitForHandResult(controllerPage)
      // Wait for next round to auto-start
      await controllerPage.waitForTimeout(3_000)
    }
  })
})

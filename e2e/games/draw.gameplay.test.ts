import { test } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playDrawRound } from '../helpers/strategies'
import { waitForHandResult } from '../helpers/wait-helpers'

test.describe('5-Card Draw Gameplay', () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'five_card_draw', 'DrawPlayer')
    await playDrawRound(controllerPage)
    await waitForHandResult(controllerPage)
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'five_card_draw', 'DrawPlayer')
    for (let i = 0; i < 3; i++) {
      await playDrawRound(controllerPage)
      await waitForHandResult(controllerPage)
      await controllerPage.waitForTimeout(3_000)
    }
  })
})

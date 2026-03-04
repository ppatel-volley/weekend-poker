import { test } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playBjcRound } from '../helpers/strategies'
import { waitForHandResult } from '../helpers/wait-helpers'

test.describe('Competitive Blackjack Gameplay', () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'blackjack_competitive', 'BJCPlayer')
    await playBjcRound(controllerPage)
    await waitForHandResult(controllerPage)
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'blackjack_competitive', 'BJCPlayer')
    for (let i = 0; i < 3; i++) {
      await playBjcRound(controllerPage)
      await waitForHandResult(controllerPage)
      await controllerPage.waitForTimeout(3_000)
    }
  })
})

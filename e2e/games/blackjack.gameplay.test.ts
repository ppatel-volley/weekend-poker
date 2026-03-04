import { test } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playBlackjackRound } from '../helpers/strategies'
import { waitForHandResult } from '../helpers/wait-helpers'

test.describe('Blackjack Classic Gameplay', () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'blackjack_classic', 'BJPlayer')
    await playBlackjackRound(controllerPage)
    await waitForHandResult(controllerPage)
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'blackjack_classic', 'BJPlayer')
    for (let i = 0; i < 3; i++) {
      await playBlackjackRound(controllerPage)
      await waitForHandResult(controllerPage)
      await controllerPage.waitForTimeout(3_000)
    }
  })
})

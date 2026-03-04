import { test } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playTcpRound } from '../helpers/strategies'
import { waitForHandResult } from '../helpers/wait-helpers'

test.describe('Three Card Poker Gameplay', () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'three_card_poker', 'TCPPlayer')
    await playTcpRound(controllerPage)
    await waitForHandResult(controllerPage)
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'three_card_poker', 'TCPPlayer')
    for (let i = 0; i < 3; i++) {
      await playTcpRound(controllerPage)
      await waitForHandResult(controllerPage)
      await controllerPage.waitForTimeout(3_000)
    }
  })
})

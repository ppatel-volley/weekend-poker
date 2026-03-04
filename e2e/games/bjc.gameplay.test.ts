import { test } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playBjcRound } from '../helpers/strategies'

test.describe('Competitive Blackjack Gameplay', () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'blackjack_competitive', 'BJCPlayer')
    await playBjcRound(controllerPage)
    // Strategy already waits for next round's ante display, proving round completed
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'blackjack_competitive', 'BJCPlayer')
    for (let i = 0; i < 3; i++) {
      await playBjcRound(controllerPage)
    }
  })
})

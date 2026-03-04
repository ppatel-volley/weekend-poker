import { test } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playBlackjackRound } from '../helpers/strategies'

test.describe('Blackjack Classic Gameplay', () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'blackjack_classic', 'BJPlayer')
    await playBlackjackRound(controllerPage)
    // Strategy already waits for next round's place-bet-btn, proving round completed
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'blackjack_classic', 'BJPlayer')
    for (let i = 0; i < 3; i++) {
      await playBlackjackRound(controllerPage)
    }
  })
})

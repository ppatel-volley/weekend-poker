import { test } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playCrapsRound } from '../helpers/strategies'

test.describe('Craps Gameplay', () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'craps', 'CrapsPlayer')
    await playCrapsRound(controllerPage)
    // Strategy already waits for next round's pass-line-btn, proving round completed
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'craps', 'CrapsPlayer')
    for (let i = 0; i < 3; i++) {
      await playCrapsRound(controllerPage)
    }
  })
})

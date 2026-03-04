import { test } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playHoldemRound } from '../helpers/strategies'

test.describe("Texas Hold'em Gameplay", () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'holdem', 'HoldemPlayer')
    await playHoldemRound(controllerPage)
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'holdem', 'HoldemPlayer')
    for (let i = 0; i < 3; i++) {
      await playHoldemRound(controllerPage)
    }
  })
})

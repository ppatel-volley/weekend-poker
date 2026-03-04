import { test } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playHoldemRound } from '../helpers/strategies'

test.describe("Texas Hold'em Gameplay", () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.fixme('completes a single round', async ({ controllerPage, displayPage }) => {
    // Bot auto-turn not implemented — bots don't auto-act during their turn
    await startGame(controllerPage, displayPage, 'holdem', 'HoldemPlayer')
    await playHoldemRound(controllerPage)
  })

  // eslint-disable-next-line playwright/no-skipped-test
  test.fixme('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    // Bot auto-turn not implemented — bots don't auto-act during their turn
    await startGame(controllerPage, displayPage, 'holdem', 'HoldemPlayer')
    for (let i = 0; i < 3; i++) {
      await playHoldemRound(controllerPage)
    }
  })
})

import { test } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playDrawRound } from '../helpers/strategies'

test.describe('5-Card Draw Gameplay', () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.fixme('completes a single round', async ({ controllerPage, displayPage }) => {
    // Bot auto-turn not implemented — bots don't auto-act during their turn
    await startGame(controllerPage, displayPage, 'five_card_draw', 'DrawPlayer')
    await playDrawRound(controllerPage)
  })

  // eslint-disable-next-line playwright/no-skipped-test
  test.fixme('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    // Bot auto-turn not implemented — bots don't auto-act during their turn
    await startGame(controllerPage, displayPage, 'five_card_draw', 'DrawPlayer')
    for (let i = 0; i < 3; i++) {
      await playDrawRound(controllerPage)
    }
  })
})

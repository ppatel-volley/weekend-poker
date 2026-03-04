import { test, expect } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'
import { playCrapsRound } from '../helpers/strategies'

test.describe('Craps Gameplay', () => {
  test('completes a single round', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'craps', 'CrapsPlayer')
    await playCrapsRound(controllerPage)
    // Craps uses outcome-text testid instead of standard result text
    await expect(
      controllerPage.getByTestId('outcome-text')
        .or(controllerPage.getByText(/WON|LOST|Natural|Craps|Point/i))
    ).toBeVisible({ timeout: 60_000 })
  })

  test('plays 3 consecutive rounds', async ({ controllerPage, displayPage }) => {
    await startGame(controllerPage, displayPage, 'craps', 'CrapsPlayer')
    for (let i = 0; i < 3; i++) {
      await playCrapsRound(controllerPage)
      await expect(
        controllerPage.getByTestId('outcome-text')
          .or(controllerPage.getByText(/WON|LOST|Natural|Craps|Point/i))
      ).toBeVisible({ timeout: 60_000 })
      await controllerPage.waitForTimeout(3_000)
    }
  })
})

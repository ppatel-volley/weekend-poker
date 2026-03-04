import { test, expect } from '../fixtures/casino-fixture'
import { bjcStand } from '../helpers/game-actions'

test.describe('Two-Player Competitive Blackjack', () => {
  test('both players complete a round', async ({
    controllerPage,
    controllerPage2,
    displayPage,
  }) => {
    // Player 1 joins and selects BJC
    const nameInput = controllerPage.locator('#player-name')
    await expect(nameInput).toBeVisible({ timeout: 10_000 })
    await nameInput.fill('Alice')
    await controllerPage.getByRole('button', { name: 'Competitive Blackjack' }).click()
    await controllerPage.getByRole('button', { name: /^READY$/i }).click()

    // Player 2 joins
    const nameInput2 = controllerPage2.locator('#player-name')
    await expect(nameInput2).toBeVisible({ timeout: 10_000 })
    await nameInput2.fill('Bob')
    await controllerPage2.getByRole('button', { name: /^READY$/i }).click()

    // Player 1 starts
    const startButton = controllerPage.getByRole('button', { name: /START/i })
    await expect(startButton).toBeVisible({ timeout: 10_000 })
    await startButton.click()

    // Both should see game UI
    await expect(controllerPage.getByTestId('game-heading')).toBeVisible({ timeout: 30_000 })
    await expect(controllerPage2.getByTestId('game-heading')).toBeVisible({ timeout: 30_000 })

    // BJC has auto-ante, wait for player turns then both stand
    for (const page of [controllerPage, controllerPage2]) {
      const standBtn = page.getByTestId('stand-btn')
      const result = page.getByText(/WON \$|LOST \$|WINNER/i)

      await expect(standBtn.or(result)).toBeVisible({ timeout: 30_000 })
      if (await standBtn.isVisible().catch(() => false)) {
        await bjcStand(page)
      }
    }

    // Verify results appear on both controllers
    await expect(
      controllerPage.getByText(/WON \$|LOST \$|WINNER/i)
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      controllerPage2.getByText(/WON \$|LOST \$|WINNER/i)
    ).toBeVisible({ timeout: 30_000 })
  })
})

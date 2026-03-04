import { test, expect } from '../fixtures/casino-fixture'
import { holdemCallOrCheck } from '../helpers/game-actions'

test.describe("Two-Player Hold'em", () => {
  test('both players complete a round', async ({
    controllerPage,
    controllerPage2,
    displayPage,
  }) => {
    // Player 1 joins and selects game
    const nameInput = controllerPage.locator('#player-name')
    await expect(nameInput).toBeVisible({ timeout: 10_000 })
    await nameInput.fill('Alice')
    await controllerPage.getByRole('button', { name: "Texas Hold'em" }).click()
    await controllerPage.getByRole('button', { name: /^READY$/i }).click()

    // Player 2 joins
    const nameInput2 = controllerPage2.locator('#player-name')
    await expect(nameInput2).toBeVisible({ timeout: 10_000 })
    await nameInput2.fill('Bob')
    await controllerPage2.getByRole('button', { name: /^READY$/i }).click()

    // Player 1 starts the game
    const startButton = controllerPage.getByRole('button', { name: /START/i })
    await expect(startButton).toBeVisible({ timeout: 10_000 })
    await startButton.click()

    // Both should see game UI
    await expect(controllerPage.getByTestId('game-heading')).toBeVisible({ timeout: 30_000 })
    await expect(controllerPage2.getByTestId('game-heading')).toBeVisible({ timeout: 30_000 })

    // Play through betting rounds — each player acts on their turn
    for (let phase = 0; phase < 4; phase++) {
      // Check which player's turn it is and act
      for (const page of [controllerPage, controllerPage2]) {
        const myTurn = page.getByText('Your turn!')
        const result = page.getByText(/WON \$|LOST \$|Hand complete/i)

        await expect(myTurn.or(result)).toBeVisible({ timeout: 30_000 })

        if (await result.isVisible().catch(() => false)) break
        if (await myTurn.isVisible().catch(() => false)) {
          await holdemCallOrCheck(page)
          await page.waitForTimeout(1_000)
        }
      }

      // Check if hand is over
      const result1 = controllerPage.getByText(/WON \$|LOST \$|Hand complete/i)
      if (await result1.isVisible().catch(() => false)) break
    }

    // Verify both players see a result
    await expect(
      controllerPage.getByText(/WON \$|LOST \$|Hand complete/i)
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      controllerPage2.getByText(/WON \$|LOST \$|Hand complete/i)
    ).toBeVisible({ timeout: 30_000 })
  })
})

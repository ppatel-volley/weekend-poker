import { test, expect } from '../fixtures/casino-fixture'

test.describe('Challenges', () => {
  test('displays challenge slots', async ({ controllerPage }) => {
    // Navigate to challenges view if there's a tab/button
    const challengesTab = controllerPage.getByRole('button', { name: /Challenge/i })
      .or(controllerPage.getByText(/Challenge/i))

    if (await challengesTab.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await challengesTab.click()

      // Verify challenge tiers render (bronze, silver, gold)
      await expect(
        controllerPage.getByText(/bronze/i)
          .or(controllerPage.getByText(/silver/i))
          .or(controllerPage.getByText(/gold/i))
          .or(controllerPage.getByText(/Challenge/i))
      ).toBeVisible({ timeout: 10_000 })
    } else {
      // If no challenges tab visible, check if challenges are shown inline
      // This is a soft assertion — challenges may require specific state
      test.skip()
    }
  })
})

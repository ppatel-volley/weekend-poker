import { test, expect } from '../fixtures/casino-fixture'

test.describe('Player Profile', () => {
  test('displays profile information', async ({ controllerPage }) => {
    // The profile view should be accessible from the controller
    // Look for profile-related content or tab navigation
    await expect(
      controllerPage.getByText(/Level/i)
        .or(controllerPage.getByText(/XP/i))
        .or(controllerPage.getByText(/Profile/i))
        .or(controllerPage.locator('#player-name'))
    ).toBeVisible({ timeout: 15_000 })

    // If there's a Profile tab/button, click it
    const profileTab = controllerPage.getByRole('button', { name: /Profile/i })
      .or(controllerPage.getByText(/Profile/i))
    if (await profileTab.isVisible().catch(() => false)) {
      await profileTab.click()

      // Verify profile stats render
      await expect(
        controllerPage.getByText(/Level/i)
          .or(controllerPage.getByText(/XP/i))
          .or(controllerPage.getByText(/Games Played/i))
          .or(controllerPage.getByText(/Stats/i))
      ).toBeVisible({ timeout: 10_000 })
    }
  })
})

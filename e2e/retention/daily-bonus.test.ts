import { test, expect } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'

test.describe('Daily Bonus', () => {
  test('shows bonus on first connection', async ({ controllerPage, displayPage }) => {
    // Start a game — the daily bonus shows on the profile view
    await startGame(controllerPage, displayPage, 'roulette', 'BonusPlayer')

    // Navigate to Profile tab
    const profileTab = controllerPage.getByRole('button', { name: 'Profile' })
    await expect(profileTab).toBeVisible({ timeout: 5_000 })
    await profileTab.click()

    // Profile view should show "Daily Bonus" heading
    await expect(
      controllerPage.getByRole('heading', { name: 'Daily Bonus' })
    ).toBeVisible({ timeout: 10_000 })
  })
})

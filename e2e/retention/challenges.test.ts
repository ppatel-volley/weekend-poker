import { test, expect } from '../fixtures/casino-fixture'
import { startGame } from '../helpers/lobby-flow'

test.describe('Challenges', () => {
  test('displays challenge slots', async ({ controllerPage, displayPage }) => {
    // Start a game so the tab bar appears (only visible during gameplay)
    await startGame(controllerPage, displayPage, 'roulette', 'ChallengePlayer')

    // Click Challenges tab
    const challengesTab = controllerPage.getByRole('button', { name: 'Challenges' })
    await expect(challengesTab).toBeVisible({ timeout: 5_000 })
    await challengesTab.click()

    // Verify actual challenge content renders (not just loading state).
    // The ChallengesView shows lowercase tier names: "bronze slot", "silver slot", "gold slot"
    // or challenge descriptions if active challenges exist.
    await expect(
      controllerPage.getByText(/bronze|silver|gold/i).first()
    ).toBeVisible({ timeout: 15_000 })
  })
})

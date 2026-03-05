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

    // Verify challenge content renders — look for the loading or actual challenge UI
    await expect(
      controllerPage.getByText('Loading challenges...')
        .or(controllerPage.getByText('Bronze', { exact: true }))
        .or(controllerPage.getByText('Silver', { exact: true }))
        .or(controllerPage.getByText('Gold', { exact: true }))
    ).toBeVisible({ timeout: 10_000 })
  })
})

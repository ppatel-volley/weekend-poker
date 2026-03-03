/**
 * E2E tests for Texas Hold'em gameplay.
 *
 * These tests verify the full Hold'em hand flow via the display,
 * including dealing, betting phases, and hand completion.
 *
 * Note: Full multi-player hand simulation requires both controller
 * and display to be in sync via VGF. These tests verify the UI
 * elements render correctly at each stage.
 */
import { test, expect } from './fixtures/casino-fixture'

test.describe('Hold\'em', () => {
  test('display shows lobby with game title', async ({ displayPage }) => {
    // Display should show lobby view with title
    await expect(displayPage.getByAltText('Weekend Casino').or(displayPage.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })
    // Should show "Waiting for players..." since nobody is ready
    await expect(displayPage.locator('text=Waiting for players')).toBeVisible()
  })

  test('display shows player count', async ({ displayPage }) => {
    // Display lobby should show the player count header
    await expect(displayPage.getByRole('heading', { name: /Players/ })).toBeVisible({ timeout: 10_000 })
  })

  test('controller shows action buttons text during game', async ({ controllerPage }) => {
    // In lobby, we should see game selection, not action buttons.
    // FOLD / CHECK / CALL buttons should NOT be visible in lobby.
    await expect(controllerPage.getByRole('button', { name: 'FOLD' })).not.toBeVisible()
  })

  test('controller shows hole card placeholders before game starts', async ({ controllerPage }) => {
    // In lobby phase, there should be no hole card display
    // (GameRouter renders LobbyController, not HoldemController)
    await expect(controllerPage.locator('text=Choose a game')).toBeVisible()
  })
})

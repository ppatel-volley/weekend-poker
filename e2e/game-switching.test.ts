/**
 * E2E tests for game switching.
 *
 * Verifies that the controller can select different games from the lobby,
 * and that the game selection UI highlights the chosen game.
 */
import { test, expect } from './fixtures/casino-fixture'

test.describe('Game switching', () => {
  test('controller shows all v1 game buttons', async ({ controllerPage }) => {
    await expect(controllerPage.getByRole('button', { name: "Texas Hold'em" })).toBeVisible()
    await expect(controllerPage.getByRole('button', { name: '5-Card Draw' })).toBeVisible()
    await expect(controllerPage.getByRole('button', { name: 'Blackjack' })).toBeVisible()
    await expect(controllerPage.getByRole('button', { name: 'Competitive Blackjack' })).toBeVisible()
  })

  test('selecting a game highlights the button', async ({ controllerPage, selectGame }) => {
    await selectGame(controllerPage, "Texas Hold'em")

    // The selected button should have a green border (visual check via style)
    const holdemButton = controllerPage.getByRole('button', { name: "Texas Hold'em" })
    await expect(holdemButton).toBeVisible()
    // Check it got the selected style (green border)
    await expect(holdemButton).toHaveCSS('border-color', 'rgb(74, 222, 128)')
  })

  test('can switch game selection', async ({ controllerPage, selectGame }) => {
    // Select Hold'em first
    await selectGame(controllerPage, "Texas Hold'em")

    // Then switch to 5-Card Draw
    await selectGame(controllerPage, '5-Card Draw')

    // The 5-Card Draw button should be highlighted
    const drawButton = controllerPage.getByRole('button', { name: '5-Card Draw' })
    await expect(drawButton).toHaveCSS('border-color', 'rgb(74, 222, 128)')
  })
})

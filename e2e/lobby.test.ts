/**
 * E2E tests for the Casino Lobby flow.
 *
 * Covers: loading controller, joining session, display player list,
 * ready toggle, and transition to game selection.
 */
import { test, expect } from './fixtures/casino-fixture'

test.describe('Lobby', () => {
  test('controller loads and shows lobby UI', async ({ controllerPage }) => {
    // The controller should show the lobby with logo image
    await expect(controllerPage.getByAltText('Weekend Casino')).toBeVisible()
    await expect(controllerPage.locator('#player-name')).toBeVisible()
    await expect(controllerPage.getByRole('button', { name: /READY/i })).toBeVisible()
  })

  test('player can enter name and join session', async ({ controllerPage, joinSession }) => {
    await joinSession(controllerPage, 'TestPlayer')

    // After clicking READY, the button text should change
    const readyButton = controllerPage.getByRole('button', { name: /READY/i })
    await expect(readyButton).toBeVisible()
    // After ready, status text shows game selection prompt or start instruction
    await expect(
      controllerPage.locator('text=Select a game to start')
        .or(controllerPage.locator('text=Tap START to begin!'))
    ).toBeVisible()
  })

  test('display shows connected players', async ({ displayPage, controllerPage, sessionId, joinSession }) => {
    // Join from controller
    await joinSession(controllerPage, 'Alice')

    // The display lobby should show "Players (1/4)" or similar
    await expect(displayPage.getByRole('heading', { name: /Players/ })).toBeVisible({ timeout: 10_000 })
  })

  test('display shows lobby title', async ({ displayPage }) => {
    await expect(displayPage.getByAltText('Weekend Casino').or(displayPage.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })
  })

  test('game selection buttons appear on controller', async ({ controllerPage }) => {
    // The LobbyController shows game selection buttons
    await expect(controllerPage.locator('text=Choose a game')).toBeVisible()
    await expect(controllerPage.getByRole('button', { name: "Texas Hold'em" })).toBeVisible()
  })

  test('controller shows no-session error without sessionId', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await page.goto('http://localhost:5174')
    await expect(page.locator('text=No Session Found')).toBeVisible()
    await context.close()
  })
})

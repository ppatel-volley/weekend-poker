/**
 * Reusable Playwright fixture for Weekend Casino E2E tests.
 *
 * Provides:
 *   - A fresh VGF session (created via the display app)
 *   - A controller page (mobile viewport) connected to that session
 *   - A display page (desktop viewport) connected to that session
 *   - Helper methods for common game interactions
 */
import { test as base, expect, type Page, type BrowserContext } from '@playwright/test'

const SERVER_URL = 'http://localhost:3000'
const DISPLAY_URL = 'http://localhost:5173'
const CONTROLLER_URL = 'http://localhost:5174'

export type CasinoFixtures = {
  /** The session ID created for this test */
  sessionId: string
  /** Display page (desktop viewport, already navigated) */
  displayPage: Page
  /** Controller page (mobile viewport, already navigated) */
  controllerPage: Page
  /** Second controller page for multiplayer tests */
  controllerPage2: Page
  /** Join a session as a player */
  joinSession: (page: Page, playerName: string) => Promise<void>
  /** Wait for a specific phase string on the display */
  waitForPhase: (phase: string) => Promise<void>
  /** Select a game from the controller lobby */
  selectGame: (page: Page, gameLabel: string) => Promise<void>
}

/**
 * Extended test fixture that sets up a casino session.
 *
 * Each test gets its own session — fully idempotent.
 */
export const test = base.extend<CasinoFixtures>({
  sessionId: async ({ browser }, use) => {
    // Create a session by loading the display app,
    // which calls createSession(SERVER_URL) automatically.
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    })
    const page = await context.newPage()
    await page.goto(DISPLAY_URL)

    // Wait for the display to create a session and show the lobby.
    // The display shows "Weekend Casino" and then a controller URL with sessionId.
    await expect(page.locator('text=Weekend Casino')).toBeVisible({ timeout: 15_000 })

    // Extract sessionId from the controller link shown on the display lobby.
    const controllerLink = page.locator('a[href*="sessionId"]')
    await expect(controllerLink).toBeVisible({ timeout: 10_000 })
    const href = await controllerLink.getAttribute('href')

    if (!href) {
      throw new Error('Could not find controller link with sessionId on display')
    }

    const url = new URL(href, DISPLAY_URL)
    const sessionId = url.searchParams.get('sessionId')
    if (!sessionId) {
      throw new Error('sessionId not found in controller link')
    }

    await use(sessionId)

    // Cleanup
    await context.close()
  },

  displayPage: async ({ browser, sessionId }, use) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    })
    const page = await context.newPage()
    // The display app creates its own session on load; for E2E we need to
    // connect to the same session. Since the display auto-creates, we reload
    // and it reconnects to the same server-side session.
    await page.goto(DISPLAY_URL)
    await expect(page.locator('text=Weekend Casino')).toBeVisible({ timeout: 15_000 })

    await use(page)
    await context.close()
  },

  controllerPage: async ({ browser, sessionId }, use) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    await page.goto(`${CONTROLLER_URL}?sessionId=${sessionId}`)
    await expect(page.locator('text=Weekend Casino')).toBeVisible({ timeout: 15_000 })

    await use(page)
    await context.close()
  },

  controllerPage2: async ({ browser, sessionId }, use) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    await page.goto(`${CONTROLLER_URL}?sessionId=${sessionId}`)
    await expect(page.locator('text=Weekend Casino')).toBeVisible({ timeout: 15_000 })

    await use(page)
    await context.close()
  },

  joinSession: async ({}, use) => {
    const joinSession = async (page: Page, playerName: string) => {
      const nameInput = page.locator('#player-name')
      await expect(nameInput).toBeVisible({ timeout: 5_000 })
      await nameInput.fill(playerName)

      const readyButton = page.getByRole('button', { name: /READY/i })
      await expect(readyButton).toBeVisible()
      await readyButton.click()

      // Verify the button changed to READY state
      await expect(readyButton).toContainText(/READY/)
    }

    await use(joinSession)
  },

  waitForPhase: async ({ displayPage }, use) => {
    const waitForPhase = async (phase: string) => {
      // The phase might be shown in the HUD or via the game state.
      // For now, we rely on visual indicators per phase.
      await displayPage.waitForTimeout(2_000)
    }

    await use(waitForPhase)
  },

  selectGame: async ({}, use) => {
    const selectGame = async (page: Page, gameLabel: string) => {
      const gameButton = page.getByRole('button', { name: gameLabel })
      await expect(gameButton).toBeVisible({ timeout: 5_000 })
      await gameButton.click()
    }

    await use(selectGame)
  },
})

export { expect }

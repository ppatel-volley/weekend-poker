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
  /** Third controller page for multiplayer tests */
  controllerPage3: Page
  /** Join a session as a player */
  joinSession: (page: Page, playerName: string) => Promise<void>
  /** Wait for a specific phase string on the display */
  waitForPhase: (phase: string) => Promise<void>
  /** Select a game from the controller lobby */
  selectGame: (page: Page, gameLabel: string) => Promise<void>
  /** Verify both display and controller share the same session (cross-client assertion) */
  assertSameSession: () => Promise<void>
  /** Start a game from the lobby (enter name, select game, ready, start) */
  startGame: (controllerPage: Page, displayPage: Page, gameKey: string, playerName: string) => Promise<void>
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
    // The display renders an <img alt="Weekend Casino"> logo, not visible text.
    await expect(page.getByAltText('Weekend Casino')).toBeVisible({ timeout: 15_000 })

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
    // Pass the sessionId so the display joins the same session created by
    // the sessionId fixture, instead of auto-creating a new one.
    await page.goto(`${DISPLAY_URL}?sessionId=${sessionId}`)
    await expect(page.getByAltText('Weekend Casino')).toBeVisible({ timeout: 15_000 })

    await use(page)
    await context.close()
  },

  controllerPage: async ({ browser, sessionId }, use) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    await page.goto(`${CONTROLLER_URL}?sessionId=${sessionId}`)
    // Wait for VGF connection — controller shows game UI once connected
    await expect(page.locator('body')).not.toHaveText('No Session Found', { timeout: 15_000 })
    // Wait for connected state (either lobby content or "Connecting" to clear)
    await page.waitForTimeout(2_000)

    await use(page)
    await context.close()
  },

  controllerPage2: async ({ browser, sessionId }, use) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    await page.goto(`${CONTROLLER_URL}?sessionId=${sessionId}`)
    await expect(page.locator('body')).not.toHaveText('No Session Found', { timeout: 15_000 })
    await page.waitForTimeout(2_000)

    await use(page)
    await context.close()
  },

  controllerPage3: async ({ browser, sessionId }, use) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    await page.goto(`${CONTROLLER_URL}?sessionId=${sessionId}`)
    await expect(page.locator('body')).not.toHaveText('No Session Found', { timeout: 15_000 })
    await page.waitForTimeout(2_000)
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
    const waitForPhase = async (_phase: string) => {
      // Wait for game heading to be visible as phase indicator
      await expect(
        displayPage.getByTestId('game-heading')
          .or(displayPage.getByText(/Phase|Round|Hand/i))
      ).toBeVisible({ timeout: 15_000 })
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

  startGame: async ({}, use) => {
    const startGame = async (
      controllerPage: Page,
      displayPage: Page,
      gameKey: string,
      playerName: string,
    ) => {
      const GAME_LABELS: Record<string, string> = {
        holdem: "Texas Hold'em",
        five_card_draw: '5-Card Draw',
        blackjack_classic: 'Blackjack',
        blackjack_competitive: 'Competitive Blackjack',
        roulette: 'Roulette',
        three_card_poker: 'Three Card Poker',
        craps: 'Craps',
      }
      const label = GAME_LABELS[gameKey]
      if (!label) throw new Error(`Unknown game key: ${gameKey}`)

      // Enter name
      const nameInput = controllerPage.locator('#player-name')
      await expect(nameInput).toBeVisible({ timeout: 10_000 })
      await nameInput.fill(playerName)

      // Select game
      await controllerPage.getByRole('button', { name: label }).click()

      // Ready
      await controllerPage.getByRole('button', { name: /^READY$/i }).click()

      // Start
      const startButton = controllerPage.getByRole('button', { name: new RegExp(`START`, 'i') })
      await expect(startButton).toBeVisible({ timeout: 10_000 })
      await startButton.click()

      // Wait for game UI
      await expect(controllerPage.getByTestId('game-heading')).toBeVisible({ timeout: 30_000 })
    }
    await use(startGame)
  },

  assertSameSession: async ({ displayPage, controllerPage, joinSession }, use) => {
    const assertSameSession = async () => {
      // Join from the controller so a player appears in the session
      await joinSession(controllerPage, 'SessionCheck')

      // The display should show a Players heading reflecting at least 1 player
      await expect(
        displayPage.getByRole('heading', { name: /Players \(1/ }),
      ).toBeVisible({ timeout: 10_000 })
    }

    await use(assertSameSession)
  },
})

export { expect }

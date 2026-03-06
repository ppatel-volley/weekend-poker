/**
 * Screenshot capture suite — takes visual snapshots of every game screen
 * for playtester review. Run with: npx playwright test e2e/screenshots.test.ts --project=display
 *
 * Screenshots are saved to e2e/screenshots/ directory.
 */
import { test, expect, type Page } from '@playwright/test'
import path from 'path'

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots')
const DISPLAY_URL = 'http://localhost:5173'
const CONTROLLER_URL = 'http://localhost:5174'
const SERVER_URL = 'http://localhost:3000'

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true })
}

async function createSession(): Promise<string> {
  const response = await fetch(`${SERVER_URL}/api/session`, { method: 'POST' })
  const data = await response.json() as { sessionId: string }
  return data.sessionId
}

test.describe('Visual Screenshots for Playtester Review', () => {
  test.setTimeout(120_000)

  test('capture lobby screens', async ({ browser }) => {
    const sessionId = await createSession()

    // Display lobby (no players)
    const displayCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
    const display = await displayCtx.newPage()
    await display.goto(`${DISPLAY_URL}?sessionId=${sessionId}&userId=display-dev`)
    await display.waitForTimeout(3000)
    await screenshot(display, '01-display-lobby-empty')

    // Controller lobby
    const controllerCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    })
    const controller = await controllerCtx.newPage()
    await controller.goto(`${CONTROLLER_URL}?sessionId=${sessionId}&volley_account=test-player`)
    await controller.waitForTimeout(3000)
    await screenshot(controller, '02-controller-lobby')

    // Display lobby with player
    await display.waitForTimeout(2000)
    await screenshot(display, '03-display-lobby-with-player')

    // Controller name entry
    const nameInput = controller.locator('#player-name')
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('Playtester')
      await screenshot(controller, '04-controller-name-entered')
    }

    await displayCtx.close()
    await controllerCtx.close()
  })

  test('capture game selection screen', async ({ browser }) => {
    const sessionId = await createSession()

    const controllerCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    const controller = await controllerCtx.newPage()
    await controller.goto(`${CONTROLLER_URL}?sessionId=${sessionId}&volley_account=test-player`)
    await controller.waitForTimeout(3000)

    // Fill name and look for game cards
    const nameInput = controller.locator('#player-name')
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('Playtester')
    }
    await controller.waitForTimeout(1000)
    await screenshot(controller, '05-controller-game-selection')

    await controllerCtx.close()
  })

  test('capture display with QR code', async ({ browser }) => {
    const sessionId = await createSession()

    const displayCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
    const display = await displayCtx.newPage()
    await display.goto(`${DISPLAY_URL}?sessionId=${sessionId}&userId=display-dev`)
    await display.waitForTimeout(5000)
    await screenshot(display, '06-display-qr-code')

    await displayCtx.close()
  })

  test('capture each game type controller UI', async ({ browser }) => {
    const games = [
      { key: "Texas Hold'em", file: '07-holdem' },
      { key: '5-Card Draw', file: '08-draw' },
      { key: 'Blackjack', file: '09-blackjack' },
      { key: 'Competitive Blackjack', file: '10-bjc' },
      { key: 'Roulette', file: '11-roulette' },
      { key: 'Three Card Poker', file: '12-tcp' },
      { key: 'Craps', file: '13-craps' },
    ]

    for (const game of games) {
      const sessionId = await createSession()

      const displayCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
      const display = await displayCtx.newPage()
      await display.goto(`${DISPLAY_URL}?sessionId=${sessionId}&userId=display-dev`)

      const controllerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } })
      const controller = await controllerCtx.newPage()
      await controller.goto(`${CONTROLLER_URL}?sessionId=${sessionId}&volley_account=test-player`)
      await controller.waitForTimeout(3000)

      // Fill name
      const nameInput = controller.locator('#player-name')
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill('Playtester')
      }

      // Select game
      const gameLabel = controller.getByText(game.key, { exact: true })
      if (await gameLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gameLabel.click()
        await controller.waitForTimeout(500)
        await screenshot(controller, `${game.file}-controller-selected`)
      }

      // Click READY
      const readyBtn = controller.getByRole('button', { name: /^READY$/i })
      if (await readyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await readyBtn.click()
        await controller.waitForTimeout(500)
      }

      // Click START
      const startBtn = controller.getByRole('button', { name: new RegExp(`START`, 'i') })
      if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await startBtn.click()
        await controller.waitForTimeout(5000)

        // Screenshot game in progress
        await screenshot(controller, `${game.file}-controller-playing`)
        await screenshot(display, `${game.file}-display-playing`)
      }

      await displayCtx.close()
      await controllerCtx.close()
    }
  })
})

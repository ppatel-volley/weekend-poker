import { test, expect } from '@playwright/test'

test.describe('Smoke tests', () => {
  test('display client loads', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })
  })

  test('controller shows no-session error without sessionId', async ({ page }) => {
    await page.goto('http://localhost:5174')
    await expect(page.locator('text=No Session Found')).toBeVisible()
  })

  test('server health check responds', async ({ request }) => {
    const response = await request.get('http://localhost:3000/health')
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.status).toBe('ok')
  })

  test('controller connects to session and reaches lobby', async ({ browser }) => {
    // 1. Create a session via the display
    const displayCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
    const displayPage = await displayCtx.newPage()
    await displayPage.goto('http://localhost:5173')
    await expect(displayPage.getByAltText('Weekend Casino')).toBeVisible({ timeout: 15_000 })

    // 2. Extract sessionId from the controller link on the display
    const controllerLink = displayPage.locator('a[href*="sessionId"]')
    await expect(controllerLink).toBeVisible({ timeout: 10_000 })
    const href = await controllerLink.getAttribute('href')
    expect(href).toBeTruthy()
    const url = new URL(href!, 'http://localhost:5173')
    const sessionId = url.searchParams.get('sessionId')
    expect(sessionId).toBeTruthy()

    // 3. Open controller with the sessionId
    const controllerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const controllerPage = await controllerCtx.newPage()
    await controllerPage.goto(`http://localhost:5174/?sessionId=${sessionId}`)

    // 4. CRITICAL: Controller must NOT get stuck on "Connecting to game..."
    //    It should reach the lobby UI (showing the name input).
    //    This regression test catches the socketOptions.query bug where sessionId
    //    was missing from the WebSocket connection params.
    await expect(controllerPage.locator('#player-name')).toBeVisible({ timeout: 15_000 })

    // 5. Verify we are NOT stuck on "Connecting to game..."
    await expect(controllerPage.getByText('Connecting to game...')).not.toBeVisible()

    await controllerCtx.close()
    await displayCtx.close()
  })
})

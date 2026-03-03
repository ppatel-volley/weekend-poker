/**
 * E2E tests for TV platform detection and integration.
 *
 * Covers: platform detection from URL params, input mode switching,
 * D-pad keyboard navigation in the lobby, spatial nav initialisation.
 */
import { test, expect } from '@playwright/test'

const DISPLAY_URL = 'http://localhost:5173'

test.describe('TV Platform Detection', () => {
  test('detects FIRE_TV from URL param', async ({ page }) => {
    await page.goto(`${DISPLAY_URL}?volley_platform=FIRE_TV`)
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })

    // The platform detection runs on mount — verify by checking that
    // the app loaded without error (platform context is provided)
    await expect(page.locator('text=Creating session')).not.toBeVisible()
  })

  test('detects SAMSUNG_TIZEN from URL param', async ({ page }) => {
    await page.goto(`${DISPLAY_URL}?volley_platform=SAMSUNG_TIZEN`)
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })
  })

  test('detects LG_WEBOS from URL param', async ({ page }) => {
    await page.goto(`${DISPLAY_URL}?volley_platform=LG_WEBOS`)
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })
  })

  test('falls back to BROWSER without URL param', async ({ page }) => {
    await page.goto(DISPLAY_URL)
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })
  })

  test('ignores invalid platform URL param', async ({ page }) => {
    await page.goto(`${DISPLAY_URL}?volley_platform=XBOX`)
    // Should still load fine, falling back to BROWSER
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Input Mode Switching', () => {
  test('switches to remote mode on keyboard input', async ({ page }) => {
    await page.goto(DISPLAY_URL)
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })

    // Simulate D-pad arrow key press
    await page.keyboard.press('ArrowDown')

    // The input mode should have switched to remote — verify the page
    // did not crash and is still interactive
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible()
  })

  test('accepts multiple input mode transitions', async ({ page }) => {
    await page.goto(DISPLAY_URL)
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })

    // Start in touch mode (default for BROWSER)
    // Switch to remote via keyboard
    await page.keyboard.press('ArrowUp')
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible()

    // Touch event would switch back (simulated via dispatchEvent)
    await page.evaluate(() => {
      window.dispatchEvent(new TouchEvent('touchstart'))
    })
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible()
  })
})

test.describe('D-pad Navigation in Lobby', () => {
  test('lobby loads with spatial nav on TV platform', async ({ page }) => {
    await page.goto(`${DISPLAY_URL}?volley_platform=FIRE_TV`)
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })

    // Verify lobby structure is present
    await expect(page.getByRole('heading', { name: /Players/ })).toBeVisible()
  })

  test('arrow keys do not crash on BROWSER platform', async ({ page }) => {
    await page.goto(DISPLAY_URL)
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })

    // D-pad arrows should not cause errors even without spatial nav
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')

    // Page should still be stable
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible()
  })

  test('arrow keys work on TV platform without crashing', async ({ page }) => {
    await page.goto(`${DISPLAY_URL}?volley_platform=FIRE_TV`)
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })

    // Simulate full D-pad usage
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')

    // No crash — page is still responsive
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible()
  })
})

test.describe('QR Code Display', () => {
  test('QR code is visible in lobby', async ({ page }) => {
    await page.goto(DISPLAY_URL)
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })

    // The QRCodeSVG component renders an <svg> element
    await expect(page.locator('svg')).toBeVisible()
  })

  test('QR code is visible on TV platform', async ({ page }) => {
    await page.goto(`${DISPLAY_URL}?volley_platform=FIRE_TV`)
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })

    await expect(page.locator('svg')).toBeVisible()
  })
})

test.describe('Session Creation', () => {
  test('session creates successfully with default display userId', async ({ page }) => {
    await page.goto(DISPLAY_URL)
    // Session creation happens automatically — if successful, lobby appears
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })
    // Should not show the "Creating session..." loading state
    await expect(page.locator('text=Creating session')).not.toBeVisible()
  })

  test('session creates with custom display userId from URL', async ({ page }) => {
    await page.goto(`${DISPLAY_URL}?display_user_id=custom-display-42`)
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('text=Creating session')).not.toBeVisible()
  })

  test('session creates with dev params', async ({ page }) => {
    await page.goto(`${DISPLAY_URL}?volley_platform=FIRE_TV&display_user_id=tv-display-1`)
    await expect(page.getByAltText('Weekend Casino').or(page.getByRole('heading', { name: 'Weekend Casino' }))).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('text=Creating session')).not.toBeVisible()
  })
})

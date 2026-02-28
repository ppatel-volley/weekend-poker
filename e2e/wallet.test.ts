/**
 * E2E tests for the wallet display component.
 *
 * Verifies that the wallet display appears on the controller
 * and shows the player's chip balance.
 */
import { test, expect } from './fixtures/casino-fixture'

test.describe('Wallet', () => {
  test('wallet display is visible on controller', async ({ controllerPage }) => {
    // The WalletDisplay component should be rendered in the top bar
    const walletDisplay = controllerPage.locator('[data-testid="wallet-display"]')
    await expect(walletDisplay).toBeVisible({ timeout: 10_000 })
  })

  test('wallet shows dollar sign', async ({ controllerPage }) => {
    // The wallet should display the $ symbol
    const walletDisplay = controllerPage.locator('[data-testid="wallet-display"]')
    await expect(walletDisplay).toBeVisible()
    await expect(walletDisplay.locator('text=$')).toBeVisible()
  })

  test('wallet displays a numeric balance', async ({ controllerPage }) => {
    // The wallet should display a number (the balance)
    const walletDisplay = controllerPage.locator('[data-testid="wallet-display"]')
    await expect(walletDisplay).toBeVisible()
    // The balance should contain at least one digit
    await expect(walletDisplay).toContainText(/\d/)
  })
})

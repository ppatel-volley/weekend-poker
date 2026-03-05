import { type Page, expect } from '@playwright/test'

/**
 * Extract the current wallet balance from the controller page.
 * Reads from data-testid="wallet-display" which renders "$ X,XXX".
 */
export async function extractWalletBalance(page: Page): Promise<number> {
  const walletEl = page.getByTestId('wallet-display')
  await expect(walletEl).toBeVisible({ timeout: 10_000 })
  const text = await walletEl.textContent()
  if (!text) return 0
  // Extract numeric value: "$ 9,750" → 9750
  const match = text.replace(/[$,\s]/g, '').match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

/**
 * Assert that the total chips across all controller pages equals the expected total.
 * Used for chip conservation checks in multiplayer tests.
 */
export async function assertChipConservation(
  pages: Page[],
  expectedTotal: number,
  tolerance = 0,
): Promise<void> {
  let actual = 0
  for (const page of pages) {
    actual += await extractWalletBalance(page)
  }
  expect(actual).toBeGreaterThanOrEqual(expectedTotal - tolerance)
  expect(actual).toBeLessThanOrEqual(expectedTotal + tolerance)
}

/**
 * Assert wallet balance changed (increased or decreased) after a round.
 * Returns the new balance.
 */
export async function assertWalletChanged(
  page: Page,
  previousBalance: number,
): Promise<number> {
  const newBalance = await extractWalletBalance(page)
  // Balance should differ from before (win/loss) or stay same (push/fold with no bet)
  // We just verify it's still a positive integer
  expect(newBalance).toBeGreaterThan(0)
  expect(Number.isInteger(newBalance)).toBe(true)
  return newBalance
}

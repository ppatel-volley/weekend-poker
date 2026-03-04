import { type Page, expect } from '@playwright/test'

/** Wait for game UI to appear (any game controller heading). */
export async function waitForGameUI(page: Page, timeout = 30_000): Promise<void> {
  await expect(page.getByTestId('game-heading')).toBeVisible({ timeout })
}

/** Wait for "Your turn!" indicator. */
export async function waitForMyTurn(page: Page, timeout = 60_000): Promise<void> {
  await expect(page.getByText('Your turn!')).toBeVisible({ timeout })
}

/** Wait for any hand result text (WON/LOST/PUSH/BUST/FOLDED/NO BET/SURRENDERED). */
export async function waitForHandResult(page: Page, timeout = 60_000): Promise<void> {
  await expect(
    page.getByText(/WON \$\d+/i)
      .or(page.getByText(/LOST \$\d+/i))
      .or(page.getByText('PUSH'))
      .or(page.getByText('BUST'))
      .or(page.getByText('BUST!'))
      .or(page.getByText('FOLDED'))
      .or(page.getByText('NO BET'))
      .or(page.getByText('SURRENDERED'))
      .or(page.getByText('Hand complete'))
      .or(page.getByText('WINNER'))
  ).toBeVisible({ timeout })
}

/** Wait for lobby to appear (ready to start new game). */
export async function waitForLobby(page: Page, timeout = 30_000): Promise<void> {
  await expect(
    page.locator('#player-name')
      .or(page.getByText('Choose a game'))
  ).toBeVisible({ timeout })
}

/** Wait for a specific data-testid element to be visible. */
export async function waitForElement(
  page: Page,
  testId: string,
  timeout = 30_000,
): Promise<void> {
  await expect(page.getByTestId(testId)).toBeVisible({ timeout })
}

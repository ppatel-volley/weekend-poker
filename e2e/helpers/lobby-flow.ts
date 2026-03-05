import { type Page, expect } from '@playwright/test'

/** Game key to display label mapping (must match CASINO_GAME_LABELS exactly) */
const GAME_LABELS: Record<string, string> = {
  holdem: "Texas Hold'em",
  five_card_draw: '5-Card Draw',
  blackjack_classic: 'Blackjack',
  blackjack_competitive: 'Competitive Blackjack',
  roulette: 'Roulette',
  three_card_poker: 'Three Card Poker',
  craps: 'Craps',
}

/**
 * Complete lobby flow: enter name → select game → ready → start.
 * Waits for game UI (data-testid="game-heading") to appear.
 */
export async function startGame(
  controllerPage: Page,
  displayPage: Page,
  gameKey: string,
  playerName: string,
): Promise<void> {
  const label = GAME_LABELS[gameKey]
  if (!label) throw new Error(`Unknown game key: ${gameKey}`)

  // Enter name
  const nameInput = controllerPage.locator('#player-name')
  await expect(nameInput).toBeVisible({ timeout: 10_000 })
  await nameInput.fill(playerName)

  // Select game — use getByText with exact match then click parent button,
  // because getByRole('button', { name: 'Blackjack' }) matches both
  // "Blackjack" and "Competitive Blackjack" (strict mode violation).
  const gameLabel = controllerPage.getByText(label, { exact: true })
  await expect(gameLabel).toBeVisible({ timeout: 5_000 })
  await gameLabel.click()

  // Click READY
  const readyButton = controllerPage.getByRole('button', { name: /^READY$/i })
  await expect(readyButton).toBeVisible()
  await readyButton.click()

  // Wait for START button to appear and click it.
  // Use getByText to find the exact "START {LABEL}" text.
  const startButton = controllerPage.getByRole('button', { name: new RegExp(`^START ${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
  await expect(startButton).toBeVisible({ timeout: 10_000 })
  await startButton.click()

  // Wait for game UI to load
  await expect(controllerPage.getByTestId('game-heading')).toBeVisible({ timeout: 30_000 })
}

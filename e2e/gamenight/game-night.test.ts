import { test, expect } from '../fixtures/casino-fixture'
import { playCurrentGameRound } from '../helpers/strategies'
import { waitForHandResult } from '../helpers/wait-helpers'

test.describe('Game Night Mode', () => {
  test('plays through a full Game Night session', async ({ controllerPage, displayPage }) => {
    // Enter name and ready up
    const nameInput = controllerPage.locator('#player-name')
    await expect(nameInput).toBeVisible({ timeout: 10_000 })
    await nameInput.fill('GameNightPlayer')

    await controllerPage.getByRole('button', { name: /^READY$/i }).click()

    // Click GAME NIGHT button
    await controllerPage.getByTestId('game-night-button').click()

    // Game Night setup screen should appear
    // Start the game night (click start button)
    const gnStartBtn = controllerPage.getByTestId('gn-start-button')
    await expect(gnStartBtn).toBeVisible({ timeout: 15_000 })
    await gnStartBtn.click()

    // Play through games — Game Night has 3 games x N rounds
    // We need to handle multiple game transitions
    for (let game = 0; game < 3; game++) {
      // Wait for a game to start
      await expect(
        controllerPage.getByTestId('game-heading')
          .or(controllerPage.getByTestId('gn-rank-1'))
      ).toBeVisible({ timeout: 30_000 })

      // If we see leaderboard, click next game
      const leaderboard = controllerPage.getByTestId('gn-rank-1')
      if (await leaderboard.isVisible().catch(() => false)) {
        const nextGameBtn = controllerPage.getByTestId('gn-next-game')
        if (await nextGameBtn.isVisible().catch(() => false)) {
          await nextGameBtn.click()
          continue
        }
      }

      // Play rounds for this game
      for (let round = 0; round < 2; round++) {
        const gameHeading = controllerPage.getByTestId('game-heading')
        const gnLeaderboard = controllerPage.getByTestId('gn-rank-1')

        // Check if we're still in a game or moved to leaderboard
        await expect(gameHeading.or(gnLeaderboard)).toBeVisible({ timeout: 30_000 })

        if (await gnLeaderboard.isVisible().catch(() => false)) break

        try {
          await playCurrentGameRound(controllerPage)
          await controllerPage.waitForTimeout(3_000)
        } catch {
          // Round may have auto-completed; continue
          break
        }
      }

      // Wait for leaderboard between games
      await expect(
        controllerPage.getByTestId('gn-rank-1')
          .or(controllerPage.getByTestId('gn-champion-title'))
      ).toBeVisible({ timeout: 60_000 })

      // Click next game if available
      const nextGameBtn = controllerPage.getByTestId('gn-next-game')
      if (await nextGameBtn.isVisible().catch(() => false)) {
        await nextGameBtn.click()
      }
    }

    // Verify champion ceremony
    await expect(
      controllerPage.getByTestId('gn-champion-title')
        .or(controllerPage.getByTestId('gn-champion-name'))
    ).toBeVisible({ timeout: 60_000 })

    // Return to lobby
    const returnBtn = controllerPage.getByTestId('gn-return-lobby')
    if (await returnBtn.isVisible().catch(() => false)) {
      await returnBtn.click()
    }
  })
})

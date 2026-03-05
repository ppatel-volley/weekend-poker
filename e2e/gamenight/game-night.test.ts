import { test, expect } from '../fixtures/casino-fixture'
import { playCurrentGameRound } from '../helpers/strategies'

test.describe('Game Night Mode', () => {
  test('plays through a full Game Night session', async ({ controllerPage, displayPage }) => {
    // Enter name and ready up
    const nameInput = controllerPage.locator('#player-name')
    await expect(nameInput).toBeVisible({ timeout: 10_000 })
    await nameInput.fill('GameNightPlayer')
    await controllerPage.getByRole('button', { name: /^READY$/i }).click()

    // Click GAME NIGHT button
    const gnButton = controllerPage.getByTestId('game-night-button')
    await expect(gnButton).toBeVisible({ timeout: 10_000 })
    await gnButton.click()

    // Game Night setup screen — select 3 simple, reliable games
    for (const gameKey of ['roulette', 'three_card_poker', 'blackjack_classic']) {
      const gameBtn = controllerPage.getByTestId(`gn-game-${gameKey}`)
      await expect(gameBtn).toBeVisible({ timeout: 5_000 })
      await gameBtn.click()
    }

    // Decrease rounds per game from 5 to 3 (minimum)
    const minusBtn = controllerPage.getByTestId('gn-rounds-minus')
    await minusBtn.click() // 5 → 4
    await minusBtn.click() // 4 → 3

    // Start game night
    const gnStartBtn = controllerPage.getByTestId('gn-start-button')
    await expect(gnStartBtn).toBeEnabled({ timeout: 5_000 })
    await gnStartBtn.click()

    const gameHeading = controllerPage.getByTestId('game-heading')
    const leaderboard = controllerPage.getByTestId('gn-rank-1')
    const champion = controllerPage.getByTestId('gn-champion-title')
    const continueBtn = controllerPage.getByTestId('gn-continue')

    // Play through 3 games
    for (let game = 0; game < 4; game++) {
      // Wait for game, leaderboard, or champion
      await expect(
        gameHeading.or(leaderboard).or(champion)
      ).toBeVisible({ timeout: 60_000 })

      if (await champion.isVisible().catch(() => false)) break

      // If leaderboard, click Continue to advance
      if (await leaderboard.isVisible().catch(() => false)) {
        await expect(continueBtn).toBeVisible({ timeout: 5_000 })
        await continueBtn.click()
        await controllerPage.waitForTimeout(1_000)
        continue
      }

      // Play rounds for this game
      for (let round = 0; round < 5; round++) {
        if (await leaderboard.isVisible().catch(() => false)) break
        if (await champion.isVisible().catch(() => false)) break

        if (await gameHeading.isVisible().catch(() => false)) {
          try {
            await playCurrentGameRound(controllerPage)
          } catch {
            break
          }
          await controllerPage.waitForTimeout(2_000)
        } else {
          await controllerPage.waitForTimeout(1_000)
        }
      }

      // Wait for leaderboard or champion after rounds
      await expect(
        leaderboard.or(champion)
      ).toBeVisible({ timeout: 60_000 })

      if (await champion.isVisible().catch(() => false)) break

      // Click Continue to advance to next game
      await expect(continueBtn).toBeVisible({ timeout: 5_000 })
      await continueBtn.click()
      await controllerPage.waitForTimeout(1_000)
    }

    // Verify champion ceremony
    await expect(champion).toBeVisible({ timeout: 60_000 })

    // Click Return to Lobby to complete the ceremony
    const returnBtn = controllerPage.getByTestId('gn-return-lobby')
    if (await returnBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await returnBtn.click()
    }
  })
})

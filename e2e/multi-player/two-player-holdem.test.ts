import { test, expect } from '../fixtures/casino-fixture'
import { holdemCallOrCheck } from '../helpers/game-actions'
import type { Page } from '@playwright/test'

/** Check if it's this player's turn and act. Returns true if acted. */
async function actIfMyTurn(page: Page): Promise<boolean> {
  const myTurn = page.getByText('Your turn!')
  if (await myTurn.isVisible().catch(() => false)) {
    await holdemCallOrCheck(page)
    await page.waitForTimeout(500)
    return true
  }
  return false
}

test.describe("Two-Player Hold'em", () => {
  test('both players complete a round', async ({
    controllerPage,
    controllerPage2,
    displayPage,
  }) => {
    // Player 1 joins and selects game
    await expect(controllerPage.locator('#player-name')).toBeVisible({ timeout: 10_000 })
    await controllerPage.locator('#player-name').fill('Alice')
    await controllerPage.getByText("Texas Hold'em", { exact: true }).click()
    await controllerPage.getByRole('button', { name: /^READY$/i }).click()

    // Player 2 joins
    await expect(controllerPage2.locator('#player-name')).toBeVisible({ timeout: 10_000 })
    await controllerPage2.locator('#player-name').fill('Bob')
    await controllerPage2.getByRole('button', { name: /^READY$/i }).click()

    // Player 1 starts
    const startButton = controllerPage.getByRole('button', { name: /START/i })
    await expect(startButton).toBeVisible({ timeout: 10_000 })
    await startButton.click()

    // Both should see game UI
    await expect(controllerPage.getByTestId('game-heading')).toBeVisible({ timeout: 30_000 })
    await expect(controllerPage2.getByTestId('game-heading')).toBeVisible({ timeout: 30_000 })

    // Record starting stacks to verify the hand completes (stacks change after blinds/showdown)
    const getStack = async (page: Page) => {
      const text = await page.evaluate(() => document.body.innerText)
      const match = text.match(/Stack: \$(\d[\d,]*)/)
      return match ? parseInt(match[1]!.replace(',', '')) : null
    }
    const p1Start = await getStack(controllerPage)
    const p2Start = await getStack(controllerPage2)

    // Play through 4 betting rounds (pre-flop, flop, turn, river)
    // by polling both controllers for "Your turn!" and acting
    let totalActions = 0
    for (let i = 0; i < 40 && totalActions < 8; i++) {
      if (await actIfMyTurn(controllerPage)) totalActions++
      if (await actIfMyTurn(controllerPage2)) totalActions++
      await controllerPage.waitForTimeout(1_000)
    }

    // Verify the hand progressed — at least 4 actions taken (2 per pre-flop, rest check-check)
    expect(totalActions).toBeGreaterThanOrEqual(4)

    // Verify settlement happened — at least one player's stack must have changed
    await controllerPage.waitForTimeout(2_000)
    const p1End = await getStack(controllerPage)
    const p2End = await getStack(controllerPage2)
    expect(p1End !== p1Start || p2End !== p2Start).toBeTruthy()

    // Verify the game is still running
    await expect(controllerPage.getByTestId('game-heading')).toBeVisible({ timeout: 10_000 })
    await expect(controllerPage2.getByTestId('game-heading')).toBeVisible({ timeout: 10_000 })
  })
})

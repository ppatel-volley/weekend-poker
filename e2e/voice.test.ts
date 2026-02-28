/**
 * E2E tests for voice button on the controller.
 *
 * Verifies that the VoiceButton component renders and is interactive.
 * Deepgram/recognition client is not available in E2E, so the button
 * will show "Voice unavailable" or "Hold to Talk" depending on error state.
 */
import { test, expect } from './fixtures/casino-fixture'

test.describe('Voice', () => {
  test('voice button appears on controller', async ({ controllerPage }) => {
    // The VoiceButton component should be rendered at the bottom
    const voiceButton = controllerPage.locator('[data-testid="voice-button"]')
    await expect(voiceButton).toBeVisible({ timeout: 10_000 })
  })

  test('voice button shows text label', async ({ controllerPage }) => {
    const voiceButton = controllerPage.locator('[data-testid="voice-button"]')
    await expect(voiceButton).toBeVisible()

    // Should show either "Hold to Talk" or "Voice unavailable" (if Deepgram not configured)
    const text = await voiceButton.textContent()
    expect(text).toMatch(/Hold to Talk|Voice unavailable|Listening/)
  })

  test('voice button is a button element', async ({ controllerPage }) => {
    const voiceButton = controllerPage.locator('[data-testid="voice-button"]')
    await expect(voiceButton).toBeVisible()
    // Verify it's an actual button
    const tagName = await voiceButton.evaluate(el => el.tagName.toLowerCase())
    expect(tagName).toBe('button')
  })
})

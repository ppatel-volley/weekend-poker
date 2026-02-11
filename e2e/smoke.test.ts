import { test, expect } from '@playwright/test'

test.describe('Smoke tests', () => {
  test('display client loads', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await expect(page.locator('text=Weekend Poker')).toBeVisible()
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
})

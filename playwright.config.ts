import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm dev:server',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm dev:display',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm dev:controller',
      port: 5174,
      reuseExistingServer: !process.env.CI,
    },
  ],
})

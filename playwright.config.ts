import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration for Weekend Casino.
 *
 * Two projects:
 *   - controller: Mobile viewport (iPhone 14, 390x844) against controller app
 *   - display:    Desktop viewport (1920x1080) against display app
 *
 * Three dev servers started automatically (server, display, controller).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'html',

  /* Shared settings */
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 30_000,
  },

  /* Test timeout — 60s per test */
  timeout: 60_000,

  /* Expect timeout */
  expect: {
    timeout: 10_000,
  },

  projects: [
    {
      name: 'smoke',
      use: {
        baseURL: 'http://localhost:5173',
      },
      testMatch: /smoke\.test\.ts$/,
    },
    {
      name: 'controller',
      use: {
        ...devices['iPhone 14'],
        baseURL: 'http://localhost:5174',
      },
      testMatch: /\b(lobby|wallet|voice|game-switching)\b.*\.test\.ts$/,
    },
    {
      name: 'display',
      use: {
        viewport: { width: 1920, height: 1080 },
        baseURL: 'http://localhost:5173',
      },
      testMatch: /\b(lobby|holdem|tv-platform)\b.*\.test\.ts$/,
    },
    {
      name: 'gameplay',
      use: {
        ...devices['iPhone 14'],
        baseURL: 'http://localhost:5174',
      },
      testDir: './e2e/games',
      timeout: 120_000,
    },
    {
      name: 'gamenight',
      use: {
        ...devices['iPhone 14'],
        baseURL: 'http://localhost:5174',
      },
      testDir: './e2e/gamenight',
      timeout: 300_000,
    },
    {
      name: 'retention',
      use: {
        ...devices['iPhone 14'],
        baseURL: 'http://localhost:5174',
      },
      testDir: './e2e/retention',
      timeout: 60_000,
    },
    {
      name: 'multiplayer',
      use: {
        ...devices['iPhone 14'],
        baseURL: 'http://localhost:5174',
      },
      testDir: './e2e/multi-player',
      timeout: 180_000,
    },
  ],

  webServer: [
    {
      command: 'NODE_OPTIONS=--max-old-space-size=4096 pnpm dev:server',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'NODE_OPTIONS=--max-old-space-size=4096 pnpm dev:display',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'NODE_OPTIONS=--max-old-space-size=4096 pnpm dev:controller',
      port: 5174,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
})

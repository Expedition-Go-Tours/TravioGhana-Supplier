import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright runs against a real Vite server with every API request mocked at
 * the browser boundary (see e2e/fixtures.js). That keeps the suite hermetic:
 * no production backend, no live auth, no seed data to drift.
 *
 * The old setup had no config at all, so `npm run test:e2e` could not start a
 * server and the specs still described a table-based bookings UI that no longer
 * exists. A missing config is a silent release-gate failure: it is better for
 * this file to fail loudly than for a release to ship without E2E coverage.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    reducedMotion: 'reduce',
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
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          VITE_APP_ENV: 'test',
          VITE_API_BASE_URL: 'https://apiv1.travioafrica.com/api',
          VITE_ENABLE_ANALYTICS: 'false',
        },
      },
});

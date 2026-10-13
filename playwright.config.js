import { defineConfig, devices } from '@playwright/test'

// UI smoke tests against the production build (`vite preview`).
// Locally they drive the installed Microsoft Edge (no browser download); CI
// installs Playwright's Chromium. Service workers are blocked so a cached
// older build can never answer for the one under test.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4318',
    serviceWorkers: 'block',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'msedge' }
    }
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4318 --strictPort',
    url: 'http://localhost:4318',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
})

import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4175'

export default defineConfig({
  testDir: './tests/e2e',
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },

  webServer: {
    command: 'npm run dev:mocks -- --host 127.0.0.1 --port 4175 --strictPort',
    url: baseURL,
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
})

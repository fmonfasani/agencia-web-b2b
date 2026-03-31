import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',

  testMatch: ['**/*.spec.ts'],

  testIgnore: [
    '**/node_modules/**',
    '**/_backup_*/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    '../tests/**',
    '../../tests/**'
  ],

  fullyParallel: false,

  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3001,
    reuseExistingServer: true,
  },
})
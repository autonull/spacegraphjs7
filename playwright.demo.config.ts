import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  testMatch: /.*\.spec\.ts/,
  reporter: 'list',
  use: {
    headless: true,
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'pnpm run dev:demo',
    port: 5173,
    timeout: 30000,
    reuseExistingServer: !process.env.CI,
  },
});

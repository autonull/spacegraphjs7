import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.SG_DEMO_PORT ?? 5173);

export default defineConfig({
  testDir: './test/e2e',
  testMatch: /.*\.spec\.ts/,
  reporter: 'list',
  use: {
    headless: true,
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    // The local vite, not `pnpm dlx`: the demo must build in CI without reaching for the registry.
    command: `pnpm exec vite --config vite.demo.config.ts --port ${PORT} --strictPort`,
    port: PORT,
    timeout: 30000,
    reuseExistingServer: !process.env.CI,
  },
});

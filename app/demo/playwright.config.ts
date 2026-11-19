import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.SG_DEMO_PORT ?? 5174);

export default defineConfig({
    testDir: './tests',
    testMatch: /.*\.spec\.ts/,
    reporter: 'list',
    use: {
        headless: true,
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`,
    },
    webServer: {
        command: `pnpm exec vite --config vite.config.ts --port ${PORT} --strictPort`,
        port: PORT,
        timeout: 30000,
        reuseExistingServer: !process.env.CI,
    },
});

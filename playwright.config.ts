import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './test/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        trace: 'on-first-retry',
        baseURL: 'http://127.0.0.1:5173',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npx http-server ./ -p 5173 -a 127.0.0.1',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: !process.env.CI,
    },
});

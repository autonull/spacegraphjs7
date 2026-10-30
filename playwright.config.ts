import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './test',
    testMatch: /.*\.spec\.ts/,
    reporter: 'list',
    use: {
        headless: true,
        video: 'on',
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    },
    outputDir: 'recordings/',
});

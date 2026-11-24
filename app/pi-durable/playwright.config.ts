import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.SG_DURABLE_PORT ?? process.env.PI_DURABLE_WEB_PORT ?? 5176);
const SERVER = Number(process.env.PI_DURABLE_SERVER_PORT ?? 8788);
const STORAGE = process.env.PI_DURABLE_DIR ?? mkdtempSync(join(tmpdir(), 'pi-durable-e2e-'));

export default defineConfig({
    testDir: './tests',
    testMatch: /.*\.spec\.ts/,
    reporter: 'list',
    retries: 0,
    timeout: 30_000,
    use: {
        headless: true,
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`,
    },
    webServer: [
        {
            command: 'pnpm exec tsx src/server.ts',
            port: SERVER,
            env: { PI_DURABLE_LOCAL_FEED: '1', PI_DURABLE_DIR: STORAGE },
            timeout: 30_000,
            reuseExistingServer: false,
        },
        {
            command: `pnpm exec vite --config vite.config.ts --port ${PORT} --strictPort`,
            port: PORT,
            timeout: 30_000,
            reuseExistingServer: false,
        },
    ],
});

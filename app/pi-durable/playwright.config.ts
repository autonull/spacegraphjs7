import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { browserSuite } from '../../script/playwright-config';
const PORT = Number(process.env.SG_DURABLE_PORT ?? process.env.PI_DURABLE_WEB_PORT ?? 5176);
const SERVER = Number(process.env.PI_DURABLE_SERVER_PORT ?? 8788);
const OBSERVER = SERVER + 12;
const STORAGE = process.env.PI_DURABLE_DIR ?? mkdtempSync(join(tmpdir(), 'pi-durable-e2e-'));
export default browserSuite({
    testDir: './tests',
    port: PORT,
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`,
    retries: 0,
    timeout: 30_000,
    webServer: [
        {
            command: 'pnpm exec tsx src/server.ts',
            port: SERVER,
            env: {
                PI_DURABLE_LOCAL_FEED: '1', PI_DURABLE_DIR: STORAGE,
                PI_DURABLE_OBSERVER_URL: `http://127.0.0.1:${OBSERVER}`,
            },
            timeout: 30_000,
            reuseExistingServer: false,
        },
        {
            command: 'pnpm exec tsx src/server.ts',
            port: OBSERVER,
            env: {
                PI_DURABLE_SERVER_PORT: String(OBSERVER), PI_DURABLE_DIR: STORAGE,
                PI_DURABLE_OBSERVER: '1',
            },
            timeout: 30_000,
            reuseExistingServer: false,
        },
        {
            command: `pnpm exec vite --config vite.config.ts --port ${PORT} --strictPort`,
            port: PORT,
            env: { SG_DURABLE_E2E: '1' },
            timeout: 30_000,
            reuseExistingServer: false,
        },
    ],
});

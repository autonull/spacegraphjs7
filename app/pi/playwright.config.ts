import { browserSuite } from '../../script/playwright-config';
const PORT = Number(process.env.SG_PI_PORT ?? 5175);
const SERVER = Number(process.env.PI_SERVER_PORT ?? 8787);
export default browserSuite({
    testDir: './tests',
    port: PORT,
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`,
    retries: 0,
    webServer: [
        {
            command: 'pnpm exec tsx src/server.ts',
            port: SERVER,
            env: { PI_LOCAL_FEED: '1' },
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

import { browserSuite } from '../../script/playwright-config';
const PORT = Number(process.env.SG_DEMO_PORT ?? 5173);
export default browserSuite({
    testDir: './tests',
    port: PORT,
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`,
    webServer: {
        command: `pnpm exec vite --config vite.config.ts --port ${PORT} --strictPort`,
        port: PORT,
        timeout: 30000,
        reuseExistingServer: !process.env.CI,
    },
});

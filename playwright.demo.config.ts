import { browserSuite } from './script/playwright-config';
const PORT = Number(process.env.SG_DEMO_PORT ?? 5173);
export default browserSuite({
    testDir: './test/e2e',
    port: PORT,
    webServer: {
        // The local vite, not `pnpm dlx`: the demo must build in CI without reaching for the registry.
        command: `pnpm exec vite --config app/demo/vite.config.ts --port ${PORT} --strictPort`,
        port: PORT,
        timeout: 120000,
        reuseExistingServer: !process.env.CI,
    },
});

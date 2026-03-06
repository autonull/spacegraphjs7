import { test, expect } from '@playwright/test';
import { createVisionAssert } from '../src/vision/assert';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('SpaceGraph Vision System E2E', () => {
    test.setTimeout(30000);

    const fixtureDir = path.resolve(__dirname, 'fixtures');
    let serverProcess: any;

    test.beforeAll(async () => {
        // Start a static server to host the fixture dir
        serverProcess = spawn('npx', ['vite', 'serve', fixtureDir, '--port', '5176', '--no-open'], {
            stdio: 'ignore',
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    test.afterAll(() => {
        if (serverProcess) {
            serverProcess.kill();
        }
    });

    test('should detect bounding-box overlaps autonomously', async ({ page }) => {
        page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
        page.on('pageerror', err => console.error(`[Browser Error] ${err.message}`));

        await page.goto('http://localhost:5176/', { waitUntil: 'networkidle' });

        // Wait for SpaceGraph instances to register
        await page.waitForFunction(() => {
            const w = window as any;
            return w.__SPACEGRAPH_INSTANCES__ && w.__SPACEGRAPH_INSTANCES__.length > 0;
        }, { timeout: 5000 }).catch(() => false);

        // Allow layout to settle
        await page.waitForTimeout(1000);

        const visionAssert = createVisionAssert(page);

        await expect(visionAssert.noOverlap()).rejects.toThrow(/Expected no overlaps/);
    });
});

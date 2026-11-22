import { expect, test } from '@playwright/test';
import { spawn } from 'child_process';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { createVisionAssert } from '../src/vision/assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Reserve an ephemeral port, then release it so Vite can bind it. */
function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                server.close(() => reject(new Error('Could not allocate an ephemeral port')));
                return;
            }
            server.close(() => resolve(address.port));
        });
    });
}

test.describe('SpaceGraph Vision System E2E', () => {
    test.setTimeout(60000);

    let serverProcess: any;
    let baseUrl: string;

    test.beforeAll(async () => {
        const port = await freePort();
        baseUrl = `http://localhost:${port}`;
        // Local pnpm exec, not npx: no registry round-trip, and the port cannot collide.
        serverProcess = spawn(
            'pnpm',
            ['exec', 'vite', '--port', String(port), '--strictPort', '--no-open'],
            { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' },
        );
        // Poll the real fixture URL instead of sleeping a fixed 2s after spawn.
        await expect
            .poll(
                async () => {
                    try {
                        return (await fetch(`${baseUrl}/test/fixtures/index.html`)).ok;
                    } catch {
                        return false;
                    }
                },
                { timeout: 30_000, intervals: [100, 250, 500, 1000] },
            )
            .toBe(true);
    });

    test.afterAll(() => {
        if (serverProcess) {
            serverProcess.kill();
        }
    });

    test('should detect bounding-box overlaps autonomously', async ({ page }) => {
        page.on('console', (msg) => console.log(`[Browser] ${msg.text()}`));
        page.on('pageerror', (err) => console.error(`[Browser Error] ${err.message}`));

        await page.goto(`${baseUrl}/test/fixtures/index.html`, {
            waitUntil: 'networkidle',
        });

        // The fixture exposes its graph as window.sg once it is created.
        await page.waitForFunction(() => Boolean((window as any).sg), undefined, {
            timeout: 15000,
        });

        // The fixture pins two nodes into the same bounds, then raises this flag.
        await expect
            .poll(() => page.evaluate(() => (window as any).__overlapsForced), {
                timeout: 15_000,
            })
            .toBe(true);

        await page.evaluate(() => {
            const sg = (window as any).sg;
            if (sg && sg.vision) {
                sg.vision.modelsLoaded = true;
                // Force hybrid strategy to test AI + heuristics
                sg.vision.visionSystem.setStrategy('hybrid');
            }
        });
        const visionAssert = createVisionAssert(page);

        await expect(visionAssert.noOverlap()).rejects.toThrow(/Expected no overlaps/);
    });
});

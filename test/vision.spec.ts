import { test, expect } from '@playwright/test';
import { createVisionAssert } from '../src/vision/assert';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('SpaceGraph Vision System E2E', () => {
    test.setTimeout(60000);

    const fixtureDir = path.resolve(__dirname, 'fixtures');
    let serverProcess: any;

    test.beforeAll(async () => {
        // Start a static server to host the fixture dir
        serverProcess = spawn('npx', ['vite', '--port', '5176', '--no-open'], { cwd: path.resolve(__dirname, '..'),
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

        await page.goto('http://localhost:5176/test/fixtures/index.html', { waitUntil: 'networkidle' });

        // Wait for SpaceGraph instances to register
        await page.waitForFunction(() => {
            const w = window as any;
            return w.SpaceGraph && w.SpaceGraph.instances && w.SpaceGraph.instances.size > 0;
        }, { timeout: 15000 });

        // Allow layout to settle
        await page.waitForTimeout(2000);

        await page.evaluate(() => { const sg = Array.from((window as any).SpaceGraph.instances)[0] as any; if (sg && sg.vision) sg.vision.modelsLoaded = true; });
        const visionAssert = createVisionAssert(page);

        await expect(visionAssert.noOverlap()).rejects.toThrow(/Expected no overlaps/);
    });

    test('n8n workflow renders without overlaps', async ({ page }) => {
        page.on('console', msg => console.log(`[Browser 2] ${msg.text()}`));
        await page.goto('http://localhost:5176/demo/n8n-workflow.html', { waitUntil: 'networkidle' });

        // Wait for SpaceGraph instances to register
        await page.waitForFunction(() => {
            const w = window as any;
            return w.SpaceGraph && w.SpaceGraph.instances && w.SpaceGraph.instances.size > 0;
        }, { timeout: 15000 });

        // trigger auto layout to resolve overlaps
        await page.evaluate(async () => {
            console.log('Evaluating Layout...');
            const SpaceGraph = (window as any).SpaceGraph;
            const sg = Array.from(SpaceGraph.instances as Set<any>)[0];
            const forceLayout = sg.pluginManager.getPlugin('ForceLayout');

            if (forceLayout && forceLayout.update) {
                console.log('Applying ForceLayout...');
                // Run enough iterations for the force layout physics to completely separate nodes
                // The n8n graph has wide nodes, so we need more separation force
                forceLayout.settings.repulsion = 500000;
                forceLayout.settings.linkDistance = 1000;
                for (let i = 0; i < 3000; i++) {
                    forceLayout.update(0.016);
                }
                await new Promise(r => setTimeout(r, 100));
            }
        });

        // Allow layout to settle
        await page.waitForTimeout(3000);
        await page.evaluate(() => { const sg = Array.from((window as any).SpaceGraph.instances)[0] as any; if(sg.vision) sg.vision.modelsLoaded = true; });

        const visionAssert = createVisionAssert(page);

        await expect(visionAssert.noOverlap()).resolves.toBeUndefined();
        console.log('n8n test finished successfully');
    });

});

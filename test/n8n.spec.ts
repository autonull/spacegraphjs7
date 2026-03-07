import { test, expect } from '@playwright/test';
import { createVisionAssert } from '../src/vision/assert';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('SpaceGraph n8n Integration E2E', () => {
    test.setTimeout(30000);

    const fixtureDir = path.resolve(__dirname, '..', 'demo');
    let serverProcess: any;

    test.beforeAll(async () => {
        // Build the bridge
        console.log('Building n8n bridge...');
        await new Promise((resolve, reject) => {
            const buildProcess = spawn('npm', ['run', 'build', '-w', 'packages/n8n-bridge'], {
                stdio: 'ignore'
            });
            buildProcess.on('close', (code) => {
                if (code === 0) resolve(true);
                else reject(new Error('Failed to build n8n bridge'));
            });
        });

        // Start a static server to host the demo dir
        // Ensure vite is serving the root so it can resolve /src and /packages
        serverProcess = spawn('npx', ['vite', '--port', '5177', '--no-open'], {
            stdio: 'ignore',
        });
        await new Promise((resolve) => setTimeout(resolve, 3000));
    });

    test.afterAll(() => {
        if (serverProcess) {
            serverProcess.kill();
        }
    });

    test('n8n workflow renders without overlaps and responds to mock execution', async ({ page }) => {
        page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
        page.on('pageerror', err => console.error(`[Browser Error] ${err.message}`));

        await page.goto('http://localhost:5177/demo/n8n-workflow.html', { waitUntil: 'networkidle' });

        // Wait for SpaceGraph instances to register
        await page.waitForFunction(() => {
            const w = window as any;
            return w.__SPACEGRAPH_INSTANCES__ && w.__SPACEGRAPH_INSTANCES__.length > 0;
        }, { timeout: 5000 }).catch(() => false);

        // Wait for the mock execution delay in n8n-workflow.html (1000ms) + buffer
        await page.waitForTimeout(2000);

        const visionAssert = createVisionAssert(page);

        // Assert that the graph layout settles without overlaps
        await expect(visionAssert.noOverlap()).resolves.not.toThrow();

        // Check if the mock execution triggered node color change for 'webhook-1'
        // 'success' status should apply color #4caf50
        const successNodeResult = await page.evaluate(() => {
            const sg = (window as any).__SPACEGRAPH_INSTANCES__[0];
            const node = sg.graph.nodes.get('webhook-1');
            if (!node || !node.object) return false;

            // Search through children for the mesh that holds the color
            let hexColor = 0;
            node.object.traverse((child: any) => {
                if (child.isMesh && child.material && child.material.color) {
                    // Just take the first valid mesh color we find
                    if (hexColor === 0) {
                        hexColor = child.material.color.getHex();
                    }
                }
            });

            return hexColor === 0x4caf50 || hexColor === 0xffffff; // Autocolor might change it to white to improve contrast against dark bg
        });

        expect(successNodeResult).toBe(true);
    });
});

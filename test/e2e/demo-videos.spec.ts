import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const TOP_DEMOS = [
    'quickstart',
    'layouts',
    'interaction',
    'large',
    'fractal',
    'plugins',
    'mermaid',
    'html',
    'instanced',
    'single-node'
];

test.describe('Demo Interaction Videos', () => {
    const videoDir = path.join(process.cwd(), 'recordings');

    test.beforeAll(async () => {
        if (!fs.existsSync(videoDir)) {
            fs.mkdirSync(videoDir, { recursive: true });
        }
    });

    for (const demo of TOP_DEMOS) {
        test(`record interaction: ${demo}`, async ({ page }) => {
            // Increase timeout for complex recordings
            test.setTimeout(90000);

            // Correct URL: Vite root is 'demo', so /demo/quickstart.html becomes /quickstart.html
            await page.goto(`http://localhost:5173/${demo}.html`, { waitUntil: 'networkidle' });

            // Wait for canvas to appear
            const canvas = page.locator('canvas').first();
            await expect(canvas).toBeVisible({ timeout: 20000 });

            // Wait for graph initialization and at least one node to be present
            // For mermaid, we might need to wait longer or check specifically if nodes exist
            await page.waitForFunction((d) => {
                const sg = (window as any)._sg;
                if (!sg || !sg.graph) return false;

                // For most demos, nodes are added immediately.
                // For mermaid, they are added after parseAndRender
                if (d === 'mermaid') {
                    // Try to trigger render if not already done
                    if (sg.graph.nodes.size === 0 && (window as any).renderDiagram) {
                        (window as any).renderDiagram();
                    }
                }

                return sg.graph.nodes.size > 0;
            }, demo, { timeout: 40000 });

            // Wait a bit more for layout to settle
            await page.waitForTimeout(3000);

            // Perform interaction sequence

            // 1. Zoom interaction (Mouse wheel)
            await page.mouse.move(400, 300);
            await page.mouse.wheel(0, -500); // Zoom in
            await page.waitForTimeout(1000);
            await page.mouse.wheel(0, 500);  // Zoom out
            await page.waitForTimeout(1000);

            // 2. Pan interaction (Right click drag)
            await page.mouse.move(400, 300);
            await page.mouse.down({ button: 'right' });
            await page.mouse.move(600, 400, { steps: 20 });
            await page.mouse.up({ button: 'right' });
            await page.waitForTimeout(1000);

            // 3. Orbit/Rotate (Left click drag on background)
            await page.mouse.move(100, 100);
            await page.mouse.down();
            await page.mouse.move(300, 300, { steps: 20 });
            await page.mouse.up();
            await page.waitForTimeout(1000);

            // 4. Node Drag (if possible, just drag near center)
            await page.mouse.move(400, 300);
            await page.mouse.down();
            await page.mouse.move(500, 200, { steps: 20 });
            await page.mouse.up();
            await page.waitForTimeout(2000);

            // Playwright automatically records videos if configured in playwright.config.ts
            // But we'll just let the test finish and rely on the global config to save to recordings/
        });
    }
});

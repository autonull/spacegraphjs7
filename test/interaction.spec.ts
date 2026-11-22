/**
 * Interaction E2E tests — verifies drag-to-move, hover metawidget visibility,
 * and metawidget action events using Playwright mouse simulation.
 *
 * The demo page exposes helpers on `window`:
 *   window._sg           — the SpaceGraph instance
 *   window._lastHoverNodeId   — id of the last node that received pointerenter
 *   window._lastMetaAction    — { nodeId, action } of the last metawidget click
 */
import { expect, test } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5178;
const BASE_URL = `http://localhost:${PORT}`;

/** Project a node's 3D world position to canvas pixel coordinates. */
async function getNodeScreenPos(page: any, nodeId: string) {
    return page.evaluate((id: string) => {
        const sg = (window as any)._sg;
        const node = sg.graph.nodes.get(id);
        if (!node) throw new Error(`Node ${id} not found`);
        const camera = sg.renderer.camera;
        const canvas = sg.renderer.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const v = node.position.clone().project(camera);
        return {
            x: Math.round(((v.x + 1) / 2) * rect.width + rect.left),
            y: Math.round((-(v.y - 1) / 2) * rect.height + rect.top),
        };
    }, nodeId);
}

test.describe('SpaceGraph Interaction Tests', () => {
    test.setTimeout(60_000);

    let serverProcess: any;

    test.beforeAll(async () => {
        serverProcess = spawn(
            'pnpm',
            [
                'exec',
                'vite',
                '--config',
                'vite.config.ts',
                '--port',
                String(PORT),
                '--strictPort',
                '--no-open',
            ],
            { cwd: path.resolve(__dirname, '../app/demo'), stdio: 'ignore' },
        );
        // Poll the real demo URL instead of sleeping a fixed 3s after spawn.
        await expect
            .poll(
                async () => {
                    try {
                        return (await fetch(`${BASE_URL}/html/interaction/interaction.html`)).ok;
                    } catch {
                        return false;
                    }
                },
                { timeout: 30_000, intervals: [100, 250, 500, 1000] },
            )
            .toBe(true);
    });

    test.afterAll(() => {
        serverProcess?.kill();
    });

    async function loadDemo(page: any) {
        await page.goto(`${BASE_URL}/html/interaction/interaction.html`, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean((window as any)._sg), undefined, {
            timeout: 20_000,
        });
        // Layout/camera settle signal: the CSS3D renderer has actually placed n1's DOM node.
        await page.waitForFunction(
            () => {
                const element = document.querySelector('[data-node-id="n1"]');
                if (!element) return false;
                const rect = element.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            },
            undefined,
            { timeout: 20_000 },
        );
    }

    // ── Test 1: node drag changes position ─────────────────────────────────
    test('dragging a node changes its world position', async ({ page }) => {
        page.on('pageerror', (err: Error) => console.error('[Browser]', err.message));
        await loadDemo(page);

        const before = await page.evaluate(() => {
            const node = (window as any)._sg.graph.nodes.get('n1');
            return { x: node.position.x, y: node.position.y };
        });

        const pos = await getNodeScreenPos(page, 'n1');

        // Drag the node 150px to the right and 80px down
        await page.mouse.move(pos.x, pos.y);
        await page.mouse.down();
        await page.mouse.move(pos.x + 150, pos.y + 80, { steps: 10 });
        await page.mouse.up();

        // Wait for the drag to actually move the node instead of sleeping one frame.
        await expect
            .poll(
                async () => {
                    const after = await page.evaluate(() => {
                        const node = (window as any)._sg.graph.nodes.get('n1');
                        return { x: node.position.x, y: node.position.y };
                    });
                    return Math.abs(after.x - before.x) + Math.abs(after.y - before.y);
                },
                { timeout: 5_000 },
            )
            .toBeGreaterThan(10);
    });

    // ── Test 2: hovering fires node:pointerenter ────────────────────────────
    test('hovering over a node fires node:pointerenter', async ({ page }) => {
        page.on('pageerror', (err: Error) => console.error('[Browser]', err.message));
        await loadDemo(page);

        // Clear any stale hover state
        await page.evaluate(() => {
            (window as any)._lastHoverNodeId = null;
        });

        const pos = await getNodeScreenPos(page, 'n1');

        await page.mouse.move(pos.x + 400, pos.y + 400);
        await page.mouse.move(pos.x, pos.y);
        await expect.poll(() => page.evaluate(() => (window as any)._lastHoverNodeId)).toBe('n1');

        const hovered = await page.evaluate(() => (window as any)._lastHoverNodeId);
        expect(hovered).toBe('n1');
    });

    // ── Test 3: metawidget becomes visible on hover ─────────────────────────
    test('HoverMetaWidget overlay is visible when hovering a node', async ({ page }) => {
        page.on('pageerror', (err: Error) => console.error('[Browser]', err.message));
        await loadDemo(page);

        const pos = await getNodeScreenPos(page, 'n1');
        const widget = page.locator('.sg-hover-meta-widget');

        await page.mouse.move(pos.x + 400, pos.y + 400);
        await page.mouse.move(pos.x, pos.y);

        await expect(widget).toBeVisible();
    });

    // ── Test 4: metawidget hides after leaving node ─────────────────────────
    test('HoverMetaWidget hides when pointer leaves node', async ({ page }) => {
        page.on('pageerror', (err: Error) => console.error('[Browser]', err.message));
        await loadDemo(page);

        const pos = await getNodeScreenPos(page, 'n1');
        const widget = page.locator('.sg-hover-meta-widget');

        await page.mouse.move(pos.x, pos.y);
        await expect(widget).toBeVisible();

        await page.mouse.move(pos.x + 400, pos.y + 400);
        await expect(widget).not.toBeVisible();
    });

    // ── Test 5: metawidget action button fires node:metaaction event ─────────
    test('clicking a metawidget action button fires node:metaaction', async ({ page }) => {
        page.on('pageerror', (err: Error) => console.error('[Browser]', err.message));
        await loadDemo(page);

        await page.evaluate(() => {
            (window as any)._lastMetaAction = null;
        });

        const pos = await getNodeScreenPos(page, 'n1');
        const widget = page.locator('.sg-hover-meta-widget');

        await page.mouse.move(pos.x + 400, pos.y + 400);
        await page.mouse.move(pos.x, pos.y);

        const focusBtn = widget.locator('button[data-action="focus"]');
        await expect(focusBtn).toBeVisible();
        await focusBtn.click();

        await expect.poll(() => page.evaluate(() => (window as any)._lastMetaAction)).not.toBeNull();

        const meta = await page.evaluate(() => (window as any)._lastMetaAction);
        expect(meta).not.toBeNull();
        expect(meta.nodeId).toBe('n1');
        expect(meta.action).toBe('focus');
    });
});

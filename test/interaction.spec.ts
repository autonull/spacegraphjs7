/**
 * Interaction E2E tests — verifies drag-to-move, hover metawidget visibility,
 * and metawidget action events using Playwright mouse simulation.
 *
 * The demo page exposes helpers on `window`:
 *   window._sg           — the SpaceGraph instance
 *   window._lastHoverNodeId   — id of the last node that received pointerenter
 *   window._lastMetaAction    — { nodeId, action } of the last metawidget click
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

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
        serverProcess = spawn('pnpm', ['exec', 'vite', '--port', String(PORT), '--no-open'], {
            cwd: path.resolve(__dirname, '..'),
            stdio: 'ignore',
        });
        // Wait for vite to be ready
        await new Promise((resolve) => setTimeout(resolve, 3000));
    });

    test.afterAll(() => {
        serverProcess?.kill();
    });

    async function loadDemo(page: any) {
        await page.goto(`${BASE_URL}/demo/interaction.html`, { waitUntil: 'networkidle' });
        await page.waitForFunction(
            () => {
                const w = window as any;
                return w._sg && w.SpaceGraph?.instances?.size > 0;
            },
            { timeout: 20_000 },
        );
        // Allow layout / first render to settle
        await page.waitForTimeout(500);
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

        // Allow one frame
        await page.waitForTimeout(100);

        const after = await page.evaluate(() => {
            const node = (window as any)._sg.graph.nodes.get('n1');
            return { x: node.position.x, y: node.position.y };
        });

        // Position should have changed by a meaningful amount
        const dx = Math.abs(after.x - before.x);
        const dy = Math.abs(after.y - before.y);
        expect(dx + dy).toBeGreaterThan(10);
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

        // Move to a safe empty area first, then onto the node
        await page.mouse.move(pos.x + 400, pos.y + 400);
        await page.waitForTimeout(100);
        await page.mouse.move(pos.x, pos.y);
        await page.waitForTimeout(200);

        const hovered = await page.evaluate(() => (window as any)._lastHoverNodeId);
        expect(hovered).toBe('n1');
    });

    // ── Test 3: metawidget becomes visible on hover ─────────────────────────
    test('HoverMetaWidget overlay is visible when hovering a node', async ({ page }) => {
        page.on('pageerror', (err: Error) => console.error('[Browser]', err.message));
        await loadDemo(page);

        const pos = await getNodeScreenPos(page, 'n1');

        // Move away first, then hover node
        await page.mouse.move(pos.x + 400, pos.y + 400);
        await page.waitForTimeout(100);
        await page.mouse.move(pos.x, pos.y);
        await page.waitForTimeout(200);

        const widget = page.locator('.sg-hover-meta-widget');
        await expect(widget).toBeVisible();
    });

    // ── Test 4: metawidget hides after leaving node ─────────────────────────
    test('HoverMetaWidget hides when pointer leaves node', async ({ page }) => {
        page.on('pageerror', (err: Error) => console.error('[Browser]', err.message));
        await loadDemo(page);

        const pos = await getNodeScreenPos(page, 'n1');

        // Hover node
        await page.mouse.move(pos.x, pos.y);
        await page.waitForTimeout(200);

        // Move to empty space
        await page.mouse.move(pos.x + 400, pos.y + 400);
        await page.waitForTimeout(200);

        const widget = page.locator('.sg-hover-meta-widget');
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

        // Hover to show metawidget
        await page.mouse.move(pos.x + 400, pos.y + 400);
        await page.waitForTimeout(100);
        await page.mouse.move(pos.x, pos.y);
        await page.waitForTimeout(300);

        // Click the Focus button (first action on n1)
        const focusBtn = page.locator('.sg-hover-meta-widget button[data-action="focus"]');
        await expect(focusBtn).toBeVisible();
        await focusBtn.click();

        await page.waitForTimeout(100);

        const meta = await page.evaluate(() => (window as any)._lastMetaAction);
        expect(meta).not.toBeNull();
        expect(meta.nodeId).toBe('n1');
        expect(meta.action).toBe('focus');
    });
});

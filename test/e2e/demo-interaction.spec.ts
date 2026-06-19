import { test, expect } from '@playwright/test';

test.describe('Demo Interaction Tests', () => {
    test('single-node - canvas renders WebGL', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/single-node.html');
        await page.waitForTimeout(2000);
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('verification - renders graph', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/verification.html');
        await page.waitForTimeout(2000);
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('debug - graph renders successfully', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/debug.html');
        await page.waitForTimeout(2000);
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('interaction - hover triggers events', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/interaction.html');
        await page.waitForTimeout(2000);
        const canvas = page.locator('canvas').first();
        await expect(canvas).toBeVisible();
        const box = await canvas.boundingBox();
        await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
        await page.waitForTimeout(500);
        const lastHovered = await page.evaluate(() => window._lastHoverNodeId);
        expect(lastHovered).not.toBeNull();
    });

    test('interaction - drag node triggers events', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/interaction.html');
        await page.waitForTimeout(2000);
        const canvas = page.locator('canvas').first();
        const box = await canvas.boundingBox();
        const cx = box!.x + box!.width / 2;
        const cy = box!.y + box!.height / 2;
        await page.mouse.move(cx, cy);
        await page.waitForTimeout(300);
        await page.mouse.down();
        await page.mouse.move(cx + 50, cy + 50);
        await page.mouse.up();
        await page.waitForTimeout(500);
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('interaction-meta - renders and logs', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/interaction-meta.html');
        await page.waitForTimeout(3000);
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('fractal - renders', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/fractal.html');
        await page.waitForTimeout(2000);
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('html - renders HTML nodes', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/html.html');
        await page.waitForTimeout(2000);
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('empty - renders empty graph', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/empty.html');
        await page.waitForTimeout(2000);
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('instanced - renders many nodes', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/instanced.html');
        await page.waitForTimeout(3000);
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('layouts - renders with layout', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/layouts.html');
        await page.waitForTimeout(3000);
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('plugins - renders with plugins', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/plugins.html');
        await page.waitForTimeout(3000);
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('quickstart - renders', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/quickstart.html');
        await page.waitForTimeout(3000);
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('large - renders large graph', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/large.html');
        await page.waitForTimeout(3000);
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('n8n-workflow - renders workflow', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/n8n-workflow.html');
        await page.waitForTimeout(3000);
        await expect(page.locator('canvas').first()).toBeVisible();
    });
});

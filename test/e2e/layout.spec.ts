import { test, expect } from '@playwright/test';

test.describe('SpaceGraph Layout and Interaction', () => {
    test('Demo page loads without console errors and renders canvas', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Navigate to the built-in demo which visualises a dataset
        await page.goto('/demo/index.html');

        // Wait for the WebGL canvas
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });

        // Wait a brief moment to catch any layout loop errors
        await page.waitForTimeout(2000);

        // We shouldn't see unhandled errors
        expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
    });

    test('CSS3D elements are rendered overlaying the canvas', async ({ page }) => {
        await page.goto('/examples/html-nodes.html');

        // Make sure the CSS3D container is present
        const cssContainer = page.locator('div[style*="transform-style: preserve-3d"]');
        await expect(cssContainer).toBeVisible({ timeout: 10000 });

        // Wait a bit to ensure nodes load
        await page.waitForTimeout(1000);

        // Check for our HTML node class
        const htmlNodes = page.locator('.sg-html-node');
        const count = await htmlNodes.count();
        expect(count).toBeGreaterThan(0);
    });
});

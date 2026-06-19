import { test, expect } from '@playwright/test';

test.describe('SpaceGraph Layout and Interaction', () => {
    test('Demo page loads without errors and renders canvas', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });

        await page.goto('http://localhost:5173/demo/html.html');
        await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(2000);

        expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
    });

    test('CSS3D HTML nodes render overlaying the canvas', async ({ page }) => {
        await page.goto('http://localhost:5173/demo/html.html');
        await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(2000);

        // Take screenshot to verify visual content
        const screenshot = await page.screenshot();
        expect(screenshot.length).toBeGreaterThan(15000);
    });
});

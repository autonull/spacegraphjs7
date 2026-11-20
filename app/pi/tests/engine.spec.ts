import { expect, test } from '@playwright/test';

test.describe('engine-mode scope play', () => {
    test('isolates physics from the authoritative scope simulation', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('/engine.html');
        await page.waitForFunction(() => (window as any).__engine?.ready === true);
        await expect(page.locator('#status')).toContainText('scopes');

        expect(await page.evaluate(() => (window as any).__engine.scopes().length)).toBeGreaterThan(1);
        expect(await page.evaluate(() => (window as any).__engine.physics().enabled)).toBe(false);

        await page.locator('#play').click();
        const play = await page.evaluate(() => (window as any).__engine.physics());
        expect(play.enabled).toBe(true);
        expect(play.gravity).toBe(0);

        await page.locator('#reconcile').click();
        expect(await page.evaluate(() => (window as any).__engine.physics().enabled)).toBe(false);
        await expect
            .poll(() => page.evaluate(() => (window as any).__engine.settled()), { timeout: 5000 })
            .toBe(true);
        expect(errors).toEqual([]);
    });
});

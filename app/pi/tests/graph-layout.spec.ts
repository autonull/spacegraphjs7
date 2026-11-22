import { expect, test, type Page } from '@playwright/test';

const boot = async (page: Page, query = ''): Promise<void> => {
    await page.goto(`/${query}`);
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect(page.locator('#status')).not.toHaveText('connecting…');
};

test.describe('graph arrangements', () => {
    test('every view is reachable by URL and by hook without dropping the default', async ({ page }) => {
        await boot(page);
        expect(await page.evaluate(() => (window as any).__pi.graphLayout())).toBe('freeform');
        expect(await page.evaluate(() => (window as any).__pi.graphLayouts())).toEqual([
            'freeform',
            'timeline',
            'lanes',
            'tree',
            'force',
        ]);

        for (const mode of ['timeline', 'lanes', 'tree', 'force', 'freeform']) {
            await page.evaluate((value) => (window as any).__pi.setGraphLayout(value), mode);
            expect(await page.evaluate(() => (window as any).__pi.graphLayout())).toBe(mode);
            expect(await page.evaluate(() => (window as any).__pi.graphShape().nodes)).toBeGreaterThan(0);
        }
    });

    test('a URL selects the view on load and switching keeps focus and camera', async ({ page }) => {
        await boot(page, '?scenario=rich&graphLayout=timeline');
        expect(await page.evaluate(() => (window as any).__pi.graphLayout())).toBe('timeline');
        await page.evaluate(() => (window as any).__pi.reveal('pi:local:x3'));
        const before = await page.evaluate(() => ({
            revealed: (window as any).__pi.revealed(),
            viewport: (window as any).__pi.viewport(),
        }));

        await page.evaluate(() => (window as any).__pi.setGraphLayout('lanes'));

        expect(await page.evaluate(() => (window as any).__pi.graphLayout())).toBe('lanes');
        const after = await page.evaluate(() => ({
            revealed: (window as any).__pi.revealed(),
            viewport: (window as any).__pi.viewport(),
        }));
        expect(after.revealed).toBe(before.revealed);
        expect(after.viewport).toEqual(before.viewport);
    });

    test('scope hulls, aligned rows and the corridor bundle are host-side overlays', async ({ page }) => {
        await boot(page, '?scenario=rich&graphLayout=timeline&graphAligned=1&ribbonCorridor=1');
        await expect(page.locator('#structure .field-hull').first()).toBeVisible();
        expect(await page.locator('#structure .field-hull').count()).toBeGreaterThan(0);
        expect(await page.locator('#transcript-list[data-aligned="true"]').count()).toBe(1);
        expect(await page.evaluate(() => (window as any).__pi.ribbonCorridor())).toBe(true);

        await page.evaluate(() => (window as any).__pi.setRibbonCorridor(false));
        expect(await page.evaluate(() => (window as any).__pi.ribbonCorridor())).toBe(false);
        await page.evaluate(() => (window as any).__pi.setGraphLayoutAligned(false));
        expect(await page.locator('#transcript-list[data-aligned="false"]').count()).toBe(1);
    });
});

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
            'timeline-rows',
            'lanes',
            'tree',
            'force',
        ]);

        for (const mode of ['timeline', 'timeline-rows', 'lanes', 'tree', 'force', 'freeform']) {
            await page.evaluate((value) => (window as any).__pi.setGraphLayout(value), mode);
            expect(await page.evaluate(() => (window as any).__pi.graphLayout())).toBe(mode);
            expect(await page.evaluate(() => (window as any).__pi.graphShape().nodes)).toBeGreaterThan(0);
        }
    });

    test('palette commands and keys select graph views without a URL', async ({ page }) => {
        await boot(page);
        await page.locator('#command-open').click();
        await page.locator('#command-input').fill('Graph view · timeline');
        await page.locator('.command-row[data-command-id="view.graphLayout.timeline"]').click();
        expect(await page.evaluate(() => (window as any).__pi.graphLayout())).toBe('timeline');
        expect(await page.locator('#hud').getAttribute('data-graph-layout')).toBe('timeline');

        await page.locator('#canvas').focus();
        await page.keyboard.press('g');
        expect(await page.evaluate(() => (window as any).__pi.graphLayout())).toBe('timeline-rows');
        await page.keyboard.press('a');
        expect(await page.evaluate(() => (window as any).__pi.graphLayoutAligned())).toBe(true);
        await page.keyboard.press('r');
        expect(await page.evaluate(() => (window as any).__pi.ribbonCorridor())).toBe(true);
        expect(await page.locator('#hud').getAttribute('data-graph-flags')).toBe('11');
        await expect(page.locator('#hud')).toContainText('timeline-rows+aligned+corridor');

        await page.locator('#command-open').focus();
        await page.keyboard.press('g');
        expect(await page.evaluate(() => (window as any).__pi.graphLayout())).toBe('lanes');

        await page.locator('#command-open').click();
        await page.locator('#command-input').fill('g');
        expect(await page.evaluate(() => (window as any).__pi.graphLayout())).toBe('lanes');
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

    test('timeline stays independent of transcript placement and supports tracing', async ({ page }) => {
        await boot(page, '?scenario=rich&graphLayout=timeline');
        for (const arrangement of ['stacked', 'side', 'floating']) {
            await page.evaluate((value) => (window as any).__pi.setArrangement(value), arrangement);
            expect(await page.evaluate(() => (window as any).__pi.arrangement())).toBe(arrangement);
            expect(await page.evaluate(() => (window as any).__pi.graphShape().nodes)).toBeGreaterThan(0);
        }
        for (const depth of ['flat', 'layered', 'depth-stack', 'orbit']) {
            await page.evaluate((value) => (window as any).__pi.setDepth(value), depth);
            expect(await page.evaluate(() => (window as any).__pi.depth())).toBe(depth);
            expect(await page.evaluate(() => (window as any).__pi.graphLayout())).toBe('timeline');
        }
        await page.evaluate(() => (window as any).__pi.trace('pi:local:x3'));
        expect(await page.evaluate(() => (window as any).__pi.tracePath().length)).toBeGreaterThan(0);
    });

    test('scope hulls, aligned rows and the corridor bundle are host-side overlays', async ({ page }) => {
        await boot(page, '?scenario=rich&graphLayout=timeline&graphAligned=1&ribbonCorridor=1');
        await expect(page.locator('#structure .field-hull').first()).toBeVisible();
        expect(await page.locator('#structure .field-hull').count()).toBeGreaterThan(0);
        const labels = await page
            .locator('#structure .field-hull[data-scope^="unit-"]')
            .evaluateAll((hulls) =>
                hulls.map((hull) => (hull as HTMLElement).style.getPropertyValue('--hull-label').replace(/^"|"$/g, '')),
            );
        expect(labels.length).toBeGreaterThan(0);
        for (const label of labels) expect(label).toMatch(/^[✓▸!✕·] \d+$/);
        expect(await page.locator('#transcript-list[data-aligned="true"]').count()).toBe(1);
        expect(await page.evaluate(() => (window as any).__pi.ribbonCorridor())).toBe(true);

        await page.evaluate(() => (window as any).__pi.setRibbonCorridor(false));
        expect(await page.evaluate(() => (window as any).__pi.ribbonCorridor())).toBe(false);
        await page.evaluate(() => (window as any).__pi.setGraphLayoutAligned(false));
        expect(await page.locator('#transcript-list[data-aligned="false"]').count()).toBe(1);
    });
});

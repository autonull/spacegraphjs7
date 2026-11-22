import { expect, test } from '@playwright/test';
import { boot } from './boot';

for (const [width, height] of [[1440, 900], [900, 1000]] as const) {
    test(`readable chrome keeps type legible and rail on demand at ${width}x${height}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        const errors = await boot(page, '?ui=readable');
        await expect(page.locator('body')).toHaveAttribute('data-ui-chrome', 'readable');
        await expect(page.locator('body')).toHaveAttribute('data-rail', 'closed');
        await expect(page.locator('#rail')).toBeHidden();
        await expect(page.locator('#rail-strip')).toBeVisible();

        const sizes = await page.evaluate(() => ({
            body: parseFloat(getComputedStyle(document.body).fontSize),
            row: parseFloat(getComputedStyle(document.querySelector('.spine-row')!).fontSize),
        }));
        expect(sizes.body).toBeGreaterThanOrEqual(13);
        expect(sizes.row).toBeGreaterThanOrEqual(12);

        await expect(page.locator('#proof-line .plain-label')).toBeVisible();
        await expect(page.locator('#proof-line .jargon-label')).toBeHidden();
        await expect(page.locator('#surface-hybrid .plain-label')).toHaveText('Transcript + graph');

        await page.locator('#rail-strip [data-rail-panel="rail-inspect"]').click();
        await expect(page.locator('#rail')).toBeVisible();
        await expect(page.locator('#rail-inspect')).toHaveAttribute('open', '');
        await expect(page.locator('#rail-navigate')).not.toHaveAttribute('open', '');
        const railFont = await page.evaluate(() =>
            parseFloat(getComputedStyle(document.querySelector('#rail-inspect > summary')!).fontSize),
        );
        expect(railFont).toBeGreaterThanOrEqual(12);

        const bounds = await page.evaluate(() => {
            const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
            return { header: rect('#command-bar'), surface: rect('#surface'), rail: rect('#rail') };
        });
        expect(bounds.header.bottom).toBeLessThanOrEqual(bounds.surface.top + 1);
        expect(bounds.rail.left).toBeGreaterThanOrEqual(0);
        expect(bounds.rail.right).toBeLessThanOrEqual(width + 1);
        expect(bounds.rail.top).toBeGreaterThanOrEqual(0);
        expect(bounds.rail.bottom).toBeLessThanOrEqual(height + 1);
        expect(errors).toEqual([]);
    });
}

test('readable rail panels stay reachable from the palette', async ({ page }) => {
    await boot(page, '?ui=readable');
    await page.evaluate(() => (window as any).__pi.openCommands('palette', 'navigate'));
    const ids = await page.locator('[data-command-id]').evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-command-id')),
    );
    expect(ids).toContain('nav.panel.reference');
    await page.locator('[data-command-id="nav.panel.reference"]').click();
    await expect(page.locator('#rail-learn')).toHaveAttribute('open', '');
    await expect(page.locator('#rail-strip [data-rail-panel="rail-learn"]')).toHaveAttribute(
        'aria-pressed',
        'true',
    );
});

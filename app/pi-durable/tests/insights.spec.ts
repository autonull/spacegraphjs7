import { expect, test } from '@playwright/test';
import { boot, call, openPanel } from './boot';

test('time scrubber reveals only committed entries and a matching digest', async ({ page }) => {
    const errors = await boot(page, '?scenario=time-travel');
    await openPanel(page, 'insights');
    const slider = page.locator('#time-scrub');
    await expect(slider).toHaveAttribute('max', '4');
    await expect(page.locator('#time-badge')).toHaveText('present');

    await slider.fill('2');
    await expect(page.locator('#asof-badge')).toHaveText('as of 2');
    const digest = await call<{ since: number; added: readonly string[] }>(page, 'digest');
    expect(digest.since).toBe(1);
    expect(digest.added).toContain('d:1:entry:1-first');
    await expect(page.locator('#digest')).toContainText('since 1');

    await page.locator('#time-present').click();
    await expect(page.locator('#asof-badge')).toBeHidden();
    expect(errors).toEqual([]);
});

test('instrument panel is gated behind ?instruments=1 and matches the model', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await openPanel(page, 'insights');
    await expect(page.locator('#instruments-block')).toBeHidden();

    await boot(page, '?shot=basic-turn&instruments=1');
    await openPanel(page, 'insights');
    await expect(page.locator('#instruments-block')).toBeVisible();
    const panel = await call<{
        octaves: Readonly<Record<string, number>>;
        edgeKinds: Readonly<Record<string, number>>;
        omitted: number;
    }>(page, 'instruments');
    const representation = await call<{ nodes: number; omitted: number; edgeKinds: readonly string[] }>(page, 'representation');
    expect(Object.values(panel.octaves).reduce((sum, count) => sum + count, 0)).toBe(representation.nodes);
    expect(Object.values(panel.edgeKinds).reduce((sum, count) => sum + count, 0)).toBe(representation.edgeKinds.length);
    expect(panel.omitted).toBe(representation.omitted);
    expect(errors).toEqual([]);
});

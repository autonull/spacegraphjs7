import { expect, test } from '@playwright/test';
import { bootConsole, call } from './boot';

test('auto zoom focuses a ranked region and records the lens move', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = await bootConsole(page);
    const before = await call<readonly string[]>(page, 'consoleTrail');
    expect(await call<boolean>(page, 'consoleAutoZoom')).toBe(true);
    expect((await call<readonly string[]>(page, 'consoleTrail')).length).toBe(before.length + 1);
    await expect(page.locator('#announcer')).toContainText(/Zoomed to region/);
    expect(errors).toEqual([]);
});

test('region overlays round-trip through a permalink', async ({ page }) => {
    const errors = await bootConsole(page);
    await call(page, 'consoleRegions', true);
    const link = await call<string>(page, 'permalink');
    expect(link).toContain('regions=on');
    await call(page, 'consoleRegions', false);
    await call(page, 'applyPermalink', link);
    expect((await call<{ regions?: string }>(page, 'address')).regions).toBe('on');
    expect(errors).toEqual([]);
});

test('the quality report covers the projected console', async ({ page }) => {
    const errors = await bootConsole(page);
    const report = await call<{
        score: number;
        budgets: { readonly domNodes: number; readonly maxDomNodes: number };
    }>(page, 'consoleQuality');
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.budgets.maxDomNodes).toBeGreaterThan(0);
    expect(errors).toEqual([]);
});

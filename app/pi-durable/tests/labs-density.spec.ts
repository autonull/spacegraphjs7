import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

type DensityState = {
    readonly tool: string;
    readonly focus?: string;
    readonly selection: readonly string[];
    readonly layout: string;
};

test('labs density kit gathers, lenses, brushes and morphs the team view', async ({ page }) => {
    const errors = await boot(page, '?shot=fork-tabs&labs=1');
    await call(page, 'zoomBy', 5);
    await page.keyboard.press('t');
    await page.keyboard.press('d');
    const panel = page.locator('#lab-team .density-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('[data-density-tool="gather"][data-on="true"]')).toHaveCount(1);
    expect((await call<DensityState>(page, 'densityState')).tool).toBe('gather');

    await panel.locator('[data-density-tool="lens"]').click();
    expect(await call<boolean>(page, 'focusLensActive')).toBe(true);
    expect((await call<DensityState>(page, 'densityState')).tool).toBe('lens');

    await panel.locator('[data-density-tool="lasso"]').click();
    const lasso = await call<DensityState>(page, 'densityState');
    expect(lasso.tool).toBe('lasso');
    expect(lasso.selection.length).toBeGreaterThan(0);
    await expect(panel).toContainText('scoped');

    await panel.locator('[data-density-tool="morph"]').click();
    const morph = await call<DensityState>(page, 'densityState');
    expect(morph.tool).toBe('morph');
    expect(await call<string>(page, 'layoutName')).toBe(morph.layout);

    await panel.locator('[data-density-tool="off"]').click();
    expect(await call<boolean>(page, 'focusLensActive')).toBe(false);
    expect((await call<DensityState>(page, 'densityState')).tool).toBe('off');

    await page.keyboard.press('d');
    expect((await call<DensityState>(page, 'densityState')).tool).toBe('gather');
    await page.keyboard.press('d');
    expect((await call<DensityState>(page, 'densityState')).tool).toBe('off');
    expect(errors).toEqual([]);
});

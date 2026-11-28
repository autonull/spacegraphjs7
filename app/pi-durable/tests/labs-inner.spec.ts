import { expect, test } from '@playwright/test';
import { boot, call, settle } from './boot';

type Representation = {
    readonly nodeIDs: readonly string[];
    readonly edgeKinds: readonly string[];
};

test('labs inner widgets fold, detach and reattach as committed facts', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn&labs=1');
    await call(page, 'zoomBy', 5);
    await settle(page);
    await page.keyboard.press('i');
    const window = page.locator('#canvas [data-node-id^="lab-window:"]');
    await expect(window.locator('[data-gw-action="tab:inner"][data-on="true"]')).toHaveCount(1);
    const panel = window.locator('.foldable-node');
    await expect(panel).toBeVisible();
    const items = panel.locator('[data-inner-item]');
    expect(await items.count()).toBeGreaterThan(0);

    await panel.locator('[data-inner-action="fold"]').click();
    await expect(panel).toHaveAttribute('data-folded', 'true');
    await panel.locator('[data-inner-action="unfold"]').click();
    await expect(panel).toHaveAttribute('data-folded', 'false');

    const before = await call<Representation>(page, 'representation');
    expect(before.edgeKinds).not.toContain('contains');
    await panel.locator('[data-inner-action^="detach:"]').first().click();
    const detached = await call<Representation>(page, 'representation');
    expect(detached.nodeIDs.some((id) => id.startsWith('inner:'))).toBe(true);
    expect(detached.edgeKinds).toContain('contains');

    await panel.locator('[data-inner-action^="reattach:"]').first().click();
    const reattached = await call<Representation>(page, 'representation');
    expect(reattached.nodeIDs.some((id) => id.startsWith('inner:'))).toBe(false);
    expect(reattached.edgeKinds).not.toContain('contains');

    await page.keyboard.press('i');
    await expect(window.locator('[data-gw-action="tab:inner"][data-on="true"]')).toHaveCount(0);
    expect(errors).toEqual([]);
});

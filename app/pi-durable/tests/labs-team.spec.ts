import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

type Representation = {
    readonly nodeIDs: readonly string[];
    readonly edgeKinds: readonly string[];
};

test('labs team view scopes tabs and commits steer as existing facts', async ({ page }) => {
    const errors = await boot(page, '?shot=fork-tabs&labs=1');
    await page.keyboard.press('t');
    const panel = page.locator('#lab-team');
    await expect(panel).toBeVisible();
    await expect(panel.locator('[data-team-agent]')).toHaveCount(2);

    await panel.locator('[data-team-select]').first().click();
    await expect(panel.locator('[data-team-agent]').first()).toHaveAttribute('data-active', 'true');

    await panel.locator('#team-steer-input').fill('review the diff');
    await panel.locator('[data-team-action="steer"]').click();
    await expect(panel.locator('.team-log')).toContainText('operator: review the diff');
    const representation = await call<Representation>(page, 'representation');
    expect(representation.nodeIDs.some((id) => id.startsWith('action:steer-'))).toBe(true);
    expect(representation.edgeKinds).toContain('orders');

    await panel.locator('[data-team-scope]').first().check();
    await expect(panel.locator('.team-stats')).toContainText('1 scoped');
    await expect(panel.locator('[data-team-scope]').first()).toBeChecked();

    await call(page, 'setTab', '2');
    await expect(panel).toBeVisible();
    await page.keyboard.press('t');
    await expect(panel).toBeHidden();
    expect(errors).toEqual([]);
});

test('labs approval re-commits the existing task fact', async ({ page }) => {
    const errors = await boot(page, '?shot=sleeping-approval&labs=1');
    await page.keyboard.press('t');
    await page.locator('#lab-team [data-team-action="approve"]').click();
    await expect(page.locator('#announcer')).toContainText('Approved');
    await expect(page.locator('#lab-team .team-log')).toContainText('operator approved');
    expect(errors).toEqual([]);
});

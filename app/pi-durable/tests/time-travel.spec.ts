import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

test('asOf renders a historical view with a badge and no commit controls', async ({ page }) => {
    const errors = await boot(page, '?asOf=2');
    await expect(page.locator('#asof-badge')).toHaveText('as of 2');
    await expect(page.locator('#canvas')).toContainText('First answer.');
    await expect(page.locator('#canvas')).not.toContainText('Second answer.');
    await expect(page.locator('#prompt-form')).toBeHidden();
    await expect(page.locator('#readonly-banner')).toBeVisible();
    await expect(page.locator('#readonly-message')).toContainText('Viewing entry 2 (read-only)');
    await page.locator('#readonly-return').click();
    await expect(page.locator('#readonly-banner')).toBeHidden();
    await expect(page.locator('#prompt-form')).toBeVisible();
    expect(errors).toEqual([]);

    await page.goto('/?asOf=4');
    await expect(page.locator('#canvas')).toContainText('Second answer.');
});

test('history navigation restores the present after an as-of view', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    type StoredAsOf = { readonly asOf?: number };

    await call(page, 'setAsOf', 2);
    expect((await call<StoredAsOf>(page, 'address')).asOf).toBe(2);
    await call(page, 'setAsOf');
    expect((await call<StoredAsOf>(page, 'address')).asOf).toBeUndefined();

    await call(page, 'historyBack');
    expect((await call<StoredAsOf>(page, 'address')).asOf).toBe(2);
    await call(page, 'historyForward');
    expect((await call<StoredAsOf>(page, 'address')).asOf).toBeUndefined();
    await expect(page.locator('#asof-badge')).toBeHidden();
    expect(errors).toEqual([]);
});

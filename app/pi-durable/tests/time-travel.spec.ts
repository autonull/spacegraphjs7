import { expect, test } from '@playwright/test';
import { boot } from './boot';

test('asOf renders a historical view with a badge and no commit controls', async ({ page }) => {
    const errors = await boot(page, '?asOf=2');
    await expect(page.locator('#asof-badge')).toHaveText('as of 2');
    await expect(page.locator('#canvas')).toContainText('First answer.');
    await expect(page.locator('#canvas')).not.toContainText('Second answer.');
    await expect(page.locator('#prompt-form')).toBeHidden();
    expect(errors).toEqual([]);

    await page.goto('/?asOf=4');
    await expect(page.locator('#canvas')).toContainText('Second answer.');
});

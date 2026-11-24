import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

test('cards and inspector expose committed detail, not just kind labels', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await expect(page.locator('[data-kind="message"]').first()).toContainText('Capital of France?');
    await expect(page.locator('[data-kind="task"]').first()).toContainText('signal: approve');
    await expect(page.locator('[data-kind="task"]').first()).toContainText('wakes 2030-01-01');
    await expect(page.locator('#legend .row')).not.toHaveCount(0);
    await expect(page.locator('#legend')).toContainText('sleeps on');

    await call(page, 'reveal', 'd:1:task:2');
    await expect(page.locator('#inspector')).toContainText('d:1:task:2');
    await expect(page.locator('#inspector')).toContainText('sleeps on');
    expect(errors).toEqual([]);
});

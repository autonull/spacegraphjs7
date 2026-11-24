import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

test('observer stream is historical and has no commit controls', async ({ page }) => {
    const errors = await boot(page, '?observer=1');
    await expect(page.locator('#status-strip')).toContainText('observer');
    await expect(page.locator('#status-strip')).toContainText('read-only');
    await expect(page.locator('#prompt-form')).toBeHidden();
    await expect(page.locator('#fork-button')).toBeHidden();
    await expect(page.locator('#approve-button')).toBeHidden();
    await call(page, 'prompt', 'must not commit');
    await expect(page.locator('#announcer')).toContainText('read-only');
    expect(errors).toEqual([]);
});

import { expect, test } from '@playwright/test';
import { bootConsole, call } from './boot';

test('reading chrome is visible and survives a palette-free permalink', async ({ page }) => {
    const errors = await bootConsole(page);
    await call(page, 'consolePresentation', {
        lineNumbers: true,
        sourceStamp: true,
        wrap: true,
    });

    await expect(page.locator('#canvas .tg-line-no').first()).toBeVisible();
    await expect(page.locator('#canvas .tg-row').first()).toBeVisible();

    const link = await call<string>(page, 'permalink');
    expect(link).toContain('pres=wns');
    expect(link).not.toContain('pal=');
    const compact = await call<string>(page, 'compactAddress');
    const token = new URL(compact, 'http://local').searchParams.get('at')!;
    expect(atob(token.replace(/-/g, '+').replace(/_/g, '/'))).toContain('pres=wns');

    await call(page, 'consolePresentation', {
        lineNumbers: false,
        sourceStamp: false,
        wrap: false,
    });
    expect(await page.locator('#canvas .tg-line-no').count()).toBe(0);

    await call(page, 'applyPermalink', link);
    await expect(page.locator('#canvas .tg-line-no').first()).toBeVisible();
    await expect(page.locator('#canvas .tg-row').first()).toBeVisible();
    expect(errors).toEqual([]);
});

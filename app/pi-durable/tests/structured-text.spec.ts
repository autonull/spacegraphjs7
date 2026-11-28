import { expect, test } from '@playwright/test';
import { bootConsole, call } from './boot';

test('documents profile renders a safe detail card and keeps flags shareable', async ({ page }) => {
    const errors = await bootConsole(page);
    expect(await call<string>(page, 'consoleProfile', 'documents')).toBe('documents');
    await page.locator('#canvas [data-node-id]').nth(1).click();
    await expect(page.locator('#canvas [data-node-id^="detail-"]').first()).toBeVisible();
    expect(await page.locator('#canvas a[href^="javascript"]').count()).toBe(0);

    const link = await call<string>(page, 'permalink');
    expect(link).toContain('pres=');
    await call(page, 'consolePresentation', {
        inlineTokens: false,
        focusDimming: false,
        markdownDetail: false,
    });
    await call(page, 'applyPermalink', link);
    await expect(page.locator('#canvas [data-node-id^="detail-"]').first()).toBeVisible();
    expect(errors).toEqual([]);
});

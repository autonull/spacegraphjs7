import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

test('Lens handles commands from the keyboard and keeps focus state', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await page.keyboard.press('Control+k');
    await expect(page.locator('#lens-input')).toBeFocused();
    await page.locator('#lens-input').fill('view diff');
    await page.keyboard.press('Enter');
    await expect.poll(() => call<string>(page, 'viewName')).toBe('diff');

    await call(page, 'lens', 'view graph');
    await expect.poll(() => call<string>(page, 'viewName')).toBe('graph');
    await call(page, 'lens', 'rung passage');
    await expect.poll(() => call<string>(page, 'rung')).toBe('passage');
    await call(page, 'lens', 'layout radial');
    expect(await call<string>(page, 'layoutName')).toBe('radial');

    await call(page, 'lens', 'find Paris');
    await expect(page.locator('#inspector')).toContainText('Paris');
    await call(page, 'lens', 'view transcript');
    await call(page, 'lens', 'tab 1');
    expect(await call<string>(page, 'activeTab')).toBe('1');
    const permalink = await call<string>(page, 'permalink');
    expect(permalink).toContain('view=transcript');
    expect(permalink).toContain('rung=passage');
    expect(permalink).toContain('layout=radial');
    expect(await call<boolean>(page, 'applyPermalink', permalink)).toBe(true);
    expect(await call<string>(page, 'viewName')).toBe('transcript');
    expect(errors).toEqual([]);
});

test('Shift+Tab leaves Lens even when a completion is available', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await page.keyboard.press('Control+k');
    await expect(page.locator('#lens-input')).toBeFocused();
    await page.locator('#lens-input').fill('view diff');
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => document.activeElement?.id)).not.toBe('lens-input');
    expect(errors).toEqual([]);
});

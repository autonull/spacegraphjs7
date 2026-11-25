import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

test('transcript is a readable document with a graph backlink on every fact', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    await expect(page.locator('#reader')).toBeVisible();
    await expect(page.locator('#reader')).toContainText('Capital of France?');
    await expect(page.locator('#reader')).toContainText('Paris.');
    await expect(page.locator('#reader')).toContainText('lookup()');
    await expect(page.locator('#canvas')).toBeHidden();

    const sections = page.locator('#reader .reading-section');
    expect(await sections.count()).toBeGreaterThan(8);
    await expect(sections.first()).toHaveAttribute('data-node-id', /^d:1:/);
    await expect(page.locator('#reader .reading-backlink')).toHaveCount(await sections.count());

    await page.locator('#reader .reading-backlink').first().click();
    await expect(page.locator('#reader')).toBeHidden();
    await expect(page.locator('#canvas canvas').first()).toBeVisible();
    expect(await call<string>(page, 'viewName')).toBe('graph');
    expect(errors).toEqual([]);
});

test('reader sections are keyboard navigable', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const sections = page.locator('#reader .reading-section');
    await sections.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(sections.nth(1)).toBeFocused();
    await expect(page.locator('#announcer')).toContainText('Passage 2 of');
    await page.keyboard.press('Enter');
    await expect(page.locator('#announcer')).toContainText('Revealed');
    await expect(page.locator('#reader')).toBeHidden();
    expect(await call<string>(page, 'viewName')).toBe('graph');
    expect(errors).toEqual([]);
});

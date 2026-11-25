import { expect, test } from '@playwright/test';
import { boot, call, openPanel } from './boot';

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

test('documents render as a readable document with graph backlinks', async ({ page }) => {
    const errors = await boot(page, '?shot=docs');
    await expect(page.locator('#reader')).toBeVisible();
    await expect(page.locator('#reader')).toHaveAttribute('aria-label', 'Documents');
    await expect(page.locator('#reader')).toContainText('Host todos');
    const sections = page.locator('#reader .reading-section');
    expect(await sections.count()).toBeGreaterThan(0);
    await expect(page.locator('#reader .reading-backlink')).toHaveCount(await sections.count());
    expect(errors).toEqual([]);
});

test('reveal focuses a passage in the reader instead of the hidden canvas', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const section = page.locator('#reader .reading-section').nth(2);
    await call(page, 'reveal', await section.getAttribute('data-node-id'));
    await expect(section).toBeFocused();
    expect(errors).toEqual([]);
});

test('the inspector links a graph fact back to its passage', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const id = await page.locator('#reader .reading-section').first().getAttribute('data-node-id');
    await call(page, 'setView', 'graph');
    await call(page, 'reveal', id);
    await openPanel(page, 'inspector');
    await expect(page.locator('#read-in-transcript')).toBeVisible();
    await page.click('#read-in-transcript');
    await expect(page.locator('#reader')).toBeVisible();
    await expect(page.locator(`#reader .reading-section[data-node-id="${id}"]`)).toBeFocused();
    expect(errors).toEqual([]);
});

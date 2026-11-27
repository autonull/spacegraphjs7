import { expect, test } from '@playwright/test';
import { boot, call, openPanel } from './boot';

test('transcript is a vector console over the same committed facts', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    await expect(page.locator('#reader')).toBeHidden();
    await expect(page.locator('#canvas')).toBeVisible();

    const lines = page.locator('#canvas [data-node-id]');
    expect(await lines.count()).toBeGreaterThan(8);
    await expect(lines.first()).toHaveAttribute('data-node-id', /^d:1:/);
    await expect(page.locator('#canvas .sg-terminal-line').first()).toBeVisible();

    await lines.first().click();
    expect(await call<string>(page, 'viewName')).toBe('transcript');
    await expect(page.locator('#announcer')).toContainText('Revealed');
    expect(errors).toEqual([]);
});

test('console lines are keyboard navigable', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const lines = page.locator('#canvas [data-node-id]');
    await lines.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(lines.nth(1)).toBeFocused();
    await expect(page.locator('#announcer')).toContainText('Line 2 of');
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

test('reveal focuses a line in the console instead of the hidden reader', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const line = page.locator('#canvas [data-node-id]').nth(2);
    const id = await line.getAttribute('data-node-id');
    await call(page, 'reveal', id);
    await expect(line).toBeFocused();
    expect(errors).toEqual([]);
});

test('the inspector links a graph fact back to its console line', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const id = await page.locator('#canvas [data-node-id]').first().getAttribute('data-node-id');
    await call(page, 'setView', 'graph');
    await call(page, 'reveal', id);
    await openPanel(page, 'inspector');
    await expect(page.locator('#read-in-transcript')).toBeVisible();
    await page.click('#read-in-transcript');
    await expect(page.locator('#reader')).toBeHidden();
    await expect(page.locator(`#canvas [data-node-id="${id}"]`)).toBeFocused();
    expect(errors).toEqual([]);
});

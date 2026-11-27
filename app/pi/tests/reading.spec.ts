import { expect, test } from '@playwright/test';
import { boot } from './boot';

const open = (page: import('@playwright/test').Page) =>
    page.evaluate(() => (window as any).__pi.toggleReading(true));

test('the reading view projects committed facts and links back to the graph', async ({ page }) => {
    const errors = await boot(page);
    await expect(page.locator('#reading')).toBeHidden();
    await open(page);
    await expect(page.locator('#reading')).toBeVisible();
    await expect(page.locator('#read-toggle')).toHaveAttribute('aria-pressed', 'true');
    const sections = page.locator('#reading .reading-section');
    expect(await sections.count()).toBeGreaterThan(1);
    await expect(sections.first()).toContainText('user message');
    const id = await sections.first().getAttribute('data-node-id');
    expect(id).toBeTruthy();
    await sections.first().click();
    await expect(page.locator('#reading')).toBeHidden();
    await expect(page.locator('#read-toggle')).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => page.evaluate(() => location.hash)).toBe(`#graph:${id}`);
    expect(errors).toEqual([]);
});

test('the command surface can open reading and close it again', async ({ page }) => {
    const errors = await boot(page);
    await page.evaluate(() => (window as any).__pi.openCommands('palette', 'read the committed'));
    await expect(page.locator('[data-command-id="ui.read"]')).toBeVisible();
    await page.locator('[data-command-id="ui.read"]').click();
    await expect(page.locator('#reading')).toBeVisible();
    await page.locator('#reading-close').click();
    await expect(page.locator('#reading')).toBeHidden();
    expect(errors).toEqual([]);
});

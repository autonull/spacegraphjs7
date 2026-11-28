import { expect, test, type Page } from '@playwright/test';
import { boot, call } from './boot';

const scene = (page: Page) => page.locator('#canvas [data-terminal-prompt]');

test('slash commands in the scene prompt share one catalog', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const field = scene(page);
    await field.fill('/se');
    await expect(page.locator('#console-completions')).toBeVisible();
    await expect(page.locator('#console-completions')).toContainText('/search');
    await field.fill('/search ERROR');
    await field.press('Enter');
    expect((await call<{ search?: string }>(page, 'consoleSelector')).search).toBe('ERROR');
    await field.fill('/pin snapshot');
    await field.press('Enter');
    expect(await call<string>(page, 'consoleMode')).toBe('snapshot');
    expect((await call<{ follow?: boolean }>(page, 'consoleSelector')).follow).toBe(false);
    expect(errors).toEqual([]);
});

test('the catalog generates help and dispatches historical commands', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const help = await call<string>(page, 'consoleHelp');
    expect(help).toContain('/search <text>');
    expect(help).toContain('/pin snapshot');
    await scene(page).fill('/as of 2');
    await scene(page).press('Enter');
    expect((await call<{ asOf?: number }>(page, 'address')).asOf).toBe(2);
    expect(errors).toEqual([]);
});

test('the context menu exposes the same console commands', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    await page.locator('#canvas [data-node-id]').first().click({ button: 'right' });
    await expect(page.locator('#console-menu')).toBeVisible();
    await expect(page.locator('#console-menu-items')).toContainText('/copy');
    await page.locator('#console-menu-items button').filter({ hasText: '/copy' }).click();
    await expect(page.locator('#announcer')).toContainText(/Copied|Nothing to copy/);
    expect(errors).toEqual([]);
});

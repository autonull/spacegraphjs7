import { expect, test } from '@playwright/test';
import { bootConsole, call } from './boot';

test('the reading lens opens a safe reading view from the console', async ({ page }) => {
    const errors = await bootConsole(page);
    expect(await call<number>(page, 'consoleRead', 'current')).toBe(1);
    await expect(page.locator('#console-reading')).toBeVisible();
    await expect(page.locator('#console-reading-body .reading-section')).toHaveCount(1);
    await page.locator('#console-reading-close').click();
    await expect(page.locator('#console-reading')).toBeHidden();
    expect(errors).toEqual([]);
});

test('profiles replace scattered presentation flags', async ({ page }) => {
    const errors = await bootConsole(page);
    const profiles = await call<readonly { id: string }[]>(page, 'consoleProfiles');
    expect(profiles.map((profile) => profile.id)).toEqual([
        'logs', 'presentation', 'high-contrast', 'big-text',
    ]);
    expect(await call<string>(page, 'consoleProfile', 'big-text')).toBe('big-text');
    await expect(page.locator('#canvas .sg-terminal-wrap').first()).toBeVisible();
    await call(page, 'consoleProfile', 'logs');
    await expect(page.locator('#canvas [data-line-no]').first()).toBeVisible();
    expect(errors).toEqual([]);
});

test('the assistive mirror follows console focus roles', async ({ page }) => {
    const errors = await bootConsole(page);
    expect(await page.locator('#console-a11y [role="listbox"] li').count()).toBeGreaterThan(0);
    expect(['camera', 'view', 'node', 'input']).toContain(
        await call<string>(page, 'consoleFocusRole'),
    );
    await page.locator('#canvas [data-terminal-prompt]').focus();
    expect(await call<string>(page, 'consoleFocusRole')).toBe('input');
    expect(errors).toEqual([]);
});

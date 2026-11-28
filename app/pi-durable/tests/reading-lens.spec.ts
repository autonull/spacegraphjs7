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

test('console reading sections navigate and reveal their backlinks', async ({ page }) => {
    const errors = await bootConsole(page);
    expect(await call<number>(page, 'consoleRead', 'all')).toBeGreaterThan(0);
    const sections = page.locator('#console-reading-body .reading-section');
    await expect(sections.first()).toBeVisible();
    await sections.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(sections.nth(1)).toBeFocused();
    await sections.nth(1).locator('.reading-backlink').click();
    await expect(page.locator('#console-reading')).toBeHidden();
    expect(errors).toEqual([]);
});

test('the assistive mirror keeps full text at every fidelity band', async ({ page }) => {
    const errors = await bootConsole(page);
    for (const band of ['dot', 'glyph', 'card', 'detail']) {
        await call(page, 'consoleLOD', band);
        const mirror = await page.locator('#console-a11y [role="listbox"] li').allTextContents();
        expect(mirror.join(' ')).toContain('Capital of France?');
    }
    expect(errors).toEqual([]);
});

test('help lists graph, fidelity and keyboard grammar', async ({ page }) => {
    const errors = await bootConsole(page);
    const help = await call<string>(page, 'consoleHelp');
    for (const needle of ['/grow', '/embed', '/lod', '/graph', 'x —', 'Escape —'])
        expect(help).toContain(needle);
    expect(errors).toEqual([]);
});

test('profiles replace scattered presentation flags', async ({ page }) => {
    const errors = await bootConsole(page);
    const profiles = await call<readonly { id: string }[]>(page, 'consoleProfiles');
    expect(profiles.map((profile) => profile.id)).toEqual([
        'logs', 'presentation', 'high-contrast', 'big-text', 'fractal', 'documents',
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

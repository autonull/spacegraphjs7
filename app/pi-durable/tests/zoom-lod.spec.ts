import { expect, test } from '@playwright/test';
import { bootConsole, call, settle } from './boot';

test('fractal profile steps through glyph, label and text fidelity', async ({ page }) => {
    const errors = await bootConsole(page);
    const lod = (): Promise<string> => call<string>(page, 'consoleLOD');
    await expect(page.locator('#canvas .tg-text').first()).toBeVisible();

    await call(page, 'consoleProfile', 'fractal');
    await settle(page);
    expect(await lod()).toBe('glyph');
    await expect(page.locator('#canvas .tg-glyph-label').first()).toBeVisible();
    expect(await page.locator('#canvas .tg-text').count()).toBe(0);
    expect(await page.locator('#canvas [data-node-id^="chapter-label-"]').count()).toBe(0);

    await call(page, 'zoomBy', 0.4);
    await settle(page);
    expect(await lod()).toBe('dot');
    await expect(page.locator('#canvas .tg-glyph-only').first()).toBeVisible();
    expect(await page.locator('#canvas .tg-glyph-label').count()).toBe(0);

    await call(page, 'zoomBy', 5);
    await settle(page);
    expect(await lod()).toBe('card');
    expect(await page.locator('#canvas .tg-text').count()).toBeGreaterThan(0);
    expect(
        await page.locator('#canvas [data-node-id^="chapter-label-"]').count(),
    ).toBeGreaterThan(0);
    expect(errors).toEqual([]);
});

test('a pinned fidelity band survives a permalink', async ({ page }) => {
    const errors = await bootConsole(page);
    const lod = (): Promise<string> => call<string>(page, 'consoleLOD');
    expect(await call<string>(page, 'consoleLOD', 'dot')).toBe('dot');
    expect(await lod()).toBe('dot');
    expect(await page.locator('#canvas .tg-glyph-only').count()).toBeGreaterThan(0);

    const link = await call<string>(page, 'permalink');
    expect(link).toContain('lod=dot');
    await call(page, 'zoomBy', 2);
    expect(await lod()).toBe('dot');
    await call(page, 'applyPermalink', link);
    expect(await lod()).toBe('dot');
    await call(page, 'consoleLOD', 'auto');
    expect(await lod()).toBe('glyph');
    expect(errors).toEqual([]);
});

test('hovering a console line reveals a safe peek card', async ({ page }) => {
    const errors = await bootConsole(page);
    await page.locator('#canvas .sg-terminal-line').first().hover();
    await expect(page.locator('#canvas [data-node-id^="hover-"]').first()).toBeVisible();
    expect(errors).toEqual([]);
});

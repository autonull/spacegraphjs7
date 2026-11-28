import { expect, test } from '@playwright/test';
import { bootConsole, call, settle } from './boot';

test('fractal profile collapses console text at far zoom and restores it close up', async ({
    page,
}) => {
    const errors = await bootConsole(page);
    const lod = (): Promise<string> => call<string>(page, 'consoleLOD');
    await expect(page.locator('#canvas .tg-text').first()).toBeVisible();

    await call(page, 'consoleProfile', 'fractal');
    await settle(page);
    expect(await lod()).toBe('glyph');
    await expect(page.locator('#canvas .tg-glyph-only').first()).toBeVisible();
    expect(
        await page.locator('#canvas .sg-terminal-line[data-lod="glyph"]').count(),
    ).toBeGreaterThan(0);
    expect(await page.locator('#canvas .tg-text').count()).toBe(0);
    expect(await page.locator('#canvas [data-node-id^="chapter-label-"]').count()).toBe(0);

    await call(page, 'zoomBy', 2);
    await settle(page);
    expect(await lod()).toBe('card');
    expect(await page.locator('#canvas .tg-text').count()).toBeGreaterThan(0);
    expect(
        await page.locator('#canvas [data-node-id^="chapter-label-"]').count(),
    ).toBeGreaterThan(0);
    expect(errors).toEqual([]);
});

test('hovering a console line reveals a safe peek card', async ({ page }) => {
    const errors = await bootConsole(page);
    await page.locator('#canvas .sg-terminal-line').first().hover();
    await expect(page.locator('#canvas [data-node-id^="hover-"]').first()).toBeVisible();
    expect(errors).toEqual([]);
});

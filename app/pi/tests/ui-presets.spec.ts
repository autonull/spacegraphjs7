import { expect, test, type Page } from '@playwright/test';

const ready = (page: Page): Promise<unknown> =>
    page.waitForFunction(() => (window as any).__pi?.ready === true);

const ui = (page: Page): Promise<unknown> =>
    page.evaluate(() => (window as any).__pi.ui());

const chrome = (page: Page): Promise<unknown> =>
    page.evaluate(() => document.body.dataset.uiChrome);

test.describe('UI presets', () => {
    test('a URL preset reaches the host and permalink survives reload', async ({ page }) => {
        await page.goto('/?ui=compact');
        await ready(page);
        expect(await ui(page)).toBe('compact');
        expect(await chrome(page)).toBe('compact');
        expect(await page.evaluate(() => (document.getElementById('minimap') as HTMLElement).hidden)).toBe(true);

        const link = await page.evaluate(() => (window as any).__pi.permalink());
        await page.goto(`/${link}`);
        await ready(page);
        expect(await ui(page)).toBe('compact');
        expect(await chrome(page)).toBe('compact');
    });

    test('hooks apply a preset through the knob layer and restore it', async ({ page }) => {
        await page.goto('/');
        await ready(page);
        const applied = await page.evaluate(() => (window as any).__pi.applyUIPreset('light-shell'));
        expect(applied).toBe('light-shell');
        expect(await page.evaluate(() => (window as any).__pi.policy().values['theme.variant'])).toBe('light');
        expect(await page.evaluate(() => (window as any).__pi.policy().provenance['theme.variant'])).toBe('experiment');
        expect(await page.evaluate(() => (window as any).__pi.applyUIPreset('full'))).toBe('full');
        expect(await chrome(page)).toBe('full');
    });

    test('the u shortcut opens a compact lab list that restores chrome', async ({ page }) => {
        await page.goto('/?ui=compact');
        await ready(page);
        await page.evaluate(() => (window as any).__pi.openCommands('palette', 'ui preset'));
        await expect(page.locator('#command-surface')).toBeVisible();
        const ids = await page.locator('[data-command-id]').evaluateAll((rows) =>
            rows.map((row) => row.getAttribute('data-command-id')),
        );
        expect(ids).toContain('lab.full');
        expect(ids.some((id) => id?.startsWith('verb.'))).toBe(false);
        await page.locator('[data-command-id="lab.full"]').click();
        expect(await ui(page)).toBe('full');
        expect(await chrome(page)).toBe('full');
    });
});

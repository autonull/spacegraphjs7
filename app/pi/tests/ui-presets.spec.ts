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

    test('the scale-aware packing preset is a one-URL opt-in', async ({ page }) => {
        await page.goto('/?ui=scale-aware');
        await ready(page);
        expect(await ui(page)).toBe('scale-aware');
        expect(
            await page.evaluate(
                () => (window as any).__pi.policy().values['geometry.occupancyTarget'],
            ),
        ).toBe(0.12);
        expect(await page.evaluate(() => (window as any).__pi.occupancyTarget())).toBe(0.12);
        await page.evaluate(() => (window as any).__pi.openCommands('palette', 'ui preset'));
        const ids = await page.locator('[data-command-id]').evaluateAll((rows) =>
            rows.map((row) => row.getAttribute('data-command-id')),
        );
        expect(ids).toContain('lab.scale-aware');
    });

    test('the continuity preset is a one-URL opt-in with a reachable toggle', async ({ page }) => {
        await page.goto('/?ui=continuity');
        await ready(page);
        expect(await ui(page)).toBe('continuity');
        expect(await page.evaluate(() => document.body.dataset.uiGrammar)).toBe('continuity');
        expect(await page.evaluate(() => (window as any).__pi.continuity())).toBe(true);
        expect(
            await page.evaluate(() => (window as any).__pi.policy().values['theme.backdrop']),
        ).toBe('flat');
        await page.evaluate(() => (window as any).__pi.openCommands('palette', 'graph view'));
        const ids = await page.locator('[data-command-id]').evaluateAll((rows) =>
            rows.map((row) => row.getAttribute('data-command-id')),
        );
        expect(ids).toContain('view.continuity');
        await page.evaluate(() => (window as any).__pi.applyUIPreset('full'));
        expect(await page.evaluate(() => document.body.dataset.uiGrammar)).toBe('none');
        expect(await page.evaluate(() => (window as any).__pi.continuity())).toBe(false);
    });

    test('solved-target scope fields are a one-URL opt-in separate from continuity', async ({ page }) => {
        await page.goto('/?ui=field-targets');
        await ready(page);
        expect(await ui(page)).toBe('field-targets');
        expect(await page.evaluate(() => document.body.dataset.uiField)).toBe('targets');
        expect(await page.evaluate(() => (window as any).__pi.fieldTargets())).toBe(true);
        expect(await page.evaluate(() => (window as any).__pi.continuity())).toBe(false);
        await expect
            .poll(() => page.locator('#structure .field-hull').count(), { timeout: 10_000 })
            .toBeGreaterThan(0);
        await page.evaluate(() => (window as any).__pi.openCommands('palette', 'graph view'));
        const ids = await page.locator('[data-command-id]').evaluateAll((rows) =>
            rows.map((row) => row.getAttribute('data-command-id')),
        );
        expect(ids).toContain('view.fieldTargets');
        await page.evaluate(() => (window as any).__pi.applyUIPreset('full'));
        expect(await page.evaluate(() => document.body.dataset.uiField)).toBe('projected');
        expect(await page.evaluate(() => (window as any).__pi.fieldTargets())).toBe(false);
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

import { expect, test, type Page } from '@playwright/test';

// P0.3 — the config explorer. Served by `root: demo`, so the page is `/explorer.html`; run
// `pnpm run dev:demo` first. The page owns a window API so the same state can be driven by a test.

async function boot(page: Page) {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto('/explorer.html');
    await page.waitForFunction(() => (window as any).__ready === true);
    await page.evaluate(() => document.fonts.ready);
    return errors;
}

const api = <T>(page: Page, call: string, ...args: unknown[]) =>
    page.evaluate(
        ({ call, args }) => (window as any).__explorer[call](...args) as T,
        { call, args },
    );

const noErrors = (errors: string[]) =>
    expect(errors.filter((error) => !error.includes('favicon'))).toEqual([]);

test.describe('configuration explorer (P0.3)', () => {
    test('lists every declared axis and renders the contract fixture', async ({ page }) => {
        const errors = await boot(page);
        const axes = await api<string[]>(page, 'axes');

        expect(axes).toContain('projection');
        expect(axes).toContain('depth');
        expect(axes).toContain('lod');
        expect(axes).toContain('source');
        for (const axis of axes) await expect(page.locator(`[data-axis="${axis}"]`).first()).toBeVisible();
        await expect(page.locator('#left-graph svg')).toBeVisible();
        expect((await api<number[]>(page, 'nodes'))[0]).toBe(8);
        noErrors(errors);
    });

    test('switches the live representation with the lod axis', async ({ page }) => {
        await boot(page);
        await page.locator('[data-axis="lod"][data-value="dot"]').click();
        await expect(page.locator('#left-graph svg circle').first()).toBeVisible();
        expect(await page.locator('#left-graph svg circle').count()).toBe(
            await api<number[]>(page, 'nodes').then((counts) => counts[0]),
        );

        await page.locator('[data-axis="lod"][data-value="detail"]').click();
        expect(await page.locator('#left-graph svg circle').count()).toBe(0);
    });

    test('switches the edge rung through the edgeLod axis', async ({ page }) => {
        await boot(page);
        await page.locator('[data-axis="edgeLod"][data-value="arrow"]').click();
        const arrows = await page.locator('#left-graph svg line[stroke-dasharray]').count();

        await page.locator('[data-axis="edgeLod"][data-value="bundle"]').click();
        const bundles = await page.locator('#left-graph svg line[stroke-dasharray]').count();
        expect(bundles).toBeGreaterThan(arrows);
    });

    test('drives the second host over the same model', async ({ page }) => {
        await boot(page);
        const contractNodes = (await api<number[]>(page, 'nodes'))[0];
        await api(page, 'set', 'source', 'secondHost');

        await expect(page.locator('#left-title')).toContainText('secondHost');
        const hostNodes = (await api<number[]>(page, 'nodes'))[0];
        expect(hostNodes).toBeGreaterThan(0);
        expect(hostNodes).not.toBe(contractNodes);
    });

    test('round-trips the full state through the URL hash', async ({ page }) => {
        await boot(page);
        await api(page, 'set', 'lod', 'glyph');
        await api(page, 'set', 'depth', 'orbit');
        const hash = await api<string>(page, 'hash');

        await page.goto(`/explorer.html${hash}`);
        await page.waitForFunction(() => (window as any).__ready === true);
        expect(await api<string>(page, 'hash')).toBe(hash);
        expect((await api<Record<string, string>>(page, 'config')).lod).toBe('glyph');
    });

    test('compares two states and labels presets as examples', async ({ page }) => {
        await boot(page);
        await expect(page.locator('fieldset').filter({ has: page.locator('#presets') })).toContainText(
            'Examples, not defaults',
        );
        await page.locator('#compare').click();

        await expect(page.locator('#right-pane')).toBeVisible();
        expect(await page.locator('#right-graph svg').count()).toBe(1);
        expect(await page.locator('#diff').textContent()).toContain('→');

        await page.locator('[data-preset="zero-motion"]').click();
        expect((await api<Record<string, string>>(page, 'config')).motion).toBe('reduced');
    });

    test('randomize and reset stay within the declared values', async ({ page }) => {
        await boot(page);
        await api(page, 'randomize');
        const randomized = await api<Record<string, string>>(page, 'config');
        expect(Object.keys(randomized).length).toBeGreaterThan(5);
        await api(page, 'reset');
        expect((await api<Record<string, string>>(page, 'config')).lod).toBe('card');
    });
});

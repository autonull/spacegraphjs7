import { expect, test } from '@playwright/test';

test.describe('scenario lab', () => {
    test('renders a domain/layout/preset view through one position source', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('/html/core/scenario.html?domain=workflow&layout=chapters&preset=quiet');
        await page.waitForFunction(() => Boolean((globalThis as any).__scenario));
        await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });

        const state = await page.evaluate(() => {
            const scenario = (globalThis as any).__scenario;
            const positions = scenario.positions();
            return {
                domain: scenario.domain,
                layout: scenario.layout,
                preset: scenario.preset,
                nodes: scenario.nodes.length,
                positioned: positions.filter((entry: unknown[]) => entry[1]).length,
                columns: new Set(
                    positions.map((entry: unknown[]) => (entry[1] as { x: number } | undefined)?.x),
                ).size,
            };
        });
        expect(state.domain).toBe('workflow');
        expect(state.layout).toBe('chapters');
        expect(state.preset).toBe('quiet');
        expect(state.nodes).toBeGreaterThan(1);
        expect(state.positioned).toBe(state.nodes);
        expect(state.columns).toBeGreaterThan(1);
        expect(errors).toEqual([]);
    });

    test('the lab links switch domain and layout without changing the host', async ({ page }) => {
        await page.goto('/html/core/scenario.html?domain=workflow&layout=grid');
        await page.waitForFunction(() => Boolean((globalThis as any).__scenario));
        await page.getByRole('link', { name: 'data', exact: true }).click();
        await page.waitForFunction(
            () => (globalThis as any).__scenario?.domain === 'data',
        );
        await page.getByRole('link', { name: 'chapters', exact: true }).click();
        await page.waitForFunction(
            () => (globalThis as any).__scenario?.layout === 'chapters',
        );
        expect(await page.evaluate(() => (globalThis as any).__scenario?.domain)).toBe('data');
    });
});

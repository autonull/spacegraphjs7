import { expect, test } from '@playwright/test';

const boot = async (page: import('@playwright/test').Page): Promise<string[]> => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/html/core/source-graph.html');
    await page.waitForFunction(() => Boolean((globalThis as any).__sourceGraph?.ready));
    await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
    return errors;
};

test.describe('source graph browser', () => {
    test('graphs the SpaceGraphJS API snapshot', async ({ page }) => {
        const errors = await boot(page);
        const state = await page.evaluate(() => {
            const graph = (globalThis as any).__sourceGraph;
            return {
                nodes: graph.nodes().length,
                edges: graph.edges().length,
                counts: graph.counts(),
            };
        });
        expect(state.nodes).toBeGreaterThan(50);
        expect(state.edges).toBeGreaterThan(50);
        expect(state.counts).toContain('files');
        expect(await page.locator('#minimap circle').count()).toBeGreaterThan(20);
        expect(errors).toEqual([]);
    });

    test('package filters and search narrow the graph', async ({ page }) => {
        const errors = await boot(page);
        await page.evaluate(() =>
            (globalThis as any).__sourceGraph.filter({
                scope: 'all',
                packageId: '@spacegraphjs/renderer',
            }),
        );
        const filtered = await page.evaluate(() => {
            const graph = (globalThis as any).__sourceGraph;
            return { nodes: graph.nodes() as string[], counts: graph.counts() };
        });
        expect(filtered.nodes.length).toBeGreaterThan(1);
        expect(filtered.nodes.every((id) => id.includes('@spacegraphjs/renderer'))).toBe(true);
        expect(filtered.counts).toContain('packages');
        await page.locator('#query').fill('escapeHtml');
        await expect(page.locator('#query')).toHaveValue('escapeHtml');
        await expect
            .poll(() =>
                page.evaluate(() =>
                    ((globalThis as any).__sourceGraph.nodes() as string[]).some((id) =>
                        id.endsWith(':escapeHtml'),
                    ),
                ),
            )
            .toBe(true);
        expect(errors).toEqual([]);
    });

    test('selecting a symbol shows its source facts', async ({ page }) => {
        const errors = await boot(page);
        await page.evaluate(() =>
            (globalThis as any).__sourceGraph.filter({ detail: 'symbols', scope: 'public' }),
        );
        const id = await page.evaluate(() => {
            const graph = (globalThis as any).__sourceGraph;
            return (graph.nodes() as string[]).find((node) => node.split(':').length >= 5);
        });
        expect(id).toBeTruthy();
        await page.evaluate((nodeID) => (globalThis as any).__sourceGraph.select(nodeID), id);
        const inspector = await page.locator('#inspector').innerText();
        expect(inspector).toContain(id!.split(':').at(-1)!);
        expect(inspector).toContain('DEPENDENCIES');
        expect(inspector).toContain('REFERENCES');
        expect(errors).toEqual([]);
    });
});

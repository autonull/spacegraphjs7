import { expect, test, type Page } from '@playwright/test';
import { boot, call } from './boot';

type Representation = {
    readonly view: string;
    readonly nodes: number;
    readonly edgeKinds: readonly string[];
    readonly laneLabels: readonly string[];
    readonly axisLabels: readonly string[];
};

const ALLOWED_EDGES = new Set([
    'orders', 'owns', 'waiting.on', 'sleeps-on', 'delegates', 'retry',
    'checkpoint', 'fork', 'forkedFrom',
]);

const cases = [
    { id: 'diff', lanes: ['added', 'removed'], assertion: async (page: Page) => {
        await expect(page.locator('#canvas [data-diff="added"]').first()).toBeVisible();
        await expect(page.locator('#canvas [data-diff="removed"]').first()).toBeVisible();
    } },
    { id: 'trace', lanes: ['spans'], assertion: async (page: Page) => {
        await expect(page.locator('#canvas')).toContainText('pi.durable.tool.call');
    } },
    { id: 'docs', lanes: ['documents'], assertion: async (page: Page) => {
        await expect(page.locator('#reader')).toBeVisible();
        await expect(page.locator('#reader')).toContainText('Host todos');
        await expect(page.locator('#reader .reading-backlink').first()).toHaveAttribute('data-node-id', /^d:/);
    } },
    { id: 'transcript', lanes: ['entries'], assertion: async (page: Page) => {
        await expect(page.locator('#reader')).toContainText('Compacted.');
        await expect(page.locator('#reader .reading-section').first()).toBeVisible();
        await expect(page.locator('#reader .reading-backlink').first()).toHaveAttribute('data-node-id', /^d:/);
    } },
] as const;

for (const entry of cases) {
    test(`${entry.id} re-places the same kernel without inventing causes`, async ({ page }) => {
        const errors = await boot(page, `?shot=${entry.id}`);
        await expect(page.locator(`#view-switch button[data-view="${entry.id}"]`)).toHaveAttribute('aria-selected', 'true');
        const representation = await call<Representation>(page, 'representation');
        expect(representation.view).toBe(entry.id);
        expect(representation.nodes).toBeGreaterThan(0);
        expect(representation.laneLabels).toEqual(expect.arrayContaining([...entry.lanes]));
        expect(representation.edgeKinds.every((kind) => ALLOWED_EDGES.has(kind))).toBe(true);
        if (entry.id === 'trace' || entry.id === 'docs') expect(representation.edgeKinds).toEqual([]);
        if (entry.id === 'transcript') expect(representation.axisLabels).toContain('committed order');
        await entry.assertion(page);
        expect(errors).toEqual([]);
    });
}

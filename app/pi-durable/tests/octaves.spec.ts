import { expect, test } from '@playwright/test';
import { boot, call, settle } from './boot';

type Representation = {
    readonly nodes: number;
    readonly octaves: Readonly<Record<string, number>>;
    readonly bands: Readonly<Record<string, number>>;
};

test('one octave ladder renders at least four sizes and three bands', async ({ page }) => {
    const errors = await boot(page, '?shot=busy-inbox');
    const representation = await call<Representation>(page, 'representation');
    expect(Object.values(representation.octaves).every((octave) => octave >= 0 && octave <= 6)).toBe(true);
    expect(Object.keys(representation.bands).length).toBeGreaterThanOrEqual(3);
    const octaves = await page.locator('#canvas .durable-card[data-octave]').evaluateAll((nodes) =>
        [...new Set(nodes.map((node) => (node as HTMLElement).dataset['octave']))]);
    expect(octaves.length).toBeGreaterThanOrEqual(4);
    await expect(page.locator('#canvas .durable-card[data-band]').first()).toBeVisible();
    expect(errors).toEqual([]);
});

test('zooming toward cosmos grows committed nodes on the same ladder', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setRung', 'grain');
    await settle(page);
    const grain = await call<Representation>(page, 'representation');
    await call(page, 'setRung', 'cosmos');
    await settle(page);
    const cosmos = await call<Representation>(page, 'representation');
    const shared = Object.keys(grain.octaves).filter((id) => id in cosmos.octaves);
    expect(shared.length).toBeGreaterThan(0);
    expect(shared.some((id) => cosmos.octaves[id]! > grain.octaves[id]! + 0.5)).toBe(true);
    expect(errors).toEqual([]);
});

for (const viewport of [{ width: 1600, height: 1000 }, { width: 900, height: 700 }]) {
    test(`octave sizes keep cards clear at ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        const errors = await boot(page, '?shot=basic-turn');
        const boxes = await page.locator('#canvas .durable-card').evaluateAll((nodes) =>
            nodes.map((node) => {
                const rect = (node as HTMLElement).getBoundingClientRect();
                return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
            }));
        const overlapping = boxes.flatMap((a, index) => boxes.slice(index + 1).filter((b) => {
            const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
            const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
            return width > 0 && height > 0 && width * height > 0.25 * Math.min(a.width * a.height, b.width * b.height);
        }));
        expect(overlapping).toHaveLength(0);
        expect(errors).toEqual([]);
    });
}

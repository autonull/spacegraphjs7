import { expect, test, type Page } from '@playwright/test';

type LayersWindow = Window & {
    layersDemo?: {
        setLayer(index: number): void;
        draw(t: number): void;
        readonly params: { level: string; lens: string; depth: number };
        readonly nodeCount: number;
        readonly diff: { added: number; removed: number };
        positionOf(id: string): [number, number, number] | undefined;
    };
};

const positionOf = (page: Page, id: string) =>
    page.evaluate((id) => (window as LayersWindow).layersDemo?.positionOf(id), id);

const demo = (page: Page) =>
    page.evaluate(() => {
        const value = (window as LayersWindow).layersDemo;
        return value === undefined
            ? undefined
            : { params: value.params, nodeCount: value.nodeCount, diff: value.diff };
    });

test('one control writes level, lens and depth through derive, diff and the shared clock', async ({
    page,
}) => {
    await page.goto('/layers.html');

    await expect(page.locator('svg')).toHaveCount(1);
    expect(await demo(page)).toEqual({
        params: { level: '2', lens: 'all', depth: 3 },
        nodeCount: 9,
        diff: { added: 9, removed: 0 },
    });

    const allC = await positionOf(page, 'c');

    await page.locator('#layer').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#live')).toHaveText('Code, shallow');
    expect(await demo(page)).toEqual({
        params: { level: '2', lens: 'code', depth: 2 },
        nodeCount: 2,
        diff: { added: 0, removed: 7 },
    });

    const shallowC = await positionOf(page, 'c');
    expect(shallowC).not.toEqual(allC);

    await page.evaluate(() => (window as LayersWindow).layersDemo?.draw(0));
    expect(await positionOf(page, 'c')).toEqual(allC);
    await page.evaluate(() => (window as LayersWindow).layersDemo?.draw(0.5));
    expect(await positionOf(page, 'c')).not.toEqual(shallowC);
    await page.evaluate(() => (window as LayersWindow).layersDemo?.draw(1));
    expect(await positionOf(page, 'c')).toEqual(shallowC);
    await expect(page.locator('#live')).toHaveText('Code, shallow');

    await page.locator('#layer').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#live')).toHaveText('Surface');
    expect(await demo(page)).toEqual({
        params: { level: '0', lens: 'all', depth: 1 },
        nodeCount: 3,
        diff: { added: 2, removed: 1 },
    });

    const surfaceD = await positionOf(page, 'd');
    await page.evaluate(() => (window as LayersWindow).layersDemo?.setLayer(0));
    await expect(page.locator('#live')).toHaveText('All layers');
    const settledD = await positionOf(page, 'd');
    expect(settledD).not.toEqual(surfaceD);

    await page.evaluate(() => (window as LayersWindow).layersDemo?.draw(0));
    expect(await positionOf(page, 'd')).toEqual(surfaceD);
    await page.evaluate(() => (window as LayersWindow).layersDemo?.draw(1));
    expect(await positionOf(page, 'd')).toEqual(settledD);
    await expect(page.locator('#live')).toHaveText('All layers');
});

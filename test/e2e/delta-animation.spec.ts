import { expect, test, type Page } from '@playwright/test';

type DeltaWindow = Window & {
    deltaDemo?: {
        draw(t: number): void;
        positionOf(id: string): [number, number, number] | undefined;
    };
};

const positionOf = (page: Page, id: string) =>
    page.evaluate((id) => {
        const demo = (window as DeltaWindow).deltaDemo;
        return demo?.positionOf(id);
    }, id);

test('merges and switches layers through the same clock without per-frame announcements', async ({
    page,
}) => {
    await page.goto('/delta-animation.html');

    await expect(page.locator('svg')).toHaveCount(1);
    const baseB = await positionOf(page, 'b');
    expect(baseB).toBeDefined();

    await page.getByRole('button', { name: 'Merge turn 2' }).click();
    await expect(page.locator('#live')).toHaveText('Turn 2 merged');
    const mergedB = await positionOf(page, 'b');
    expect(mergedB).not.toEqual(baseB);

    await page.evaluate(() => (window as DeltaWindow).deltaDemo?.draw(0));
    expect(await positionOf(page, 'b')).toEqual(baseB);

    await page.evaluate(() => (window as DeltaWindow).deltaDemo?.draw(1));
    expect(await positionOf(page, 'b')).toEqual(mergedB);

    const mergedC = await positionOf(page, 'c');
    await page.getByRole('button', { name: 'Switch layer' }).click();
    await expect(page.locator('#live')).toHaveText('Layer switched');

    await page.evaluate(() => (window as DeltaWindow).deltaDemo?.draw(0));
    expect(await positionOf(page, 'c')).toEqual(mergedC);

    await page.evaluate(() => (window as DeltaWindow).deltaDemo?.draw(0.5));
    expect(await positionOf(page, 'c')).not.toEqual(mergedC);
    expect(await positionOf(page, 'd')).toBeDefined();
    await expect(page.locator('#live')).toHaveText('Layer switched');
});

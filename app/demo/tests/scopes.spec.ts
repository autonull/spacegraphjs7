import { expect, test, type Page } from '@playwright/test';
import { createVisionAssert } from '../../../src/vision/assert';

type ScopeDemo = {
    frames(): number;
    settled(): boolean;
    heat(): number;
    pinned(): string[];
    positionOf(id: string): [number, number, number] | undefined;
    addSubgraph(): void;
    focus(id: string): void;
    settle(): void;
};

type ScopeWindow = Window & { __scopesDemo?: ScopeDemo; __ready?: boolean };

const call = <T>(page: Page, method: keyof ScopeDemo, ...args: unknown[]): Promise<T> =>
    page.evaluate(
        ({ method, args }) => {
            const api = (window as ScopeWindow).__scopesDemo!;
            return (api[method] as (...values: unknown[]) => T)(...args);
        },
        { method, args },
    );

test.beforeEach(async ({ page }) => {
    await page.goto('/html/interaction/scopes.html');
    await expect(page.locator('#live')).toHaveText('ready');
    expect(await page.evaluate(() => (window as ScopeWindow).__ready)).toBe(true);
});

test('renders the animated scope graph with vision gates', async ({ page }) => {
    await expect(page.locator('canvas')).toHaveCount(1);
    await expect(page.locator('#live')).toHaveText('ready');

    const vision = createVisionAssert(page);
    await vision.noOverlap();
    await vision.isLegible();
    await vision.expectedLayoutScore(40);
});

test('animates frames and stays stable once settled', async ({ page }) => {
    await expect.poll(() => call<number>(page, 'frames')).toBeGreaterThan(0);

    await call(page, 'settle');
    expect(await call<boolean>(page, 'settled')).toBe(true);
    const before = await call<[number, number, number]>(page, 'positionOf', 'workspace/overview');
    expect(before).toBeDefined();

    await page.waitForTimeout(250);
    expect(await call<[number, number, number]>(page, 'positionOf', 'workspace/overview')).toEqual(before);
});

test('adding a subgraph retargets and re-energizes the simulation', async ({ page }) => {
    await call(page, 'settle');
    const before = await call<[number, number, number]>(page, 'positionOf', 'workspace/overview');

    await call(page, 'addSubgraph');
    expect(await call<number>(page, 'heat')).toBeGreaterThan(0);
    expect(await call<boolean>(page, 'settled')).toBe(false);

    await expect.poll(() => call<boolean>(page, 'settled'), { timeout: 8000 }).toBe(true);
    const after = await call<[number, number, number]>(page, 'positionOf', 'workspace/overview');
    expect(after).not.toEqual(before);
});

test('focus pinning holds a node while the rest of the graph moves', async ({ page }) => {
    await call(page, 'settle');
    await call(page, 'addSubgraph');
    await call(page, 'focus', 'workspace/result');

    expect(await call<string[]>(page, 'pinned')).toContain('workspace/result');
    const held = await call<[number, number, number]>(page, 'positionOf', 'workspace/result');
    const neighbour = await call<[number, number, number]>(page, 'positionOf', 'workspace/overview');
    expect(held).toBeDefined();

    await expect.poll(() => call<boolean>(page, 'settled'), { timeout: 8000 }).toBe(true);

    expect(await call<[number, number, number]>(page, 'positionOf', 'workspace/result')).toEqual(held);
    expect(await call<[number, number, number]>(page, 'positionOf', 'workspace/overview')).not.toEqual(
        neighbour,
    );
});

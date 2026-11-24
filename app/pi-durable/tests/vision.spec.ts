import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

test('first paint passes the visual gate', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    const vision = await call<{ score: number; nodes: number; edges: number; canvas: boolean }>(page, 'vision');
    expect(vision).toMatchObject({ canvas: true });
    expect(vision.nodes).toBeGreaterThan(4);
    expect(vision.edges).toBeGreaterThanOrEqual(2);
    expect(vision.score).toBeGreaterThan(0.5);
    expect(errors).toEqual([]);
});

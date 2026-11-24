import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

test('a chapter plate scrubs through the same hooks that captured it', async ({ page }) => {
    const errors = await boot(page, '?shot=resume-journey');
    expect(await call<boolean>(page, 'setStory', 'resume-journey')).toBe(true);
    const chapters = await call<readonly string[]>(page, 'chapters');
    expect(chapters).toHaveLength(4);
    for (const [index, shot] of ['compaction', 'time-travel', 'resumed', 'replay'].entries()) {
        expect(await call<boolean>(page, 'scrub', index)).toBe(true);
        await expect.poll(() => call<string | null>(page, 'shot')).toBe(shot);
        expect((await call<{ score: number }>(page, 'vision')).score).toBeGreaterThan(0.5);
    }
    expect(await call<boolean>(page, 'scrub', 4)).toBe(false);
    expect(errors).toEqual([]);
});

test('the landmark trail and compact address restore one place', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn&rung=passage');
    await expect(page.locator('#trail button')).toHaveCount(3);
    await expect(page.locator('#trail button[aria-current="page"]')).toHaveText('passage');
    await call(page, 'lens', 'view trace');
    await call(page, 'lens', 'layout radial');
    const compact = await call<string>(page, 'compactAddress');
    const address = await call<{ view?: string; rung?: string; layout?: string }>(page, 'address');
    expect(address.view).toBe('trace');
    expect(address.rung).toBe('passage');
    expect(address.layout).toBe('radial');

    const other = await page.context().newPage();
    await other.goto(`/${compact}`);
    await other.waitForFunction(() => (window as { __durable?: { ready?: () => boolean } }).__durable?.ready?.() === true);
    expect(await call<string>(other, 'viewName')).toBe('trace');
    expect(await call<string>(other, 'rung')).toBe('passage');
    expect(await call<string>(other, 'layoutName')).toBe('radial');
    await other.close();
    expect(errors).toEqual([]);
});

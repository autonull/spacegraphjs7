import { expect, test } from '@playwright/test';
import { bootConsole, call } from './boot';

const compact = (value: string): string =>
    btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

test('opt-in graph projection frames a selection with structural edges', async ({ page }) => {
    const errors = await bootConsole(page);
    const ids = await page
        .locator('#canvas [data-node-id]:has(.sg-terminal-line)')
        .evaluateAll((nodes) =>
            nodes.map((node) => node.getAttribute('data-node-id') ?? '').filter(Boolean),
        );
    expect(await call<boolean>(page, 'consoleGraph', true)).toBe(true);
    await call(
        page,
        'applyAddress',
        compact(`view=transcript&sel=${ids[0]}:0~${ids[1]}:1&tail=${ids[1]}&version=1`),
    );
    expect(new URL(await call<string>(page, 'permalink'), 'http://local').searchParams.get('sel')).toBeTruthy();
    await expect(page.locator('#canvas .spacegraph-group-node').first()).toBeVisible();

    const quality = await call<{ score: number }>(page, 'consoleQuality');
    expect(quality.score).toBeGreaterThanOrEqual(0);

    await call(page, 'consoleGraph', false);
    await expect(page.locator('#canvas .spacegraph-group-node')).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('chapter frames descend into a window lens and return through the trail', async ({ page }) => {
    const errors = await bootConsole(page);
    await call(page, 'consoleGraph', true);
    const frames = page.locator('#canvas [data-node-id^="chapter-group-"]');
    await expect(frames.first()).toBeVisible();
    const chapters = await call<readonly { startID: string; endID: string }[]>(page, 'consoleChapters');
    await call(page, 'consoleFocus', `window:${chapters[0]!.startID}~${chapters[0]!.endID}`);
    await expect
        .poll(() => call<{ lens?: string }>(page, 'address').then((address) => address.lens))
        .toMatch(/^window:/);
    await call(page, 'consoleTrailBack');
    expect(errors).toEqual([]);
});

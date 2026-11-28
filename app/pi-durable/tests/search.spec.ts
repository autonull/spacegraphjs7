import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

test('search spans highlight, navigate and feed a derived sidecar', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const total = await call<number>(page, 'consoleSearch', 'France');
    expect(total).toBeGreaterThan(0);
    await expect(page.locator('#canvas mark').first()).toBeVisible();
    await expect(page.locator('#console-sidecar .instrument-logtail')).toBeVisible();
    expect(await call<string | undefined>(page, 'consoleFindNext', 1)).toBeTruthy();
    expect(await call<string | undefined>(page, 'consoleFindNext', -1)).toBeTruthy();
    expect(errors).toEqual([]);
});

test('pinning matches freezes a filtered snapshot', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const before = await page.locator('#canvas .sg-terminal-line').count();
    await call(page, 'consoleSearch', 'France');
    expect(await call<boolean>(page, 'consolePinMatches')).toBe(true);
    expect(await call<string>(page, 'consoleMode')).toBe('snapshot');
    expect((await call<{ search?: string }>(page, 'consoleSelector')).search).toBeUndefined();
    expect(await page.locator('#canvas .sg-terminal-line').count()).toBeLessThan(before);
    expect(errors).toEqual([]);
});

test('case and regex toggles re-run one selector', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    expect(await call<boolean>(page, 'consoleCase')).toBe(true);
    expect(await call<boolean>(page, 'consoleRegex')).toBe(true);
    expect(
        (await call<{ searchOptions?: { caseSensitive: boolean; regex: boolean } }>(
            page,
            'consoleSelector',
        )).searchOptions,
    ).toEqual({ caseSensitive: true, regex: true });
    await call(page, 'consoleSearch', 'err');
    expect(errors).toEqual([]);
});

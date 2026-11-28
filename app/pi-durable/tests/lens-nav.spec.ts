import { expect, test, type Page } from '@playwright/test';
import { boot, call } from './boot';

const lineID = async (page: Page, index: number): Promise<string> =>
    (await page.locator('#canvas [data-node-id]').nth(index).getAttribute('data-node-id')) ?? '';

test('lens targets, trail and bookmarks survive a permalink', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const first = await lineID(page, 0);
    expect(await call<boolean>(page, 'consoleFocus', `line:${first}`)).toBe(true);
    expect(await call<string[]>(page, 'consoleTrail')).toContain(`line:${first}`);
    expect(await call<unknown>(page, 'consoleBookmark', 0)).toBeTruthy();
    const link = await call<string>(page, 'permalink');
    expect(link).toContain('lens=');
    expect(link).toContain('bm=');
    const second = await lineID(page, 1);
    await call(page, 'consoleFocus', `line:${second}`);
    expect(await call<boolean>(page, 'consoleTrailBack')).toBe(true);
    expect(await call<boolean>(page, 'consoleTrailForward')).toBe(true);
    expect((await call<string[]>(page, 'consoleBreadcrumbs', first)).length).toBeGreaterThan(0);
    await call(page, 'applyPermalink', link);
    expect((await call<{ lens?: string }>(page, 'address')).lens).toBeTruthy();
    expect(errors).toEqual([]);
});

test('reduced motion snaps a lens fly-to without animating', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const before = await call<{ center: readonly number[] }>(page, 'viewport');
    const target = await lineID(page, 2);
    expect(await call<boolean>(page, 'consoleFocus', `line:${target}`)).toBe(true);
    const after = await call<{ center: readonly number[] }>(page, 'viewport');
    expect(after.center).not.toEqual([...before.center]);
    expect(errors).toEqual([]);
});

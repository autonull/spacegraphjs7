import { expect, test } from '@playwright/test';
import { bootConsole, call } from './boot';

const compact = (value: string): string =>
    btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

test('character ranges export exactly and bookmarks as a range lens', async ({ page }) => {
    const errors = await bootConsole(page);
    const ids = await page
        .locator('#canvas [data-node-id]:has(.sg-terminal-line)')
        .evaluateAll((nodes) =>
            nodes.map((node) => node.getAttribute('data-node-id') ?? '').filter(Boolean),
        );
    const id = ids[1]!;
    await call(page, 'applyAddress', compact(`view=transcript&sel=${id}:1~${id}:4&version=1`));

    const exported = JSON.parse(
        await call<string>(page, 'exportConsole', 'json'),
    ) as { id: string; text: string }[];
    expect(exported).toHaveLength(1);
    expect(exported[0]!.id).toBe(id);
    expect(exported[0]!.text).toHaveLength(3);

    const bookmark = await call<{ key: string; target: { kind: string } }>(page, 'consoleBookmark', 1);
    expect(bookmark.key).toBe('bm1');
    expect(bookmark.target.kind).toBe('range');

    await page.locator('#canvas .sg-terminal-line').nth(1).focus();
    await page.keyboard.press('Shift+ArrowRight');
    const link = await call<string>(page, 'permalink');
    const selection = new URL(link, 'http://local').searchParams.get('sel');
    expect(selection).toMatch(/:\d+~/);
    expect(selection).toMatch(/~[^~]+:[1-9]\d*$/);
    expect(errors).toEqual([]);
});

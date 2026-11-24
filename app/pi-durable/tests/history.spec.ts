import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

type StoredAddress = { readonly view?: string; readonly rung?: string; readonly layout?: string };

test('view history restores discrete addresses back and forward', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'lens', 'view diff');
    await call(page, 'lens', 'rung grain');
    await call(page, 'lens', 'layout radial');
    expect(await call<string>(page, 'viewName')).toBe('diff');
    expect(await call<string>(page, 'layoutName')).toBe('radial');

    const history = await call<readonly StoredAddress[]>(page, 'history');
    const cursor = await call<number>(page, 'historyIndex');
    expect(cursor).toBeGreaterThanOrEqual(3);
    const expectAddress = async (index: number): Promise<void> => {
        const address = await call<StoredAddress>(page, 'address');
        const target = history[index]!;
        expect(address.view ?? 'graph').toBe(target.view ?? 'graph');
        expect(address.rung ?? 'fact').toBe(target.rung ?? 'fact');
        expect(address.layout ?? 'grid').toBe(target.layout ?? 'grid');
    };

    await page.keyboard.press('Alt+ArrowLeft');
    expect(await call<number>(page, 'historyIndex')).toBe(cursor - 1);
    await expectAddress(cursor - 1);
    await page.keyboard.press('Alt+ArrowLeft');
    expect(await call<number>(page, 'historyIndex')).toBe(cursor - 2);
    await expectAddress(cursor - 2);

    await page.keyboard.press('Alt+ArrowRight');
    expect(await call<number>(page, 'historyIndex')).toBe(cursor - 1);
    await expectAddress(cursor - 1);
    await page.keyboard.press('Alt+ArrowRight');
    expect(await call<number>(page, 'historyIndex')).toBe(cursor);
    await expectAddress(cursor);
    expect(errors).toEqual([]);
});

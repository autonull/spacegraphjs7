import { expect, test } from '@playwright/test';
import { bootConsole, call } from './boot';

test('faceted filter composes with search and feeds the derived sidecar', async ({ page }) => {
    const errors = await bootConsole(page);
    const field = page.locator('#canvas [data-terminal-prompt]');
    const before = await page.locator('#canvas .sg-terminal-line').count();

    await field.fill('/filter kind:message');
    await field.press('Enter');
    expect((await call<{ facet?: string }>(page, 'consoleSelector')).facet).toBe('kind:message');
    expect(await page.locator('#canvas .sg-terminal-line').count()).toBeLessThan(before);

    await call(page, 'consoleSelect', { facet: 'kind:message', search: 'France' });
    expect((await call<{ search?: string; facet?: string }>(page, 'consoleSelector')).facet).toBe(
        'kind:message',
    );
    await expect(page.locator('#canvas mark').first()).toBeVisible();

    await call(page, 'consoleSearch', '');
    await call(page, 'consoleMonitor');
    await expect(page.locator('#console-sidecar')).toBeVisible();
    await call(page, 'consoleMonitor');
    expect(errors).toEqual([]);
});

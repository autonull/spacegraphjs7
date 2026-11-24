import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

test('rungs summarise one kernel and the survey tracks the camera', async ({ page }) => {
    const errors = await boot(page, '?rung=cosmos&shot=basic-turn');
    await expect(page.locator('#app')).toHaveAttribute('data-rung', 'cosmos');
    await expect(page.locator('#rung-switch button[data-rung="cosmos"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('#survey-svg circle').first()).toBeVisible();

    const cosmos = await call<{ nodes: number }>(page, 'representation');
    await call(page, 'setRung', 'fact');
    const fact = await call<{ nodes: number }>(page, 'representation');
    expect(fact.nodes).toBeGreaterThan(cosmos.nodes);

    await call(page, 'zoomBy', 16);
    await expect.poll(() => call<string>(page, 'rung')).toBe('grain');
    await call(page, 'setRung', 'passage');
    expect(await call<string>(page, 'permalink')).toContain('rung=passage');
    expect(errors).toEqual([]);
});

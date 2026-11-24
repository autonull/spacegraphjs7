import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

test('cards and inspector expose committed detail, not just kind labels', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await expect(page.locator('[data-kind="message"]').first()).toContainText('Capital of France?');
    await expect(page.locator('[data-kind="task"]').first()).toContainText('signal: approve');
    await expect(page.locator('[data-kind="task"]').first()).toContainText('wakes 2030-01-01');
    await expect(page.locator('#legend .row')).not.toHaveCount(0);
    await expect(page.locator('#legend')).toContainText('sleeps on');

    await call(page, 'reveal', 'd:1:task:2');
    await expect(page.locator('#inspector')).toContainText('d:1:task:2');
    await expect(page.locator('#inspector')).toContainText('sleeps on');

    const representation = await call<{ laneLabels: string[]; edgeLabels: string[] }>(page, 'representation');
    expect(representation.laneLabels).toContain('facts');
    expect(representation.edgeLabels.length).toBeGreaterThan(0);
    await expect(page.locator('#canvas [data-lane]').first()).toBeVisible();

    const cards = page.locator('#canvas .durable-card');
    const tiers = await cards.evaluateAll((nodes) => [...new Set(nodes.map((node) => (node as HTMLElement).dataset['importance']))]);
    expect(tiers).toEqual(expect.arrayContaining(['hero', 'medium', 'compact']));
    const widths = await cards.evaluateAll((nodes) => [...new Set(nodes.map((node) => Math.round(node.getBoundingClientRect().width)))]);
    expect(widths.length).toBeGreaterThanOrEqual(3);
    expect(errors).toEqual([]);
});

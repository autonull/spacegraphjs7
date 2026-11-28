import { expect, test } from '@playwright/test';
import { demoPath } from '../../app/demo/src/registry.js';

test('agent team reuses the team model for steering, scope and keyboard paths', async ({
    page,
}) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto(demoPath('agent-team'));
    await expect(page.locator('#app .agent')).toHaveCount(5);

    await page.keyboard.press('2');
    await expect(page.locator('#inspector h3')).toContainText('scout');

    const edges = () =>
        page.evaluate(
            () =>
                (window as unknown as { _sg: { graph: { edges: Map<string, unknown> } } })._sg.graph
                    .edges.size,
        );
    const before = await edges();
    await page.fill('#steer-input', 'review the projection');
    await page.locator('#steer').click();
    expect(await edges()).toBeGreaterThan(before);
    await expect(page.locator('#inspector')).toContainText('operator: review the projection');

    await page.keyboard.press('Escape');
    await expect(page.locator('#team-stats')).toContainText('no scope');
    expect(errors).toEqual([]);
});

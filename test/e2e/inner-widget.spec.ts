import { expect, test } from '@playwright/test';
import { demoPath } from '../../app/demo/src/registry.js';

type FoldState = { readonly folded: boolean; readonly detached: readonly string[] };

const watchErrors = (page: import('@playwright/test').Page) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });
    return errors;
};

const edgeIDs = (page: import('@playwright/test').Page) =>
    page.evaluate(() =>
        [
            ...(
                window as unknown as { _sg: { graph: { edges: Map<string, unknown> } } }
            )._sg.graph.edges.keys(),
        ].filter((id) => id.startsWith('outer-')),
    );

test('foldable node unfolds and refolds while keeping outer edges', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(demoPath('fold-unfold'));
    const panel = page.locator('#fold-panel .foldable-node');
    await expect(panel).toBeVisible();
    await expect(panel.locator('[data-inner-item]')).toHaveCount(5);
    await expect(page.locator('#controls [data-cluster]')).toHaveCount(5);

    const outer = await edgeIDs(page);
    await panel.locator('[data-inner-action="unfold"]').click();
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    (window as unknown as { _fold: () => Record<string, FoldState> })._fold()[
                        'cluster-0'
                    ]?.folded,
            ),
        )
        .toBe(false);
    await expect(page.locator('#state')).toContainText('1 unfolded');
    expect(await edgeIDs(page)).toEqual(outer);

    await page.locator('#controls [data-cluster="cluster-0"]').click();
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    (window as unknown as { _fold: () => Record<string, FoldState> })._fold()[
                        'cluster-0'
                    ]?.folded,
            ),
        )
        .toBe(true);
    expect(await edgeIDs(page)).toEqual(outer);
    expect(errors).toEqual([]);
});

test('inner widget detaches and reattaches with its contains edge', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(demoPath('widget-detach'));
    const dashboard = page.locator('#app [data-node-id="dashboard"]');
    await expect(dashboard).toBeVisible();
    await expect(dashboard.locator('[data-inner-item]')).toHaveCount(6);

    await dashboard
        .locator('[data-inner-action^="detach:"]')
        .first()
        .evaluate((button: HTMLElement) => button.click());
    await expect(dashboard.locator('[data-inner-item][data-detached="true"]')).toHaveCount(1);
    const node = page.locator('#app [data-node-id^="inner:dashboard:"]');
    await expect(node).toHaveCount(1);
    const contains = await page.evaluate(() => {
        const sg = (window as unknown as { _sg: { graph: { edges: Map<string, unknown> } } })._sg;
        return [...sg.graph.edges.keys()].find((id) => id.startsWith('contains:dashboard:'));
    });
    expect(contains).toBeDefined();

    await node
        .locator('[data-inner-action^="reattach:"]')
        .evaluate((button: HTMLElement) => button.click());
    await expect(page.locator('#app [data-node-id^="inner:dashboard:"]')).toHaveCount(0);
    expect(
        await page.evaluate((id) => {
            const sg = (window as unknown as { _sg: { graph: { edges: Map<string, unknown> } } })
                ._sg;
            return sg.graph.edges.has(id);
        }, contains!),
    ).toBe(false);

    await page.keyboard.press('f');
    await expect(dashboard.locator('[data-inner-container][data-folded="true"]')).toHaveCount(1);
    await page.keyboard.press('f');
    await expect(dashboard.locator('[data-inner-container][data-folded="false"]')).toHaveCount(1);
    expect(errors).toEqual([]);
});

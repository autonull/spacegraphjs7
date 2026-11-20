import { expect, test } from '@playwright/test';

type CompositionalState = {
    agentNodes: readonly string[];
    workflowNodes: readonly string[];
    link: { source: string; target: string };
    overlayPaths: number;
    isolated: boolean;
};

test.describe('compositional domain wrappers', () => {
    test('two isolated graphs share one inter-graph overlay link', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));

        await page.goto('/html/layout/compositional-wrappers.html');
        await page.waitForFunction(
            () => (globalThis as { __compositional?: unknown }).__compositional !== undefined,
            {
                timeout: 20_000,
            },
        );

        const state = await page.evaluate(
            () =>
                (globalThis as unknown as { __compositional: CompositionalState }).__compositional,
        );
        expect(state.agentNodes).toContain('agent:r:session');
        expect(state.workflowNodes).toContain('workflow:wf:compile');
        expect(state.isolated).toBe(true);
        expect(state.overlayPaths).toBe(1);
        expect(state.link).toEqual({ source: 'agent:r:session', target: 'workflow:wf:compile' });

        const path = page.locator('#spacegraph-intergraph-overlay path');
        await expect(path).toHaveCount(1);
        await expect
            .poll(() => path.getAttribute('d'), { timeout: 5_000 })
            .toMatch(/^M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+$/);
        await expect(page.locator('#status')).toContainText('1 inter-graph link');
        expect(errors).toEqual([]);
    });
});

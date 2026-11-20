import { expect, test } from '@playwright/test';

type CompositionalState = {
    domains: readonly string[];
    nodes: Readonly<Record<string, readonly string[]>>;
    links: readonly string[];
    endpoints: readonly { source: string; target: string }[];
    overlayPaths: number;
    isolated: boolean;
};

test.describe('compositional domain wrappers', () => {
    test('four isolated graphs share three inter-graph overlay links', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));

        await page.goto('/html/layout/compositional-wrappers.html');
        await page.waitForFunction(
            () => (globalThis as { __compositional?: unknown }).__compositional !== undefined,
            { timeout: 20_000 },
        );

        const state = await page.evaluate(
            () =>
                (globalThis as unknown as { __compositional: CompositionalState }).__compositional,
        );
        expect(state.domains).toEqual(['agent', 'workflow', 'filesystem', 'data']);
        expect(state.nodes.agent).toContain('agent:r:session');
        expect(state.nodes.workflow).toContain('workflow:wf:compile');
        expect(state.nodes.filesystem).toContain('filesystem:c1:session');
        expect(state.nodes.data).toContain('data:p1:auc');
        expect(state.links).toHaveLength(3);
        expect(state.endpoints).toEqual([
            { source: 'agent:r:session', target: 'workflow:wf:compile' },
            { source: 'workflow:wf:out', target: 'filesystem:c1:session' },
            { source: 'filesystem:c1:edit', target: 'data:p1:auc' },
        ]);
        expect(state.isolated).toBe(true);
        expect(state.overlayPaths).toBe(3);

        const paths = page.locator('#spacegraph-intergraph-overlay path');
        await expect(paths).toHaveCount(3);
        for (const path of await paths.all()) {
            await expect
                .poll(() => path.getAttribute('d'), { timeout: 5_000 })
                .toMatch(/^M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+$/);
        }
        await expect(page.locator('#status')).toContainText('3 inter-graph links');
        expect(errors).toEqual([]);
    });
});

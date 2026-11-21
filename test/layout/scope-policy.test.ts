import { describe, expect, it } from 'vitest';
import {
    ScopeSimulation,
    buildScopeTree,
    scopePolicy,
    type ScopeSpec,
} from '../../src/layout';

const specs: ScopeSpec[] = [
    { id: 'root', nodes: [{ id: 'focus' }, { id: 'portal', scope: 'child' }] },
    { id: 'child', parent: 'root', nodes: [{ id: 'x' }, { id: 'y' }] },
];

describe('scope policy', () => {
    it('pins the focus and every scope that owns it', () => {
        const policy = scopePolicy(buildScopeTree(specs), { focus: 'root/child/y' });

        expect([...policy.pinned]).toEqual(['root/child/y', 'root/child', 'root']);
        expect(policy.active.has('root/child')).toBe(true);
    });

    it('gives solvers more room for overlap and poor legibility', () => {
        const tree = buildScopeTree(specs);
        const base = { gap: 100, nodePadding: 10 };
        const calm = scopePolicy(tree, {}, base);
        const stressed = scopePolicy(tree, { vision: { overlap: 1, legibility: 0 } }, base);

        expect(calm.layout).toEqual(base);
        expect(stressed.layout.gap).toBe(250);
        expect(stressed.layout.nodePadding).toBe(30);
    });

    it('clamps vision scores to the unit range', () => {
        const policy = scopePolicy(buildScopeTree(specs), {
            vision: { overlap: 5, legibility: -2 },
        });

        expect(policy.layout.gap).toBe(400);
        expect(policy.layout.nodePadding).toBe(60);
    });

    it('uses hierarchy and ergonomics scores to widen depth and padding', () => {
        const tree = buildScopeTree(specs);
        const base = { gap: 100, nodePadding: 10, depthStep: 200 };
        const calm = scopePolicy(tree, { vision: { hierarchy: 1, ergonomics: 1 } }, base);
        const stressed = scopePolicy(tree, { vision: { hierarchy: 0, ergonomics: 0 } }, base);

        expect(calm.layout).toEqual(base);
        expect(stressed.layout.depthStep).toBe(300);
        expect(stressed.layout.nodePadding).toBe(30);
    });

    it('holds the focused body when a policy change retargets the graph', () => {
        const sim = new ScopeSimulation();
        sim.setSpecs(specs);
        sim.setPolicy({ focus: 'root/focus', vision: { overlap: 0 } });
        sim.settle();

        sim.setPolicy({ focus: 'root/focus', vision: { overlap: 1 } });
        const target = sim.positions.get('root/focus')!;
        sim.advance(1 / 60);

        expect(sim.positions.get('root/focus')).toEqual(target);
    });

    it('collapses scopes below the band', () => {
        const sim = new ScopeSimulation();
        sim.setSpecs([
            { id: 'root', nodes: [{ id: 'p', scope: 'a' }] },
            { id: 'a', parent: 'root', nodes: [{ id: 'q', scope: 'b' }] },
            { id: 'b', parent: 'a', nodes: [{ id: 'leaf' }] },
        ]);
        sim.setPolicy({ band: 0 });

        const view = sim.view();
        expect(view.frames.get('root/a')!.active).toBe(true);
        expect(view.frames.get('root/a/b')!.active).toBe(false);
    });
});

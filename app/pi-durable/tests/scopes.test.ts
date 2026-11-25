import { ScopeSimulation } from 'spacegraphjs/layout';
import { describe, expect, it } from 'vitest';
import { buildScopeForest } from '../src/scopes';

const nodes = ['owner', 'child', 'leaf', 'outside'].map((id, row) => ({
    id,
    lane: 'facts',
    row,
    size: [64, 32] as const,
}));
const groups = [
    { id: 'owner', members: ['owner', 'child', 'leaf'] },
    { id: 'child', members: ['child', 'leaf'] },
];
const forest = buildScopeForest(
    nodes,
    [
        { id: 'owns', source: 'owner', target: 'child' },
        { id: 'orders', source: 'child', target: 'leaf' },
    ],
    groups,
    'grid',
);

describe('recorded subgraph scopes', () => {
    it('nests groups without losing or duplicating a node id', () => {
        expect(forest.specs).toHaveLength(3);
        expect(forest.nodePaths.size).toBe(nodes.length);
        expect(forest.nodesByPath.size).toBe(nodes.length);
        expect(forest.nodePaths.get('owner')).toBe('root/owner');
        expect(forest.nodePaths.get('child')).toBe('root/owner/child');
        expect(forest.nodePaths.get('leaf')).toBe('root/owner/child/leaf');
        expect(forest.groupPaths.get('owner')).toBe('root/owner');
        expect(forest.groupPaths.get('child')).toBe('root/owner/child');
        const placed = new Set(forest.specs.flatMap((spec) => spec.nodes.map((node) => node.id)));
        expect(placed.size).toBe(nodes.length);
    });

    it('folds nested frames at a low band and unfolds them at a higher band', () => {
        const simulation = new ScopeSimulation({ instant: true });
        simulation.setSpecs(forest.specs);
        simulation.setLayoutTargets(new Map([...forest.nodePaths].map(([, path], index) =>
            [path, { x: index * 100, y: 0, z: 0 }] as const)));
        simulation.setPolicy({ band: 0 });
        expect(simulation.view().frames.get('root/owner')?.active).toBe(true);
        expect(simulation.view().frames.get('root/owner/child')?.active).toBe(false);
        simulation.setPolicy({ band: 1 });
        expect(simulation.view().frames.get('root/owner/child')?.active).toBe(true);
        const resolved = new Map([...simulation.view().positions].flatMap(([path, position]) => {
            const id = forest.nodesByPath.get(path);
            return id ? [[id, position] as const] : [];
        }));
        expect([...resolved.keys()].sort()).toEqual(nodes.map((node) => node.id).sort());
    });
});

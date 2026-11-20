import { describe, expect, it } from 'vitest';
import {
    ScopeError,
    ScopeHost,
    activeScopePaths,
    buildScopeTree,
    layoutScopes,
    resolveScopeRef,
    scopeAncestors,
    scopeChanges,
    scopeDescendants,
    scopeOf,
    type Position,
    type ScopeSpec,
} from '../../src/layout';

const errorOf = (run: () => unknown): ScopeError => {
    try {
        run();
    } catch (error) {
        if (error instanceof ScopeError) return error;
        throw error;
    }
    throw new Error('expected a ScopeError');
};

const nested: ScopeSpec[] = [
    {
        id: 'root',
        strategy: 'grid',
        nodes: [
            { id: 'a', size: [100, 40] },
            { id: 'portal', scope: 'inner' },
        ],
        edges: [{ id: 'bridge', source: 'a', target: 'inner/x' }],
    },
    {
        id: 'inner',
        parent: 'root',
        strategy: 'grid',
        nodes: [
            { id: 'x', size: [80, 40] },
            { id: 'y', size: [80, 40] },
        ],
        edges: [{ id: 'inner-edge', source: 'x', target: 'y' }],
    },
];

describe('scope tree', () => {
    it('qualifies identity and indexes every node and scope', () => {
        const tree = buildScopeTree(nested);

        expect([...tree.byPath.keys()]).toEqual(['root', 'root/inner']);
        expect(tree.nodePaths.get('root/a')).toBe('root');
        expect(tree.nodePaths.get('root/inner/x')).toBe('root/inner');
        expect(scopeOf(tree, 'root/inner/y')).toBe('root/inner');
        expect(scopeOf(tree, 'root/inner')).toBe('root/inner');
    });

    it('resolves local, child-scope and absolute references', () => {
        const tree = buildScopeTree(nested);

        expect(resolveScopeRef(tree, 'root', 'a')).toBe('root/a');
        expect(resolveScopeRef(tree, 'root', 'inner')).toBe('root/inner');
        expect(resolveScopeRef(tree, 'root', 'root/inner/x')).toBe('root/inner/x');
        expect(errorOf(() => resolveScopeRef(tree, 'root', 'missing')).code).toBe('unknown-endpoint');
    });

    it('rejects cycles, duplicates, missing parents and unknown portals', () => {
        expect(
            errorOf(() =>
                buildScopeTree([
                    { id: 'a', parent: 'b', nodes: [] },
                    { id: 'b', parent: 'a', nodes: [] },
                ]),
            ).code,
        ).toBe('cycle');
        expect(errorOf(() => buildScopeTree([{ id: 'a', nodes: [] }, { id: 'a', nodes: [] }])).code).toBe(
            'duplicate-scope',
        );
        expect(errorOf(() => buildScopeTree([{ id: 'a', parent: 'none', nodes: [] }])).code).toBe(
            'unknown-parent',
        );
        expect(
            errorOf(() =>
                buildScopeTree([{ id: 'a', nodes: [{ id: 'p', scope: 'missing' }] }]),
            ).code,
        ).toBe('unknown-portal');
        expect(errorOf(() => buildScopeTree([{ id: 'a', nodes: [{ id: 'x' }, { id: 'x' }] }])).code).toBe(
            'duplicate-node',
        );
    });

    it('rejects ids containing the path separator', () => {
        expect(errorOf(() => buildScopeTree([{ id: 'a/b', nodes: [] }])).code).toBe('invalid-id');
        expect(errorOf(() => buildScopeTree([{ id: 'a', nodes: [{ id: 'x/y' }] }])).code).toBe(
            'invalid-id',
        );
    });
});

describe('scope geometry', () => {
    it('composes a child frame from its parent portal', () => {
        const layout = layoutScopes(buildScopeTree(nested));
        const portal = layout.positions.get('root/portal')!;
        const frame = layout.frames.get('root/inner')!;

        expect(frame.origin).toEqual(portal);
        expect(frame.parent).toBe('root');
        expect(frame.depth).toBe(1);

        const local = layout.locals.get('root/inner/x')!;
        const world = layout.positions.get('root/inner/x')!;
        expect(world.x).toBeCloseTo(frame.origin.x + frame.scale * local.x);
        expect(world.y).toBeCloseTo(frame.origin.y + frame.scale * local.y);
    });

    it('multiplies scale down a scope chain', () => {
        const tree = buildScopeTree([
            { id: 'a', nodes: [{ id: 'p', scope: 'b' }] },
            { id: 'b', parent: 'a', scale: 0.5, nodes: [{ id: 'q', scope: 'c' }] },
            { id: 'c', parent: 'b', scale: 0.5, nodes: [{ id: 'leaf' }] },
        ]);
        const layout = layoutScopes(tree);

        expect(layout.frames.get('a')!.scale).toBe(1);
        expect(layout.frames.get('a/b')!.scale).toBeCloseTo(0.5);
        expect(layout.frames.get('a/b/c')!.scale).toBeCloseTo(0.25);
    });

    it('applies a scope offset in parent space', () => {
        const tree = buildScopeTree([
            {
                id: 'root',
                nodes: [{ id: 'portal', scope: 'child' }],
            },
            {
                id: 'child',
                parent: 'root',
                offset: { x: 50, y: -20, z: 0 },
                nodes: [{ id: 'x' }],
            },
        ]);
        const layout = layoutScopes(tree);
        const portal = layout.positions.get('root/portal')!;
        const frame = layout.frames.get('root/child')!;

        expect(frame.origin.x).toBeCloseTo(portal.x + 50);
        expect(frame.origin.y).toBeCloseTo(portal.y - 20);
    });

    it('projects cross-scope edges with real world endpoints', () => {
        const layout = layoutScopes(buildScopeTree(nested));
        const bridge = layout.edges.find((edge) => edge.id === 'bridge')!;

        expect(bridge.interScope).toBe(true);
        expect(bridge.source).toBe('root/a');
        expect(bridge.target).toBe('root/inner/x');
        expect(bridge.from).toEqual(layout.positions.get('root/a'));
        expect(bridge.to).toEqual(layout.positions.get('root/inner/x'));
    });

    it('keeps a portal edge inside the scope that declares it', () => {
        const tree = buildScopeTree([
            {
                id: 'root',
                nodes: [{ id: 'a' }, { id: 'portal', scope: 'child' }],
                edges: [{ id: 'to-portal', source: 'a', target: 'portal' }],
            },
            { id: 'child', parent: 'root', nodes: [{ id: 'x' }] },
        ]);
        const layout = layoutScopes(tree);
        const edge = layout.edges.find((candidate) => candidate.id === 'to-portal')!;

        expect(edge.interScope).toBe(false);
        expect(edge.to).toEqual(layout.positions.get('root/portal'));
        expect(layout.frames.get('root/child')!.origin).toEqual(edge.to);
    });

    it('lets each scope pick its own solver and stays deterministic', () => {
        const tree = buildScopeTree([
            { id: 'root', strategy: 'grid', nodes: [{ id: 'a' }, { id: 'b' }] },
            { id: 'other', strategy: 'force', nodes: [{ id: 'c' }, { id: 'd' }] },
        ]);
        const first = layoutScopes(tree, { seed: 7 });
        const second = layoutScopes(tree, { seed: 7 });

        expect([...first.positions.keys()]).toEqual(['root/a', 'root/b', 'other/c', 'other/d']);
        expect([...first.positions]).toEqual([...second.positions]);
        for (const position of first.positions.values()) {
            expect(Number.isFinite(position.x)).toBe(true);
            expect(Number.isFinite(position.y)).toBe(true);
        }
    });

    it('holds pinned nodes at their previous local position', () => {
        const tree = buildScopeTree([{ id: 'root', nodes: [{ id: 'a' }, { id: 'b' }] }]);
        const held: Position = { x: 999, y: -123, z: 0 };
        const layout = layoutScopes(tree, {
            previous: new Map([['root', new Map([['a', held]])]]),
            pinned: new Set(['root/a']),
        });

        expect(layout.positions.get('root/a')).toEqual(held);
        expect(layout.locals.get('root/a')).toEqual(held);
    });

    it('reports only new ids as added between layouts', () => {
        const before = layoutScopes(buildScopeTree([{ id: 'root', nodes: [{ id: 'a' }] }]));
        const after = layoutScopes(
            buildScopeTree([{ id: 'root', nodes: [{ id: 'a' }, { id: 'b' }] }]),
        );
        const change = scopeChanges(before, after);

        expect([...change.added.keys()]).toEqual(['root/b']);
        expect(change.removed).toEqual([]);
    });

    it('bounds every world position', () => {
        const layout = layoutScopes(buildScopeTree(nested));
        for (const position of layout.positions.values()) {
            expect(position.x).toBeGreaterThanOrEqual(layout.bounds.min.x - 1e-6);
            expect(position.x).toBeLessThanOrEqual(layout.bounds.max.x + 1e-6);
            expect(position.y).toBeGreaterThanOrEqual(layout.bounds.min.y - 1e-6);
            expect(position.y).toBeLessThanOrEqual(layout.bounds.max.y + 1e-6);
        }
    });
});

describe('scope traversal', () => {
    it('walks ancestors and descendants in tree order', () => {
        const tree = buildScopeTree([
            { id: 'root', nodes: [] },
            { id: 'a', parent: 'root', nodes: [] },
            { id: 'b', parent: 'a', nodes: [{ id: 'leaf' }] },
        ]);

        expect(scopeAncestors(tree, 'root/a/b/leaf').map((entry) => entry.path)).toEqual([
            'root/a/b',
            'root/a',
            'root',
        ]);
        expect(scopeDescendants(tree, 'root').map((entry) => entry.path)).toEqual([
            'root',
            'root/a',
            'root/a/b',
        ]);
    });
});

describe('scope host', () => {
    it('reports new ids across updates', () => {
        const host = new ScopeHost({ seed: 3 });
        const first = host.update([{ id: 'root', nodes: [{ id: 'a' }] }]);
        const second = host.update([{ id: 'root', nodes: [{ id: 'a' }, { id: 'b' }] }]);

        expect([...first.change.added.keys()]).toEqual(['root/a']);
        expect([...second.change.added.keys()]).toEqual(['root/b']);
        expect(host.last?.positions.has('root/a')).toBe(true);
    });

    it('holds pinned ids at their previous local position', () => {
        const host = new ScopeHost({ seed: 3, pinned: new Set(['root/a']) });
        host.update([{ id: 'root', nodes: [{ id: 'a' }] }]);
        const held = host.last!.locals.get('root/a')!;

        const next = host.update([{ id: 'root', nodes: [{ id: 'a' }, { id: 'b' }] }]);

        expect(next.locals.get('root/a')).toEqual(held);
    });
});

describe('scope activation', () => {
    const deep: ScopeSpec[] = [
        { id: 'root', nodes: [{ id: 'p', scope: 'a' }] },
        { id: 'a', parent: 'root', nodes: [{ id: 'q', scope: 'b' }] },
        { id: 'b', parent: 'a', nodes: [{ id: 'leaf' }] },
    ];

    it('collapses scopes below the zoom band', () => {
        const tree = buildScopeTree(deep);
        const active = activeScopePaths(tree, { band: 0 });

        expect([...active].sort()).toEqual(['root', 'root/a']);
        const layout = layoutScopes(tree, { active });
        expect(layout.frames.get('root/a')!.active).toBe(true);
        expect(layout.frames.get('root/a/b')!.active).toBe(false);
    });

    it('keeps the ancestors of the focus active at any depth', () => {
        const tree = buildScopeTree(deep);
        const active = activeScopePaths(tree, { band: 0, focus: 'root/a/b/leaf' });

        expect(active.has('root/a/b')).toBe(true);
        expect(active.has('root')).toBe(true);
    });
});

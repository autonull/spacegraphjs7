import { describe, expect, it } from 'vitest';
import { Levels, type LevelConfig } from '../../src/levels';

type TestNode = {
    id: string;
    kind: string;
    minLevel?: string;
    clusterOf?: string[];
};

type TestEdge = { id: string; source: string; target: string; kind: string };

const CONFIG: LevelConfig<'coarse' | 'mid' | 'fine', 'root' | 'work' | 'detail', 'hierarchy' | 'flow', TestNode, TestEdge> = {
    levelRank: { coarse: 0, mid: 1, fine: 2 },
    kindMinLevel: { root: 'coarse', work: 'mid', detail: 'fine' },
    edgeMinLevel: { hierarchy: 'coarse', flow: 'mid' },
    domBudget: { coarse: 4, mid: 8, fine: 6 },
    isClusterExpanded: (level) => level !== 'coarse',
};

const model = {
    nodes: [
        { id: 'root', kind: 'root' },
        { id: 'work', kind: 'work' },
        { id: 'detail', kind: 'detail' },
        { id: 'promoted', kind: 'detail', minLevel: 'coarse' },
    ] as TestNode[],
    edges: [
        { id: 'e1', source: 'root', target: 'work', kind: 'hierarchy' },
        { id: 'e2', source: 'work', target: 'detail', kind: 'flow' },
        { id: 'e3', source: 'root', target: 'detail', kind: 'hierarchy' },
    ] as TestEdge[],
};

describe('Levels — node visibility', () => {
    it('keeps a node from the level its kind belongs to', () => {
        expect(Levels.minLevelOf(model.nodes[1]!, CONFIG)).toBe('mid');
        expect(Levels.isVisibleAt(model.nodes[1]!, 'coarse', CONFIG)).toBe(false);
        expect(Levels.isVisibleAt(model.nodes[1]!, 'mid', CONFIG)).toBe(true);
    });

    it('lets a node raise its own level', () => {
        expect(Levels.isVisibleAt(model.nodes[3]!, 'coarse', CONFIG)).toBe(true);
    });

    it('lists the visible nodes in model order', () => {
        expect(Levels.nodesAtLevel(model, 'mid', CONFIG).map((node) => node.id)).toEqual([
            'root',
            'work',
            'promoted',
        ]);
        expect([...Levels.visibleNodeIDs(model, 'fine', CONFIG)]).toEqual([
            'root',
            'work',
            'detail',
            'promoted',
        ]);
    });
});

describe('Levels — edges', () => {
    it('never draws an edge to a hidden node', () => {
        const edges = Levels.edgesAtLevel(model, 'coarse', undefined, CONFIG);

        expect(edges.map((edge) => edge.id)).toEqual([]);
    });

    it('draws an edge kind from the level it belongs to', () => {
        const edges = Levels.edgesAtLevel(model, 'mid', undefined, CONFIG);

        expect(edges.map((edge) => edge.id)).toEqual(['e1']);
        expect(Levels.edgesAtLevel(model, 'fine', undefined, CONFIG).map((edge) => edge.id)).toEqual([
            'e1',
            'e2',
            'e3',
        ]);
    });

    it('never draws an edge kind without a level', () => {
        const withoutLevel: LevelConfig<
            'coarse' | 'mid' | 'fine',
            'root' | 'work' | 'detail',
            'hierarchy' | 'flow',
            TestNode,
            TestEdge
        > = { ...CONFIG, edgeMinLevel: { hierarchy: 'coarse' } as never };

        expect(
            Levels.edgesAtLevel(model, 'fine', undefined, withoutLevel).map((edge) => edge.id),
        ).toEqual(['e1', 'e3']);
    });

    it('lets the host narrow the candidates', () => {
        const narrowed: LevelConfig<
            'coarse' | 'mid' | 'fine',
            'root' | 'work' | 'detail',
            'hierarchy' | 'flow',
            TestNode,
            TestEdge
        > = {
            ...CONFIG,
            edgeFilterFn: (_model, _level, _focus, candidates) =>
                candidates.filter((edge) => edge.kind !== 'hierarchy'),
        };

        expect(Levels.edgesAtLevel(model, 'fine', undefined, narrowed).map((edge) => edge.id)).toEqual([
            'e2',
        ]);
    });

    it('hands the host the visible ids and the candidates', () => {
        let seen: { visible: number; candidates: number } | undefined;
        const inspected: LevelConfig<
            'coarse' | 'mid' | 'fine',
            'root' | 'work' | 'detail',
            'hierarchy' | 'flow',
            TestNode,
            TestEdge
        > = {
            ...CONFIG,
            edgeFilterFn: (_model, _level, _focus, candidates, visible) => {
                seen = { visible: visible.size, candidates: candidates.length };
                return candidates;
            },
        };

        Levels.edgesAtLevel(model, 'fine', undefined, inspected);

        expect(seen).toEqual({ visible: 4, candidates: 3 });
    });
});

describe('Levels — budgets and clusters', () => {
    it('spends a budget per level', () => {
        expect(Levels.domBudget('coarse', CONFIG)).toBe(4);
        expect(Levels.domBudget('mid', CONFIG)).toBe(8);
    });

    it('counts the members of a cluster', () => {
        expect(Levels.clusterCount({ id: 'c', kind: 'work', clusterOf: ['a', 'b'] })).toBe(2);
        expect(Levels.clusterCount({ id: 'c', kind: 'work' })).toBe(0);
    });

    it('keeps the labels at a constant size', () => {
        expect(Levels.labelMode('fine')).toBe('constant');
    });
});

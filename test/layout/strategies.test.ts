import { describe, expect, it } from 'vitest';
import { Strategies, type LayoutConfig } from '../../src/layout';

type TestNode = {
    id: string;
    kind: string;
    turnID?: string;
    clusterOf?: string[];
};

type TestEdge = { id: string; source: string; target: string; kind: string };

type TestModel = {
    root: string;
    turns: string[];
    nodes: TestNode[];
    edges: TestEdge[];
};

const CONFIG: LayoutConfig<TestNode, TestEdge> = {
    nodeSizeFn: (node) => (node.kind === 'chip' ? [100, 40] : [200, 60]),
    laneList: ['top', 'bottom'],
    laneOfFn: (node) => (node.kind === 'chip' ? 'top' : 'bottom'),
    depthMap: { root: 0, turn: 1, work: 2 },
    turnIdFn: (node) => node.turnID,
    ownerTurnFn: (model, node) => (node.kind === 'file' ? ownerTurn(model, node) : undefined),
    clusterOfFn: (node) => node.clusterOf,
    geometry: { standardSize: [200, 60], indentStep: 100, depthLevels: 3, padding: 40 },
};

function ownerTurn(
    model: { nodes: readonly TestNode[]; edges: readonly TestEdge[] },
    node: TestNode,
): string | undefined {
    const edge = model.edges.find((candidate) => candidate.target === node.id);
    const other = edge && model.nodes.find((candidate) => candidate.id === edge.source);

    return other?.turnID;
}

function makeModel(): TestModel {
    return {
        root: 'root',
        turns: ['t1', 't2'],
        nodes: [
            { id: 'root', kind: 'root' },
            { id: 't1', kind: 'turn', turnID: 't1' },
            { id: 't2', kind: 'turn', turnID: 't2' },
            { id: 'a', kind: 'work', turnID: 't1' },
            { id: 'b', kind: 'work', turnID: 't2' },
            { id: 'file', kind: 'file' },
        ],
        edges: [{ id: 'e1', source: 'a', target: 'file', kind: 'writes' }],
    };
}

describe('Strategies.layoutGraph — lanes', () => {
    it('is deterministic', () => {
        const model = makeModel();

        expect([...Strategies.layoutGraph(model, CONFIG).positions]).toEqual([
            ...Strategies.layoutGraph(model, CONFIG).positions,
        ]);
    });

    it('puts a node in its lane and its kind in its depth', () => {
        const layout = Strategies.layoutGraph(makeModel(), CONFIG);

        expect(layout.positions.get('a')?.y).toBe(60 + 24);
        expect(layout.positions.get('a')?.z).toBe(2 * 64);
        expect(layout.positions.get('root')?.z).toBe(0);
    });

    it('anchors a node without a turn in the turn that owns it', () => {
        const layout = Strategies.layoutGraph(makeModel(), CONFIG);
        const work = layout.positions.get('a')!;
        const file = layout.positions.get('file')!;

        expect(file.x).toBeGreaterThan(work.x);
        expect(file.x).toBeLessThan(layout.positions.get('b')!.x);
    });

    it('never overlaps two nodes of one lane', () => {
        const model = makeModel();
        const layout = Strategies.layoutGraph(model, CONFIG);
        const placed = model.nodes.filter((node) => layout.positions.get(node.id)?.y === 60 + 24);

        for (let i = 0; i < placed.length; i++)
            for (let j = i + 1; j < placed.length; j++)
                expect(
                    Math.abs(layout.positions.get(placed[i]!.id)!.x - layout.positions.get(placed[j]!.id)!.x),
                ).toBeGreaterThanOrEqual(
                    (CONFIG.nodeSizeFn(placed[i]!)[0] + CONFIG.nodeSizeFn(placed[j]!)[0]) / 2,
                );
    });

    it('restricts the placed nodes to the ones the host includes', () => {
        const layout = Strategies.layoutGraph(makeModel(), CONFIG, {
            include: (node) => node.kind === 'chip',
        });

        expect(layout.positions.size).toBe(0);
    });

    it('appends without moving the earlier nodes', () => {
        const model = makeModel();
        const before = Strategies.layoutGraph(model, CONFIG).positions;
        const extended: TestModel = {
            ...model,
            nodes: [...model.nodes, { id: 'c', kind: 'work', turnID: 't2' }],
        };
        const after = Strategies.layoutGraph(extended, CONFIG).positions;

        for (const id of before.keys()) expect(after.get(id)).toEqual(before.get(id));
    });

    it('bounds a derived cluster over its members', () => {
        const model = makeModel();
        model.nodes.push({ id: 'group', kind: 'work', clusterOf: ['a', 'b'] });
        const layout = Strategies.layoutGraph(model, CONFIG);
        const bounds = layout.clusters.get('group')!;

        for (const id of ['a', 'b']) {
            const point = layout.positions.get(id)!;
            expect(point.x).toBeGreaterThanOrEqual(bounds.min.x);
            expect(point.x).toBeLessThanOrEqual(bounds.max.x);
        }
    });

    it('emits a band per turn', () => {
        const layout = Strategies.layoutGraph(makeModel(), CONFIG);

        expect(layout.clusters.has('t1')).toBe(true);
        expect(layout.clusters.has('t2')).toBe(true);
    });
});

describe('Strategies.layoutGraph — timeline', () => {
    it('flows the turns left to right', () => {
        const layout = Strategies.layoutGraph(makeModel(), CONFIG, { strategy: 'timeline' });

        expect(layout.strategy).toBe('timeline');
        expect(layout.positions.get('a')!.x).toBeLessThan(layout.positions.get('b')!.x);
    });

    it('emits a band per turn', () => {
        const layout = Strategies.layoutGraph(makeModel(), CONFIG, { strategy: 'timeline' });

        expect(layout.clusters.has('t1')).toBe(true);
        expect(layout.clusters.has('t2')).toBe(true);
    });
});

describe('Strategies.layoutGraph — hierarchy', () => {
    it('indents the deeper kinds to the right', () => {
        const layout = Strategies.layoutGraph(makeModel(), CONFIG, { strategy: 'hierarchy' });

        expect(layout.strategy).toBe('hierarchy');
        expect(layout.positions.get('a')!.x).toBeGreaterThan(layout.positions.get('root')!.x);
        expect(layout.positions.get('a')!.z).toBeGreaterThan(layout.positions.get('root')!.z);
    });

    it('wraps the outline into capped columns', () => {
        const model = makeModel();
        model.nodes.push({ id: 'c', kind: 'work', turnID: 't2' });
        const layout = Strategies.layoutGraph(model, CONFIG, { strategy: 'hierarchy', rows: 2 });
        const rows = new Set([...layout.positions.values()].map((point) => point.y));

        expect(rows.size).toBeLessThanOrEqual(2);
    });
});

describe('Strategies.laneAnchors', () => {
    it('anchors every lane in order', () => {
        const anchors = Strategies.laneAnchors(CONFIG);

        expect(anchors).toEqual([
            { name: 'top', y: 0 },
            { name: 'bottom', y: 84 },
        ]);
    });
});

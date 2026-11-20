import { describe, expect, it } from 'vitest';
import {
    Representations,
    type RepresentationConfig,
    type RepresentationModel,
    type RepresentationNode,
} from 'spacegraphjs/representations';

type TurnNode = RepresentationNode & { turn: string };

const config: RepresentationConfig<TurnNode> = {
    nodeSizeFn: () => [80, 20],
    cellSize: [80, 20],
    rowKeyFn: (node) => node.turn,
    rowOrderFn: (nodes) => [...nodes],
    columnKeyFn: () => 0,
};

const model: RepresentationModel<TurnNode> = {
    nodes: [
        { id: 'a1', kind: 'tool', turn: 't1' },
        { id: 'a2', kind: 'tool', turn: 't1' },
        { id: 'b1', kind: 'tool', turn: 't2' },
    ],
    rows: ['t1', 't2'],
};

describe('summary representations', () => {
    it('stacks every log row in one vertical column', () => {
        const { positions } = Representations.logLayout(model, config, { gap: 0, rowGap: 10 });

        expect(positions.get('a1')).toEqual({ x: 0, y: 10, z: 0 });
        expect(positions.get('a2')).toEqual({ x: 0, y: 30, z: 0 });
        expect(positions.get('b1')).toEqual({ x: 0, y: 60, z: 0 });
    });
});

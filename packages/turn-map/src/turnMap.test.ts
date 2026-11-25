import { describe, expect, it } from 'vitest';
import type { GraphViewData } from '@spacegraphjs/shared';
import { buildTurnRenderModel, turnGraphModel } from './turnMap';
const node = (id: string) => ({ id, kind: 'action', label: id, status: 'success' });
const model: GraphViewData = {
    nodes: [node('turn'), node('a'), node('b'), node('c')],
    edges: [
        { id: 'ta', source: 'turn', target: 'a', kind: 'orders' },
        { id: 'tb', source: 'turn', target: 'b', kind: 'orders' },
        { id: 'ac', source: 'a', target: 'c', kind: 'orders' },
    ],
};
describe('turnMap', () => {
    it('scopes to the turn neighbourhood and lays it out', () => {
        const scoped = turnGraphModel(model, 'turn', 3);
        expect(scoped.nodes.map((entry) => entry.id)).toEqual(['turn', 'a', 'b']);
        const rendered = buildTurnRenderModel(model, 'turn', { limit: 3 });
        const positions = rendered.nodes.map((entry) => entry.position.join(','));
        expect(new Set(positions).size).toBe(3);
        expect(rendered.edges).toHaveLength(2);
    });
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { EventEmitter } from '../src/core/EventEmitter';
import type { Edge } from '../src/edges/Edge';
import type { Node } from '../src/nodes/Node';
import { KeyboardShortcuts } from '../src/plugins/interaction/KeyboardShortcuts';
import type { SpaceGraph } from '../src/SpaceGraph';

function fixture() {
    const events = new EventEmitter();
    const removedEdges: string[] = [];
    const deletedNodes: string[] = [];
    let request: { message: string; onConfirm: () => void } | undefined;
    events.on('ui:request:confirm', (event: typeof request) => {
        request = event;
    });
    events.on('node:delete', (event: { node: Node }) => deletedNodes.push(event.node.id));
    const sg = {
        events,
        graph: { removeEdge: (id: string) => removedEdges.push(id) },
    } as unknown as SpaceGraph;
    return {
        shortcuts: new KeyboardShortcuts(sg),
        deletedNodes,
        removedEdges,
        get request() {
            return request;
        },
    };
}

const node = (id: string) => ({ id }) as Node;
const edge = (id: string) => ({ id }) as Edge;

describe('KeyboardShortcuts.delete', () => {
    it('deletes nodes and edges in a mixed selection', () => {
        const f = fixture();
        f.shortcuts.handleDelete([node('n1'), node('n2')], [edge('e1')]);
        f.request?.onConfirm();
        expect(f.deletedNodes).toEqual(['n1', 'n2']);
        expect(f.removedEdges).toEqual(['e1']);
        expect(f.request?.message).toBe('Delete 2 nodes and edge?');
    });

    it('keeps the single-node prompt and ignores an empty selection', () => {
        const f = fixture();
        f.shortcuts.handleDelete([node('n1')], []);
        expect(f.request?.message).toBe('Delete node "n1..."?');
        f.shortcuts.handleDelete([], []);
        expect(f.deletedNodes).toEqual([]);
    });
});

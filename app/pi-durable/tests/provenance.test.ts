import type { KernelOp } from '@spacegraphjs/kernel';
import { TabRegistry } from 'pi-kit';
import { describe, expect, it } from 'vitest';
import { provenanceFor } from '../src/provenance';

const ops: readonly KernelOp[] = [
    { op: 'add-node', node: { id: 'c:1', kind: 'conversation', label: 'Conversation' } },
    { op: 'add-node', node: { id: 'm:1', kind: 'message', label: 'Paris?', data: { lane: 'transcript' } } },
    { op: 'add-edge', edge: { id: 'e:1', kind: 'orders', source: 'c:1', target: 'm:1' } },
    { op: 'add-node', node: { id: 'd:1', kind: 'artifact', label: 'Host todos', data: { deferred: true } } },
];

const tab = new TabRegistry().add('1', ops);

describe('provenance', () => {
    it('derives commit order and source from the entry log', () => {
        const provenance = provenanceFor(tab, 'm:1');
        expect(provenance?.sequence).toBe(2);
        expect(provenance?.source).toBe('node:m:1');
        expect(provenance?.predecessor).toBe('c:1');
        expect(provenance?.facets).toEqual(expect.arrayContaining(['transcript', 'message']));
        expect(provenance?.edgeKinds).toEqual(['orders']);
    });

    it('reports a deferred document without inventing an edge', () => {
        const provenance = provenanceFor(tab, 'd:1');
        expect(provenance?.edgeKinds).toEqual([]);
        expect(provenance?.successor).toBeUndefined();
        expect(provenanceFor(tab, 'missing')).toBeUndefined();
    });
});

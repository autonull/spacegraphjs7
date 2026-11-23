// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { VocabularyAdapter } from '../src/vocabulary-adapter';
import type { AdapterEdge, AdapterNode } from '../src/types';

const node = (id: string, kind: string, status: string): AdapterNode => ({
    id,
    kind,
    label: id,
    status,
});

const edge: AdapterEdge = { id: 'e', source: 'a', target: 'b', kind: 'flows' };

const vocabulary = {
    cardRoles: ['metric'],
    structuralKinds: ['group'],
    roleOf: (value: AdapterNode) => (value.kind === 'metric' ? 'metric' : 'other'),
};

describe('VocabularyAdapter', () => {
    test('maps the default status vocabulary and card roles', () => {
        const adapter = new VocabularyAdapter(vocabulary);
        expect(adapter.nodeStatus(node('a', 'metric', 'failed'))).toBe('error');
        expect(adapter.nodeStatus(node('a', 'metric', 'active'))).toBe('running');
        expect(adapter.nodeStatus(node('a', 'metric', 'unknown'))).toBe('success');
        expect(adapter.nodeShape(node('a', 'metric', 'active'))).toBe('card');
        expect(adapter.nodeShape(node('b', 'task', 'active'))).toBe('panel');
        expect(adapter.isStructuralKind('group')).toBe(true);
        expect(adapter.isStructuralKind('task')).toBe(false);
    });

    test('accepts an extended status map and extra node/edge data', () => {
        const adapter = new VocabularyAdapter({
            ...vocabulary,
            statusMap: { failed: 'error', queued: 'pending', slow: 'warning' },
            extraNodeData: (value, level) => ({ hint: `${level}:${value.id}` }),
            extraEdgeData: () => ({ confidence: 'inferred', directed: true }),
        });
        expect(adapter.nodeStatus(node('a', 'metric', 'queued'))).toBe('pending');
        expect(adapter.nodeStatus(node('a', 'metric', 'slow'))).toBe('warning');
        expect(adapter.nodeData(node('a', 'metric', 'queued'), 'detail', true)).toEqual({
            level: 'detail',
            dimmed: true,
            kind: 'metric',
            role: 'metric',
            hint: 'detail:a',
        });
        expect(adapter.toRenderEdge(edge, 'detail')).toEqual({
            id: 'e',
            source: 'a',
            target: 'b',
            kind: 'flows',
            visible: true,
            confidence: 'inferred',
            directed: true,
        });
    });
});

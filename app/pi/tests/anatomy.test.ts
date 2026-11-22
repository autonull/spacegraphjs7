import { describe, expect, test } from 'vitest';
import {
    ANATOMY_KINDS,
    anatomyCard,
    anatomyHeader,
    anatomyLens,
    anatomyPort,
    anatomyRow,
    anatomySignal,
    derivePorts,
    nodePorts,
} from '../src/anatomy';
import { agentDomain } from '@spacegraphjs/agent';
import { richFixtureKernel } from '../src/fixture';
import { innerTree } from '../src/inner';
import type { CardContext } from '@spacegraphjs/adapter';

const view = agentDomain.build(richFixtureKernel());
const context: CardContext = { count: 0, dimmed: false };
const nodeOf = (id: string) => view.nodes.find((node) => node.id === `pi:local:${id}`)!;

describe('anatomy parts', () => {
    test('a card is assembled from a header, signal, row and port', () => {
        expect(anatomyHeader('title', 20)).toContain('anatomy-title');
        expect(anatomySignal([0.5, 1])).toContain('<i ');
        expect(anatomyRow('text', 'meta')).toContain('anatomy-row');
        expect(anatomyPort('source', 'end')).toContain('data-port="source"');
        expect(anatomyPort('target', 'start')).toContain('data-side="start"');
    });

    test('ports face the majority of neighbours on each edge direction', () => {
        const edges = [
            { source: 'a', target: 'b' },
            { source: 'c', target: 'a' },
        ];
        const positions: Record<string, { x: number; y: number }> = {
            a: { x: 0, y: 0 },
            b: { x: 10, y: 0 },
            c: { x: 0, y: 10 },
        };
        expect(derivePorts('a', edges, (id) => positions[id])).toEqual({
            source: 'end',
            target: 'top',
        });
        expect(derivePorts('a', [], (id) => positions[id])).toBeUndefined();
    });

    test('a node reads its ports from data', () => {
        expect(nodePorts({ ...nodeOf('failed'), data: { ports: { target: 'start' } } })).toEqual({
            target: 'start',
        });
    });
});

describe('card anatomy', () => {
    test('every rendered kind shares one anatomy', () => {
        for (const kind of ANATOMY_KINDS) {
            const card = anatomyCard({ ...nodeOf('failed'), kind }, 'execution', context);
            expect(card).toContain('class="anatomy"');
            expect(card).toContain('data-anatomy=');
        }
    });

    test('rungs use distinct skeletons and keep the contract hooks', () => {
        const overview = anatomyCard(nodeOf('failed'), 'overview', context);
        const execution = anatomyCard(nodeOf('failed'), 'execution', context);
        const detail = anatomyCard(nodeOf('failed'), 'detail', context);
        expect(overview).toContain('data-rung="overview"');
        expect(execution).toContain('anatomy-signal');
        expect(detail).toContain('anatomy-status-dot');
        for (const card of [overview, execution, detail]) {
            expect(card).toContain('class="rung-shape"');
            expect(card).toContain('data-anatomy="failure"');
        }
    });

    test('a derived port is drawn inside the card', () => {
        const node = { ...nodeOf('failed'), data: { ports: { target: 'start', source: 'end' } } };
        const card = anatomyCard(node, 'execution', context);
        expect(card).toContain('data-port="target"');
        expect(card).toContain('data-port="source"');
    });

    test('kind arrangement changes which parts are present', () => {
        const message = anatomyCard({ ...nodeOf('q3'), kind: 'message' }, 'execution', context);
        const tool = anatomyCard({ ...nodeOf('grep'), kind: 'action' }, 'execution', context);
        expect(message).not.toContain('anatomy-signal');
        expect(tool).toContain('anatomy-signal');
    });

    test('detail rung reads as kind and status, with raw fields on hover', () => {
        const node = {
            ...nodeOf('failed'),
            kind: 'approval',
            status: 'pending',
            data: { unitId: 'x6', role: 'approval' },
        };
        const card = anatomyCard(node, 'detail', context);
        expect(card).toContain('Approval · Pending');
        expect(card).not.toContain('unitId:');
        expect(card).toContain('title="Unit Id: x6 · Role: approval"');
    });
});

describe('lens anatomy', () => {
    test('the lens reuses the card parts and keeps its topology', () => {
        const node = nodeOf('x3');
        const chips = innerTree(node.id, view.nodes, view.edges, 2);
        const lens = anatomyLens(node, chips, 'radial');
        expect(lens).toContain('class="focus-panel anatomy"');
        expect(lens).toContain('anatomy-head');
        expect(lens).toContain('anatomy-signal');
        expect(lens).toContain('focus-detail');
        expect(lens).toContain('class="focus-connectors"');
        expect(lens).toContain('focus-actions');
        expect(lens).toContain('focus-chip');
    });
});

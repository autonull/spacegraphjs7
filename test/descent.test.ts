import { describe, expect, it } from 'vitest';
import { DescentRegistry, kindDescent, type DescentNode } from 'spacegraphjs/navigation';

const nodes: DescentNode[] = [
    { id: 'session', kind: 'session', children: ['turn-1', 'turn-2', 'session-child', 'ghost'] },
    { id: 'turn-1', kind: 'turn', children: ['phase-1'] },
    { id: 'turn-2', kind: 'turn' },
    { id: 'phase-1', kind: 'phase', children: ['tool-1'] },
    { id: 'tool-1', kind: 'tool', children: ['part-1'] },
    { id: 'part-1', kind: 'part' },
    { id: 'session-child', kind: 'session', children: ['turn-2'] },
    { id: 'time', kind: 'time', children: ['checkpoint'] },
    { id: 'checkpoint', kind: 'checkpoint', children: ['session'] },
];
const context = { nodes: new Map(nodes.map((node) => [node.id, node])) };
const chain = kindDescent('pipeline', ['session', 'turn', 'phase', 'tool', 'part']);

describe('descent registry', () => {
    it('follows a host-defined kind ladder and drops ids outside the model', () => {
        const registry = new DescentRegistry([chain]);
        expect(registry.childrenOf(context.nodes.get('session')!, context)).toEqual([
            'turn-1',
            'turn-2',
        ]);
        expect(registry.childrenOf(context.nodes.get('part-1')!, context)).toEqual([]);
    });

    it('finds a root-inclusive path, or undefined when no policy connects the nodes', () => {
        const registry = new DescentRegistry([chain]);
        expect(registry.path('session', 'part-1', context)).toEqual([
            'session',
            'turn-1',
            'phase-1',
            'tool-1',
            'part-1',
        ]);
        expect(registry.path('session', 'session-child', context)).toBeUndefined();
        expect(registry.path('session', 'ghost', context)).toBeUndefined();
    });

    it('composes host policies for time and delegation without library vocabulary', () => {
        const registry = new DescentRegistry([
            {
                id: 'time',
                kinds: ['time'],
                children: (node) => node.children?.filter((id) => context.nodes.get(id)?.kind === 'checkpoint'),
            },
            { id: 'checkpoint', kinds: ['checkpoint'], children: (node) => node.children },
            chain,
        ]);
        expect(registry.ids).toEqual(['time', 'checkpoint', 'pipeline']);
        expect(registry.childrenOf(context.nodes.get('time')!, context)).toEqual(['checkpoint']);
        expect(registry.path('time', 'part-1', context)).toEqual([
            'time',
            'checkpoint',
            'session',
            'turn-1',
            'phase-1',
            'tool-1',
            'part-1',
        ]);
    });

    it('lets the first matching policy win', () => {
        const registry = new DescentRegistry([
            {
                id: 'delegate',
                kinds: ['session'],
                children: (node) =>
                    node.children?.filter((id) => context.nodes.get(id)?.kind === 'session'),
            },
            chain,
        ]);
        expect(registry.childrenOf(context.nodes.get('session')!, context)).toEqual(['session-child']);
    });

    it('allows a host to register a policy after construction', () => {
        const registry = new DescentRegistry();
        expect(registry.childrenOf(context.nodes.get('time')!, context)).toEqual([]);
        registry.register({
            id: 'checkpoint',
            kinds: ['time'],
            children: (node) => node.children,
        });
        expect(registry.childrenOf(context.nodes.get('time')!, context)).toEqual(['checkpoint']);
    });
});

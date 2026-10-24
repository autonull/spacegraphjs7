import { expect, test } from 'bun:test';
import { applyNodeBudget } from './budget';
import { Kernel } from './kernel';

const kernel = new Kernel({
    nodes: [
        { id: 'session', kind: 'session', label: 'Session' },
        { id: 'turn', kind: 'turn', label: 'Turn' },
        { id: 'message', kind: 'message', label: 'Message' },
        { id: 'tool', kind: 'tool', label: 'Tool' },
    ],
    edges: [
        { id: 'session-turn', kind: 'contains', source: 'session', target: 'turn' },
        { id: 'turn-message', kind: 'contains', source: 'turn', target: 'message' },
        { id: 'message-tool', kind: 'contains', source: 'message', target: 'tool' },
    ],
    hyperedges: [],
});

const weights = { session: 1000, turn: 500, message: 100, tool: 60 };

test('keeps the whole kernel when it fits the budget', () => {
    expect(applyNodeBudget(kernel, { maxNodes: 4, weights })).toBe(kernel);
});

test('keeps the highest-weight nodes and their connecting edges', () => {
    const budgeted = applyNodeBudget(kernel, { maxNodes: 2, weights });
    expect(budgeted.nodes.map((node) => node.id)).toEqual(['session', 'turn']);
    expect(budgeted.edges.map((edge) => edge.id)).toEqual(['session-turn']);
});

test('never drops a protected id, even when its kind is low weight', () => {
    const budgeted = applyNodeBudget(kernel, {
        maxNodes: 2,
        weights,
        protectedIds: ['tool'],
    });
    expect(budgeted.nodes.map((node) => node.id)).toContain('tool');
    expect(budgeted.nodes.length).toBe(2);
});

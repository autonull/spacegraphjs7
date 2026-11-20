import { describe, expect, it } from 'vitest';
import { GraphHistory, SessionKernel, type KernelOp, type Node } from '@spacegraphjs/kernel';
import { diffFromHistory, diffSnapshots } from '../src/graph-diff-view';

const node = (id: string, label = id): Node => ({ id, kind: 'file', label });
const ops: readonly KernelOp[] = [
    { op: 'add-node', node: node('a', 'old') },
    { op: 'add-node', node: node('b') },
    { op: 'add-edge', edge: { id: 'e1', kind: 'contains', source: 'a', target: 'b' } },
    { op: 'remove-node', id: 'b' },
    { op: 'add-node', node: node('c') },
    { op: 'add-edge', edge: { id: 'e2', kind: 'contains', source: 'a', target: 'c' } },
    { op: 'remove-edge', id: 'e1' },
    { op: 'add-node', node: node('a', 'new') },
];

const history = () => {
    const result = new GraphHistory(
        new SessionKernel({ entries: ops.map((op) => ({ id: '', op })) }),
        {
            limit: 8,
            labeler: (version) => `run ${version}`,
        },
    );
    result.captureAt(3);
    result.capture();
    return result;
};

describe('two-run graph diff', () => {
    it('derives added, removed and changed nodes from history snapshots', () => {
        const summary = diffFromHistory(history(), 3, 8);
        expect(summary.before).toEqual({ version: 3, label: 'run 3', nodes: 2, edges: 1 });
        expect(summary.after).toEqual({ version: 8, label: 'run 8', nodes: 2, edges: 1 });
        expect(summary.nodes).toEqual({ added: ['c'], removed: ['b'], changed: ['a'] });
        expect(summary.edges).toEqual({ added: ['e2'], removed: ['e1'], changed: [] });
        expect(summary.changedNodes).toEqual([{ id: 'a', before: 'old', after: 'new' }]);
    });

    it('rejects versions that were not captured', () => {
        expect(() => diffFromHistory(history(), 1, 8)).toThrow(/Missing history snapshots/);
    });

    it('matches the direct snapshot diff', () => {
        const captured = history();
        expect(diffFromHistory(captured, 3, 8)).toEqual(
            diffSnapshots(captured.getSnapshot(3)!, captured.getSnapshot(8)!),
        );
    });
});

import { describe, it, expect } from 'bun:test';
import { SessionKernel } from './session';
import type { KernelOp } from './session';
import { GraphHistory, createGraphHistory, type GraphSnapshot } from './graph-history';

const entry = (id: string, op: KernelOp) => ({ id, op });

const addNode = (id: string, kind = 'node', label = id): KernelOp => ({
    op: 'add-node',
    node: { id, kind, label },
});

describe('GraphHistory', () => {
    function createSessionWithNodes(count: number): SessionKernel {
        let session = new SessionKernel();
        for (let i = 0; i < count; i++) {
            session = session.append(entry(`e${i}`, addNode(`n${i}`, 'test', `Node ${i}`)));
        }
        return session;
    }

    describe('capture', () => {
        it('captures the current version', () => {
            const session = createSessionWithNodes(3);
            const history = createGraphHistory(session, 10);

            const snapshot = history.capture();

            expect(snapshot.version).toBe(3);
            expect(snapshot.kernel.nodes.length).toBe(3);
            expect(history.size).toBe(1);
        });

        it('captures multiple versions in sequence', () => {
            let session = createSessionWithNodes(1);
            const history = createGraphHistory(session, 10);

            history.capture(); // version 1

            session = session.append({
                id: 'e1',
                op: { op: 'add-node', node: { id: 'n1', kind: 'test', label: 'Node 1' } },
            });
            history.setSession(session);
            history.capture(); // version 2

            session = session.append({
                id: 'e2',
                op: { op: 'add-node', node: { id: 'n2', kind: 'test', label: 'Node 2' } },
            });
            history.setSession(session);
            history.capture(); // version 3

            expect(history.size).toBe(3);
            expect(history.all.map((s) => s.version)).toEqual([3, 2, 1]);
        });

        it('uses custom labeler', () => {
            const session = createSessionWithNodes(2);
            const history = createGraphHistory(session, 10, (v) => `v${v}`);

            const snapshot = history.capture();

            expect(snapshot.label).toBe('v2');
        });
    });

    describe('captureAt', () => {
        it('backfills a snapshot at a specific version', () => {
            const session = createSessionWithNodes(5);
            const history = createGraphHistory(session, 10);

            const snapshot = history.captureAt(2);

            expect(snapshot.version).toBe(2);
            expect(snapshot.kernel.nodes.length).toBe(2);
            expect(history.size).toBe(1);
        });

        it('throws for out-of-range version', () => {
            const session = createSessionWithNodes(3);
            const history = createGraphHistory(session, 10);

            expect(() => history.captureAt(5)).toThrow('outside 0..3');
            expect(() => history.captureAt(-1)).toThrow('outside 0..3');
        });

        it('sorts snapshots by version', () => {
            const session = createSessionWithNodes(5);
            const history = createGraphHistory(session, 10);

            history.captureAt(4);
            history.captureAt(1);
            history.captureAt(3);

            expect(history.all.map((s) => s.version)).toEqual([4, 3, 1]);
        });
    });

    describe('checkout', () => {
        it('returns a SessionKernel at the requested version', () => {
            const session = createSessionWithNodes(5);
            const history = createGraphHistory(session, 10);

            const checkedOut = history.checkout(2);

            expect(checkedOut.version).toBe(2);
            expect(checkedOut.state().nodes.length).toBe(2);
        });

        it('checkout does not affect original session', () => {
            const session = createSessionWithNodes(5);
            const history = createGraphHistory(session, 10);

            history.checkout(2);

            expect(history.currentSession.version).toBe(5);
        });

        it('throws for out-of-range version', () => {
            const session = createSessionWithNodes(3);
            const history = createGraphHistory(session, 10);

            expect(() => history.checkout(5)).toThrow('outside 0..3');
        });
    });

    describe('fork', () => {
        it('returns a SessionKernel forked from the requested version', () => {
            const session = createSessionWithNodes(5);
            const history = createGraphHistory(session, 10);

            const forked = history.fork(2);

            expect(forked.version).toBe(2);
            expect(forked.forkedFrom).toBe(2);
            expect(forked.state().nodes.length).toBe(2);
        });

        it('forked session can diverge independently', () => {
            const session = createSessionWithNodes(3);
            const history = createGraphHistory(session, 10);

            const forked = history.fork(1);
            const diverged = forked.append({
                id: 'e-new',
                op: { op: 'add-node', node: { id: 'n-new', kind: 'test', label: 'New' } },
            });

            expect(diverged.version).toBe(2);
            expect(diverged.state().nodes.length).toBe(2);
            expect(forked.state().nodes.length).toBe(1);
        });
    });

    describe('bounded history (pruning)', () => {
        it('keeps only the newest snapshots up to limit', () => {
            let session = createSessionWithNodes(1);
            const history = createGraphHistory(session, 3);

            for (let i = 1; i <= 5; i++) {
                session = session.append(entry(`e${i}`, addNode(`n${i}`, 'test', `Node ${i}`)));
                history.setSession(session);
                history.capture();
            }

            expect(history.size).toBe(3);
            // Started at version 1, then captured at versions 2,3,4,5,6
            // Limit 3 keeps newest: 6, 5, 4
            expect(history.all.map((s) => s.version)).toEqual([6, 5, 4]);
        });

        it('prunes correctly when capturing at older versions', () => {
            const session = createSessionWithNodes(10);
            const history = createGraphHistory(session, 3);

            history.captureAt(8);
            history.captureAt(9);
            history.captureAt(10);
            history.captureAt(5); // This should not be kept (older than limit)

            expect(history.size).toBe(3);
            expect(history.all.map((s) => s.version)).toEqual([10, 9, 8]);
        });
    });

    describe('getSnapshot and getSnapshotAtOrBefore', () => {
        it('returns captured snapshot by version', () => {
            const session = createSessionWithNodes(5);
            const history = createGraphHistory(session, 10);

            history.captureAt(2);
            history.captureAt(4);

            const snapshot = history.getSnapshot(2);

            expect(snapshot).toBeDefined();
            expect(snapshot!.version).toBe(2);
        });

        it('returns undefined for uncaptured version', () => {
            const session = createSessionWithNodes(5);
            const history = createGraphHistory(session, 10);

            history.captureAt(2);

            expect(history.getSnapshot(3)).toBeUndefined();
        });

        it('getSnapshotAtOrBefore returns latest at or before version', () => {
            const session = createSessionWithNodes(5);
            const history = createGraphHistory(session, 10);

            history.captureAt(1);
            history.captureAt(3);

            expect(history.getSnapshotAtOrBefore(0)).toBeUndefined();
            expect(history.getSnapshotAtOrBefore(1)?.version).toBe(1);
            expect(history.getSnapshotAtOrBefore(2)?.version).toBe(1);
            expect(history.getSnapshotAtOrBefore(3)?.version).toBe(3);
            expect(history.getSnapshotAtOrBefore(4)?.version).toBe(3);
        });
    });

    describe('setSession', () => {
        it('replaces the underlying session kernel', () => {
            let session = createSessionWithNodes(3);
            const history = createGraphHistory(session, 10);

            history.capture();

            const forked = session.fork(1);
            const newSession = forked.append({
                id: 'e-new',
                op: { op: 'add-node', node: { id: 'n-new', kind: 'test', label: 'New' } },
            });
            history.setSession(newSession);

            expect(history.currentSession.version).toBe(2);
            expect(history.currentSession.forkedFrom).toBe(1);
        });
    });

    describe('clear', () => {
        it('removes all snapshots', () => {
            const session = createSessionWithNodes(3);
            const history = createGraphHistory(session, 10);

            history.captureAt(1);
            history.captureAt(2);
            history.clear();

            expect(history.size).toBe(0);
            expect(history.latest).toBeUndefined();
        });
    });
});
import { opID } from 'pi-kit';
import { describe, expect, it } from 'vitest';
import { replayEvents, replayFeed, replayOps } from '../src/replay';
import { scenarioByID, scenarioOps } from '../src/scenarios';

const scenario = scenarioByID('replay')!;

describe('deferred recorder and replay', () => {
    it('reads a deterministic action sequence from the deferred document', () => {
        const events = replayEvents(scenario);
        expect(events.map((event) => event.at)).toEqual([1000, 2000, 3000]);
        expect(events.map((event) => event.action.kind)).toEqual(['prompt', 'approve', 'view']);
    });

    it('replays actions into stable ops without inventing a causal edge', () => {
        const events = replayEvents(scenario);
        const ops = replayOps(scenario, events);
        expect(ops).toEqual(replayOps(scenario, events));
        expect(ops.map(opID)).toEqual(replayOps(scenario, events).map(opID));
        const nodes = ops.flatMap((op) => (op.op === 'add-node' ? [op.node] : []));
        const edges = ops.flatMap((op) => (op.op === 'add-edge' ? [op.edge.kind] : []));
        expect(nodes.map((node) => node.id)).toContain('d:1:entry:replay-1-assistant');
        expect(nodes.find((node) => node.id === 'd:1:task:2')?.data).toMatchObject({ status: 'complete' });
        expect(edges).toEqual(['orders', 'orders']);
        expect(replayOps(scenario, [{ at: 4, action: { kind: 'view', view: 'docs' } }])).toEqual([]);
    });

    it('appends replayed facts to the local feed and keeps the document deferred', () => {
        const feed = replayFeed('replay');
        const active = feed.tabs.find((tab) => tab.id === feed.active)!;
        expect(active.ops.length).toBeGreaterThan(scenarioOps(scenario).length);
        expect(active.ops.map(opID)).toEqual([...new Set(active.ops.map(opID))]);
        const doc = scenarioOps(scenario).find((op) => op.op === 'add-node' && op.node.id === 'd:1:app.replay');
        expect(doc?.op === 'add-node' && doc.node.data).toMatchObject({ deferred: true });
    });
});

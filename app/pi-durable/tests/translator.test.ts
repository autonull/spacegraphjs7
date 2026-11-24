import { describe, expect, it } from 'vitest';
import { foldKernelOps, opID } from 'pi-kit';
import { forkOps, translateTasks, translateView, entryText, type DurableView } from '../src/translator';
import { feedTasks, localFeed } from '../src/local-feed';

const view: DurableView = {
    conversation: { id: 1 },
    entries: [
        { id: 7, kind: 'pi.user', model: [{ role: 'user', content: 'Capital of France?' }] },
        { id: 10, kind: 'pi.assistant', model: [{ role: 'assistant', content: [{ type: 'text', text: 'Paris.' }] }] },
        { id: 11, kind: 'pi.tool-result', model: [{ role: 'toolResult', content: 'ok' }] },
        { id: 12, kind: 'pi.reset', model: [{ role: 'user', content: 'handoff' }] },
    ],
    docs: {
        'pi.agent': { model: { provider: 'faux', modelId: 'faux-1' } },
        'pi.provider': { sessionId: 'local' },
        'pi.usage': { totalTokens: 8 },
        'pi.inbox': { items: [{ id: 'q1' }] },
        'pi.live': {},
    },
};

const tasks = [
    { id: 2, kind: 'durable.approval', state: { status: 'sleeping', phase: 'ask', signals: [{ signal: 'durable.approval', key: 'approve' }] } },
];

describe('Durable translation', () => {
    it('uses stable ids and produces one node per fact', () => {
        const ops = translateView(1, view, tasks);
        const ids = ops.filter((op) => op.op === 'add-node').map((op) => opID(op));
        expect(ids).toContain('node:d:1:conversation');
        expect(ids).toContain('node:d:1:entry:7');
        expect(ids).toContain('node:d:1:entry:10');
        expect(ids).toContain('node:d:1:tool:11');
        expect(ids).toContain('node:d:1:task:2');
        expect(ids).toContain('node:d:1:inbox:q1');
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('folds the same stream into the same graph twice', () => {
        const ops = translateView(1, view, tasks);
        const once = foldKernelOps(ops);
        const twice = foldKernelOps([...ops, ...ops]);
        expect(twice.nodes.map((node) => node.id).sort()).toEqual(once.nodes.map((node) => node.id).sort());
        expect(twice.edges.map((edge) => edge.id).sort()).toEqual(once.edges.map((edge) => edge.id).sort());
    });

    it('emits only recorded link kinds', () => {
        const ops = translateView(1, view, tasks);
        const kinds = new Set(ops.flatMap((op) => (op.op === 'add-edge' ? [op.edge.kind] : [])));
        expect([...kinds].sort()).toEqual(['orders', 'sleeps-on']);
    });

    it('records the sleeping task without inferring a cause', () => {
        const kernel = foldKernelOps(translateTasks(1, tasks));
        const task = kernel.nodes.find((node) => node.id === 'd:1:task:2');
        expect(task?.data?.['status']).toBe('sleeping');
        expect(task?.data?.['signals']).toBe('approve');
        expect(kernel.edges.every((edge) => edge.kind === 'sleeps-on')).toBe(true);
    });

    it('forks carry a real edge back to the source entry', () => {
        const kernel = foldKernelOps(forkOps(1, 2, 17));
        expect(kernel.edges.map((edge) => edge.kind).sort()).toEqual(['fork', 'forkedFrom']);
        expect(kernel.nodes.some((node) => node.id === 'd:2:conversation')).toBe(true);
    });

    it('reads both entry content forms', () => {
        expect(entryText(view.entries[0]!)).toBe('Capital of France?');
        expect(entryText(view.entries[1]!)).toBe('Paris.');
    });

    it('gives every Core shot a deterministic feed', () => {
        for (const shot of ['basic-turn', 'sleeping-approval', 'fork-tabs', 'resumed']) {
            const feed = localFeed(shot);
            expect(feed.tabs.length).toBeGreaterThan(0);
            for (const tab of feed.tabs) expect(foldKernelOps(tab.ops).nodes.length).toBeGreaterThan(1);
        }
        expect(feedTasks('1', 'resumed').length).toBeGreaterThan(0);
    });
});

import type { KernelOp } from 'pi-kit';
import { forkOps, translateTasks, translateView, type DurableTask, type DurableView } from './translator';

export type FeedTab = { readonly id: string; readonly ops: readonly KernelOp[] };
export type Feed = { readonly active: string; readonly tabs: readonly FeedTab[] };

const sleepingTask = (id: string): DurableTask => ({
    id,
    kind: 'durable.approval',
    conversationId: 1,
    state: {
        status: 'sleeping',
        phase: 'ask',
        signals: [{ signal: 'durable.approval', key: 'approve' }],
        until: Date.UTC(2030, 0, 1),
    },
});

const finishedTask = (id: string): DurableTask => ({
    id,
    kind: 'durable.approval',
    conversationId: 1,
    state: { status: 'terminal', phase: 'answered' },
});

const view = (question: string, answer: string, id = 1): DurableView => ({
    conversation: { id },
    entries: [
        { id: `${id}7`, kind: 'pi.user', model: [{ role: 'user', content: question }] },
        { id: `${id}10`, kind: 'pi.assistant', model: [{ role: 'assistant', content: [{ type: 'text', text: answer }] }] },
    ],
    docs: {
        'pi.agent': { model: { provider: 'faux', modelId: 'faux-1' } },
        'pi.provider': { sessionId: 'local-feed' },
        'pi.usage': { totalTokens: 8 },
        'pi.inbox': { items: [] },
        'pi.live': {},
    },
});

const tab = (id: string, question: string, answer: string, tasks: readonly DurableTask[] = []): FeedTab => ({
    id,
    ops: translateView(id, view(question, answer, Number(id)), tasks),
});

/** Deterministic, provider-free ops so the built page and every shot boot without a server. */
export const localFeed = (shot?: string, seed = 'fixed'): Feed => {
    const suffix = seed === 'fixed' ? '' : ` [${seed}]`;
    if (shot === 'sleeping-approval') {
        return {
            active: '1',
            tabs: [tab('1', 'Allow the sleeping task to wake?', 'Waiting on approval.', [sleepingTask('2')])],
        };
    }
    if (shot === 'fork-tabs') {
        return {
            active: '2',
            tabs: [
                tab('1', 'What can this workspace show?', 'Durable facts, navigable as a graph.'),
                {
                    id: '2',
                    ops: [
                        ...tab('2', 'Capital of France?', `Paris.${suffix}`).ops,
                        ...forkOps(1, 2, '17'),
                    ],
                },
            ],
        };
    }
    if (shot === 'resumed') {
        return {
            active: '1',
            tabs: [tab('1', 'Capital of France?', `Paris.${suffix}`, [finishedTask('2')])],
        };
    }
    if (shot === 'task-graph' || shot === 'timeline') {
        return {
            active: '1',
            tabs: [tab('1', 'What can this workspace show?', 'Durable facts, navigable as a graph.', [sleepingTask('2')])],
        };
    }
    return {
        active: '1',
        tabs: [tab('1', 'What can this workspace show?', 'Durable facts, navigable as a graph.', [sleepingTask('2')])],
    };
};

export const feedTasks = (id: string, shot?: string, seed = 'fixed'): readonly KernelOp[] =>
    shot === 'resumed'
        ? translateTasks(id, [finishedTask('2')])
        : shot === 'sleeping-approval' || shot === 'task-graph' || shot === 'timeline' || !shot
          ? translateTasks(id, [sleepingTask('2')])
          : [];

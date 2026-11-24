import { addEdge, addNode, type KernelOp } from '@spacegraphjs/kernel';
import { opID } from 'pi-kit';
import type { Feed } from './local-feed';
import { localFeed } from './local-feed';
import { scenarioByID, type Scenario } from './scenarios';
import { forkOps } from './translator';

export type ReplayAction =
    | { readonly kind: 'prompt'; readonly text: string; readonly mode?: 'steer' | 'followUp' }
    | { readonly kind: 'fork'; readonly entryId?: string }
    | { readonly kind: 'approve'; readonly key?: string }
    | { readonly kind: 'view'; readonly view: string };

export type ReplayEvent = { readonly at: number; readonly action: ReplayAction };

const isAction = (value: unknown): value is ReplayAction => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const action = value as { readonly kind?: unknown };
    return action.kind === 'prompt' || action.kind === 'fork' || action.kind === 'approve' || action.kind === 'view';
};

/** The replay document is deferred host state: the browser reads it, storage never folds it as a fact. */
export const replayEvents = (scenario: Scenario): readonly ReplayEvent[] => {
    const doc = scenario.view.docs?.['app.replay'];
    if (!doc || typeof doc !== 'object' || Array.isArray(doc) || !('events' in doc)) return [];
    const values = (doc as { readonly events?: unknown }).events;
    if (!Array.isArray(values)) return [];
    return values.flatMap((value): readonly ReplayEvent[] => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
        const event = value as { readonly at?: unknown; readonly action?: unknown };
        if (typeof event.at !== 'number' || !isAction(event.action)) return [];
        return [{ at: event.at, action: event.action }];
    });
};

/** Replays recorded host actions into stable ops; a view switch adds no node or edge. */
export const replayOps = (
    scenario: Scenario,
    events: readonly ReplayEvent[],
): readonly KernelOp[] => {
    const prefix = `d:${String(scenario.view.conversation.id)}`;
    const ops: KernelOp[] = [];
    let previous = `${prefix}:entry:${String(scenario.view.entries.at(-1)?.id ?? 'answer')}`;
    let ordinal = 0;
    for (const event of events) {
        switch (event.action.kind) {
            case 'prompt': {
                ordinal += 1;
                const user = `${prefix}:entry:replay-${ordinal}-user`;
                const answer = `${prefix}:entry:replay-${ordinal}-assistant`;
                const text = event.action.text;
                ops.push(
                    addNode(user, 'message', text, { role: 'user', text, status: 'complete', at: event.at }),
                    addNode(answer, 'message', 'Durable facts, navigable as a graph.', {
                        role: 'assistant', text: 'Durable facts, navigable as a graph.', status: 'complete', at: event.at,
                    }),
                    addEdge('orders', previous, user),
                    addEdge('orders', user, answer),
                );
                previous = answer;
                break;
            }
            case 'fork': {
                const child = Number(prefix.slice(2)) + 10;
                ops.push(...forkOps(prefix.slice(2), child, event.action.entryId ?? String(scenario.view.entries.at(-1)?.id ?? 'answer')));
                break;
            }
            case 'approve': {
                const task = scenario.tasks.find((entry) => entry.state.status === 'sleeping');
                if (task) ops.push(addNode(`${prefix}:task:${String(task.id)}`, 'task', `Task ${String(task.id)}`, {
                    status: 'complete', taskId: String(task.id), kind: task.kind ?? 'task', at: event.at,
                }));
                break;
            }
            case 'view':
                break;
        }
    }
    return ops;
};

/** A replay id names the scenario whose deferred `app.replay` document holds the recorded actions. */
export const replayFeed = (id: string, seed = 'fixed'): Feed => {
    const scenario = scenarioByID(id);
    if (!scenario) return localFeed(undefined, seed, id);
    const feed = localFeed(undefined, seed, id);
    const ops = replayOps(scenario, replayEvents(scenario));
    const active = feed.active;
    return {
        ...feed,
        tabs: feed.tabs.map((tab) => {
            if (tab.id !== active) return tab;
            const byID = new Map([...tab.ops, ...ops].map((op) => [opID(op), op]));
            return { ...tab, ops: [...byID.values()] };
        }),
    };
};

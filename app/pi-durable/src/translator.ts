import type { AgentEvent } from '@spacegraphjs/agent';
import { addEdge, addNode, type JsonValue, type KernelOp } from '@spacegraphjs/kernel';
import { opID } from 'pi-kit';

export type DurableEntry = {
    readonly id: string | number;
    readonly kind: string;
    readonly data?: JsonValue;
    readonly model?: readonly { readonly role?: string; readonly content?: JsonValue }[];
    readonly head?: JsonValue;
    readonly byTaskId?: string | number;
};

export type DurableTaskState = {
    readonly status: string;
    readonly phase?: string;
    readonly until?: number;
    readonly signals?: readonly { readonly signal: string; readonly key: string }[];
    readonly on?: readonly (string | number)[];
    readonly outcome?: string;
    readonly attempt?: number;
    readonly failFast?: boolean;
    readonly mode?: string;
};

export type DurableTask = {
    readonly id: string | number;
    readonly kind?: string;
    readonly conversationId?: string | number;
    readonly owner?: string | number;
    readonly background?: boolean;
    readonly delegates?: readonly (string | number)[];
    readonly retryOf?: string | number;
    readonly reportBack?: string | number;
    readonly state: DurableTaskState;
};

export type DurableView = {
    readonly conversation: { readonly id: string | number };
    readonly entries: readonly DurableEntry[];
    readonly docs?: Readonly<Record<string, JsonValue>>;
};

/** One op per stable id per stream: later revisions replace earlier ones. */
const dedupe = (ops: readonly KernelOp[]): KernelOp[] => {
    const byID = new Map<string, KernelOp>();
    for (const op of ops) byID.set(opID(op), op);
    return [...byID.values()];
};

const textOf = (content: JsonValue | undefined): string => {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content
        .map((part) =>
            part && typeof part === 'object' && !Array.isArray(part) && 'text' in part
                ? String(part.text ?? '')
                : '',
        )
        .join('');
};

export const entryText = (entry: DurableEntry): string => textOf(entry.model?.[0]?.content);

const entryNodeKind = (entry: DurableEntry): string => {
    if (entry.kind === 'pi.user' || entry.kind === 'pi.assistant') return 'message';
    if (entry.kind === 'pi.tool-result' || entry.kind.startsWith('pi.tool')) return 'action';
    if (entry.kind === 'pi.reset' || entry.kind === 'pi.compaction') return 'boundary';
    return 'state';
};

export const entryNodeID = (prefix: string, entry: DurableEntry): string =>
    `${prefix}:${entryNodeKind(entry) === 'action' ? 'tool' : 'entry'}:${entry.id}`;

/** Every fact first becomes an AgentEvent; no Durable type crosses into the browser. */
export const toAgentEvents = (view: DurableView): readonly AgentEvent[] => {
    const runId = String(view.conversation.id);
    const events: AgentEvent[] = [{ type: 'run-start', runId }];
    for (const entry of view.entries) {
        const id = `entry:${entry.id}`;
        const text = entryText(entry);
        const at = typeof entry.data === 'object' && entry.data && 'at' in entry.data
            ? Number((entry.data as { at: JsonValue }).at)
            : undefined;
        if (entry.kind === 'pi.user' || entry.kind === 'pi.assistant') {
            events.push({
                type: 'message',
                runId,
                id,
                role: entry.kind === 'pi.user' ? 'user' : 'assistant',
                text,
                final: true,
                ...(at === undefined ? {} : { at }),
            });
        } else if (entryNodeKind(entry) === 'action') {
            events.push({
                type: 'action',
                runId,
                id: `tool:${entry.id}`,
                toolName: entry.kind.replace(/^pi\./, ''),
                phase: 'end',
            });
        } else {
            events.push({ type: 'state', runId, id, reason: entry.kind, level: text });
        }
    }
    events.push({ type: 'run-settled', runId });
    return events;
};

const eventOps = (conversationID: string | number, events: readonly AgentEvent[]): KernelOp[] => {
    const prefix = `d:${conversationID}`;
    const runID = `${prefix}:run`;
    const ops: KernelOp[] = [];
    for (const event of events) {
        switch (event.type) {
            case 'run-start':
                ops.push(addNode(runID, 'run', 'Conversation run', { runId: String(conversationID), status: 'active', lane: 'run' }));
                break;
            case 'run-settled':
                ops.push(addNode(runID, 'run', 'Conversation run', { runId: String(conversationID), status: 'settled', lane: 'run' }));
                break;
            case 'message': {
                const id = `${prefix}:${event.id ?? event.role}`;
                ops.push(
                    addNode(id, 'message', event.text || `${event.role} message`, {
                        runId: String(conversationID),
                        role: event.role,
                        text: event.text ?? '',
                        status: 'complete',
                        lane: 'message',
                        ...(event.at === undefined ? {} : { at: event.at }),
                    }),
                );
                break;
            }
            case 'action': {
                const id = `${prefix}:${event.id ?? event.toolName}`;
                ops.push(
                    addNode(id, 'action', event.toolName, {
                        runId: String(conversationID),
                        toolName: event.toolName,
                        status: event.phase === 'end' ? 'complete' : 'active',
                        lane: 'action',
                    }),
                );
                break;
            }
            case 'state': {
                const id = `${prefix}:${event.id ?? event.reason}`;
                ops.push(
                    addNode(id, 'state', event.level || event.reason, {
                        runId: String(conversationID),
                        status: 'complete',
                        reason: event.reason,
                        lane: 'message',
                    }),
                );
                break;
            }
            default:
                break;
        }
    }
    return ops;
};

const docOps = (conversationID: string | number, docs: Readonly<Record<string, JsonValue>>): KernelOp[] => {
    const prefix = `d:${conversationID}`;
    const kinds: Readonly<Record<string, string>> = {
        'pi.usage': 'artifact',
        'pi.agent': 'config',
        'pi.provider': 'config',
        'pi.live': 'run',
        'pi.settings': 'config',
        'pi.env': 'config',
        'pi.extension': 'config',
        'pi.instructions': 'config',
        'pi.error': 'config',
        'pi.trace': 'state',
    };
    return Object.entries(docs).flatMap(([kind, doc]) => {
        if (kind === 'pi.inbox') {
            const items = doc && typeof doc === 'object' && !Array.isArray(doc) && 'items' in doc ? doc.items : [];
            if (!Array.isArray(items)) return [];
            return items.map((item) => {
                const id = item && typeof item === 'object' && 'id' in item ? String(item.id) : 'pending';
                return addNode(`${prefix}:inbox:${id}`, 'pending', `Pending ${id}`, {
                    runId: String(conversationID),
                    status: 'pending',
                    inboxId: id,
                });
            });
        }
        const nodeKind = kinds[kind] ?? 'artifact';
        const known = kind in kinds;
        const status = kind === 'pi.error' ? 'failed' : known ? 'complete' : 'deferred';
        const data: Record<string, JsonValue> = {
            runId: String(conversationID),
            status,
            doc: kind,
            json: JSON.stringify(doc).slice(0, 400),
        };
        if (!known) data.deferred = true;
        if (kind === 'pi.trace') data.trace = doc;
        if (kind === 'pi.error' && doc && typeof doc === 'object' && !Array.isArray(doc)) {
            if ('reason' in doc) data.error = doc.reason;
            if ('recovery' in doc) data.recovery = doc.recovery;
        }
        return [addNode(`${prefix}:${kind.replace(/^pi\./, '')}`, nodeKind, kind, data)];
    });
};

export const translateTasks = (
    conversationID: string | number,
    tasks: readonly DurableTask[],
): readonly KernelOp[] => dedupe(taskOps(conversationID, tasks));

const taskOps = (conversationID: string | number, tasks: readonly DurableTask[]): KernelOp[] => {
    const prefix = `d:${conversationID}`;
    return tasks.flatMap((task) => {
        const id = `${prefix}:task:${task.id}`;
        const status = task.state.status;
        const data: Record<string, JsonValue> = {
            runId: String(conversationID),
            taskId: String(task.id),
            status,
            phase: task.state.phase ?? '',
            kind: task.kind ?? 'task',
        };
        if (task.state.until !== undefined) data.until = task.state.until;
        if (task.state.signals) data.signals = task.state.signals.map((signal) => signal.key).join(',');
        if (task.state.outcome !== undefined) data.outcome = task.state.outcome;
        if (task.state.attempt !== undefined) data.attempt = task.state.attempt;
        if (task.state.failFast !== undefined) data.failFast = task.state.failFast;
        if (task.state.mode !== undefined) data.mode = task.state.mode;
        if (task.background !== undefined) data.background = task.background;
        if (task.reportBack !== undefined) data.reportBack = task.reportBack;
        const ops: KernelOp[] = [addNode(id, 'task', `Task ${task.id}`, data)];
        if (task.owner !== undefined)
            ops.push(addEdge('owns', `${prefix}:task:${task.owner}`, id));
        if (task.state.on)
            for (const on of task.state.on)
                ops.push(addEdge('waiting.on', id, `${prefix}:task:${on}`));
        if (task.state.signals)
            for (const signal of task.state.signals) {
                ops.push(addNode(`${prefix}:signal:${signal.key}`, 'pending', `Signal ${signal.key}`, {
                    runId: String(conversationID),
                    status: 'pending',
                    signal: signal.signal,
                    key: signal.key,
                }));
                ops.push(addEdge('sleeps-on', id, `${prefix}:signal:${signal.key}`));
            }
        if (task.delegates)
            for (const child of task.delegates)
                ops.push(addEdge('delegates', id, `${prefix}:task:${child}`));
        if (task.retryOf !== undefined)
            ops.push(addEdge('retry', id, `${prefix}:task:${task.retryOf}`));
        return ops;
    });
};

/** Fold a structural Durable view into stable, idempotent ops. */
export const translateView = (
    conversationID: string | number,
    view: DurableView,
    tasks: readonly DurableTask[] = [],
): readonly KernelOp[] => {
    const prefix = `d:${conversationID}`;
    const first = view.entries[0] ? entryNodeID(prefix, view.entries[0]) : `${prefix}:conversation`;
    const ops: KernelOp[] = [
        addNode(`${prefix}:conversation`, 'conversation', `Conversation ${conversationID}`, {
            runId: String(conversationID),
            status: 'complete',
        }),
        ...eventOps(conversationID, toAgentEvents(view)),
        ...docOps(conversationID, view.docs ?? {}),
        ...taskOps(conversationID, tasks),
    ];
    for (const entry of view.entries) {
        if (entryNodeKind(entry) !== 'boundary') continue;
        const boundaryID = entryNodeID(prefix, entry);
        const index = ops.findIndex((op) => op.op === 'add-node' && op.node.id === boundaryID);
        if (index >= 0) ops.splice(index, 1);
        ops.push(addNode(boundaryID, 'boundary', entry.kind, {
            runId: String(conversationID),
            status: 'complete',
            reason: entry.kind,
            ...(entry.head === undefined ? {} : { head: entry.head }),
        }));
        if (entry.head !== undefined)
            ops.push(addEdge('checkpoint', boundaryID, `${prefix}:entry:${String(entry.head)}`));
    }
    let previous = `${prefix}:conversation`;
    for (const entry of view.entries) {
        const id = entryNodeID(prefix, entry);
        ops.push(addEdge('orders', previous, id));
        previous = id;
    }
    return dedupe(ops);
};

/** Fork is a real Durable link, so the child gets a `fork` edge back to its source entry. */
export const forkOps = (
    parentID: string | number,
    childID: string | number,
    entryID: string | number,
): readonly KernelOp[] => [
    addNode(`d:${childID}:conversation`, 'conversation', `Conversation ${childID}`, {
        runId: String(childID),
        status: 'complete',
    }),
    addNode(`d:${childID}:fork`, 'boundary', `Forked at ${entryID}`, {
        runId: String(childID),
        status: 'complete',
        forkOf: String(parentID),
        entryId: String(entryID),
    }),
    addEdge('fork', `d:${childID}:conversation`, `d:${parentID}:entry:${entryID}`),
    addEdge('forkedFrom', `d:${childID}:conversation`, `d:${parentID}:conversation`),
];

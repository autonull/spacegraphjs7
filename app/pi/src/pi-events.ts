import type { AgentEvent } from '@spacegraphjs/agent';

type Content = { readonly type?: string; readonly text?: string; readonly thinking?: string };
type Message = {
    readonly role?: string;
    readonly content?: readonly Content[];
    readonly stopReason?: string;
    readonly usage?: {
        readonly input?: number;
        readonly output?: number;
        readonly totalTokens?: number;
        readonly cost?: { readonly total?: number };
    };
};

/** Structural view of the Pi SDK events this app consumes. Pi types never enter the library. */
export type PiEvent = {
    readonly type: string;
    readonly willRetry?: boolean;
    readonly aborted?: boolean;
    readonly message?: Message;
    readonly messages?: readonly Message[];
    readonly toolCallId?: string;
    readonly toolName?: string;
    readonly args?: unknown;
    readonly result?: unknown;
    readonly partialResult?: unknown;
    readonly isError?: boolean;
    readonly durationMs?: number;
    readonly parentToolCallId?: string;
    readonly reason?: string;
    readonly level?: string;
    readonly assistantMessageEvent?: {
        readonly type?: string;
        readonly delta?: string;
        readonly partial?: Message;
    };
    readonly entry?: { readonly type?: string; readonly provider?: string; readonly modelId?: string; readonly thinkingLevel?: string };
};

const contentOf = (message: Message | undefined, field: 'text' | 'thinking'): string | undefined => {
    const parts = (message?.content ?? [])
        .filter((part) => part.type === field)
        .map((part) => part[field])
        .filter((value): value is string => typeof value === 'string');
    return parts.length ? parts.join('') : undefined;
};

const asJson = (value: unknown) => (value === undefined ? undefined : JSON.stringify(value));

const pathOf = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
        const candidate = value as { readonly path?: unknown; readonly file?: unknown };
        if (typeof candidate.path === 'string') return candidate.path;
        if (typeof candidate.file === 'string') return candidate.file;
    }
    return undefined;
};

/** Translates one Pi event into generic agent events. No Pi vocabulary leaks past this file. */
export class PiEventTranslator {
    #turn = 0;
    #message = 0;
    #currentMessage = '';
    #currentUnit = '';

    constructor(private readonly runId: string) {}

    translate(event: PiEvent): readonly AgentEvent[] {
        const base = { runId: this.runId };
        const message = event.message;
        const stopReason = message?.stopReason;

        switch (event.type) {
            case 'agent_start':
                return [{ type: 'run-start', ...base }];
            case 'agent_end':
                return [{ type: 'run-end', ...base, willRetry: event.willRetry ?? false }];
            case 'agent_settled':
                return [{ type: 'run-settled', ...base, aborted: event.aborted ?? false }];
            case 'turn_start':
                this.#currentUnit = String(++this.#turn);
                return [{ type: 'unit-start', ...base, unitId: this.#currentUnit }];
            case 'turn_end':
                return [{ type: 'unit-end', ...base, unitId: this.#currentUnit, stopReason }];
            case 'message_start':
            case 'message_update':
            case 'message_end': {
                const assistant = message?.role === 'assistant';
                if (event.type === 'message_start' || !this.#currentMessage)
                    this.#currentMessage = String(++this.#message);
                const partial = event.assistantMessageEvent?.partial ?? message;
                const text = contentOf(partial, 'text') ?? event.assistantMessageEvent?.delta;
                return [
                    {
                        type: 'message',
                        ...base,
                        unitId: this.#currentUnit,
                        id: this.#currentMessage,
                        role: assistant ? 'assistant' : 'user',
                        text: assistant ? undefined : text,
                        thinking: assistant ? contentOf(partial, 'thinking') : undefined,
                        final: event.type === 'message_end',
                        stopReason,
                        usage: assistant
                            ? {
                                  input: message?.usage?.input,
                                  output: message?.usage?.output,
                                  totalTokens: message?.usage?.totalTokens,
                                  cost: message?.usage?.cost?.total,
                              }
                            : undefined,
                    },
                ];
            }
            case 'tool_execution_start':
            case 'tool_execution_update':
            case 'tool_execution_end': {
                const phase =
                    event.type === 'tool_execution_start'
                        ? 'start'
                        : event.type === 'tool_execution_update'
                          ? 'update'
                          : 'end';
                const action: AgentEvent = {
                    type: 'action',
                    ...base,
                    unitId: this.#currentUnit,
                    id: event.toolCallId,
                    toolName: event.toolName ?? 'tool',
                    args: asJson(event.args),
                    phase,
                    isError: event.isError,
                    durationMs: event.durationMs,
                    parentId: event.parentToolCallId,
                    ...(phase === 'update' && event.partialResult !== undefined
                        ? { partialResult: asJson(event.partialResult) }
                        : {}),
                };
                const events: AgentEvent[] = [action];
                if (phase === 'end') {
                    const path = pathOf(event.result);
                    if (path)
                        events.push({
                            type: 'artifact',
                            ...base,
                            unitId: this.#currentUnit,
                            id: `file:${path}`,
                            path,
                            producerId: event.toolCallId,
                        });
                }
                return events;
            }
            case 'compaction_start':
            case 'compaction_end':
                return [
                    {
                        type: 'state',
                        ...base,
                        unitId: this.#currentUnit,
                        reason: `compact:${event.reason ?? 'unknown'}`,
                    },
                ];
            case 'thinking_level_changed':
                return [
                    {
                        type: 'state',
                        ...base,
                        unitId: this.#currentUnit,
                        reason: 'thinking-level',
                        level: event.level,
                    },
                ];
            case 'entry_appended': {
                const entry = event.entry;
                if (entry?.type === 'model_change')
                    return [
                        {
                            type: 'state',
                            ...base,
                            unitId: this.#currentUnit,
                            reason: 'model',
                            level: `${entry.provider ?? ''}:${entry.modelId ?? ''}`,
                        },
                    ];
                if (entry?.type === 'thinking_level_change')
                    return [
                        {
                            type: 'state',
                            ...base,
                            unitId: this.#currentUnit,
                            reason: 'thinking-level',
                            level: entry.thinkingLevel,
                        },
                    ];
                return [];
            }
            default:
                return [];
        }
    }
}

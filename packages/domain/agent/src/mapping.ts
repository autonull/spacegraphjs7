import { addEdge, addNode, DomainEventMapper, type JsonValue, type KernelOp } from '@spacegraphjs/kernel';

export type UsageReading = {
    readonly input?: number;
    readonly output?: number;
    readonly totalTokens?: number;
    readonly cost?: number;
};

export type AgentEvent =
    | { readonly type: 'run-start'; readonly runId: string; readonly at?: number }
    | { readonly type: 'run-end'; readonly runId: string; readonly willRetry?: boolean; readonly at?: number }
    | { readonly type: 'run-settled'; readonly runId: string; readonly aborted?: boolean; readonly at?: number }
    | { readonly type: 'unit-start'; readonly runId: string; readonly unitId?: string; readonly at?: number }
    | {
          readonly type: 'unit-end';
          readonly runId: string;
          readonly unitId?: string;
          readonly stopReason?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'message';
          readonly runId: string;
          readonly unitId?: string;
          readonly id?: string;
          readonly role: 'user' | 'assistant';
          readonly text?: string;
          readonly thinking?: string;
          readonly final?: boolean;
          readonly stopReason?: string;
          readonly usage?: UsageReading;
          readonly at?: number;
      }
    | {
          readonly type: 'action';
          readonly runId: string;
          readonly unitId?: string;
          readonly id?: string;
          readonly toolName: string;
          readonly args?: JsonValue;
          readonly result?: JsonValue;
          readonly partialResult?: JsonValue;
          readonly phase: 'start' | 'update' | 'end';
          readonly isError?: boolean;
          readonly durationMs?: number;
          readonly parentId?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'artifact';
          readonly runId: string;
          readonly unitId?: string;
          readonly id?: string;
          readonly path: string;
          readonly producerId?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'state';
          readonly runId: string;
          readonly unitId?: string;
          readonly id?: string;
          readonly reason: string;
          readonly level?: string;
          readonly at?: number;
      };

/** Converts host events into KernelOps. Hosts may use it or write their own. No host vocabulary inside. */
export class AgentEventMapper extends DomainEventMapper {
    #unit = '';

    constructor(prefix = 'agent') {
        super(prefix);
    }

    map(event: AgentEvent): readonly KernelOp[] {
        const { id, next } = this;
        const unitID = ('unitId' in event ? event.unitId : undefined) ?? this.#unit;

        switch (event.type) {
            case 'run-start':
                return [
                    addNode(
                        id(event.runId, 'run'),
                        'run',
                        'Run',
                        { runId: event.runId, status: 'active', lane: 'run', at: event.at ?? null },
                    ),
                ];
            case 'run-end':
            case 'run-settled': {
                const status = event.type === 'run-settled' ? (event.aborted ? 'aborted' : 'settled') : 'ended';
                return [
                    addNode(
                        id(event.runId, 'run'),
                        'run',
                        'Run',
                        {
                            runId: event.runId,
                            status,
                            lane: 'run',
                            willRetry: 'willRetry' in event ? (event.willRetry ?? false) : false,
                        },
                    ),
                ];
            }
            case 'unit-start': {
                this.#unit = event.unitId ?? next();
                return [
                    addNode(
                        id(event.runId, this.#unit),
                        'unit',
                        'Unit',
                        { runId: event.runId, unitId: this.#unit, status: 'active', lane: 'unit' },
                    ),
                    addEdge('contains', id(event.runId, 'run'), id(event.runId, this.#unit)),
                ];
            }
            case 'unit-end': {
                const current = unitID || next();
                const failed = event.stopReason === 'error' || event.stopReason === 'aborted';
                const ops: KernelOp[] = [
                    addNode(
                        id(event.runId, current),
                        'unit',
                        'Unit',
                        {
                            runId: event.runId,
                            unitId: current,
                            status: failed ? 'failed' : 'complete',
                            stopReason: event.stopReason ?? 'stop',
                            lane: 'unit',
                        },
                    ),
                ];
                if (failed)
                    ops.push(
                        addNode(id(event.runId, next(), 'retry'), 'retry', 'Retry', {
                            runId: event.runId,
                            status: 'pending',
                            lane: 'unit',
                        }),
                    );
                return ops;
            }
            case 'message': {
                const messageID = event.id ?? next();
                const data: Record<string, JsonValue> = {
                    runId: event.runId,
                    unitId: unitID,
                    role: event.role,
                    status: event.final ? 'complete' : 'streaming',
                    lane: 'message',
                };
                if (event.text !== undefined) data.text = event.text;
                if (event.thinking !== undefined) data.thinking = event.thinking;
                if (event.stopReason !== undefined) data.stopReason = event.stopReason;
                if (event.usage) data.usage = JSON.stringify(event.usage);
                return [
                    addNode(id(event.runId, messageID), 'message', `${event.role} message`, data),
                    addEdge('contains', id(event.runId, unitID), id(event.runId, messageID)),
                ];
            }
            case 'action': {
                const actionID = event.id ?? next();
                const data: Record<string, JsonValue> = {
                    runId: event.runId,
                    unitId: unitID,
                    toolName: event.toolName,
                    role: 'action',
                    status:
                        event.phase === 'end'
                            ? event.isError
                                ? 'failed'
                                : 'complete'
                            : event.phase === 'update'
                              ? 'streaming'
                              : 'active',
                    lane: 'action',
                };
                if (event.args !== undefined) data.args = JSON.stringify(event.args);
                if (event.result !== undefined) data.result = JSON.stringify(event.result);
                if (event.partialResult !== undefined) data.partialResult = JSON.stringify(event.partialResult);
                if (event.durationMs !== undefined) data.durationMs = event.durationMs;
                if (event.isError !== undefined) data.isError = event.isError;
                const ops: KernelOp[] = [
                    addNode(id(event.runId, actionID), 'action', event.toolName, data),
                    addEdge('contains', id(event.runId, unitID), id(event.runId, actionID)),
                ];
                if (event.parentId)
                    ops.push(addEdge('delegates', id(event.runId, event.parentId), id(event.runId, actionID)));
                return ops;
            }
            case 'artifact': {
                const artifactID = event.id ?? next();
                const ops: KernelOp[] = [
                    addNode(id(event.runId, artifactID), 'artifact', event.path, {
                        runId: event.runId,
                        unitId: unitID,
                        path: event.path,
                        role: 'artifact',
                        status: 'complete',
                    }),
                    addEdge('contains', id(event.runId, unitID), id(event.runId, artifactID)),
                ];
                if (event.producerId)
                    ops.push(addEdge('writes', id(event.runId, event.producerId), id(event.runId, artifactID)));
                return ops;
            }
            case 'state': {
                const stateID = event.id ?? next();
                return [
                    addNode(id(event.runId, stateID), 'state', event.reason, {
                        runId: event.runId,
                        unitId: unitID,
                        reason: event.reason,
                        level: event.level ?? '',
                        role: 'state',
                        status: 'complete',
                    }),
                    addEdge('contains', id(event.runId, unitID), id(event.runId, stateID)),
                ];
            }
        }
    }
}

import { addEdge, addNode, type JsonValue, type KernelOp } from '@spacegraphjs/kernel';

export type WorkflowEvent =
    | {
          readonly type: 'workflow-start';
          readonly workflowId: string;
          readonly name?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'workflow-end';
          readonly workflowId: string;
          readonly status?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'subworkflow-start';
          readonly workflowId: string;
          readonly subworkflowId: string;
          readonly parentId?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'subworkflow-end';
          readonly workflowId: string;
          readonly subworkflowId: string;
          readonly status?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'step-start';
          readonly workflowId: string;
          readonly stepId: string;
          readonly subworkflowId?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'step-end';
          readonly workflowId: string;
          readonly stepId: string;
          readonly status?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'run-start';
          readonly workflowId: string;
          readonly stepId: string;
          readonly runId?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'run-end';
          readonly workflowId: string;
          readonly stepId: string;
          readonly runId?: string;
          readonly status?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'trigger';
          readonly workflowId: string;
          readonly source?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'artifact';
          readonly workflowId: string;
          readonly stepId?: string;
          readonly runId?: string;
          readonly id?: string;
          readonly path: string;
          readonly producerId?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'retry';
          readonly workflowId: string;
          readonly stepId: string;
          readonly runId: string;
          readonly id?: string;
          readonly reason?: string;
          readonly at?: number;
      };

/** Converts host events into KernelOps. Hosts may use it or write their own. No host vocabulary inside. */
export class WorkflowEventMapper {
    #ordinal = 0;

    constructor(private readonly prefix = 'workflow') {}

    map(event: WorkflowEvent): readonly KernelOp[] {
        const id = (...parts: (string | undefined)[]): string =>
            [this.prefix, ...parts.filter((part): part is string => Boolean(part))].join(':');
        const next = (): string => String(++this.#ordinal);
        const root = id(event.workflowId, 'workflow');
        const owner = (stepID: string | undefined, subworkflowID: string | undefined): string =>
            stepID
                ? id(event.workflowId, stepID)
                : subworkflowID
                  ? id(event.workflowId, subworkflowID)
                  : root;

        switch (event.type) {
            case 'workflow-start':
                return [
                    addNode(root, 'workflow', event.name ?? 'Workflow', {
                        workflowId: event.workflowId,
                        status: 'active',
                        lane: 'workflow',
                        at: event.at ?? null,
                    }),
                ];
            case 'workflow-end':
                return [
                    addNode(root, 'workflow', 'Workflow', {
                        workflowId: event.workflowId,
                        status: event.status ?? 'complete',
                        lane: 'workflow',
                    }),
                ];
            case 'subworkflow-start': {
                const parent = event.parentId ? id(event.workflowId, event.parentId) : root;
                return [
                    addNode(
                        id(event.workflowId, event.subworkflowId),
                        'subworkflow',
                        event.subworkflowId,
                        {
                            workflowId: event.workflowId,
                            subworkflowId: event.subworkflowId,
                            status: 'active',
                            lane: 'step',
                        },
                    ),
                    addEdge('contains', parent, id(event.workflowId, event.subworkflowId)),
                ];
            }
            case 'subworkflow-end':
                return [
                    addNode(
                        id(event.workflowId, event.subworkflowId),
                        'subworkflow',
                        event.subworkflowId,
                        {
                            workflowId: event.workflowId,
                            subworkflowId: event.subworkflowId,
                            status: event.status ?? 'complete',
                            lane: 'step',
                        },
                    ),
                ];
            case 'step-start': {
                const parent = owner(undefined, event.subworkflowId);
                return [
                    addNode(id(event.workflowId, event.stepId), 'step', event.stepId, {
                        workflowId: event.workflowId,
                        stepId: event.stepId,
                        subworkflowId: event.subworkflowId ?? null,
                        status: 'active',
                        lane: 'step',
                    }),
                    addEdge('contains', parent, id(event.workflowId, event.stepId)),
                ];
            }
            case 'step-end':
                return [
                    addNode(id(event.workflowId, event.stepId), 'step', event.stepId, {
                        workflowId: event.workflowId,
                        stepId: event.stepId,
                        status: event.status ?? 'complete',
                        lane: 'step',
                    }),
                ];
            case 'run-start': {
                const runID = event.runId ?? next();
                return [
                    addNode(id(event.workflowId, runID), 'run', runID, {
                        workflowId: event.workflowId,
                        stepId: event.stepId,
                        runId: runID,
                        status: 'active',
                        lane: 'run',
                        at: event.at ?? null,
                    }),
                    addEdge(
                        'contains',
                        id(event.workflowId, event.stepId),
                        id(event.workflowId, runID),
                    ),
                ];
            }
            case 'run-end': {
                const runID = event.runId ?? next();
                return [
                    addNode(id(event.workflowId, runID), 'run', runID, {
                        workflowId: event.workflowId,
                        stepId: event.stepId,
                        runId: runID,
                        status: event.status ?? 'complete',
                        lane: 'run',
                    }),
                ];
            }
            case 'trigger': {
                const triggerID = id(event.workflowId, 'trigger', next());
                return [
                    addNode(triggerID, 'trigger', event.source ?? 'Trigger', {
                        workflowId: event.workflowId,
                        source: event.source ?? null,
                        role: 'trigger',
                        status: 'complete',
                    }),
                    addEdge('contains', root, triggerID),
                ];
            }
            case 'artifact': {
                const artifactID = event.id ?? next();
                const target = id(event.workflowId, artifactID);
                const ops: KernelOp[] = [
                    addNode(target, 'artifact', event.path, {
                        workflowId: event.workflowId,
                        stepId: event.stepId ?? null,
                        runId: event.runId ?? null,
                        path: event.path,
                        role: 'artifact',
                        status: 'complete',
                    }),
                    addEdge('contains', owner(event.stepId, undefined), target),
                ];
                if (event.producerId)
                    ops.push(addEdge('writes', id(event.workflowId, event.producerId), target));
                return ops;
            }
            case 'retry': {
                const retryID = id(event.workflowId, event.stepId, 'retry', event.id ?? next());
                return [
                    addNode(retryID, 'retry', 'Retry', {
                        workflowId: event.workflowId,
                        stepId: event.stepId,
                        reason: event.reason ?? null,
                        role: 'retry',
                        status: 'pending',
                        lane: 'step',
                    }),
                    addEdge('contains', id(event.workflowId, event.stepId), retryID),
                    addEdge('retries', retryID, id(event.workflowId, event.runId)),
                ];
            }
        }
    }
}

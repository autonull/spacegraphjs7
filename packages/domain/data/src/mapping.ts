import { addEdge, addNode, DomainEventMapper, type KernelOp } from '@spacegraphjs/kernel';

export type DataEvent =
    | {
          readonly type: 'pipeline-start';
          readonly pipelineId: string;
          readonly name?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'pipeline-end';
          readonly pipelineId: string;
          readonly status?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'dataset';
          readonly pipelineId: string;
          readonly id: string;
          readonly name: string;
          readonly source?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'step-start';
          readonly pipelineId: string;
          readonly stepId: string;
          readonly at?: number;
      }
    | {
          readonly type: 'step-end';
          readonly pipelineId: string;
          readonly stepId: string;
          readonly status?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'run-start';
          readonly pipelineId: string;
          readonly stepId: string;
          readonly runId?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'run-end';
          readonly pipelineId: string;
          readonly stepId: string;
          readonly runId?: string;
          readonly status?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'model';
          readonly pipelineId: string;
          readonly id: string;
          readonly name: string;
          readonly stepId?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'metric';
          readonly pipelineId: string;
          readonly id: string;
          readonly name: string;
          readonly value: number;
          readonly baseline?: number;
          readonly stepId?: string;
          readonly runId?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'feeds';
          readonly pipelineId: string;
          readonly sourceId: string;
          readonly targetId: string;
      }
    | {
          readonly type: 'evaluates';
          readonly pipelineId: string;
          readonly sourceId: string;
          readonly targetId: string;
      }
    | {
          readonly type: 'retries';
          readonly pipelineId: string;
          readonly stepId: string;
          readonly runId: string;
          readonly id?: string;
          readonly reason?: string;
      };

/** Converts host events into KernelOps. Hosts may use it or write their own. No host vocabulary inside. */
export class DataEventMapper extends DomainEventMapper {
    constructor(prefix = 'data') {
        super(prefix);
    }

    map(event: DataEvent): readonly KernelOp[] {
        const { id, next } = this;
        const root = id(event.pipelineId, 'pipeline');
        const owner = (stepID: string | undefined, runID: string | undefined): string =>
            runID ? id(event.pipelineId, runID) : stepID ? id(event.pipelineId, stepID) : root;

        switch (event.type) {
            case 'pipeline-start':
                return [
                    addNode(root, 'pipeline', event.name ?? 'Pipeline', {
                        pipelineId: event.pipelineId,
                        status: 'active',
                        lane: 'pipeline',
                        at: event.at ?? null,
                    }),
                ];
            case 'pipeline-end':
                return [
                    addNode(root, 'pipeline', 'Pipeline', {
                        pipelineId: event.pipelineId,
                        status: event.status ?? 'complete',
                        lane: 'pipeline',
                    }),
                ];
            case 'dataset': {
                const target = id(event.pipelineId, event.id);
                return [
                    addNode(target, 'dataset', event.name, {
                        pipelineId: event.pipelineId,
                        datasetId: event.id,
                        source: event.source ?? null,
                        status: 'complete',
                        lane: 'step',
                    }),
                    addEdge('contains', root, target),
                ];
            }
            case 'step-start': {
                const target = id(event.pipelineId, event.stepId);
                return [
                    addNode(target, 'step', event.stepId, {
                        pipelineId: event.pipelineId,
                        stepId: event.stepId,
                        status: 'active',
                        lane: 'step',
                    }),
                    addEdge('contains', root, target),
                ];
            }
            case 'step-end':
                return [
                    addNode(id(event.pipelineId, event.stepId), 'step', event.stepId, {
                        pipelineId: event.pipelineId,
                        stepId: event.stepId,
                        status: event.status ?? 'complete',
                        lane: 'step',
                    }),
                ];
            case 'run-start': {
                const runID = event.runId ?? next();
                const target = id(event.pipelineId, runID);
                return [
                    addNode(target, 'run', runID, {
                        pipelineId: event.pipelineId,
                        stepId: event.stepId,
                        runId: runID,
                        status: 'active',
                        lane: 'run',
                        at: event.at ?? null,
                    }),
                    addEdge('contains', id(event.pipelineId, event.stepId), target),
                ];
            }
            case 'run-end': {
                const runID = event.runId ?? next();
                return [
                    addNode(id(event.pipelineId, runID), 'run', runID, {
                        pipelineId: event.pipelineId,
                        stepId: event.stepId,
                        runId: runID,
                        status: event.status ?? 'complete',
                        lane: 'run',
                    }),
                ];
            }
            case 'model': {
                const target = id(event.pipelineId, event.id);
                const ops: KernelOp[] = [
                    addNode(target, 'model', event.name, {
                        pipelineId: event.pipelineId,
                        modelId: event.id,
                        stepId: event.stepId ?? null,
                        role: 'model',
                        status: 'complete',
                    }),
                    addEdge(
                        'contains',
                        event.stepId ? id(event.pipelineId, event.stepId) : root,
                        target,
                    ),
                ];
                return ops;
            }
            case 'metric': {
                const target = id(event.pipelineId, event.id);
                const ops: KernelOp[] = [
                    addNode(target, 'metric', event.name, {
                        pipelineId: event.pipelineId,
                        metricId: event.id,
                        value: event.value,
                        baseline: event.baseline ?? null,
                        role: 'metric',
                        status: 'complete',
                        lane: 'metric',
                    }),
                    addEdge('contains', owner(event.stepId, event.runId), target),
                ];
                return ops;
            }
            case 'feeds':
            case 'evaluates':
                return [
                    addEdge(
                        event.type,
                        id(event.pipelineId, event.sourceId),
                        id(event.pipelineId, event.targetId),
                    ),
                ];
            case 'retries': {
                const retryID = id(event.pipelineId, event.stepId, 'retry', event.id ?? next());
                return [
                    addNode(retryID, 'retry', 'Retry', {
                        pipelineId: event.pipelineId,
                        stepId: event.stepId,
                        reason: event.reason ?? null,
                        role: 'retry',
                        status: 'pending',
                        lane: 'step',
                    }),
                    addEdge('contains', id(event.pipelineId, event.stepId), retryID),
                    addEdge('retries', retryID, id(event.pipelineId, event.runId)),
                ];
            }
        }
    }
}

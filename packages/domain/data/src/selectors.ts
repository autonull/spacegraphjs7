import { walk, type Trace } from '@spacegraphjs/shared/domain';
import type { GraphNode } from '@spacegraphjs/shared';
import { DATA_RELATIONS, roleOf, type DataView } from './vocabulary';

export type DataTrace = Trace;

const TRACE_KINDS: Readonly<Record<string, readonly string[]>> = {
    why: ['evaluates', 'writes', 'contains'],
    'led-here': ['orders'],
    downstream: ['orders', 'writes', 'feeds', 'evaluates'],
    upstream: ['contains', 'orders', 'feeds'],
    related: ['contains', 'writes', 'feeds', 'evaluates'],
};

export const why = (view: DataView, id: string): DataTrace =>
    walk(view, id, 'in', TRACE_KINDS.why!);
export const ledHere = (view: DataView, id: string): DataTrace =>
    walk(view, id, 'out', TRACE_KINDS['led-here']!);
export const downstream = (view: DataView, id: string): DataTrace =>
    walk(view, id, 'out', TRACE_KINDS.downstream!);
export const upstream = (view: DataView, id: string): DataTrace =>
    walk(view, id, 'in', TRACE_KINDS.upstream!);
export const related = (view: DataView, id: string): DataTrace =>
    walk(view, id, 'in', TRACE_KINDS.related!);

/** Everything upstream of a metric: its model, run, step and the datasets feeding that step. */
export const lineage = (view: DataView, metricID: string): DataTrace =>
    walk(view, metricID, 'in', ['evaluates', 'writes', 'contains', 'feeds']);

/** Metrics a model evaluates, in graph order. */
export const modelMetrics = (view: DataView, modelID: string): readonly string[] => [
    ...walk(view, modelID, 'out', [DATA_RELATIONS.evaluate]).answerIds,
];

/** Datasets feeding a step, in first-write order. */
export const stepInputs = (view: DataView, stepID: string): readonly string[] => [
    ...walk(view, stepID, 'in', [DATA_RELATIONS.feed]).answerIds,
];

export type DataRegression = {
    readonly id: string;
    readonly label: string;
    readonly value: number;
    readonly baseline: number;
    readonly delta: number;
};

const numeric = (node: GraphNode, key: string): number | undefined =>
    typeof node.data?.[key] === 'number' ? (node.data[key] as number) : undefined;

/** Metrics below their baseline, ordered from the largest drop to the smallest. */
export const regressions = (view: DataView): readonly DataRegression[] =>
    view.nodes
        .filter((node) => roleOf(node) === 'metric')
        .map((node) => {
            const value = numeric(node, 'value');
            const baseline = numeric(node, 'baseline');
            return value !== undefined && baseline !== undefined
                ? { id: node.id, label: node.label, value, baseline, delta: value - baseline }
                : undefined;
        })
        .filter((metric): metric is DataRegression => metric !== undefined && metric.delta < 0)
        .sort((a, b) => a.delta - b.delta);

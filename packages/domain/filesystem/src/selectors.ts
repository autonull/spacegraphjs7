import {
    createTraceSelectors,
    groupEdgesByTarget,
    walk,
    type Trace,
} from '@spacegraphjs/shared/domain';
import { FILESYSTEM_RELATIONS, roleOf, type FileSystemView } from './vocabulary';

export type FilesystemTrace = Trace;

const TRACE_KINDS: Readonly<Record<string, readonly string[]>> = {
    why: ['writes', 'produces', 'contains'],
    'led-here': ['orders'],
    downstream: ['orders', 'writes', 'produces', 'depends'],
    upstream: ['contains', 'orders'],
    related: ['contains', 'writes', 'produces', 'depends'],
};

export const { why, ledHere, downstream, upstream, related } =
    createTraceSelectors<FileSystemView>(TRACE_KINDS);

/** The symbols or earlier changes that wrote a change, in first-write order. */
export const changeProducers = (view: FileSystemView, changeID: string): readonly string[] => [
    ...walk(view, changeID, 'in', ['writes', 'produces']).answerIds,
];

/** Symbols that depend on a symbol, found by following incoming `depends` edges. */
export const symbolDependents = (view: FileSystemView, symbolID: string): readonly string[] => [
    ...walk(view, symbolID, 'in', ['depends']).answerIds,
];

/** Symbols a symbol depends on, found by following outgoing `depends` edges. */
export const symbolDependencies = (view: FileSystemView, symbolID: string): readonly string[] => [
    ...walk(view, symbolID, 'out', ['depends']).answerIds,
];

export type ChangeOrigin = {
    readonly id: string;
    readonly path: string;
    readonly producers: readonly string[];
};

/** Changes with their writers, in first-write order. */
export const changeOrigins = (view: FileSystemView): readonly ChangeOrigin[] =>
    groupEdgesByTarget(view.nodes, view.edges, {
        isTarget: (node) => roleOf(node) === 'change',
        writes: FILESYSTEM_RELATIONS.write,
    }).map(({ id, path, writers }) => ({ id, path, producers: writers }));

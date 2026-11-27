import {
    createTraceSelectors,
    groupEdgesByTarget,
    walk,
    type Trace,
} from '@spacegraphjs/shared/domain';
import {
    dataString,
    roleOf,
    SOURCE_RELATIONS,
    SOURCE_ROLES,
    type SourceRole,
    type SourceView,
} from './vocabulary';

export type SourceTrace = Trace;

const TRACE_KINDS: Readonly<Record<string, readonly string[]>> = {
    why: ['imports', 'references', 'contains'],
    'led-here': ['exports', 'imports'],
    downstream: ['imports', 'exports', 'references'],
    upstream: ['contains', 'exports'],
    related: ['contains', 'imports', 'exports', 'references'],
};

export const { why, ledHere, downstream, upstream, related } =
    createTraceSelectors<SourceView>(TRACE_KINDS);

/** Exported symbols declared in a file, in source order. */
export const symbolsOf = (view: SourceView, fileID: string): readonly string[] =>
    view.edges
        .filter((edge) => edge.kind === 'contains' && edge.source === fileID)
        .map((edge) => edge.target);

/** Files a file imports inside the snapshot. */
export const dependenciesOf = (view: SourceView, id: string): readonly string[] => [
    ...walk(view, id, 'out', ['imports', 'exports']).answerIds,
];

/** Files or symbols that import or reference a node. */
export const dependentsOf = (view: SourceView, id: string): readonly string[] => [
    ...walk(view, id, 'in', ['imports', 'exports', 'references']).answerIds,
];

/** Other symbols a symbol declaration mentions. */
export const referencesOf = (view: SourceView, symbolID: string): readonly string[] => [
    ...walk(view, symbolID, 'out', ['references']).answerIds,
];

export type SourceFileFact = {
    readonly id: string;
    readonly path: string;
    readonly importers: readonly string[];
};

/** Files with their in-snapshot importers, in first-import order. */
export const fileFacts = (view: SourceView): readonly SourceFileFact[] =>
    groupEdgesByTarget(view.nodes, view.edges, {
        isTarget: (node) => roleOf(node) === 'file',
        writes: SOURCE_RELATIONS.dependency,
    }).map(({ id, path, writers }) => ({ id, path, importers: writers }));

/** A compact API census used by the browser and by tests. */
export const apiCensus = (view: SourceView): Readonly<Record<SourceRole, number>> => {
    const counts = Object.fromEntries(SOURCE_ROLES.map((role) => [role, 0])) as Record<
        SourceRole,
        number
    >;
    const roles = new Set<string>(SOURCE_ROLES);
    for (const node of view.nodes) {
        const role = dataString(node, 'role') ?? roleOf(node);
        if (roles.has(role)) counts[role as SourceRole] += 1;
    }
    return counts;
};

import { walk, type Trace } from '@spacegraphjs/shared/domain';
import {
    FILESYSTEM_RELATIONS,
    dataString,
    relationOf,
    roleOf,
    type FileSystemView,
} from './vocabulary';

export type FilesystemTrace = Trace;

const TRACE_KINDS: Readonly<Record<string, readonly string[]>> = {
    why: ['writes', 'produces', 'contains'],
    'led-here': ['orders'],
    downstream: ['orders', 'writes', 'produces', 'depends'],
    upstream: ['contains', 'orders'],
    related: ['contains', 'writes', 'produces', 'depends'],
};

export const why = (view: FileSystemView, id: string): FilesystemTrace =>
    walk(view, id, 'in', TRACE_KINDS.why!);
export const ledHere = (view: FileSystemView, id: string): FilesystemTrace =>
    walk(view, id, 'out', TRACE_KINDS['led-here']!);
export const downstream = (view: FileSystemView, id: string): FilesystemTrace =>
    walk(view, id, 'out', TRACE_KINDS.downstream!);
export const upstream = (view: FileSystemView, id: string): FilesystemTrace =>
    walk(view, id, 'in', TRACE_KINDS.upstream!);
export const related = (view: FileSystemView, id: string): FilesystemTrace =>
    walk(view, id, 'in', TRACE_KINDS.related!);

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
export const changeOrigins = (view: FileSystemView): readonly ChangeOrigin[] => {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    const writes = new Set<string>(FILESYSTEM_RELATIONS.write);
    const origins = new Map<string, { id: string; path: string; producers: string[] }>();
    const order: string[] = [];

    for (const edge of view.edges) {
        if (!writes.has(relationOf(edge))) continue;
        const node = nodes.get(edge.target);
        if (!node || roleOf(node) !== 'change') continue;
        if (!origins.has(node.id)) {
            origins.set(node.id, {
                id: node.id,
                path: dataString(node, 'path') ?? node.label,
                producers: [],
            });
            order.push(node.id);
        }
        origins.get(node.id)!.producers.push(edge.source);
    }

    return order.map((id) => origins.get(id)!);
};

import {
    dataString,
    dependenciesOf,
    dependentsOf,
    referencesOf,
    type SourceSnapshot,
    type SourceView,
} from '@spacegraphjs/source';

export type SourceScope = 'public' | 'all';

export interface SourceFilter {
    readonly scope: SourceScope;
    readonly packageId?: string;
    readonly query: string;
    /** Include exported symbols; the default file map stays readable at overview zoom. */
    readonly detail?: 'files' | 'symbols';
}

/** Files re-exported from the library entry point: the smallest honest view of the public API. */
export function publicFileIDs(snapshot: SourceSnapshot): ReadonlySet<string> {
    const entryFiles = snapshot.files.filter((file) => file.id === 'src/index');
    return new Set([
        ...entryFiles.map((file) => file.id),
        ...entryFiles.flatMap((file) =>
            file.imports.flatMap((entry) =>
                entry.kind === 'export' && entry.fileId ? [entry.fileId] : [],
            ),
        ),
    ]);
}

/** Shortest unique path suffix: keeps full-width labels from colliding at overview zoom. */
export function shortLabels(paths: readonly string[]): ReadonlyMap<string, string> {
    const parts = paths.map((path) => path.split('/').filter(Boolean));
    const labels = paths.map((_, index) => parts[index]!.slice(-1).join('/'));
    const assigned = paths.map(() => false);
    for (
        let depth = 1;
        depth <= Math.max(...parts.map((segments) => segments.length), 1);
        depth++
    ) {
        const candidates = parts.map((segments) => segments.slice(-depth).join('/'));
        const counts = new Map<string, number>();
        for (const candidate of candidates) counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
        for (let index = 0; index < candidates.length; index++)
            if (!assigned[index] && counts.get(candidates[index]) === 1) {
                labels[index] = candidates[index]!;
                assigned[index] = true;
            }
    }
    return new Map(paths.map((path, index) => [path, labels[index]!]));
}
/** Hard ceilings for the rendered graph; filters may narrow further, never widen past these. */
export const SOURCE_VISUAL_LIMITS = { nodes: 300, edges: 600 } as const;
export interface GraphBudget {
    readonly totalNodes: number;
    readonly totalEdges: number;
    readonly shownNodes: number;
    readonly shownEdges: number;
    readonly truncated: boolean;
}
/** Keeps the most connected nodes and edges so a capped view still reads as a graph. */
export function capGraph<
    N extends { readonly id: string },
    E extends { readonly source: string; readonly target: string },
>(
    nodes: readonly N[],
    edges: readonly E[],
    limits: { readonly nodes: number; readonly edges: number } = SOURCE_VISUAL_LIMITS,
): { readonly nodes: readonly N[]; readonly edges: readonly E[]; readonly budget: GraphBudget } {
    const degree = new Map<string, number>();
    for (const edge of edges) {
        degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
        degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    }
    const ranked = [...nodes].sort(
        (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.id.localeCompare(b.id),
    );
    const keptNodes = ranked.slice(0, limits.nodes);
    const keep = new Set(keptNodes.map((node) => node.id));
    const incident = edges.filter((edge) => keep.has(edge.source) && keep.has(edge.target));
    const keptEdges = incident.slice(0, limits.edges);
    return {
        nodes: keptNodes,
        edges: keptEdges,
        budget: {
            totalNodes: nodes.length,
            totalEdges: edges.length,
            shownNodes: keptNodes.length,
            shownEdges: keptEdges.length,
            truncated: keptNodes.length < nodes.length || keptEdges.length < incident.length,
        },
    };
}
/** Applies scope, package and text filters without mutating the snapshot. */
export function filterSnapshot(snapshot: SourceSnapshot, filter: SourceFilter): SourceSnapshot {
    const publicIDs = filter.scope === 'public' ? publicFileIDs(snapshot) : undefined;
    const query = filter.query.trim().toLowerCase();
    const files = snapshot.files
        .filter((file) => !filter.packageId || file.packageId === filter.packageId)
        .filter((file) => !publicIDs || publicIDs.has(file.id))
        .map((file) => {
            const candidates = filter.detail === 'symbols' || query ? file.symbols : [];
            const symbols = !query
                ? candidates
                : candidates.filter((symbol) =>
                      `${symbol.name} ${symbol.signature} ${symbol.doc ?? ''}`
                          .toLowerCase()
                          .includes(query),
                  );
            const mentionsImport = query
                ? file.imports.some(
                      (entry) =>
                          entry.specifier.toLowerCase().includes(query) ||
                          entry.names.some((name) => name.toLowerCase().includes(query)),
                  )
                : false;
            if (
                query &&
                !symbols.length &&
                !file.path.toLowerCase().includes(query) &&
                !mentionsImport
            )
                return undefined;
            return {
                ...file,
                symbols,
                imports: file.imports.filter(
                    (entry) => !entry.fileId || publicIDs?.has(entry.fileId) !== false,
                ),
            };
        })
        .filter((file): file is NonNullable<typeof file> => Boolean(file));
    return { ...snapshot, files };
}

export interface SourceFacts {
    readonly packages: readonly { readonly id: string; readonly files: number }[];
    readonly files: number;
    readonly symbols: number;
    readonly imports: number;
    readonly references: number;
}

export function sourceFacts(snapshot: SourceSnapshot): SourceFacts {
    const byPackage = new Map<string, number>();
    for (const file of snapshot.files)
        byPackage.set(file.packageId, (byPackage.get(file.packageId) ?? 0) + 1);
    return {
        packages: [...byPackage]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([id, files]) => ({ id, files })),
        files: snapshot.files.length,
        symbols: snapshot.files.reduce((total, file) => total + file.symbols.length, 0),
        imports: snapshot.files.reduce(
            (total, file) => total + file.imports.filter((entry) => entry.kind === 'import').length,
            0,
        ),
        references: snapshot.files.reduce(
            (total, file) =>
                total +
                file.symbols.reduce((sum, symbol) => sum + (symbol.references?.length ?? 0), 0),
            0,
        ),
    };
}

export interface SymbolFacts {
    readonly title: string;
    readonly kind: string;
    readonly path: string;
    readonly line: number;
    readonly signature: string;
    readonly doc: string;
    readonly dependencies: readonly string[];
    readonly dependents: readonly string[];
    readonly references: readonly string[];
}

const EMPTY_SYMBOL_FACTS: SymbolFacts = {
    title: '',
    kind: '',
    path: '',
    line: 0,
    signature: '',
    doc: '',
    dependencies: [],
    dependents: [],
    references: [],
};

/** Inspector facts come from the folded view, not a second index. */
export function symbolFacts(view: SourceView, id: string): SymbolFacts {
    const node = view.nodes.find((entry) => entry.id === id);
    if (!node) return { ...EMPTY_SYMBOL_FACTS, title: id };
    const labels = new Map(view.nodes.map((entry) => [entry.id, entry.label]));
    const names = (ids: readonly string[]): readonly string[] =>
        ids.slice(0, 12).map((target) => labels.get(target) ?? target.split(':').at(-1) ?? target);
    return {
        title: node.label,
        kind: dataString(node, 'symbolKind') ?? dataString(node, 'role') ?? 'node',
        path: dataString(node, 'path') ?? '',
        line: Number(node.data?.['line'] ?? 0),
        signature: dataString(node, 'signature') ?? '',
        doc: dataString(node, 'doc') ?? '',
        dependencies: names(dependenciesOf(view, id)),
        dependents: names(dependentsOf(view, id)),
        references: names(referencesOf(view, id)),
    };
}

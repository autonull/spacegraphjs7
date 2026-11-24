import type { ScopeEdge, ScopeNode } from 'pi-kit';

export type Rung = 'cosmos' | 'territory' | 'passage' | 'fact' | 'grain';

export type RungSpec = {
    readonly id: Rung;
    readonly label: string;
    readonly description: string;
    readonly kinds: ReadonlySet<string>;
    readonly edges: ReadonlySet<string>;
};

/** Five places on one folded kernel. A rung summarises; it never adds a fact or invents an edge. */
export const RUNGS: readonly RungSpec[] = [
    {
        id: 'cosmos', label: 'Cosmos', description: 'The whole workspace as surveyed territory.',
        kinds: new Set(['conversation', 'run', 'task', 'boundary']),
        edges: new Set(['contains', 'owns', 'delegates', 'fork', 'forkedFrom']),
    },
    {
        id: 'territory', label: 'Territory', description: 'Owners, waits and sleep signals.',
        kinds: new Set(['conversation', 'run', 'task', 'pending', 'boundary']),
        edges: new Set(['contains', 'owns', 'delegates', 'retry', 'sleeps-on', 'waiting.on', 'fork', 'forkedFrom']),
    },
    {
        id: 'passage', label: 'Passage', description: 'Ordered turns and their boundaries.',
        kinds: new Set(['run', 'message', 'action', 'boundary', 'state']),
        edges: new Set(['orders', 'checkpoint']),
    },
    {
        id: 'fact', label: 'Fact', description: 'Committed entries, edges and documents.',
        kinds: new Set<string>(),
        edges: new Set<string>(),
    },
    {
        id: 'grain', label: 'Grain', description: 'Document fields and deferred host state.',
        kinds: new Set(['conversation', 'artifact', 'config', 'state', 'pending']),
        edges: new Set<string>(),
    },
];

export const RUNG_IDS: readonly Rung[] = RUNGS.map((rung) => rung.id);

export const isRung = (value: unknown): value is Rung => RUNG_IDS.includes(value as Rung);

export const rungView = (
    rung: Rung,
    view: { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] },
): { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] } => {
    const spec = RUNGS.find((entry) => entry.id === rung)!;
    if (rung === 'fact') return view;
    const ids = new Set(view.nodes.filter((node) => spec.kinds.has(node.kind)).map((node) => node.id));
    if (!ids.size) return view;
    return {
        nodes: view.nodes.filter((node) => ids.has(node.id)),
        edges: view.edges.filter((edge) => spec.edges.has(edge.kind) && ids.has(edge.source) && ids.has(edge.target)),
    };
};

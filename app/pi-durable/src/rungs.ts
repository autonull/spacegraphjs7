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

/** Per-rung kinds and edges mute what is out of landmark; empty sets leave the fold untouched. */
export const rungEmphasis = (rung: Rung): {
    readonly mutedNode: (kind: string) => boolean;
    readonly mutedEdge: (kind: string) => boolean;
} => {
    const spec = RUNGS.find((entry) => entry.id === rung)!;
    return {
        mutedNode: (kind) => spec.kinds.size > 0 && !spec.kinds.has(kind),
        mutedEdge: (kind) => spec.edges.size > 0 && !spec.edges.has(kind),
    };
};

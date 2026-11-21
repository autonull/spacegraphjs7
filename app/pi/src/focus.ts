export type FocusRole = 'focus' | 'neighbor' | 'context' | 'none';

export interface FocusScales {
    readonly focus: number;
    readonly neighbor: number;
    readonly context: number;
}

interface Link {
    readonly source: string;
    readonly target: string;
}

/** One focus center, its 1-hop neighborhood, and the rest. No focus means no role and no scaling. */
export const focusRoles = (focus: string, edges: readonly Link[]): ReadonlyMap<string, FocusRole> => {
    if (!focus) return new Map();
    const roles = new Map<string, FocusRole>([[focus, 'focus']]);
    for (const edge of edges) {
        if (edge.source === focus && !roles.has(edge.target)) roles.set(edge.target, 'neighbor');
        if (edge.target === focus && !roles.has(edge.source)) roles.set(edge.source, 'neighbor');
    }
    return roles;
};

export const scaleForRole = (role: FocusRole, scales: FocusScales): number =>
    role === 'focus'
        ? scales.focus
        : role === 'neighbor'
          ? scales.neighbor
          : role === 'context'
            ? scales.context
            : 1;

import type { AgentView } from './vocabulary';

export type AgentTrace = {
    readonly answerIds: ReadonlySet<string>;
    readonly contextIds: ReadonlySet<string>;
    readonly answerEdgeIds: ReadonlySet<string>;
};

const walk = (
    view: AgentView,
    start: string,
    direction: 'in' | 'out',
    kinds: readonly string[],
): AgentTrace => {
    const allowed = new Set(kinds);
    const answerIds = new Set<string>();
    const contextIds = new Set<string>();
    const answerEdgeIds = new Set<string>();
    const seen = new Set<string>([start]);
    let frontier = [start];

    while (frontier.length) {
        const next: string[] = [];
        for (const edge of view.edges) {
            if (!allowed.has(edge.kind)) continue;
            const from = direction === 'out' ? edge.source : edge.target;
            const to = direction === 'out' ? edge.target : edge.source;
            if (!frontier.includes(from) || seen.has(to)) continue;
            answerIds.add(to);
            answerEdgeIds.add(edge.id);
            for (const parent of view.edges) {
                if (parent.target === to && parent.kind === 'contains') contextIds.add(parent.source);
            }
            seen.add(to);
            next.push(to);
        }
        frontier = next;
    }

    return { answerIds, contextIds, answerEdgeIds };
};

const TRACE_KINDS: Readonly<Record<string, readonly string[]>> = {
    why: ['writes', 'delegates', 'contains'],
    'led-here': ['orders'],
    downstream: ['orders', 'writes', 'delegates'],
    upstream: ['contains', 'orders'],
    related: ['contains', 'writes', 'delegates', 'orders'],
};

export const why = (view: AgentView, id: string): AgentTrace => walk(view, id, 'in', TRACE_KINDS.why!);
export const ledHere = (view: AgentView, id: string): AgentTrace => walk(view, id, 'out', TRACE_KINDS['led-here']!);
export const downstream = (view: AgentView, id: string): AgentTrace =>
    walk(view, id, 'out', TRACE_KINDS.downstream!);
export const upstream = (view: AgentView, id: string): AgentTrace => walk(view, id, 'in', TRACE_KINDS.upstream!);
export const related = (view: AgentView, id: string): AgentTrace => walk(view, id, 'in', TRACE_KINDS.related!);

export const failures = (view: AgentView): readonly string[] =>
    view.nodes
        .filter((node) => node.status === 'failed' || node.kind === 'failure')
        .map((node) => node.id);

const connectedArtifacts = (view: AgentView, source: string | undefined): readonly string[] =>
    view.edges
        .filter(
            (edge) =>
                edge.kind === 'writes' &&
                (source === undefined || edge.source === source) &&
                view.nodes.some((node) => node.id === edge.target && node.kind === 'artifact'),
        )
        .map((edge) => edge.target);

export const changedArtifacts = (view: AgentView, source?: string): readonly string[] =>
    connectedArtifacts(view, source);

export const delegationContributions = (view: AgentView, actionID: string): readonly string[] =>
    [...walk(view, actionID, 'out', ['delegates']).answerIds];

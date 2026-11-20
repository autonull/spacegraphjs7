import { walk, type Trace } from '@spacegraphjs/shared/domain';
import { AGENT_RELATIONS, dataString, relationOf, roleOf, type AgentView } from './vocabulary';

export type AgentTrace = Trace;

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

export type AgentFailure = {
    readonly id: string;
    readonly label: string;
    readonly summary: string | undefined;
    readonly turnID: string | undefined;
    readonly turnLabel: string | undefined;
    readonly turnNumber: number;
};

const turnContextOf = (view: AgentView, id: string) => {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    const node = nodes.get(id);
    if (!node) return undefined;
    const turnID = dataString(node, 'turnID') ?? dataString(node, 'unitId');
    if (!turnID) return undefined;
    return {
        id: turnID,
        label: nodes.get(turnID)?.label ?? turnID,
        number: (view.turns ?? []).indexOf(turnID) + 1,
    };
};

/**
 * Failures carry their node and turn context, not just ids. Hosts select the roles that count as a
 * failure; a failed status is an additional generic signal that hosts may turn off when their own
 * vocabulary distinguishes a failed action from a failure node.
 */
export const failureDetails = (
    view: AgentView,
    options: {
        readonly roles?: readonly string[];
        readonly includeFailedStatus?: boolean;
    } = {},
): readonly AgentFailure[] => {
    const roles = new Set(options.roles ?? ['failure', 'retry']);
    return view.nodes
        .filter(
            (node) =>
                roles.has(roleOf(node)) || (options.includeFailedStatus !== false && node.status === 'failed'),
        )
        .map((node) => {
            const turn = turnContextOf(view, node.id);
            return {
                id: node.id,
                label: node.label,
                summary: dataString(node, 'summary'),
                turnID: turn?.id,
                turnLabel: turn?.label,
                turnNumber: turn?.number ?? 0,
            };
        });
};

export const failures = (view: AgentView): readonly string[] =>
    failureDetails(view).map((failure) => failure.id);

export type AgentChangedFile = {
    readonly id: string;
    readonly path: string;
    readonly writers: readonly string[];
    readonly readers: readonly string[];
};

/** Changed artifacts carry first-write order, their writers and their readers. */
export const changedFiles = (view: AgentView): readonly AgentChangedFile[] => {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    const isArtifact = (id: string) => {
        const node = nodes.get(id);
        return node !== undefined && roleOf(node) === 'artifact';
    };
    const writes = new Set<string>(AGENT_RELATIONS.write);
    const reads = new Set<string>(AGENT_RELATIONS.read);
    const files = new Map<string, { id: string; path: string; writers: string[]; readers: string[] }>();
    const order: string[] = [];

    for (const edge of view.edges) {
        if (!isArtifact(edge.target) || !writes.has(relationOf(edge))) continue;
        let file = files.get(edge.target);
        if (!file) {
            const node = nodes.get(edge.target)!;
            file = { id: edge.target, path: dataString(node, 'path') ?? node.label, writers: [], readers: [] };
            files.set(edge.target, file);
            order.push(edge.target);
        }
        file.writers.push(edge.source);
    }

    for (const edge of view.edges) {
        if (!isArtifact(edge.target) || !reads.has(relationOf(edge))) continue;
        files.get(edge.target)?.readers.push(edge.source);
    }

    return order.map((id) => files.get(id)!);
};

export const changedArtifacts = (view: AgentView, source?: string): readonly string[] =>
    changedFiles(view)
        .filter((file) => source === undefined || file.writers.includes(source))
        .map((file) => file.id);

export const delegationContributions = (view: AgentView, actionID: string): readonly string[] =>
    [...walk(view, actionID, 'out', ['delegates']).answerIds];

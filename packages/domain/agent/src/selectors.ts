import {
    createTraceSelectors,
    groupEdgesByTarget,
    walk,
    type Trace,
} from '@spacegraphjs/shared/domain';
import { AGENT_RELATIONS, dataString, roleOf, type AgentView } from './vocabulary';

export type AgentTrace = Trace;

const TRACE_KINDS: Readonly<Record<string, readonly string[]>> = {
    why: ['writes', 'delegates', 'contains'],
    'led-here': ['orders'],
    downstream: ['orders', 'writes', 'delegates'],
    upstream: ['contains', 'orders'],
    related: ['contains', 'writes', 'delegates', 'orders'],
};

export const { why, ledHere, downstream, upstream, related } =
    createTraceSelectors<AgentView>(TRACE_KINDS);

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

export type FailureAttentionTone = 'none' | 'warning' | 'danger';

export type FailureAttention = {
    readonly tone: FailureAttentionTone;
    /** All findings, errors and retries alike. */
    readonly count: number;
    readonly failures: number;
    readonly retries: number;
    /** The furthest failure in turn order, with its context. */
    readonly latest: AgentFailure | undefined;
    /** Stable ids so a watcher never reports the same failure twice. */
    readonly ids: readonly string[];
};

/**
 * One failure digest derived from the view, so the map, log and status bar report the same numbers.
 * Hosts choose which roles count as a failure and as a retry; a failed status is an extra signal.
 */
export const failureAttention = (
    view: AgentView,
    options: {
        readonly failureRoles?: readonly string[];
        readonly retryRoles?: readonly string[];
        readonly includeFailedStatus?: boolean;
    } = {},
): FailureAttention => {
    const retryRoles = options.retryRoles ?? ['retry'];
    const found = failureDetails(view, {
        roles: [...(options.failureRoles ?? ['failure']), ...retryRoles],
        includeFailedStatus: options.includeFailedStatus,
    });
    const roles = new Map(view.nodes.map((node) => [node.id, roleOf(node)]));
    let failureCount = 0;
    let retryCount = 0;
    for (const item of found) {
        if (retryRoles.includes(roles.get(item.id) ?? '')) retryCount++;
        else failureCount++;
    }
    const latest = [...found].sort((a, b) => a.turnNumber - b.turnNumber).at(-1);
    return {
        tone: failureCount > 0 ? 'danger' : retryCount > 0 ? 'warning' : 'none',
        count: found.length,
        failures: failureCount,
        retries: retryCount,
        latest,
        ids: found.map((item) => item.id),
    };
};

export type AgentChangedFile = {
    readonly id: string;
    readonly path: string;
    readonly writers: readonly string[];
    readonly readers: readonly string[];
};

/** Changed artifacts carry first-write order, their writers and their readers. */
export const changedFiles = (view: AgentView): readonly AgentChangedFile[] =>
    groupEdgesByTarget(view.nodes, view.edges, {
        isTarget: (node) => roleOf(node) === 'artifact',
        writes: AGENT_RELATIONS.write,
        reads: AGENT_RELATIONS.read,
    });

export const changedArtifacts = (view: AgentView, source?: string): readonly string[] =>
    changedFiles(view)
        .filter((file) => source === undefined || file.writers.includes(source))
        .map((file) => file.id);

export const delegationContributions = (view: AgentView, actionID: string): readonly string[] =>
    [...walk(view, actionID, 'out', ['delegates']).answerIds];

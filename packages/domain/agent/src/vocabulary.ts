import { defineDomain, type DomainVocabulary, type Kernel } from '@spacegraphjs/kernel';
import type { GraphNode, GraphViewData } from '@spacegraphjs/shared';

export const AGENT_KINDS = ['run', 'unit', 'message', 'action', 'artifact', 'state', 'retry'] as const;
export type AgentKind = (typeof AGENT_KINDS)[number];

export const EDGE_KINDS = ['contains', 'orders', 'writes', 'delegates', 'retry'] as const;
export type AgentEdgeKind = (typeof EDGE_KINDS)[number];

export const AGENT_ROLES = ['run', 'unit', 'message', 'action', 'failure', 'retry', 'delegation', 'artifact', 'state'] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export const ROLE_TAGS: Readonly<Record<string, AgentRole>> = {
    run: 'run',
    unit: 'unit',
    message: 'message',
    action: 'action',
    failure: 'failure',
    retry: 'retry',
    delegation: 'delegation',
    artifact: 'artifact',
    state: 'state',
};

/** Agent relations are conventions over ordinary edges; hosts may tag their own with `data.relation`. */
export const AGENT_RELATIONS = {
    parent: 'contains',
    order: 'orders',
    write: ['writes', 'produces'],
    read: ['reads', 'searches', 'references'],
    delegate: 'delegates',
    retry: 'retry',
} as const;

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

export const dataString = (
    node: { readonly data?: Readonly<Record<string, unknown>> },
    key: string,
): string | undefined => text(node.data?.[key]);

/** A node's advisory role: host tag first, then the default kind mapping, then its open-ended kind. */
export const roleOf = (node: {
    readonly kind: string;
    readonly data?: Readonly<Record<string, unknown>>;
}): string => dataString(node, 'role') ?? ROLE_TAGS[node.kind] ?? node.kind;

/** An edge's advisory relation: host tag first, then its open-ended kind. */
export const relationOf = (edge: {
    readonly kind: string;
    readonly data?: Readonly<Record<string, unknown>>;
}): string => dataString(edge, 'relation') ?? edge.kind;

export interface AgentView extends GraphViewData {
    readonly root: string;
    readonly turnByMessageID?: ReadonlyMap<string, string>;
    readonly activeTurn?: string;
}

export const agentVocabulary: DomainVocabulary = {
    lanes: ['run', 'unit', 'message', 'action'],
    levels: ['overview', 'execution', 'detail'],
    laneOf: (node) => dataString(node, 'lane') ?? (roleOf(node) === 'run' ? 'run' : undefined),
    scopeIdOf: (node) => dataString(node, 'unitId') ?? dataString(node, 'runId'),
    shapeOf: (node) => roleOf(node),
    statusOf: (node) => node.status ?? dataString(node, 'status'),
    edgesVisibleAt: (edge, level) => level !== 'overview' || edge.kind !== 'orders',
};

export function buildAgentView(kernel: Kernel): AgentView {
    const nodes: GraphNode[] = kernel.nodes.map((node) => ({
        id: node.id,
        kind: node.kind,
        label: node.label,
        summary: dataString(node, 'summary'),
        status:
            dataString(node, 'status') ??
            (node.data?.isError === true ? 'failed' : 'complete'),
        data: { ...node.data },
    }));
    const edges = kernel.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        kind: edge.kind,
        confidence: edge.data?.confidence === 'structural' ? ('structural' as const) : ('explicit' as const),
        data: { ...edge.data },
    }));
    const root = kernel.nodes.find((node) => roleOf(node) === 'run')?.id ?? kernel.nodes[0]?.id ?? '';
    const activeTurn = [...kernel.nodes]
        .reverse()
        .find((node) => roleOf(node) === 'unit' && dataString(node, 'status') === 'active')?.id;

    return {
        root,
        nodes,
        edges,
        turns: kernel.nodes.filter((node) => roleOf(node) === 'unit').map((node) => node.id),
        turnByMessageID: new Map<string, string>(),
        activeTurn,
    };
}

export const agentDomain = defineDomain<AgentView>({
    id: 'agent',
    manifest: () => [
        { id: 'agent.kind', values: [...AGENT_KINDS], source: '@spacegraphjs/agent' },
        { id: 'agent.edge', values: [...EDGE_KINDS], source: '@spacegraphjs/agent' },
    ],
    build: buildAgentView,
    vocabulary: agentVocabulary,
});

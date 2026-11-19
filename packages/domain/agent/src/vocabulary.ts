import { defineDomain, type DomainVocabulary, type Kernel } from '@spacegraphjs/kernel';
import type { GraphNode, GraphViewData } from '@spacegraphjs/shared';

export const AGENT_KINDS = ['run', 'unit', 'message', 'action', 'artifact', 'state', 'retry'] as const;
export type AgentKind = (typeof AGENT_KINDS)[number];

export const EDGE_KINDS = ['contains', 'orders', 'writes', 'delegates', 'retry'] as const;
export type AgentEdgeKind = (typeof EDGE_KINDS)[number];

export const ROLE_TAGS: Readonly<Record<string, string>> = {
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

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

export const dataString = (
    node: { readonly data?: Readonly<Record<string, unknown>> },
    key: string,
): string | undefined => text(node.data?.[key]);

export interface AgentView extends GraphViewData {
    readonly root: string;
    readonly turnByMessageID?: ReadonlyMap<string, string>;
    readonly activeTurn?: string;
}

export const agentVocabulary: DomainVocabulary = {
    lanes: ['run', 'unit', 'message', 'action'],
    levels: ['overview', 'execution', 'detail'],
    laneOf: (node) => dataString(node, 'lane') ?? (node.kind === 'run' ? 'run' : undefined),
    scopeIdOf: (node) => dataString(node, 'unitId') ?? dataString(node, 'runId'),
    shapeOf: (node) => ROLE_TAGS[node.kind] ?? node.kind,
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
    const root = kernel.nodes.find((node) => node.kind === 'run')?.id ?? kernel.nodes[0]?.id ?? '';
    const activeTurn = [...kernel.nodes].reverse().find((node) => node.kind === 'unit' && dataString(node, 'status') === 'active')?.id;

    return {
        root,
        nodes,
        edges,
        turns: kernel.nodes.filter((node) => node.kind === 'unit').map((node) => node.id),
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

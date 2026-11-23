import type { NodeStatus, RenderEdge, RenderNode } from '@spacegraphjs/renderer';
import { ModelAdapter } from './ModelAdapter';
import type { AdapterConfig, AdapterEdge, AdapterModel, AdapterNode } from './types';

/** Host vocabulary for the common adapter mapping: which roles make cards, which kinds are chrome. */
export interface VocabularyAdapterConfig<Node extends AdapterNode, Level extends string> {
    readonly cardRoles: readonly string[];
    readonly structuralKinds: readonly string[];
    readonly roleOf: (node: Node) => string;
    /** Extends or overrides the status word mapping, including pending/warning/neutral states. */
    readonly statusMap?: Readonly<Record<string, NodeStatus>>;
    readonly extraNodeData?: (node: Node, level: Level) => Record<string, unknown>;
    readonly extraEdgeData?: (edge: AdapterEdge, level: Level) => Partial<RenderEdge>;
}

const DEFAULT_STATUS_MAP: Readonly<Record<string, NodeStatus>> = {
    failed: 'error',
    active: 'running',
};

/** A ModelAdapter driven by config instead of five repeated host methods. */
export class VocabularyAdapter<
    Node extends AdapterNode = AdapterNode,
    Edge extends AdapterEdge = AdapterEdge,
    Level extends string = string,
    Domain extends AdapterModel<Node, Edge> = AdapterModel<Node, Edge>,
> extends ModelAdapter<Node, Edge, Level, Domain> {
    readonly #vocabulary: VocabularyAdapterConfig<Node, Level>;

    constructor(
        vocabulary: VocabularyAdapterConfig<Node, Level>,
        config: AdapterConfig<Node, Edge, Level, Domain> = {},
    ) {
        super(config);
        this.#vocabulary = vocabulary;
    }

    nodeShape(node: Node): RenderNode['shape'] {
        return this.#vocabulary.cardRoles.includes(this.#vocabulary.roleOf(node))
            ? 'card'
            : 'panel';
    }

    nodeStatus(node: Node): NodeStatus {
        return (
            this.#vocabulary.statusMap?.[node.status] ??
            DEFAULT_STATUS_MAP[node.status] ??
            'success'
        );
    }

    isStructuralKind(kind: Node['kind']): boolean {
        return this.#vocabulary.structuralKinds.includes(kind);
    }

    nodeData(node: Node, level: Level, dimmed: boolean): Record<string, unknown> {
        return {
            level,
            dimmed,
            kind: node.kind,
            role: this.#vocabulary.roleOf(node),
            ...this.#vocabulary.extraNodeData?.(node, level),
        };
    }

    toRenderEdge(edge: Edge, level: Level): RenderEdge {
        return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
            visible: true,
            ...this.#vocabulary.extraEdgeData?.(edge, level),
        };
    }
}

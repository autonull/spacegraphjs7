import type { NodeSpec, EdgeSpec, GraphSpec, GraphExport } from '../types';
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import { createLogger } from '../utils/logger';

const logger = createLogger('Graph');

type GraphEventMap = {
    'node:added': { node: Node; timestamp: number };
    'node:removed': { id: string; timestamp: number };
    'edge:added': { edge: Edge; timestamp: number };
    'edge:removed': { id: string; timestamp: number };
};

type GraphEventHandler<T extends keyof GraphEventMap> = (event: GraphEventMap[T]) => void;

type NodeConstructor = new (spec: NodeSpec) => Node;
type EdgeConstructor = new (spec: EdgeSpec, source: Node, target: Node) => Edge;

export class Graph {
    public nodes: Map<string, Node> = new Map();
    public edges: Map<string, Edge> = new Map();

    private readonly eventHandlers = new Map<keyof GraphEventMap, Set<GraphEventHandler<any>>>();
    private nodeTypes: Map<string, NodeConstructor> = new Map();
    private edgeTypes: Map<string, EdgeConstructor> = new Map();

    constructor() {}

    registerNodeType(type: string, ctor: NodeConstructor): void {
        this.nodeTypes.set(type, ctor);
    }

    registerEdgeType(type: string, ctor: EdgeConstructor): void {
        this.edgeTypes.set(type, ctor);
    }

    on<T extends keyof GraphEventMap>(
        event: T,
        handler: GraphEventHandler<T>,
    ): { dispose(): void } {
        const handlers = this.eventHandlers.get(event) ?? new Set();
        if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, handlers);
        handlers.add(handler);
        return { dispose: () => handlers.delete(handler) };
    }

    private emit<T extends keyof GraphEventMap>(
        event: T,
        data: Omit<GraphEventMap[T], 'timestamp'>,
    ): void {
        this.eventHandlers.get(event)?.forEach((handler) => {
            try {
                handler({ ...data, timestamp: Date.now() } as GraphEventMap[T]);
            } catch (err) {
                logger.error('Graph event handler for %s failed:', event, err);
            }
        });
    }

    private safeClone(data: unknown): unknown {
        try {
            return structuredClone(data);
        } catch {
            return JSON.parse(JSON.stringify(data));
        }
    }

    addNode(specOrNode: NodeSpec | Node): Node | null {
        if (typeof (specOrNode as Node).updatePosition === 'function') {
            const node = specOrNode as Node;
            this.nodes.set(node.id, node);
            this.emit('node:added', { node });
            return node;
        }

        const spec = specOrNode as NodeSpec;
        if (this.nodes.has(spec.id)) return this.updateNode(spec.id, spec);

        const NodeType = this.nodeTypes.get(spec.type);
        if (!NodeType) {
            logger.warn('Node type "%s" not registered.', spec.type);
            return null;
        }

        const node = new NodeType(spec);
        this.nodes.set(spec.id, node);
        this.emit('node:added', { node });
        return node;
    }

    updateNode(id: string, updates: Partial<NodeSpec>): Node | null {
        const node = this.nodes.get(id);
        if (!node) return null;

        if (typeof node.updateSpec === 'function') {
            node.updateSpec(updates);
        } else {
            if (updates.data) node.data = { ...node.data, ...updates.data };
            if (updates.position) {
                const [x, y, z] = updates.position;
                node.updatePosition(x, y, z);
            }
        }

        return node;
    }

    addEdge(specOrEdge: EdgeSpec | Edge): Edge | null {
        if (
            'source' in specOrEdge &&
            specOrEdge.source instanceof Object &&
            'position' in specOrEdge.source
        ) {
            const edge = specOrEdge as Edge;
            this.edges.set(edge.id, edge);
            this.emit('edge:added', { edge });
            return edge;
        }

        const spec = specOrEdge as EdgeSpec;
        if (!spec?.id || typeof spec.source !== 'string' || typeof spec.target !== 'string') {
            logger.warn('Edge missing critical topology attributes (id/source/target).');
            return null;
        }

        if (this.edges.has(spec.id)) return this.updateEdge(spec.id, spec);

        const sourceNode = this.nodes.get(spec.source);
        const targetNode = this.nodes.get(spec.target);

        if (!sourceNode || !targetNode) {
            logger.warn('Edge "%s" rejected: missing source or target node.', spec.id);
            return null;
        }

        const EdgeType = this.edgeTypes.get(spec.type ?? 'Edge');
        if (!EdgeType) {
            logger.warn('Edge type "%s" not registered.', spec.type);
            return null;
        }

        const edge = new EdgeType(spec, sourceNode, targetNode);
        this.edges.set(spec.id, edge);
        this.emit('edge:added', { edge });
        return edge;
    }

    updateEdge(id: string, updates: Partial<EdgeSpec>): Edge | null {
        const edge = this.edges.get(id);
        if (!edge) return null;

        if (typeof edge.updateSpec === 'function') {
            edge.updateSpec(updates);
        } else if (updates.data) {
            edge.data = { ...edge.data, ...updates.data };
        }

        if (updates.source || updates.target) {
            const sourceNode = this.nodes.get(updates.source ?? edge.source.id);
            const targetNode = this.nodes.get(updates.target ?? edge.target.id);
            if (sourceNode && targetNode) {
                edge.source = sourceNode;
                edge.target = targetNode;
                edge.update();
            }
        }

        return edge;
    }

    removeNode(id: string): void {
        const node = this.nodes.get(id);
        if (!node) return;

        this.nodes.delete(id);
        this.emit('node:removed', { id });

        for (const [edgeId, edge] of this.edges) {
            if (edge.source.id === id || edge.target.id === id) {
                this.emit('edge:removed', { id: edgeId });
                edge.dispose?.();
                this.edges.delete(edgeId);
            }
        }

        node.dispose?.();
    }

    removeEdge(id: string): void {
        const edge = this.edges.get(id);
        if (!edge) return;

        this.edges.delete(id);
        this.emit('edge:removed', { id });
        edge.dispose?.();
    }

    clear(): void {
        for (const edge of this.edges.values()) {
            edge.dispose?.();
        }
        for (const node of this.nodes.values()) {
            node.dispose?.();
        }
        this.edges.clear();
        this.nodes.clear();
    }

    getNodes(): IterableIterator<Node> {
        return this.nodes.values();
    }

    getEdges(): IterableIterator<Edge> {
        return this.edges.values();
    }

    getNode(id: string): Node | undefined {
        return this.nodes.get(id);
    }

    getEdge(id: string): Edge | undefined {
        return this.edges.get(id);
    }

    hasNode(id: string): boolean {
        return this.nodes.has(id);
    }

    hasEdge(id: string): boolean {
        return this.edges.has(id);
    }

    getNodeCount(): number {
        return this.nodes.size;
    }

    getEdgeCount(): number {
        return this.edges.size;
    }

    query(predicate: (node: Node) => boolean): Node[] {
        return [...this.nodes.values()].filter(predicate);
    }

    neighbors(nodeId: string): Node[] {
        const neighborSet = new Set<Node>();
        for (const edge of this.edges.values()) {
            if (edge.source.id === nodeId) neighborSet.add(edge.target);
            else if (edge.target.id === nodeId) neighborSet.add(edge.source);
        }
        return [...neighborSet];
    }

    getConnectedEdges(nodeId: string): Edge[] {
        return [...this.edges.values()].filter(
            ({ source, target }) => source.id === nodeId || target.id === nodeId,
        );
    }

    getIncomingEdges(nodeId: string): Edge[] {
        return [...this.edges.values()].filter(({ target }) => target.id === nodeId);
    }

    getOutgoingEdges(nodeId: string): Edge[] {
        return [...this.edges.values()].filter(({ source }) => source.id === nodeId);
    }

    toJSON(): GraphSpec {
        return {
            nodes: [...this.nodes.values()].map(({ id, type, label, position, data }) => ({
                id,
                type,
                label,
                position: [position.x, position.y, position.z] as [number, number, number],
                data: data ? this.safeClone(data) : {},
            })),
            edges: [...this.edges.values()].map(({ id, source, target, type, data }) => ({
                id,
                source: source.id,
                target: target.id,
                type: type ?? 'Edge',
                data: data ? this.safeClone(data) : {},
            })),
        };
    }

    export(): GraphExport {
        return this.toJSON();
    }

    fromJSON(spec: GraphSpec): void {
        this.clear();
        spec.nodes?.forEach((nodeSpec) => this.addNode(nodeSpec));
        spec.edges?.forEach((edgeSpec) => this.addEdge(edgeSpec));
    }
}

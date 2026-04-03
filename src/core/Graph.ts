import { SpaceGraph } from '../SpaceGraph';
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

export class Graph {
    public sg: SpaceGraph;
    public nodes: Map<string, Node> = new Map();
    public edges: Map<string, Edge> = new Map();

    private readonly eventHandlers = new Map<keyof GraphEventMap, Set<GraphEventHandler<any>>>();

    constructor(sg: SpaceGraph) {
        this.sg = sg;
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

    private _notifyPlugins(hookName: string, arg: unknown): void {
        for (const plugin of this.sg.pluginManager.plugins.values()) {
            const hook = (plugin as unknown as Record<string, unknown>)[hookName];
            if (typeof hook === 'function') {
                try {
                    hook(arg);
                } catch (err) {
                    logger.error('Plugin %s failed %s:', plugin.constructor.name, hookName, err);
                }
            }
        }
    }

    private _removeFromScene(obj: Node | Edge | null): void {
        if (obj?.object?.parent) {
            this.sg.renderer.scene.remove(obj.object);
        }
    }

    addNode(spec: NodeSpec): Node | null {
        if (this.nodes.has(spec.id)) return this.updateNode(spec.id, spec);

        const NodeType = this.sg.pluginManager.getNodeType(spec.type);
        if (!NodeType) {
            logger.warn('Node type "%s" not registered.', spec.type);
            return null;
        }

        const node = new NodeType(this.sg, spec) as Node;
        this.nodes.set(spec.id, node);
        this.sg.renderer.scene.add(node.object);
        this.sg.events.emit('node:added', { node });
        this.emit('node:added', { node });
        this._notifyPlugins('onNodeAdded', node);
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

    private findNodeAcrossInstances(nodeId: string): Node | null {
        for (const inst of SpaceGraph.instances) {
            if (inst.graph.nodes.has(nodeId)) {
                return inst.graph.nodes.get(nodeId) ?? null;
            }
        }
        return null;
    }

    addEdge(spec: EdgeSpec): Edge | null {
        if (!spec?.id || typeof spec.source !== 'string' || typeof spec.target !== 'string') {
            logger.warn('Edge missing critical topology attributes (id/source/target).');
            return null;
        }

        if (this.edges.has(spec.id)) return this.updateEdge(spec.id, spec);

        const sourceNode = this.nodes.get(spec.source) ?? this.findNodeAcrossInstances(spec.source);
        const targetNode = this.nodes.get(spec.target) ?? this.findNodeAcrossInstances(spec.target);

        if (!sourceNode || !targetNode) {
            logger.warn('Edge "%s" rejected: missing source or target node.', spec.id);
            return null;
        }

        let EdgeType = this.sg.pluginManager.getEdgeType(spec.type);
        if (!EdgeType) {
            logger.warn('Edge type "%s" not registered.', spec.type);
            return null;
        }

        const isInterGraph = sourceNode.sg !== targetNode.sg;
        if (isInterGraph) {
            EdgeType = this.sg.pluginManager.getEdgeType('InterGraphEdge') ?? EdgeType;
            if (!this.sg.pluginManager.getEdgeType('InterGraphEdge')) {
                logger.warn('InterGraphEdge not registered. Falling back to default edge.');
            }
        }

        const edge = new EdgeType(this.sg, spec, sourceNode, targetNode) as Edge;
        if (isInterGraph) {
            (edge as Edge & { isInterGraphEdge: boolean }).isInterGraphEdge = true;
        } else {
            this.sg.renderer.scene.add(edge.object);
        }

        this.edges.set(spec.id, edge);
        this.sg.events.emit('edge:added', { edge });
        this.emit('edge:added', { edge });
        this._notifyPlugins('onEdgeAdded', edge);
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

        this._removeFromScene(node);
        this.nodes.delete(id);
        this.sg.events.emit('node:removed', { id });
        this.emit('node:removed', { id });
        this._notifyPlugins('onNodeRemoved', id);

        for (const [edgeId, edge] of this.edges) {
            if (edge.source.id === id || edge.target.id === id) {
                this._removeFromScene(edge);
                this.sg.events.emit('edge:removed', { id: edgeId });
                this.emit('edge:removed', { id: edgeId });
                this._notifyPlugins('onEdgeRemoved', edgeId);
                edge.dispose?.();
                this.edges.delete(edgeId);
            }
        }

        node.dispose?.();
    }

    removeEdge(id: string): void {
        const edge = this.edges.get(id);
        if (!edge) return;

        this._removeFromScene(edge);
        this.edges.delete(id);
        this.sg.events.emit('edge:removed', { id });
        this.emit('edge:removed', { id });
        this._notifyPlugins('onEdgeRemoved', id);
        edge.dispose?.();
    }

    clear(): void {
        for (const edge of this.edges.values()) {
            this._removeFromScene(edge);
            edge.dispose?.();
        }
        for (const node of this.nodes.values()) {
            this._removeFromScene(node);
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
        return [...this.edges.values()]
            .filter(({ source, target }) => source.id === nodeId || target.id === nodeId)
            .map(({ source, target }) => (source.id === nodeId ? target : source));
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

    public toJSON(): GraphSpec {
        return {
            nodes: [...this.nodes.values()].map(({ id, type, label, position, data }) => ({
                id,
                type,
                label,
                position: [position.x, position.y, position.z] as [number, number, number],
                data: data ? structuredClone(data) : {},
            })),
            edges: [...this.edges.values()].map(({ id, source, target, type, data }) => ({
                id,
                source: source.id,
                target: target.id,
                type: type ?? 'Edge',
                data: data ? structuredClone(data) : {},
            })),
        };
    }

    public fromJSON(spec: GraphSpec): void {
        this.clear();
        spec.nodes?.forEach((nodeSpec) => this.addNode(nodeSpec));
        spec.edges?.forEach((edgeSpec) => this.addEdge(edgeSpec));
    }

    public render(): void {
        this.sg.render();
    }

    export(): GraphExport {
        return {
            nodes: [...this.nodes.values()].map(({ id, type, label, position, data }) => ({
                id,
                type,
                label,
                position: [position.x, position.y, position.z] as [number, number, number],
                data: data ? structuredClone(data) : {},
            })),
            edges: [...this.edges.values()].map(({ id, source, target, type, data }) => ({
                id,
                source: source.id,
                target: target.id,
                type: type ?? 'Edge',
                data: data ? structuredClone(data) : {},
            })),
        };
    }
}

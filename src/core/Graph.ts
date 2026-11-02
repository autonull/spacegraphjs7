import { Vector3 } from 'three';
import type { Edge } from '../edges/Edge';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec, GraphSpec, NodeData, NodeSpec } from '../types';
import { createLogger } from '../utils/logger';
import { safeClone } from '../utils/math';
import { EventEmitter } from './EventEmitter';
import { TypeRegistry } from './TypeRegistry';
import { GraphQuery } from './GraphQuery';
import { GraphAlgorithms } from './GraphAlgorithms';
import { GraphSerialization } from './GraphSerialization';

const logger = createLogger('Graph');

type GraphEventMap = {
    'node:added': { node: Node; timestamp: number };
    'node:removed': { id: string; timestamp: number };
    'node:updated': { node: Node; changes: Partial<NodeSpec>; timestamp: number };
    'edge:added': { edge: Edge; timestamp: number };
    'edge:removed': { id: string; timestamp: number };
    'edge:updated': { edge: Edge; changes: Partial<EdgeSpec>; timestamp: number };
    'graph:cleared': { timestamp: number };
};

export type EdgeDirection = 'incoming' | 'outgoing' | 'both';

export class Graph extends EventEmitter<GraphEventMap> {
    readonly nodes: Map<string, Node> = new Map();
    readonly edges: Map<string, Edge> = new Map();

    /** Direct access to query engine for advanced queries */
    readonly queryEngine: GraphQuery;
    /** Direct access to algorithms for advanced graph algorithms */
    readonly algo: GraphAlgorithms;
    /** Direct access to serialization for advanced import/export */
    readonly ser: GraphSerialization;

    constructor(readonly sg?: SpaceGraph) {
        super();
        this.queryEngine = new GraphQuery(this.nodes, this.edges);
        this.algo = new GraphAlgorithms(this.nodes, this.edges);
        this.ser = new GraphSerialization(this.nodes, this.edges);
    }

    get nodeCount(): number {
        return this.nodes.size;
    }
    get edgeCount(): number {
        return this.edges.size;
    }
    get isEmpty(): boolean {
        return this.nodes.size === 0;
    }
    get isConnected(): boolean {
        return this.nodes.size === 0 || this.algo.getConnectedComponentCount() === 1;
    }

    addNode(spec: NodeSpec | Node): Node | null {
        if ('updatePosition' in spec) return this._addNode(spec.id, spec);
        if (this.nodes.has(spec.id)) return this.updateNode(spec.id, spec);
        const NodeType = TypeRegistry.getInstance().getNodeConstructor(spec.type);
        if (!NodeType) {
            logger.warn('Node type "%s" not registered.', spec.type);
            return null;
        }
        return this._addNode(spec.id, new NodeType(this.sg, spec));
    }

    addEdge(spec: EdgeSpec | Edge): Edge | null {
        if (
            'source' in spec &&
            spec.source &&
            typeof spec.source === 'object' &&
            'position' in spec.source
        ) {
            return this._addEdge((spec as Edge).id, spec as Edge);
        }
        const edgeSpec = spec as EdgeSpec;
        if (
            !edgeSpec?.id ||
            typeof edgeSpec.source !== 'string' ||
            typeof edgeSpec.target !== 'string'
        ) {
            logger.warn('Edge missing critical topology attributes (id/source/target).');
            return null;
        }
        if (this.edges.has(edgeSpec.id)) return this.updateEdge(edgeSpec.id, edgeSpec);
        const source = this.nodes.get(edgeSpec.source);
        const target = this.nodes.get(edgeSpec.target);
        if (!source || !target) {
            logger.warn('Edge "%s" rejected: missing source or target node.', edgeSpec.id);
            return null;
        }
        const EdgeType = TypeRegistry.getInstance().getEdgeConstructor(edgeSpec.type ?? 'Edge');
        if (!EdgeType) {
            logger.warn('Edge type "%s" not registered.', edgeSpec.type ?? 'Edge');
            return null;
        }
        return this._addEdge(edgeSpec.id, new EdgeType(this.sg, edgeSpec, source, target));
    }

    updateNode(id: string, updates: Partial<NodeSpec>): Node | null {
        const node = this.nodes.get(id);
        if (!node) return null;
        node.updateSpec?.(updates) ??
            Object.assign(node, { data: { ...node.data, ...updates.data } });
        this.emitWithTimestamp('node:updated', { node, changes: updates });
        return node;
    }

    updateEdge(id: string, updates: Partial<EdgeSpec>): Edge | null {
        const edge = this.edges.get(id);
        if (!edge) return null;
        if (typeof edge.updateSpec === 'function') edge.updateSpec(updates);
        else if (updates.data) edge.data = { ...edge.data, ...updates.data };
        if (updates.source || updates.target) {
            const source = this.nodes.get(updates.source ?? edge.source.id);
            const target = this.nodes.get(updates.target ?? edge.target.id);
            if (source && target) {
                edge.source = source;
                edge.target = target;
                edge.update();
            }
        }
        return edge;
    }

    removeNode(id: string): void {
        const node = this.nodes.get(id);
        if (!node) return;
        this.sg?.renderer.scene.remove(node.object);
        this.nodes.delete(id);
        this.emitWithTimestamp('node:removed', { id });
        for (const [edgeId, edge] of this.edges) {
            if (edge.source.id === id || edge.target.id === id) {
                this.emitWithTimestamp('edge:removed', { id: edgeId });
                edge.dispose?.();
                this.edges.delete(edgeId);
            }
        }
        this.algo.invalidateLinkIndex();
        node.dispose?.();
    }

    removeEdge(id: string): void {
        const edge = this.edges.get(id);
        if (!edge) return;
        this.sg?.renderer.scene.remove(edge.line);
        this.edges.delete(id);
        this.algo.invalidateLinkIndex();
        this.emitWithTimestamp('edge:removed', { id });
        edge.dispose?.();
    }

    clear(): void {
        this.edges.forEach((edge) => edge.dispose?.());
        this.nodes.forEach((node) => node.dispose?.());
        this.edges.clear();
        this.nodes.clear();
        this.algo.invalidateLinkIndex();
        this.emitWithTimestamp('graph:cleared', {});
    }

    setPositions(positions: Record<string, [number, number, number]>): void {
        for (const [id, position] of Object.entries(positions)) {
            const node = this.nodes.get(id);
            if (node) node.updatePosition(position[0], position[1], position[2]);
        }
        for (const edge of this.edges.values()) edge.update?.();
        this.requestFrame();
    }

    pinAll(pinned = true): void {
        for (const node of this.nodes.values()) node.setPinned(pinned);
        this.requestFrame();
    }

    /** Request a render frame from the SpaceGraph instance if available. */
    requestFrame(): void {
        this.sg?.requestFrame?.();
    }

    nodeArray(): Node[] {
        return [...this.nodes.values()];
    }
    edgeArray(): Edge[] {
        return [...this.edges.values()];
    }

    // ---- Backward-compatible delegation methods ----
    getNode(id: string): Node | undefined {
        return this.queryEngine.getNode(id);
    }
    getEdge(id: string): Edge | undefined {
        return this.queryEngine.getEdge(id);
    }
    hasNode(id: string): boolean {
        return this.queryEngine.hasNode(id);
    }
    hasEdge(id: string): boolean {
        return this.queryEngine.hasEdge(id);
    }
    getNodes(): IterableIterator<Node> {
        return this.queryEngine.getNodes();
    }
    getEdges(): IterableIterator<Edge> {
        return this.queryEngine.getEdges();
    }
    query(predicate: (node: Node) => boolean): Node[] {
        return this.queryEngine.query(predicate);
    }
    queryByType(type: string): Node[] {
        return this.queryEngine.queryByType(type);
    }
    getNodesByData(predicate: (data: NodeData) => boolean): Node[] {
        return this.queryEngine.getNodesByData(predicate);
    }
    findNode(predicate: (node: Node) => boolean): Node | undefined {
        return this.queryEngine.findNode(predicate);
    }
    findEdge(predicate: (edge: Edge) => boolean): Edge | undefined {
        return this.queryEngine.findEdge(predicate);
    }
    getNeighbors(nodeId: string, direction: EdgeDirection = 'both'): Node[] {
        return this.queryEngine.getNeighbors(nodeId, direction);
    }
    getEdgesForNode(nodeId: string, direction: EdgeDirection = 'both'): Edge[] {
        return this.queryEngine.getEdgesForNode(nodeId, direction);
    }
    neighbors(nodeId: string): Node[] {
        return this.queryEngine.neighbors(nodeId);
    }
    getIncomingEdges(nodeId: string): Edge[] {
        return this.queryEngine.getIncomingEdges(nodeId);
    }
    getOutgoingEdges(nodeId: string): Edge[] {
        return this.queryEngine.getOutgoingEdges(nodeId);
    }
    hasNeighbor(nodeId: string, targetId: string, direction: EdgeDirection = 'both'): boolean {
        return this.queryEngine.hasNeighbor(nodeId, targetId, direction);
    }
    getNodesNear(position: Vector3, radius: number): Node[] {
        return this.queryEngine.getNodesNear(position, radius);
    }
    mapNodes<T>(predicate: (node: Node) => T): T[] {
        return this.queryEngine.mapNodes(predicate);
    }
    forEachNode(callback: (node: Node) => void): void {
        this.queryEngine.forEachNode(callback);
    }
    forEachEdge(callback: (edge: Edge) => void): void {
        this.queryEngine.forEachEdge(callback);
    }
    groupByData(key: string): Map<unknown, Node[]> {
        return this.queryEngine.groupByData(key);
    }
    getNodeDegrees(): Map<string, number> {
        return this.queryEngine.getNodeDegrees();
    }
    getNodeDegree(nodeId: string): number {
        return this.queryEngine.getNodeDegree(nodeId);
    }
    getHubs(minDegree: number): Node[] {
        return this.queryEngine.getHubs(minDegree);
    }
    getIsolatedNodes(): Node[] {
        return this.queryEngine.getIsolatedNodes();
    }
    getLeafNodes(): Node[] {
        return this.queryEngine.getLeafNodes();
    }
    getRootNodes(): Node[] {
        return this.queryEngine.getRootNodes();
    }

    getConnectedComponent(startNodeId: string): Node[] {
        return this.algo.getConnectedComponent(startNodeId);
    }
    getConnectedComponentInRadius(
        centerId: string,
        radius: number,
    ): { nodes: Node[]; edges: Edge[] } {
        return this.algo.getConnectedComponentInRadius(centerId, radius);
    }
    getConnectedComponentCount(): number {
        return this.algo.getConnectedComponentCount();
    }
    traverse(callback: (node: Node, depth: number) => void, startId?: string): void {
        this.algo.traverse(callback, startId);
    }
    bfs(callback: (node: Node, depth: number) => void, startId?: string): void {
        this.algo.bfs(callback, startId);
    }
    dfs(callback: (node: Node, depth: number) => void, startId?: string): void {
        this.algo.dfs(callback, startId);
    }
    findPath(from: string, to: string): Node[] | null {
        return this.algo.findPath(from, to);
    }
    topologicalSort(): Node[] {
        return this.algo.topologicalSort();
    }

    toJSON(): GraphSpec {
        return this.ser.toJSON();
    }
    from(spec: GraphSpec): void {
        this.clear();
        if (spec.nodes) for (const nodeSpec of spec.nodes) this.addNode(nodeSpec);
        if (spec.edges) for (const edgeSpec of spec.edges) this.addEdge(edgeSpec);
    }
    snapshot(): Map<string, { position: Vector3; data: NodeData }> {
        return this.ser.snapshot() as any;
    }
    restore(snapshot: Map<string, { position: Vector3; data: NodeData }>): void {
        this.ser.restore(snapshot as any);
    }

    getStats(): {
        nodes: number;
        edges: number;
        avgDegree: number;
        components: number;
        density: number;
    } {
        const nodeCount = this.nodes.size;
        const edgeCount = this.edges.size;
        const degrees = this.queryEngine.getNodeDegrees();
        const totalDegree = [...degrees.values()].reduce((a, b) => a + b, 0);
        const avgDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
        const density = nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1)) : 0;
        return {
            nodes: nodeCount,
            edges: edgeCount,
            avgDegree,
            components: this.algo.getConnectedComponentCount(),
            density,
        };
    }

    batchUpdate(fn: (graph: Graph) => void): void {
        fn(this);
    }
    addNodes(specs: NodeSpec[]): Node[] {
        return specs.map((s) => this.addNode(s)).filter(Boolean) as Node[];
    }
    addEdges(specs: EdgeSpec[]): Edge[] {
        return specs.map((s) => this.addEdge(s)).filter(Boolean) as Edge[];
    }
    removeNodesByType(type: string): number {
        return this.#removeNodes(this.queryEngine.queryByType(type));
    }
    removeNodesByData(predicate: (data: NodeData) => boolean): number {
        return this.#removeNodes(this.queryEngine.getNodesByData(predicate));
    }
    #removeNodes(nodes: Node[]): number {
        nodes.forEach((node) => this.removeNode(node.id));
        return nodes.length;
    }
    merge(other: Graph): void {
        for (const node of other.nodes.values())
            if (!this.nodes.has(node.id)) this.addNode({ ...node.toJSON() });
        for (const edge of other.edges.values())
            if (!this.edges.has(edge.id)) {
                const source = this.nodes.get(edge.source.id),
                    target = this.nodes.get(edge.target.id);
                if (source && target) this.addEdge({ ...(edge.toJSON() as EdgeSpec) });
            }
    }

    private _addNode(id: string, node: Node): Node {
        this.nodes.set(id, node);
        this.sg?.renderer.scene.add(node.object);
        node.start();
        this.emitWithTimestamp('node:added', { node });
        return node;
    }

    private _addEdge(id: string, edge: Edge): Edge {
        this.edges.set(id, edge);
        this.sg?.renderer.scene.add(edge.line);
        edge.start();
        this.algo.invalidateLinkIndex();
        this.emitWithTimestamp('edge:added', { edge });
        return edge;
    }
}

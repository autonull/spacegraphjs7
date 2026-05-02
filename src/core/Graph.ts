import type { NodeSpec, EdgeSpec, GraphSpec, GraphExport } from '../types';
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import type { SpaceGraph } from '../SpaceGraph';
import * as THREE from 'three';
import { createLogger } from '../utils/logger';
import { safeClone } from '../utils/math';
import { TypeRegistry } from './TypeRegistry';
import { EventEmitter } from './EventEmitter';

const logger = createLogger('Graph');

type GraphEventMap = {
    'node:added': { node: Node; timestamp: number };
    'node:removed': { id: string; timestamp: number };
    'node:updated': { node: Node; changes: Partial<NodeSpec>; timestamp: number };
    'edge:added': { edge: Edge; timestamp: number };
    'edge:removed': { id: string; timestamp: number };
    'edge:updated': { edge: Edge; changes: Partial<EdgeSpec>; timestamp: number };
};

export type EdgeDirection = 'incoming' | 'outgoing' | 'both';

export class Graph extends EventEmitter<GraphEventMap> {
    readonly nodes: Map<string, Node> = new Map();
    readonly edges: Map<string, Edge> = new Map();

    constructor(readonly sg: SpaceGraph) {
        super();
    }

    addNode(spec: NodeSpec | Node): Node | null {
        if ('updatePosition' in spec) {
            const node = spec as Node;
            return this._addNode(node.id, node);
        }

        if (this.nodes.has(spec.id)) return this.updateNode(spec.id, spec);

        const NodeType = TypeRegistry.getInstance().getNodeConstructor(spec.type);
        if (!NodeType) {
            logger.warn('Node type "%s" not registered.', spec.type);
            return null;
        }

        return this._addNode(spec.id, new NodeType(this.sg, spec));
    }

  addEdge(spec: EdgeSpec | Edge): Edge | null {
    if ('source' in spec && spec.source instanceof Object && 'position' in spec.source) {
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
            logger.warn('Edge type "%s" not registered.', edgeSpec.type);
            return null;
        }

        return this._addEdge(edgeSpec.id, new EdgeType(this.sg, edgeSpec, source, target));
    }

    updateNode(id: string, updates: Partial<NodeSpec>): Node | null {
        const node = this.nodes.get(id);
        if (!node) return null;

        if (typeof node.updateSpec === 'function') {
            node.updateSpec(updates);
        } else {
            Object.assign(node, {
                data: { ...node.data, ...updates.data },
                position: updates.position
                    ? node.updatePosition(
                          updates.position[0],
                          updates.position[1],
                          updates.position[2],
                      )
                    : undefined,
            });
        }
        return node;
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
        node.dispose?.();
    }

    removeEdge(id: string): void {
        const edge = this.edges.get(id);
        if (!edge) return;

        this.sg?.renderer.scene.remove(edge.line);
        this.edges.delete(id);
        this.emitWithTimestamp('edge:removed', { id });
        edge.dispose?.();
    }

    clear(): void {
        this.edges.forEach((edge) => edge.dispose?.());
        this.nodes.forEach((node) => node.dispose?.());
        this.edges.clear();
        this.nodes.clear();
    }

    // Node lookup shortcuts - ergonomic API
    get nodeCount(): number {
        return this.nodes.size;
    }
    get edgeCount(): number {
        return this.edges.size;
    }
get isEmpty(): boolean {
        return this.nodes.size === 0;
    }

    // Quick access to node/edge arrays (caches result)
    nodeArray(): Node[] {
        return [...this.nodes.values()];
    }
    edgeArray(): Edge[] {
        return [...this.edges.values()];
    }

    // Query methods - use iterators to avoid array creation
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
    getNodes(): IterableIterator<Node> {
        return this.nodes.values();
    }
    getEdges(): IterableIterator<Edge> {
        return this.edges.values();
    }

    // Query helpers - return arrays, use iterator versions for performance-critical code
    query(predicate: (node: Node) => boolean): Node[] {
        const result: Node[] = [];
        for (const node of this.nodes.values()) {
            if (predicate(node)) result.push(node);
        }
        return result;
    }

    queryByType(type: string): Node[] {
        const result: Node[] = [];
        for (const node of this.nodes.values()) {
            if (node.type === type) result.push(node);
        }
        return result;
    }

    queryByLabel(label: string, exact = true): Node[] {
        const result: Node[] = [];
        for (const node of this.nodes.values()) {
            if (exact ? node.label === label : node.label?.includes(label)) result.push(node);
        }
        return result;
    }

    queryByData(predicate: (data: Record<string, unknown>) => boolean): Node[] {
        const result: Node[] = [];
        for (const node of this.nodes.values()) {
            if (predicate(node.data)) result.push(node);
        }
        return result;
    }

    findNode(predicate: (node: Node) => boolean): Node | undefined {
        for (const node of this.nodes.values()) {
            if (predicate(node)) return node;
        }
        return undefined;
    }

    findEdge(predicate: (edge: Edge) => boolean): Edge | undefined {
        for (const edge of this.edges.values()) {
            if (predicate(edge)) return edge;
        }
        return undefined;
    }

    // Neighborhood queries
    getNeighbors(nodeId: string, direction: EdgeDirection = 'both'): Node[] {
        const neighbors = new Set<Node>();
        for (const edge of this.edges.values()) {
            const isSource = edge.source.id === nodeId;
            const isTarget = edge.target.id === nodeId;
            if (direction === 'both' && (isSource || isTarget)) {
                neighbors.add(isSource ? edge.target : edge.source);
            } else if (direction === 'outgoing' && isSource) {
                neighbors.add(edge.target);
            } else if (direction === 'incoming' && isTarget) {
                neighbors.add(edge.source);
            }
        }
        return [...neighbors];
    }

    getEdgesForNode(nodeId: string, direction: EdgeDirection = 'both'): Edge[] {
        const result: Edge[] = [];
        for (const edge of this.edges.values()) {
            const isSource = edge.source.id === nodeId;
            const isTarget = edge.target.id === nodeId;
            if (direction === 'both' && (isSource || isTarget)) {
                result.push(edge);
            } else if (direction === 'outgoing' && isSource) {
                result.push(edge);
            } else if (direction === 'incoming' && isTarget) {
                result.push(edge);
            }
        }
        return result;
    }

    // Convenience aliases
    neighbors(nodeId: string): Node[] {
        return this.getNeighbors(nodeId, 'both');
    }
    getConnectedEdges(nodeId: string): Edge[] {
        return this.getEdgesForNode(nodeId, 'both');
    }
    getIncomingEdges(nodeId: string): Edge[] {
        return this.getEdgesForNode(nodeId, 'incoming');
    }
    getOutgoingEdges(nodeId: string): Edge[] {
        return this.getEdgesForNode(nodeId, 'outgoing');
    }

    // Shortcuts: check existence quickly
    hasNeighbor(nodeId: string, targetId: string, direction: EdgeDirection = 'both'): boolean {
        for (const edge of this.edges.values()) {
            const isSource = edge.source.id === nodeId;
            const isTarget = edge.target.id === nodeId;
            if (direction === 'both' && (isSource || isTarget)) {
                return isSource ? edge.target.id === targetId : edge.source.id === targetId;
            } else if (direction === 'outgoing' && isSource && edge.target.id === targetId) {
                return true;
            } else if (direction === 'incoming' && isTarget && edge.source.id === targetId) {
                return true;
            }
        }
        return false;
    }

    // Get nodes by bounds lookup
    getNodesInArea(center: THREE.Vector3, radius: number): Node[] {
        const results: Node[] = [];
        for (const node of this.nodes.values()) {
            if (node.position.distanceTo(center) <= radius) results.push(node);
        }
        return results;
    }

    // Batch operations - filter nodes
    filterNodes(predicate: (node: Node) => boolean): Node[] {
        return this.query(predicate);
    }

    // Batch operations - map nodes
    mapNodes<T>(predicate: (node: Node) => T): T[] {
        const results: T[] = [];
        for (const node of this.nodes.values()) results.push(predicate(node));
        return results;
    }

    // Iteration - direct iteration without array creation
    forEachNode(callback: (node: Node) => void): void {
        for (const node of this.nodes.values()) callback(node);
    }

    forEachEdge(callback: (edge: Edge) => void): void {
        for (const edge of this.edges.values()) callback(edge);
    }

    // Ergonomic: Group nodes by data property
    groupByData(key: string): Map<unknown, Node[]> {
        const groups = new Map<unknown, Node[]>();
        for (const node of this.nodes.values()) {
            const value = (node.data as Record<string, unknown>)[key];
            if (value !== undefined) {
                const list = groups.get(value) ?? [];
                list.push(node);
                groups.set(value, list);
            }
        }
        return groups;
    }

    // Ergonomic: Get connected component
    getConnectedComponent(startNodeId: string): Node[] {
        const visited = new Set<string>();
        const queue = [startNodeId];
        const result: Node[] = [];

        while (queue.length > 0) {
            const id = queue.shift()!;
            if (visited.has(id)) continue;
            visited.add(id);

            const node = this.nodes.get(id);
            if (node) result.push(node);

            for (const neighbor of this.getNeighbors(id)) {
                if (!visited.has(neighbor.id)) queue.push(neighbor.id);
            }
        }
        return result;
    }

    // Ergonomic: Topological sort
    topologicalSort(): Node[] {
        const inDegree = new Map<string, number>();
        for (const node of this.nodes.keys()) inDegree.set(node, 0);
        for (const edge of this.edges.values()) {
            inDegree.set(edge.target.id, (inDegree.get(edge.target.id) ?? 0) + 1);
        }

        const queue: string[] = [];
        for (const [id, degree] of inDegree) if (degree === 0) queue.push(id);

        const result: Node[] = [];
        while (queue.length > 0) {
            const id = queue.shift()!;
            const node = this.nodes.get(id);
            if (node) result.push(node);

            for (const edge of this.edges.values()) {
                if (edge.source.id === id) {
                    const newDegree = (inDegree.get(edge.target.id) ?? 1) - 1;
                    inDegree.set(edge.target.id, newDegree);
                    if (newDegree === 0) queue.push(edge.target.id);
                }
            }
        }
        return result;
    }

    // Ergonomic: Get leaf nodes (nodes with no outgoing edges)
    getLeafNodes(): Node[] {
        const hasOutgoing = new Set<string>();
        for (const edge of this.edges.values()) hasOutgoing.add(edge.source.id);
        return [...this.nodes.values()].filter(n => !hasOutgoing.has(n.id));
    }

    // Ergonomic: Get root nodes (nodes with no incoming edges)
    getRootNodes(): Node[] {
        const hasIncoming = new Set<string>();
        for (const edge of this.edges.values()) hasIncoming.add(edge.target.id);
        return [...this.nodes.values()].filter(n => !hasIncoming.has(n.id));
    }

    // Ergonomic: Get nodes by type
    getNodesByType(type: string): Node[] {
        return this.queryByType(type);
    }

    // Ergonomic: Get nodes by label prefix
    getNodesByLabelPrefix(prefix: string): Node[] {
        return this.queryByLabel(prefix, false);
    }

    // Ergonomic: Get connected component count
    getConnectedComponentCount(): number {
        const visited = new Set<string>();
        let count = 0;

        for (const nodeId of this.nodes.keys()) {
            if (!visited.has(nodeId)) {
                const component = this.getConnectedComponent(nodeId);
                component.forEach(n => visited.add(n.id));
                count++;
            }
        }
        return count;
    }

    // Ergonomic: Check if graph is connected
    get isConnected(): boolean {
        if (this.nodes.size === 0) return true;
        return this.getConnectedComponentCount() === 1;
    }

    // Ergonomic: Get node degree (total connections)
    getNodeDegree(nodeId: string): number {
        return this.getEdgesForNode(nodeId).length;
    }

    // Ergonomic: Get nodes with degree >= threshold
    getHubNodes(minDegree: number): Node[] {
        const result: Node[] = [];
        for (const node of this.nodes.values()) {
            if (this.getNodeDegree(node.id) >= minDegree) result.push(node);
        }
        return result;
    }

    // Ergonomic: Batch add nodes
    addNodes(specs: NodeSpec[]): Node[] {
        const added: Node[] = [];
        for (const spec of specs) {
            const node = this.addNode(spec);
            if (node) added.push(node);
        }
        return added;
    }

    // Ergonomic: Batch add edges
    addEdges(specs: EdgeSpec[]): Edge[] {
        const added: Edge[] = [];
        for (const spec of specs) {
            const edge = this.addEdge(spec);
            if (edge) added.push(edge);
        }
        return added;
    }

    // Serialization
    toJSON(): GraphSpec {
        return {
            nodes: [...this.nodes.values()].map(({ id, type, label, position, data }) => ({
                id,
                type,
                label,
                position: [position.x, position.y, position.z] as [number, number, number],
                data: data ? safeClone(data) : {},
            })),
            edges: [...this.edges.values()].map(({ id, source, target, type, data }) => ({
                id,
                source: source.id,
                target: target.id,
                type: type ?? 'Edge',
                data: data ? safeClone(data) : {},
            })),
        };
    }

    export(): GraphExport {
        return this.toJSON() as GraphExport;
    }

    from(spec: GraphSpec): void {
        this.clear();
        if (spec.nodes) for (const nodeSpec of spec.nodes) this.addNode(nodeSpec);
        if (spec.edges) for (const edgeSpec of spec.edges) this.addEdge(edgeSpec);
    }

    fromJSON = this.from;

    // ============= Ergonomic Traversal Methods =============
    traverse(callback: (node: Node, depth: number) => void, startId?: string): void {
        const visited = new Set<string>();
        const traverseRecursive = (nodeId: string, depth: number) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);
            const node = this.nodes.get(nodeId);
            if (!node) return;
            callback(node, depth);
            for (const neighbor of this.neighbors(nodeId)) {
                traverseRecursive(neighbor.id, depth + 1);
            }
        };
        if (startId) traverseRecursive(startId, 0);
        else for (const node of this.nodes.values()) traverseRecursive(node.id, 0);
    }

    bfs(callback: (node: Node, depth: number) => void, startId?: string): void {
        const start = startId ? [this.nodes.get(startId)] : [...this.nodes.values()];
        const visited = new Set<string>();
        const queue: Array<{ node: Node; depth: number }> = [];
        for (const node of start) if (node) queue.push({ node, depth: 0 });
        while (queue.length) {
            const { node, depth } = queue.shift()!;
            if (visited.has(node.id)) continue;
            visited.add(node.id);
            callback(node, depth);
            for (const neighbor of this.neighbors(node.id)) {
                if (!visited.has(neighbor.id)) queue.push({ node: neighbor, depth: depth + 1 });
            }
        }
    }

    dfs(callback: (node: Node, depth: number) => void, startId?: string): void {
        const visited = new Set<string>();
        const stack: Array<{ node: Node; depth: number }> = [];
        const start = startId ? this.nodes.get(startId) : [...this.nodes.values()][0];
        if (start) stack.push({ node: start, depth: 0 });
        while (stack.length) {
            const { node, depth } = stack.pop()!;
            if (visited.has(node.id)) continue;
            visited.add(node.id);
            callback(node, depth);
            for (const neighbor of this.neighbors(node.id)) {
                if (!visited.has(neighbor.id)) stack.push({ node: neighbor, depth: depth + 1 });
            }
        }
    }

    getConnectedComponentInRadius(centerId: string, radius: number): { nodes: Node[]; edges: Edge[] } {
        const center = this.nodes.get(centerId);
        if (!center) return { nodes: [], edges: [] };
        const inRadius = new Set<string>();
        const centerPos = center.position;
        for (const [id, node] of this.nodes) {
            if (node.position.distanceTo(centerPos) <= radius) inRadius.add(id);
        }
        const nodes = [...inRadius].map((id) => this.nodes.get(id)!).filter(Boolean);
        const edges = [...inRadius].flatMap((id) => this.getEdgesForNode(id))
            .filter((e) => inRadius.has(e.source.id) && inRadius.has(e.target.id));
        return { nodes, edges };
    }

    findPath(from: string, to: string): Node[] | null {
        const visited = new Set<string>();
        const queue: Array<{ id: string; path: Node[] }> = [{ id: from, path: [] }];
        while (queue.length) {
            const { id, path } = queue.shift()!;
            if (visited.has(id)) continue;
            visited.add(id);
            const node = this.nodes.get(id);
            if (!node) continue;
            const newPath = [...path, node];
            if (id === to) return newPath;
            for (const neighbor of this.neighbors(id)) {
                if (!visited.has(neighbor.id)) queue.push({ id: neighbor.id, path: newPath });
            }
        }
        return null;
    }

    batchUpdate(fn: (graph: Graph) => void): void {
        fn(this);
    }

    snapshot(): Map<string, { position: THREE.Vector3; data: NodeData }> {
        const snap = new Map<string, { position: THREE.Vector3; data: NodeData }>();
        for (const [id, node] of this.nodes) {
            snap.set(id, { position: node.position.clone(), data: { ...node.data } });
        }
        return snap;
    }

    restore(snapshot: Map<string, { position: THREE.Vector3; data: NodeData }>): void {
        for (const [id, state] of snapshot) {
            const node = this.nodes.get(id);
            if (node) {
                node.position.copy(state.position);
                node.object.position.copy(state.position);
                node.data = { ...state.data };
            }
        }
    }

    getStats(): { nodes: number; edges: number; avgDegree: number; components: number; density: number } {
        const nodeCount = this.nodes.size;
        const edgeCount = this.edges.size;
        const degrees = new Map<string, number>();
        for (const edge of this.edges.values()) {
            degrees.set(edge.source.id, (degrees.get(edge.source.id) ?? 0) + 1);
            degrees.set(edge.target.id, (degrees.get(edge.target.id) ?? 0) + 1);
        }
        const totalDegree = Array.from(degrees.values()).reduce((a, b) => a + b, 0);
        const avgDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
        const maxPossibleEdges = nodeCount * (nodeCount - 1);
        const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
        const visited = new Set<string>();
        let components = 0;
        for (const nodeId of this.nodes.keys()) {
            if (!visited.has(nodeId)) {
                const component = this.getConnectedComponent(nodeId);
                component.forEach(n => visited.add(n.id));
                components++;
            }
        }
        return { nodes: nodeCount, edges: edgeCount, avgDegree, components, density };
    }

    getNodesByData(predicate: (data: NodeData) => boolean): Node[] {
        const result: Node[] = [];
        for (const node of this.nodes.values()) {
            if (predicate(node.data)) result.push(node);
        }
        return result;
    }

    getNodesNear(position: THREE.Vector3, radius: number): Node[] {
        const result: Node[] = [];
        for (const node of this.nodes.values()) {
            if (node.position.distanceTo(position) <= radius) result.push(node);
        }
        return result;
    }

    getNodeDegrees(): Map<string, number> {
        const degrees = new Map<string, number>();
        for (const edge of this.edges.values()) {
            degrees.set(edge.source.id, (degrees.get(edge.source.id) ?? 0) + 1);
            degrees.set(edge.target.id, (degrees.get(edge.target.id) ?? 0) + 1);
        }
        return degrees;
    }

    getHubs(minDegree: number): Node[] {
        const degrees = this.getNodeDegrees();
        return [...this.nodes.values()].filter(n => (degrees.get(n.id) ?? 0) >= minDegree);
    }

    getIsolatedNodes(): Node[] {
        const degrees = this.getNodeDegrees();
        return [...this.nodes.values()].filter(n => (degrees.get(n.id) ?? 0) === 0);
    }

    removeNodesByType(type: string): number {
        const toRemove = [...this.nodes.values()].filter(n => n.type === type);
        toRemove.forEach(n => this.removeNode(n.id));
        return toRemove.length;
    }

    removeNodesByData(predicate: (data: NodeData) => boolean): number {
        const toRemove = this.getNodesByData(predicate);
        toRemove.forEach(n => this.removeNode(n.id));
        return toRemove.length;
    }

    merge(other: Graph): void {
        for (const node of other.nodes.values()) {
            if (!this.nodes.has(node.id)) {
                this.addNode({ ...node.toJSON() });
            }
        }
        for (const edge of other.edges.values()) {
            if (!this.edges.has(edge.id)) {
                const source = this.nodes.get(edge.source.id);
                const target = this.nodes.get(edge.target.id);
                if (source && target) {
                    this.addEdge({ ...edge.toJSON() as EdgeSpec });
                }
            }
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
        this.emitWithTimestamp('edge:added', { edge });
        return edge;
    }
}

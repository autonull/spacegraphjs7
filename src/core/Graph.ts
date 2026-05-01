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

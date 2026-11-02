import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import type { NodeData } from '../types';
import type { EdgeDirection } from './Graph';

export class GraphQuery {
    constructor(
        private readonly nodes: Map<string, Node>,
        private readonly edges: Map<string, Edge>,
    ) {}

    // Core query methods
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

    // Unified query - supports multiple filter types
    query(predicate: (node: Node) => boolean): Node[] {
        return [...this.nodes.values()].filter(predicate);
    }

    // Query nodes by type (constructor name)
    queryByType(type: string): Node[] {
        return this.query((node) => node.constructor.name === type);
    }

    // Query nodes by data predicate
    getNodesByData(predicate: (data: NodeData) => boolean): Node[] {
        return this.query((node) => predicate(node.data));
    }

    // Find single result
    findNode(predicate: (node: Node) => boolean): Node | undefined {
        return [...this.nodes.values()].find(predicate);
    }

    findEdge(predicate: (edge: Edge) => boolean): Edge | undefined {
        return [...this.edges.values()].find(predicate);
    }

    // Neighborhood queries
    getNeighbors(nodeId: string, direction: EdgeDirection = 'both'): Node[] {
        const neighbors = new Set<Node>();
        this.forEachMatchingEdge(nodeId, direction, (edge, isSource) => {
            neighbors.add(isSource ? edge.target : edge.source);
        });
        return [...neighbors];
    }

    getEdgesForNode(nodeId: string, direction: EdgeDirection = 'both'): Edge[] {
        const result: Edge[] = [];
        this.forEachMatchingEdge(nodeId, direction, (edge) => {
            result.push(edge);
        });
        return result;
    }

    // Backward-compatible aliases
    neighbors(nodeId: string): Node[] {
        return this.getNeighbors(nodeId, 'both');
    }

    getIncomingEdges(nodeId: string): Edge[] {
        return this.getEdgesForNode(nodeId, 'incoming');
    }

    getOutgoingEdges(nodeId: string): Edge[] {
        return this.getEdgesForNode(nodeId, 'outgoing');
    }

    // Check if nodes are connected
    hasNeighbor(nodeId: string, targetId: string, direction: EdgeDirection = 'both'): boolean {
        let found = false;
        this.forEachMatchingEdge(nodeId, direction, (edge, isSource) => {
            if ((isSource ? edge.target.id : edge.source.id) === targetId) {
                found = true;
                return true;
            }
        });
        return found;
    }

    // Spatial queries
    getNodesNear(
        position: { x: number; y: number; z: number; distanceTo: (p: any) => number },
        radius: number,
    ): Node[] {
        return [...this.nodes.values()].filter(
            (node) => node.position.distanceTo(position) <= radius,
        );
    }

    mapNodes<T>(predicate: (node: Node) => T): T[] {
        return [...this.nodes.values()].map(predicate);
    }

    // Direct iteration
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

    // Node Degree Utilities
    getNodeDegrees(): Map<string, number> {
        const degrees = new Map<string, number>();
        for (const edge of this.edges.values()) {
            degrees.set(edge.source.id, (degrees.get(edge.source.id) ?? 0) + 1);
            degrees.set(edge.target.id, (degrees.get(edge.target.id) ?? 0) + 1);
        }
        return degrees;
    }

    getNodeDegree(nodeId: string): number {
        return this.getEdgesForNode(nodeId).length;
    }

    getHubs(minDegree: number): Node[] {
        const degrees = this.getNodeDegrees();
        return this.query((n) => (degrees.get(n.id) ?? 0) >= minDegree);
    }

    getIsolatedNodes(): Node[] {
        const degrees = this.getNodeDegrees();
        return this.query((n) => (degrees.get(n.id) ?? 0) === 0);
    }

    getLeafNodes(): Node[] {
        return this.#nodesWithoutEdgeOn('source');
    }

    getRootNodes(): Node[] {
        return this.#nodesWithoutEdgeOn('target');
    }

    /** The nodes with no edge on the given side. */
    #nodesWithoutEdgeOn(side: 'source' | 'target'): Node[] {
        const connected = new Set<string>();
        for (const edge of this.edges.values()) connected.add(edge[side].id);
        return [...this.nodes.values()].filter((node) => !connected.has(node.id));
    }

    /** @internal Helper for edge iteration with filtering */
    private forEachMatchingEdge(
        nodeId: string,
        direction: EdgeDirection,
        callback: (edge: Edge, isSource: boolean) => void | boolean,
    ): void {
        for (const edge of this.edges.values()) {
            const isSource = edge.source.id === nodeId;
            const isTarget = edge.target.id === nodeId;
            const matches =
                direction === 'both'
                    ? isSource || isTarget
                    : direction === 'outgoing'
                      ? isSource
                      : isTarget;

            if (matches && callback(edge, isSource) === true) break;
        }
    }
}

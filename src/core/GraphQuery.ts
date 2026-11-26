import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import type { NodeData } from '../types';
import type { EdgeDirection } from './Graph';
import { appendTo } from '../utils/collection';

export class GraphQuery {
    constructor(
        private readonly nodes: Map<string, Node>,
        private readonly edges: Map<string, Edge>,
    ) {}

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

    query(predicate: (node: Node) => boolean): Node[] {
        const result: Node[] = [];
        for (const node of this.nodes.values()) if (predicate(node)) result.push(node);
        return result;
    }

    // Query nodes by type (constructor name)
    queryByType(type: string): Node[] {
        return this.query((node) => node.constructor.name === type);
    }

    getNodesByData(predicate: (data: NodeData) => boolean): Node[] {
        return this.query((node) => predicate(node.data));
    }

    findNode(predicate: (node: Node) => boolean): Node | undefined {
        for (const node of this.nodes.values()) if (predicate(node)) return node;
        return undefined;
    }

    findEdge(predicate: (edge: Edge) => boolean): Edge | undefined {
        for (const edge of this.edges.values()) if (predicate(edge)) return edge;
        return undefined;
    }

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

    /** Nodes within `radius` of a plain world coordinate, using squared distance to avoid sqrt. */
    getNodesNear(position: { x: number; y: number; z: number }, radius: number): Node[] {
        const result: Node[] = [];
        const radiusSquared = radius * radius;
        for (const node of this.nodes.values()) {
            const dx = node.position.x - position.x;
            const dy = node.position.y - position.y;
            const dz = node.position.z - position.z;
            if (dx * dx + dy * dy + dz * dz <= radiusSquared) result.push(node);
        }
        return result;
    }

    mapNodes<T>(predicate: (node: Node) => T): T[] {
        const result: T[] = [];
        for (const node of this.nodes.values()) result.push(predicate(node));
        return result;
    }

    forEachNode(callback: (node: Node) => void): void {
        for (const node of this.nodes.values()) callback(node);
    }

    forEachEdge(callback: (edge: Edge) => void): void {
        for (const edge of this.edges.values()) callback(edge);
    }

    groupByData(key: string): Map<unknown, Node[]> {
        const groups = new Map<unknown, Node[]>();
        for (const node of this.nodes.values()) {
            const value = (node.data as Record<string, unknown>)[key];
            if (value !== undefined) appendTo(groups, value, node);
        }
        return groups;
    }

    getNodeDegrees(): Map<string, number> {
        const degrees = new Map<string, number>();
        for (const edge of this.edges.values()) {
            degrees.set(edge.source.id, (degrees.get(edge.source.id) ?? 0) + 1);
            degrees.set(edge.target.id, (degrees.get(edge.target.id) ?? 0) + 1);
        }
        return degrees;
    }

    getNodeDegree(nodeId: string): number {
        let degree = 0;
        for (const edge of this.edges.values()) {
            if (edge.source.id === nodeId || edge.target.id === nodeId) degree++;
        }
        return degree;
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

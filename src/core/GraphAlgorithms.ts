import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import type { EdgeDirection } from './Graph';

export class GraphAlgorithms {
    #linkIndexCache?: Map<string, Node[]>;

    constructor(
        private readonly nodes: Map<string, Node>,
        private readonly edges: Map<string, Edge>,
    ) {}

    invalidateLinkIndex(): void {
        this.#linkIndexCache = undefined;
    }

    /**
     * The nodes each node links to, in both directions. One index serves every traversal.
     */
    #linkIndex(): Map<string, Node[]> {
        if (this.#linkIndexCache) return this.#linkIndexCache;
        const links = new Map<string, Node[]>();
        const link = (from: string, to: Node) => {
            const list = links.get(from);
            if (!list) {
                links.set(from, [to]);
                return;
            }
            if (!list.includes(to)) list.push(to);
        };

        for (const edge of this.edges.values()) {
            link(edge.source.id, edge.target);
            link(edge.target.id, edge.source);
        }
        this.#linkIndexCache = links;
        return links;
    }

    // Connected Component Utilities
    getConnectedComponent(startNodeId: string): Node[] {
        const visited = new Set<string>();
        return this.#reachable(this.#linkIndex(), startNodeId, visited)
            .map((id) => this.nodes.get(id))
            .filter((node): node is Node => node !== undefined);
    }

    getConnectedComponentInRadius(
        centerId: string,
        radius: number,
    ): { nodes: Node[]; edges: Edge[] } {
        const center = this.nodes.get(centerId);
        if (!center) return { nodes: [], edges: [] };
        const inRadius = new Set<string>();
        const centerPos = center.position;
        for (const [id, node] of this.nodes) {
            if (node.position.distanceTo(centerPos) <= radius) inRadius.add(id);
        }
        const nodes = [...inRadius]
            .map((id) => this.nodes.get(id))
            .filter((node): node is Node => node !== undefined);
        const edges = [...this.edges.values()].filter(
            (edge) => inRadius.has(edge.source.id) && inRadius.has(edge.target.id),
        );
        return { nodes, edges };
    }

    getConnectedComponentCount(): number {
        const links = this.#linkIndex();
        const visited = new Set<string>();
        let count = 0;

        for (const nodeId of this.nodes.keys()) {
            if (visited.has(nodeId)) continue;
            count++;
            this.#reachable(links, nodeId, visited);
        }
        return count;
    }

    // Traversal
    traverse(callback: (node: Node, depth: number) => void, startId?: string): void {
        const links = this.#linkIndex();
        const visited = new Set<string>();
        const traverseRecursive = (nodeId: string, depth: number) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);
            const node = this.nodes.get(nodeId);
            if (!node) return;
            callback(node, depth);
            for (const neighbor of links.get(nodeId) ?? [])
                traverseRecursive(neighbor.id, depth + 1);
        };
        if (startId) traverseRecursive(startId, 0);
        else for (const node of this.nodes.values()) traverseRecursive(node.id, 0);
    }

    bfs(callback: (node: Node, depth: number) => void, startId?: string): void {
        const links = this.#linkIndex();
        const starts = startId ? [this.nodes.get(startId)] : [...this.nodes.values()];
        this.#walkBreadthFirst(
            starts.filter((node): node is Node => node !== undefined),
            links,
            (node, depth) => {
                callback(node, depth);
                return undefined;
            },
        );
    }

    dfs(callback: (node: Node, depth: number) => void, startId?: string): void {
        const links = this.#linkIndex();
        const visited = new Set<string>();
        const stack: Array<{ node: Node; depth: number }> = [];
        const start = startId ? this.nodes.get(startId) : [...this.nodes.values()][0];
        if (start) stack.push({ node: start, depth: 0 });

        while (stack.length) {
            const { node, depth } = stack.pop()!;
            if (visited.has(node.id)) continue;
            visited.add(node.id);
            callback(node, depth);
            for (const neighbor of links.get(node.id) ?? []) {
                if (!visited.has(neighbor.id)) stack.push({ node: neighbor, depth: depth + 1 });
            }
        }
    }

    findPath(from: string, to: string): Node[] | null {
        const links = this.#linkIndex();
        const start = this.nodes.get(from);
        if (!start) return null;

        const parent = new Map<string, string>();
        const reached = this.#walkBreadthFirst([start], links, (node, _depth, from) => {
            if (from) parent.set(node.id, from.id);
            return node.id === to ? node : undefined;
        });
        if (!reached) return null;

        const path = [reached];
        let current = reached;
        while (parent.has(current.id)) {
            current = this.nodes.get(parent.get(current.id)!)!;
            path.unshift(current);
        }

        return path;
    }

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

    /**
     * Walk the graph breadth first from a set of starting nodes.
     */
    #walkBreadthFirst<T>(
        starts: readonly Node[],
        links: ReadonlyMap<string, Node[]>,
        visit: (node: Node, depth: number, from: Node | null) => T | undefined,
    ): T | undefined {
        const visited = new Set<string>();
        const queue: Array<{ node: Node; depth: number; from: Node | null }> = starts.map(
            (node) => ({
                node,
                depth: 0,
                from: null,
            }),
        );

        for (let head = 0; head < queue.length; head++) {
            const entry = queue[head]!;
            if (visited.has(entry.node.id)) continue;
            visited.add(entry.node.id);
            const result = visit(entry.node, entry.depth, entry.from);
            if (result !== undefined) return result;
            for (const neighbor of links.get(entry.node.id) ?? []) {
                if (visited.has(neighbor.id)) continue;
                queue.push({ node: neighbor, depth: entry.depth + 1, from: entry.node });
            }
        }

        return undefined;
    }

    /** The ids reachable from a start id, breadth first. The visited set is shared and extended. */
    #reachable(links: Map<string, Node[]>, startId: string, visited: Set<string>): string[] {
        const queue = [startId];
        const reached: string[] = [];

        for (let head = 0; head < queue.length; head++) {
            const id = queue[head]!;
            if (visited.has(id)) continue;
            visited.add(id);
            reached.push(id);
            for (const neighbor of links.get(id) ?? []) {
                if (!visited.has(neighbor.id)) queue.push(neighbor.id);
            }
        }
        return reached;
    }
}

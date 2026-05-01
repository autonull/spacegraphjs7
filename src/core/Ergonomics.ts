// Ergonomics.ts - Ergonomic query and manipulation API
// Extracted from SpaceGraph.ts for better modularity
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import type { NodeSpec, EdgeSpec, Predicate } from '../types';
import type SpaceGraph from '../SpaceGraph';
import { MathPool } from './pooling/ObjectPool';

type NodePredicate = Predicate<Node>;
type EdgePredicate = Predicate<Edge>;

export class ErgonomicsAPI {
    constructor(readonly sg: SpaceGraph) {}

    // ============= Query Methods =============
    findNodes(predicate: NodePredicate): Node[] {
        return this.sg.graph.query(predicate);
    }

    findNode(predicate: NodePredicate): Node | undefined {
        return this.sg.graph.findNode(predicate);
    }

    getNodesByType(type: string): Node[] {
        return this.sg.graph.queryByType(type);
    }

    findEdges(predicate: EdgePredicate): Edge[] {
        const results: Edge[] = [];
        for (const edge of this.sg.graph.edges.values()) {
            if (predicate(edge)) results.push(edge);
        }
        return results;
    }

    getEdgesForNode(nodeId: string): Edge[] {
        return this.sg.graph.getEdgesForNode(nodeId);
    }

    where(key: string, value: unknown): Node[] {
        const results: Node[] = [];
        for (const node of this.sg.graph.nodes.values()) {
            if ((node.data as Record<string, unknown>)[key] === value) results.push(node);
        }
        return results;
    }

    adjacent(nodeId: string): Node[] {
        return this.sg.graph.neighbors(nodeId);
    }

    connections(nodeId: string): Edge[] {
        return this.sg.graph.getEdgesForNode(nodeId);
    }

    // ============= Iteration Methods =============
    forNodes(callback: (node: Node) => void): void {
        this.sg.graph.forEachNode(callback);
    }

    forEdges(callback: (edge: Edge) => void): void {
        this.sg.graph.forEachEdge(callback);
    }

    forEach(callback: (node: Node) => void): void {
        for (const node of this.sg.graph.nodes.values()) callback(node);
    }

    map<T>(callback: (node: Node) => T): T[] {
        const results: T[] = [];
        for (const node of this.sg.graph.nodes.values()) results.push(callback(node));
        return results;
    }

    filter(callback: (node: Node) => boolean): Node[] {
        const results: Node[] = [];
        for (const node of this.sg.graph.nodes.values()) {
            if (callback(node)) results.push(node);
        }
        return results;
    }

    // ============= Node Manipulation =============
    add(spec: NodeSpec | Node): Node | null {
        return this.sg.graph.addNode(spec);
    }

    addNodes(specs: NodeSpec[]): Node[] {
        const results: Node[] = [];
        for (const spec of specs) {
            const node = this.sg.graph.addNode(spec);
            if (node) results.push(node);
        }
        return results;
    }

    removeWhere(predicate: NodePredicate): number {
        let count = 0;
        this.sg.graph.nodes.forEach((node, id) => {
            if (predicate(node)) {
                this.sg.graph.removeNode(id);
                count++;
            }
        });
        return count;
    }

    updateWhere(predicate: NodePredicate, updates: Partial<NodeSpec>): Node[] {
        const updated: Node[] = [];
        this.sg.graph.nodes.forEach((node) => {
            if (predicate(node)) {
                const updatedNode = this.sg.graph.updateNode(node.id, updates);
                if (updatedNode) updated.push(updatedNode);
            }
        });
        return updated;
    }

    // ============= Edge Manipulation =============
    connect(source: string, target: string, data?: Record<string, unknown>): Edge | null {
        const edgeSpec = { id: `edge-${source}-${target}`, source, target, data };
        return this.sg.graph.addEdge(edgeSpec);
    }

    addEdges(specs: EdgeSpec[]): Edge[] {
        const results: Edge[] = [];
        for (const spec of specs) {
            const edge = this.sg.graph.addEdge(spec);
            if (edge) results.push(edge);
        }
        return results;
    }

    // ============= Traversal =============
    traverse(callback: (node: Node, depth: number) => void, startId?: string): void {
        const visited = new Set<string>();
        const traverseRecursive = (nodeId: string, depth: number) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);
            const node = this.sg.graph.getNode(nodeId);
            if (!node) return;
            callback(node, depth);
            for (const neighbor of this.sg.graph.neighbors(nodeId)) {
                traverseRecursive(neighbor.id, depth + 1);
            }
        };
        if (startId) traverseRecursive(startId, 0);
        else for (const node of this.sg.graph.nodes.values()) {
            traverseRecursive(node.id, 0);
        }
    }

    getSubgraph(centerId: string, radius: number): { nodes: Node[]; edges: Edge[] } {
        const center = this.sg.graph.getNode(centerId);
        if (!center) return { nodes: [], edges: [] };

        const inRadius = new Set<string>();
        const centerPos = center.position;

        for (const [id, node] of this.sg.graph.nodes) {
            const dist = node.position.distanceTo(centerPos);
            if (dist <= radius) inRadius.add(id);
        }

        const nodes = [...inRadius].map((id) => this.sg.graph.getNode(id)!).filter(Boolean);
        const edges = [...inRadius].flatMap((id) => this.sg.graph.getEdgesForNode(id))
            .filter((e) => inRadius.has(e.source.id) && inRadius.has(e.target.id));

        return { nodes, edges };
    }

    // ============= Quick Node Access =============
    $(id: string): Node | undefined {
        return this.sg.graph.getNode(id);
    }

    require(id: string): Node {
        const node = this.sg.graph.getNode(id);
        if (!node) throw new Error(`Node not found: ${id}`);
        return node;
    }

    // ============= Batch Operations =============
    batch(fn: (sg: SpaceGraph) => void): void {
        fn(this.sg);
    }

    freeze(): { release: () => void } {
        this.sg.pause();
        return { release: () => this.sg.render() };
    }

    suspend(): { resume: () => void } {
        this.sg.pause();
        return { resume: () => this.sg.render() };
    }

    transaction(updates: (sg: SpaceGraph) => void): void {
        this.sg.pause();
        try {
            updates(this.sg);
        } finally {
            this.sg.render();
        }
    }

    // ============= Node Utilities =============
    cloneNode(id: string, newId?: string): Node | null {
        const original = this.sg.graph.getNode(id);
        if (!original) return null;
        const node = this.sg.graph.addNode({
            id: newId ?? `${id}-copy`,
            type: original.type,
            label: original.label,
            position: [original.position.x + 50, original.position.y, original.position.z + 50],
            data: { ...original.data },
        });
        return node;
    }

    move(id: string, x: number, y: number, z: number = 0): Node | null {
        const node = this.sg.graph.getNode(id);
        if (!node) return null;
        node.updatePosition(x, y, z);
        return node;
    }

    translate(id: string, dx: number, dy: number, dz: number = 0): Node | null {
        const node = this.sg.graph.getNode(id);
        if (!node) return null;
        node.updatePosition(node.position.x + dx, node.position.y + dy, node.position.z + dz);
        return node;
    }

    label(id: string, text: string): Node | null {
        const node = this.sg.graph.getNode(id);
        if (!node) return null;
        node.updateSpec({ label: text });
        return node;
    }

    color(id: string, color: string | number): Node | null {
        const node = this.sg.graph.getNode(id);
        if (!node) return null;
        node.updateSpec({ data: { ...node.data, color } });
        return node;
    }

    show(id: string, visible: boolean = true): Node | null {
        const node = this.sg.graph.getNode(id);
        if (!node) return null;
        node.updateSpec({ data: { ...node.data, visible } });
        return node;
    }

    hide(id: string): Node | null {
        return this.show(id, false);
    }

    toggleVisibility(nodeId: string): boolean {
        const node = this.sg.graph.getNode(nodeId);
        if (!node) return false;
        const visible = !(node.data as Record<string, unknown>).visible;
        node.updateSpec({ data: { ...node.data, visible } });
        return visible;
    }

    // ============= Selection =============
    select(nodeId: string): this {
        const node = this.sg.graph.getNode(nodeId);
        if (node) node.focus();
        return this;
    }

    deselect(nodeId: string): this {
        const node = this.sg.graph.getNode(nodeId);
        if (node) node.blur();
        return this;
    }

    selectAll(): this {
        for (const node of this.sg.graph.nodes.values()) node.focus();
        return this;
    }

    deselectAll(): this {
        for (const node of this.sg.graph.nodes.values()) node.blur();
        return this;
    }
}
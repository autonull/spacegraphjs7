// Ergonomics.ts - Ergonomic query and manipulation API
// Enhanced with unified patterns and shortcuts
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import type { NodeSpec, EdgeSpec, Predicate } from '../types';
import type SpaceGraph from '../SpaceGraph';

type NodePredicate = Predicate<Node>;
type EdgePredicate = Predicate<Edge>;

export class ErgonomicsAPI {
    constructor(readonly sg: SpaceGraph) {}

    // ============= Quick Access ($ = get node) =============
    $(id: string): Node | undefined { return this.sg.graph.getNode(id); }
    $$(id: string): Node { return this.require(id); }
    $optional(id: string): Node | null { return this.sg.graph.getNode(id) ?? null; }

    // ============= Query Shortcuts =============
    findNodes(predicate: NodePredicate): Node[] { return this.sg.graph.query(predicate); }
    findNode(predicate: NodePredicate): Node | undefined { return this.sg.graph.findNode(predicate); }
    getNodesByType(type: string): Node[] { return this.sg.graph.queryByType(type); }

    findEdges(predicate: EdgePredicate): Edge[] {
        const results: Edge[] = [];
        for (const edge of this.sg.graph.edges.values()) {
            if (predicate(edge)) results.push(edge);
        }
        return results;
    }

    getEdgesForNode(nodeId: string): Edge[] { return this.sg.graph.getEdgesForNode(nodeId); }

    // Data query shortcuts
    where(key: string, value: unknown): Node[] {
        const results: Node[] = [];
        for (const node of this.sg.graph.nodes.values()) {
            if ((node.data as Record<string, unknown>)[key] === value) results.push(node);
        }
        return results;
    }

    has(key: string, value?: unknown): Node[] {
        if (value !== undefined) return this.where(key, value);
        const results: Node[] = [];
        for (const node of this.sg.graph.nodes.values()) {
            if (key in node.data) results.push(node);
        }
        return results;
    }

    // ============= Graph Topology Shortcuts =============
    adjacent(nodeId: string): Node[] { return this.sg.graph.neighbors(nodeId); }
    neighbors(nodeId: string): Node[] { return this.sg.graph.neighbors(nodeId); }
    connections(nodeId: string): Edge[] { return this.sg.graph.getEdgesForNode(nodeId); }
    inEdges(nodeId: string): Edge[] { return this.sg.graph.getIncomingEdges(nodeId); }
    outEdges(nodeId: string): Edge[] { return this.sg.graph.getOutgoingEdges(nodeId); }
    inNodes(nodeId: string): Node[] {
        return this.sg.graph.getEdgesForNode(nodeId, 'incoming').map(e => e.source);
    }
    outNodes(nodeId: string): Node[] {
        return this.sg.graph.getEdgesForNode(nodeId, 'outgoing').map(e => e.target);
    }

    // ============= Iteration Methods =============
    forNodes(callback: (node: Node) => void): void { this.sg.graph.forEachNode(callback); }
    forEdges(callback: (edge: Edge) => void): void { this.sg.graph.forEachEdge(callback); }

    forEach(callback: (node: Node) => void): void {
        for (const node of this.sg.graph.nodes.values()) callback(node);
    }

    each(callback: (node: Node) => void): void { this.forEach(callback); }

    // ============= Array Methods =============
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

    some(callback: (node: Node) => boolean): boolean {
        for (const node of this.sg.graph.nodes.values()) {
            if (callback(node)) return true;
        }
        return false;
    }

    every(callback: (node: Node) => boolean): boolean {
        for (const node of this.sg.graph.nodes.values()) {
            if (!callback(node)) return false;
        }
        return true;
    }

    reduce<T>(callback: (acc: T, node: Node) => T, initial: T): T {
        let acc = initial;
        for (const node of this.sg.graph.nodes.values()) acc = callback(acc, node);
        return acc;
    }

    // ============= Node Manipulation =============
    add(spec: NodeSpec | Node): Node | null { return this.sg.graph.addNode(spec); }
    addNodes(specs: NodeSpec[]): Node[] {
        const results: Node[] = [];
        for (const spec of specs) {
            const node = this.sg.graph.addNode(spec);
            if (node) results.push(node);
        }
        return results;
    }

    // Unified add: creates node from various inputs
    create(spec: string | NodeSpec): Node | null {
        return typeof spec === 'string'
            ? this.sg.graph.addNode({ id: spec, type: 'ShapeNode' })
            : this.sg.graph.addNode(spec);
    }

    remove(id: string): boolean {
        return this.sg.graph.removeNode(id);
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

    connectTo(source: string, to: string | string[], data?: Record<string, unknown>): Edge[] {
        const arr = Array.isArray(to) ? to : [to];
        return arr.map(target => this.connect(source, target, data)).filter(Boolean) as Edge[];
    }

    connectFrom(from: string | string[], target: string, data?: Record<string, unknown>): Edge[] {
        const arr = Array.isArray(from) ? from : [from];
        return arr.map(source => this.connect(source, target, data)).filter(Boolean) as Edge[];
    }

    disconnect(source: string, target: string): boolean {
        const edgeId = `edge-${source}-${target}`;
        return this.sg.graph.removeEdge(edgeId);
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

    bfs(callback: (node: Node, depth: number) => void, startId?: string): void {
        const start = startId ? [this.sg.graph.getNode(startId)] : [...this.sg.graph.nodes.values()];
        const visited = new Set<string>();
        const queue: Array<{ node: Node; depth: number }> = [];

        for (const node of start) {
            if (node) queue.push({ node, depth: 0 });
        }

        while (queue.length) {
            const { node, depth } = queue.shift()!;
            if (visited.has(node.id)) continue;
            visited.add(node.id);
            callback(node, depth);
            for (const neighbor of this.sg.graph.neighbors(node.id)) {
                if (!visited.has(neighbor.id)) queue.push({ node: neighbor, depth: depth + 1 });
            }
        }
    }

    dfs(callback: (node: Node, depth: number) => void, startId?: string): void {
        const visited = new Set<string>();
        const stack: Array<{ node: Node; depth: number }> = [];

        const start = startId ? this.sg.graph.getNode(startId) : [...this.sg.graph.nodes.values()][0];
        if (start) stack.push({ node: start, depth: 0 });

        while (stack.length) {
            const { node, depth } = stack.pop()!;
            if (visited.has(node.id)) continue;
            visited.add(node.id);
            callback(node, depth);
            for (const neighbor of this.sg.graph.neighbors(node.id)) {
                if (!visited.has(neighbor.id)) stack.push({ node: neighbor, depth: depth + 1 });
            }
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

    // ============= Path Finding =============
    path(from: string, to: string): Node[] | null {
        const visited = new Set<string>();
        const queue: Array<{ id: string; path: Node[] }> = [{ id: from, path: [] }];

        while (queue.length) {
            const { id, path } = queue.shift()!;
            if (visited.has(id)) continue;
            visited.add(id);

            const node = this.sg.graph.getNode(id);
            if (!node) continue;

            const newPath = [...path, node];
            if (id === to) return newPath;

            for (const neighbor of this.sg.graph.neighbors(id)) {
                if (!visited.has(neighbor.id)) queue.push({ id: neighbor.id, path: newPath });
            }
        }
        return null;
    }

    // ============= Quick Node Access =============
    require(id: string): Node {
        const node = this.sg.graph.getNode(id);
        if (!node) throw new Error(`Node not found: ${id}`);
        return node;
    }

    get first(): Node | undefined { return this.sg.graph.nodes.values().next().value; }
    get last(): Node | undefined {
        const arr = [...this.sg.graph.nodes.values()];
        return arr[arr.length - 1];
    }

    // ============= Batch Operations =============
    batch(fn: (sg: SpaceGraph) => void): void { fn(this.sg); }

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
        try { updates(this.sg); }
        finally { this.sg.render(); }
    }

    // ============= Node Utilities =============
    clone(id: string, newId?: string): Node | null {
        const original = this.sg.graph.getNode(id);
        if (!original) return null;
        return this.sg.graph.addNode({
            id: newId ?? `${id}-copy`,
            type: original.type,
            label: original.label,
            position: [original.position.x + 50, original.position.y, original.position.z + 50],
            data: { ...original.data },
        });
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

    shift(id: string, dx: number, dy: number, dz: number = 0): Node | null {
        return this.translate(id, dx, dy, dz);
    }

    rotate(id: string, x: number, y: number, z: number): Node | null {
        const node = this.sg.graph.getNode(id);
        if (!node) return null;
        node.updateSpec({ rotation: [x, y, z] });
        return node;
    }

    scale(id: string, x: number, y?: number, z?: number): Node | null {
        const node = this.sg.graph.getNode(id);
        if (!node) return null;
        node.updateSpec({ scale: [x, y ?? x, z ?? x] });
        return node;
    }

    // Label/Text shortcuts
    label(id: string, text: string): Node | null {
        const node = this.sg.graph.getNode(id);
        if (!node) return null;
        node.updateSpec({ label: text });
        return node;
    }

    text(id: string, text: string): Node | null { return this.label(id, text); }

    // Color shortcuts
    color(id: string, color: string | number): Node | null {
        const node = this.sg.graph.getNode(id);
        if (!node) return null;
        node.updateSpec({ data: { ...node.data, color } });
        return node;
    }

    fill(id: string, color: string | number): Node | null { return this.color(id, color); }

    // Visibility shortcuts
    show(id: string, visible: boolean = true): Node | null {
        const node = this.sg.graph.getNode(id);
        if (!node) return null;
        node.updateSpec({ data: { ...node.data, visible } });
        return node;
    }

    hide(id: string): Node | null { return this.show(id, false); }

    toggleVisibility(nodeId: string): boolean {
        const node = this.sg.graph.getNode(nodeId);
        if (!node) return false;
        const visible = !(node.data as Record<string, unknown>).visible;
        node.updateSpec({ data: { ...node.data, visible } });
        return visible;
    }

    toggle(nodeId: string): boolean { return this.toggleVisibility(nodeId); }

    // Data shortcuts
    data(id: string, key: string, value?: unknown): unknown {
        const node = this.sg.graph.getNode(id);
        if (!node) return undefined;
        if (value !== undefined) {
            node.updateSpec({ data: { ...node.data, [key]: value } });
            return value;
        }
        return node.data[key];
    }

    attr(id: string, key: string, value?: unknown): unknown { return this.data(id, key, value); }

    // Size shortcuts
    size(id: string, size: number): Node | null {
        return this.data(id, 'size', size) as unknown as Node | null;
    }

    width(id: string, width: number): Node | null {
        return this.data(id, 'width', width) as unknown as Node | null;
    }

    height(id: string, height: number): Node | null {
        return this.data(id, 'height', height) as unknown as Node | null;
    }

    bounds(id: string): { min: Node; max: Node } | null {
        const node = this.sg.graph.getNode(id);
        if (!node) return null;
        return { min: node, max: node };
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

    get selected(): Node[] {
        const results: Node[] = [];
        for (const node of this.sg.graph.nodes.values()) {
            if (node.focused) results.push(node);
        }
        return results;
    }

    // ============= Aggregate Methods =============
    get count(): number { return this.sg.graph.nodes.size; }
    get isEmpty(): boolean { return this.sg.graph.nodes.size === 0; }
    get notEmpty(): boolean { return !this.isEmpty; }

    // Bounding box
    get bounds(): { min: Node; max: Node } | null {
        const nodes = [...this.sg.graph.nodes.values()];
        if (!nodes.length) return null;
        return { min: nodes[0], max: nodes[nodes.length - 1] };
    }

    // Center of mass
    get center(): { x: number; y: number; z: number } {
        let x = 0, y = 0, z = 0;
        for (const node of this.sg.graph.nodes.values()) {
            x += node.position.x;
            y += node.position.y;
            z += node.position.z;
        }
        const n = this.sg.graph.nodes.size || 1;
        return { x: x / n, y: y / n, z: z / n };
    }

    // ============= Chained Mutations =============
    then(callback: (ergo: this) => void): this {
        callback(this);
        return this;
    }
}
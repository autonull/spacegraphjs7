import type { Edge } from '../edges/Edge';
// Ergonomics.ts - Ergonomic query and manipulation API
// Delegates to Graph for core operations
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec, NodeSpec, Predicate } from '../types';
import type { LayoutOptionsFor, LayoutOptionsMap } from '../types/layout';

type NodePredicate = Predicate<Node>;

export class ErgonomicsAPI {
    constructor(readonly sg: SpaceGraph) {}

    get first(): Node | undefined {
        return this.sg.graph.nodes.values().next().value;
    }

    get last(): Node | undefined {
        return [...this.sg.graph.nodes.values()].pop();
    }

    get selected(): Node[] {
        return this.sg.selectedNodes;
    }
    get count(): number {
        return this.sg.graph.nodes.size;
    }

    get isEmpty(): boolean {
        return this.sg.graph.nodes.size === 0;
    }

    get bounds(): { min: Node; max: Node } | null {
        const arr = [...this.sg.graph.nodes.values()];
        if (!arr.length) return null;
        return { min: arr[0], max: arr[arr.length - 1] };
    }
    $(id: string): Node | undefined {
        return this.sg.graph.queryEngine.getNode(id);
    }

    $$(id: string): Node {
        return this.require(id);
    }

    at(id: string): Node | undefined {
        return this.$(id);
    }

    must(id: string): Node {
        return this.require(id);
    }

    $optional(id: string): Node | null {
        return this.sg.graph.queryEngine.getNode(id) ?? null;
    }
    findNodes(predicate: NodePredicate): Node[] {
        return this.sg.graph.query(predicate);
    }

    findNode(predicate: NodePredicate): Node | undefined {
        return this.sg.graph.findNode(predicate);
    }

    getNodesByType(type: string): Node[] {
        return this.sg.graph.queryByType(type);
    }

    findEdges(predicate: (edge: Edge) => boolean): Edge[] {
        return [...this.sg.graph.getEdges()].filter(predicate);
    }

    getEdgesForNode(nodeId: string): Edge[] {
        return this.sg.graph.getEdgesForNode(nodeId);
    }

    connections(nodeId: string): Edge[] {
        return this.getEdgesForNode(nodeId);
    }

    where(key: string, value: unknown): Node[] {
        return this.sg.graph.query((n: Node) => (n.data as Record<string, unknown>)[key] === value);
    }

    has(key: string, value?: unknown): Node[] {
        return value !== undefined
            ? this.where(key, value)
            : this.sg.graph.query((n: Node) => key in n.data);
    }

    neighbors(nodeId: string): Node[] {
        return this.sg.graph.getNeighbors(nodeId);
    }

    adjacent(nodeId: string): Node[] {
        return this.neighbors(nodeId);
    }

    inEdges(nodeId: string): Edge[] {
        return this.sg.graph.getEdgesForNode(nodeId, 'incoming');
    }

    outEdges(nodeId: string): Edge[] {
        return this.sg.graph.getEdgesForNode(nodeId, 'outgoing');
    }
    forNodes(callback: (node: Node) => void): void {
        this.sg.graph.forEachNode(callback);
    }

    forEdges(callback: (edge: Edge) => void): void {
        this.sg.graph.forEachEdge(callback);
    }

    forEach(callback: (node: Node) => void): void {
        this.forNodes(callback);
    }

    each(callback: (node: Node) => void): void {
        this.forNodes(callback);
    }

    map<T>(callback: (node: Node) => T): T[] {
        return this.sg.graph.mapNodes(callback);
    }

    filter(callback: (node: Node) => boolean): Node[] {
        return this.sg.graph.query(callback);
    }

    some(callback: (node: Node) => boolean): boolean {
        return this.sg.graph.findNode(callback) !== undefined;
    }

    every(callback: (node: Node) => boolean): boolean {
        return [...this.sg.graph.getNodes()].every(callback);
    }

    reduce<T>(callback: (acc: T, node: Node) => T, initial: T): T {
        return [...this.sg.graph.getNodes()].reduce(callback, initial);
    }
    add(spec: NodeSpec | Node): Node | null {
        return this.sg.graph.addNode(spec);
    }

    addNodes(specs: NodeSpec[]): Node[] {
        return this.sg.graph.addNodes(specs);
    }

    create(spec: string | NodeSpec): Node | null {
        return typeof spec === 'string'
            ? this.sg.graph.addNode({ id: spec, type: 'ShapeNode' })
            : this.sg.graph.addNode(spec);
    }

    remove(id: string): boolean {
        this.sg.graph.removeNode(id);
        return true;
    }

    removeWhere(predicate: NodePredicate): number {
        const nodes = this.sg.graph.query(predicate);
        nodes.forEach((n: Node) => this.sg.graph.removeNode(n.id));
        return nodes.length;
    }

    updateWhere(predicate: NodePredicate, updates: Partial<NodeSpec>): Node[] {
        return this.sg.graph
            .query(predicate)
            .map((n: Node) => this.sg.graph.updateNode(n.id, updates))
            .filter(Boolean) as Node[];
    }
    connect(source: string, target: string, data?: Record<string, unknown>): Edge | null {
        return this.sg.graph.addEdge({ id: `edge-${source}-${target}`, source, target, data });
    }

    connectTo(source: string, to: string | string[], data?: Record<string, unknown>): Edge[] {
        const arr = Array.isArray(to) ? to : [to];
        return arr.map((t) => this.connect(source, t, data)).filter(Boolean) as Edge[];
    }

    connectFrom(from: string | string[], target: string, data?: Record<string, unknown>): Edge[] {
        const arr = Array.isArray(from) ? from : [from];
        return arr.map((f) => this.connect(f, target, data)).filter(Boolean) as Edge[];
    }

    disconnect(source: string, target: string): boolean {
        this.sg.graph.removeEdge(`edge-${source}-${target}`);
        return true;
    }

    addEdges(specs: EdgeSpec[]): Edge[] {
        return this.sg.graph.addEdges(specs);
    }
    traverse(callback: (node: Node, depth: number) => void, startId?: string): void {
        this.sg.graph.traverse(callback, startId);
    }

    bfs(callback: (node: Node, depth: number) => void, startId?: string): void {
        this.sg.graph.bfs(callback, startId);
    }

    dfs(callback: (node: Node, depth: number) => void, startId?: string): void {
        this.sg.graph.dfs(callback, startId);
    }
    getSubgraph(centerId: string, radius: number): { nodes: Node[]; edges: Edge[] } {
        return this.sg.graph.getConnectedComponentInRadius(centerId, radius);
    }

    path(from: string, to: string): Node[] | null {
        return this.sg.graph.findPath(from, to);
    }
    require(id: string): Node {
        const node = this.sg.graph.queryEngine.getNode(id);
        if (!node) throw new Error(`Node not found: ${id}`);
        return node;
    }
    batch(fn: (sg: SpaceGraph) => void): void {
        fn(this.sg);
    }

    #paused(): () => void {
        this.sg.pause();
        return () => this.sg.render();
    }

    freeze(): { release: () => void } {
        return { release: this.#paused() };
    }

    suspend(): { resume: () => void } {
        return { resume: this.#paused() };
    }

    transaction(updates: (sg: SpaceGraph) => void): void {
        this.sg.pause();
        try {
            updates(this.sg);
        } finally {
            this.sg.render();
        }
    }
    node(
        id: string,
        position?: [number, number, number],
        data?: Record<string, unknown>,
    ): Node | null {
        return this.addTyped(id, 'ShapeNode', data, position);
    }

    box(id: string, position?: [number, number, number], size = 50): Node | null {
        return this.addTyped(id, 'ShapeNode', { size, shape: 'box' }, position);
    }

    sphere(id: string, position?: [number, number, number], size = 50): Node | null {
        return this.addTyped(id, 'ShapeNode', { size, shape: 'sphere' }, position);
    }

    circle(id: string, position?: [number, number, number], size = 50): Node | null {
        return this.addTyped(id, 'ShapeNode', { size, shape: 'circle' }, position);
    }

    text(id: string, text: string, position?: [number, number, number]): Node | null {
        return this.addTyped(id, 'TextMeshNode', { text }, position);
    }

    image(id: string, url: string, position?: [number, number, number]): Node | null {
        return this.addTyped(id, 'ImageNode', { url }, position);
    }

    html(id: string, html: string, position?: [number, number, number]): Node | null {
        return this.addTyped(id, 'HtmlNode', { html }, position);
    }

    group(id: string, position?: [number, number, number]): Node | null {
        return this.addTyped(id, 'GroupNode', undefined, position);
    }

    note(id: string, text: string, position?: [number, number, number]): Node | null {
        return this.addTyped(id, 'NoteNode', { text }, position);
    }

    widget(
        id: string,
        type: 'button' | 'slider' | 'toggle',
        position?: [number, number, number],
    ): Node | null {
        return this.addTyped(
            id,
            `${type.charAt(0).toUpperCase()}${type.slice(1)}Node`,
            undefined,
            position,
        );
    }
    clone(id: string, newId?: string): Node | null {
        const orig = this.sg.graph.queryEngine.getNode(id);
        return orig?.clone(newId ?? `${id}-copy`, [50, 0, 50]) ?? null;
    }

    move(id: string, x: number, y: number, z = 0): Node | null {
        return this.withNode(id, (node) => node.updatePosition(x, y, z));
    }

    translate(id: string, dx: number, dy: number, dz = 0): Node | null {
        return this.withNode(id, (node) =>
            node.updatePosition(node.position.x + dx, node.position.y + dy, node.position.z + dz),
        );
    }

    shift(id: string, dx: number, dy: number, dz = 0): Node | null {
        return this.translate(id, dx, dy, dz);
    }

    rotate(id: string, x: number, y: number, z: number): Node | null {
        return this.withNode(id, (node) => node.updateSpec({ rotation: [x, y, z] }));
    }

    scale(id: string, x: number, y?: number, z?: number): Node | null {
        return this.withNode(id, (node) => node.updateSpec({ scale: [x, y ?? x, z ?? x] }));
    }

    setSize(id: string, width: number, height: number): Node | null {
        return this.withNode(id, (node) => node.setSize(width, height));
    }

    label(id: string, text: string): Node | null {
        return this.withNode(id, (node) => node.updateSpec({ label: text }));
    }

    color(id: string, color: string | number): Node | null {
        return this.withNode(id, (node) => node.updateSpec({ data: { color } }));
    }

    fill(id: string, color: string | number): Node | null {
        return this.color(id, color);
    }

    show(id: string, visible = true): Node | null {
        return this.withNode(id, (node) => node.setVisible(visible));
    }

    visible(id: string, value = true): Node | null {
        return this.show(id, value);
    }

    hide(id: string): Node | null {
        return this.show(id, false);
    }

    toggleVisibility(nodeId: string): boolean {
        const node = this.sg.graph.queryEngine.getNode(nodeId);
        if (!node) return false;
        const visible = !node.visible;
        node.setVisible(visible);
        return visible;
    }

    opacity(id: string, opacity: number): Node | null {
        return this.#writeFlag(id, 'opacity', opacity);
    }

    pinned(id: string): Node | null {
        return this.#writeFlag(id, 'pinned', true);
    }

    unpin(id: string): Node | null {
        return this.#writeFlag(id, 'pinned', false);
    }

    draggable(id: string, draggable = true): Node | null {
        return this.#writeFlag(id, 'draggable', draggable);
    }

    selectable(id: string, selectable = true): Node | null {
        return this.#writeFlag(id, 'selectable', selectable);
    }
    data(id: string, key: string, value?: unknown): unknown {
        const n = this.sg.graph.queryEngine.getNode(id);
        if (!n) return undefined;
        if (value !== undefined) {
            n.updateSpec({ data: { ...n.data, [key]: value } });
            return value;
        }
        return n.data[key];
    }

    /** Writes a data flag and returns the node so the ergonomic API stays fluent. */
    #writeFlag(id: string, key: string, value: unknown): Node | null {
        const node = this.sg.graph.queryEngine.getNode(id);
        if (!node) return null;
        node.updateSpec({ data: { ...node.data, [key]: value } });
        return node;
    }

    attr(id: string, key: string, value?: unknown): unknown {
        return this.data(id, key, value);
    }

    size(id: string, size: number): Node | null {
        return this.#writeFlag(id, 'size', size);
    }

    width(id: string, width: number): Node | null {
        return this.#writeFlag(id, 'width', width);
    }

    height(id: string, height: number): Node | null {
        return this.#writeFlag(id, 'height', height);
    }
    position(id: string, x: number, y: number, z = 0): Node | null {
        return this.move(id, x, y, z);
    }

    cx(id: string, x: number): Node | null {
        return this.withNode(id, (node) =>
            node.updatePosition(x, node.position.y, node.position.z),
        );
    }

    cy(id: string, y: number): Node | null {
        return this.withNode(id, (node) =>
            node.updatePosition(node.position.x, y, node.position.z),
        );
    }

    cz(id: string, z: number): Node | null {
        return this.withNode(id, (node) =>
            node.updatePosition(node.position.x, node.position.y, z),
        );
    }

    center(): { x: number; y: number; z: number } {
        let x = 0,
            y = 0,
            z = 0;
        this.sg.graph.forEachNode((n: Node) => {
            x += n.position.x;
            y += n.position.y;
            z += n.position.z;
        });
        const n = this.sg.graph.nodes.size || 1;
        return { x: x / n, y: y / n, z: z / n };
    }
    select(nodeId: string): this {
        this.sg.selection.select(nodeId);
        return this;
    }

    deselect(nodeId: string): this {
        this.sg.selection.deselect(nodeId);
        return this;
    }

    selectAll(): this {
        this.sg.selection.select([...this.sg.graph.nodes.keys()]);
        return this;
    }

    clearSelection(): this {
        this.sg.selection.clear();
        return this;
    }
    then(callback: (ergo: this) => void): this {
        callback(this);
        return this;
    }
    edge(source: string, target: string, data?: Record<string, unknown>): Edge | null {
        return this.connect(source, target, data);
    }

    arrow(source: string, target: string): Edge | null {
        return this.connect(source, target, { arrowhead: true });
    }
    layout(
        type: 'force' | 'grid' | 'circular' | 'tree' | 'radial',
        options?: Record<string, unknown>,
    ): Promise<void> {
        const name = `${type}-layout` as keyof LayoutOptionsMap;
        return this.sg.layout(name, options as Partial<LayoutOptionsFor<typeof name>>);
    }
    fit(padding = 100): this {
        this.sg.fitView(padding);
        return this;
    }

    zoom(): this {
        this.sg.fitView();
        return this;
    }

    resetCamera(): this {
        this.sg.resetCamera();
        return this;
    }

    focus(id: string, padding = 100): this {
        this.sg.focusNode(id, padding);
        return this;
    }
    clear(): void {
        this.sg.clear();
    }

    pause(): void {
        this.sg.pause();
    }

    resume(): void {
        this.sg.render();
    }

    render(): void {
        this.sg.render();
    }

    /** Runs an action on a node and hands it back; null when the node does not exist. */
    private withNode(id: string, action: (node: Node) => void): Node | null {
        const node = this.sg.graph.queryEngine.getNode(id);
        if (!node) return null;
        action(node);
        return node;
    }

    /** Adds a node of a type, with the data a host gave it. */
    private addTyped(
        id: string,
        type: string,
        data?: Record<string, unknown>,
        position?: [number, number, number],
    ): Node | null {
        return this.sg.graph.addNode({ id, type, position, data });
    }
}

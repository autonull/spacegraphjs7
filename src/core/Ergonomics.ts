// Ergonomics.ts - Ergonomic query and manipulation API
// Delegates to Graph for core operations
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import type { NodeSpec, EdgeSpec, Predicate } from '../types';
import type SpaceGraph from '../SpaceGraph';
import type THREE from 'three';

type NodePredicate = Predicate<Node>;

export class ErgonomicsAPI {
    constructor(readonly sg: SpaceGraph) {}

    // ============= Quick Access ($ = get node) =============
    $(id: string): Node | undefined { return this.sg.graph.getNode(id); }
    $$(id: string): Node { return this.require(id); }
    $optional(id: string): Node | null { return this.sg.graph.getNode(id) ?? null; }

    // ============= Query =============
    findNodes(predicate: NodePredicate): Node[] { return this.sg.graph.query(predicate); }
    findNode(predicate: NodePredicate): Node | undefined { return this.sg.graph.findNode(predicate); }
    getNodesByType(type: string): Node[] { return this.sg.graph.queryByType(type); }
    findEdges(predicate: (edge: Edge) => boolean): Edge[] { const e = this.sg.graph.findEdge(predicate); return e ? [e] : []; }
    getEdgesForNode(nodeId: string): Edge[] { return this.sg.graph.getEdgesForNode(nodeId); }

    where(key: string, value: unknown): Node[] { return this.sg.graph.query((n) => (n.data as Record<string, unknown>)[key] === value); }
    has(key: string, value?: unknown): Node[] { return value !== undefined ? this.where(key, value) : this.sg.graph.query((n) => key in n.data); }

    // ============= Graph Topology =============
    adjacent(nodeId: string): Node[] { return this.sg.graph.neighbors(nodeId); }
    neighbors(nodeId: string): Node[] { return this.sg.graph.neighbors(nodeId); }
    connections(nodeId: string): Edge[] { return this.sg.graph.getEdgesForNode(nodeId); }
    inEdges(nodeId: string): Edge[] { return this.sg.graph.getIncomingEdges(nodeId); }
    outEdges(nodeId: string): Edge[] { return this.sg.graph.getOutgoingEdges(nodeId); }

    // ============= Iterator =============
    forNodes(callback: (node: Node) => void): void { this.sg.graph.forEachNode(callback); }
    forEdges(callback: (edge: Edge) => void): void { this.sg.graph.forEachEdge(callback); }
    forEach(callback: (node: Node) => void): void { this.sg.graph.forEachNode(callback); }
    each(callback: (node: Node) => void): void { this.sg.graph.forEachNode(callback); }

    // ============= Array Methods =============
    map<T>(callback: (node: Node) => T): T[] { return this.sg.graph.mapNodes(callback); }
    filter(callback: (node: Node) => boolean): Node[] { return this.sg.graph.query(callback); }
    some(callback: (node: Node) => boolean): boolean { return this.sg.graph.findNode(callback) !== undefined; }
    every(callback: (node: Node) => boolean): boolean { return this.sg.graph.query((n) => !callback(n)).length === 0; }
    reduce<T>(callback: (acc: T, node: Node) => T, initial: T): T { let acc = initial; this.sg.graph.forEachNode((n) => acc = callback(acc, n)); return acc; }

    // ============= Node Manipulation =============
    add(spec: NodeSpec | Node): Node | null { return this.sg.graph.addNode(spec); }
    addNodes(specs: NodeSpec[]): Node[] { return this.sg.graph.addNodes(specs); }
    create(spec: string | NodeSpec): Node | null { return typeof spec === 'string' ? this.sg.graph.addNode({ id: spec, type: 'ShapeNode' }) : this.sg.graph.addNode(spec); }
    remove(id: string): boolean { this.sg.graph.removeNode(id); return true; }
    removeWhere(predicate: NodePredicate): number { const nodes = this.sg.graph.query(predicate); nodes.forEach((n) => this.sg.graph.removeNode(n.id)); return nodes.length; }
    updateWhere(predicate: NodePredicate, updates: Partial<NodeSpec>): Node[] { return this.sg.graph.query(predicate).map((n) => this.sg.graph.updateNode(n.id, updates)).filter(Boolean) as Node[]; }

    // ============= Edge Manipulation =============
    connect(source: string, target: string, data?: Record<string, unknown>): Edge | null { return this.sg.graph.addEdge({ id: `edge-${source}-${target}`, source, target, data }); }
    connectTo(source: string, to: string | string[], data?: Record<string, unknown>): Edge[] { const arr = Array.isArray(to) ? to : [to]; return arr.map((t) => this.connect(source, t, data)).filter(Boolean) as Edge[]; }
    connectFrom(from: string | string[], target: string, data?: Record<string, unknown>): Edge[] { const arr = Array.isArray(from) ? from : [from]; return arr.map((f) => this.connect(f, target, data)).filter(Boolean) as Edge[]; }
    disconnect(source: string, target: string): boolean { return this.sg.graph.removeEdge(`edge-${source}-${target}`); }
    addEdges(specs: EdgeSpec[]): Edge[] { return this.sg.graph.addEdges(specs); }

    // ============= Traversal =============
    traverse(callback: (node: Node, depth: number) => void, startId?: string): void { this.sg.graph.traverse(callback, startId); }
    bfs(callback: (node: Node, depth: number) => void, startId?: string): void { this.sg.graph.bfs(callback, startId); }
    dfs(callback: (node: Node, depth: number) => void, startId?: string): void { this.sg.graph.dfs(callback, startId); }
    getSubgraph(centerId: string, radius: number): { nodes: Node[]; edges: Edge[] } { return this.sg.graph.getConnectedComponentInRadius(centerId, radius); }
    path(from: string, to: string): Node[] | null { return this.sg.graph.findPath(from, to); }

    // ============= Quick Access =============
    require(id: string): Node { const node = this.sg.graph.getNode(id); if (!node) throw new Error(`Node not found: ${id}`); return node; }
    get first(): Node | undefined { return this.sg.graph.nodes.values().next().value; }
    get last(): Node | undefined { return [...this.sg.graph.nodes.values()].pop(); }

    // ============= Batch Operations =============
    batch(fn: (sg: SpaceGraph) => void): void { fn(this.sg); }
    freeze(): { release: () => void } { this.sg.pause(); return { release: () => this.sg.render() }; }
    suspend(): { resume: () => void } { this.sg.pause(); return { resume: () => this.sg.render() }; }
    transaction(updates: (sg: SpaceGraph) => void): void { this.sg.pause(); try { updates(this.sg); } finally { this.sg.render(); } }

    // ============= Shortcuts for Common Operations =============
    // Node creation shortcuts
    node(id: string, position?: [number, number, number], data?: Record<string, unknown>): Node | null {
        return this.sg.graph.addNode({ id, type: 'ShapeNode', position: position ?? [0, 0, 0], data });
    }
    box(id: string, position?: [number, number, number], size = 50): Node | null {
        return this.sg.graph.addNode({ id, type: 'ShapeNode', position, data: { size, shape: 'box' } });
    }
    sphere(id: string, position?: [number, number, number], size = 50): Node | null {
        return this.sg.graph.addNode({ id, type: 'ShapeNode', position, data: { size, shape: 'sphere' } });
    }
    circle(id: string, position?: [number, number, number], size = 50): Node | null {
        return this.sg.graph.addNode({ id, type: 'ShapeNode', position, data: { size, shape: 'circle' } });
    }
    text(id: string, text: string, position?: [number, number, number]): Node | null {
        return this.sg.graph.addNode({ id, type: 'TextMeshNode', position, data: { text } });
    }
    image(id: string, url: string, position?: [number, number, number]): Node | null {
        return this.sg.graph.addNode({ id, type: 'ImageNode', position, data: { url } });
    }
    html(id: string, html: string, position?: [number, number, number]): Node | null {
        return this.sg.graph.addNode({ id, type: 'HtmlNode', position, data: { html } });
    }
    group(id: string, position?: [number, number, number]): Node | null {
        return this.sg.graph.addNode({ id, type: 'GroupNode', position });
    }
    note(id: string, text: string, position?: [number, number, number]): Node | null {
        return this.sg.graph.addNode({ id, type: 'NoteNode', position, data: { text } });
    }
    widget(id: string, type: 'button' | 'slider' | 'toggle', position?: [number, number, number]): Node | null {
        return this.sg.graph.addNode({ id, type: `${type.charAt(0).toUpperCase() + type.slice(1)}Node`, position });
    }

    // ============= Node Utilities =============
    clone(id: string, newId?: string): Node | null { const orig = this.sg.graph.getNode(id); if (!orig) return null; return this.sg.graph.addNode({ id: newId ?? `${id}-copy`, type: orig.type, label: orig.label, position: [orig.position.x + 50, orig.position.y, orig.position.z + 50], data: { ...orig.data } }); }
    move(id: string, x: number, y: number, z = 0): Node | null { const n = this.sg.graph.getNode(id); if (!n) return null; n.updatePosition(x, y, z); return n; }
    translate(id: string, dx: number, dy: number, dz = 0): Node | null { const n = this.sg.graph.getNode(id); if (!n) return null; n.updatePosition(n.position.x + dx, n.position.y + dy, n.position.z + dz); return n; }
    shift(id: string, dx: number, dy: number, dz = 0): Node | null { return this.translate(id, dx, dy, dz); }
    rotate(id: string, x: number, y: number, z: number): Node | null { const n = this.sg.graph.getNode(id); if (!n) return null; n.updateSpec({ rotation: [x, y, z] }); return n; }
    scale(id: string, x: number, y?: number, z?: number): Node | null { const n = this.sg.graph.getNode(id); if (!n) return null; n.updateSpec({ scale: [x, y ?? x, z ?? x] }); return n; }
    label(id: string, text: string): Node | null { const n = this.sg.graph.getNode(id); if (!n) return null; n.updateSpec({ label: text }); return n; }
    text$(id: string, text: string): Node | null { return this.label(id, text); }
    color(id: string, color: string | number): Node | null { const n = this.sg.graph.getNode(id); if (!n) return null; n.updateSpec({ data: { ...n.data, color } }); return n; }
    fill(id: string, color: string | number): Node | null { return this.color(id, color); }

    // ============= Visibility =============
    show(id: string, visible = true): Node | null { const n = this.sg.graph.getNode(id); if (!n) return null; n.updateSpec({ data: { ...n.data, visible } }); return n; }
    hide(id: string): Node | null { return this.show(id, false); }
    toggleVisibility(nodeId: string): boolean { const n = this.sg.graph.getNode(nodeId); if (!n) return false; const v = !(n.data as Record<string, unknown>).visible; n.updateSpec({ data: { ...n.data, visible: v } }); return v; }
    toggle(nodeId: string): boolean { return this.toggleVisibility(nodeId); }
    opacity(id: string, opacity: number): Node | null { return this.data(id, 'opacity', opacity) as unknown as Node | null; }
    pinned(id: string): Node | null { return this.data(id, 'pinned', true) as unknown as Node | null; }
    unpin(id: string): Node | null { return this.data(id, 'pinned', false) as unknown as Node | null; }
    draggable(id: string, draggable = true): Node | null { return this.data(id, 'draggable', draggable) as unknown as Node | null; }
    selectable(id: string, selectable = true): Node | null { return this.data(id, 'selectable', selectable) as unknown as Node | null; }

    // ============= Data Access =============
    data(id: string, key: string, value?: unknown): unknown { const n = this.sg.graph.getNode(id); if (!n) return undefined; if (value !== undefined) { n.updateSpec({ data: { ...n.data, [key]: value } }); return value; } return n.data[key]; }
    attr(id: string, key: string, value?: unknown): unknown { return this.data(id, key, value); }
    size(id: string, size: number): Node | null { return this.data(id, 'size', size) as unknown as Node | null; }
    width(id: string, width: number): Node | null { return this.data(id, 'width', width) as unknown as Node | null; }
    height(id: string, height: number): Node | null { return this.data(id, 'height', height) as unknown as Node | null; }

    // ============= Position Utilities =============
    position(id: string, x: number, y: number, z = 0): Node | null { return this.move(id, x, y, z); }
    pos(id: string, x: number, y: number, z = 0): Node | null { return this.move(id, x, y, z); }
    cx(id: string, x: number): Node | null { const n = this.sg.graph.getNode(id); if (!n) return null; n.updatePosition(x, n.position.y, n.position.z); return n; }
    cy(id: string, y: number): Node | null { const n = this.sg.graph.getNode(id); if (!n) return null; n.updatePosition(n.position.x, y, n.position.z); return n; }
    cz(id: string, z: number): Node | null { const n = this.sg.graph.getNode(id); if (!n) return null; n.updatePosition(n.position.x, n.position.y, z); return n; }
    center(): { x: number; y: number; z: number } { let x = 0, y = 0, z = 0; this.sg.graph.forEachNode((n) => { x += n.position.x; y += n.position.y; z += n.position.z; }); const n = this.sg.graph.nodes.size || 1; return { x: x / n, y: y / n, z: z / n }; }

    // ============= Selection =============
    select(nodeId: string): this { this.sg.graph.getNode(nodeId)?.focus(); return this; }
    deselect(nodeId: string): this { this.sg.graph.getNode(nodeId)?.blur(); return this; }
    selectAll(): this { this.sg.graph.forEachNode((n) => n.focus()); return this; }
    deselectAll(): this { this.sg.graph.forEachNode((n) => n.blur()); return this; }
    get selected(): Node[] { return this.sg.graph.query((n) => n.focused); }

    // ============= Aggregates =============
    get count(): number { return this.sg.graph.nodes.size; }
    get isEmpty(): boolean { return this.sg.graph.nodes.size === 0; }
    get notEmpty(): boolean { return !this.isEmpty; }
    get bounds(): { min: Node; max: Node } | null { const arr = [...this.sg.graph.nodes.values()]; if (!arr.length) return null; return { min: arr[0], max: arr[arr.length - 1] }; }

    // ============= Chain =============
    then(callback: (ergo: this) => void): this { callback(this); return this; }

    // ============= Edge Shortcuts =============
    edge(source: string, target: string, data?: Record<string, unknown>): Edge | null {
        return this.connect(source, target, data);
    }
    line = this.edge;
    wire = this.edge;
    arrow(source: string, target: string): Edge | null {
        return this.connect(source, target, { arrowhead: true });
    }

    // ============= Layout Shortcuts =============
    layout(type: 'force' | 'grid' | 'circular' | 'tree' | 'radial', options?: Record<string, unknown>): Promise<void> {
        return this.sg.layout(type, options);
    }

    // ============= Camera Shortcuts =============
    fit(padding = 100): this { this.sg.fitView(padding); return this; }
    zoom(): this { this.sg.zoomFit(); return this; }
    resetCamera(): this { this.sg.resetCamera(); return this; }
    focus(id: string, padding = 100): this { this.sg.focusNode(id, padding); return this; }

    // ============= Utility Shortcuts =============
    clear(): void { this.sg.clear(); }
    pause(): void { this.sg.pause(); }
    resume(): void { this.sg.render(); }
    render(): void { this.sg.render(); }
}
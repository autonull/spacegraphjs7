import type * as THREE from 'three';
import type { Edge } from '../edges/Edge';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec, GraphSpec, NodeData, NodeSpec } from '../types';
import { createLogger } from '../utils/logger';
import { safeClone } from '../utils/math';
import { EventEmitter } from './EventEmitter';
import { TypeRegistry } from './TypeRegistry';

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
  getConnectedEdges = this.getEdgesForNode;
  // Iteration helpers - alias for query
  filterNodes = this.query;
  export = this.toJSON;
  fromJSON = this.from;

  constructor(readonly sg?: SpaceGraph) {
    super();
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
    return this.nodes.size === 0 || this.getConnectedComponentCount() === 1;
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
    if (
      'source' in spec &&
      spec.source &&
      typeof spec.source === 'object' &&
      'position' in (spec.source as any)
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

    const type = edgeSpec.type ?? 'Edge';
    const EdgeType = TypeRegistry.getInstance().getEdgeConstructor(type);
    if (!EdgeType) {
      logger.warn('Edge type "%s" not registered.', type);
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
          ? node.updatePosition(updates.position[0], updates.position[1], updates.position[2])
          : undefined,
      });
    }
    this.emitWithTimestamp('node:updated', { node, changes: updates });
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
    this.emitWithTimestamp('graph:cleared', {});
  }

  setPositions(positions: Record<string, [number, number, number]>): void {
    for (const [id, position] of Object.entries(positions)) {
      const node = this.nodes.get(id);
      if (!node) continue;
      node.updatePosition(position[0], position[1], position[2]);
    }
    for (const edge of this.edges.values()) edge.update?.();
    this.sg?.requestFrame?.();
  }

  pinAll(pinned = true): void {
    for (const node of this.nodes.values()) node.setPinned(pinned);
    this.sg?.requestFrame?.();
  }

  // Node lookup shortcuts - ergonomic API
  getNodeCount(): number {
    return this.nodes.size;
  }

  getEdgeCount(): number {
    return this.edges.size;
  }

  // Quick access to node/edge arrays (caches result)
  nodeArray(): Node[] {
    return [...this.nodes.values()];
  }

  edgeArray(): Edge[] {
    return [...this.edges.values()];
  }

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

  queryByType(type: string): Node[] {
    return this.query((node) => node.type === type);
  }

  queryByLabel(label: string, exact = true): Node[] {
    return this.query(
      exact ? (node) => node.label === label : (node) => !!node.label?.includes(label)
    );
  }

  queryByData(predicate: (data: Record<string, unknown>) => boolean): Node[] {
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

  // Neighborhood and edge queries
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
        return true; // Stop iteration
      }
    });
    return found;
  }

  // Spatial queries
  getNodesNear(position: THREE.Vector3, radius: number): Node[] {
    return [...this.nodes.values()].filter(
      (node) => node.position.distanceTo(position) <= radius
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

  // ============= Node Degree Utilities =============
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

  // ============= Connected Component Utilities =============
  getConnectedComponent(startNodeId: string): Node[] {
    const visited = new Set<string>();
    return this.#reachable(this.#linkIndex(), startNodeId, visited)
      .map((id) => this.nodes.get(id))
      .filter((node): node is Node => node !== undefined);
  }

  getConnectedComponentInRadius(
    centerId: string,
    radius: number
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
      (edge) => inRadius.has(edge.source.id) && inRadius.has(edge.target.id)
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

  // ============= Graph Statistics =============
  getStats(): {
    nodes: number;
    edges: number;
    avgDegree: number;
    components: number;
    density: number;
  } {
    const nodeCount = this.nodes.size;
    const edgeCount = this.edges.size;
    const degrees = this.getNodeDegrees();
    const totalDegree = [...degrees.values()].reduce((a, b) => a + b, 0);
    const avgDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
    const density = nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1)) : 0;
    return {
      nodes: nodeCount,
      edges: edgeCount,
      avgDegree,
      components: this.getConnectedComponentCount(),
      density,
    };
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

  from(spec: GraphSpec): void {
    this.clear();
    if (spec.nodes) for (const nodeSpec of spec.nodes) this.addNode(nodeSpec);
    if (spec.edges) for (const edgeSpec of spec.edges) this.addEdge(edgeSpec);
  }

  // ============= Traversal =============
  traverse(callback: (node: Node, depth: number) => void, startId?: string): void {
    const links = this.#linkIndex();
    const visited = new Set<string>();
    const traverseRecursive = (nodeId: string, depth: number) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = this.nodes.get(nodeId);
      if (!node) return;
      callback(node, depth);
      for (const neighbor of links.get(nodeId) ?? []) traverseRecursive(neighbor.id, depth + 1);
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
      }
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

  /**
   * Walk the graph breadth first from a set of starting nodes. The visitor sees every node the
   * walk reaches, with the depth it sits at and the node it was reached from; returning a value
   * stops the walk and hands that value back.
   */
  #walkBreadthFirst<T>(
    starts: readonly Node[],
    links: ReadonlyMap<string, Node[]>,
    visit: (node: Node, depth: number, from: Node | null) => T | undefined
  ): T | undefined {
    const visited = new Set<string>();
    const queue: Array<{ node: Node; depth: number; from: Node | null }> = starts.map((node) => ({
      node,
      depth: 0,
      from: null,
    }));

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

  // ============= Snapshot/Restore =============
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

  // ============= Node Queries =============
  getNodesByData(predicate: (data: NodeData) => boolean): Node[] {
    return this.query((node) => predicate(node.data));
  }

  getNodesByType(type: string): Node[] {
    return this.queryByType(type);
  }

  getNodesByLabelPrefix(prefix: string): Node[] {
    return this.queryByLabel(prefix, false);
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

  // ============= Batch Operations =============
  batchUpdate(fn: (graph: Graph) => void): void {
    fn(this);
  }

  addNodes(specs: NodeSpec[]): Node[] {
    return specs.map((s) => this.addNode(s)).filter(Boolean) as Node[];
  }

  addEdges(specs: EdgeSpec[]): Edge[] {
    return specs.map((s) => this.addEdge(s)).filter(Boolean) as Edge[];
  }

  // ============= Removal Utilities =============
  removeNodesByType(type: string): number {
    return this.#removeNodes(this.queryByType(type));
  }

  removeNodesByData(predicate: (data: NodeData) => boolean): number {
    return this.#removeNodes(this.getNodesByData(predicate));
  }

  /** Remove a set of nodes and report how many went. */
  #removeNodes(nodes: Node[]): number {
    nodes.forEach((node) => this.removeNode(node.id));
    return nodes.length;
  }

  // ============= Graph Merge =============
  merge(other: Graph): void {
    for (const node of other.nodes.values()) {
      if (!this.nodes.has(node.id)) this.addNode({ ...node.toJSON() });
    }
    for (const edge of other.edges.values()) {
      if (!this.edges.has(edge.id)) {
        const source = this.nodes.get(edge.source.id);
        const target = this.nodes.get(edge.target.id);
        if (source && target) this.addEdge({ ...(edge.toJSON() as EdgeSpec) });
      }
    }
  }

  /** @internal Helper for edge iteration with filtering */
  private forEachMatchingEdge(
    nodeId: string,
    direction: EdgeDirection,
    callback: (edge: Edge, isSource: boolean) => void | boolean
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

  /**
   * The nodes each node links to, in both directions. One index serves every traversal, so a walk
   * costs one pass over the edges instead of one pass per node it visits.
   */
  #linkIndex(): Map<string, Node[]> {
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
    return links;
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

  // ============= Shared Calculations =============
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

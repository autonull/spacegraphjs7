import type { NodeSpec, EdgeSpec, GraphSpec, GraphExport } from './types';
import type { Node } from './Node';
import type { Edge } from './Edge';
import { TypeRegistry } from '../core/TypeRegistry';

export type GraphEventMap = {
  'node:added': { node: Node; timestamp: number };
  'node:removed': { id: string; timestamp: number };
  'node:updated': { node: Node; changes: Partial<NodeSpec>; timestamp: number };
  'edge:added': { edge: Edge; timestamp: number };
  'edge:removed': { id: string; timestamp: number };
  'edge:updated': { edge: Edge; changes: Partial<EdgeSpec>; timestamp: number };
};

type GraphEventHandler<T extends keyof GraphEventMap> = (event: GraphEventMap[T]) => void;

export class Graph {
  private readonly nodes = new Map<string, Node>();
  private readonly edges = new Map<string, Edge>();
  private readonly eventHandlers = new Map<keyof GraphEventMap, Set<GraphEventHandler<any>>>();

  on<T extends keyof GraphEventMap>(event: T, handler: GraphEventHandler<T>): { dispose(): void } {
    const handlers = this.eventHandlers.get(event) ?? new Set();
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, handlers);
    }
    handlers.add(handler);
    return { dispose: () => handlers.delete(handler) };
  }

  private emit<T extends keyof GraphEventMap>(event: T, data: Omit<GraphEventMap[T], 'timestamp'>): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler({ ...data, timestamp: Date.now() } as GraphEventMap[T]);
      } catch (err) {
        console.error(`[Graph] Event handler for ${event} failed:`, err);
      }
    });
  }

  addNode(node: Node): void {
    if (this.nodes.has(node.id)) {
      this.removeNode(node.id);
    }
    this.nodes.set(node.id, node);
    this.emit('node:added', { node });
  }

  updateNode(id: string, updates: Partial<NodeSpec>): Node | null {
    const node = this.nodes.get(id);
    if (!node) return null;
    node.update(updates);
    this.emit('node:updated', { node, changes: updates });
    return node;
  }

  removeNode(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;

    this.getConnectedEdges(id).forEach(edge => this.removeEdge(edge.id));
    node.dispose();
    this.nodes.delete(id);
    this.emit('node:removed', { id });
  }

  addEdge(edge: Edge): void {
    if (this.edges.has(edge.id)) {
      this.removeEdge(edge.id);
    }
    this.edges.set(edge.id, edge);
    this.emit('edge:added', { edge });
  }

  updateEdge(id: string, updates: Partial<EdgeSpec>): Edge | null {
    const edge = this.edges.get(id);
    if (!edge) return null;
    edge.update(updates);
    this.emit('edge:updated', { edge, changes: updates });
    return edge;
  }

  removeEdge(id: string): void {
    const edge = this.edges.get(id);
    if (!edge) return;
    edge.dispose();
    this.edges.delete(id);
    this.emit('edge:removed', { id });
  }

  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  getEdge(id: string): Edge | undefined {
    return this.edges.get(id);
  }

  getNodes(): IterableIterator<Node> {
    return this.nodes.values();
  }

  getEdges(): IterableIterator<Edge> {
    return this.edges.values();
  }

  getConnectedEdges(nodeId: string): Edge[] {
    return Array.from(this.edges.values()).filter(
      edge => edge.source.id === nodeId || edge.target.id === nodeId
    );
  }

  getNeighbors(nodeId: string): Node[] {
    const neighborIds = new Set<string>();
    for (const edge of this.edges.values()) {
      neighborIds.add(edge.source.id === nodeId ? edge.target.id : edge.source.id);
    }
    return Array.from(neighborIds).map(id => this.nodes.get(id)).filter((n): n is Node => !!n);
  }

  getIncomingEdges(nodeId: string): Edge[] {
    return Array.from(this.edges.values()).filter(edge => edge.target.id === nodeId);
  }

  getOutgoingEdges(nodeId: string): Edge[] {
    return Array.from(this.edges.values()).filter(edge => edge.source.id === nodeId);
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  hasEdge(id: string): boolean {
    return this.edges.has(id);
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  getEdgeCount(): number {
    return this.edges.size;
  }

  queryNodes(predicate: (node: Node) => boolean): Node[] {
    return Array.from(this.nodes.values()).filter(predicate);
  }

  queryEdges(predicate: (edge: Edge) => boolean): Edge[] {
    return Array.from(this.edges.values()).filter(predicate);
  }

  toJSON(): GraphSpec {
    return {
      nodes: Array.from(this.nodes.values()).map(n => n.toJSON()),
      edges: Array.from(this.edges.values()).map(e => e.toJSON())
    };
  }

  fromJSON(spec: GraphSpec): void {
    this.clear();
    const registry = TypeRegistry.getInstance();

    for (const nodeSpec of spec.nodes ?? []) {
      try {
        this.addNode(registry.createNode(nodeSpec));
      } catch (err) {
        console.error(`[Graph] Failed to create node "${nodeSpec.id}":`, err);
      }
    }

    for (const edgeSpec of spec.edges ?? []) {
      try {
        const source = this.getNode(edgeSpec.source);
        const target = this.getNode(edgeSpec.target);
        if (!source || !target) {
          console.warn(`[Graph] Edge "${edgeSpec.id}" rejected: missing source or target.`);
          continue;
        }
        this.addEdge(registry.createEdge(edgeSpec, source, target));
      } catch (err) {
        console.error(`[Graph] Failed to create edge "${edgeSpec.id}":`, err);
      }
    }
  }

  export(): GraphExport {
    return {
      nodes: Array.from(this.nodes.values()).map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
        position: [n.position.x, n.position.y, n.position.z] as [number, number, number],
        data: n.data
      })),
      edges: Array.from(this.edges.values()).map(e => ({
        id: e.id,
        source: e.source.id,
        target: e.target.id,
        type: e.type,
        data: e.data
      }))
    };
  }

  clear(): void {
    for (const edge of this.edges.values()) edge.dispose();
    this.edges.clear();
    for (const node of this.nodes.values()) node.dispose();
    this.nodes.clear();
  }
}

// SpaceGraphJS v7.0 - Graph Module
// Pure data structure with no framework dependencies

import type { NodeSpec, EdgeSpec, GraphSpec, GraphExport, NodeData, EdgeData } from './types';
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

export type GraphEventHandler<T extends keyof GraphEventMap> = (
  event: GraphEventMap[T]
) => void;

export class Graph {
  private nodes: Map<string, Node> = new Map();
  private edges: Map<string, Edge> = new Map();
  private eventHandlers: Map<keyof GraphEventMap, Set<GraphEventHandler<any>>> = new Map();

  /**
   * Subscribe to graph events
   */
  on<T extends keyof GraphEventMap>(event: T, handler: GraphEventHandler<T>): { dispose(): void } {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    return {
      dispose: () => {
        this.eventHandlers.get(event)?.delete(handler);
      }
    };
  }

  /**
   * Emit an event to all registered handlers
   */
  private emit<T extends keyof GraphEventMap>(event: T, data: Omit<GraphEventMap[T], 'timestamp'>): void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) return;

    const timestamp = Date.now();
    const eventWithTime = { ...data, timestamp } as GraphEventMap[T];

    handlers.forEach(handler => {
      try {
        handler(eventWithTime);
      } catch (err) {
        console.error(`[Graph] Event handler for ${event} failed:`, err);
      }
    });
  }

  // ==================== Node Operations ====================

  /**
   * Add a node to the graph
   */
  addNode(node: Node): void {
    if (this.nodes.has(node.id)) {
      console.warn(`[Graph] Node with id "${node.id}" already exists. Updating instead.`);
      this.removeNode(node.id);
    }

    this.nodes.set(node.id, node);
    this.emit('node:added', { node });
  }

  /**
   * Update a node's data
   */
  updateNode(id: string, updates: Partial<NodeSpec>): Node | null {
    const node = this.nodes.get(id);
    if (!node) {
      console.warn(`[Graph] Cannot update node "${id}": not found.`);
      return null;
    }

    node.update(updates);
    this.emit('node:updated', { node, changes: updates });
    return node;
  }

  /**
   * Remove a node from the graph
   */
  removeNode(id: string): void {
    const node = this.nodes.get(id);
    if (!node) {
      console.warn(`[Graph] Cannot remove node "${id}": not found.`);
      return;
    }

    // Remove connected edges first
    const connectedEdges = this.getConnectedEdges(id);
    connectedEdges.forEach(edge => {
      this.removeEdge(edge.id);
    });

    node.dispose();
    this.nodes.delete(id);
    this.emit('node:removed', { id });
  }

  // ==================== Edge Operations ====================

  /**
   * Add an edge to the graph
   */
  addEdge(edge: Edge): void {
    if (this.edges.has(edge.id)) {
      console.warn(`[Graph] Edge with id "${edge.id}" already exists. Updating instead.`);
      this.removeEdge(edge.id);
    }

    this.edges.set(edge.id, edge);
    this.emit('edge:added', { edge });
  }

  /**
   * Update an edge's data
   */
  updateEdge(id: string, updates: Partial<EdgeSpec>): Edge | null {
    const edge = this.edges.get(id);
    if (!edge) {
      console.warn(`[Graph] Cannot update edge "${id}": not found.`);
      return null;
    }

    edge.update(updates);
    this.emit('edge:updated', { edge, changes: updates });
    return edge;
  }

  /**
   * Remove an edge from the graph
   */
  removeEdge(id: string): void {
    const edge = this.edges.get(id);
    if (!edge) {
      console.warn(`[Graph] Cannot remove edge "${id}": not found.`);
      return;
    }

    edge.dispose();
    this.edges.delete(id);
    this.emit('edge:removed', { id });
  }

  // ==================== Query Operations ====================

  /**
   * Get a node by ID
   */
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get an edge by ID
   */
  getEdge(id: string): Edge | undefined {
    return this.edges.get(id);
  }

  /**
   * Get all nodes
   */
  getNodes(): IterableIterator<Node> {
    return this.nodes.values();
  }

  /**
   * Get all edges
   */
  getEdges(): IterableIterator<Edge> {
    return this.edges.values();
  }

  /**
   * Get all edges connected to a node
   */
  getConnectedEdges(nodeId: string): Edge[] {
    const result: Edge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.source.id === nodeId || edge.target.id === nodeId) {
        result.push(edge);
      }
    }
    return result;
  }

  /**
   * Get all neighbor nodes of a given node
   */
  getNeighbors(nodeId: string): Node[] {
    const neighborIds = new Set<string>();
    
    for (const edge of this.edges.values()) {
      if (edge.source.id === nodeId) {
        neighborIds.add(edge.target.id);
      } else if (edge.target.id === nodeId) {
        neighborIds.add(edge.source.id);
      }
    }

    const neighbors: Node[] = [];
    neighborIds.forEach(id => {
      const node = this.nodes.get(id);
      if (node) neighbors.push(node);
    });

    return neighbors;
  }

  /**
   * Get incoming edges to a node
   */
  getIncomingEdges(nodeId: string): Edge[] {
    const result: Edge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.target.id === nodeId) {
        result.push(edge);
      }
    }
    return result;
  }

  /**
   * Get outgoing edges from a node
   */
  getOutgoingEdges(nodeId: string): Edge[] {
    const result: Edge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.source.id === nodeId) {
        result.push(edge);
      }
    }
    return result;
  }

  // ==================== Utility Methods ====================

  /**
   * Check if a node exists
   */
  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  /**
   * Check if an edge exists
   */
  hasEdge(id: string): boolean {
    return this.edges.has(id);
  }

  /**
   * Get node count
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Get edge count
   */
  getEdgeCount(): number {
    return this.edges.size;
  }

  /**
   * Query nodes by predicate
   */
  queryNodes(predicate: (node: Node) => boolean): Node[] {
    return Array.from(this.nodes.values()).filter(predicate);
  }

  /**
   * Query edges by predicate
   */
  queryEdges(predicate: (edge: Edge) => boolean): Edge[] {
    return Array.from(this.edges.values()).filter(predicate);
  }

  // ==================== Serialization ====================

  /**
   * Export graph to JSON spec
   */
  toJSON(): GraphSpec {
    return {
      nodes: Array.from(this.nodes.values()).map(node => node.toJSON()),
      edges: Array.from(this.edges.values()).map(edge => edge.toJSON())
    };
  }

  /**
   * Import graph from JSON spec
   */
  fromJSON(spec: GraphSpec): void {
    this.clear();
    
    const registry = TypeRegistry.getInstance();
    
    spec.nodes?.forEach(nodeSpec => {
      try {
        const node = registry.createNode(nodeSpec);
        this.addNode(node);
      } catch (err) {
        console.error(`[Graph] Failed to create node "${nodeSpec.id}":`, err);
      }
    });

    spec.edges?.forEach(edgeSpec => {
      try {
        const source = this.getNode(edgeSpec.source);
        const target = this.getNode(edgeSpec.target);
        
        if (!source || !target) {
          console.warn(`[Graph] Edge "${edgeSpec.id}" rejected: missing source or target node.`);
          return;
        }
        
        const edge = registry.createEdge(edgeSpec, source, target);
        this.addEdge(edge);
      } catch (err) {
        console.error(`[Graph] Failed to create edge "${edgeSpec.id}":`, err);
      }
    });
  }

  /**
   * Export graph with additional metadata
   */
  export(): GraphExport {
    return {
      nodes: Array.from(this.nodes.values()).map(node => ({
        id: node.id,
        type: node.type,
        label: node.label,
        position: [node.position.x, node.position.y, node.position.z] as [number, number, number],
        data: node.data
      })),
      edges: Array.from(this.edges.values()).map(edge => ({
        id: edge.id,
        source: edge.source.id,
        target: edge.target.id,
        type: edge.type,
        data: edge.data
      }))
    };
  }

  /**
   * Clear all nodes and edges
   */
  clear(): void {
    // Dispose all edges first
    for (const edge of this.edges.values()) {
      edge.dispose();
    }
    this.edges.clear();

    // Dispose all nodes
    for (const node of this.nodes.values()) {
      node.dispose();
    }
    this.nodes.clear();
  }
}

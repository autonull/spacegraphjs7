import type { NodeSpec, EdgeSpec, GraphSpec, GraphExport } from '../types';
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import type { SpaceGraph } from '../SpaceGraph';
import { createLogger } from '../utils/logger';
import { safeClone } from '../utils/math';
import { TypeRegistry } from './TypeRegistry';
import { EventEmitter } from './EventEmitter';

const logger = createLogger('Graph');

type GraphEventMap = {
  'node:added': { node: Node; timestamp: number };
  'node:removed': { id: string; timestamp: number };
  'node:updated': { node: Node; changes: Partial<NodeSpec>; timestamp: number };
  'edge:added': { edge: Edge; timestamp: number };
  'edge:removed': { id: string; timestamp: number };
  'edge:updated': { edge: Edge; changes: Partial<EdgeSpec>; timestamp: number };
};

export type EdgeDirection = 'incoming' | 'outgoing' | 'both';

export class Graph extends EventEmitter<GraphEventMap> {
  readonly nodes: Map<string, Node> = new Map();
  readonly edges: Map<string, Edge> = new Map();

  constructor(readonly sg: SpaceGraph) {
    super();
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
    if ('source' in spec && (spec as any).source instanceof Object && 'position' in (spec as any).source) {
      return this._addEdge((spec as Edge).id, spec as Edge);
    }

    const edgeSpec = spec as EdgeSpec;
    if (!edgeSpec?.id || typeof edgeSpec.source !== 'string' || typeof edgeSpec.target !== 'string') {
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

    const EdgeType = TypeRegistry.getInstance().getEdgeConstructor(edgeSpec.type ?? 'Edge');
    if (!EdgeType) {
      logger.warn('Edge type "%s" not registered.', edgeSpec.type);
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
    this.edges.forEach(edge => edge.dispose?.());
    this.nodes.forEach(node => node.dispose?.());
    this.edges.clear();
    this.nodes.clear();
  }

  // Query methods
  getNode(id: string): Node | undefined { return this.nodes.get(id); }
  getEdge(id: string): Edge | undefined { return this.edges.get(id); }
  hasNode(id: string): boolean { return this.nodes.has(id); }
  hasEdge(id: string): boolean { return this.edges.has(id); }
  getNodeCount(): number { return this.nodes.size; }
  getEdgeCount(): number { return this.edges.size; }
  getNodes(): IterableIterator<Node> { return this.nodes.values(); }
  getEdges(): IterableIterator<Edge> { return this.edges.values(); }
  nodeArray(): Node[] { return [...this.nodes.values()]; }
  edgeArray(): Edge[] { return [...this.edges.values()]; }

  // Query helpers
  query(predicate: (node: Node) => boolean): Node[] { return this.nodeArray().filter(predicate); }
  queryByType(type: string): Node[] { return this.nodeArray().filter(n => n.type === type); }
  queryByLabel(label: string, exact = true): Node[] {
    return this.nodeArray().filter(n => exact ? n.label === label : n.label?.includes(label));
  }
  queryByData(predicate: (data: Record<string, unknown>) => boolean): Node[] {
    return this.nodeArray().filter(n => predicate(n.data));
  }
  findNode(predicate: (node: Node) => boolean): Node | undefined { return this.nodeArray().find(predicate); }
  findEdge(predicate: (edge: Edge) => boolean): Edge | undefined { return this.edgeArray().find(predicate); }

  // Neighborhood queries
  getNeighbors(nodeId: string, direction: EdgeDirection = 'both'): Node[] {
    const neighbors = new Set<Node>();
    for (const edge of this.edges.values()) {
      const isSource = edge.source.id === nodeId;
      const isTarget = edge.target.id === nodeId;
      if (direction === 'both' && (isSource || isTarget)) {
        neighbors.add(isSource ? edge.target : edge.source);
      } else if (direction === 'outgoing' && isSource) {
        neighbors.add(edge.target);
      } else if (direction === 'incoming' && isTarget) {
        neighbors.add(edge.source);
      }
    }
    return [...neighbors];
  }

  getEdgesForNode(nodeId: string, direction: EdgeDirection = 'both'): Edge[] {
    return this.edgeArray().filter(({ source, target }) => {
      const isSource = source.id === nodeId;
      const isTarget = target.id === nodeId;
      return direction === 'both' ? isSource || isTarget : direction === 'outgoing' ? isSource : isTarget;
    });
  }

  // Convenience aliases
  neighbors(nodeId: string): Node[] { return this.getNeighbors(nodeId, 'both'); }
  getConnectedEdges(nodeId: string): Edge[] { return this.getEdgesForNode(nodeId, 'both'); }
  getIncomingEdges(nodeId: string): Edge[] { return this.getEdgesForNode(nodeId, 'incoming'); }
  getOutgoingEdges(nodeId: string): Edge[] { return this.getEdgesForNode(nodeId, 'outgoing'); }

  // Iteration
  forEachNode(callback: (node: Node) => void): void { this.nodeArray().forEach(callback); }
  forEachEdge(callback: (edge: Edge) => void): void { this.edgeArray().forEach(callback); }
  iteratorNodes(): IterableIterator<Node> { return this.nodes.values(); }
  iteratorEdges(): IterableIterator<Edge> { return this.edges.values(); }

  // Serialization
  toJSON(): GraphSpec {
    return {
      nodes: [...this.nodes.values()].map(({ id, type, label, position, data }) => ({
        id, type, label, position: [position.x, position.y, position.z] as [number, number, number],
        data: data ? safeClone(data) : {},
      })),
      edges: [...this.edges.values()].map(({ id, source, target, type, data }) => ({
        id, source: source.id, target: target.id, type: type ?? 'Edge',
        data: data ? safeClone(data) : {},
      })),
    };
  }

  export(): GraphExport { return this.toJSON() as GraphExport; }

  from(spec: GraphSpec): void {
    this.clear();
    if (spec.nodes) for (const nodeSpec of spec.nodes) this.addNode(nodeSpec);
    if (spec.edges) for (const edgeSpec of spec.edges) this.addEdge(edgeSpec);
  }

  fromJSON = this.from;

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

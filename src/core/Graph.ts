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

type EdgeDirection = 'incoming' | 'outgoing' | 'both';

export class Graph extends EventEmitter<GraphEventMap> {
    readonly sg: SpaceGraph;
    readonly nodes: Map<string, Node> = new Map();
    readonly edges: Map<string, Edge> = new Map();

    constructor(sg: SpaceGraph) { super(); this.sg = sg; }

    registerNodeType(type: string, ctor: import('./TypeRegistry').NodeConstructor): void { TypeRegistry.getInstance().registerNode(type, ctor); }
    registerEdgeType(type: string, ctor: import('./TypeRegistry').EdgeConstructor): void { TypeRegistry.getInstance().registerEdge(type, ctor); }

    addNode(specOrNode: NodeSpec | Node): Node | null {
        if ('updatePosition' in specOrNode) return this._addNode((specOrNode as Node).id, specOrNode as Node);

        const spec = specOrNode as NodeSpec;
        if (this.nodes.has(spec.id)) return this.updateNode(spec.id, spec);

        const NodeType = TypeRegistry.getInstance().getNodeConstructor(spec.type);
        if (!NodeType) { logger.warn('Node type "%s" not registered.', spec.type); return null; }

        return this._addNode(spec.id, new NodeType(this.sg, spec));
    }

    private _addNode(id: string, node: Node): Node {
        this.nodes.set(id, node);
        this.sg?.renderer.scene.add(node.object);
        node.start();
        this.emitWithTimestamp('node:added', { node });
        return node;
    }

    updateNode(id: string, updates: Partial<NodeSpec>): Node | null {
        const node = this.nodes.get(id);
        if (!node) return null;
        typeof node.updateSpec === 'function' ? node.updateSpec(updates) : Object.assign(node, {
            data: { ...node.data, ...updates.data },
            position: updates.position ? node.updatePosition(updates.position[0], updates.position[1], updates.position[2]) : undefined,
        });
        return node;
    }

    addEdge(specOrEdge: EdgeSpec | Edge): Edge | null {
        if ('source' in specOrEdge && specOrEdge.source instanceof Object && 'position' in specOrEdge.source)
            return this._addEdge((specOrEdge as Edge).id, specOrEdge as Edge);

        const spec = specOrEdge as EdgeSpec;
        if (!spec?.id || typeof spec.source !== 'string' || typeof spec.target !== 'string')
            { logger.warn('Edge missing critical topology attributes (id/source/target).'); return null; }
        if (this.edges.has(spec.id)) return this.updateEdge(spec.id, spec);

        const sourceNode = this.nodes.get(spec.source);
        const targetNode = this.nodes.get(spec.target);
        if (!sourceNode || !targetNode) { logger.warn('Edge "%s" rejected: missing source or target node.', spec.id); return null; }

        const EdgeType = TypeRegistry.getInstance().getEdgeConstructor(spec.type ?? 'Edge');
        if (!EdgeType) { logger.warn('Edge type "%s" not registered.', spec.type); return null; }

        return this._addEdge(spec.id, new EdgeType(this.sg, spec, sourceNode, targetNode));
    }

    private _addEdge(id: string, edge: Edge): Edge {
        this.edges.set(id, edge);
        this.sg?.renderer.scene.add(edge.line);
        edge.start();
        this.emitWithTimestamp('edge:added', { edge });
        return edge;
    }

    updateEdge(id: string, updates: Partial<EdgeSpec>): Edge | null {
        const edge = this.edges.get(id);
        if (!edge) return null;
        if (typeof edge.updateSpec === 'function') edge.updateSpec(updates);
        else if (updates.data) edge.data = { ...edge.data, ...updates.data };

        if (updates.source || updates.target) {
            const sourceNode = this.nodes.get(updates.source ?? edge.source.id);
            const targetNode = this.nodes.get(updates.target ?? edge.target.id);
            if (sourceNode && targetNode) { edge.source = sourceNode; edge.target = targetNode; edge.update(); }
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
            if (edge.source.id === id || edge.target.id === id) { this.emitWithTimestamp('edge:removed', { id: edgeId }); edge.dispose?.(); this.edges.delete(edgeId); }
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
    }

    iteratorNodes(): IterableIterator<Node> { return this.nodes.values(); }
    iteratorEdges(): IterableIterator<Edge> { return this.edges.values(); }
    getNode(id: string): Node | undefined { return this.nodes.get(id); }
    getNodes(): IterableIterator<Node> { return this.nodes.values(); }
    getEdges(): IterableIterator<Edge> { return this.edges.values(); }
    getEdge(id: string): Edge | undefined { return this.edges.get(id); }
    hasNode(id: string): boolean { return this.nodes.has(id); }
    hasEdge(id: string): boolean { return this.edges.has(id); }
    getNodeCount(): number { return this.nodes.size; }
    getEdgeCount(): number { return this.edges.size; }

    nodeArray(): Node[] { return [...this.nodes.values()]; }
    edgeArray(): Edge[] { return [...this.edges.values()]; }

    query(predicate: (node: Node) => boolean): Node[] { return this.nodeArray().filter(predicate); }
    queryByType(type: string): Node[] { return this.nodeArray().filter((n) => n.type === type); }
    queryByLabel(label: string, exact = true): Node[] {
        return this.nodeArray().filter((n) => exact ? n.label === label : n.label?.includes(label));
    }
    queryByData(predicate: (data: Record<string, unknown>) => boolean): Node[] {
        return this.nodeArray().filter((n) => predicate(n.data));
    }

    getNeighbors(nodeId: string, direction: EdgeDirection = 'both'): Node[] {
        const neighborSet = new Set<Node>();
        for (const edge of this.edges.values()) {
            const isSource = edge.source.id === nodeId;
            const isTarget = edge.target.id === nodeId;
            if (direction === 'both' && (isSource || isTarget)) neighborSet.add(isSource ? edge.target : edge.source);
            else if (direction === 'outgoing' && isSource) neighborSet.add(edge.target);
            else if (direction === 'incoming' && isTarget) neighborSet.add(edge.source);
        }
        return [...neighborSet];
    }

    getEdgesForNode(nodeId: string, direction: EdgeDirection = 'both'): Edge[] {
        return this.edgeArray().filter(({ source, target }) => {
            const isSource = source.id === nodeId;
            const isTarget = target.id === nodeId;
            return direction === 'both' ? isSource || isTarget : direction === 'outgoing' ? isSource : isTarget;
        });
    }

    findNode(predicate: (node: Node) => boolean): Node | undefined { return this.nodeArray().find(predicate); }
    findEdge(predicate: (edge: Edge) => boolean): Edge | undefined { return this.edgeArray().find(predicate); }

    forEachNode(callback: (node: Node) => void): void { this.nodeArray().forEach(callback); }
    forEachEdge(callback: (edge: Edge) => void): void { this.edgeArray().forEach(callback); }

    neighbors(nodeId: string): Node[] { return this.getNeighbors(nodeId, 'both'); }
    getConnectedEdges(nodeId: string): Edge[] { return this.getEdgesForNode(nodeId, 'both'); }
    getIncomingEdges(nodeId: string): Edge[] { return this.getEdgesForNode(nodeId, 'incoming'); }
    getOutgoingEdges(nodeId: string): Edge[] { return this.getEdgesForNode(nodeId, 'outgoing'); }

    toJSON(): GraphSpec {
        return {
            nodes: [...this.nodes.values()].map(({ id, type, label, position, data }) => ({
                id, type, label, position: [position.x, position.y, position.z] as [number, number, number], data: data ? safeClone(data) : {} ,
            })),
            edges: [...this.edges.values()].map(({ id, source, target, type, data }) => ({
                id, source: source.id, target: target.id, type: type ?? 'Edge', data: data ? safeClone(data) : {} ,
            })),
        };
    }

    export(): GraphExport { return this.toJSON() as GraphExport; }
    from(spec: GraphSpec): void { this.clear(); if (spec.nodes) for (const nodeSpec of spec.nodes) this.addNode(nodeSpec); if (spec.edges) for (const edgeSpec of spec.edges) this.addEdge(edgeSpec); }
    fromJSON = this.from;
}

import { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, EdgeSpec, GraphSpec } from '../types';
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';

type PluginHook = 'onNodeAdded' | 'onNodeRemoved' | 'onEdgeAdded' | 'onEdgeRemoved';

export class Graph {
    public sg: SpaceGraph;
    public nodes: Map<string, Node> = new Map();
    public edges: Edge[] = [];

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    private _notifyPlugins(hookName: PluginHook, arg: Node | Edge | string): void {
        for (const plugin of this.sg.pluginManager.plugins.values()) {
            const hook = plugin[hookName];
            if (typeof hook === 'function') {
                try {
                    hook(arg);
                } catch (err) {
                    console.error(
                        `[SpaceGraph] Plugin ${plugin.constructor.name} failed ${hookName}:`,
                        err,
                    );
                }
            }
        }
    }

    private _removeFromScene(obj: Node | Edge | null): void {
        if (obj?.object?.parent) {
            this.sg.renderer.scene.remove(obj.object);
        }
    }

    addNode(spec: NodeSpec): Node | null {
        if (this.nodes.has(spec.id)) {
            return this.updateNode(spec.id, spec);
        }

        const NodeType = this.sg.pluginManager.getNodeType(spec.type);
        if (!NodeType) {
            console.warn(`[SpaceGraph] Node type "${spec.type}" not registered.`);
            return null;
        }
        const node = new NodeType(this.sg, spec);
        this.nodes.set(spec.id, node);
        this.sg.renderer.scene.add(node.object);
        this.sg.events.emit('node:added', { node });
        this._notifyPlugins('onNodeAdded', node);
        return node;
    }

    updateNode(id: string, updates: Partial<NodeSpec>): Node | null {
        const node = this.nodes.get(id);
        if (!node) return null;

        if (typeof node.updateSpec === 'function') {
            node.updateSpec(updates);
        } else {
            if (updates.data) node.data = { ...node.data, ...updates.data };
            if (updates.position)
                node.updatePosition(updates.position[0], updates.position[1], updates.position[2]);
        }

        return node;
    }

    private findNodeAcrossInstances(nodeId: string): Node | null {
        for (const inst of SpaceGraph.instances) {
            if (inst.graph.nodes.has(nodeId)) {
                return inst.graph.nodes.get(nodeId) ?? null;
            }
        }
        return null;
    }

    addEdge(spec: EdgeSpec): Edge | null {
        if (!spec?.id || typeof spec.source !== 'string' || typeof spec.target !== 'string') {
            console.warn(
                '[SpaceGraph] Edge missing critical topology attributes (id/source/target).',
            );
            return null;
        }

        const existingIndex = this.edges.findIndex((e) => e.id === spec.id);
        if (existingIndex !== -1) {
            return this.updateEdge(spec.id, spec);
        }

        const sourceNode = this.nodes.get(spec.source) ?? this.findNodeAcrossInstances(spec.source);
        const targetNode = this.nodes.get(spec.target) ?? this.findNodeAcrossInstances(spec.target);

        if (!sourceNode || !targetNode) {
            console.warn(`[SpaceGraph] Edge "${spec.id}" rejected: missing source or target node.`);
            return null;
        }

        let EdgeType = this.sg.pluginManager.getEdgeType(spec.type);
        if (!EdgeType) {
            console.warn(`[SpaceGraph] Edge type "${spec.type}" not registered.`);
            return null;
        }

        const isInterGraph = sourceNode.sg !== targetNode.sg;
        if (isInterGraph) {
            const InterGraphEdgeClass = this.sg.pluginManager.getEdgeType('InterGraphEdge');
            if (InterGraphEdgeClass) {
                EdgeType = InterGraphEdgeClass;
            } else {
                console.warn(
                    '[SpaceGraph] InterGraphEdge not registered. Falling back to default edge.',
                );
            }
        }

        const edge = new EdgeType(this.sg, spec, sourceNode, targetNode);
        if (isInterGraph) {
            (edge as Edge & { isInterGraphEdge: boolean }).isInterGraphEdge = true;
        } else {
            this.sg.renderer.scene.add(edge.object);
        }

        this.edges.push(edge);
        this.sg.events.emit('edge:added', { edge });
        this._notifyPlugins('onEdgeAdded', edge);
        return edge;
    }

    updateEdge(id: string, updates: Partial<EdgeSpec>): Edge | null {
        const edge = this.edges.find((e) => e.id === id);
        if (!edge) return null;

        if (typeof edge.updateSpec === 'function') {
            edge.updateSpec(updates);
        } else {
            if (updates.data) edge.data = { ...edge.data, ...updates.data };
        }

        if (updates.source || updates.target) {
            const sourceNode = this.nodes.get(updates.source ?? edge.source.id);
            const targetNode = this.nodes.get(updates.target ?? edge.target.id);
            if (sourceNode && targetNode) {
                edge.source = sourceNode;
                edge.target = targetNode;
                edge.update();
            }
        }

        return edge;
    }

    removeNode(id: string): void {
        const node = this.nodes.get(id);
        if (!node) return;

        this._removeFromScene(node);
        this.nodes.delete(id);
        this.sg.events.emit('node:removed', { id });
        this._notifyPlugins('onNodeRemoved', id);

        for (let i = this.edges.length - 1; i >= 0; i--) {
            const edge = this.edges[i];
            if (edge.source.id === id || edge.target.id === id) {
                this._removeFromScene(edge);
                this.sg.events.emit('edge:removed', { id: edge.id });
                this._notifyPlugins('onEdgeRemoved', edge.id);
                edge.dispose?.();
                this.edges.splice(i, 1);
            }
        }

        node.dispose?.();
    }

    removeEdge(id: string): void {
        const index = this.edges.findIndex((edge) => edge.id === id);
        if (index === -1) return;

        const edge = this.edges[index];
        this._removeFromScene(edge);
        this.edges.splice(index, 1);
        this.sg.events.emit('edge:removed', { id });
        this._notifyPlugins('onEdgeRemoved', id);
        edge.dispose?.();
    }

    clear(): void {
        this.edges.forEach((edge) => {
            this._removeFromScene(edge);
            edge.dispose?.();
        });
        this.nodes.forEach((node) => {
            this._removeFromScene(node);
            node.dispose?.();
        });
        this.edges = [];
        this.nodes.clear();
    }

    getNode(id: string): Node | undefined {
        return this.nodes.get(id);
    }

    getEdge(id: string): Edge | undefined {
        return this.edges.find((e) => e.id === id);
    }

    hasNode(id: string): boolean {
        return this.nodes.has(id);
    }

    hasEdge(id: string): boolean {
        return this.edges.some((e) => e.id === id);
    }

    getNodeCount(): number {
        return this.nodes.size;
    }

    getEdgeCount(): number {
        return this.edges.length;
    }

    query(predicate: (node: Node) => boolean): Node[] {
        return [...this.nodes.values()].filter(predicate);
    }

    neighbors(nodeId: string): Node[] {
        const nodeIds = new Set([nodeId]);
        return this.edges
            .filter((edge) => nodeIds.has(edge.source.id) || nodeIds.has(edge.target.id))
            .flatMap((edge) => (edge.source.id === nodeId ? edge.target : edge.source));
    }

    getConnectedEdges(nodeId: string): Edge[] {
        return this.edges.filter((edge) => edge.source.id === nodeId || edge.target.id === nodeId);
    }

    getIncomingEdges(nodeId: string): Edge[] {
        return this.edges.filter((edge) => edge.target.id === nodeId);
    }

    getOutgoingEdges(nodeId: string): Edge[] {
        return this.edges.filter((edge) => edge.source.id === nodeId);
    }

    // --- Serialization ---

    public toJSON(): GraphSpec {
        return {
            nodes: [...this.nodes.values()].map((node) => ({
                id: node.id,
                type: node.type,
                label: node.label,
                position: [node.position.x, node.position.y, node.position.z],
                data: node.data ? structuredClone(node.data) : {},
            })),
            edges: this.edges.map((edge) => ({
                id: edge.id,
                source: edge.source.id,
                target: edge.target.id,
                type: edge.type,
                data: edge.data ? structuredClone(edge.data) : {},
            })),
        };
    }

    public fromJSON(spec: GraphSpec): void {
        this.clear();
        spec.nodes?.forEach((nodeSpec) => this.addNode(nodeSpec));
        spec.edges?.forEach((edgeSpec) => this.addEdge(edgeSpec));
    }
}

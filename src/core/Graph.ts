import { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, EdgeSpec, GraphSpec } from '../types';

export class Graph {
    public sg: SpaceGraph;
    public nodes: Map<string, any> = new Map();
    public edges: any[] = [];

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    private _notifyPlugins(
        hookName: 'onNodeAdded' | 'onNodeRemoved' | 'onEdgeAdded' | 'onEdgeRemoved',
        arg: any,
    ) {
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

    addNode(spec: NodeSpec) {
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

    updateNode(id: string, updates: Partial<NodeSpec>) {
        const node = this.nodes.get(id);
        if (!node) return null;

        if (typeof node.updateSpec === 'function') {
            node.updateSpec(updates);
        } else {
            // Fallback for custom nodes that don't implement updateSpec
            if (updates.data) node.data = { ...node.data, ...updates.data };
            if (updates.position)
                node.updatePosition(updates.position[0], updates.position[1], updates.position[2]);
        }

        return node;
    }

    private findNodeAcrossInstances(nodeId: string): any {
        for (const inst of SpaceGraph.instances) {
            if (inst.graph.nodes.has(nodeId)) {
                return inst.graph.nodes.get(nodeId);
            }
        }
        return null;
    }

    addEdge(spec: EdgeSpec) {
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
            (edge as any).isInterGraphEdge = true;
        } else {
            this.sg.renderer.scene.add(edge.object);
        }

        this.edges.push(edge);
        this.sg.events.emit('edge:added', { edge });
        this._notifyPlugins('onEdgeAdded', edge);
        return edge;
    }

    updateEdge(id: string, updates: Partial<EdgeSpec>) {
        const edge = this.edges.find((e) => e.id === id);
        if (!edge) return null;

        if (typeof edge.updateSpec === 'function') {
            edge.updateSpec(updates);
        } else {
            if (updates.data) edge.data = { ...edge.data, ...updates.data };
        }

        // If source or target changes, we usually need to re-evaluate it
        if (updates.source || updates.target) {
            const sourceNode = this.nodes.get(updates.source || edge.source.id);
            const targetNode = this.nodes.get(updates.target || edge.target.id);
            if (sourceNode && targetNode) {
                edge.source = sourceNode;
                edge.target = targetNode;
                edge.update();
            }
        }

        return edge;
    }

    removeNode(id: string) {
        const node = this.nodes.get(id);
        if (!node) return;

        this.sg.renderer.scene.remove(node.object);
        this.nodes.delete(id);
        this.sg.events.emit('node:removed', { id });
        this._notifyPlugins('onNodeRemoved', id);

        for (let i = this.edges.length - 1; i >= 0; i--) {
            const edge = this.edges[i];
            if (edge.source.id === id || edge.target.id === id) {
                this.sg.renderer.scene.remove(edge.object);
                this.sg.events.emit('edge:removed', { id: edge.id });
                this._notifyPlugins('onEdgeRemoved', edge.id);
                edge.dispose?.();
                this.edges.splice(i, 1);
            }
        }

        node.dispose?.();
    }

    removeEdge(id: string) {
        const index = this.edges.findIndex((edge) => edge.id === id);
        if (index === -1) return;

        const edge = this.edges[index];
        this.sg.renderer.scene.remove(edge.object);
        this.edges.splice(index, 1);
        this.sg.events.emit('edge:removed', { id });
        this._notifyPlugins('onEdgeRemoved', id);
        edge.dispose?.();
    }

    clear() {
        this.edges.forEach((edge) => {
            this.sg.renderer.scene.remove(edge.object);
            edge.dispose?.();
        });
        this.edges = [];

        this.nodes.forEach((node) => {
            this.sg.renderer.scene.remove(node.object);
            node.dispose?.();
        });
        this.nodes.clear();
    }

    getNode(id: string): any {
        return this.nodes.get(id);
    }

    getEdge(id: string): any {
        return this.edges.find((e) => e.id === id);
    }

    query(predicate: (node: any) => boolean): any[] {
        return [...this.nodes.values()].filter(predicate);
    }

    neighbors(nodeId: string): any[] {
        return this.edges.flatMap((edge) =>
            edge.source.id === nodeId
                ? [edge.target]
                : edge.target.id === nodeId
                  ? [edge.source]
                  : [],
        );
    }

    // --- Serialization ---

    public toJSON(): GraphSpec {
        const safeClone = (obj: any) =>
            obj ? (structuredClone(obj) ?? JSON.parse(JSON.stringify(obj))) : {};

        return {
            nodes: [...this.nodes.values()].map((node) => ({
                id: node.id,
                type: node.type,
                label: node.label,
                position: [node.position.x, node.position.y, node.position.z],
                data: safeClone(node.data),
            })),
            edges: this.edges.map((edge) => ({
                id: edge.id,
                source: edge.source.id,
                target: edge.target.id,
                type: edge.type,
                data: safeClone(edge.data),
            })),
        };
    }

    public fromJSON(spec: GraphSpec): void {
        this.clear();
        spec.nodes?.forEach((nodeSpec) => this.addNode(nodeSpec));
        spec.edges?.forEach((edgeSpec) => this.addEdge(edgeSpec));
    }
}

import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, EdgeSpec, GraphSpec } from '../types';

export class Graph {
    public sg: SpaceGraph;
    public nodes: Map<string, any> = new Map();
    public edges: any[] = [];

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    private _notifyPlugins(hookName: string, arg: any) {
        for (const plugin of this.sg.pluginManager['plugins'].values()) {
            if (typeof (plugin as any)[hookName] === 'function') {
                try {
                    (plugin as any)[hookName](arg);
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

    addEdge(spec: EdgeSpec) {
        if (
            !spec ||
            !spec.id ||
            typeof spec.source !== 'string' ||
            typeof spec.target !== 'string'
        ) {
            console.warn(
                `[SpaceGraph] Edge missing critical topology attributes (id/source/target).`,
            );
            return null;
        }

        const existingIndex = this.edges.findIndex((e) => e.id === spec.id);
        if (existingIndex !== -1) {
            return this.updateEdge(spec.id, spec);
        }

        let sourceNode = this.nodes.get(spec.source);
        let targetNode = this.nodes.get(spec.target);

        // If not found locally, search across other registered instances for InterGraphEdge
        if (!sourceNode || !targetNode) {
            for (const inst of this.sg.constructor.prototype.constructor.instances || []) {
                if (!sourceNode && inst.graph.nodes.has(spec.source)) {
                    sourceNode = inst.graph.nodes.get(spec.source);
                }
                if (!targetNode && inst.graph.nodes.has(spec.target)) {
                    targetNode = inst.graph.nodes.get(spec.target);
                }
                if (sourceNode && targetNode) break;
            }
        }

        if (!sourceNode || !targetNode) {
            console.warn(
                `[SpaceGraph] Edge "${spec.id}" rejected: missing source or target node within graph bounds.`,
            );
            return null;
        }

        let EdgeType = this.sg.pluginManager.getEdgeType(spec.type);
        if (!EdgeType) {
            console.warn(`[SpaceGraph] Edge type "${spec.type}" not registered.`);
            return null;
        }

        let edge;
        if (sourceNode.sg !== targetNode.sg) {
            const InterGraphEdgeClass = this.sg.pluginManager.getEdgeType('InterGraphEdge');
            if (InterGraphEdgeClass) {
                 EdgeType = InterGraphEdgeClass;
            } else {
                 console.warn('[SpaceGraph] InterGraphEdge not registered. Falling back to default edge.');
            }
            edge = new EdgeType(this.sg, spec, sourceNode, targetNode);
            (edge as any).isInterGraphEdge = true;
        } else {
            edge = new EdgeType(this.sg, spec, sourceNode, targetNode);
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
        if (node) {
            this.sg.renderer.scene.remove(node.object);
            this.nodes.delete(id);
            this.sg.events.emit('node:removed', { id });
            this._notifyPlugins('onNodeRemoved', id);

            // Remove connected edges
            this.edges = this.edges.filter((edge) => {
                if (edge.source.id === id || edge.target.id === id) {
                    this.sg.renderer.scene.remove(edge.object);
                    this.sg.events.emit('edge:removed', { id: edge.id });
                    this._notifyPlugins('onEdgeRemoved', edge.id);
                    if (typeof edge.dispose === 'function') edge.dispose();
                    return false;
                }
                return true;
            });

            if (typeof node.dispose === 'function') {
                node.dispose();
            }
        }
    }

    removeEdge(id: string) {
        const index = this.edges.findIndex((edge) => edge.id === id);
        if (index !== -1) {
            const edge = this.edges[index];
            this.sg.renderer.scene.remove(edge.object);
            this.edges.splice(index, 1);
            this.sg.events.emit('edge:removed', { id });
            this._notifyPlugins('onEdgeRemoved', id);
            if (typeof edge.dispose === 'function') edge.dispose();
        }
    }

    clear() {
        this.edges.forEach((edge) => {
            this.sg.renderer.scene.remove(edge.object);
            if (typeof edge.dispose === 'function') edge.dispose();
        });
        this.edges = [];

        this.nodes.forEach((node) => {
            this.sg.renderer.scene.remove(node.object);
            if (typeof node.dispose === 'function') node.dispose();
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
        const result: any[] = [];
        for (const node of this.nodes.values()) {
            if (predicate(node)) {
                result.push(node);
            }
        }
        return result;
    }

    neighbors(nodeId: string): any[] {
        const result: any[] = [];
        for (const edge of this.edges) {
            if (edge.source.id === nodeId) {
                result.push(edge.target);
            } else if (edge.target.id === nodeId) {
                result.push(edge.source);
            }
        }
        return result;
    }

    // --- Serialization ---

    public toJSON(): GraphSpec {
        const safeClone = (obj: any) => {
            if (!obj) return {};
            try {
                return structuredClone(obj);
            } catch {
                return JSON.parse(JSON.stringify(obj));
            }
        };

        const nodes: NodeSpec[] = [];
        for (const node of this.nodes.values()) {
            nodes.push({
                id: node.id,
                type: node.type,
                label: node.label,
                position: [node.position.x, node.position.y, node.position.z],
                data: safeClone(node.data),
            });
        }

        const edges: EdgeSpec[] = this.edges.map((edge) => ({
            id: edge.id,
            source: edge.source.id,
            target: edge.target.id,
            type: edge.type,
            data: safeClone(edge.data),
        }));

        return { nodes, edges };
    }

    public fromJSON(spec: GraphSpec): void {
        this.clear();

        // Add nodes
        if (spec.nodes) {
            for (const nodeSpec of spec.nodes) {
                this.addNode(nodeSpec);
            }
        }

        // Add edges
        if (spec.edges) {
            for (const edgeSpec of spec.edges) {
                this.addEdge(edgeSpec);
            }
        }
    }
}

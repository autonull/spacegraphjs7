import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, EdgeSpec } from '../types';

export class Graph {
    public sg: SpaceGraph;
    public nodes: Map<string, any> = new Map();
    public edges: any[] = [];

    constructor(sg: SpaceGraph) {
        this.sg = sg;
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
        const existingIndex = this.edges.findIndex((e) => e.id === spec.id);
        if (existingIndex !== -1) {
            return this.updateEdge(spec.id, spec);
        }

        const sourceNode = this.nodes.get(spec.source);
        const targetNode = this.nodes.get(spec.target);

        if (!sourceNode || !targetNode) {
            console.warn(`[SpaceGraph] Edge "${spec.id}" missing source or target node.`);
            return null;
        }

        const EdgeType = this.sg.pluginManager.getEdgeType(spec.type);
        if (!EdgeType) {
            console.warn(`[SpaceGraph] Edge type "${spec.type}" not registered.`);
            return null;
        }

        const edge = new EdgeType(this.sg, spec, sourceNode, targetNode);
        this.edges.push(edge);
        this.sg.renderer.scene.add(edge.object);
        this.sg.events.emit('edge:added', { edge });
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

            // Remove connected edges
            this.edges = this.edges.filter((edge) => {
                if (edge.source.id === id || edge.target.id === id) {
                    this.sg.renderer.scene.remove(edge.object);
                    this.sg.events.emit('edge:removed', { id: edge.id });
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
}

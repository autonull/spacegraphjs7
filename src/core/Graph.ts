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

  addEdge(spec: EdgeSpec) {
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

  removeNode(id: string) {
    const node = this.nodes.get(id);
    if (node) {
      this.sg.renderer.scene.remove(node.object);
      this.nodes.delete(id);
      this.sg.events.emit('node:removed', { id });

      // Remove connected edges
      this.edges = this.edges.filter(edge => {
        if (edge.source.id === id || edge.target.id === id) {
          this.sg.renderer.scene.remove(edge.object);
          this.sg.events.emit('edge:removed', { id: edge.id });
          return false;
        }
        return true;
      });
    }
  }

  removeEdge(id: string) {
    const index = this.edges.findIndex(edge => edge.id === id);
    if (index !== -1) {
      const edge = this.edges[index];
      this.sg.renderer.scene.remove(edge.object);
      this.edges.splice(index, 1);
      this.sg.events.emit('edge:removed', { id });
    }
  }

  clear() {
    this.edges.forEach(edge => this.sg.renderer.scene.remove(edge.object));
    this.edges = [];

    this.nodes.forEach(node => this.sg.renderer.scene.remove(node.object));
    this.nodes.clear();
  }
}

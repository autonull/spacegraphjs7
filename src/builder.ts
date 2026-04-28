// builder.ts - Aggressively ergonomic API
import type { SpaceGraph } from './SpaceGraph';
import type { GraphSpec, NodeSpec, EdgeSpec, SpaceGraphOptions } from './types';

export class NodeBuilder {
  private spec: NodeSpec;
  constructor(id: string, type: string = 'ShapeNode') { this.spec = { id, type }; }
  label(label: string): this { this.spec.label = label; return this; }
  position(x: number, y: number, z: number = 0): this { this.spec.position = [x, y, z]; return this; }
  rotation(x: number, y: number, z: number = 0): this { this.spec.rotation = [x, y, z]; return this; }
  scale(x: number, y: number, z: number = 1): this { this.spec.scale = [x, y, z]; return this; }
  data(data: Record<string, unknown>): this { this.spec.data = data; return this; }
  size(size: number): this { this.spec.data = { ...this.spec.data, size }; return this; }
  color(color: number | string): this { this.spec.data = { ...this.spec.data, color }; return this; }
  params(params: Record<string, unknown>): this { this.spec.parameters = params; return this; }
  build(): NodeSpec { return this.spec; }
}

export class EdgeBuilder {
  private spec: EdgeSpec;
  constructor(id: string, source: string, target: string, type: string = 'Edge') { this.spec = { id, source, target, type }; }
  data(data: Record<string, unknown>): this { this.spec.data = data; return this; }
  label(label: string): this { this.spec.data = { ...this.spec.data, label }; return this; }
  thickness(thickness: number): this { this.spec.data = { ...this.spec.data, thickness }; return this; }
  dashed(dashed: boolean = true): this { this.spec.data = { ...this.spec.data, dashed }; return this; }
  arrowhead(arrowhead: boolean | 'source' | 'target' | 'both' = true): this { this.spec.data = { ...this.spec.data, arrowhead }; return this; }
  build(): EdgeSpec { return this.spec; }
}

export class GraphSpecBuilder {
  private nodes: NodeSpec[] = [];
  private edges: EdgeSpec[] = [];

  node(id: string, type?: string): NodeBuilder {
    const builder = new NodeBuilder(id, type);
    this.nodes.push(builder.build());
    return builder;
  }

  addNode(node: NodeSpec): this { this.nodes.push(node); return this; }
  edge(id: string, source: string, target: string, type?: string): EdgeBuilder {
    const builder = new EdgeBuilder(id, source, target, type);
    this.edges.push(builder.build());
    return builder;
  }
  addEdge(edge: EdgeSpec): this { this.edges.push(edge); return this; }

  addNodes(nodes: Array<{ id: string; type?: string; label?: string }>): this {
    nodes.forEach(({ id, type, label }) => {
      const builder = new NodeBuilder(id, type);
      this.nodes.push((label ? builder.label(label) : builder).build());
    });
    return this;
  }

  connectChain(nodeIds: string[]): this {
    for (let i = 1; i < nodeIds.length; i++)
      this.addEdge({ id: `edge-${nodeIds[i - 1]}-${nodeIds[i]}`, source: nodeIds[i - 1], target: nodeIds[i] });
    return this;
  }

  connectStar(centerId: string, spokeIds: string[]): this {
    spokeIds.forEach((spokeId) => this.addEdge({ id: `edge-${centerId}-${spokeId}`, source: centerId, target: spokeId }));
    return this;
  }

  build(): GraphSpec { return { nodes: this.nodes, edges: this.edges }; }

  async create(container: string | HTMLElement, options?: SpaceGraphOptions): Promise<SpaceGraph> {
    const { SpaceGraph } = await import('./SpaceGraph');
    return SpaceGraph.create(container, this.build(), options);
  }
}

// Fluent API factory
export function graph(): GraphSpecBuilder { return new GraphSpecBuilder(); }

// Quick graph - create graph with minimal syntax
export async function quickGraph(
  container: string | HTMLElement,
  nodes: Array<{ id: string; label?: string; position?: [number, number, number]; data?: Record<string, unknown> }>,
  edges?: Array<{ id: string; source: string; target: string }>,
  options?: SpaceGraphOptions,
): Promise<SpaceGraph> {
  const { SpaceGraph } = await import('./SpaceGraph');
  return SpaceGraph.quickGraph(container, nodes, edges, options);
}

// Pre-built patterns with chainable API
export const Patterns = {
  circle(count: number, radius: number = 100, label?: string): GraphSpecBuilder {
    const builder = graph();
    const angleStep = (2 * Math.PI) / count;
    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      builder.node(`node-${i}`, 'ShapeNode', `${label || 'Node'} ${i}`).position(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      if (i > 0) builder.addEdge({ id: `edge-${i}`, source: `node-${i - 1}`, target: `node-${i}` });
    }
    return builder;
  },

  grid(rows: number, cols: number, spacing: number = 100): GraphSpecBuilder {
    const builder = graph();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const id = `node-${row}-${col}`;
        builder.node(id, 'ShapeNode', `${row},${col}`).position(col * spacing, 0, row * spacing);
        if (col > 0) builder.addEdge({ id: `h-${row}-${col}`, source: `node-${row}-${col - 1}`, target: id });
        if (row > 0) builder.addEdge({ id: `v-${row}-${col}`, source: `node-${row - 1}-${col}`, target: id });
      }
    }
    return builder;
  },

  hierarchy(levels: number[], spacing: number = 100): GraphSpecBuilder {
    const builder = graph();
    let nodeId = 0, prevLevelStart = 0;
    levels.forEach((count, levelIndex) => {
      const y = levelIndex * spacing, levelStart = nodeId;
      for (let i = 0; i < count; i++) {
        const id = `node-${nodeId++}`;
        builder.node(id, 'ShapeNode', id).position(((i - (count - 1) / 2) * spacing) / 2, y, 0);
        if (levelIndex > 0 && prevLevelStart < nodeId) {
          const prevCount = levels[levelIndex - 1] || 0;
          const parentIndex = prevLevelStart + Math.floor((i * prevCount) / count);
          if (parentIndex >= prevLevelStart && parentIndex < nodeId)
            builder.addEdge({ id: `edge-${nodeId}-${parentIndex}`, source: `node-${parentIndex}`, target: id });
        }
      }
      prevLevelStart = levelStart;
    });
    return builder;
  },

  chain(count: number, spacing: number = 100): GraphSpecBuilder {
    const builder = graph();
    for (let i = 0; i < count; i++) {
      builder.node(`node-${i}`, 'ShapeNode', `Node ${i}`).position(i * spacing, 0, 0);
      if (i > 0) builder.addEdge({ id: `edge-${i}`, source: `node-${i - 1}`, target: `node-${i}` });
    }
    return builder;
  },

  star(spokes: number, radius: number = 100): GraphSpecBuilder {
    const builder = graph();
    const angleStep = (2 * Math.PI) / spokes;
    builder.node('center', 'ShapeNode', 'Center').position(0, 0, 0);
    for (let i = 0; i < spokes; i++) {
      const angle = i * angleStep;
      builder.node(`spoke-${i}`, 'ShapeNode', `Spoke ${i}`).position(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      builder.addEdge({ id: `edge-${i}`, source: 'center', target: `spoke-${i}` });
    }
    return builder;
  },
};

// Animation helpers - chainable GSAP utilities
export const Animate = {
  move(sg: SpaceGraph, nodeId: string, to: { x?: number; y?: number; z?: number }, duration: number = 1000): Promise<void> {
    const node = sg.graph.getNode(nodeId);
    if (!node) return Promise.resolve();
    return import('gsap').then(({ gsap }) => new Promise(resolve => {
      gsap.to(node.position, {
        x: to.x ?? node.position.x, y: to.y ?? node.position.y, z: to.z ?? node.position.z,
        duration: duration / 1000, ease: 'power2.inOut',
        onUpdate: () => node.updatePosition(node.position.x, node.position.y, node.position.z),
        onComplete: resolve,
      });
    }));
  },

  fade(sg: SpaceGraph, nodeId: string, to: number, duration: number = 500): Promise<void> {
    const node = sg.graph.getNode(nodeId);
    if (!node) return Promise.resolve();
    return import('gsap').then(({ gsap }) => new Promise(resolve => {
      gsap.to(node.data, { opacity: to, duration: duration / 1000, ease: 'power2.inOut', onComplete: resolve });
    }));
  },

  scale(sg: SpaceGraph, nodeId: string, to: number, duration: number = 500): Promise<void> {
    const node = sg.graph.getNode(nodeId);
    if (!node) return Promise.resolve();
    return import('gsap').then(({ gsap }) => new Promise(resolve => {
      gsap.to(node.object.scale, { x: to, y: to, z: to, duration: duration / 1000, ease: 'power2.inOut', onComplete: resolve });
    }));
  },
};

// Layout helpers - unified layout application
export const Layout = {
  async apply(sg: SpaceGraph, layoutName: string, options?: Record<string, unknown>): Promise<void> {
    const plugin = sg.pluginManager.getPlugin(layoutName);
    if (!plugin) throw new Error(`Layout "${layoutName}" not found`);
    if ('applyLayout' in plugin) await (plugin as any).applyLayout(options);
  },
  force(sg: SpaceGraph, options?: { duration?: number; easing?: string }): Promise<void> { return Layout.apply(sg, 'ForceLayout', options); },
  circular(sg: SpaceGraph, options?: { duration?: number; easing?: string }): Promise<void> { return Layout.apply(sg, 'CircularLayout', options); },
  grid(sg: SpaceGraph, options?: { duration?: number; easing?: string }): Promise<void> { return Layout.apply(sg, 'GridLayout', options); },
  hierarchy(sg: SpaceGraph, options?: { duration?: number; easing?: string }): Promise<void> { return Layout.apply(sg, 'HierarchicalLayout', options); },
  radial(sg: SpaceGraph, options?: { duration?: number; easing?: string }): Promise<void> { return Layout.apply(sg, 'RadialLayout', options); },
};

// Camera helpers - ergonomic camera operations
export const Camera = {
  fitView(sg: SpaceGraph, padding?: number, duration?: number): void { sg.fitView(padding, duration); },

  flyTo(sg: SpaceGraph, position: [number, number, number], target: [number, number, number], duration: number = 1.5): Promise<void> {
    return import('gsap').then(({ gsap }) => new Promise(resolve => {
      const start = { x: sg.renderer.camera.position.x, y: sg.renderer.camera.position.y, z: sg.renderer.camera.position.z };
      gsap.to(start, {
        x: position[0], y: position[1], z: position[2], duration, ease: 'power2.inOut',
        onUpdate: () => { sg.renderer.camera.position.set(start.x, start.y, start.z); sg.cameraControls.update(); },
        onComplete: resolve,
      });
    }));
  },

  focus(sg: SpaceGraph, nodeIds: string[], padding: number = 100, duration: number = 1.5): void {
    const nodes = nodeIds.map(id => sg.graph.getNode(id)).filter((n): n is NonNullable<typeof n> => n != null);
    if (nodes.length === 0) return;
    sg.fitView(padding, duration);
  },
};

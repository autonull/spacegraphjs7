// Ergonomic API helpers for SpaceGraph
import type { SpaceGraph } from './SpaceGraph';
import type { GraphSpec, NodeSpec, EdgeSpec } from './types';

/**
 * Chainable graph builder for ergonomic graph construction
 */
export class GraphBuilder {
  private nodes: NodeSpec[] = [];
  private edges: EdgeSpec[] = [];

  node(id: string, type: string = 'ShapeNode', label?: string, position?: [number, number, number], data?: Record<string, unknown>): this {
    this.nodes.push({ id, type, label, position, data });
    return this;
  }

  edge(id: string, source: string, target: string, type: string = 'Edge', data?: Record<string, unknown>): this {
    this.edges.push({ id, source, target, type, data });
    return this;
  }

  build(): GraphSpec {
    return { nodes: this.nodes, edges: this.edges };
  }

  async create(container: string | HTMLElement, sg?: SpaceGraph): Promise<SpaceGraph> {
    const { SpaceGraph } = await import('./SpaceGraph');
    return SpaceGraph.create(container, this.build(), sg?.options);
  }
}

/**
 * Quick graph creation helpers
 */
export function graph(): GraphBuilder {
  return new GraphBuilder();
}

export function quickGraph(
  container: string | HTMLElement,
  nodes: Array<{ id: string; label?: string; position?: [number, number, number]; data?: Record<string, unknown> }>,
  edges?: Array<{ id: string; source: string; target: string }>,
  options?: import('./types').SpaceGraphOptions,
): Promise<SpaceGraph> {
  return import('./SpaceGraph').then(({ SpaceGraph }) => 
    SpaceGraph.quickGraph(container, nodes, edges, options)
  );
}

/**
 * Pre-built graph patterns
 */
export const patterns = {
  circle(count: number, radius: number = 100): GraphBuilder {
    const builder = graph();
    const angleStep = (2 * Math.PI) / count;
    
    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      builder.node(`node-${i}`, 'ShapeNode', `Node ${i}`, [x, 0, z]);
      
      if (i > 0) {
        builder.edge(`edge-${i}-${i - 1}`, `node-${i - 1}`, `node-${i}`);
      }
    }
    
    return builder;
  },

  grid(rows: number, cols: number, spacing: number = 100): GraphBuilder {
    const builder = graph();
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const id = `node-${row}-${col}`;
        const x = col * spacing;
        const z = row * spacing;
        builder.node(id, 'ShapeNode', `${row},${col}`, [x, 0, z]);
        
        if (col > 0) {
          builder.edge(`h-${row}-${col}`, `node-${row}-${col - 1}`, id);
        }
        if (row > 0) {
          builder.edge(`v-${row}-${col}`, `node-${row - 1}-${col}`, id);
        }
      }
    }
    
    return builder;
  },

  hierarchy(levels: number[], spacing: number = 100): GraphBuilder {
    const builder = graph();
    let nodeId = 0;
    let prevLevelStart = 0;
    
    levels.forEach((count, levelIndex) => {
      const y = levelIndex * spacing;
      const levelStart = nodeId;
      
      for (let i = 0; i < count; i++) {
        const id = `node-${nodeId++}`;
        const x = (i - (count - 1) / 2) * spacing;
        builder.node(id, 'ShapeNode', id, [x, y, 0]);
        
        if (levelIndex > 0 && prevLevelStart < nodeId) {
          const parentIndex = prevLevelStart + Math.floor(i * (prevLevelStart - (levels[levelIndex - 1] || 0)) / count);
          if (parentIndex >= 0 && parentIndex < nodeId) {
            builder.edge(`edge-${nodeId}-${parentIndex}`, `node-${parentIndex}`, id);
          }
        }
      }
      
      prevLevelStart = levelStart;
    });
    
    return builder;
  },
};

/**
 * Animation helpers
 */
export const animate = {
  async transition(
    sg: SpaceGraph,
    nodeId: string,
    to: { x?: number; y?: number; z?: number; scale?: number },
    duration: number = 1000,
  ): Promise<void> {
    const node = sg.graph.getNode(nodeId);
    if (!node) return;

    const { gsap } = await import('gsap');
    
    const props: Record<string, any> = {
      duration: duration / 1000,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (to.x !== undefined || to.y !== undefined || to.z !== undefined) {
          node.updatePosition(to.x ?? node.position.x, to.y ?? node.position.y, to.z ?? node.position.z);
        }
      },
    };
    
    gsap.to({}, props);
  },
};

/**
 * Layout helpers
 */
export const layout = {
  async apply(sg: SpaceGraph, layoutName: string, options?: Record<string, unknown>): Promise<void> {
    const plugin = sg.pluginManager.getPlugin(layoutName);
    if (!plugin) throw new Error(`Layout "${layoutName}" not found`);
    
    if ('applyLayout' in plugin) {
      await (plugin as any).applyLayout(options);
    }
  },

  async force(sg: SpaceGraph, options?: { duration?: number; easing?: string }): Promise<void> {
    await layout.apply(sg, 'ForceLayout', options);
  },

  async circular(sg: SpaceGraph, options?: { duration?: number; easing?: string }): Promise<void> {
    await layout.apply(sg, 'CircularLayout', options);
  },

  async grid(sg: SpaceGraph, options?: { duration?: number; easing?: string }): Promise<void> {
    await layout.apply(sg, 'GridLayout', options);
  },
};

/**
 * Camera helpers
 */
export const camera = {
  fitView(sg: SpaceGraph, padding?: number, duration?: number): void {
    sg.fitView(padding, duration);
  },

  async flyTo(
    sg: SpaceGraph,
    position: [number, number, number],
    target: [number, number, number],
    duration: number = 1.5,
  ): Promise<void> {
    const { gsap } = await import('gsap');
    
    const start = {
      x: sg.renderer.camera.position.x,
      y: sg.renderer.camera.position.y,
      z: sg.renderer.camera.position.z,
    };
    
    const end = { x: position[0], y: position[1], z: position[2] };
    
    return new Promise(resolve => {
      gsap.to(start, {
        ...end,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          sg.renderer.camera.position.set(start.x, start.y, start.z);
          sg.cameraControls.update();
        },
        onComplete: resolve,
      });
    });
  },
};

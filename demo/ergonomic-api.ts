// Example usage of the ergonomic API
import { graph, Patterns, quickGraph, Layout, Camera, Animate } from '../index';

/**
 * Example 1: Simple graph creation with builder pattern
 */
export async function example1_Container(container: HTMLElement) {
  const graph1 = await graph()
    .node('a', 'ShapeNode', 'Node A').position(0, 0, 0)
    .node('b', 'ShapeNode', 'Node B').position(100, 0, 0)
    .node('c', 'ShapeNode', 'Node C').position(50, 100, 0)
    .edge('e1', 'a', 'b')
    .edge('e2', 'b', 'c')
    .edge('e3', 'c', 'a')
    .create(container);
  
  return graph1;
}

/**
 * Example 2: Using pre-built patterns
 */
export async function example2_Patterns(container: HTMLElement) {
  // Create a circular pattern
  const circle = await Patterns.circle(12, 150, 'Node').create(container);
  
  // Create a grid pattern
  const grid = await Patterns.grid(5, 5, 80).create(container);
  
  // Create a hierarchical pattern
  const hierarchy = await Patterns.hierarchy([1, 3, 6, 9], 100).create(container);
  
  // Create a chain
  const chain = await Patterns.chain(10, 60).create(container);
  
  // Create a star pattern
  const star = await Patterns.star(8, 120).create(container);
  
  return { circle, grid, hierarchy, chain, star };
}

/**
 * Example 3: Quick graph creation
 */
export async function example3_QuickGraph(container: HTMLElement) {
  const nodes = [
    { id: '1', label: 'Node 1', position: [0, 0, 0] as [number, number, number] },
    { id: '2', label: 'Node 2', position: [100, 0, 0] as [number, number, number] },
    { id: '3', label: 'Node 3', position: [50, 100, 0] as [number, number, number] },
  ];
  
  const edges = [
    { id: 'e1', source: '1', target: '2' },
    { id: 'e2', source: '2', target: '3' },
    { id: 'e3', source: '3', target: '1' },
  ];
  
  return quickGraph(container, nodes, edges);
}

/**
 * Example 4: Applying layouts
 */
export async function example4_Layouts(container: HTMLElement) {
  const sg = await Patterns.grid(4, 4, 100).create(container);
  
  // Apply force-directed layout
  await Layout.force(sg, { duration: 1.5 });
  
  // Apply circular layout
  await Layout.circular(sg, { duration: 1.5 });
  
  // Apply hierarchical layout
  await Layout.hierarchy(sg, { duration: 1.5 });
  
  return sg;
}

/**
 * Example 5: Camera controls
 */
export async function example5_Camera(container: HTMLElement) {
  const sg = await Patterns.circle(12, 150).create(container);
  
  // Fit view to show all nodes
  Camera.fitView(sg, 100, 1.5);
  
  // Focus on specific nodes
  Camera.focus(sg, ['node-0', 'node-1', 'node-2'], 100, 1.5);
  
  // Fly to position
  await Camera.flyTo(sg, [0, 0, 500], [0, 0, 0], 2.0);
  
  return sg;
}

/**
 * Example 6: Animations
 */
export async function example6_Animations(container: HTMLElement) {
  const sg = await Patterns.grid(3, 3, 100).create(container);
  
  // Move a node
  await Animate.move(sg, 'node-0', { x: 200, y: 0, z: 0 }, 1000);
  
  // Fade a node
  await Animate.fade(sg, 'node-1', 0.5, 500);
  
  // Scale a node
  await Animate.scale(sg, 'node-2', 1.5, 500);
  
  return sg;
}

/**
 * Example 7: Complex scenario - Build, layout, animate
 */
export async function example7_FullScenario(container: HTMLElement) {
  // Step 1: Create graph with pattern
  const sg = await Patterns.hierarchy([1, 4, 8, 12], 80).create(container);
  
  // Step 2: Apply initial layout
  await Layout.force(sg, { duration: 1.0 });
  
  // Step 3: Fit view
  Camera.fitView(sg, 100, 1.0);
  
  // Step 4: Animate specific nodes
  setTimeout(async () => {
    await Animate.scale(sg, 'node-0', 1.2, 300);
    await Animate.move(sg, 'node-1', { x: 100, y: 0, z: 0 }, 500);
  }, 1000);
  
  return sg;
}

/**
 * Example 8: Custom data and styling
 */
export async function example8_CustomData(container: HTMLElement) {
  const sg = await graph()
    .node('server', 'ShapeNode', 'Server')
      .position(0, 0, 0)
      .data({ color: 0x00ff00, size: 50, type: 'server' })
    .node('client1', 'ShapeNode', 'Client 1')
      .position(100, -50, 0)
      .data({ color: 0x0000ff, size: 30, type: 'client' })
    .node('client2', 'ShapeNode', 'Client 2')
      .position(100, 50, 0)
      .data({ color: 0xff0000, size: 30, type: 'client' })
    .edge('e1', 'server', 'client1')
      .data({ thickness: 5, color: 0x00ffff })
    .edge('e2', 'server', 'client2')
      .data({ thickness: 3, color: 0xffff00 })
    .create(container);
  
  return sg;
}

/**
 * Example 9: Dynamic graph updates
 */
export async function example9_DynamicUpdates(container: HTMLElement) {
  const sg = await Patterns.chain(5, 100).create(container);
  
  // Add new node
  sg.graph.addNode({
    id: 'new-node',
    type: 'ShapeNode',
    label: 'New Node',
    position: [500, 0, 0],
  });
  
  // Add new edge
  sg.graph.addEdge({
    id: 'new-edge',
    source: 'node-4',
    target: 'new-node',
  });
  
  // Update existing node
  sg.graph.updateNode('node-0', {
    label: 'Updated Node 0',
    data: { color: 0xff0000 },
  });
  
  return sg;
}

/**
 * Example 10: Event handling
 */
export async function example10_Events(container: HTMLElement) {
  const sg = await Patterns.grid(3, 3, 100).create(container);
  
  // Listen to node events
  sg.events.on('node:added', (event) => {
    console.log('Node added:', event.node.id);
  });
  
  sg.events.on('node:removed', (event) => {
    console.log('Node removed:', event.id);
  });
  
  sg.events.on('edge:added', (event) => {
    console.log('Edge added:', event.edge.id);
  });
  
  return sg;
}

// Export all examples
export const examples = {
  example1_Container,
  example2_Patterns,
  example3_QuickGraph,
  example4_Layouts,
  example5_Camera,
  example6_Animations,
  example7_FullScenario,
  example8_CustomData,
  example9_DynamicUpdates,
  example10_Events,
};

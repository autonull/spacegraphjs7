// SpaceGraphJS - The Self-Building UI Framework
console.log('[SpaceGraphJS] Loading...');

export { SpaceGraph } from './SpaceGraph';
export type { GraphSpec, NodeSpec, EdgeSpec, SpecUpdate, SpaceGraphOptions, ISpaceGraphPlugin } from './types';

// Core
export { Graph } from './core/Graph';
export { Renderer } from './core/Renderer';
export { PluginManager } from './core/PluginManager';
export { CameraControls } from './core/CameraControls';
export { EventManager } from './core/EventManager';
export { VisionManager } from './core/VisionManager';

// Nodes
export { Node } from './nodes/Node';
export { ShapeNode } from './nodes/ShapeNode';
export { HtmlNode } from './nodes/HtmlNode';

// Edges
export { Edge } from './edges/Edge';
export { CurvedEdge } from './edges/CurvedEdge';

// Plugins
export { ForceLayout } from './plugins/ForceLayout';
export { InteractionPlugin } from './plugins/InteractionPlugin';
export { LODPlugin } from './plugins/LODPlugin';

console.log('[SpaceGraphJS] Loaded successfully');

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
export { UnifiedDisposalSystem } from './core/UnifiedDisposalSystem';
export { ObjectPoolManager } from './core/ObjectPoolManager';

// Nodes
export { Node } from './nodes/Node';
export { ShapeNode } from './nodes/ShapeNode';
export { HtmlNode } from './nodes/HtmlNode';
export { ImageNode } from './nodes/ImageNode';
export { GroupNode } from './nodes/GroupNode';

// Edges
export { Edge } from './edges/Edge';
export { CurvedEdge } from './edges/CurvedEdge';
export { FlowEdge } from './edges/FlowEdge';

// Plugins
export { ForceLayout } from './plugins/ForceLayout';
export { InteractionPlugin } from './plugins/InteractionPlugin';
export { LODPlugin } from './plugins/LODPlugin';
export { AutoLayoutPlugin } from './plugins/AutoLayoutPlugin';
export { AutoColorPlugin } from './plugins/AutoColorPlugin';

console.log('[SpaceGraphJS] Loaded successfully');

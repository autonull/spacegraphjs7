// SpaceGraphJS v7.0 - Public API
// The Self-Building ZUI Framework

import { TypeRegistry } from './core/TypeRegistry';
import { ShapeNode, HtmlNode, ImageNode } from './nodes/v7';
import { EdgeImpl } from './edges/v7';
import {
  createSpaceGraph,
  createSpaceGraphFromURL,
  createSpaceGraphFromManifest,
  quickGraph
} from './factory';

// Register built-in node/edge types
const registry = TypeRegistry.getInstance();
registry.registerNode('ShapeNode', ShapeNode);
registry.registerNode('HtmlNode', HtmlNode);
registry.registerNode('ImageNode', ImageNode);
registry.registerEdge('Edge', EdgeImpl);

// Core classes
export { SpaceGraph } from './core/SpaceGraph';
export type { SpaceGraphOptions } from './core/SpaceGraph';

// Graph module
export { Graph, Node, Edge } from './graph';
export type {
  NodeData,
  EdgeData,
  NodeSpec,
  EdgeSpec,
  GraphSpec,
  GraphExport,
  ShapeNodeData,
  HtmlNodeData,
  ImageNodeData,
  GroupNodeData,
  NoteNodeData
} from './graph';

// Event system
export { EventSystem, PluginEventBus } from './core/events/EventSystem';
export type {
  SpaceGraphEvents,
  PluginEvent,
  VisionReportEvent,
  LayoutAppliedEvent,
  OverlapDetectedEvent
} from './core/events/EventSystem';

// Plugin system
export { PluginRegistry } from './core/plugins/PluginRegistry';
export { BaseLayout } from './core/plugins/BaseLayout';
export type { Plugin, PluginContext, LayoutConfig, LayoutOptions } from './core/plugins/PluginRegistry';

// Rendering
export { RenderingSystem } from './core/renderer/RenderingSystem';
export type { RenderOptions } from './core/renderer/RenderingSystem';

// Vision system
export { VisionSystem, HeuristicsStrategy } from './vision';
export type {
  VisionOptions,
  VisionReport,
  VisionScore,
  LegibilityResult,
  OverlapResult,
  HierarchyResult,
  ErgonomicsResult
} from './vision';

// Spatial index
export { SpatialIndex, BVH } from './core/spatial/SpatialIndex';

// Object pool
export { ObjectPool, MathPool } from './core/pooling/ObjectPool';

// Type registry
export { TypeRegistry } from './core/TypeRegistry';

// Camera controls
export { CameraControls } from './core/CameraControls';

// V7 Node types
export { ShapeNode, HtmlNode, ImageNode } from './nodes/v7';

// V7 Edge types
export { EdgeImpl } from './edges/v7';

// Factory functions (primary API)
export {
  createSpaceGraph,
  createSpaceGraphFromURL,
  createSpaceGraphFromManifest,
  quickGraph
};

// Utilities
export {
    DEG2RAD,
    RAD2DEG,
    clamp,
    lerp,
    lerpVector3,
    randomRange,
    randomInt,
    smoothstep,
    mapRange,
} from './utils/math';

export { DOMUtils } from './utils/DOMUtils';

// Version
export const VERSION = '7.0.0';

// Default export
export default {
  createSpaceGraph,
  createSpaceGraphFromURL,
  createSpaceGraphFromManifest,
  quickGraph,
  VERSION
};

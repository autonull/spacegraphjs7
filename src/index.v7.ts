// SpaceGraphJS - Public API
// The Self-Building ZUI Framework

import { TypeRegistry } from './core/TypeRegistry';
import { ShapeNode, HtmlNode, ImageNode } from './nodes';
import { Edge } from './edges/Edge';
import {
    createSpaceGraph,
    createSpaceGraphFromURL,
    createSpaceGraphFromManifest,
    quickGraph,
} from './factory';

// Register built-in node/edge types
const registry = TypeRegistry.getInstance();
registry.registerNode('ShapeNode', ShapeNode);
registry.registerNode('HtmlNode', HtmlNode);
registry.registerNode('ImageNode', ImageNode);
registry.registerEdge('Edge', Edge);

// Core classes
export { SpaceGraph } from './core/SpaceGraph';
export type { SpaceGraphOptions } from './core/SpaceGraph';

// Graph module
export { Graph } from './core/Graph';
export { Node } from './nodes/Node';
export { Edge } from './edges/Edge';

// Types
export type {
    NodeData,
    EdgeData,
    BaseNodeData,
    BaseEdgeData,
    Dimensions,
    Colorable,
    Opacity,
    Themable,
    ShapeNodeData,
    HtmlNodeData,
    ImageNodeData,
    GroupNodeData,
    NoteNodeData,
    CanvasNodeData,
    TextMeshNodeData,
    DataNodeData,
    VideoNodeData,
    IFrameNodeData,
    ChartNodeData,
    MarkdownNodeData,
    GlobeNodeData,
    SceneNodeData,
    AudioNodeData,
    MathNodeData,
    ProcessNodeData,
    CodeEditorNodeData,
    InstancedShapeNodeData,
    NodeSpec,
    EdgeSpec,
    GraphSpec,
    GraphExport,
    GraphEvent,
    NodeEvent,
    EdgeEvent,
} from './types';

// Event system
export { EventSystem, PluginEventBus } from './core/events/EventSystem';
export type {
    SpaceGraphEvents,
    PluginEvent,
    VisionReportEvent,
    LayoutAppliedEvent,
    OverlapDetectedEvent,
} from './core/events/EventSystem';

// Plugin system
export { PluginRegistry } from './core/plugins/PluginRegistry';
export { BaseLayout } from './core/plugins/BaseLayout';
export type { Plugin, PluginContext } from './core/plugins/PluginRegistry';
export type { LayoutConfig, LayoutOptions } from './core/plugins/BaseLayout';

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
    ErgonomicsResult,
} from './vision';

// Spatial index
export { SpatialIndex, BVH } from './core/spatial/SpatialIndex';

// Object pool
export { ObjectPool, MathPool } from './core/pooling/ObjectPool';

// Type registry
export { TypeRegistry } from './core/TypeRegistry';

// Camera controls
export { CameraControls } from './core/CameraControls';

// Node types
export { ShapeNode, HtmlNode, ImageNode } from './nodes';

// Factory functions (primary API)
export { createSpaceGraph, createSpaceGraphFromURL, createSpaceGraphFromManifest, quickGraph };

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
    VERSION,
};

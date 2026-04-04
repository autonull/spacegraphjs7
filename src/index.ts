// SpaceGraphJS - The Self-Building UI Framework

import './init';
import {
    createSpaceGraph,
    createSpaceGraphFromURL,
    createSpaceGraphFromManifest,
    quickGraph,
} from './factory';

// ============================================================================
// Utilities
// ============================================================================
export {
    DEG2RAD,
    RAD2DEG,
    clamp,
    lerp,
    lerpVector3,
    mergeDeep,
    toHexColor,
    randomRange,
    randomInt,
    smoothstep,
    mapRange,
} from './utils/math';

export { logger, createLogger, setLogLevel, type LogLevel, type Logger } from './utils/logger';
export { DOMUtils } from './utils/DOMUtils';

// ============================================================================
// Core
// ============================================================================
export { SpaceGraph } from './SpaceGraph';
export type { SpaceGraphOptions } from './types';
export { SpaceGraphApp } from './core/SpaceGraphApp';
export type { SpaceGraphAppOptions, AppButtonConfig } from './core/SpaceGraphApp';
export { InputManager } from './input/InputManager';
export { Graph } from './core/Graph';
export { Renderer } from './core/Renderer';
export { CameraControls } from './core/CameraControls';
export { EventSystem, type SpaceGraphEvents } from './core/events/EventSystem';
export { VisionManager } from './core/VisionManager';
export type { VisionCategory } from './core/vision/VisionAutoFixer.js';
export { ObjectPoolManager } from './core/ObjectPoolManager';
export { CullingManager } from './core/CullingManager';
export { AdvancedRenderingOptimizer } from './core/AdvancedRenderingOptimizer';

// ============================================================================
// Plugin System
// ============================================================================
export { PluginManager, type Plugin } from './core/PluginManager';
export { BaseLayout } from './core/plugins/BaseLayout';
export type { LayoutConfig, LayoutOptions } from './core/plugins/BaseLayout';

// ============================================================================
// Rendering
// ============================================================================
export { RenderingSystem } from './core/renderer/RenderingSystem';
export type { RenderOptions } from './core/renderer/RenderingSystem';
export {
    InstancedNodeRenderer,
    GEOMETRY_FAMILIES,
    type GeometryFamily,
} from './rendering/InstancedNodeRenderer';

// ============================================================================
// Vision System
// ============================================================================
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

// ============================================================================
// Spatial Index
// ============================================================================
export { SpatialIndex, BVH } from './core/spatial/SpatialIndex';

// ============================================================================
// Object Pool
// ============================================================================
export { ObjectPool, MathPool } from './core/pooling/ObjectPool';

// ============================================================================
// Type Registry
// ============================================================================
export { TypeRegistry } from './core/TypeRegistry';

// ============================================================================
// Input
// ============================================================================
export type {
    InputEvent,
    InputEventType,
    InputAction,
    InputBinding,
    InputContext,
    InputState,
    KeyEventData,
    PointerEventData,
    WheelEventData,
    TouchEventData,
} from './input/InputManager';

export type {
    DefaultInputConfig,
    CameraInputConfig,
    InteractionInputConfig,
    HistoryInputConfig,
} from './input/DefaultInputConfig';

// ============================================================================
// Types
// ============================================================================
export type {
    GraphSpec,
    NodeSpec,
    EdgeSpec,
    SpecUpdate,
    SpaceGraphNodeData,
    BaseNodeData,
    BaseEdgeData,
    Dimensions,
    Colorable,
    Opacity,
    Themable,
    CanvasNodeData,
    ChartNodeData,
    DataNodeData,
    GlobeNodeData,
    GroupNodeData,
    HtmlNodeData,
    IFrameNodeData,
    ImageNodeData,
    InstancedShapeNodeData,
    MarkdownNodeData,
    MathNodeData,
    NoteNodeData,
    SceneNodeData,
    ShapeNodeData,
    TextMeshNodeData,
    VideoNodeData,
    AudioNodeData,
    ProcessNodeData,
    CodeEditorNodeData,
    NodeData,
    EdgeData,
    GraphExport,
    GraphEvent,
    NodeEvent,
    EdgeEvent,
    LabelLodLevel,
    LabelLodConfig,
} from './types';

// ============================================================================
// Nodes
// ============================================================================
export { Node } from './nodes/Node';
export { InstancedNode } from './nodes/InstancedNode';
export { ShapeNode } from './nodes/ShapeNode';
export { HtmlNode } from './nodes/HtmlNode';
export { InstancedShapeNode } from './nodes/InstancedShapeNode';
export { ImageNode } from './nodes/ImageNode';
export { GroupNode } from './nodes/GroupNode';
export { NoteNode } from './nodes/NoteNode';
export { CanvasNode } from './nodes/CanvasNode';
export { TextMeshNode } from './nodes/TextMeshNode';
export { DataNode } from './nodes/DataNode';
export { VideoNode } from './nodes/VideoNode';
export { IFrameNode } from './nodes/IFrameNode';
export { ChartNode } from './nodes/ChartNode';
export { MarkdownNode } from './nodes/MarkdownNode';
export { GlobeNode } from './nodes/GlobeNode';
export { SceneNode } from './nodes/SceneNode';
export { AudioNode } from './nodes/AudioNode';
export { MathNode } from './nodes/MathNode';
export { ProcessNode } from './nodes/ProcessNode';
export { CodeEditorNode } from './nodes/CodeEditorNode';

// ============================================================================
// Edges
// ============================================================================
export { Edge } from './edges/Edge';
export { CurvedEdge } from './edges/CurvedEdge';
export { FlowEdge } from './edges/FlowEdge';
export { LabeledEdge } from './edges/LabeledEdge';
export { DottedEdge } from './edges/DottedEdge';
export { DynamicThicknessEdge } from './edges/DynamicThicknessEdge';
export { AnimatedEdge } from './edges/AnimatedEdge';
export { BundledEdge } from './edges/BundledEdge';
export { InterGraphEdge } from './edges/InterGraphEdge';

// ============================================================================
// Plugins - Layout
// ============================================================================
export { ForceLayout } from './plugins/ForceLayout';
export { GridLayout } from './plugins/GridLayout';
export { CircularLayout } from './plugins/CircularLayout';
export { HierarchicalLayout } from './plugins/HierarchicalLayout';
export { RadialLayout } from './plugins/RadialLayout';
export { TreeLayout } from './plugins/TreeLayout';
export { SpectralLayout } from './plugins/SpectralLayout';
export { GeoLayout } from './plugins/GeoLayout';
export { TimelineLayout } from './plugins/TimelineLayout';
export { ClusterLayout } from './plugins/ClusterLayout';

// ============================================================================
// Plugins - Core
// ============================================================================
export { InteractionPlugin } from './plugins/InteractionPlugin';
export { LODPlugin } from './plugins/LODPlugin';
export { AutoLayoutPlugin } from './plugins/AutoLayoutPlugin';
export { AutoColorPlugin } from './plugins/AutoColorPlugin';

// ============================================================================
// Plugins - Extended
// ============================================================================
export { PhysicsPlugin } from './plugins/PhysicsPlugin';
export { MinimapPlugin } from './plugins/MinimapPlugin';
export { ErgonomicsPlugin, type ErgonomicsConfig } from './plugins/ErgonomicsPlugin';
export { VisionOverlayPlugin } from './plugins/VisionOverlayPlugin';
export { HUDPlugin, type HUDElementOptions } from './plugins/HUDPlugin';
export { HoverMetaWidget, type MetaAction } from './plugins/HoverMetaWidget';
export { HistoryPlugin, type HistoryPluginOptions } from './plugins/HistoryPlugin';

// ============================================================================
// Factory Functions (Primary API)
// ============================================================================
export { createSpaceGraph, createSpaceGraphFromURL, createSpaceGraphFromManifest, quickGraph };

// ============================================================================
// Version
// ============================================================================
export const VERSION = '7.0.0';

// ============================================================================
// Default Export
// ============================================================================
export default {
    createSpaceGraph,
    createSpaceGraphFromURL,
    createSpaceGraphFromManifest,
    quickGraph,
    VERSION,
};

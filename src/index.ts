// SpaceGraphJS - The Self-Building UI Framework

// ============================================================================
// Standard Library
// ============================================================================

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

// ============================================================================
// Core (v6 Architecture - Legacy)
// ============================================================================
export { SpaceGraph } from './SpaceGraph';
export { SpaceGraphApp } from './core/SpaceGraphApp';
export { InputManager } from './input/InputManager';
export { Graph } from './core/Graph';
export { Renderer } from './core/Renderer';
export { PluginManager } from './core/PluginManager';
export { CameraControls } from './core/CameraControls';
export { EventManager, type SpaceGraphEvents } from './core/EventManager';
export { VisionManager, type VisionReport, type VisionCategory } from './core/VisionManager';
export { ObjectPoolManager } from './core/ObjectPoolManager';
export { CullingManager } from './core/CullingManager';
export { AdvancedRenderingOptimizer } from './core/AdvancedRenderingOptimizer';

// ============================================================================
// Rendering
// ============================================================================
export {
    InstancedNodeRenderer,
    GEOMETRY_FAMILIES,
    type GeometryFamily,
} from './rendering/InstancedNodeRenderer';

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
    SpaceGraphOptions,
    ISpaceGraphPlugin,
    SpaceGraphNodeData,
    BaseNodeData,
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
} from './types';

// ============================================================================
// Nodes
// ============================================================================
export { Node } from './nodes/Node';
export { InstancedNode } from './nodes/InstancedNode';
export { ShapeNode } from './nodes/ShapeNode';
export { HtmlNode, type LabelLodLevel } from './nodes/HtmlNode';
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
export { LabeledEdge, type LabelLodLevel as EdgeLabelLodLevel } from './edges/LabeledEdge';
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
export { GeoLayout as MapLayout } from './plugins/GeoLayout';
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
// SpaceGraphJS v7.0 Exports (New Architecture)
// ============================================================================
export {
    createSpaceGraph,
    createSpaceGraphFromURL,
    createSpaceGraphFromManifest,
    quickGraph,
    SpaceGraph as SpaceGraphV7,
    Graph as GraphV7,
    Node as NodeV7,
    Edge as EdgeV7,
    EventSystem,
    PluginEventBus,
    PluginRegistry,
    BaseLayout,
    VisionSystem,
    HeuristicsStrategy,
    SpatialIndex,
    BVH,
    ObjectPool,
    MathPool,
    TypeRegistry,
    CameraControls as CameraControlsV7,
    RenderingSystem,
    ShapeNode as ShapeNodeV7,
    HtmlNode as HtmlNodeV7,
    ImageNode as ImageNodeV7,
    EdgeImpl,
    VERSION,
} from './index.v7';

export type {
    SpaceGraphOptions as SpaceGraphV7Options,
    RenderOptions,
    VisionOptions,
    VisionReport as VisionReportV7,
    Plugin,
    PluginContext,
    NodeSpec as NodeSpecV7,
    EdgeSpec as EdgeSpecV7,
    GraphSpec as GraphSpecV7,
    NodeData,
    EdgeData,
    ShapeNodeData as ShapeNodeDataV7,
    HtmlNodeData as HtmlNodeDataV7,
    ImageNodeData as ImageNodeDataV7,
} from './index.v7';

export type { SpaceGraphAppOptions, AppButtonConfig } from './core/SpaceGraphApp';

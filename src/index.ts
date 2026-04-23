import './init';

import { SpaceGraph } from './SpaceGraph';
import type { SpaceGraphOptions } from './types';
import type { RenderOptions } from './core/Renderer';
import type { SpaceGraphEvents } from './core/events/EventSystem';
import type { Disposable } from './core/EventEmitter';
import type { VisionCategory } from './vision/VisionAutoFixer';
import type { Plugin, LayoutConfig, LayoutOptions } from './plugins';
import type {
    VisionOptions,
    VisionReport,
    VisionScore,
    LegibilityResult,
    OverlapResult,
    HierarchyResult,
    ErgonomicsResult,
} from './vision';
import type {
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
    Finger,
    SurfaceTransform,
    DefaultInputConfig,
    CameraInputConfig,
    InteractionInputConfig,
    HistoryInputConfig,
} from './input';
import type {
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
} from './types';
import type { HitResult, Rect } from './core/Surface';
import type { GridModel } from './nodes/VirtualGridNode';
import type { NodeConstructor, EdgeConstructor } from './core/TypeRegistry';
import type { ErgonomicsConfig } from './plugins/ErgonomicsPlugin';
import type { HUDElementOptions } from './plugins/HUDPlugin';
import type { HistoryPluginOptions } from './plugins/HistoryPlugin';
import type { HoverMetaWidgetOptions, HoverAction } from './plugins/interaction/HoverMetaWidget';
import type {
    MermaidPluginOptions,
    DiagramFormat,
    DiagramNode,
    DiagramEdge,
    MermaidThemeName,
    LayoutName,
    MermaidLayoutType,
    MermaidNodeShape,
} from './plugins/mermaid';
import type { GeometryFamily } from './rendering/InstancedNodeRenderer';
import type { SpaceGraphAppOptions, AppButtonConfig } from './core/SpaceGraphApp';
import type { LogLevel, Logger } from './utils/logger';

export {
    DEG2RAD,
    RAD2DEG,
    clamp,
    lerp,
    mergeDeep,
    toHexColor,
    randomRange,
    randomInt,
    smoothstep,
    mapRange,
    safeClone,
} from './utils';

export { logger, createLogger, setLogLevel } from './utils';

export {
    calculateFitView,
    type FitViewResult,
    type Point,
    CameraUtils as CameraUtilsClass,
} from './utils';

export {
    createElement,
    type DOMElementOptions,
    DOMUtils as DOMUtilsClass,
} from './utils';

export {
    getRelativeLuminance,
    getContrastRatio,
    getCompliantColor,
    hexToRgb,
} from './utils';

export { SpaceGraph } from './SpaceGraph';
export { SpaceGraphApp } from './core/SpaceGraphApp';
export { Graph } from './core/Graph';
export { Renderer } from './core/Renderer';
export { CameraControls } from './core/CameraControls';
export { EventSystem } from './core/events/EventSystem';
export { EventEmitter } from './core/EventEmitter';
export { VisionManager } from './core/VisionManager';
export { ObjectPoolManager } from './core/ObjectPoolManager';
export { AnimationDuration, ZoomConfig, FingeringPriority, InteractionThresholds, Performance, Defaults, WCAG, EdgeColors, InputConfig } from './core/constants';

export { PluginManager, BaseLayout } from './plugins';

export {
    ForceLayout,
    type ForceLayoutConfig,
    GridLayout,
    CircularLayout,
    HierarchicalLayout,
    RadialLayout,
    TreeLayout,
    SpectralLayout,
    GeoLayout,
    TimelineLayout,
    ClusterLayout,
    InteractionPlugin,
    LODPlugin,
    AutoLayoutPlugin,
    AutoColorPlugin,
    PhysicsPlugin,
    MinimapPlugin,
    ErgonomicsPlugin,
    VisionOverlayPlugin,
    HUDPlugin,
    HistoryPlugin,
    LayoutContainer,
    HoverMetaWidget,
    MermaidPlugin,
} from './plugins';

export {
    injectMermaidStyles,
    DiagramParserFactory,
    DiagramParseResult,
    DiagramFormat,
    DiagramNode,
    DiagramEdge,
    MermaidParser,
    DOTParser,
    GraphMLParser,
    JSONDiagramParser,
    LAYOUT_NAMES,
    MERMAID_THEMES,
    getLayoutLabel,
} from './plugins/mermaid';

export {
    InstancedNodeRenderer,
    GEOMETRY_FAMILIES,
} from './rendering/InstancedNodeRenderer';

export { VisionSystem, HeuristicsStrategy } from './vision';

export { SpatialIndex, BVH } from './core/spatial/SpatialIndex';

export { ObjectPool, MathPool } from './core/pooling/ObjectPool';
export {
    withPooledVector3,
    withPooledVector2,
    withPooledMatrix4,
    withPooledBox3,
} from './core/pooling/ObjectPool';

export { TypeRegistry } from './core/TypeRegistry';

export { InputManager, FingerManager, Fingering, createParentTransform } from './input';

export {
    Node,
    InstancedNode,
    ShapeNode,
    ButtonNode,
    SliderNode,
    ToggleNode,
    HtmlNode,
    InstancedShapeNode,
    ImageNode,
    GroupNode,
    NoteNode,
    CanvasNode,
    TextMeshNode,
    DataNode,
    VideoNode,
    IFrameNode,
    ChartNode,
    MarkdownNode,
    GlobeNode,
    SceneNode,
    AudioNode,
    MathNode,
    ProcessNode,
    CodeEditorNode,
    StackingNode,
    GridNode,
    SplitNode,
    BorderNode,
    SwitchNode,
    VirtualGridNode,
    PanelNode,
    PortNode,
    DOMNode,
} from './nodes';

export {
    Edge,
    CurvedEdge,
    FlowEdge,
    LabeledEdge,
    DottedEdge,
    DynamicThicknessEdge,
    AnimatedEdge,
    BundledEdge,
    InterGraphEdge,
    Wire,
} from './edges';

export { Surface } from './core/Surface';

export const VERSION = '7.0.0';

export type {
    SpaceGraphOptions,
    RenderOptions,
    SpaceGraphEvents,
    Disposable,
    VisionCategory,
    Plugin,
    LayoutConfig,
    LayoutOptions,
    VisionOptions,
    VisionReport,
    VisionScore,
    LegibilityResult,
    OverlapResult,
    HierarchyResult,
    ErgonomicsResult,
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
    Finger,
    SurfaceTransform,
    DefaultInputConfig,
    CameraInputConfig,
    InteractionInputConfig,
    HistoryInputConfig,
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
    HitResult,
    Rect,
    GridModel,
    NodeConstructor,
    EdgeConstructor,
    ErgonomicsConfig,
    HUDElementOptions,
    HistoryPluginOptions,
    HoverMetaWidgetOptions,
    HoverAction,
    MermaidPluginOptions,
    DiagramFormat,
    DiagramNode,
    DiagramEdge,
    MermaidThemeName,
    LayoutName,
    MermaidLayoutType,
    MermaidNodeShape,
    GeometryFamily,
    SpaceGraphAppOptions,
    AppButtonConfig,
    LogLevel,
    Logger,
};

export default {
    SpaceGraph,
    VERSION,
};

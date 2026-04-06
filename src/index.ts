import './init';
import { SpaceGraph } from './SpaceGraph';

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

export { logger, createLogger, setLogLevel, type LogLevel, type Logger } from './utils';
export { calculateFitView as CameraUtils, createElement as DOMUtils } from './utils';
export { getRelativeLuminance, getContrastRatio, getCompliantColor, hexToRgb } from './utils';

export { SpaceGraph };
export type { SpaceGraphOptions } from './types';
export { SpaceGraphApp } from './core/SpaceGraphApp';
export type { SpaceGraphAppOptions, AppButtonConfig } from './core/SpaceGraphApp';
export { Graph } from './core/Graph';
export { Renderer } from './core/Renderer';
export type { RenderOptions } from './core/Renderer';
export { CameraControls } from './core/CameraControls';
export { EventSystem, type SpaceGraphEvents } from './core/events/EventSystem';
export { EventEmitter, type Disposable } from './core/EventEmitter';
export { VisionManager } from './core/VisionManager';
export type { VisionCategory } from './vision/VisionAutoFixer';
export { ObjectPoolManager } from './core/ObjectPoolManager';

export {
    PluginManager,
    type Plugin,
    BaseLayout,
    type LayoutConfig,
    type LayoutOptions,
} from './plugins';

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
    type ErgonomicsConfig,
    VisionOverlayPlugin,
    HUDPlugin,
    type HUDElementOptions,
    HistoryPlugin,
    type HistoryPluginOptions,
    LayoutContainer,
} from './plugins';

export {
    InstancedNodeRenderer,
    GEOMETRY_FAMILIES,
    type GeometryFamily,
} from './rendering/InstancedNodeRenderer';

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

export { SpatialIndex, BVH } from './core/spatial/SpatialIndex';

export { ObjectPool, MathPool } from './core/pooling/ObjectPool';
export {
    withPooledVector3,
    withPooledVector2,
    withPooledMatrix4,
    withPooledBox3,
} from './core/pooling/ObjectPool';

export { TypeRegistry } from './core/TypeRegistry';
export type { NodeConstructor, EdgeConstructor } from './core/TypeRegistry';

export { InputManager, FingerManager, Fingering, createParentTransform } from './input';
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
    Finger,
    SurfaceTransform,
    DefaultInputConfig,
    CameraInputConfig,
    InteractionInputConfig,
    HistoryInputConfig,
} from './input';

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
} from './types';

export {
    Node,
    InstancedNode,
    ShapeNode,
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
export type { GridModel } from './nodes/VirtualGridNode';

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
export type { HitResult, Rect } from './core/Surface';

export const VERSION = '7.0.0';

export default {
    SpaceGraph,
    VERSION,
};

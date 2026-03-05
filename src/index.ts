// SpaceGraphJS - The Self-Building UI Framework
console.log('[SpaceGraphJS] Loading...');

export { SpaceGraph } from './SpaceGraph';
export type {
    GraphSpec,
    NodeSpec,
    EdgeSpec,
    SpecUpdate,
    SpaceGraphOptions,
    ISpaceGraphPlugin,
    SpaceGraphNodeData,
    BaseNodeData,
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
    NoteNodeData,
    SceneNodeData,
    ShapeNodeData,
    TextMeshNodeData,
    VideoNodeData,
} from './types';

// Core
export { Graph } from './core/Graph';
export { Renderer } from './core/Renderer';
export { PluginManager } from './core/PluginManager';
export { CameraControls } from './core/CameraControls';
export { EventManager } from './core/EventManager';
export { VisionManager } from './core/VisionManager';
export { ObjectPoolManager } from './core/ObjectPoolManager';
export { CullingManager } from './core/CullingManager';
export { AdvancedRenderingOptimizer } from './core/AdvancedRenderingOptimizer';

// Nodes
export { Node } from './nodes/Node';
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

// Edges
export { Edge } from './edges/Edge';
export { CurvedEdge } from './edges/CurvedEdge';
export { FlowEdge } from './edges/FlowEdge';
export { LabeledEdge } from './edges/LabeledEdge';
export { DottedEdge } from './edges/DottedEdge';
export { DynamicThicknessEdge } from './edges/DynamicThicknessEdge';
export { AnimatedEdge } from './edges/AnimatedEdge';
export { BundledEdge } from './edges/BundledEdge';

// Plugins — layout
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

// Plugins — core
export { InteractionPlugin } from './plugins/InteractionPlugin';
export { LODPlugin } from './plugins/LODPlugin';
export { AutoLayoutPlugin } from './plugins/AutoLayoutPlugin';
export { AutoColorPlugin } from './plugins/AutoColorPlugin';

// Plugins — extended
export { PhysicsPlugin } from './plugins/PhysicsPlugin';
export { MinimapPlugin } from './plugins/MinimapPlugin';
export { ErgonomicsPlugin } from './plugins/ErgonomicsPlugin';
export { VisionOverlayPlugin } from './plugins/VisionOverlayPlugin';

console.log('[SpaceGraphJS] Loaded successfully');

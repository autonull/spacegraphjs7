// SpaceGraphJS - Ergonomic Developer API
// Main entry point with unified exports and convenient shortcuts

// Core class - primary entry point
export { SpaceGraph, VERSION, SimpleGraph, type SimpleGraphOptions } from './SpaceGraph';

// Essential core classes (maintained for backward compatibility)
export { Graph, PluginManager, EventEmitter, Selection, TypeRegistry, SpaceGraphApp } from './core';
export { CameraControls } from './core/CameraControls';
export { WebGLRenderer } from './core/WebGLRenderer';
export { ErgonomicsAPI } from './core/Ergonomics';
export { VisionManager } from './core/VisionManager';
export { ObjectPoolManager } from './core/ObjectPoolManager';
export { InputManager } from './input';
export { createCameraFingering } from './input/fingerings';
export { Node } from './nodes/Node';
export { ShapeNode } from './nodes/ShapeNode';
export { Edge } from './edges/Edge';

// Layout base types (SGF-3: export surface audit)
export { BaseLayout, type LayoutOptions, type LayoutConfig } from './plugins/layouts/BaseLayout';

// Node data types (SGF-3: export surface audit)
export type {
    NodeData,
    HtmlNodeData,
    ShapeNodeData,
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
    DOMNodeData,
    WidgetNodeData,
    SpaceGraphNodeData,
} from './types/node-data';

// Spec types (SGF-3: export surface audit)
export type { NodeSpec, EdgeSpec, GraphSpec, GraphExport, GraphImportData, SpecUpdate, ZuiManifest } from './types/spec';

// Vision plugins
export { VisionOverlayPlugin } from './plugins/VisionOverlayPlugin';
export { PhysicsPlugin } from './plugins/PhysicsPlugin';

// Layout plugins
export { ForceLayout, type ForceLayoutConfig } from './plugins/layouts/ForceLayout';
export { CircularLayout, type CircularLayoutOptions } from './plugins/layouts/CircularLayout';
export { GridLayout, type GridLayoutOptions } from './plugins/layouts/GridLayout';
export { HierarchicalLayout, type HierarchicalLayoutOptions } from './plugins/layouts/HierarchicalLayout';
export { RadialLayout, type RadialLayoutOptions } from './plugins/layouts/RadialLayout';
export { SpectralLayout, type SpectralLayoutOptions } from './plugins/layouts/SpectralLayout';
export { TreeLayout, type TreeLayoutOptions } from './plugins/layouts/TreeLayout';

// Interaction plugins
export { HoverMetaWidget, type HoverMetaWidgetOptions } from './plugins/interaction/HoverMetaWidget';
export { InteractionPlugin } from './plugins/InteractionPlugin';

// Mermaid plugin
export { DiagramParserFactory } from './plugins/mermaid/MermaidParser';
export { MermaidPlugin, type MermaidPluginOptions, injectMermaidStyles } from './plugins/mermaid/MermaidPlugin';

// HUD plugin
export { HUDPlugin, type HUDElementOptions } from './plugins/HUDPlugin';

// History plugin
export { HistoryPlugin, type HistoryPluginOptions } from './plugins/HistoryPlugin';

// Minimap plugin
export { MinimapPlugin } from './plugins/MinimapPlugin';

// Convenience factory functions
export { createSpaceGraph, createGraph, sg, qg } from './SpaceGraph';

// Event types for type-safe event handling
export type { SpaceGraphEvents, SelectionChangedPayload } from './types/events';

// Layout registry (SGF-2: layout registry and one name)
export { listLayouts, getLayoutRegistry, type LayoutRegistryEntry, DEFAULT_LAYOUT_PLUGINS, LAYOUT_REGISTRY } from './core/defaults';

// Re-export submodules for direct access (tree-shakeable)
export * as builder from './builder';
export * as core from './core';
export * as edges from './edges';
export * as input from './input';
export * as nodes from './nodes';
export * as plugins from './plugins';
export * as rendering from './rendering';
export * as types from './types';
export * as utils from './utils';
export * as vision from './vision';
export * as zoom from './zoom';
export * as layout from './plugins/layouts';
export * as depth from './depth';
export * as navigation from './navigation';
export * as representations from './representations';
export * as overlays from './overlays';
export * as control from './control';
export * as a11y from './a11y';
export * as levels from './levels';

// Logger utility
export { createLogger, logger, setLogLevel, type LogLevel, type Logger } from './utils/logger';

// Type augmentation for global access
declare global {
    interface Window {
        SpaceGraph?: typeof import('./SpaceGraph').SpaceGraph;
    }
}

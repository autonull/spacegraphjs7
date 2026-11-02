// Consolidated default registrations
import {
  AnimatedEdge,
  BundledEdge,
  CurvedEdge,
  DottedEdge,
  DynamicThicknessEdge,
  Edge,
  FlowEdge,
  InterGraphEdge,
  LabeledEdge,
  Wire,
} from '../edges';
import {
  AudioNode,
  BorderNode,
  CanvasNode,
  ChartNode,
  CodeEditorNode,
  ColorPickerNode,
  DataNode,
  DOMNode,
  DropdownNode,
  GlobeNode,
  GridNode,
  GroupNode,
  HtmlNode,
  IFrameNode,
  ImageNode,
  InstancedShapeNode,
  MarkdownNode,
  MathNode,
  MeterNode,
  NoteNode,
  PanelNode,
  PortNode,
  ProcessNode,
  ProgressBarNode,
  SceneNode,
  ScrollPanelNode,
  ShapeNode,
  SplitNode,
  StackingNode,
  SwitchNode,
  TabContainerNode,
  TextMeshNode,
  VideoNode,
  VirtualGridNode,
} from '../nodes';
import {
  AutoColorPlugin,
  AutoLayoutPlugin,
  CircularLayout,
  ClusterLayout,
  ErgonomicsPlugin,
  ForceLayout,
  GeoLayout,
  GridLayout,
  HierarchicalLayout,
  HistoryPlugin,
  HUDPlugin,
  InteractionPlugin,
  LODPlugin,
  MinimapPlugin,
  PhysicsPlugin,
  RadialLayout,
  SpectralLayout,
  TimelineLayout,
  TreeLayout,
  ZoomBandsPlugin,
  ZoomUIPlugin,
} from '../plugins';
import { MermaidNode } from '../plugins/mermaid';
import type { Plugin } from '../core/PluginManager';
import type { EdgeSpec, GraphSpec, NodeSpec } from '../types';

export type PluginCtor = new () => Plugin;

// Default node types - automatically registered (alphabetically organized)
export const DEFAULT_NODE_TYPES = [
  AudioNode,
  BorderNode,
  CanvasNode,
  ChartNode,
  CodeEditorNode,
  ColorPickerNode,
  DataNode,
  DOMNode,
  DropdownNode,
  GlobeNode,
  GridNode,
  GroupNode,
  HtmlNode,
  IFrameNode,
  ImageNode,
  InstancedShapeNode,
  MarkdownNode,
  MathNode,
  MermaidNode,
  MeterNode,
  NoteNode,
  PanelNode,
  PortNode,
  ProcessNode,
  ProgressBarNode,
  SceneNode,
  ScrollPanelNode,
  ShapeNode,
  SplitNode,
  StackingNode,
  SwitchNode,
  TabContainerNode,
  TextMeshNode,
  VideoNode,
  VirtualGridNode,
] as const;

// Node registration name: use the class's own `typeName` only. Static fields are inherited, so a
// subclass without its own (MermaidNode extends HtmlNode) would otherwise register under — and
// replace — its parent's constructor.
export function nodeTypeName(cls: { name: string; typeName?: string }): string {
  return Object.prototype.hasOwnProperty.call(cls, 'typeName') && cls.typeName
    ? cls.typeName
    : cls.name;
}

// Default edge types - automatically registered (alphabetically organized)
export const DEFAULT_EDGE_TYPES = [
  AnimatedEdge,
  BundledEdge,
  CurvedEdge,
  DynamicThicknessEdge,
  Edge,
  FlowEdge,
  InterGraphEdge,
  LabeledEdge,
  DottedEdge,
  Wire,
] as const;

// Default layout plugins - automatically registered (alphabetically organized)
export const DEFAULT_LAYOUT_PLUGINS: [PluginCtor, string][] = [
  [CircularLayout, 'CircularLayout'],
  [ClusterLayout, 'ClusterLayout'],
  [ForceLayout, 'ForceLayout'],
  [GeoLayout, 'GeoLayout'],
  [GridLayout, 'GridLayout'],
  [HierarchicalLayout, 'HierarchicalLayout'],
  [RadialLayout, 'RadialLayout'],
  [SpectralLayout, 'SpectralLayout'],
  [TimelineLayout, 'TimelineLayout'],
  [TreeLayout, 'TreeLayout'],
];

// Chrome plugins render host-level affordances: HUD telemetry, minimap, zoom indicator and hint.
// Embedded graphs opt in with `chrome: true`; the default stays canvas plus CSS3D layer only.
export const DEFAULT_CHROME_PLUGINS: [PluginCtor, string][] = [
  [ZoomBandsPlugin, 'ZoomBandsPlugin'],
  [ZoomUIPlugin, 'ZoomUIPlugin'],
  [MinimapPlugin, 'MinimapPlugin'],
  [HUDPlugin, 'HUDPlugin'],
];

// Default system plugins - automatically registered (alphabetically organized)
export const DEFAULT_SYSTEM_PLUGINS: [PluginCtor, string][] = [
  [AutoColorPlugin, 'AutoColorPlugin'],
  [AutoLayoutPlugin, 'AutoLayoutPlugin'],
  [ErgonomicsPlugin, 'ErgonomicsPlugin'],
  [HistoryPlugin, 'HistoryPlugin'],
  [InteractionPlugin, 'InteractionPlugin'],
  [LODPlugin, 'LODPlugin'],
  [PhysicsPlugin, 'PhysicsPlugin'],
];

// Quick graph specification builder
export function createQuickGraphSpec(
  nodes: Array<{
    id: string;
    label?: string;
    position?: [number, number, number];
    data?: Record<string, unknown>;
  }>,
  edges?: Array<{ id: string; source: string; target: string }>
): GraphSpec {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: 'ShapeNode',
      label: n.label,
      position: n.position,
      data: n.data,
    })) as NodeSpec[],
    edges: (edges?.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'Edge',
    })) ?? []) as EdgeSpec[],
  };
}

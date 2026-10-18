// Consolidated default registrations

import {
  AnimatedEdge,
  BundledEdge,
  CurvedEdge,
  DottedEdge,
  DynamicThicknessEdge,
  InterGraphEdge,
  LabeledEdge,
} from '../edges';
import {
  BorderNode,
  CanvasNode,
  CodeEditorNode,
  IFrameNode,
  InstancedShapeNode,
  MarkdownNode,
  ProcessNode,
  StackingNode,
  SwitchNode,
  TextMeshNode,
  VirtualGridNode,
} from '../nodes';
// System plugins
// Layout plugins
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
  InteractionPlugin,
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
// Edge types
import { Edge } from '../edges/Edge';
import { FlowEdge } from '../edges/FlowEdge';
import { Wire } from '../edges/Wire';
import { AudioNode } from '../nodes/AudioNode';
import { ChartNode } from '../nodes/ChartNode';
import { ColorPickerNode } from '../nodes/ColorPickerNode';
import { DataNode } from '../nodes/DataNode';
import { DOMNode } from '../nodes/DOMNode';
import { DropdownNode } from '../nodes/DropdownNode';
import { GlobeNode } from '../nodes/GlobeNode';
import { GridNode } from '../nodes/GridNode';
import { GroupNode } from '../nodes/GroupNode';
import { HtmlNode } from '../nodes/HtmlNode';
import { ImageNode } from '../nodes/ImageNode';
import { MathNode } from '../nodes/MathNode';
import { MeterNode } from '../nodes/MeterNode';
import { NoteNode } from '../nodes/NoteNode';
import { PanelNode } from '../nodes/PanelNode';
import { PortNode } from '../nodes/PortNode';
import { ProgressBarNode } from '../nodes/ProgressBarNode';
import { SceneNode } from '../nodes/SceneNode';
import { ScrollPanelNode } from '../nodes/ScrollPanelNode';
// Node types
import { ShapeNode } from '../nodes/ShapeNode';
import { SplitNode } from '../nodes/SplitNode';
import { TabContainerNode } from '../nodes/TabContainerNode';
import { VideoNode } from '../nodes/VideoNode';
import { HUDPlugin } from '../plugins/HUDPlugin';
import { LODPlugin } from '../plugins/LODPlugin';
import type { EdgeSpec, GraphSpec, NodeSpec } from '../types';

type PluginCtor = new () => Plugin;

// Default node types - automatically registered
export const DEFAULT_NODE_TYPES = [
  ShapeNode,
  InstancedShapeNode,
  HtmlNode,
  DOMNode,
  ImageNode,
  GroupNode,
  NoteNode,
  DataNode,
  CanvasNode,
  TextMeshNode,
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
  TabContainerNode,
  MermaidNode,
  ScrollPanelNode,
  ColorPickerNode,
  DropdownNode,
  ProgressBarNode,
  MeterNode,
] as const;

// Default edge types - automatically registered
export const DEFAULT_EDGE_TYPES = [
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
] as const;

// Default layout plugins - automatically registered
export const DEFAULT_LAYOUT_PLUGINS: [PluginCtor, string][] = [
  [ForceLayout, 'ForceLayout'],
  [CircularLayout, 'CircularLayout'],
  [GridLayout, 'GridLayout'],
  [HierarchicalLayout, 'HierarchicalLayout'],
  [RadialLayout, 'RadialLayout'],
  [TreeLayout, 'TreeLayout'],
  [SpectralLayout, 'SpectralLayout'],
  [GeoLayout, 'GeoLayout'],
  [TimelineLayout, 'TimelineLayout'],
  [ClusterLayout, 'ClusterLayout'],
];

// Chrome plugins render host-level affordances: HUD telemetry, minimap, zoom indicator and hint.
// Embedded graphs opt in with `chrome: true`; the default stays canvas plus CSS3D layer only.
export const DEFAULT_CHROME_PLUGINS: [PluginCtor, string][] = [
  [ZoomBandsPlugin, 'ZoomBandsPlugin'],
  [ZoomUIPlugin, 'ZoomUIPlugin'],
  [MinimapPlugin, 'MinimapPlugin'],
  [HUDPlugin, 'HUDPlugin'],
];

// Default system plugins - automatically registered
export const DEFAULT_SYSTEM_PLUGINS: [PluginCtor, string][] = [
  [InteractionPlugin, 'InteractionPlugin'],
  [LODPlugin, 'LODPlugin'],
  [AutoLayoutPlugin, 'AutoLayoutPlugin'],
  [AutoColorPlugin, 'AutoColorPlugin'],
  [ErgonomicsPlugin, 'ErgonomicsPlugin'],
  [PhysicsPlugin, 'PhysicsPlugin'],
  [HistoryPlugin, 'HistoryPlugin'],
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

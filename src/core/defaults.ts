// Consolidated default registrations
import type { Plugin } from '../core/PluginManager';
import { AnimatedEdge } from '../edges/AnimatedEdge';
import { BundledEdge } from '../edges/BundledEdge';
import { CurvedEdge } from '../edges/CurvedEdge';
import { DottedEdge } from '../edges/DottedEdge';
import { DynamicThicknessEdge } from '../edges/DynamicThicknessEdge';
// Edge types
import { Edge } from '../edges/Edge';
import { FlowEdge } from '../edges/FlowEdge';
import { InterGraphEdge } from '../edges/InterGraphEdge';
import { LabeledEdge } from '../edges/LabeledEdge';
import { Wire } from '../edges/Wire';
import { AudioNode } from '../nodes/AudioNode';
import { BorderNode } from '../nodes/BorderNode';
import { CanvasNode } from '../nodes/CanvasNode';
import { ChartNode } from '../nodes/ChartNode';
import { CodeEditorNode } from '../nodes/CodeEditorNode';
import { ColorPickerNode } from '../nodes/ColorPickerNode';
import { DataNode } from '../nodes/DataNode';
import { DropdownNode } from '../nodes/DropdownNode';
import { GlobeNode } from '../nodes/GlobeNode';
import { GridNode } from '../nodes/GridNode';
import { GroupNode } from '../nodes/GroupNode';
import { HtmlNode } from '../nodes/HtmlNode';
import { IFrameNode } from '../nodes/IFrameNode';
import { ImageNode } from '../nodes/ImageNode';
import { InstancedShapeNode } from '../nodes/InstancedShapeNode';
import { MarkdownNode } from '../nodes/MarkdownNode';
import { MathNode } from '../nodes/MathNode';
import { MeterNode } from '../nodes/MeterNode';
import { NoteNode } from '../nodes/NoteNode';
import { PanelNode } from '../nodes/PanelNode';
import { PortNode } from '../nodes/PortNode';
import { ProcessNode } from '../nodes/ProcessNode';
import { ProgressBarNode } from '../nodes/ProgressBarNode';
import { SceneNode } from '../nodes/SceneNode';
import { ScrollPanelNode } from '../nodes/ScrollPanelNode';
// Node types
import { ShapeNode } from '../nodes/ShapeNode';
import { SplitNode } from '../nodes/SplitNode';
import { StackingNode } from '../nodes/StackingNode';
import { SwitchNode } from '../nodes/SwitchNode';
import { TabContainerNode } from '../nodes/TabContainerNode';
import { TextMeshNode } from '../nodes/TextMeshNode';
import { VideoNode } from '../nodes/VideoNode';
import { VirtualGridNode } from '../nodes/VirtualGridNode';
import { AutoColorPlugin } from '../plugins/AutoColorPlugin';
import { AutoLayoutPlugin } from '../plugins/AutoLayoutPlugin';
import { ErgonomicsPlugin } from '../plugins/ErgonomicsPlugin';
import { FractalZoomPlugin } from '../plugins/FractalZoomPlugin';
import { HistoryPlugin } from '../plugins/HistoryPlugin';
import { HUDPlugin } from '../plugins/HUDPlugin';
// System plugins
import { InteractionPlugin } from '../plugins/InteractionPlugin';
import { LODPlugin } from '../plugins/LODPlugin';
import { CircularLayout } from '../plugins/layouts/CircularLayout';
import { ClusterLayout } from '../plugins/layouts/ClusterLayout';
// Layout plugins
import { ForceLayout } from '../plugins/layouts/ForceLayout';
import { GeoLayout } from '../plugins/layouts/GeoLayout';
import { GridLayout } from '../plugins/layouts/GridLayout';
import { HierarchicalLayout } from '../plugins/layouts/HierarchicalLayout';
import { RadialLayout } from '../plugins/layouts/RadialLayout';
import { SpectralLayout } from '../plugins/layouts/SpectralLayout';
import { TimelineLayout } from '../plugins/layouts/TimelineLayout';
import { TreeLayout } from '../plugins/layouts/TreeLayout';
import { MinimapPlugin } from '../plugins/MinimapPlugin';
import { MermaidNode } from '../plugins/mermaid/MermaidNode';
import { PhysicsPlugin } from '../plugins/PhysicsPlugin';
import { ZoomUIPlugin } from '../plugins/ZoomUIPlugin';
import type { EdgeSpec, GraphSpec, NodeSpec } from '../types';

type PluginCtor = new () => Plugin;

// Default node types - automatically registered
export const DEFAULT_NODE_TYPES = [
  ShapeNode,
  InstancedShapeNode,
  HtmlNode,
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

// Default system plugins - automatically registered
export const DEFAULT_SYSTEM_PLUGINS: [PluginCtor, string][] = [
  [InteractionPlugin, 'InteractionPlugin'],
  [FractalZoomPlugin, 'FractalZoomPlugin'],
  [ZoomUIPlugin, 'ZoomUIPlugin'],
  [LODPlugin, 'LODPlugin'],
  [AutoLayoutPlugin, 'AutoLayoutPlugin'],
  [AutoColorPlugin, 'AutoColorPlugin'],
  [MinimapPlugin, 'MinimapPlugin'],
  [ErgonomicsPlugin, 'ErgonomicsPlugin'],
  [PhysicsPlugin, 'PhysicsPlugin'],
  [HUDPlugin, 'HUDPlugin'],
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

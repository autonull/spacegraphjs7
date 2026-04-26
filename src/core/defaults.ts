import { ShapeNode } from '../nodes/ShapeNode';
import { InstancedShapeNode } from '../nodes/InstancedShapeNode';
import { HtmlNode } from '../nodes/HtmlNode';
import { ImageNode } from '../nodes/ImageNode';
import { GroupNode } from '../nodes/GroupNode';
import { NoteNode } from '../nodes/NoteNode';
import { DataNode } from '../nodes/DataNode';
import { CanvasNode } from '../nodes/CanvasNode';
import { TextMeshNode } from '../nodes/TextMeshNode';
import { VideoNode } from '../nodes/VideoNode';
import { IFrameNode } from '../nodes/IFrameNode';
import { ChartNode } from '../nodes/ChartNode';
import { MarkdownNode } from '../nodes/MarkdownNode';
import { GlobeNode } from '../nodes/GlobeNode';
import { SceneNode } from '../nodes/SceneNode';
import { AudioNode } from '../nodes/AudioNode';
import { MathNode } from '../nodes/MathNode';
import { ProcessNode } from '../nodes/ProcessNode';
import { CodeEditorNode } from '../nodes/CodeEditorNode';
import { StackingNode } from '../nodes/StackingNode';
import { GridNode } from '../nodes/GridNode';
import { SplitNode } from '../nodes/SplitNode';
import { BorderNode } from '../nodes/BorderNode';
import { SwitchNode } from '../nodes/SwitchNode';
import { VirtualGridNode } from '../nodes/VirtualGridNode';
import { PanelNode } from '../nodes/PanelNode';
import { PortNode } from '../nodes/PortNode';
import { MermaidNode } from '../plugins/mermaid/MermaidNode';
import { Edge } from '../edges/Edge';
import { CurvedEdge } from '../edges/CurvedEdge';
import { FlowEdge } from '../edges/FlowEdge';
import { LabeledEdge } from '../edges/LabeledEdge';
import { DottedEdge } from '../edges/DottedEdge';
import { DynamicThicknessEdge } from '../edges/DynamicThicknessEdge';
import { AnimatedEdge } from '../edges/AnimatedEdge';
import { BundledEdge } from '../edges/BundledEdge';
import { InterGraphEdge } from '../edges/InterGraphEdge';
import { Wire } from '../edges/Wire';
import { ForceLayout } from '../plugins/layouts/ForceLayout';
import { CircularLayout } from '../plugins/layouts/CircularLayout';
import { GridLayout } from '../plugins/layouts/GridLayout';
import { HierarchicalLayout } from '../plugins/layouts/HierarchicalLayout';
import { RadialLayout } from '../plugins/layouts/RadialLayout';
import { TreeLayout } from '../plugins/layouts/TreeLayout';
import { SpectralLayout } from '../plugins/layouts/SpectralLayout';
import { GeoLayout } from '../plugins/layouts/GeoLayout';
import { TimelineLayout } from '../plugins/layouts/TimelineLayout';
import { ClusterLayout } from '../plugins/layouts/ClusterLayout';
import { InteractionPlugin } from '../plugins/InteractionPlugin';
import { LODPlugin } from '../plugins/LODPlugin';
import { AutoLayoutPlugin } from '../plugins/AutoLayoutPlugin';
import { AutoColorPlugin } from '../plugins/AutoColorPlugin';
import { MinimapPlugin } from '../plugins/MinimapPlugin';
import { ErgonomicsPlugin } from '../plugins/ErgonomicsPlugin';
import { PhysicsPlugin } from '../plugins/PhysicsPlugin';
import { HUDPlugin } from '../plugins/HUDPlugin';
import { HistoryPlugin } from '../plugins/HistoryPlugin';
import { FractalZoomPlugin } from '../plugins/FractalZoomPlugin';
import { ZoomUIPlugin } from '../plugins/ZoomUIPlugin';
import type { Plugin } from '../core/PluginManager';
import type { GraphSpec, NodeSpec, EdgeSpec } from '../types';

type PluginCtor = new () => Plugin;

export const DEFAULT_NODE_TYPES = [ShapeNode, InstancedShapeNode, HtmlNode, ImageNode, GroupNode, NoteNode, DataNode, CanvasNode, TextMeshNode, VideoNode, IFrameNode, ChartNode, MarkdownNode, GlobeNode, SceneNode, AudioNode, MathNode, ProcessNode, CodeEditorNode, StackingNode, GridNode, SplitNode, BorderNode, SwitchNode, VirtualGridNode, PanelNode, PortNode, MermaidNode] as const;
export const DEFAULT_EDGE_TYPES = [Edge, CurvedEdge, FlowEdge, LabeledEdge, DottedEdge, DynamicThicknessEdge, AnimatedEdge, BundledEdge, InterGraphEdge, Wire] as const;
export const DEFAULT_LAYOUT_PLUGINS: [PluginCtor, string][] = [[ForceLayout, 'ForceLayout'], [CircularLayout, 'CircularLayout'], [GridLayout, 'GridLayout'], [HierarchicalLayout, 'HierarchicalLayout'], [RadialLayout, 'RadialLayout'], [TreeLayout, 'TreeLayout'], [SpectralLayout, 'SpectralLayout'], [GeoLayout, 'GeoLayout'], [TimelineLayout, 'TimelineLayout'], [ClusterLayout, 'ClusterLayout']];
export const DEFAULT_SYSTEM_PLUGINS: [PluginCtor, string][] = [[InteractionPlugin, 'InteractionPlugin'], [FractalZoomPlugin, 'FractalZoomPlugin'], [ZoomUIPlugin, 'ZoomUIPlugin'], [LODPlugin, 'LODPlugin'], [AutoLayoutPlugin, 'AutoLayoutPlugin'], [AutoColorPlugin, 'AutoColorPlugin'], [MinimapPlugin, 'MinimapPlugin'], [ErgonomicsPlugin, 'ErgonomicsPlugin'], [PhysicsPlugin, 'PhysicsPlugin'], [HUDPlugin, 'HUDPlugin'], [HistoryPlugin, 'HistoryPlugin']];

export function createQuickGraphSpec(
    nodes: Array<{ id: string; label?: string; position?: [number, number, number]; data?: Record<string, unknown> }>,
    edges?: Array<{ id: string; source: string; target: string }>
): GraphSpec {
    return {
        nodes: nodes.map((n) => ({ id: n.id, type: 'ShapeNode', label: n.label, position: n.position, data: n.data })) as NodeSpec[],
        edges: (edges?.map((e) => ({ id: e.id, source: e.source, target: e.target, type: 'Edge' })) ?? []) as EdgeSpec[],
    };
}
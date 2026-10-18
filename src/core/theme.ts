import type { EdgeData, NodeData, SpaceGraphTheme } from '../types';
import { NodeDefaults } from './constants';

// Fully-resolved theme. Only the interaction/outline colours carry fallbacks; colour and label
// defaults stay optional so a partial theme never overrides a node's own styling.
export interface ResolvedTheme {
  nodeFill?: string | number;
  nodeStroke?: string | number;
  label?: SpaceGraphTheme['label'];
  edgeColor?: string | number;
  edgeLabelColor?: string;
  selection: string | number;
  hover: string | number;
  focus: string | number;
}

const FALLBACK = {
  selection: NodeDefaults.SELECTED_COLOR,
  hover: NodeDefaults.HOVER_COLOR,
  focus: 0x8b5cf6,
} as const;

export function resolveTheme(theme?: SpaceGraphTheme): ResolvedTheme {
  return {
    nodeFill: theme?.node?.fill,
    nodeStroke: theme?.node?.stroke,
    label: theme?.label,
    edgeColor: theme?.edge?.color,
    edgeLabelColor: theme?.edge?.labelColor,
    selection: theme?.selection ?? FALLBACK.selection,
    hover: theme?.hover ?? FALLBACK.hover,
    focus: theme?.focus ?? FALLBACK.focus,
  };
}

// Apply theme fill/stroke to a node's data only when the node did not set its own.
export function applyNodeTheme(data: NodeData, theme?: SpaceGraphTheme): NodeData {
  if (!theme?.node) return data;
  const next: NodeData = { ...data };
  if (next.color === undefined && theme.node.fill !== undefined) next.color = theme.node.fill;
  if (next.stroke === undefined && theme.node.stroke !== undefined) {
    (next as Record<string, unknown>).stroke = theme.node.stroke;
  }
  return next;
}

// Apply theme colour to an edge's data only when the edge did not set its own.
export function applyEdgeTheme(data: EdgeData, theme?: SpaceGraphTheme): EdgeData {
  if (!theme?.edge) return data;
  const next: EdgeData = { ...data };
  if (next.color === undefined && theme.edge.color !== undefined) {
    next.color = theme.edge.color as number;
  }
  if (next.labelColor === undefined && theme.edge.labelColor !== undefined) {
    next.labelColor = theme.edge.labelColor;
  }
  return next;
}

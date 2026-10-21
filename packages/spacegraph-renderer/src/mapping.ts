import {
  edgeStyleFor,
  parseColor as contractParseColor,
  statusColor as contractStatusColor,
  type RenderEdge,
  type RenderNode,
  type RenderTheme,
} from '@spacegraphjs/renderer';
import type { EdgeSpec, NodeData, NodeSpec, SpaceGraphTheme } from 'spacegraphjs/activity';

// The adapter never interprets host semantics: it maps a render-facing node/edge to a core spec.

const FALLBACK_COLOR = 0x888888;

/**
 * RF.6 — map the renderer-facing theme onto the core theme so selection/focus/hover outlines, edge
 * colours, the edge-label pill, and label typography all follow the host instead of core defaults.
 */
export function spaceGraphTheme(theme: RenderTheme): SpaceGraphTheme {
  return {
    background: theme.background,
    node: { stroke: parseColor(theme.border) },
    edge: { color: parseColor(theme.edge), labelColor: theme.textMuted, labelBackground: theme.surface },
    label: { color: theme.text, fontFamily: theme.fontFamily, fontSize: theme.fontSize },
    selection: parseColor(theme.selection),
    hover: parseColor(theme.focus),
    focus: parseColor(theme.focus),
  };
}

export function statusColor(status: RenderNode['status'], theme: RenderTheme): number {
  return parseColor(contractStatusColor(status, theme));
}

function shapeFor(shape: RenderNode['shape']): string {
  return shape === 'dot' ? 'circle' : 'box';
}

export function nodeSpec(node: RenderNode, theme: RenderTheme): NodeSpec {
  const color = statusColor(node.status, theme);
  const position: [number, number, number] = [node.position[0], node.position[1], node.position[2]];
  // A backdrop (a swimlane band, a lane label) is drawn, not lived in: it does not answer the pointer.
  const interactive = node.interactive !== false;
  if (node.html) {
    // P8.9: wrap host markup in a directional container so bidi text renders correctly; the host's
    // markup is never parsed or evaluated, only placed inside the wrapper.
    const html = theme.direction
      ? `<div dir="${theme.direction}" style="width:100%;height:100%">${node.html}</div>`
      : node.html;
    const data: NodeData = {
      ...node.data,
      html,
      pointerEvents: interactive ? 'auto' : 'none',
      width: node.size?.[0] ?? 220,
      height: node.size?.[1] ?? 72,
      // Host markup draws its own surface; the node's box stays neutral so status reads as an accent.
      color: parseColor(theme.surface),
      // T1.10: markup that inherits its colour (lane labels) must follow the host text token, not the
      // core's hard-coded white, which vanishes on the light canvas.
      // Lane labels use textMuted for sufficient contrast in both light and dark.
      style: { color: node.data?.colorToken === 'textMuted' ? theme.textMuted : theme.text },
      interactive,
    };
    return { id: node.id, type: 'HtmlNode', label: node.label, position, data };
  }
  const data: NodeData = {
    ...node.data,
    shape: shapeFor(node.shape),
    color,
    interactive,
  };
  // Only override the core's default shape size when the host supplied one; forcing 1 renders a
  // sub-pixel node (and edges to it look like they dangle).
  if (node.size) data.size = node.size[0];
  return { id: node.id, type: 'ShapeNode', label: node.label, position, data };
}

export function edgeSpec(edge: RenderEdge, theme: RenderTheme): EdgeSpec {
  const style = edgeStyleFor(edge, theme);
  const data = {
    color: parseColor(style.color),
    thickness: style.width,
    dashed: style.dashed,
    label: edge.label,
    labelColor: theme.textMuted,
    arrowhead: edge.directed ? ('target' as const) : (false as const),
  };
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.label ? 'LabeledEdge' : 'CurvedEdge',
    data,
  };
}

export function parseColor(value: string | undefined): number {
  return contractParseColor(value) ?? FALLBACK_COLOR;
}

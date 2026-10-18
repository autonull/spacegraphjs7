import type { RenderEdge, RenderNode, RenderTheme } from '@spacegraphjs/renderer';
import type { EdgeSpec, NodeData, NodeSpec } from 'spacegraphjs/activity';

// The adapter never interprets host semantics: it maps a render-facing node/edge to a core spec.

const FALLBACK_COLOR = 0x888888;

export function statusColor(status: RenderNode['status'], theme: RenderTheme): number {
  switch (status) {
    case 'success':
      return parseColor(theme.success);
    case 'warning':
      return parseColor(theme.warning);
    case 'error':
      return parseColor(theme.error);
    case 'running':
    case 'pending':
      return parseColor(theme.accent);
    default:
      return parseColor(theme.surfaceMuted);
  }
}

function shapeFor(shape: RenderNode['shape']): string {
  return shape === 'dot' ? 'circle' : 'box';
}

export function nodeSpec(node: RenderNode, theme: RenderTheme): NodeSpec {
  const color = statusColor(node.status, theme);
  const position: [number, number, number] = [node.position[0], node.position[1], node.position[2]];
  if (node.html) {
    // P8.9: wrap host markup in a directional container so bidi text renders correctly; the host's
    // markup is never parsed or evaluated, only placed inside the wrapper.
    const html = theme.direction
      ? `<div dir="${theme.direction}" style="width:100%;height:100%">${node.html}</div>`
      : node.html;
    const data: NodeData = {
      ...node.data,
      html,
      pointerEvents: 'auto',
      width: node.size?.[0] ?? 220,
      height: node.size?.[1] ?? 72,
      color,
    };
    return { id: node.id, type: 'HtmlNode', label: node.label, position, data };
  }
  const data: NodeData = {
    ...node.data,
    shape: shapeFor(node.shape),
    color,
  };
  // Only override the core's default shape size when the host supplied one; forcing 1 renders a
  // sub-pixel node (and edges to it look like they dangle).
  if (node.size) data.size = node.size[0];
  return { id: node.id, type: 'ShapeNode', label: node.label, position, data };
}

export function edgeSpec(edge: RenderEdge, theme: RenderTheme): EdgeSpec {
  const inferred = edge.confidence === 'inferred';
  const data = {
    color: parseColor(inferred ? theme.edgeMuted : theme.edge),
    thickness: inferred ? 1 : 2,
    dashed: inferred || edge.style === 'dashed' || edge.style === 'dotted',
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
  if (!value) return FALLBACK_COLOR;
  const hex = value.trim();
  if (hex.startsWith('#')) {
    const body = hex.slice(1);
    if (body.length === 3) {
      return Number.parseInt(body.replace(/./g, (c) => c + c), 16);
    }
    if (body.length === 6) return Number.parseInt(body, 16);
    if (body.length === 8) return Number.parseInt(body.slice(0, 6), 16);
    return FALLBACK_COLOR;
  }
  const rgb = hex.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    return (Number(rgb[1]) << 16) | (Number(rgb[2]) << 8) | Number(rgb[3]);
  }
  return FALLBACK_COLOR;
}

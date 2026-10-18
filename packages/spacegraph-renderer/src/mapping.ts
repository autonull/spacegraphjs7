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
    const data: NodeData = {
      ...node.data,
      html: node.html,
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
    size: node.size?.[0] ?? 1,
    color,
  };
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

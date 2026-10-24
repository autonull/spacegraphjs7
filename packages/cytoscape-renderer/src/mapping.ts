import type { EdgeDefinition, NodeDefinition, StylesheetJson } from 'cytoscape';
import {
  edgeStyleFor,
  isCardShape,
  normalizeHexColor,
  statusColor,
  THEME_COLOR_ROLES,
  type RenderEdge,
  type RenderNode,
  type RenderTheme,
} from '@spacegraphjs/renderer';

// The adapter never interprets host semantics: it maps render-facing nodes and edges to Cytoscape
// elements. Enum-valued style props (shape, line-style, arrow) are driven by classes/selectors so the
// stylesheet stays fully typed; only label/color/width/height come from `data()`.

export { statusColor };

/** Cytoscape rejects 8-digit hex while host theme tokens are often `#rrggbbaa`, so normalize every color. */
export function normalizeTheme(theme: RenderTheme): RenderTheme {
  const normalized: RenderTheme = { ...theme };
  for (const role of THEME_COLOR_ROLES) {
    normalized[role] = normalizeHexColor(theme[role]);
  }
  return normalized;
}

function nodeSize(node: RenderNode): [number, number] {
  const [width, height] = node.size ?? [];
  if (node.shape === 'group') return [width ?? 320, height ?? 220];
  if (isCardShape(node.shape)) return [width ?? 200, height ?? 64];
  if (node.shape === 'dot') return [width ?? 16, height ?? 16];
  return [width ?? 32, height ?? 20];
}

function nodeClass(node: RenderNode): string {
  if (node.shape === 'group') return 'group';
  if (isCardShape(node.shape)) return 'card';
  return node.shape === 'dot' ? 'dot' : 'badge';
}

export function nodeElement(node: RenderNode, theme: RenderTheme): NodeDefinition {
  const [width, height] = nodeSize(node);
  return {
    group: 'nodes',
    classes: nodeClass(node),
    data: {
      id: node.id,
      label: node.label,
      kind: node.kind,
      status: node.status ?? 'neutral',
      color: statusColor(node.status, theme),
      width,
      height,
      ...(node.parent ? { parent: node.parent } : {}),
    },
    position: { x: node.position[0], y: node.position[1] },
    selectable: node.interactive !== false,
  };
}

export function edgeElement(edge: RenderEdge, theme: RenderTheme): EdgeDefinition {
  const style = edgeStyleFor(edge, theme);
  return {
    group: 'edges',
    classes: [style.inferred ? 'inferred' : 'explicit', edge.directed ? 'directed' : 'undirected', edge.style ?? 'solid'],
    data: {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label ?? '',
      color: style.color,
      width: style.width,
      confidence: edge.confidence ?? 'explicit',
    },
  };
}

export function cytoscapeStyle(theme: RenderTheme): StylesheetJson {
  return [
    {
      selector: 'node',
      style: {
        label: 'data(label)',
        color: theme.text,
        'font-family': theme.fontFamily,
        'font-size': theme.fontSize,
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'ellipsis',
        'text-max-width': '120px',
        'background-color': 'data(color)',
        'border-color': theme.border,
        'border-width': 1,
        width: 'data(width)',
        height: 'data(height)',
        shape: 'roundrectangle',
      },
    },
    { selector: 'node.dot', style: { shape: 'ellipse' } },
    { selector: 'node.card', style: { 'text-opacity': 0, 'background-opacity': 0, 'border-width': 0 } },
    {
      selector: 'node.group',
      style: {
        'background-opacity': 0.12,
        'background-color': 'data(color)',
        'border-width': 1,
        'border-color': 'data(color)',
        'text-valign': 'top',
        'text-halign': 'left',
        'text-margin-x': 8,
        'text-margin-y': 4,
        padding: '12px',
        shape: 'roundrectangle',
      },
    },
    { selector: 'node:selected', style: { 'border-color': theme.selection, 'border-width': 3 } },
    {
      selector: 'edge',
      style: {
        width: 'data(width)',
        'line-color': 'data(color)',
        'curve-style': 'bezier',
        'target-arrow-color': 'data(color)',
        'target-arrow-shape': 'none',
        label: 'data(label)',
        color: theme.textMuted,
        'font-family': theme.fontFamily,
        'font-size': theme.fontSize,
        'text-rotation': 'autorotate',
        'text-background-color': theme.background,
        'text-background-opacity': 0.85,
        'text-background-padding': '2px',
      },
    },
    { selector: 'edge.inferred, edge.dashed', style: { 'line-style': 'dashed' } },
    { selector: 'edge.dotted', style: { 'line-style': 'dotted' } },
    { selector: 'edge.directed', style: { 'target-arrow-shape': 'triangle', 'arrow-scale': 0.8 } },
    { selector: 'edge:selected', style: { 'line-color': theme.selection } },
  ];
}

import type { EdgeDefinition, NodeDefinition, StylesheetJson } from 'cytoscape';
import type { RenderEdge, RenderNode, RenderTheme } from '@spacegraphjs/renderer';

// The adapter never interprets host semantics: it maps render-facing nodes and edges to Cytoscape
// elements. Enum-valued style props (shape, line-style, arrow) are driven by classes/selectors so the
// stylesheet stays fully typed; only label/color/width/height come from `data()`.

export function statusColor(status: RenderNode['status'], theme: RenderTheme): string {
  switch (status) {
    case 'success':
      return theme.success;
    case 'warning':
      return theme.warning;
    case 'error':
      return theme.error;
    case 'running':
    case 'pending':
      return theme.accent;
    default:
      return theme.surfaceMuted;
  }
}

export function isCard(shape: RenderNode['shape']): boolean {
  return shape === 'card' || shape === 'panel';
}

function nodeSize(node: RenderNode): [number, number] {
  const [width, height] = node.size ?? [];
  if (isCard(node.shape)) return [width ?? 200, height ?? 64];
  if (node.shape === 'dot') return [width ?? 16, height ?? 16];
  return [width ?? 32, height ?? 20];
}

function nodeClass(node: RenderNode): string {
  if (isCard(node.shape)) return 'card';
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
    },
    position: { x: node.position[0], y: node.position[1] },
    selectable: node.interactive !== false,
  };
}

export function edgeElement(edge: RenderEdge, theme: RenderTheme): EdgeDefinition {
  const inferred = edge.confidence === 'inferred';
  return {
    group: 'edges',
    classes: [inferred ? 'inferred' : 'explicit', edge.directed ? 'directed' : 'undirected', edge.style ?? 'solid'],
    data: {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label ?? '',
      color: inferred ? theme.edgeMuted : theme.edge,
      width: inferred ? 1 : 2,
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

import type { RenderEdge, RenderModel, RenderNode, RenderTheme } from '@spacegraphjs/renderer';

// Static SVG export and inline subgraphs. Contract-only: no browser, no renderer backend, no core
// import. `renderToSVG` is pure and runs in Node; `InlineGraph` sets the resulting markup into a host
// element. It is not an interactive `GraphRenderer`.

export type SvgOptions = {
  theme?: Partial<RenderTheme>;
  width?: number;
  height?: number;
  padding?: number;
};

export const DEFAULT_SVG_THEME: RenderTheme = {
  background: '#101014',
  surface: '#1b1b22',
  surfaceMuted: '#2a2a33',
  text: '#f5f5f7',
  textMuted: '#a0a0aa',
  border: '#3a3a44',
  accent: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  edge: '#6b7280',
  edgeMuted: '#4b5563',
  selection: '#60a5fa',
  focus: '#93c5fd',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  fontSize: 13,
};

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

export function renderToSVG(model: RenderModel, options: SvgOptions = {}): string {
  const theme = { ...DEFAULT_SVG_THEME, ...options.theme };
  const padding = options.padding ?? 24;
  const visible = model.nodes.filter((node) => node.visible !== false);
  const bounds = fitBounds(visible, padding);
  const width = options.width ?? Math.ceil(bounds.width);
  const height = options.height ?? Math.ceil(bounds.height);
  const index = new Map(model.nodes.map((node) => [node.id, node]));

  const edges = model.edges
    .filter((edge) => index.has(edge.source) && index.has(edge.target))
    .map((edge) => edgeSVG(edge, index.get(edge.source)!, index.get(edge.target)!, theme, bounds))
    .join('');
  const nodes = visible.map((node) => nodeSVG(node, theme, bounds)).join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`,
    ` role="img" aria-label="Activity graph" style="font-family:${escapeXml(theme.fontFamily)}">`,
    `<defs><marker id="sgs-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">`,
    `<path d="M 0 0 L 10 5 L 0 10 z" fill="${escapeXml(theme.edge)}"/></marker></defs>`,
    `<rect width="${width}" height="${height}" fill="${escapeXml(theme.background)}"/>`,
    edges,
    nodes,
    '</svg>',
  ].join('');
}

export class InlineGraph {
  #container: HTMLElement;
  #options: SvgOptions;
  #model: RenderModel | null = null;

  constructor(container: HTMLElement, options: SvgOptions = {}) {
    this.#container = container;
    this.#options = options;
  }

  setModel(model: RenderModel): void {
    this.#model = model;
    this.#render();
  }

  resize(): void {
    this.#render();
  }

  dispose(): void {
    this.#model = null;
    this.#container.innerHTML = '';
  }

  #render(): void {
    if (!this.#model) return;
    this.#container.innerHTML = renderToSVG(this.#model, this.#options);
  }
}

type Bounds = { width: number; height: number; offsetX: number; offsetY: number };

function fitBounds(nodes: readonly RenderNode[], padding: number): Bounds {
  if (nodes.length === 0) {
    return { width: padding * 2, height: padding * 2, offsetX: padding, offsetY: padding };
  }
  const xs = nodes.map((node) => node.position[0]);
  const ys = nodes.map((node) => node.position[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
    offsetX: -minX + padding,
    offsetY: -minY + padding,
  };
}

function nodeSVG(node: RenderNode, theme: RenderTheme, bounds: Bounds): string {
  const x = node.position[0] + bounds.offsetX;
  const y = node.position[1] + bounds.offsetY;
  const color = statusColor(node.status, theme);
  const label = escapeXml(truncate(node.label, 40));
  const title = `<title>${escapeXml(node.label)}</title>`;

  if (node.shape === 'dot') {
    const radius = (node.size?.[0] ?? 16) / 2;
    return `<g><circle cx="${x}" cy="${y}" r="${radius}" fill="${escapeXml(color)}" stroke="${escapeXml(theme.border)}"/>${title}</g>`;
  }

  const card = node.shape === 'card' || node.shape === 'panel';
  const badge = node.shape === 'badge';
  const width = node.size?.[0] ?? (card ? 200 : badge ? 96 : 120);
  const height = node.size?.[1] ?? (card ? 64 : badge ? 24 : 32);
  return [
    `<g>${title}`,
    `<rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}" rx="${card ? 8 : 4}"`,
    ` fill="${escapeXml(card ? theme.surface : color)}" stroke="${escapeXml(theme.border)}"/>`,
    `<text x="${x}" y="${y}" fill="${escapeXml(theme.text)}" font-size="${theme.fontSize}"`,
    ` text-anchor="middle" dominant-baseline="middle">${label}</text></g>`,
  ].join('');
}

function edgeSVG(edge: RenderEdge, source: RenderNode, target: RenderNode, theme: RenderTheme, bounds: Bounds): string {
  const inferred = edge.confidence === 'inferred';
  const color = inferred ? theme.edgeMuted : theme.edge;
  const dashed = inferred || edge.style === 'dashed' || edge.style === 'dotted';
  const x1 = source.position[0] + bounds.offsetX;
  const y1 = source.position[1] + bounds.offsetY;
  const x2 = target.position[0] + bounds.offsetX;
  const y2 = target.position[1] + bounds.offsetY;
  const marker = edge.directed ? ' marker-end="url(#sgs-arrow)"' : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${escapeXml(color)}" stroke-width="${inferred ? 1 : 2}"${dashed ? ' stroke-dasharray="5 4"' : ''}${marker}/>`;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&apos;';
    }
  });
}

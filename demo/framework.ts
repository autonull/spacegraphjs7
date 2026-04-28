import { SpaceGraph } from '../src/SpaceGraph';
import type { GraphSpec } from '../src/types';

export type { SpaceGraph };

export async function createDemo(
  spec: GraphSpec,
  _options?: Record<string, unknown>,
): Promise<SpaceGraph> {
  let container = document.getElementById('app');
  if (!container) {
    container = document.getElementById('container');
  }
  if (!container) {
    console.error("Could not find container 'app' or 'container'");
  }
  const sg = await SpaceGraph.create(container!, spec);
  return sg;
}

export async function createDemoWithNodes(nodes: any[], edges: any[] = []): Promise<SpaceGraph> {
  return createDemo({
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type ?? 'ShapeNode',
      position: n.position ?? [0, 0, 0],
      data: n.data ?? {},
    })),
    edges: edges.map((e: any) => ({
      ...e,
      type: e.type ?? 'CurvedEdge',
    })),
  });
}

const HINT_STYLE = `
.demo-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.7);
  color: #fff;
  padding: 12px 20px;
  border-radius: 8px;
  font-family: system-ui, sans-serif;
  font-size: 13px;
  z-index: 100;
}
.demo-hint kbd {
  background: #333;
  padding: 2px 6px;
  border-radius: 4px;
  margin: 0 2px;
}`;

export function createDemoHint(sg: SpaceGraph, keyboardHtml: string): void {
  sg.events.on('ready', () => {
    const style = document.createElement('style');
    style.textContent = HINT_STYLE;
    document.head.appendChild(style);
    const hint = document.createElement('div');
    hint.className = 'demo-hint';
    hint.innerHTML = keyboardHtml;
    document.body.appendChild(hint);
  });
}

export function addOverlayPanel(
  sg: SpaceGraph,
  position: 'top-right' | 'bottom-left' = 'bottom-left',
  cssProps: Record<string, string> = {},
  innerHTML = '',
): void {
  sg.events.on('ready', () => {
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed',
      background: 'rgba(0,0,0,0.7)',
      color: '#ffffff',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '13px',
      fontFamily: 'sans-serif',
      zIndex: '1000',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.1)',
      maxWidth: '300px',
      ...(position === 'top-right'
        ? { top: '20px', right: '20px' }
        : { bottom: '20px', left: '20px' }),
      ...cssProps,
    });
    if (innerHTML) panel.innerHTML = innerHTML;
    document.body.appendChild(panel);
  });
}

export class DemoBuilder {
  private _nodes: any[] = [];
  private _edges: any[] = [];
  private _layout?: Record<string, unknown>;

  nodes(nodes: any[]): this {
    this._nodes.push(...nodes);
    return this;
  }

  edges(edges: any[]): this {
    this._edges.push(...edges);
    return this;
  }

  layout(type: string, options: Record<string, unknown> = {}): this {
    this._layout = { type, ...options };
    return this;
  }

  async create(): Promise<SpaceGraph> {
    return createDemoWithNodes(this._nodes, this._edges);
  }

  [Symbol.asyncIterator](): AsyncIterator<SpaceGraph> {
    return {
      next: () => this.create().then((sg) => ({ done: false, value: sg })),
    };
  }
}

export function shapeNode(
    id: string,
    position: [number, number, number] = [0, 0, 0],
    data: Record<string, unknown> = {},
): { id: string; type: string; position: [number, number, number]; data: Record<string, unknown> } {
    return { id, type: 'ShapeNode', position, data };
}

export function htmlNode(
    id: string,
    position: [number, number, number] = [0, 0, 0],
    data: Record<string, unknown> = {},
): { id: string; type: string; position: [number, number, number]; data: Record<string, unknown> } {
    return { id, type: 'HtmlNode', position, data: { width: 200, height: 100, ...data } };
}

export function edge(
    source: string,
    target: string,
    type = 'CurvedEdge',
): { id: string; source: string; target: string; type: string } {
    return { id: `e_${source}_${target}`, source, target, type };
}

export function gridLayout(cols = 3, cellWidth = 150, cellHeight = 100, gap = 30) {
    return { columns: cols, cellWidth, cellHeight, gap };
}

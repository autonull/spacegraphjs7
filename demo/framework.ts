import { SpaceGraph } from '../src/SpaceGraph';
import type { GraphSpec } from '../src/types';

export { SpaceGraph };

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
  (window as any)._sg = sg;
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

/**
 * Creates a professional HUD panel for demos with optional stats and controls.
 */
export function createProfessionalPanel(sg: SpaceGraph, options: {
    title: string;
    description: string;
    metrics?: string[];
    controls?: { label: string, action: () => void }[];
}) {
    sg.events.on('ready', () => {
        const panel = document.createElement('div');
        Object.assign(panel.style, {
            position: 'fixed',
            top: '60px',
            left: '20px',
            width: '300px',
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(12px)',
            color: '#f8fafc',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            zIndex: '10000',
        });

        let html = `
            <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; background: linear-gradient(135deg, #60a5fa, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${options.title}</h2>
            <p style="margin: 0 0 20px 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">${options.description}</p>
        `;

        if (options.metrics && options.metrics.length > 0) {
            html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">`;
            options.metrics.forEach(m => {
                html += `
                    <div>
                        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 2px;">${m}</div>
                        <div id="metric-${m.toLowerCase().replace(/ /g, '-')}" style="font-size: 14px; font-weight: 600; color: #e2e8f0;">--</div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        if (options.controls && options.controls.length > 0) {
            html += `<div style="display: flex; flex-direction: column; gap: 8px;">`;
            options.controls.forEach((c, i) => {
                html += `<button id="control-btn-${i}" style="width: 100%; padding: 10px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; color: #60a5fa; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s;">${c.label}</button>`;
            });
            html += `</div>`;
        }

        panel.innerHTML = html;
        document.body.appendChild(panel);

        // Bind events
        options.controls?.forEach((c, i) => {
            const btn = document.getElementById(`control-btn-${i}`);
            if (btn) {
                btn.addEventListener('click', c.action);
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = 'rgba(59, 130, 246, 0.2)';
                    btn.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = 'rgba(59, 130, 246, 0.1)';
                    btn.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                });
            }
        });
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

import * as THREE from 'three';
import type { SpaceGraph } from '../../SpaceGraph';
import type { Graph } from '../../core/Graph';
import type { EventSystem } from '../../core/events/EventSystem';
import { BaseSystemPlugin } from '../BaseSystemPlugin';
import { HUDPlugin } from '../HUDPlugin';
import { HUD_ZINDEX, HUD_COLORS } from '../hud/HUDStyles';
import { HUDDOMFactory } from '../hud/HUDDOMFactory';
import {
  DiagramParserFactory,
  DiagramParseResult,
  DiagramFormat,
  MermaidThemeName,
  LayoutName,
  LAYOUT_NAMES,
  MERMAID_THEMES,
  getLayoutLabel,
} from './MermaidParser';
import {
  ForceLayout,
  CircularLayout,
  GridLayout,
  HierarchicalLayout,
  RadialLayout,
  TreeLayout,
  SpectralLayout,
  ClusterLayout,
  BaseLayout,
} from '../layouts';

export interface MermaidPluginOptions {
  defaultLayout?: LayoutName;
  defaultTheme?: MermaidThemeName;
  showHud?: boolean;
  autoAnimate?: boolean;
  enableSubgraphs?: boolean;
}

interface LayoutInstance {
  name: LayoutName;
  instance: BaseLayout;
  direction?: string;
}

const CLUSTER_COLORS = [
  'rgba(59, 130, 246, 0.15)',
  'rgba(139, 92, 246, 0.15)',
  'rgba(16, 185, 129, 0.15)',
  'rgba(245, 158, 11, 0.15)',
  'rgba(236, 72, 153, 0.15)',
];

export class MermaidPlugin extends BaseSystemPlugin {
  readonly id = 'mermaid';
  readonly name = 'Diagram Renderer';
  readonly version = '2.0.0';

  private layouts: Map<LayoutName, LayoutInstance> = new Map();
  private currentLayout: LayoutName = 'hierarchical';
  private currentTheme: MermaidThemeName = 'default';
  private currentFormat: DiagramFormat = 'mermaid';
  private hudContainer: HTMLElement | null = null;
  private diagramContent: string = '';
  private parseResult: DiagramParseResult | null = null;
  private autoAnimate: boolean = true;
  private enableSubgraphs: boolean = true;
  private options: MermaidPluginOptions;

  constructor(options: MermaidPluginOptions = {}) {
    super();
    this.options = options;
    this.currentLayout = options.defaultLayout ?? 'hierarchical';
    this.currentTheme = options.defaultTheme ?? 'default';
    this.autoAnimate = options.autoAnimate ?? true;
    this.enableSubgraphs = options.enableSubgraphs ?? true;
  }

  init(sg: SpaceGraph, graph: Graph, events: EventSystem): void {
    super.init(sg, graph, events);
    this.initializeLayouts();
    if (this.options.showHud !== false) {
      this.createHUD();
    }
  }

  private initializeLayouts(): void {
    const configs: Array<{ name: LayoutName; create: () => BaseLayout; direction?: string }> = [
      { name: 'force', create: () => new ForceLayout({ iterations: 100, repulsion: 5000 } as any), direction: undefined },
      { name: 'circular', create: () => new CircularLayout(), direction: undefined },
      { name: 'grid', create: () => new GridLayout({ columns: 4, spacingX: 200, spacingY: 150 } as any), direction: undefined },
      { name: 'hierarchical', create: () => new HierarchicalLayout({ direction: 'TB' } as any), direction: 'TB' },
      { name: 'radial', create: () => new RadialLayout(), direction: undefined },
      { name: 'tree', create: () => new TreeLayout({ direction: 'TB' } as any), direction: 'TB' },
      { name: 'spectral', create: () => new SpectralLayout(), direction: undefined },
      { name: 'cluster', create: () => new ClusterLayout({ clusterBy: 'cluster' } as any), direction: undefined },
    ];

    for (const config of configs) {
      const instance = config.create();
      instance.init(this.sg, this.graph, this.events);
      this.layouts.set(config.name, { name: config.name, instance, direction: config.direction });
    }
  }

  private createHUD(): void {
    if (typeof document === 'undefined') return;

    this.hudContainer = HUDDOMFactory.createContainer('mermaid-hud', 'mermaid-hud-container');
    this.hudContainer.style.zIndex = HUD_ZINDEX.HUD;

    this.createFormatSelector();
    this.createLayoutControls();
    this.createThemeControls();
    this.createVisualizationControls();

    HUDDOMFactory.appendToRenderer(this.sg, this.hudContainer);
  }

  private createFormatSelector(): void {
    if (!this.hudContainer) return;

    const formats: DiagramFormat[] = ['mermaid', 'dot', 'graphml', 'json'];
    const container = document.createElement('div');
    container.className = 'mermaid-hud-section';
    container.innerHTML = `
      <div class="mermaid-hud-title">Format</div>
      <div class="mermaid-hud-section-content">
        <select id="mermaid-format-select" class="mermaid-hud-select">
          ${formats.map(f => `<option value="${f}" ${f === this.currentFormat ? 'selected' : ''}>${f.toUpperCase()}</option>`).join('')}
        </select>
      </div>
    `;

    this.hudContainer.appendChild(container);

    const select = container.querySelector('#mermaid-format-select') as HTMLSelectElement;
    select?.addEventListener('change', (e) => {
      this.currentFormat = (e.target as HTMLSelectElement).value as DiagramFormat;
    });
  }

  private createLayoutControls(): void {
    if (!this.hudContainer) return;

    const container = document.createElement('div');
    container.className = 'mermaid-hud-section';
    container.innerHTML = `
      <div class="mermaid-hud-title">Layout</div>
      <div class="mermaid-hud-section-content">
        <select id="mermaid-layout-select" class="mermaid-hud-select">
          ${LAYOUT_NAMES.map(name => `
            <option value="${name}" ${name === this.currentLayout ? 'selected' : ''}>
              ${getLayoutLabel(name)}
            </option>
          `).join('')}
        </select>
        <button id="mermaid-apply-layout" class="mermaid-hud-button">Apply Layout</button>
        <div id="mermaid-suggested-layout" class="mermaid-hud-hint"></div>
      </div>
    `;

    this.hudContainer.appendChild(container);

    const select = container.querySelector('#mermaid-layout-select') as HTMLSelectElement;
    const button = container.querySelector('#mermaid-apply-layout') as HTMLButtonElement;

    select?.addEventListener('change', (e) => {
      this.currentLayout = (e.target as HTMLSelectElement).value as LayoutName;
    });

    button?.addEventListener('click', () => {
      this.applyCurrentLayout();
    });
  }

  private createThemeControls(): void {
    if (!this.hudContainer) return;

    const themes = Object.keys(MERMAID_THEMES) as MermaidThemeName[];
    const container = document.createElement('div');
    container.className = 'mermaid-hud-section';
    container.innerHTML = `
      <div class="mermaid-hud-title">Theme</div>
      <div class="mermaid-hud-section-content">
        <select id="mermaid-theme-select" class="mermaid-hud-select">
          ${themes.map(t => `<option value="${t}" ${t === this.currentTheme ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
        </select>
        <div class="mermaid-hud-row">
          <button id="mermaid-prev-theme" class="mermaid-hud-button-small">◀</button>
          <button id="mermaid-next-theme" class="mermaid-hud-button-small">▶</button>
        </div>
      </div>
    `;

    this.hudContainer.appendChild(container);

    const select = container.querySelector('#mermaid-theme-select') as HTMLSelectElement;
    const prevBtn = container.querySelector('#mermaid-prev-theme') as HTMLButtonElement;
    const nextBtn = container.querySelector('#mermaid-next-theme') as HTMLButtonElement;

    select?.addEventListener('change', (e) => {
      this.currentTheme = (e.target as HTMLSelectElement).value as MermaidThemeName;
      this.applyTheme();
    });

    prevBtn?.addEventListener('click', () => {
      const idx = themes.indexOf(this.currentTheme);
      this.currentTheme = themes[(idx - 1 + themes.length) % themes.length];
      (select as HTMLSelectElement).value = this.currentTheme;
      this.applyTheme();
    });

    nextBtn?.addEventListener('click', () => {
      const idx = themes.indexOf(this.currentTheme);
      this.currentTheme = themes[(idx + 1) % themes.length];
      (select as HTMLSelectElement).value = this.currentTheme;
      this.applyTheme();
    });
  }

  private createVisualizationControls(): void {
    if (!this.hudContainer) return;

    const container = document.createElement('div');
    container.className = 'mermaid-hud-section';
    container.innerHTML = `
      <div class="mermaid-hud-title">View</div>
      <div class="mermaid-hud-section-content">
        <div class="mermaid-hud-row">
          <button id="mermaid-zoom-in" class="mermaid-hud-button-small" title="Zoom In">+</button>
          <button id="mermaid-zoom-out" class="mermaid-hud-button-small" title="Zoom Out">−</button>
          <button id="mermaid-fit" class="mermaid-hud-button-small" title="Fit View">⊙</button>
          <button id="mermaid-3d" class="mermaid-hud-button-small" title="Toggle 3D">3D</button>
        </div>
        <div class="mermaid-hud-row">
          <label class="mermaid-hud-checkbox">
            <input type="checkbox" id="mermaid-auto-animate" ${this.autoAnimate ? 'checked' : ''} />
            <span>Auto Animate</span>
          </label>
        </div>
        <div class="mermaid-hud-row">
          <label class="mermaid-hud-checkbox">
            <input type="checkbox" id="mermaid-subgraphs" ${this.enableSubgraphs ? 'checked' : ''} />
            <span>Clusters</span>
          </label>
        </div>
      </div>
    `;

    this.hudContainer.appendChild(container);

    container.querySelector('#mermaid-zoom-in')?.addEventListener('click', () => this.sg.cameraControls.zoom(1.25));
    container.querySelector('#mermaid-zoom-out')?.addEventListener('click', () => this.sg.cameraControls.zoom(0.8));
    container.querySelector('#mermaid-fit')?.addEventListener('click', () => this.sg.fitView(150, 1.5));
    container.querySelector('#mermaid-3d')?.addEventListener('click', () => this.toggle3D());

    container.querySelector('#mermaid-auto-animate')?.addEventListener('change', (e) => {
      this.autoAnimate = (e.target as HTMLInputElement).checked;
    });

    container.querySelector('#mermaid-subgraphs')?.addEventListener('change', (e) => {
      this.enableSubgraphs = (e.target as HTMLInputElement).checked;
    });
  }

  private toggle3D(): void {
    const camera = this.sg.renderer.camera;
    if (camera.isPerspectiveCamera) {
      const ortho = new (THREE as any).OrthographicCamera(-100, 100, 100, -100, 0.1, 10000);
      if (ortho) {
        (this.sg.cameraControls as any).switchCamera?.(ortho, { duration: 0.5 });
      }
    } else {
      const perspective = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
      if (perspective) {
        (this.sg.cameraControls as any).switchCamera?.(perspective, { duration: 0.5 });
      }
    }
    this.sg.renderer.scheduleRender();
  }

  parseAndRender(content: string, format?: DiagramFormat): void {
    this.diagramContent = content;
    const detectedFormat = format || DiagramParserFactory.detectFormat(content);
    this.currentFormat = detectedFormat;

    this.parseResult = DiagramParserFactory.parse(content, detectedFormat);
    this.renderDiagram();
  }

  private renderDiagram(): void {
    if (!this.parseResult) return;

    this.clearGraph();

    const theme = MERMAID_THEMES[this.currentTheme];
    const nodeColors = theme.nodeColors;

    if (this.enableSubgraphs && this.parseResult.clusters.length > 0) {
      this.renderClusters();
    }

    const nodeIndexMap = new Map<string, number>();
    this.parseResult.nodes.forEach((node, index) => {
      nodeIndexMap.set(node.id, index);
      const nodeColorIndex = index % nodeColors.length;

      const nodeType = 'MermaidNode';
      const nodeData: Record<string, unknown> = {
        shape: node.shape,
        label: node.label,
        themeColors: nodeColors,
        nodeIndex: index,
        color: node.color || nodeColors[nodeColorIndex],
        width: node.width || 160,
        height: node.height || 60,
        cluster: this.enableSubgraphs ? node.cluster : undefined,
      };

      if (node.style) {
        nodeData.style = node.style;
        if (node.style === 'filled') {
          nodeData.filled = true;
        }
      }

      this.graph.addNode({
        id: node.id,
        type: nodeType,
        label: node.label,
        position: [0, 0, 0],
        data: nodeData,
      });
    });

    let edgeIndex = 0;
    for (const edge of this.parseResult.edges) {
      let edgeType = 'CurvedEdge';
      if (edge.style === 'dotted' || edge.style === 'dashed') {
        edgeType = 'DottedEdge';
      } else if (edge.label) {
        edgeType = 'LabeledEdge';
      }

      this.graph.addEdge({
        id: edge.id || `edge-${edgeIndex++}`,
        source: edge.source,
        target: edge.target,
        type: edgeType,
        data: {
          label: edge.label,
          color: edge.color ? parseInt(edge.color.replace('#', ''), 16) : theme.edgeColor,
          arrowhead: edge.arrowhead !== 'none',
          dashed: edge.style === 'dashed',
          style: edge.style,
        },
      });
    }

    this.applyCurrentLayout();
  }

  private renderClusters(): void {
    const clusterColors = CLUSTER_COLORS;

    this.parseResult!.clusters.forEach((cluster, index) => {
      const clusterNodeIds = this.parseResult!.nodes
        .filter(n => n.cluster === cluster.id)
        .map(n => n.id);

      if (clusterNodeIds.length === 0) return;

      const colorIndex = index % clusterColors.length;

      this.graph.addNode({
        id: `cluster-${cluster.id}`,
        type: 'GroupNode',
        label: cluster.label,
        position: [0, 0, -10],
        data: {
          width: 400,
          height: 300,
          color: parseInt(clusterColors[colorIndex].replace(/rgba?\((\d+),\s*(\d+),\s*(\d+).*/, '$1$2$3'), 16),
          depth: 50,
          label: cluster.label,
          clusterId: cluster.id,
        },
      });
    });
  }

  private clearGraph(): void {
    for (const node of this.graph.getNodes()) {
      this.graph.removeNode(node.id);
    }
    for (const edge of this.graph.getEdges()) {
      this.graph.removeEdge(edge.id);
    }
  }

  async applyCurrentLayout(): Promise<void> {
    const layoutInstance = this.layouts.get(this.currentLayout);
    if (layoutInstance) {
      const layoutOptions: Record<string, unknown> = {};

      if (this.currentLayout === 'cluster' && this.enableSubgraphs) {
        layoutOptions.clusterBy = 'cluster';
      }

      if (layoutInstance.direction) {
        layoutOptions.direction = layoutInstance.direction;
      }

      await layoutInstance.instance.apply(layoutOptions);

      if (this.enableSubgraphs && this.parseResult?.clusters.length) {
        await this.applyClusterLayouts();
      }

      this.sg.fitView(150, 1.5);
    }
  }

  private async applyClusterLayouts(): Promise<void> {
    const clusterNodes = Array.from(this.graph.getNodes()).filter(n => n.id.startsWith('cluster-'));

    for (const clusterNode of clusterNodes) {
      const clusterId = (clusterNode.data as { clusterId?: string }).clusterId;
      if (!clusterId) continue;

      const memberNodes = Array.from(this.graph.getNodes()).filter(
        n => (n.data as { cluster?: string })?.cluster === clusterId
      );

      if (memberNodes.length === 0) continue;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const mn of memberNodes) {
        minX = Math.min(minX, mn.position.x);
        minY = Math.min(minY, mn.position.y);
        maxX = Math.max(maxX, mn.position.x);
        maxY = Math.max(maxY, mn.position.y);
      }

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const width = Math.max(maxX - minX + 100, 200);
      const height = Math.max(maxY - minY + 100, 150);

      clusterNode.position.set(centerX, centerY, -10);
      clusterNode.object.position.copy(clusterNode.position);

      clusterNode.updateSpec({
        data: {
          ...clusterNode.data,
          width,
          height,
        },
      });
    }
  }

  async applyLayout(layoutName: LayoutName): Promise<void> {
    this.currentLayout = layoutName;
    await this.applyCurrentLayout();
  }

  applyTheme(themeName?: MermaidThemeName): void {
    if (themeName) this.currentTheme = themeName;

    const theme = MERMAID_THEMES[this.currentTheme];
    const nodeColors = theme.nodeColors;

    let nodeIndex = 0;
    for (const node of this.graph.getNodes()) {
      if (node.type === 'MermaidNode') {
        const data = node.data as Record<string, unknown>;
        const color = data.color as string || nodeColors[nodeIndex % nodeColors.length];

        if (typeof (node as any).updateNodeColor === 'function') {
          (node as any).updateNodeColor();
        } else if (typeof node.updateSpec === 'function') {
          node.updateSpec({
            data: { ...node.data, color, themeColors: nodeColors, nodeIndex },
          });
        }
      }
      nodeIndex++;
    }

    this.showAlert({ type: 'success', message: `Theme: ${this.currentTheme}`, duration: 1000 });
  }

  getCurrentLayout(): LayoutName {
    return this.currentLayout;
  }

  getCurrentTheme(): MermaidThemeName {
    return this.currentTheme;
  }

  getCurrentFormat(): DiagramFormat {
    return this.currentFormat;
  }

  getParseResult(): DiagramParseResult | null {
    return this.parseResult;
  }

  showAlert(options: { type: 'info' | 'success' | 'warning' | 'error'; message: string; duration?: number }): void {
    const hud = this.sg.pluginManager.getPlugin('hud') as HUDPlugin | undefined;
    hud?.showAlert(options as any);
  }

  dispose(): void {
    if (this.hudContainer?.parentElement) {
      this.hudContainer.parentElement.removeChild(this.hudContainer);
    }
    this.hudContainer = null;
  }

  static get HUD_STYLES(): string {
    return `
      .mermaid-hud-container {
        position: absolute;
        top: 16px;
        right: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: auto;
        z-index: ${HUD_ZINDEX.HUD};
        max-width: 260px;
      }

      .mermaid-hud-section {
        background: ${HUD_COLORS.background};
        border: 1px solid ${HUD_COLORS.border};
        border-radius: 12px;
        padding: 12px 14px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }

      .mermaid-hud-title {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: ${HUD_COLORS.primary};
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid ${HUD_COLORS.border};
      }

      .mermaid-hud-section-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .mermaid-hud-select {
        width: 100%;
        padding: 8px 10px;
        background: ${HUD_COLORS.surface};
        border: 1px solid ${HUD_COLORS.border};
        border-radius: 6px;
        color: ${HUD_COLORS.text};
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .mermaid-hud-select:hover { border-color: ${HUD_COLORS.primary}; }
      .mermaid-hud-select:focus {
        outline: none;
        border-color: ${HUD_COLORS.primary};
        box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
      }

      .mermaid-hud-button {
        width: 100%;
        padding: 9px 14px;
        background: rgba(139, 92, 246, 0.2);
        border: 1px solid ${HUD_COLORS.primary};
        border-radius: 6px;
        color: ${HUD_COLORS.text};
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .mermaid-hud-button:hover {
        background: rgba(139, 92, 246, 0.35);
        transform: translateY(-1px);
      }

      .mermaid-hud-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .mermaid-hud-button-small {
        flex: 1;
        padding: 7px 10px;
        background: ${HUD_COLORS.surface};
        border: 1px solid ${HUD_COLORS.border};
        border-radius: 5px;
        color: ${HUD_COLORS.text};
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s;
      }

      .mermaid-hud-button-small:hover {
        border-color: ${HUD_COLORS.primary};
        background: rgba(139, 92, 246, 0.1);
      }

      .mermaid-hud-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: ${HUD_COLORS.textMuted};
        cursor: pointer;
      }

      .mermaid-hud-checkbox input {
        accent-color: ${HUD_COLORS.primary};
        width: 14px;
        height: 14px;
      }

      .mermaid-hud-hint {
        font-size: 10px;
        color: ${HUD_COLORS.textMuted};
        font-style: italic;
        text-align: center;
        padding: 4px;
        background: rgba(0,0,0,0.2);
        border-radius: 4px;
      }
    `;
  }
}

let stylesInjected = false;
export function injectMermaidStyles(): void {
  if (stylesInjected || typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = MermaidPlugin.HUD_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}
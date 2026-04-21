import type { SpaceGraph } from '../../SpaceGraph';
import type { Graph } from '../../core/Graph';
import type { EventSystem } from '../../core/events/EventSystem';
import { BaseSystemPlugin } from '../BaseSystemPlugin';
import { HUDPlugin } from '../HUDPlugin';
import { HUD_ZINDEX, HUD_COLORS } from '../hud/HUDStyles';
import { HUDDOMFactory } from '../hud/HUDDOMFactory';
import {
  MermaidParser,
  type MermaidParseResult,
  type MermaidThemeName,
  type LayoutName,
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
}

interface LayoutInstance {
  name: LayoutName;
  instance: BaseLayout;
  direction?: string;
}

export class MermaidPlugin extends BaseSystemPlugin {
  readonly id = 'mermaid';
  readonly name = 'Mermaid Diagram Renderer';
  readonly version = '1.0.0';

  private parser: MermaidParser;
  private hudContainer: HTMLElement | null = null;
  private layoutControls: HTMLElement | null = null;
  private themeControls: HTMLElement | null = null;
  private visualizationControls: HTMLElement | null = null;
  private currentLayout: LayoutName = 'hierarchical';
  private currentTheme: MermaidThemeName = 'default';
  private layouts: Map<LayoutName, LayoutInstance> = new Map();
  private mermaidCode: string = '';
  private parseResult: MermaidParseResult | null = null;

  constructor(options: MermaidPluginOptions = {}) {
    super();
    this.parser = new MermaidParser();
    this.currentLayout = options.defaultLayout ?? 'hierarchical';
    this.currentTheme = options.defaultTheme ?? 'default';
  }

  init(sg: SpaceGraph, graph: Graph, events: EventSystem): void {
    super.init(sg, graph, events);
    this.initializeLayouts();
    if (this.options.showHud !== false) {
      this.createHUD();
    }
  }

  private initializeLayouts(): void {
    const layoutConfigs: Array<{ name: LayoutName; create: () => BaseLayout; direction?: string }> = [
      { name: 'force', create: () => new ForceLayout({ iterations: 100, repulsion: 5000 }) },
      { name: 'circular', create: () => new CircularLayout() },
      { name: 'grid', create: () => new GridLayout({ columns: 4, spacingX: 200, spacingY: 150 }) },
      { name: 'hierarchical', create: () => new HierarchicalLayout({ direction: 'TB' }), direction: 'TB' },
      { name: 'radial', create: () => new RadialLayout() },
      { name: 'tree', create: () => new TreeLayout({ direction: 'TB' }), direction: 'TB' },
      { name: 'spectral', create: () => new SpectralLayout() },
      { name: 'cluster', create: () => new ClusterLayout() },
    ];

    for (const config of layoutConfigs) {
      const instance = config.create();
      instance.init(this.sg, this.graph, this.events);
      this.layouts.set(config.name, {
        name: config.name,
        instance,
        direction: config.direction,
      });
    }
  }

  private createHUD(): void {
    if (typeof document === 'undefined') return;

    this.hudContainer = HUDDOMFactory.createContainer('mermaid-hud', 'mermaid-hud-container');
    this.hudContainer.style.zIndex = HUD_ZINDEX.HUD;

    this.createLayoutControls();
    this.createThemeControls();
    this.createVisualizationControls();

    HUDDOMFactory.appendToRenderer(this.sg, this.hudContainer);
  }

  private createLayoutControls(): void {
    if (!this.hudContainer) return;

    const container = document.createElement('div');
    container.className = 'mermaid-hud-section';
    container.innerHTML = `
      <div class="mermaid-hud-title">Mermaid Layout</div>
      <div class="mermaid-hud-section-content">
        <label class="mermaid-hud-label">Layout Algorithm</label>
        <select id="mermaid-layout-select" class="mermaid-hud-select">
          ${LAYOUT_NAMES.map(name => `
            <option value="${name}" ${name === this.currentLayout ? 'selected' : ''}>
              ${getLayoutLabel(name)}
            </option>
          `).join('')}
        </select>
        <button id="mermaid-apply-layout" class="mermaid-hud-button">Apply Layout</button>
      </div>
    `;

    this.layoutControls = container;
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

    const container = document.createElement('div');
    container.className = 'mermaid-hud-section';
    container.innerHTML = `
      <div class="mermaid-hud-title">Theme</div>
      <div class="mermaid-hud-section-content">
        <label class="mermaid-hud-label">Color Theme</label>
        <select id="mermaid-theme-select" class="mermaid-hud-select">
          <option value="default" ${this.currentTheme === 'default' ? 'selected' : ''}>Default Blue</option>
          <option value="forest" ${this.currentTheme === 'forest' ? 'selected' : ''}>Forest Green</option>
          <option value="neutral" ${this.currentTheme === 'neutral' ? 'selected' : ''}>Neutral Gray</option>
        </select>
        <button id="mermaid-apply-theme" class="mermaid-hud-button">Apply Theme</button>
      </div>
    `;

    this.themeControls = container;
    this.hudContainer.appendChild(container);

    const select = container.querySelector('#mermaid-theme-select') as HTMLSelectElement;
    const button = container.querySelector('#mermaid-apply-theme') as HTMLButtonElement;

    select?.addEventListener('change', (e) => {
      this.currentTheme = (e.target as HTMLSelectElement).value as MermaidThemeName;
    });

    button?.addEventListener('click', () => {
      this.applyTheme();
    });
  }

  private createVisualizationControls(): void {
    if (!this.hudContainer) return;

    const container = document.createElement('div');
    container.className = 'mermaid-hud-section';
    container.innerHTML = `
      <div class="mermaid-hud-title">Visualization</div>
      <div class="mermaid-hud-section-content">
        <div class="mermaid-hud-row">
          <label class="mermaid-hud-label">Zoom</label>
          <button id="mermaid-zoom-in" class="mermaid-hud-button-small">+</button>
          <button id="mermaid-zoom-out" class="mermaid-hud-button-small">−</button>
          <button id="mermaid-fit" class="mermaid-hud-button-small">Fit</button>
        </div>
        <div class="mermaid-hud-row">
          <label class="mermaid-hud-label">Animation</label>
          <button id="mermaid-toggle-animation" class="mermaid-hud-button-small">Toggle</button>
        </div>
      </div>
    `;

    this.visualizationControls = container;
    this.hudContainer.appendChild(container);

    const zoomIn = container.querySelector('#mermaid-zoom-in') as HTMLButtonElement;
    const zoomOut = container.querySelector('#mermaid-zoom-out') as HTMLButtonElement;
    const fit = container.querySelector('#mermaid-fit') as HTMLButtonElement;
    const toggleAnim = container.querySelector('#mermaid-toggle-animation') as HTMLButtonElement;

    zoomIn?.addEventListener('click', () => this.sg.cameraControls.zoomBy(1.25));
    zoomOut?.addEventListener('click', () => this.sg.cameraControls.zoomBy(0.8));
    fit?.addEventListener('click', () => this.sg.fitView(150, 1.5));
    toggleAnim?.addEventListener('click', () => {
      const hud = this.sg.pluginManager.getPlugin<HUDPlugin>('hud');
      hud?.showAlert({ type: 'info', message: 'Animation toggled' });
    });
  }

  parseAndRender(mermaidCode: string): void {
    this.mermaidCode = mermaidCode;
    this.parseResult = this.parser.parse(mermaidCode);
    this.renderMermaidGraph();
  }

  private renderMermaidGraph(): void {
    if (!this.parseResult) return;

    // Clear existing nodes
    const existingNodes = Array.from(this.graph.getNodes());
    for (const node of existingNodes) {
      this.graph.removeNode(node.id);
    }

    const theme = MERMAID_THEMES[this.currentTheme];
    const nodeColors = theme.nodeColors;

    // Create nodes
    this.parseResult.nodes.forEach((nodeSpec, index) => {
      const colorIndex = index % nodeColors.length;
      this.graph.addNode({
        ...nodeSpec,
        type: 'MermaidNode',
        data: {
          ...nodeSpec.data,
          shape: (nodeSpec.data as { shape?: string })?.shape || 'rect',
          label: nodeSpec.label,
          themeColors: nodeColors,
          nodeIndex: index,
          color: nodeColors[colorIndex],
        },
      });
    });

    // Create edges
    for (const edgeSpec of this.parseResult.edges) {
      this.graph.addEdge({
        id: edgeSpec.id,
        source: edgeSpec.source,
        target: edgeSpec.target,
        type: edgeSpec.type || 'CurvedEdge',
        data: edgeSpec.data,
      });
    }

    // Apply layout
    setTimeout(() => this.applyCurrentLayout(), 100);
  }

  async applyLayout(layoutName: LayoutName): Promise<void> {
    this.currentLayout = layoutName;
    await this.applyCurrentLayout();
  }

  private async applyCurrentLayout(): Promise<void> {
    const layoutInstance = this.layouts.get(this.currentLayout);
    if (layoutInstance) {
      const layoutOptions: Record<string, unknown> = {};
      if (layoutInstance.direction) {
        layoutOptions.direction = layoutInstance.direction;
      }
      await layoutInstance.instance.apply(layoutOptions);
      this.sg.fitView(150, 1.5);

      const hud = this.sg.pluginManager.getPlugin<HUDPlugin>('hud');
      hud?.showAlert({
        type: 'success',
        message: `Applied ${getLayoutLabel(this.currentLayout)} layout`,
        duration: 1500,
      });
    }
  }

  applyTheme(themeName?: MermaidThemeName): void {
    if (themeName) {
      this.currentTheme = themeName;
    }

    // Update all Mermaid nodes
    for (const node of this.graph.getNodes()) {
      if (node.type === 'MermaidNode') {
        const data = node.data as { nodeIndex?: number; updateNodeColor?: () => void };
        if (typeof data.updateNodeColor === 'function') {
          data.updateNodeColor();
        }
      }
    }

    const hud = this.sg.pluginManager.getPlugin<HUDPlugin>('hud');
    hud?.showAlert({
      type: 'success',
      message: `Applied ${this.currentTheme} theme`,
      duration: 1500,
    });
  }

  getCurrentLayout(): LayoutName {
    return this.currentLayout;
  }

  getCurrentTheme(): MermaidThemeName {
    return this.currentTheme;
  }

  getParseResult(): MermaidParseResult | null {
    return this.parseResult;
  }

  dispose(): void {
    if (this.hudContainer?.parentElement) {
      this.hudContainer.parentElement.removeChild(this.hudContainer);
    }
    this.hudContainer = null;
    this.layoutControls = null;
    this.themeControls = null;
    this.visualizationControls = null;
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
      }

      .mermaid-hud-section {
        background: ${HUD_COLORS.background};
        border: 1px solid ${HUD_COLORS.border};
        border-radius: 12px;
        padding: 12px 16px;
        min-width: 220px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }

      .mermaid-hud-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: ${HUD_COLORS.primary};
        margin-bottom: 10px;
        padding-bottom: 6px;
        border-bottom: 1px solid ${HUD_COLORS.border};
      }

      .mermaid-hud-section-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .mermaid-hud-label {
        font-size: 11px;
        color: ${HUD_COLORS.textMuted};
        margin-bottom: 2px;
      }

      .mermaid-hud-select {
        width: 100%;
        padding: 8px 12px;
        background: ${HUD_COLORS.surface};
        border: 1px solid ${HUD_COLORS.border};
        border-radius: 6px;
        color: ${HUD_COLORS.text};
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .mermaid-hud-select:hover {
        border-color: ${HUD_COLORS.primary};
      }

      .mermaid-hud-select:focus {
        outline: none;
        border-color: ${HUD_COLORS.primary};
        box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
      }

      .mermaid-hud-button {
        width: 100%;
        padding: 10px 16px;
        background: rgba(139, 92, 246, 0.2);
        border: 1px solid ${HUD_COLORS.primary};
        border-radius: 6px;
        color: ${HUD_COLORS.text};
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .mermaid-hud-button:hover {
        background: rgba(139, 92, 246, 0.3);
        border-color: ${HUD_COLORS.primary};
      }

      .mermaid-hud-button:active {
        transform: scale(0.98);
      }

      .mermaid-hud-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .mermaid-hud-row .mermaid-hud-label {
        flex: 1;
        margin-bottom: 0;
      }

      .mermaid-hud-button-small {
        padding: 6px 12px;
        background: ${HUD_COLORS.surface};
        border: 1px solid ${HUD_COLORS.border};
        border-radius: 4px;
        color: ${HUD_COLORS.text};
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .mermaid-hud-button-small:hover {
        border-color: ${HUD_COLORS.primary};
        background: rgba(139, 92, 246, 0.1);
      }

      .mermaid-hud-button-small:active {
        transform: scale(0.95);
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
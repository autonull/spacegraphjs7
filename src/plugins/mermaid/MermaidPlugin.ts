import { accumulateBounds } from '../../layout/bounds';
import { parseColor } from '../../utils/color';
import { BaseSystemPlugin } from '../BaseSystemPlugin';
import { MERMAID_HUD_STYLES } from './MermaidStyles';
import type { HUDPlugin } from '../HUDPlugin';
import { HUDDOMFactory } from '../hud/HUDDOMFactory';
import { HUD_ZINDEX } from '../hud/HUDStyles';
import {
    type BaseLayout,
    CircularLayout,
    ClusterLayout,
    ForceLayout,
    GridLayout,
    HierarchicalLayout,
    RadialLayout,
    SpectralLayout,
    TreeLayout,
} from '../layouts';
import type {
    DiagramFormat,
    DiagramParseResult,
    LayoutName,
    MermaidThemeName,
} from './MermaidParser';
import {
    DiagramParserFactory,
    edgeToSpec,
    getLayoutLabel,
    LAYOUT_NAMES,
    MERMAID_THEMES,
    nodeToSpec,
} from './MermaidParser';

/** Adds a listener only when the optional HUD markup contains the selector. */
function listen<K extends keyof HTMLElementEventMap>(
    root: ParentNode,
    selector: string,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
): void {
    root.querySelector(selector)?.addEventListener(type, handler as EventListener);
}

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
    private parseResult: DiagramParseResult | null = null;
    private autoAnimate = true;
    private enableSubgraphs = true;
    private options: MermaidPluginOptions;

    constructor(options: MermaidPluginOptions = {}) {
        super();
        this.options = options;
        this.currentLayout = options.defaultLayout ?? 'hierarchical';
        this.currentTheme = options.defaultTheme ?? 'default';
        this.autoAnimate = options.autoAnimate ?? true;
        this.enableSubgraphs = options.enableSubgraphs ?? true;
    }

    static get HUD_STYLES(): string {
        return MERMAID_HUD_STYLES;
    }

    protected onInit(): void {
        this.initializeLayouts();
        if (this.options.showHud !== false) {
            this.createHUD();
        }
    }

    parseAndRender(content: string, format?: DiagramFormat): void {
        const detectedFormat = format || DiagramParserFactory.detectFormat(content);
        this.currentFormat = detectedFormat;

        this.parseResult = DiagramParserFactory.parse(content, detectedFormat);
        this.renderDiagram();
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
                const color = (data.color as string) || nodeColors[nodeIndex % nodeColors.length];

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

    showAlert(options: {
        type: 'info' | 'success' | 'warning' | 'error';
        message: string;
        duration?: number;
    }): void {
        const hud = this.sg.pluginManager.get('hud') as HUDPlugin | undefined;
        hud?.showAlert({
            message: options.message,
            variant: options.type,
            duration: options.duration,
        });
    }

    dispose(): void {
        if (this.hudContainer?.parentElement) {
            this.hudContainer.parentElement.removeChild(this.hudContainer);
        }
        this.hudContainer = null;
    }

    private initializeLayouts(): void {
        const configs: Record<LayoutName, { create: () => BaseLayout; direction?: string }> = {
            force: { create: () => new ForceLayout({ iterations: 100, repulsion: 5000 }) },
            circular: { create: () => new CircularLayout() },
            grid: { create: () => new GridLayout({ columns: 4, spacingX: 200, spacingY: 150 }) },
            hierarchical: {
                create: () => new HierarchicalLayout({ direction: 'TB' }),
                direction: 'TB',
            },
            radial: { create: () => new RadialLayout() },
            tree: { create: () => new TreeLayout({ direction: 'TB' }), direction: 'TB' },
            spectral: { create: () => new SpectralLayout() },
            cluster: { create: () => new ClusterLayout({ clusterBy: 'cluster' }) },
        };

        for (const name of Object.keys(configs) as LayoutName[]) {
            const config = configs[name];
            const instance = config.create();
            instance.init(this.sg, this.graph, this.events);
            this.layouts.set(name, { name, instance, direction: config.direction });
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

    /** A titled HUD section; the content is the markup that goes inside it. */
    private createSection(title: string, content: string): HTMLElement {
        const container = document.createElement('div');
        container.className = 'mermaid-hud-section';
        container.innerHTML = `
      <div class="mermaid-hud-title">${title}</div>
      <div class="mermaid-hud-section-content">${content}</div>
    `;
        this.hudContainer?.appendChild(container);
        return container;
    }

    private createFormatSelector(): void {
        const formats: DiagramFormat[] = ['mermaid', 'dot', 'graphml', 'json'];
        const container = this.createSection(
            'Format',
            `
        <select id="mermaid-format-select" class="mermaid-hud-select">
          ${formats.map((f) => `<option value="${f}" ${f === this.currentFormat ? 'selected' : ''}>${f.toUpperCase()}</option>`).join('')}
        </select>
      `,
        );

        listen(container, '#mermaid-format-select', 'change', (e) => {
            this.currentFormat = (e.target as HTMLSelectElement).value as DiagramFormat;
        });
    }

    private createLayoutControls(): void {
        const container = this.createSection(
            'Layout',
            `
        <select id="mermaid-layout-select" class="mermaid-hud-select">
          ${LAYOUT_NAMES.map(
              (name) => `
            <option value="${name}" ${name === this.currentLayout ? 'selected' : ''}>
              ${getLayoutLabel(name)}
            </option>
          `,
          ).join('')}
        </select>
        <button id="mermaid-apply-layout" class="mermaid-hud-button">Apply Layout</button>
        <div id="mermaid-suggested-layout" class="mermaid-hud-hint"></div>
      `,
        );

        listen(container, '#mermaid-layout-select', 'change', (e) => {
            this.currentLayout = (e.target as HTMLSelectElement).value as LayoutName;
        });
        listen(container, '#mermaid-apply-layout', 'click', () => this.applyCurrentLayout());
    }

    private createThemeControls(): void {
        const themes = Object.keys(MERMAID_THEMES) as MermaidThemeName[];
        const container = this.createSection(
            'Theme',
            `
        <select id="mermaid-theme-select" class="mermaid-hud-select">
          ${themes.map((t) => `<option value="${t}" ${t === this.currentTheme ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
        </select>
        <div class="mermaid-hud-row">
          <button id="mermaid-prev-theme" class="mermaid-hud-button-small">◀</button>
          <button id="mermaid-next-theme" class="mermaid-hud-button-small">▶</button>
        </div>
      `,
        );

        const select = container.querySelector('#mermaid-theme-select') as HTMLSelectElement | null;

        listen(container, '#mermaid-theme-select', 'change', (e) => {
            this.currentTheme = (e.target as HTMLSelectElement).value as MermaidThemeName;
            this.applyTheme();
        });

        const stepTheme = (delta: number) => {
            const idx = themes.indexOf(this.currentTheme);
            this.currentTheme = themes[(idx + delta + themes.length) % themes.length];
            if (select) select.value = this.currentTheme;
            this.applyTheme();
        };
        listen(container, '#mermaid-prev-theme', 'click', () => stepTheme(-1));
        listen(container, '#mermaid-next-theme', 'click', () => stepTheme(1));
    }

    private createVisualizationControls(): void {
        const container = this.createSection(
            'View',
            `
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
      `,
        );

        listen(container, '#mermaid-zoom-in', 'click', () => this.sg.cameraControls.zoom(1.25));
        listen(container, '#mermaid-zoom-out', 'click', () => this.sg.cameraControls.zoom(0.8));
        listen(container, '#mermaid-fit', 'click', () => this.sg.fitView(150, 1.5));
        listen(container, '#mermaid-3d', 'click', () => this.toggle3D());
        listen(container, '#mermaid-auto-animate', 'change', (e) => {
            this.autoAnimate = (e.target as HTMLInputElement).checked;
        });
        listen(container, '#mermaid-subgraphs', 'change', (e) => {
            this.enableSubgraphs = (e.target as HTMLInputElement).checked;
        });
    }

    private toggle3D(): void {
        this.sg.setProjection(
            this.sg.projection === 'orthographic' ? 'perspective' : 'orthographic',
        );
    }

    private renderDiagram(): void {
        if (!this.parseResult) return;

        this.clearGraph();

        const theme = MERMAID_THEMES[this.currentTheme];

        if (this.enableSubgraphs && this.parseResult.clusters.length > 0) {
            this.renderClusters();
        }

        this.parseResult.nodes.forEach((node, index) => {
            const spec = nodeToSpec(node, index, theme);
            if (!this.enableSubgraphs) spec.data = { ...spec.data, cluster: undefined };
            this.graph.addNode(spec);
        });

        this.parseResult.edges.forEach((edge, index) => {
            this.graph.addEdge(edgeToSpec(edge, index, theme));
        });

        this.applyCurrentLayout();
    }

    private renderClusters(): void {
        const clusterColors = CLUSTER_COLORS;

        this.parseResult!.clusters.forEach((cluster, index) => {
            const clusterNodeIds = this.parseResult!.nodes.filter(
                (n) => n.cluster === cluster.id,
            ).map((n) => n.id);

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
                    color: parseColor(clusterColors[colorIndex]),
                    depth: 50,
                    label: cluster.label,
                    clusterId: cluster.id,
                },
            });
        });
    }

    private clearGraph(): void {
        this.graph.clear();
    }

    private async applyClusterLayouts(): Promise<void> {
        const clusterNodes = Array.from(this.graph.getNodes()).filter((n) =>
            n.id.startsWith('cluster-'),
        );

        for (const clusterNode of clusterNodes) {
            const clusterId = (clusterNode.data as { clusterId?: string }).clusterId;
            if (!clusterId) continue;

            const memberNodes = Array.from(this.graph.getNodes()).filter(
                (n) => (n.data as { cluster?: string })?.cluster === clusterId,
            );

            if (memberNodes.length === 0) continue;

            const { min, max } = accumulateBounds(memberNodes.map((mn) => mn.position))!;

            const centerX = (min.x + max.x) / 2;
            const centerY = (min.y + max.y) / 2;
            const width = Math.max(max.x - min.x + 100, 200);
            const height = Math.max(max.y - min.y + 100, 150);

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
}

let stylesInjected = false;

export function injectMermaidStyles(): void {
    if (stylesInjected || typeof document === 'undefined') return;

    const style = document.createElement('style');
    style.textContent = MermaidPlugin.HUD_STYLES;
    document.head.appendChild(style);
    stylesInjected = true;
}

import { DOMNode } from './DOMNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

/**
 * ChartNode — Canvas-based chart node.  Renders via Chart.js if available,
 * otherwise falls back to a built-in mini bar/line renderer so the node is
 * always useful without an optional dependency.
 *
 * data options:
 *   chartType : 'bar' | 'line' | 'pie' (default 'bar')
 *   labels    : string[]
 *   datasets  : Array<{ label: string; data: number[]; color?: string }>
 *   width     : pixel width  (default 300)
 *   height    : pixel height (default 200)
 *   title     : optional chart title string
 *
 * Charts render onto a <canvas> element via CSS3D so they remain fully crisp
 * at any zoom level. The canvas is also wrapped in a div so a title bar can
 * sit above it.
 */
export class ChartNode extends DOMNode {
    public canvasEl: HTMLCanvasElement;
    private chartInstance: any = null;

    private titleEl: HTMLElement | null = null;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const w = spec.data?.width ?? 300;
        const h = spec.data?.height ?? 200;
        const theme = spec.data?.theme ?? 'dark';
        const title = spec.label ?? spec.data?.title ?? '';
        const totalH = h + (title ? 32 : 0);

        const div = DOMUtils.createElement('div');
        // Ensure DOMNode treats this as fully interactive, similar to HtmlNode
        super(sg, spec, div, w, totalH, { opacity: 0.1 });

        this.domElement.className = `spacegraph-chart-node theme-${theme}`;

        this.setupContainerStyles(w, totalH, theme as any);

        if (title) {
            this.titleEl = this.createTitleBar(title, theme as any);
            this.domElement.appendChild(this.titleEl);
        }

        const canvasContainer = DOMUtils.createElement('div');
        Object.assign(canvasContainer.style, {
            position: 'relative',
            flexGrow: '1',
            width: '100%',
            height: '100%'
        });

        this.canvasEl = DOMUtils.createElement('canvas', {
            style: {
                display: 'block',
                width: '100%',
                height: '100%'
            }
        });
        canvasContainer.appendChild(this.canvasEl);
        this.domElement.appendChild(canvasContainer);

        this._renderChart(spec);
    }

    private async _renderChart(spec: Partial<NodeSpec>) {
        const chartType = spec.data?.chartType ?? 'bar';
        const labels = spec.data?.labels ?? [];
        const datasets = spec.data?.datasets ?? [];

        // Try to use Chart.js if the user has it installed
        let Chart: any;
        try {
            Chart = (await import('chart.js' as any)).Chart;
            // Auto-register all components
            const auto = await import('chart.js/auto' as any);
            Chart = auto.default ?? Chart;
        } catch {
            Chart = null;
        }

        const theme = spec.data?.theme ?? 'dark';
        const isDark = theme === 'dark';
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? '#1e293b' : '#e2e8f0';

        if (Chart) {
            this.chartInstance?.destroy();

            // Allow full override via chartOptions if provided
            const customOptions = spec.data?.chartOptions || {};

            const baseOptions = {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { labels: { color: textColor, font: { size: 11 } } },
                },
                scales: chartType === 'pie' || chartType === 'radar' ? undefined : {
                    x: { ticks: { color: textColor }, grid: { color: gridColor } },
                    y: { ticks: { color: textColor }, grid: { color: gridColor } },
                }
            };

            this.chartInstance = new Chart(this.canvasEl, {
                type: chartType,
                data: {
                    labels,
                    datasets: datasets.map((ds: any, i: number) => ({
                        label: ds.label ?? `Series ${i + 1}`,
                        data: ds.data ?? [],
                        backgroundColor: ds.color ?? `hsl(${i * 60}, 70%, 55%)`,
                        borderColor: ds.borderColor ?? ds.color ?? `hsl(${i * 60}, 70%, 55%)`,
                        borderWidth: ds.borderWidth ?? 1,
                        ...ds // Allow other chartjs specific dataset properties to pass through
                    })),
                },
                options: { ...baseOptions, ...customOptions },
            });
        } else {
            // Fallback built-in renderer (bar chart only)
            this._renderFallback(labels, datasets, theme);
        }
    }

    private _renderFallback(labels: string[], datasets: any[], theme: string) {
        const ctx = this.canvasEl.getContext('2d');
        if (!ctx) return;

        // Ensure internal canvas resolution matches display size for sharp rendering
        const rect = this.canvasEl.getBoundingClientRect();
        // If not attached to DOM yet, fallback to node dimensions
        const w = rect.width || this.data?.width || 300;
        const h = rect.height || this.data?.height || 200;

        this.canvasEl.width = w;
        this.canvasEl.height = h;

        ctx.clearRect(0, 0, w, h);

        const isDark = theme === 'dark';
        ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
        ctx.fillRect(0, 0, w, h);

        const data: number[] = datasets[0]?.data ?? [];
        if (!data.length) {
            ctx.fillStyle = '#475569';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data', w / 2, h / 2);
            return;
        }

        const max = Math.max(...data, 1);
        const barW = (w - 20) / data.length;
        const pad = 10;

        data.forEach((val, i) => {
            const barH = (val / max) * (h - 30);
            ctx.fillStyle = datasets[0]?.color ?? `hsl(${i * 40}, 70%, 55%)`;
            ctx.fillRect(pad + i * barW + 2, h - barH - 20, barW - 4, barH);

            if (labels[i]) {
                ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(labels[i], pad + i * barW + barW / 2, h - 5);
            }
        });
    }

    updateSpec(updates: Partial<NodeSpec>): void {
        super.updateSpec(updates);

        if (updates.label !== undefined && this.titleEl) {
             this.titleEl.textContent = updates.label;
        }

        if (updates.data) {
             // Handle size updates
             if (updates.data.width || updates.data.height) {
                 const w = updates.data.width || this.data.width || 300;
                 const h = updates.data.height || this.data.height || 200;
                 const title = updates.label ?? this.label ?? this.data.title ?? '';
                 const totalH = h + (title ? 32 : 0);

                 this.domElement.style.width = `${w}px`;
                 this.domElement.style.height = `${totalH}px`;

                 this.updateBackingGeometry(w, totalH);
             }

             if (updates.data.datasets || updates.data.labels || updates.data.chartType || updates.data.theme || updates.data.chartOptions) {
                 this._renderChart({ data: { ...this.data, ...updates.data } });
             }
        }
    }

    dispose(): void {
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
        super.dispose();
    }
}

import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import * as THREE from 'three';
import { DOMNode } from './DOMNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

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

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const w = spec.data?.width ?? 300;
        const h = spec.data?.height ?? 200;
        const title = spec.label ?? spec.data?.title ?? '';
        const totalH = h + (title ? 32 : 0);

        const div = document.createElement('div');
        super(sg, spec, div, w, totalH, { visible: false });
        Object.assign(this.domElement.style, {
            width: `${w}px`,
            height: `${h + (title ? 32 : 0)}px`,
            background: '#0f172a',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            boxSizing: 'border-box',
        } as CSSStyleDeclaration);

        if (title) {
            const titleEl = document.createElement('div');
            Object.assign(titleEl.style, {
                padding: '6px 10px',
                color: '#94a3b8',
                fontSize: '12px',
                fontFamily: 'sans-serif',
                borderBottom: '1px solid #1e293b',
            });
            titleEl.textContent = title;
            this.domElement.appendChild(titleEl);
        }

        this.canvasEl = document.createElement('canvas');
        this.canvasEl.width = w;
        this.canvasEl.height = h;
        Object.assign(this.canvasEl.style, { display: 'block' });
        this.domElement.appendChild(this.canvasEl);



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

        if (Chart) {
            this.chartInstance?.destroy();
            this.chartInstance = new Chart(this.canvasEl, {
                type: chartType,
                data: {
                    labels,
                    datasets: datasets.map((ds: any, i: number) => ({
                        label: ds.label ?? `Series ${i + 1}`,
                        data: ds.data ?? [],
                        backgroundColor: ds.color ?? `hsl(${i * 60}, 70%, 55%)`,
                        borderColor: ds.color ?? `hsl(${i * 60}, 70%, 55%)`,
                        borderWidth: 1,
                    })),
                },
                options: {
                    responsive: false,
                    animation: false,
                    plugins: {
                        legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
                    },
                    scales:
                        chartType !== 'pie'
                            ? {
                                x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
                                y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
                            }
                            : undefined,
                },
            });
        } else {
            // Fallback built-in renderer (bar chart only)
            this._renderFallback(labels, datasets);
        }
    }

    private _renderFallback(labels: string[], datasets: any[]) {
        const ctx = this.canvasEl.getContext('2d');
        if (!ctx) return;
        const { width: w, height: h } = this.canvasEl;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0f172a';
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
            ctx.fillStyle = `hsl(${i * 40}, 70%, 55%)`;
            ctx.fillRect(pad + i * barW + 2, h - barH - 20, barW - 4, barH);

            if (labels[i]) {
                ctx.fillStyle = '#64748b';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(labels[i], pad + i * barW + barW / 2, h - 5);
            }
        });
    }

    updateSpec(updates: Partial<NodeSpec>): void {
        super.updateSpec(updates);
        if (updates.data?.datasets || updates.data?.labels || updates.data?.chartType) {
            this._renderChart({ data: { ...this.data, ...updates.data } });
        }
    }

    dispose(): void {
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
        super.dispose();
    }
}

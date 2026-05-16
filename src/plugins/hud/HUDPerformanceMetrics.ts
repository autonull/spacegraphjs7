import type { SpaceGraph } from '../../SpaceGraph';
import { DOMUtils } from '../../utils/DOMUtils';
import { HUD_STYLES, HUD_ZINDEX, HUD_COLORS } from './HUDStyles';
import { HUDDOMFactory } from './HUDDOMFactory';

export class HUDPerformanceMetrics {
    private metricsEl: HTMLElement | null = null;
    private sg: SpaceGraph;
    private frames = 0;
    private lastTime = performance.now();
    private fps = 0;
    private monitoring = false;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    create(): void {
        this.metricsEl = DOMUtils.createElement('div', {
            className: 'spacegraph-performance-metrics',
            style: {
                ...HUD_STYLES.base,
                top: '16px',
                right: '16px',
                background: HUD_COLORS.background,
                border: `1px solid ${HUD_COLORS.border}`,
                backdropFilter: 'blur(8px)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                lineHeight: '1.6',
                zIndex: HUD_ZINDEX.HUD,
                pointerEvents: 'none',
            },
        });

        this.metricsEl.innerHTML = `
            <div style="font-weight: bold; color: ${HUD_COLORS.primary}; margin-bottom: 4px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em;">Telemetry</div>
            <div><span style="color: ${HUD_COLORS.textMuted}">FPS:</span> <span id="sg-fps">60</span></div>
            <div><span style="color: ${HUD_COLORS.textMuted}">Frame:</span> <span id="sg-frame-time">16.7</span>ms</div>
            <div><span style="color: ${HUD_COLORS.textMuted}">Draw:</span> <span id="sg-draw-calls">0</span></div>
            <div id="sg-memory-container" style="display: none"><span style="color: ${HUD_COLORS.textMuted}">Mem:</span> <span id="sg-memory">0</span>MB</div>
        `;

        HUDDOMFactory.appendToRenderer(this.sg, this.metricsEl);
        this.startMonitoring();
    }

    private startMonitoring(): void {
        this.monitoring = true;
        this.measure();
    }

    private measure(): void {
        if (!this.monitoring) return;

        this.frames++;
        const now = performance.now();
        const delta = now - this.lastTime;

        if (delta >= 1000) {
            this.fps = Math.round((this.frames * 1000) / delta);
            const frameTime = delta / this.frames;

            const fpsEl = HUDDOMFactory.getElementById('sg-fps');
            const frameTimeEl = HUDDOMFactory.getElementById('sg-frame-time');

            if (fpsEl) {
                fpsEl.textContent = this.fps.toString();
                fpsEl.style.color = this.fps < 30 ? HUD_COLORS.error : this.fps < 55 ? HUD_COLORS.warning : HUD_COLORS.success;
            }
            if (frameTimeEl) frameTimeEl.textContent = frameTime.toFixed(1);

            // Update memory if available
            const mem = (performance as any).memory;
            if (mem) {
                const memEl = HUDDOMFactory.getElementById('sg-memory');
                const memContainer = HUDDOMFactory.getElementById('sg-memory-container');
                if (memEl && memContainer) {
                    memContainer.style.display = 'block';
                    memEl.textContent = Math.round(mem.usedJSHeapSize / 1048576).toString();
                }
            }

            this.frames = 0;
            this.lastTime = now;
        }

        requestAnimationFrame(() => this.measure());
    }

    updateDrawCalls(count: number): void {
        const el = HUDDOMFactory.getElementById('sg-draw-calls');
        if (el) {
            el.textContent = count.toString();
        }
    }

    dispose(): void {
        this.monitoring = false;
        if (this.metricsEl?.parentElement) {
            this.metricsEl.parentElement.removeChild(this.metricsEl);
        }
        this.metricsEl = null;
    }
}

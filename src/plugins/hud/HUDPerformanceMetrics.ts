import type { SpaceGraph } from '../../SpaceGraph';
import { FpsMeter } from '../../utils/FpsMeter';
import { HUDDOMFactory } from './HUDDOMFactory';
import { HUDElement, type HUDElementSpec } from './HUDElement';
import { HUD_COLORS, HUD_STYLES, HUD_ZINDEX } from './HUDStyles';

export class HUDPerformanceMetrics extends HUDElement {
    private readonly fpsMeter = new FpsMeter(1000);
    private fps = 0;

    protected spec(): HUDElementSpec {
        return {
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
            html: `
                <div style="font-weight: bold; color: ${HUD_COLORS.primary}; margin-bottom: 4px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em;">Telemetry</div>
                <div><span style="color: ${HUD_COLORS.textMuted}">FPS:</span> <span id="sg-fps">60</span></div>
                <div><span style="color: ${HUD_COLORS.textMuted}">Frame:</span> <span id="sg-frame-time">16.7</span>ms</div>
                <div><span style="color: ${HUD_COLORS.textMuted}">Draw:</span> <span id="sg-draw-calls">0</span></div>
                <div id="sg-memory-container" style="display: none"><span style="color: ${HUD_COLORS.textMuted}">Mem:</span> <span id="sg-memory">0</span>MB</div>
            `,
        };
    }

    /** Called once per rendered frame; refresh the readout about once a second. */
    tick(now = performance.now()): void {
        const sample = this.fpsMeter.tick(now);
        if (!sample) return;

        this.fps = Math.round(sample.fps);
        const frameTime = sample.elapsed / sample.frames;
        const fpsEl = HUDDOMFactory.getElementById('sg-fps');
        const frameTimeEl = HUDDOMFactory.getElementById('sg-frame-time');

        if (fpsEl) {
            fpsEl.textContent = this.fps.toString();
            fpsEl.style.color =
                this.fps < 30
                    ? HUD_COLORS.error
                    : this.fps < 55
                      ? HUD_COLORS.warning
                      : HUD_COLORS.success;
        }
        if (frameTimeEl) frameTimeEl.textContent = frameTime.toFixed(1);

        const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
        if (mem) {
            const memEl = HUDDOMFactory.getElementById('sg-memory');
            const memContainer = HUDDOMFactory.getElementById('sg-memory-container');
            if (memEl && memContainer) {
                memContainer.style.display = 'block';
                memEl.textContent = Math.round(mem.usedJSHeapSize / 1048576).toString();
            }
        }
    }
}

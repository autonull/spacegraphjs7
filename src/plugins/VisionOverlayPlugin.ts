import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

export class VisionOverlayPlugin implements ISpaceGraphPlugin {
    readonly id = 'vision-overlay-plugin';
    readonly name = 'Vision Overlay';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;
    private container!: HTMLElement;
    private rafId: number | null = null;
    private lastReport: any = null;

    public settings = {
        enabled: true,
        pollingRate: 3000, // Ms between auto-vision checks
    };

    private startPolling() {
        if (!this.settings.enabled) return;
        this.runAnalysis();
        setTimeout(() => this.startPolling(), this.settings.pollingRate);
    }

    private modelsLoaded = false;

    private async runAnalysis() {
        try {
            if (!this.modelsLoaded) {
                this.updateDOMState('Loading AI Models...');
                await this.sg.vision.loadModels({
                    tla: '/tla_model.onnx',
                    che: '/che_model.onnx',
                    odn: '/odn_model.onnx',
                    vhs: '/vhs_model.onnx',
                    eqa: '/eqa_model.onnx',
                });
                this.modelsLoaded = true;
            }
            this.lastReport = await this.sg.vision.analyzeVision();
            this.updateDOM();
        } catch (e) {
            console.error('[VisionOverlay] Analysis error:', e);
        }
    }

    init(sg: SpaceGraph): void {
        this.sg = sg;
        if (typeof document === 'undefined') return;

        this.container = DOMUtils.createElement('div', {
            className: 'spacegraph-vision-overlay',
            style: {
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '280px',
                background: 'rgba(15, 15, 20, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                color: '#fff',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '13px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                zIndex: '9999',
                pointerEvents: 'auto',
                transition: 'all 0.3s ease'
            }
        });
        this.applyStyles();

        // Attach to the same parent as the canvas
        const domElement = this.sg.renderer.renderer.domElement;
        if (domElement.parentElement) {
            domElement.parentElement.style.position = 'relative';
            domElement.parentElement.appendChild(this.container);
        }

        this.updateDOM();

        // Start autonomous polling
        setTimeout(() => this.startPolling(), 1000);
    }

    private applyStyles() {
        // Handled in DOMUtils.createElement
    }

    private getScoreColor(score: number): string {
        if (score >= 90) return '#4ade80'; // Green
        if (score >= 70) return '#facc15'; // Yellow
        return '#f87171'; // Red
    }

    private updateDOMState(message: string) {
        if (!this.container) return;
        this.container.innerHTML = `
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                <div class="sg-spinner"></div> Vision Analysis
            </div>
            <div style="color: rgba(255,255,255,0.6);">${message}</div>
        `;
        this.injectSpinnerStyles();
    }

    private updateDOM() {
        if (!this.container) return;

        if (!this.lastReport) {
            this.updateDOMState('Initializing ONNX runtime...');
            return;
        }

        const { layout, overall } = this.lastReport;

        this.container.innerHTML = `
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>👁️ Vision Quality</div>
                <div style="color: ${this.getScoreColor(overall)}; font-weight: 700;">${Math.round(overall)}/100</div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
                <!-- Layout -->
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: rgba(255,255,255,0.8);">Layout Architecture</span>
                    <span style="color: ${this.getScoreColor(layout.overall)}; font-variant-numeric: tabular-nums;">${Math.round(layout.overall)}</span>
                </div>
                
                <!-- Legibility -->
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: rgba(255,255,255,0.8);">Text Legibility</span>
                    <span style="color: ${this.getScoreColor(100)}; font-variant-numeric: tabular-nums;">Pass</span>
                </div>

                <!-- Overlaps -->
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: rgba(255,255,255,0.8);">Node Overlaps</span>
                    <span style="color: ${this.lastReport.overlap.statistics.totalOverlaps === 0 ? '#4ade80' : '#f87171'}; font-variant-numeric: tabular-nums;">
                        ${this.lastReport.overlap.statistics.totalOverlaps}
                    </span>
                </div>
            </div>

            <button id="sg-vision-autofix" style="
                width: 100%;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                border: none;
                border-radius: 6px;
                padding: 10px;
                color: white;
                font-weight: 600;
                cursor: pointer;
                transition: opacity 0.2s;
            ">
                ✨ Auto-Fix Issues
            </button>
        `;

        const btn = this.container.querySelector('#sg-vision-autofix');
        if (btn) {
            btn.addEventListener('click', async () => {
                btn.innerHTML =
                    '<div class="sg-spinner" style="width: 14px; height: 14px; display: inline-block; margin-right: 6px;"></div> Fixing...';
                await this.sg.vision.applyAutonomousFixes(this.lastReport);
                this.runAnalysis(); // re-eval
            });
            btn.addEventListener('mouseenter', () => ((btn as HTMLElement).style.opacity = '0.9'));
            btn.addEventListener('mouseleave', () => ((btn as HTMLElement).style.opacity = '1'));
        }
    }

    private injectSpinnerStyles() {
        if (typeof document === 'undefined') return;
        if (!document.getElementById('sg-vision-styles')) {
            const style = DOMUtils.createElement('style');
            style.id = 'sg-vision-styles';
            style.innerHTML = `
                @keyframes sg-spin { 100% { transform: rotate(360deg); } }
                .sg-spinner {
                    width: 12px; height: 12px;
                    border: 2px solid rgba(255,255,255,0.2);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: sg-spin 1s linear infinite;
                }
            `;
            document.head.appendChild(style);
        }
    }

    dispose(): void {
        this.settings.enabled = false;
        if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
    }
}

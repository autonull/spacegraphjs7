import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';

export class N8nVisionOptimizerNode extends HtmlNode {
    private scoreEl?: HTMLDivElement;
    private fixBtn?: HTMLButtonElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        // SpaceGraph Vision Optimizer Node UI
        const html = `
            <div class="n8n-vision-node" style="
                background: #607d8b; /* Blue Grey */
                border-radius: 8px;
                padding: 15px;
                color: white;
                font-family: 'Inter', sans-serif;
                width: 250px;
                box-shadow: 0 4px 15px rgba(96, 125, 139, 0.4);
                display: flex;
                flex-direction: column;
                gap: 12px;
            ">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                        👁️ Vision Optimizer
                    </div>
                </div>

                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(0,0,0,0.15);
                    padding: 10px;
                    border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.2);
                ">
                    <span style="font-size: 12px;">Layout Score</span>
                    <span class="score-badge" style="font-size: 14px; font-weight: bold; color: #aed581;">--/100</span>
                </div>

                <button class="fix-btn" style="
                    width: 100%;
                    padding: 10px;
                    border: none;
                    border-radius: 4px;
                    background: #2196f3;
                    color: white;
                    font-weight: bold;
                    cursor: pointer;
                    transition: background 0.2s;
                    margin-top: 5px;
                ">Auto-Fix Layout</button>
            </div>
        `;

        super(sg, { ...spec, html });
        this.width = spec.width || 250;
        this.height = spec.height || 150;
    }

    protected initDomElement(html: string): void {
        super.initDomElement(html);
        if (this.domElement) {
            this.scoreEl = this.domElement.querySelector('.score-badge') as HTMLDivElement;
            this.fixBtn = this.domElement.querySelector('.fix-btn') as HTMLButtonElement;

            this.updateWidgetFromParams(this.parameters);

            if (this.fixBtn) {
                this.fixBtn.addEventListener('click', async () => {
                    console.log(`[VisionOptimizer] Triggering Auto-Fix`);
                    if (this.fixBtn) this.fixBtn.textContent = 'Fixing...';

                    // Trigger Vision Manager Layout Heal
                    const forceLayout = this.sg.pluginManager.getPlugin('ForceLayout') as any;
                    if (forceLayout && typeof forceLayout.update === 'function') {
                        // Simulate running force layout for a bit
                        for (let i = 0; i < 50; i++) {
                            forceLayout.update(0.016);
                        }
                    }

                    const ergonomics = this.sg.pluginManager.getPlugin('ErgonomicsPlugin') as any;
                    if (ergonomics && typeof ergonomics.fixOverlaps === 'function') {
                        await ergonomics.fixOverlaps();
                    }

                    if (this.fixBtn) this.fixBtn.textContent = 'Auto-Fix Layout';

                    // Simulate score update
                    if (this.scoreEl) {
                        this.scoreEl.textContent = '95/100';
                        this.scoreEl.style.color = '#aed581';
                    }
                });
            }
        }
    }

    private updateWidgetFromParams(params: any) {
        if (!params) return;

        if (this.scoreEl && params.score !== undefined) {
            this.scoreEl.textContent = `${params.score}/100`;
            if (params.score < 70) this.scoreEl.style.color = '#ffb74d';
            else this.scoreEl.style.color = '#aed581';
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        if (spec.parameters) {
            this.updateWidgetFromParams(spec.parameters);
        }
    }
}

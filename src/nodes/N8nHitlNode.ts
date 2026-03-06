import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';

export class N8nHitlNode extends HtmlNode {
    private summaryEl?: HTMLDivElement;
    private approveBtn?: HTMLButtonElement;
    private rejectBtn?: HTMLButtonElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        // Human-in-the-loop Node UI
        const html = `
            <div class="n8n-hitl-node" style="
                background: #ff9800; /* Warning orange */
                border-radius: 8px;
                padding: 15px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                width: 260px;
                box-shadow: 0 4px 15px rgba(255, 152, 0, 0.4);
                display: flex;
                flex-direction: column;
                gap: 12px;
            ">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 16px;">👤</span> Human Intervention
                    </div>
                    <span class="status-badge" style="background: rgba(0,0,0,0.2); padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase;">Waiting</span>
                </div>

                <div class="task-summary" style="
                    background: rgba(0,0,0,0.15);
                    padding: 10px;
                    border-radius: 6px;
                    font-size: 12px;
                    line-height: 1.4;
                    max-height: 80px;
                    overflow-y: auto;
                    border: 1px solid rgba(255,255,255,0.2);
                ">Review generated email copy before sending to client.</div>

                <div style="display: flex; gap: 10px; margin-top: 5px;">
                    <button class="reject-btn" style="
                        flex: 1;
                        padding: 8px;
                        border: none;
                        border-radius: 4px;
                        background: #f44336;
                        color: white;
                        font-weight: bold;
                        cursor: pointer;
                        transition: opacity 0.2s;
                    ">Reject</button>
                    <button class="approve-btn" style="
                        flex: 1;
                        padding: 8px;
                        border: none;
                        border-radius: 4px;
                        background: #4caf50;
                        color: white;
                        font-weight: bold;
                        cursor: pointer;
                        transition: opacity 0.2s;
                    ">Approve</button>
                </div>
            </div>
        `;

        super(sg, { ...spec, html });
        this.width = spec.width || 260;
        this.height = spec.height || 160;
    }

    protected initDomElement(html: string): void {
        super.initDomElement(html);
        if (this.domElement) {
            this.summaryEl = this.domElement.querySelector('.task-summary') as HTMLDivElement;
            this.approveBtn = this.domElement.querySelector('.approve-btn') as HTMLButtonElement;
            this.rejectBtn = this.domElement.querySelector('.reject-btn') as HTMLButtonElement;

            this.updateWidgetFromParams(this.parameters);

            if (this.approveBtn) {
                this.approveBtn.addEventListener('click', () => {
                    console.log(`[HITL] Approved node ${this.id}`);
                    // Notify bridge
                });
            }
            if (this.rejectBtn) {
                this.rejectBtn.addEventListener('click', () => {
                    console.log(`[HITL] Rejected node ${this.id}`);
                    // Notify bridge
                });
            }
        }
    }

    private updateWidgetFromParams(params: any) {
        if (!params) return;

        if (this.summaryEl && params.taskSummary) {
            this.summaryEl.textContent = params.taskSummary;
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        if (spec.parameters) {
            this.updateWidgetFromParams(spec.parameters);
        }
    }
}

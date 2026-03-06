import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';

export class N8nHttpNode extends HtmlNode {
    private urlEl?: HTMLDivElement;
    private methodEl?: HTMLSpanElement;
    private previewEl?: HTMLPreElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        // Initialize HTML structure
        const html = `
            <div class="n8n-http-node" style="
                background: #1e1e1e;
                border: 1px solid #444;
                border-radius: 8px;
                padding: 10px;
                color: white;
                font-family: monospace;
                width: 200px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            ">
                <div style="display: flex; gap: 5px; margin-bottom: 8px; align-items: center;">
                    <span class="method-badge" style="
                        background: #2196f3;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 10px;
                        font-weight: bold;
                    ">GET</span>
                    <span class="url-label" style="
                        font-size: 11px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        flex: 1;
                    ">https://api.example.com</span>
                </div>
                <div class="response-preview" style="
                    background: #000;
                    padding: 5px;
                    border-radius: 4px;
                    font-size: 9px;
                    height: 40px;
                    overflow: hidden;
                    color: #a5d6a7;
                ">Waiting...</div>
            </div>
        `;

        super(sg, { ...spec, html });
        this.width = spec.width || 200;
        this.height = spec.height || 80;
    }

    protected initDomElement(html: string): void {
        super.initDomElement(html);
        if (this.domElement) {
            this.methodEl = this.domElement.querySelector('.method-badge') as HTMLSpanElement;
            this.urlEl = this.domElement.querySelector('.url-label') as HTMLDivElement;
            this.previewEl = this.domElement.querySelector('.response-preview') as HTMLPreElement;
            this.updateWidgetFromParams(this.parameters);
        }
    }

    private updateWidgetFromParams(params: any) {
        if (!params) return;

        if (this.methodEl && params.requestMethod) {
            this.methodEl.textContent = params.requestMethod.toUpperCase();

            // Color code
            if (params.requestMethod === 'POST') this.methodEl.style.background = '#4caf50';
            else if (params.requestMethod === 'PUT') this.methodEl.style.background = '#ff9800';
            else if (params.requestMethod === 'DELETE') this.methodEl.style.background = '#f44336';
            else this.methodEl.style.background = '#2196f3';
        }

        if (this.urlEl && params.url) {
            this.urlEl.textContent = params.url;
        }

        if (this.previewEl && params.response) {
             this.previewEl.textContent = JSON.stringify(params.response, null, 2).slice(0, 100) + '...';
        } else if (this.previewEl && params.status === 'running') {
             this.previewEl.textContent = 'Fetching...';
             this.previewEl.style.color = '#ffcc80';
        } else if (this.previewEl) {
             this.previewEl.textContent = 'Waiting...';
             this.previewEl.style.color = '#a5d6a7';
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        if (spec.parameters) {
            this.updateWidgetFromParams(spec.parameters);
        }
    }
}

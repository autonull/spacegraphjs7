import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';

export class N8nCodeNode extends HtmlNode {
    private codeSnippet?: HTMLPreElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        // Simple HTML preview instead of full Monaco for initial implementation
        const html = `
            <div class="n8n-code-node" style="
                background: #2d2d2d;
                border-radius: 6px;
                padding: 10px;
                color: #d4d4d4;
                font-family: 'Consolas', monospace;
                width: 280px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                display: flex;
                flex-direction: column;
                gap: 5px;
                border-left: 4px solid #fbc02d;
            ">
                <div style="font-size: 11px; color: #9cdcfe; font-weight: bold; margin-bottom: 5px;">JavaScript</div>
                <pre class="code-snippet" style="
                    background: #1e1e1e;
                    padding: 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    margin: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    height: 60px;
                    white-space: pre-wrap;
                ">return items;</pre>
            </div>
        `;

        super(sg, { ...spec, html });
        this.width = spec.width || 280;
        this.height = spec.height || 100;
    }

    protected initDomElement(html: string): void {
        super.initDomElement(html);
        if (this.domElement) {
            this.codeSnippet = this.domElement.querySelector('.code-snippet') as HTMLPreElement;
            this.updateWidgetFromParams(this.parameters);
        }
    }

    private updateWidgetFromParams(params: any) {
        if (!params) return;

        if (this.codeSnippet && params.jsCode !== undefined) {
            this.codeSnippet.textContent = params.jsCode;
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        if (spec.parameters) {
            this.updateWidgetFromParams(spec.parameters);
        }
    }
}

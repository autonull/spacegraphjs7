import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';

export class N8nAiNode extends HtmlNode {
    private promptTextarea?: HTMLTextAreaElement;
    private modelSelect?: HTMLSelectElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        // Initialize HTML structure
        const html = `
            <div class="n8n-ai-node" style="
                background: linear-gradient(135deg, #673ab7, #3f51b5);
                border-radius: 12px;
                padding: 15px;
                color: white;
                font-family: sans-serif;
                width: 250px;
                box-shadow: 0 8px 16px rgba(0,0,0,0.4);
                display: flex;
                flex-direction: column;
                gap: 10px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: bold; font-size: 14px;">✨ AI Agent</span>
                    <select class="model-select" style="
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: none;
                        border-radius: 4px;
                        padding: 4px;
                        font-size: 11px;
                        outline: none;
                    ">
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="claude-3-5-sonnet">Claude 3.5</option>
                        <option value="gemini-1.5-pro">Gemini Pro</option>
                    </select>
                </div>
                <textarea class="prompt-input" placeholder="Enter system prompt..." style="
                    width: 100%;
                    height: 60px;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 6px;
                    color: white;
                    padding: 8px;
                    font-size: 12px;
                    resize: none;
                    box-sizing: border-box;
                    outline: none;
                "></textarea>
            </div>
        `;

        super(sg, { ...spec, html });
        this.width = spec.width || 250;
        this.height = spec.height || 140;
    }

    protected initDomElement(html: string): void {
        super.initDomElement(html);
        if (this.domElement) {
            this.promptTextarea = this.domElement.querySelector('.prompt-input') as HTMLTextAreaElement;
            this.modelSelect = this.domElement.querySelector('.model-select') as HTMLSelectElement;

            this.updateWidgetFromParams(this.parameters);

            // Bind events for two-way sync
            if (this.promptTextarea) {
                this.promptTextarea.addEventListener('input', (e) => {
                    this.parameters = { ...this.parameters, prompt: (e.target as HTMLTextAreaElement).value };
                    // Optionally fire an event back to the bridge
                });
            }
            if (this.modelSelect) {
                this.modelSelect.addEventListener('change', (e) => {
                    this.parameters = { ...this.parameters, model: (e.target as HTMLSelectElement).value };
                });
            }
        }
    }

    private updateWidgetFromParams(params: any) {
        if (!params) return;

        if (this.promptTextarea && params.prompt !== undefined) {
            this.promptTextarea.value = params.prompt;
        }

        if (this.modelSelect && params.model) {
            this.modelSelect.value = params.model;
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        if (spec.parameters) {
            this.updateWidgetFromParams(spec.parameters);
        }
    }
}

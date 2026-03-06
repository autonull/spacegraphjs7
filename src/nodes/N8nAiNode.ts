import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';

export class N8nAiNode extends HtmlNode {
    readonly lodThresholds = {
        icon: 800,
        label: 400,
        summary: 150,
        full: 0,
    };

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, {
            ...spec,
            html: '',
            style: {
                width: '350px',
                height: 'auto',
                padding: '16px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #673ab7, #3f51b5)',
                color: 'white',
                fontFamily: 'sans-serif',
                border: '1px solid #7e57c2',
                boxSizing: 'border-box'
            }
        });
    }

    updateLod(distance: number): void {
        super.updateLod(distance);

        let level = 'full';
        if (distance > this.lodThresholds.icon) level = 'icon';
        else if (distance > this.lodThresholds.label) level = 'label';
        else if (distance > this.lodThresholds.summary) level = 'summary';

        this.renderHtmlContent(level);
    }

    private renderHtmlContent(level: string) {
        if (!this.element) return;

        this.element.innerHTML = '';
        const params = this.spec.parameters || {};
        const model = params.model || 'gpt-4o';
        const promptText = params.prompt || '';

        if (level === 'icon') {
            const el = document.createElement('div');
            el.style.fontSize = '48px';
            el.style.textAlign = 'center';
            el.textContent = '✨';
            this.element.appendChild(el);
            this.element.style.background = 'transparent';
            this.element.style.border = 'none';
        } else if (level === 'label') {
            const el = document.createElement('div');
            el.style.textAlign = 'center';
            el.style.fontSize = '24px';
            el.style.fontWeight = 'bold';
            el.textContent = '✨ AI Agent';
            this.element.appendChild(el);
            this.element.style.background = 'linear-gradient(135deg, #673ab7, #3f51b5)';
            this.element.style.border = '1px solid #7e57c2';
        } else if (level === 'summary') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '8px';

            const title = document.createElement('span');
            title.style.fontWeight = 'bold';
            title.textContent = '✨ AI Agent';

            const badge = document.createElement('span');
            badge.style.background = 'rgba(0,0,0,0.3)';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '12px';
            badge.textContent = model;

            header.appendChild(title);
            header.appendChild(badge);

            const preview = document.createElement('div');
            preview.style.background = 'rgba(0,0,0,0.2)';
            preview.style.padding = '8px';
            preview.style.borderRadius = '4px';
            preview.style.fontSize = '12px';
            preview.style.color = '#e0e0e0';
            preview.style.fontStyle = 'italic';
            preview.textContent = promptText.length > 0 ? (promptText.slice(0, 40) + '...') : 'No prompt set';

            this.element.appendChild(header);
            this.element.appendChild(preview);
            this.element.style.background = 'linear-gradient(135deg, #673ab7, #3f51b5)';
            this.element.style.border = '1px solid #7e57c2';
        } else if (level === 'full') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '12px';

            const title = document.createElement('span');
            title.style.fontWeight = 'bold';
            title.style.fontSize = '16px';
            title.textContent = '✨ AI Agent';

            const select = document.createElement('select');
            select.style.background = 'rgba(255,255,255,0.2)';
            select.style.color = 'white';
            select.style.border = 'none';
            select.style.borderRadius = '4px';
            select.style.padding = '4px 8px';
            select.style.fontSize = '12px';
            select.style.outline = 'none';

            const options = [
                { value: 'gpt-4o', label: 'GPT-4o' },
                { value: 'claude-3-5-sonnet', label: 'Claude 3.5' },
                { value: 'gemini-1.5-pro', label: 'Gemini Pro' }
            ];

            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                option.style.background = '#3f51b5'; // For dropdown visibility
                if (opt.value === model) option.selected = true;
                select.appendChild(option);
            });

            select.addEventListener('change', (e) => {
                const val = (e.target as HTMLSelectElement).value;
                this.parameters = { ...this.parameters, model: val };
            });

            header.appendChild(title);
            header.appendChild(select);

            const textareaGroup = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = 'System Prompt:';
            label.style.display = 'block';
            label.style.fontSize = '12px';
            label.style.marginBottom = '4px';
            label.style.color = 'rgba(255,255,255,0.8)';

            const textarea = document.createElement('textarea');
            textarea.placeholder = 'Enter system prompt...';
            textarea.value = promptText;
            textarea.style.width = '100%';
            textarea.style.height = '80px';
            textarea.style.background = 'rgba(0,0,0,0.3)';
            textarea.style.border = '1px solid rgba(255,255,255,0.2)';
            textarea.style.borderRadius = '6px';
            textarea.style.color = 'white';
            textarea.style.padding = '8px';
            textarea.style.fontSize = '12px';
            textarea.style.resize = 'vertical';
            textarea.style.boxSizing = 'border-box';
            textarea.style.outline = 'none';

            textarea.addEventListener('input', (e) => {
                const val = (e.target as HTMLTextAreaElement).value;
                this.parameters = { ...this.parameters, prompt: val };
            });

            textareaGroup.appendChild(label);
            textareaGroup.appendChild(textarea);

            this.element.appendChild(header);
            this.element.appendChild(textareaGroup);
            this.element.style.background = 'linear-gradient(135deg, #673ab7, #3f51b5)';
            this.element.style.border = '1px solid #7e57c2';
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.element?.querySelector('textarea') ? 'full' : (this.element?.querySelector('div[style*="italic"]') ? 'summary' : (this.element?.querySelector('span') ? 'label' : 'icon'));
        this.renderHtmlContent(level);
    }
}

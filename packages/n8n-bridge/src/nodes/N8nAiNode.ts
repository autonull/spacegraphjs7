import { HtmlNode } from 'spacegraphjs';
import type { SpaceGraph } from 'spacegraphjs';
import type { NodeSpec, SpecUpdate } from 'spacegraphjs';

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
        this.renderHtmlContent('full');
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
        if (!this.domElement) return;

        this.domElement.innerHTML = '';
        const params = (this.parameters && Object.keys(this.parameters).length > 0) ? this.parameters : (this.spec?.parameters || {});
        const model = params.model || 'gpt-4o';
        const promptText = params.prompt || '';

        const setStyles = (el: HTMLElement, styles: Partial<CSSStyleDeclaration>) => Object.assign(el.style, styles);

        if (level === 'icon') {
            const el = document.createElement('div');
            setStyles(el, { fontSize: '48px', textAlign: 'center' });
            el.textContent = '✨';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'transparent', border: 'none' });
        } else if (level === 'label') {
            const el = document.createElement('div');
            setStyles(el, { textAlign: 'center', fontSize: '24px', fontWeight: 'bold' });
            el.textContent = '✨ AI Agent';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'linear-gradient(135deg, #673ab7, #3f51b5)', border: '1px solid #7e57c2' });
        } else if (level === 'summary') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' });

            const title = document.createElement('span');
            setStyles(title, { fontWeight: 'bold' });
            title.textContent = '✨ AI Agent';

            const badge = document.createElement('span');
            setStyles(badge, { background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' });
            badge.textContent = model;
            header.append(title, badge);

            const preview = document.createElement('div');
            setStyles(preview, { background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', fontSize: '12px', color: '#e0e0e0', fontStyle: 'italic' });
            preview.textContent = promptText.length > 0 ? (promptText.slice(0, 40) + '...') : 'No prompt set';

            this.domElement.append(header, preview);
            setStyles(this.domElement, { background: 'linear-gradient(135deg, #673ab7, #3f51b5)', border: '1px solid #7e57c2' });
        } else if (level === 'full') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' });

            const title = document.createElement('span');
            setStyles(title, { fontWeight: 'bold', fontSize: '16px' });
            title.textContent = '✨ AI Agent';

            const select = document.createElement('select');
            setStyles(select, { background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', outline: 'none' });

            [
                { value: 'gpt-4o', label: 'GPT-4o' },
                { value: 'claude-3-5-sonnet', label: 'Claude 3.5' },
                { value: 'gemini-1.5-pro', label: 'Gemini Pro' }
            ].forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                option.style.background = '#3f51b5';
                if (opt.value === model) option.selected = true;
                select.appendChild(option);
            });

            select.addEventListener('change', (e) => {
                const val = (e.target as HTMLSelectElement).value;
                this.parameters = { ...this.parameters, model: val };
                this.sg.events.emit('node:paramChange', { nodeId: this.id, key: 'model', value: val });
            });
            header.append(title, select);

            const textareaGroup = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = 'System Prompt:';
            setStyles(label, { display: 'block', fontSize: '12px', marginBottom: '4px', color: 'rgba(255,255,255,0.8)' });

            const textarea = document.createElement('textarea');
            textarea.placeholder = 'Enter system prompt...';
            textarea.value = promptText;
            setStyles(textarea, { width: '100%', height: '80px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'white', padding: '8px', fontSize: '12px', resize: 'vertical', boxSizing: 'border-box', outline: 'none' });

            textarea.addEventListener('input', (e) => {
                const val = (e.target as HTMLTextAreaElement).value;
                this.parameters = { ...this.parameters, prompt: val };
                this.sg.events.emit('node:paramChange', { nodeId: this.id, key: 'prompt', value: val });
            });
            textareaGroup.append(label, textarea);

            this.domElement.append(header, textareaGroup);
            setStyles(this.domElement, { background: 'linear-gradient(135deg, #673ab7, #3f51b5)', border: '1px solid #7e57c2' });
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.domElement?.querySelector('textarea') ? 'full' : (this.domElement?.querySelector('div[style*="italic"]') ? 'summary' : (this.domElement?.querySelector('span') ? 'label' : 'icon'));
        this.renderHtmlContent(level);
    }
}

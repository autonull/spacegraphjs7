import { HtmlNode } from 'spacegraphjs';
import type { SpaceGraph } from 'spacegraphjs';
import type { NodeSpec, SpecUpdate } from 'spacegraphjs';

export class N8nCodeNode extends HtmlNode {
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
                width: '400px',
                height: 'auto',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#1e1e1e', // VS Code dark theme background
                color: '#d4d4d4',
                fontFamily: 'sans-serif',
                borderLeft: '4px solid #fbc02d', // Yellow for JS
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
        const jsCode = params.jsCode || 'return items;';

        const setStyles = (el: HTMLElement, styles: Partial<CSSStyleDeclaration>) => Object.assign(el.style, styles);

        if (level === 'icon') {
            const el = document.createElement('div');
            setStyles(el, { fontSize: '48px', textAlign: 'center', fontWeight: 'bold', color: '#fbc02d' });
            el.textContent = 'JS';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'transparent', border: 'none' });
        } else if (level === 'label') {
            const el = document.createElement('div');
            setStyles(el, { textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#fbc02d' });
            el.textContent = 'JS Code';
            this.domElement.appendChild(el);
            setStyles(this.domElement, { background: 'rgba(30, 30, 30, 0.8)', borderLeft: '4px solid #fbc02d' });
        } else if (level === 'summary') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' });

            const badge = document.createElement('span');
            setStyles(badge, { background: '#fbc02d', color: 'black', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' });
            badge.textContent = 'JS';

            const text = document.createElement('span');
            setStyles(text, { fontSize: '14px', fontWeight: 'bold' });
            text.textContent = 'Code';

            header.append(badge, text);

            const preview = document.createElement('pre');
            setStyles(preview, { background: '#2d2d2d', padding: '8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', color: '#9cdcfe', height: '40px', overflow: 'hidden', margin: '0' });

            // Show only first 3 lines
            const lines = jsCode.split('\n');
            preview.textContent = lines.slice(0, 3).join('\n') + (lines.length > 3 ? '\n...' : '');

            this.domElement.append(header, preview);
            setStyles(this.domElement, { background: '#1e1e1e', borderLeft: '4px solid #fbc02d' });
        } else if (level === 'full') {
            const header = document.createElement('div');
            setStyles(header, { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' });

            const badge = document.createElement('span');
            setStyles(badge, { background: '#fbc02d', color: 'black', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' });
            badge.textContent = 'JS';

            const text = document.createElement('span');
            setStyles(text, { fontSize: '16px', fontWeight: 'bold' });
            text.textContent = 'Code Editor';

            header.append(badge, text);

            const editorContainer = document.createElement('div');
            const textarea = document.createElement('textarea');
            textarea.value = jsCode;
            setStyles(textarea, { width: '100%', height: '150px', background: '#2d2d2d', border: '1px solid #444', color: '#9cdcfe', fontFamily: 'monospace', padding: '8px', boxSizing: 'border-box', outline: 'none', borderRadius: '4px' });

            textarea.addEventListener('input', (e) => {
                const val = (e.target as HTMLTextAreaElement).value;
                this.parameters = { ...this.parameters, jsCode: val };
                this.sg.events.emit('node:paramChange', { nodeId: this.id, key: 'jsCode', value: val });
            });

            editorContainer.appendChild(textarea);

            this.domElement.append(header, editorContainer);
            setStyles(this.domElement, { background: '#1e1e1e', borderLeft: '4px solid #fbc02d' });
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.domElement?.querySelector('textarea') ? 'full' : (this.domElement?.querySelector('pre') ? 'summary' : (this.domElement?.querySelector('div[style*="24px"]') ? 'label' : 'icon'));
        this.renderHtmlContent(level);
    }
}

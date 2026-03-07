import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';

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
        const params = this.parameters || this.spec?.parameters || {};
        const jsCode = params.jsCode || 'return items;';

        if (level === 'icon') {
            const el = document.createElement('div');
            el.style.fontSize = '48px';
            el.style.textAlign = 'center';
            el.style.fontWeight = 'bold';
            el.style.color = '#fbc02d';
            el.textContent = 'JS';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'transparent';
            this.domElement.style.border = 'none';
        } else if (level === 'label') {
            const el = document.createElement('div');
            el.style.textAlign = 'center';
            el.style.fontSize = '24px';
            el.style.fontWeight = 'bold';
            el.style.color = '#fbc02d';
            el.textContent = 'JS Code';
            this.domElement.appendChild(el);
            this.domElement.style.background = 'rgba(30, 30, 30, 0.8)';
            this.domElement.style.borderLeft = '4px solid #fbc02d';
        } else if (level === 'summary') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.gap = '8px';
            header.style.marginBottom = '8px';

            const badge = document.createElement('span');
            badge.style.background = '#fbc02d';
            badge.style.color = 'black';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '12px';
            badge.style.fontWeight = 'bold';
            badge.textContent = 'JS';

            const text = document.createElement('span');
            text.style.fontSize = '14px';
            text.style.fontWeight = 'bold';
            text.textContent = 'Code';

            header.appendChild(badge);
            header.appendChild(text);

            const preview = document.createElement('pre');
            preview.style.background = '#2d2d2d';
            preview.style.padding = '8px';
            preview.style.borderRadius = '4px';
            preview.style.fontSize = '11px';
            preview.style.fontFamily = 'monospace';
            preview.style.color = '#9cdcfe'; // JS light blue variable color
            preview.style.height = '40px';
            preview.style.overflow = 'hidden';
            preview.style.margin = '0';

            // Show only first 3 lines
            const lines = jsCode.split('\n');
            preview.textContent = lines.slice(0, 3).join('\n') + (lines.length > 3 ? '\n...' : '');

            this.domElement.appendChild(header);
            this.domElement.appendChild(preview);
            this.domElement.style.background = '#1e1e1e';
            this.domElement.style.borderLeft = '4px solid #fbc02d';
        } else if (level === 'full') {
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.gap = '8px';
            header.style.marginBottom = '12px';

            const badge = document.createElement('span');
            badge.style.background = '#fbc02d';
            badge.style.color = 'black';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '12px';
            badge.style.fontWeight = 'bold';
            badge.textContent = 'JS';

            const text = document.createElement('span');
            text.style.fontSize = '16px';
            text.style.fontWeight = 'bold';
            text.textContent = 'Code Editor';

            header.appendChild(badge);
            header.appendChild(text);

            const editorContainer = document.createElement('div');
            const textarea = document.createElement('textarea');
            textarea.value = jsCode;
            textarea.style.width = '100%';
            textarea.style.height = '150px';
            textarea.style.background = '#2d2d2d';
            textarea.style.border = '1px solid #444';
            textarea.style.color = '#9cdcfe';
            textarea.style.fontFamily = 'monospace';
            textarea.style.padding = '8px';
            textarea.style.boxSizing = 'border-box';
            textarea.style.outline = 'none';
            textarea.style.borderRadius = '4px';

            textarea.addEventListener('input', (e) => {
                const val = (e.target as HTMLTextAreaElement).value;
                this.parameters = { ...this.parameters, jsCode: val };
                this.sg.events.emit('node:paramChange', { nodeId: this.id, key: 'jsCode', value: val });
            });

            editorContainer.appendChild(textarea);

            this.domElement.appendChild(header);
            this.domElement.appendChild(editorContainer);
            this.domElement.style.background = '#1e1e1e';
            this.domElement.style.borderLeft = '4px solid #fbc02d';
        }
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
        const level = this.domElement?.querySelector('textarea') ? 'full' : (this.domElement?.querySelector('pre') ? 'summary' : (this.domElement?.querySelector('div[style*="24px"]') ? 'label' : 'icon'));
        this.renderHtmlContent(level);
    }
}
